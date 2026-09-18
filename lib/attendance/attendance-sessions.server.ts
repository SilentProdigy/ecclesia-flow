import "server-only";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  addDaysToDateKey,
  ATTENDANCE_TIMEZONE,
  getDateKeyInTimeZone,
} from "./attendance-session-utils";

import type {
  AttendanceEventSummary,
  AttendanceSessionDashboard,
  AttendanceSessionListItem,
  AttendanceSessionStatus,
  EventRecurrence,
} from "./attendance-session-types";

interface RawEvent {
  id: string;
  name: string;
  event_type: string;
  location: string | null;
  timezone: string;

  recurrence:
    EventRecurrence;

  recurrence_interval:
    number;

  days_of_week:
    number[];

  day_of_month:
    number | null;
}

interface RawSession {
  id: string;
  event_id: string;

  session_date: string;

  starts_at: string;
  ends_at: string;

  status:
    AttendanceSessionStatus;

  title_override:
    string | null;

  location_override:
    string | null;

  events:
    | RawEvent
    | RawEvent[]
    | null;
}

function normalizeEvent(
  value:
    | RawEvent
    | RawEvent[]
    | null
): AttendanceEventSummary | null {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

async function attachAttendanceCounts(
  sessions:
    AttendanceSessionListItem[]
) {
  if (
    sessions.length === 0
  ) {
    return sessions;
  }

  const supabase =
    await createClient();

  const sessionIds =
    sessions.map(
      (session) =>
        session.id
    );

  const {
    data,
    error,
  } = await supabase
    .from(
      "attendance_records"
    )
    .select(
      "event_session_id"
    )
    .in(
      "event_session_id",
      sessionIds
    )
    .is(
      "voided_at",
      null
    );

  if (error) {
    console.error(
      "Unable to load attendance counts:",
      error
    );

    return sessions;
  }

  const counts =
    new Map<
      string,
      number
    >();

  for (
    const record of
    data ?? []
  ) {
    const sessionId =
      record.event_session_id;

    counts.set(
      sessionId,
      (counts.get(
        sessionId
      ) ?? 0) + 1
    );
  }

  return sessions.map(
    (session) => ({
      ...session,

      attendance_count:
        counts.get(
          session.id
        ) ?? 0,
    })
  );
}

function mapSessions(
  rows: RawSession[]
) {
  const sessions:
    AttendanceSessionListItem[] =
    [];

  for (const row of rows) {
    const event =
      normalizeEvent(
        row.events
      );

    if (!event) {
      continue;
    }

    sessions.push({
      id: row.id,

      event_id:
        row.event_id,

      session_date:
        row.session_date,

      starts_at:
        row.starts_at,

      ends_at:
        row.ends_at,

      status:
        row.status,

      title_override:
        row.title_override,

      location_override:
        row.location_override,

      event,

      attendance_count: 0,
    });
  }

  return sessions;
}

function getUpcomingSessionCards(
  sessions:
    AttendanceSessionListItem[],
  today: string
) {
  const scheduledUpcoming =
    sessions
      .filter(
        (session) =>
          session.session_date >
            today &&
          session.status ===
            "scheduled"
      )
      .sort(
        (a, b) =>
          new Date(
            a.starts_at
          ).getTime() -
          new Date(
            b.starts_at
          ).getTime()
      );

  const firstRecurringSession =
    new Set<string>();

  const upcoming:
    AttendanceSessionListItem[] =
    [];

  for (
    const session of
    scheduledUpcoming
  ) {
    const isRecurring =
      session.event
        .recurrence !==
      "none";

    if (!isRecurring) {
      upcoming.push(
        session
      );

      continue;
    }

    if (
      firstRecurringSession.has(
        session.event_id
      )
    ) {
      continue;
    }

    firstRecurringSession.add(
      session.event_id
    );

    upcoming.push(
      session
    );
  }

  return upcoming;
}

export async function getAttendanceSessionDashboard(): Promise<AttendanceSessionDashboard> {
  const supabase =
    await createClient();

  const today =
    getDateKeyInTimeZone(
      new Date(),
      ATTENDANCE_TIMEZONE
    );

  const horizon =
    addDaysToDateKey(
      today,
      60
    );

  const [
    futureResult,
    carriedOpenResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "event_sessions"
        )
        .select(`
          id,
          event_id,
          session_date,
          starts_at,
          ends_at,
          status,
          title_override,
          location_override,
          events!inner (
            id,
            name,
            event_type,
            location,
            timezone,
            recurrence,
            recurrence_interval,
            days_of_week,
            day_of_month
          )
        `)
        .gte(
          "session_date",
          today
        )
        .lte(
          "session_date",
          horizon
        )
        .eq(
          "events.status",
          "active"
        )
        .order(
          "starts_at",
          {
            ascending: true,
          }
        )
        .limit(100),

      supabase
        .from(
          "event_sessions"
        )
        .select(`
          id,
          event_id,
          session_date,
          starts_at,
          ends_at,
          status,
          title_override,
          location_override,
          events!inner (
            id,
            name,
            event_type,
            location,
            timezone,
            recurrence,
            recurrence_interval,
            days_of_week,
            day_of_month
          )
        `)
        .eq(
          "status",
          "open"
        )
        .lt(
          "session_date",
          today
        )
        .order(
          "starts_at",
          {
            ascending: false,
          }
        )
        .limit(10),
    ]);

  if (
    futureResult.error
  ) {
    console.error(
      "Unable to load attendance sessions:",
      futureResult.error
    );

    throw new Error(
      "Unable to load attendance sessions."
    );
  }

  if (
    carriedOpenResult.error
  ) {
    console.error(
      "Unable to load open attendance sessions:",
      carriedOpenResult.error
    );

    throw new Error(
      "Unable to load open attendance sessions."
    );
  }

  const rawRows = [
    ...(
      carriedOpenResult.data ??
      []
    ),
    ...(
      futureResult.data ??
      []
    ),
  ] as unknown as RawSession[];

  const unique =
    new Map<
      string,
      RawSession
    >();

  for (const row of rawRows) {
    unique.set(
      row.id,
      row
    );
  }

  let sessions =
    mapSessions(
      Array.from(
        unique.values()
      )
    );

  sessions =
    await attachAttendanceCounts(
      sessions
    );

  sessions.sort(
    (a, b) =>
      new Date(
        a.starts_at
      ).getTime() -
      new Date(
        b.starts_at
      ).getTime()
  );

  return {
    date: today,

    openSessions:
      sessions.filter(
        (session) =>
          session.status ===
          "open"
      ),

    todaySessions:
      sessions.filter(
        (session) =>
          session.session_date ===
            today &&
          session.status !==
            "open"
      ),

    upcomingSessions:
      getUpcomingSessionCards(
        sessions,
        today
      ),
  };
}

export async function getAttendanceSession(
  sessionId: string
): Promise<AttendanceSessionListItem | null> {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase
    .from(
      "event_sessions"
    )
    .select(`
      id,
      event_id,
      session_date,
      starts_at,
      ends_at,
      status,
      title_override,
      location_override,
      events!inner (
        id,
        name,
        event_type,
        location,
        timezone,
        recurrence,
        recurrence_interval,
        days_of_week,
        day_of_month
      )
    `)
    .eq(
      "id",
      sessionId
    )
    .maybeSingle();

  if (error) {
    console.error(
      "Unable to load attendance session:",
      error
    );

    throw new Error(
      "Unable to load attendance session."
    );
  }

  if (!data) {
    return null;
  }

  const sessions =
    mapSessions([
      data as unknown as RawSession,
    ]);

  if (
    sessions.length === 0
  ) {
    return null;
  }

  const withCounts =
    await attachAttendanceCounts(
      sessions
    );

  return (
    withCounts[0] ??
    null
  );
}
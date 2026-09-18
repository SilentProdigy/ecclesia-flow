import "server-only";

import {
  createClient,
} from "@/lib/supabase/server";

import type {
  EventRecurrence,
  EventRecord,
  EventSessionRecord,
  EventStatus,
  EventType,
} from "@/lib/events/types";

export const EVENT_DIRECTORY_PAGE_SIZE =
  20;

export type EventDirectoryTypeFilter =
  | EventType
  | "all";

export type EventDirectoryStatusFilter =
  | EventStatus
  | "all";

export type EventDirectoryRecurrenceFilter =
  | EventRecurrence
  | "all";

export interface EventDirectoryFilters {
  q: string;
  type: EventDirectoryTypeFilter;
  status: EventDirectoryStatusFilter;
  recurrence: EventDirectoryRecurrenceFilter;
  page: number;
}

export interface EventDirectoryItem
  extends EventRecord {
  next_session:
    | EventSessionRecord
    | null;
}

export interface EventDirectoryResult {
  events: EventDirectoryItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface EventDetailResult {
  event: EventRecord;
  currentAndUpcomingSessions: EventSessionRecord[];
  recentSessions: EventSessionRecord[];
  totalSessions: number;
}

export interface EventSessionDetailResult {
  event: EventRecord;
  session: EventSessionRecord;
}

export type CurrentUserRole =
  | "admin"
  | "staff";

function getTodayInTimezone(
  timezone: string,
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      },
    ).formatToParts(
      new Date(),
    );

  const values: Record<
    string,
    string
  > = {};

  for (const part of parts) {
    if (
      part.type !==
      "literal"
    ) {
      values[part.type] =
        part.value;
    }
  }

  return `${values.year}-${values.month}-${values.day}`;
}

export async function getCurrentUserRole(): Promise<
  CurrentUserRole | null
> {
  const supabase =
    await createClient();

  const {
    data: claimsData,
    error: claimsError,
  } =
    await supabase.auth.getClaims();

  if (claimsError) {
    return null;
  }

  const userId =
    claimsData?.claims?.sub;

  if (!userId) {
    return null;
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(
      "role, is_active",
    )
    .eq("id", userId)
    .single();

  if (
    profileError ||
    !profile ||
    !profile.is_active
  ) {
    return null;
  }

  if (
    profile.role !== "admin" &&
    profile.role !== "staff"
  ) {
    return null;
  }

  return profile.role;
}

export async function getEventDirectory(
  filters: EventDirectoryFilters,
): Promise<EventDirectoryResult> {
  const supabase =
    await createClient();

  const page =
    Math.max(
      1,
      filters.page,
    );

  const pageSize =
    EVENT_DIRECTORY_PAGE_SIZE;

  const from =
    (page - 1) *
    pageSize;

  const to =
    from +
    pageSize -
    1;

  let query = supabase
    .from("events")
    .select("*", {
      count: "exact",
    });

  if (filters.q) {
    query = query.ilike(
      "name",
      `%${filters.q}%`,
    );
  }

  if (
    filters.type !==
    "all"
  ) {
    query = query.eq(
      "event_type",
      filters.type,
    );
  }

  if (
    filters.status !==
    "all"
  ) {
    query = query.eq(
      "status",
      filters.status,
    );
  }

  if (
    filters.recurrence !==
    "all"
  ) {
    query = query.eq(
      "recurrence",
      filters.recurrence,
    );
  }

  const {
    data,
    error,
    count,
  } = await query
    .order(
      "name",
      {
        ascending: true,
      },
    )
    .range(
      from,
      to,
    );

  if (error) {
    throw new Error(
      `Unable to load events: ${error.message}`,
    );
  }

  const events =
    (data ??
      []) as EventRecord[];

  const total =
    count ?? 0;

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        total /
          pageSize,
      ),
    );

  if (
    events.length ===
    0
  ) {
    return {
      events: [],
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  const eventIds =
    events.map(
      (event) =>
        event.id,
    );

  const now =
    new Date().toISOString();

  const {
    data: sessionData,
    error: sessionError,
  } = await supabase
    .from("event_sessions")
    .select("*")
    .in(
      "event_id",
      eventIds,
    )
    .in(
      "status",
      [
        "scheduled",
        "open",
      ],
    )
    .gte(
      "starts_at",
      now,
    )
    .order(
      "starts_at",
      {
        ascending: true,
      },
    );

  if (sessionError) {
    throw new Error(
      `Unable to load upcoming sessions: ${sessionError.message}`,
    );
  }

  const sessions =
    (sessionData ??
      []) as EventSessionRecord[];

  const nextSessionByEvent =
    new Map<
      string,
      EventSessionRecord
    >();

  for (
    const session
    of sessions
  ) {
    if (
      !nextSessionByEvent.has(
        session.event_id,
      )
    ) {
      nextSessionByEvent.set(
        session.event_id,
        session,
      );
    }
  }

  return {
    events:
      events.map(
        (
          event,
        ): EventDirectoryItem => ({
          ...event,

          next_session:
            nextSessionByEvent.get(
              event.id,
            ) ?? null,
        }),
      ),

    total,
    page,
    pageSize,
    totalPages,
  };
}

export async function getEventById(
  eventId: string,
): Promise<EventRecord | null> {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase
    .from("events")
    .select("*")
    .eq(
      "id",
      eventId,
    )
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to load event: ${error.message}`,
    );
  }

  return data
    ? (data as EventRecord)
    : null;
}

export async function getEventDetail(
  eventId: string,
): Promise<EventDetailResult | null> {
  const supabase =
    await createClient();

  const {
    data: eventData,
    error: eventError,
  } = await supabase
    .from("events")
    .select("*")
    .eq(
      "id",
      eventId,
    )
    .maybeSingle();

  if (eventError) {
    throw new Error(
      `Unable to load event: ${eventError.message}`,
    );
  }

  if (!eventData) {
    return null;
  }

  const event =
    eventData as EventRecord;

  const today =
    getTodayInTimezone(
      event.timezone,
    );

  const [
    currentResult,
    recentResult,
    countResult,
  ] = await Promise.all([
    supabase
      .from(
        "event_sessions",
      )
      .select("*")
      .eq(
        "event_id",
        event.id,
      )
      .gte(
        "session_date",
        today,
      )
      .order(
        "starts_at",
        {
          ascending: true,
        },
      )
      .limit(24),

    supabase
      .from(
        "event_sessions",
      )
      .select("*")
      .eq(
        "event_id",
        event.id,
      )
      .lt(
        "session_date",
        today,
      )
      .order(
        "starts_at",
        {
          ascending: false,
        },
      )
      .limit(12),

    supabase
      .from(
        "event_sessions",
      )
      .select(
        "id",
        {
          count:
            "exact",
          head: true,
        },
      )
      .eq(
        "event_id",
        event.id,
      ),
  ]);

  if (
    currentResult.error
  ) {
    throw new Error(
      `Unable to load upcoming sessions: ${currentResult.error.message}`,
    );
  }

  if (
    recentResult.error
  ) {
    throw new Error(
      `Unable to load recent sessions: ${recentResult.error.message}`,
    );
  }

  if (
    countResult.error
  ) {
    throw new Error(
      `Unable to count sessions: ${countResult.error.message}`,
    );
  }

  return {
    event,

    currentAndUpcomingSessions:
      (currentResult.data ??
        []) as EventSessionRecord[],

    recentSessions:
      (recentResult.data ??
        []) as EventSessionRecord[],

    totalSessions:
      countResult.count ??
      0,
  };
}

export async function getEventSessionDetail(
  eventId: string,
  sessionId: string,
): Promise<EventSessionDetailResult | null> {
  const supabase =
    await createClient();

  const [
    eventResult,
    sessionResult,
  ] = await Promise.all([
    supabase
      .from("events")
      .select("*")
      .eq(
        "id",
        eventId,
      )
      .maybeSingle(),

    supabase
      .from(
        "event_sessions",
      )
      .select("*")
      .eq(
        "id",
        sessionId,
      )
      .eq(
        "event_id",
        eventId,
      )
      .maybeSingle(),
  ]);

  if (
    eventResult.error
  ) {
    throw new Error(
      `Unable to load event: ${eventResult.error.message}`,
    );
  }

  if (
    sessionResult.error
  ) {
    throw new Error(
      `Unable to load session: ${sessionResult.error.message}`,
    );
  }

  if (
    !eventResult.data ||
    !sessionResult.data
  ) {
    return null;
  }

  return {
    event:
      eventResult.data as EventRecord,

    session:
      sessionResult.data as EventSessionRecord,
  };
}
import "server-only";

import {
  addDaysToDate,
} from "@/lib/events/recurrence";

import {
  createClient,
} from "@/lib/supabase/server";

import type {
  EventRecord,
  EventSessionRecord,
} from "@/lib/events/types";

export const CHURCH_TIMEZONE =
  "Asia/Manila";

export const UPCOMING_SCHEDULE_DAYS =
  30;

export interface ScheduledEventSummary {
  id: EventRecord["id"];
  name: EventRecord["name"];
  event_type: EventRecord["event_type"];
  location: EventRecord["location"];
  status: EventRecord["status"];
  timezone: EventRecord["timezone"];
}

export interface ScheduledEventSession
  extends EventSessionRecord {
  event: ScheduledEventSummary;
}

export interface OperationalEventSchedule {
  today: string;
  endDate: string;
  todaySessions: ScheduledEventSession[];
  upcomingSessions: ScheduledEventSession[];
  nextSession: ScheduledEventSession | null;
  totalInWindow: number;
  openTodayCount: number;
}

interface RawScheduledEventSession
  extends EventSessionRecord {
  event:
    | ScheduledEventSummary
    | ScheduledEventSummary[]
    | null;
}

function getDateInTimezone(
  date: Date,
  timezone: string,
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      },
    ).formatToParts(date);

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

function normalizeSession(
  row: RawScheduledEventSession,
): ScheduledEventSession | null {
  const event =
    Array.isArray(row.event)
      ? row.event[0]
      : row.event;

  if (!event) {
    return null;
  }

  return {
    id: row.id,
    event_id: row.event_id,
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
    notes:
      row.notes,
    created_by:
      row.created_by,
    updated_by:
      row.updated_by,
    created_at:
      row.created_at,
    updated_at:
      row.updated_at,
    event,
  };
}

export async function getOperationalEventSchedule(): Promise<OperationalEventSchedule> {
  const supabase =
    await createClient();

  const now =
    new Date();

  const nowIso =
    now.toISOString();

  const today =
    getDateInTimezone(
      now,
      CHURCH_TIMEZONE,
    );

  const endDate =
    addDaysToDate(
      today,
      UPCOMING_SCHEDULE_DAYS,
    );

  const {
    data,
    error,
  } = await supabase
    .from("event_sessions")
    .select(`
      *,
      event:events!inner (
        id,
        name,
        event_type,
        location,
        status,
        timezone
      )
    `)
    .eq(
      "event.status",
      "active",
    )
    .gte(
      "session_date",
      today,
    )
    .lte(
      "session_date",
      endDate,
    )
    .order(
      "starts_at",
      {
        ascending: true,
      },
    );

  if (error) {
    throw new Error(
      `Unable to load church schedule: ${error.message}`,
    );
  }

  const sessions =
    (
      (data ??
        []) as RawScheduledEventSession[]
    )
      .map(
        normalizeSession,
      )
      .filter(
        (
          session,
        ): session is ScheduledEventSession =>
          session !== null,
      );

  const todaySessions =
    sessions.filter(
      (session) =>
        session.session_date ===
        today,
    );

  const upcomingSessions =
    sessions.filter(
      (session) =>
        session.session_date >
        today,
    );

  const openSession =
    todaySessions.find(
      (session) =>
        session.status ===
        "open",
    );

  const nextScheduledSession =
    sessions.find(
      (session) =>
        session.status ===
          "scheduled" &&
        session.starts_at >=
          nowIso,
    );

  return {
    today,
    endDate,
    todaySessions,
    upcomingSessions,

    nextSession:
      openSession ??
      nextScheduledSession ??
      null,

    totalInWindow:
      sessions.length,

    openTodayCount:
      todaySessions.filter(
        (session) =>
          session.status ===
          "open",
      ).length,
  };
}
import "server-only";

import { createClient } from "@/lib/supabase/server";

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

export type CurrentUserRole =
  | "admin"
  | "staff";

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
    .select("role, is_active")
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

  const page = Math.max(
    1,
    filters.page,
  );

  const pageSize =
    EVENT_DIRECTORY_PAGE_SIZE;

  const from =
    (page - 1) * pageSize;

  const to =
    from + pageSize - 1;

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

  if (filters.type !== "all") {
    query = query.eq(
      "event_type",
      filters.type,
    );
  }

  if (filters.status !== "all") {
    query = query.eq(
      "status",
      filters.status,
    );
  }

  if (
    filters.recurrence !== "all"
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
    .order("name", {
      ascending: true,
    })
    .range(from, to);

  if (error) {
    throw new Error(
      `Unable to load events: ${error.message}`,
    );
  }

  const events =
    (data ?? []) as EventRecord[];

  const total = count ?? 0;

  const totalPages = Math.max(
    1,
    Math.ceil(
      total / pageSize,
    ),
  );

  if (events.length === 0) {
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
      (event) => event.id,
    );

  const now =
    new Date().toISOString();

  const {
    data: sessionData,
    error: sessionError,
  } = await supabase
    .from("event_sessions")
    .select("*")
    .in("event_id", eventIds)
    .in("status", [
      "scheduled",
      "open",
    ])
    .gte("starts_at", now)
    .order("starts_at", {
      ascending: true,
    });

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

  for (const session of sessions) {
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

  const directoryEvents =
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
    );

  return {
    events: directoryEvents,
    total,
    page,
    pageSize,
    totalPages,
  };
}
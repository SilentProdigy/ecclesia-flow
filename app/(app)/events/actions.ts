"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  generateEventSessions,
  getInitialSessionGenerationRange,
  getRollingSessionGenerationRange,
  zonedDateTimeToUtc,
} from "@/lib/events/recurrence";

import {
  createEventSchema,
  eventIdSchema,
  eventSessionIdSchema,
  updateEventSchema,
  updateEventSessionSchema,
} from "@/lib/events/validation";

import {
  createClient,
} from "@/lib/supabase/server";

export interface EventActionResult {
  success: boolean;
  eventId?: string;
  error?: string;
  fieldErrors?: Record<
    string,
    string[]
  >;
}

function buildFieldErrors(
  issues: Array<{
    path: PropertyKey[];
    message: string;
  }>,
) {
  const fieldErrors: Record<
    string,
    string[]
  > = {};

  for (const issue of issues) {
    const field =
      issue.path[0];

    if (
      typeof field !==
      "string"
    ) {
      continue;
    }

    if (!fieldErrors[field]) {
      fieldErrors[field] =
        [];
    }

    fieldErrors[field].push(
      issue.message,
    );
  }

  return fieldErrors;
}

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

async function requireAdmin() {
  const supabase =
    await createClient();

  const {
    data: claimsData,
    error: claimsError,
  } =
    await supabase.auth.getClaims();

  if (claimsError) {
    return {
      supabase,
      userId: null,
      error:
        "Unable to verify your session.",
    };
  }

  const userId =
    claimsData?.claims?.sub;

  if (!userId) {
    return {
      supabase,
      userId: null,
      error:
        "You must be signed in.",
    };
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
    !profile.is_active ||
    profile.role !== "admin"
  ) {
    return {
      supabase,
      userId: null,
      error:
        "Administrator access is required.",
    };
  }

  return {
    supabase,
    userId,
    error: null,
  };
}

function normalizeEvent(
  data: ReturnType<
    typeof createEventSchema.parse
  >,
) {
  return {
    ...data,

    recurrenceInterval:
      data.recurrence ===
      "none"
        ? 1
        : data.recurrenceInterval,

    daysOfWeek:
      data.recurrence ===
      "weekly"
        ? data.daysOfWeek
        : [],

    dayOfMonth:
      data.recurrence ===
      "monthly"
        ? data.dayOfMonth
        : null,

    endsOn:
      data.recurrence ===
      "none"
        ? null
        : data.endsOn,
  };
}

function buildEventPayload(
  event: ReturnType<
    typeof normalizeEvent
  >,
) {
  return {
    name: event.name,

    description:
      event.description ??
      null,

    event_type:
      event.eventType,

    location:
      event.location ??
      null,

    status:
      event.status,

    recurrence:
      event.recurrence,

    recurrence_interval:
      event.recurrenceInterval,

    days_of_week:
      event.daysOfWeek,

    day_of_month:
      event.dayOfMonth,

    starts_on:
      event.startsOn,

    ends_on:
      event.endsOn,

    default_start_time:
      event.defaultStartTime,

    duration_minutes:
      event.durationMinutes,

    timezone:
      event.timezone,
  };
}

export async function createEventAction(
  input: unknown,
): Promise<EventActionResult> {
  const parsed =
    createEventSchema.safeParse(
      input,
    );

  if (!parsed.success) {
    return {
      success: false,
      error:
        "Please check the highlighted fields.",
      fieldErrors:
        buildFieldErrors(
          parsed.error.issues,
        ),
    };
  }

  const auth =
    await requireAdmin();

  if (
    auth.error ||
    !auth.userId
  ) {
    return {
      success: false,
      error:
        auth.error ??
        "Administrator access is required.",
    };
  }

  const event =
    normalizeEvent(
      parsed.data,
    );

  let generatedSessions;

  try {
    const range =
      getInitialSessionGenerationRange(
        event,
      );

    generatedSessions =
      generateEventSessions(
        event,
        range,
      );
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to generate event sessions.",
    };
  }

  if (
    generatedSessions.length ===
    0
  ) {
    return {
      success: false,
      error:
        "This schedule did not generate any sessions.",
    };
  }

  const sessionsPayload =
    generatedSessions.map(
      (session) => ({
        session_date:
          session.sessionDate,

        starts_at:
          session.startsAt,

        ends_at:
          session.endsAt,

        status:
          session.status,
      }),
    );

  const {
    data: eventId,
    error,
  } = await auth.supabase.rpc(
    "create_event_with_sessions",
    {
      p_event:
        buildEventPayload(
          event,
        ),

      p_sessions:
        sessionsPayload,
    },
  );

  if (error) {
    console.error(
      "create_event_with_sessions failed:",
      error,
    );

    return {
      success: false,
      error:
        "Unable to create the event.",
    };
  }

  if (
    typeof eventId !==
      "string" ||
    !eventId
  ) {
    return {
      success: false,
      error:
        "ChurchFlow could not determine the new event ID.",
    };
  }

  revalidatePath(
    "/events",
  );

  return {
    success: true,
    eventId,
  };
}

export async function updateEventAction(
  eventId: string,
  input: unknown,
): Promise<EventActionResult> {
  const parsedId =
    eventIdSchema.safeParse(
      eventId,
    );

  if (!parsedId.success) {
    return {
      success: false,
      error:
        "Invalid event ID.",
    };
  }

  const parsed =
    updateEventSchema.safeParse(
      input,
    );

  if (!parsed.success) {
    return {
      success: false,
      error:
        "Please check the highlighted fields.",
      fieldErrors:
        buildFieldErrors(
          parsed.error.issues,
        ),
    };
  }

  const auth =
    await requireAdmin();

  if (
    auth.error ||
    !auth.userId
  ) {
    return {
      success: false,
      error:
        auth.error ??
        "Administrator access is required.",
    };
  }

  const event =
    normalizeEvent(
      parsed.data,
    );

  const today =
    getTodayInTimezone(
      event.timezone,
    );

  let generatedSessions: ReturnType<
    typeof generateEventSessions
  > = [];

  try {
    const range =
      getRollingSessionGenerationRange(
        event,
        today,
      );

    if (range) {
      generatedSessions =
        generateEventSessions(
          event,
          range,
        );
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to regenerate event sessions.",
    };
  }

  const sessionsPayload =
    generatedSessions.map(
      (session) => ({
        session_date:
          session.sessionDate,

        starts_at:
          session.startsAt,

        ends_at:
          session.endsAt,

        status:
          session.status,
      }),
    );

  const {
    error,
  } = await auth.supabase.rpc(
    "update_event_with_sessions",
    {
      p_event_id:
        parsedId.data,

      p_event:
        buildEventPayload(
          event,
        ),

      p_sessions:
        sessionsPayload,

      p_regenerate_from:
        today,
    },
  );

  if (error) {
    console.error(
      "update_event_with_sessions failed:",
      error,
    );

    return {
      success: false,
      error:
        "Unable to update the event.",
    };
  }

  revalidatePath(
    "/events",
  );

  revalidatePath(
    `/events/${parsedId.data}`,
  );

  revalidatePath(
    `/events/${parsedId.data}/edit`,
  );

  return {
    success: true,
    eventId:
      parsedId.data,
  };
}

export async function setEventArchivedAction(
  eventId: string,
  archived: boolean,
): Promise<EventActionResult> {
  const parsedId =
    eventIdSchema.safeParse(
      eventId,
    );

  if (!parsedId.success) {
    return {
      success: false,
      error:
        "Invalid event ID.",
    };
  }

  const auth =
    await requireAdmin();

  if (
    auth.error ||
    !auth.userId
  ) {
    return {
      success: false,
      error:
        auth.error ??
        "Administrator access is required.",
    };
  }

  const {
    error,
  } = await auth.supabase
    .from("events")
    .update({
      status:
        archived
          ? "archived"
          : "active",

      updated_by:
        auth.userId,
    })
    .eq(
      "id",
      parsedId.data,
    );

  if (error) {
    return {
      success: false,
      error:
        archived
          ? "Unable to archive the event."
          : "Unable to restore the event.",
    };
  }

  revalidatePath(
    "/events",
  );

  revalidatePath(
    `/events/${parsedId.data}`,
  );

  return {
    success: true,
    eventId:
      parsedId.data,
  };
}

export async function updateEventSessionAction(
  eventId: string,
  sessionId: string,
  input: unknown,
): Promise<EventActionResult> {
  const parsedEventId =
    eventIdSchema.safeParse(
      eventId,
    );

  const parsedSessionId =
    eventSessionIdSchema.safeParse(
      sessionId,
    );

  if (
    !parsedEventId.success ||
    !parsedSessionId.success
  ) {
    return {
      success: false,
      error:
        "Invalid event or session ID.",
    };
  }

  const parsed =
    updateEventSessionSchema.safeParse({
      ...(typeof input ===
        "object" &&
      input !== null
        ? input
        : {}),
      status: "scheduled",
    });

  if (!parsed.success) {
    return {
      success: false,
      error:
        "Please check the highlighted fields.",
      fieldErrors:
        buildFieldErrors(
          parsed.error.issues,
        ),
    };
  }

  const auth =
    await requireAdmin();

  if (
    auth.error ||
    !auth.userId
  ) {
    return {
      success: false,
      error:
        auth.error ??
        "Administrator access is required.",
    };
  }

  const {
    data: event,
    error: eventError,
  } = await auth.supabase
    .from("events")
    .select(
      "id, timezone",
    )
    .eq(
      "id",
      parsedEventId.data,
    )
    .maybeSingle();

  if (
    eventError ||
    !event
  ) {
    return {
      success: false,
      error:
        "Event not found.",
    };
  }

  const {
    data: session,
    error: sessionError,
  } = await auth.supabase
    .from("event_sessions")
    .select(
      "id, status",
    )
    .eq(
      "id",
      parsedSessionId.data,
    )
    .eq(
      "event_id",
      parsedEventId.data,
    )
    .maybeSingle();

  if (
    sessionError ||
    !session
  ) {
    return {
      success: false,
      error:
        "Session not found.",
    };
  }

  let startsAt: Date;

  try {
    startsAt =
      zonedDateTimeToUtc(
        parsed.data.sessionDate,
        parsed.data.startTime,
        event.timezone,
      );
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to calculate the session time.",
    };
  }

  const endsAt =
    new Date(
      startsAt.getTime() +
        parsed.data
          .durationMinutes *
          60 *
          1000,
    );

  const {
    error: updateError,
  } = await auth.supabase
    .from("event_sessions")
    .update({
      session_date:
        parsed.data.sessionDate,

      starts_at:
        startsAt.toISOString(),

      ends_at:
        endsAt.toISOString(),

      title_override:
        parsed.data
          .titleOverride ??
        null,

      location_override:
        parsed.data
          .locationOverride ??
        null,

      notes:
        parsed.data.notes ??
        null,

      updated_by:
        auth.userId,
    })
    .eq(
      "id",
      parsedSessionId.data,
    )
    .eq(
      "event_id",
      parsedEventId.data,
    );

  if (updateError) {
    return {
      success: false,
      error:
        "Unable to update the session.",
    };
  }

  revalidatePath(
    `/events/${parsedEventId.data}`,
  );

  revalidatePath(
    `/events/${parsedEventId.data}/sessions/${parsedSessionId.data}/edit`,
  );

  return {
    success: true,
    eventId:
      parsedEventId.data,
  };
}

export async function setEventSessionCancelledAction(
  eventId: string,
  sessionId: string,
  cancelled: boolean,
): Promise<EventActionResult> {
  const parsedEventId =
    eventIdSchema.safeParse(
      eventId,
    );

  const parsedSessionId =
    eventSessionIdSchema.safeParse(
      sessionId,
    );

  if (
    !parsedEventId.success ||
    !parsedSessionId.success
  ) {
    return {
      success: false,
      error:
        "Invalid event or session ID.",
    };
  }

  const auth =
    await requireAdmin();

  if (
    auth.error ||
    !auth.userId
  ) {
    return {
      success: false,
      error:
        auth.error ??
        "Administrator access is required.",
    };
  }

  const {
    data: session,
    error: sessionError,
  } = await auth.supabase
    .from("event_sessions")
    .select(
      "id, status",
    )
    .eq(
      "id",
      parsedSessionId.data,
    )
    .eq(
      "event_id",
      parsedEventId.data,
    )
    .maybeSingle();

  if (
    sessionError ||
    !session
  ) {
    return {
      success: false,
      error:
        "Session not found.",
    };
  }

  if (
    cancelled &&
    session.status ===
      "completed"
  ) {
    return {
      success: false,
      error:
        "A completed session cannot be cancelled.",
    };
  }

  const nextStatus =
    cancelled
      ? "cancelled"
      : "scheduled";

  const {
    error,
  } = await auth.supabase
    .from("event_sessions")
    .update({
      status:
        nextStatus,

      updated_by:
        auth.userId,
    })
    .eq(
      "id",
      parsedSessionId.data,
    )
    .eq(
      "event_id",
      parsedEventId.data,
    );

  if (error) {
    return {
      success: false,
      error:
        cancelled
          ? "Unable to cancel the session."
          : "Unable to restore the session.",
    };
  }

  revalidatePath(
    `/events/${parsedEventId.data}`,
  );

  revalidatePath(
    `/events/${parsedEventId.data}/sessions/${parsedSessionId.data}/edit`,
  );

  return {
    success: true,
    eventId:
      parsedEventId.data,
  };
}
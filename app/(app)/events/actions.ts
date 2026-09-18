"use server";

import { revalidatePath } from "next/cache";

import {
  generateEventSessions,
  getInitialSessionGenerationRange,
} from "@/lib/events/recurrence";

import {
  createEventSchema,
} from "@/lib/events/validation";

import { createClient } from "@/lib/supabase/server";

export interface CreateEventActionResult {
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

export async function createEventAction(
  input: unknown,
): Promise<CreateEventActionResult> {
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

  const supabase =
    await createClient();

  const {
    data: claimsData,
    error: claimsError,
  } =
    await supabase.auth.getClaims();

  if (claimsError) {
    return {
      success: false,
      error:
        "Unable to verify your session.",
    };
  }

  const userId =
    claimsData?.claims?.sub;

  if (!userId) {
    return {
      success: false,
      error:
        "You must be signed in to create an event.",
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
    !profile.is_active
  ) {
    return {
      success: false,
      error:
        "Your account does not have access to this action.",
    };
  }

  if (
    profile.role !== "admin"
  ) {
    return {
      success: false,
      error:
        "Only administrators can create events.",
    };
  }

  const data =
    parsed.data;

  const normalizedEvent = {
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

  let generatedSessions;

  try {
    const range =
      getInitialSessionGenerationRange(
        normalizedEvent,
      );

    generatedSessions =
      generateEventSessions(
        normalizedEvent,
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
        "This schedule did not generate any sessions. Check the start date and recurrence settings.",
    };
  }

  const eventPayload = {
    name:
      normalizedEvent.name,

    description:
      normalizedEvent.description ??
      null,

    event_type:
      normalizedEvent.eventType,

    location:
      normalizedEvent.location ??
      null,

    status:
      normalizedEvent.status,

    recurrence:
      normalizedEvent.recurrence,

    recurrence_interval:
      normalizedEvent.recurrenceInterval,

    days_of_week:
      normalizedEvent.daysOfWeek,

    day_of_month:
      normalizedEvent.dayOfMonth,

    starts_on:
      normalizedEvent.startsOn,

    ends_on:
      normalizedEvent.endsOn,

    default_start_time:
      normalizedEvent.defaultStartTime,

    duration_minutes:
      normalizedEvent.durationMinutes,

    timezone:
      normalizedEvent.timezone,
  };

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
    error: createError,
  } = await supabase.rpc(
    "create_event_with_sessions",
    {
      p_event:
        eventPayload,

      p_sessions:
        sessionsPayload,
    },
  );

  if (createError) {
    console.error(
      "create_event_with_sessions failed:",
      createError,
    );

    return {
      success: false,
      error:
        "Unable to create the event. Please try again.",
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
        "The event was created, but ChurchFlow could not determine its ID.",
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
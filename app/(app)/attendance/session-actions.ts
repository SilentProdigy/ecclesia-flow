"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  eventSessionIdSchema,
} from "@/lib/attendance";

import {
  createClient,
} from "@/lib/supabase/server";

export async function completeAttendanceSessionAction(
  eventSessionId: string
) {
  const parsed =
    eventSessionIdSchema.safeParse(
      eventSessionId
    );

  if (!parsed.success) {
    return {
      success: false as const,
      message:
        "Invalid attendance session.",
    };
  }

  const supabase =
    await createClient();

  const {
    data: claimsData,
  } =
    await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub;

  if (!userId) {
    return {
      success: false as const,
      message:
        "Your staff session is no longer available.",
    };
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(
      "id, is_active"
    )
    .eq(
      "id",
      userId
    )
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    !profile.is_active
  ) {
    return {
      success: false as const,
      message:
        "You do not have permission to complete attendance.",
    };
  }

  const {
    data: session,
    error: sessionError,
  } = await supabase
    .from(
      "event_sessions"
    )
    .select(
      "id, status"
    )
    .eq(
      "id",
      parsed.data
    )
    .maybeSingle();

  if (
    sessionError ||
    !session
  ) {
    return {
      success: false as const,
      message:
        "Attendance session could not be found.",
    };
  }

  if (
    session.status ===
    "completed"
  ) {
    return {
      success: true as const,
      alreadyCompleted: true,
    };
  }

  if (
    session.status !==
    "open"
  ) {
    return {
      success: false as const,
      message:
        "Only an open attendance session can be completed.",
    };
  }

  const {
    data: updatedSession,
    error: updateError,
  } = await supabase
    .from(
      "event_sessions"
    )
    .update({
      status:
        "completed",

      updated_by:
        userId,
    })
    .eq(
      "id",
      parsed.data
    )
    .eq(
      "status",
      "open"
    )
    .select(
      "id"
    )
    .maybeSingle();

  if (updateError) {
    console.error(
      "Unable to complete attendance session:",
      updateError
    );

    return {
      success: false as const,
      message:
        "Attendance could not be completed. Please try again.",
    };
  }

  if (!updatedSession) {
    return {
      success: false as const,
      message:
        "The session status changed before attendance could be completed. Refresh and try again.",
    };
  }

  revalidatePath(
    "/attendance"
  );

  revalidatePath(
    `/attendance/${parsed.data}`
  );

  return {
    success: true as const,
    alreadyCompleted: false,
  };
}
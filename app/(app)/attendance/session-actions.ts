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

async function getAuthenticatedStaff() {
  const supabase =
    await createClient();

  const {
    data: claimsData,
  } =
    await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub;

  if (!userId) {
    return null;
  }

  const {
    data: profile,
    error,
  } = await supabase
    .from("profiles")
    .select(`
      id,
      role,
      is_active
    `)
    .eq(
      "id",
      userId
    )
    .maybeSingle();

  if (
    error ||
    !profile ||
    !profile.is_active
  ) {
    return null;
  }

  return {
    supabase,
    userId,
    role:
      profile.role,
  };
}

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

  const auth =
    await getAuthenticatedStaff();

  if (!auth) {
    return {
      success: false as const,
      message:
        "Your staff session is no longer available.",
    };
  }

  const {
    supabase,
    userId,
  } = auth;

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

export async function reopenAttendanceSessionAction(
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

  const auth =
    await getAuthenticatedStaff();

  if (!auth) {
    return {
      success: false as const,
      message:
        "Your staff session is no longer available.",
    };
  }

  const {
    supabase,
    userId,
    role,
  } = auth;

  if (
    role !==
    "admin"
  ) {
    return {
      success: false as const,
      message:
        "Only an admin can re-open completed attendance.",
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
    "open"
  ) {
    return {
      success: true as const,
      alreadyOpen: true,
    };
  }

  if (
    session.status !==
    "completed"
  ) {
    return {
      success: false as const,
      message:
        "Only a completed attendance session can be re-opened.",
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
        "open",

      updated_by:
        userId,
    })
    .eq(
      "id",
      parsed.data
    )
    .eq(
      "status",
      "completed"
    )
    .select(
      "id"
    )
    .maybeSingle();

  if (updateError) {
    console.error(
      "Unable to reopen attendance session:",
      updateError
    );

    return {
      success: false as const,
      message:
        "Attendance could not be re-opened. Please try again.",
    };
  }

  if (!updatedSession) {
    return {
      success: false as const,
      message:
        "The session status changed before it could be re-opened. Refresh and try again.",
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
    alreadyOpen: false,
  };
}
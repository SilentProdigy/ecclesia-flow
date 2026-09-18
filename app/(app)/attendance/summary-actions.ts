"use server";

import {
  eventSessionIdSchema,
  type AttendanceSummaryResult,
} from "@/lib/attendance";

import {
  getAttendanceSessionSummary,
} from "@/lib/attendance/attendance-summary.server";

import {
  createClient,
} from "@/lib/supabase/server";

export async function getAttendanceSummaryAction(
  eventSessionId: string
): Promise<AttendanceSummaryResult> {
  const parsed =
    eventSessionIdSchema.safeParse(
      eventSessionId
    );

  if (!parsed.success) {
    return {
      success: false,

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
      success: false,

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
      success: false,

      message:
        "You do not have permission to view attendance.",
    };
  }

  try {
    const summary =
      await getAttendanceSessionSummary(
        parsed.data
      );

    return {
      success: true,
      summary,
    };
  } catch (error) {
    console.error(
      "Attendance summary action failed:",
      error
    );

    return {
      success: false,

      message:
        "Unable to load attendance summary.",
    };
  }
}
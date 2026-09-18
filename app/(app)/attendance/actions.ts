"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

import {
  eventSessionIdSchema,
} from "@/lib/attendance";

import {
  createClient,
} from "@/lib/supabase/server";

export async function openAttendanceSessionAction(
  formData: FormData
) {
  const parsed =
    eventSessionIdSchema.safeParse(
      formData.get(
        "session_id"
      )
    );

  if (!parsed.success) {
    redirect(
      "/attendance?error=invalid-session"
    );
  }

  const sessionId =
    parsed.data;

  const supabase =
    await createClient();

  const {
    data: claimsData,
  } =
    await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub;

  if (!userId) {
    redirect(
      "/auth/login"
    );
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
      sessionId
    )
    .maybeSingle();

  if (
    sessionError ||
    !session
  ) {
    redirect(
      `/attendance/${sessionId}?error=session-unavailable`
    );
  }

  if (
    session.status ===
    "open"
  ) {
    redirect(
      `/attendance/${sessionId}`
    );
  }

  if (
    session.status !==
    "scheduled"
  ) {
    redirect(
      `/attendance/${sessionId}?error=cannot-open`
    );
  }

  const {
    error: updateError,
  } = await supabase
    .from(
      "event_sessions"
    )
    .update({
      status: "open",
      updated_by: userId,
    })
    .eq(
      "id",
      sessionId
    )
    .eq(
      "status",
      "scheduled"
    );

  if (updateError) {
    console.error(
      "Unable to open attendance session:",
      updateError
    );

    redirect(
      `/attendance/${sessionId}?error=start-failed`
    );
  }

  revalidatePath(
    "/attendance"
  );

  revalidatePath(
    `/attendance/${sessionId}`
  );

  redirect(
    `/attendance/${sessionId}`
  );
}
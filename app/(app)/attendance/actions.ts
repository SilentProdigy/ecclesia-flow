"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

import {
  attendanceRecordIdSchema,
  eventSessionIdSchema,
  manualCheckInSchema,
  quickVisitorCheckInSchema,
  voidAttendanceSchema,
  type AttendanceMemberSearchResult,
  type AttendanceRosterResult,
  type ManualMemberCheckInResult,
  type QuickVisitorRegistrationResult,
  type QuickVisitorCheckInInput,
  type VoidAttendanceResult,
} from "@/lib/attendance";

import {
  searchManualCheckInMembers,
} from "@/lib/attendance/manual-check-in.server";

import {
  getAttendanceRoster,
} from "@/lib/attendance/attendance-roster.server";

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
    .select(
      "id, is_active"
    )
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
  };
}

function getMemberDisplayName(
  member: {
    first_name: string;

    middle_name:
      string | null;

    last_name: string;

    suffix:
      string | null;
  }
) {
  return [
    member.first_name,
    member.middle_name,
    member.last_name,
    member.suffix,
  ]
    .filter(Boolean)
    .join(" ");
}

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

  const auth =
    await getAuthenticatedStaff();

  if (!auth) {
    redirect(
      "/auth/login"
    );
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

export async function searchAttendanceMembersAction({
  eventSessionId,
  query,
}: {
  eventSessionId: string;

  query: string;
}): Promise<AttendanceMemberSearchResult> {
  const parsed =
    eventSessionIdSchema.safeParse(
      eventSessionId
    );

  if (!parsed.success) {
    return {
      success: false,
      members: [],
      message:
        "Invalid attendance session.",
    };
  }

  const auth =
    await getAuthenticatedStaff();

  if (!auth) {
    return {
      success: false,
      members: [],
      message:
        "Your staff session is no longer available.",
    };
  }

  try {
    const members =
      await searchManualCheckInMembers({
        eventSessionId:
          parsed.data,

        query,
      });

    return {
      success: true,
      members,
    };
  } catch (error) {
    console.error(
      "Attendance member search failed:",
      error
    );

    return {
      success: false,
      members: [],
      message:
        "Unable to search members.",
    };
  }
}

export async function getAttendanceRosterAction(
  eventSessionId: string
): Promise<AttendanceRosterResult> {
  const parsed =
    eventSessionIdSchema.safeParse(
      eventSessionId
    );

  if (!parsed.success) {
    return {
      success: false,
      roster: [],
      count: 0,
      message:
        "Invalid attendance session.",
    };
  }

  const auth =
    await getAuthenticatedStaff();

  if (!auth) {
    return {
      success: false,
      roster: [],
      count: 0,
      message:
        "Your staff session is no longer available.",
    };
  }

  try {
    const roster =
      await getAttendanceRoster(
        parsed.data
      );

    return {
      success: true,
      roster,
      count:
        roster.length,
    };
  } catch (error) {
    console.error(
      "Attendance roster load failed:",
      error
    );

    return {
      success: false,
      roster: [],
      count: 0,
      message:
        "Unable to load the attendance roster.",
    };
  }
}

export async function manualCheckInMemberAction({
  eventSessionId,
  memberId,
}: {
  eventSessionId: string;

  memberId: string;
}): Promise<ManualMemberCheckInResult> {
  const parsed =
    manualCheckInSchema.safeParse({
      event_session_id:
        eventSessionId,

      member_id:
        memberId,

      notes: null,
    });

  if (!parsed.success) {
    return {
      success: false,
      status: "error",
      message:
        "Invalid attendance request.",
    };
  }

  const auth =
    await getAuthenticatedStaff();

  if (!auth) {
    return {
      success: false,
      status: "error",
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
        .event_session_id
    )
    .maybeSingle();

  if (
    sessionError ||
    !session
  ) {
    return {
      success: false,
      status: "error",
      message:
        "This attendance session is unavailable.",
    };
  }

  if (
    session.status !==
    "open"
  ) {
    return {
      success: false,
      status: "error",
      message:
        "Attendance is no longer open for this session.",
    };
  }

  const {
    data: member,
    error: memberError,
  } = await supabase
    .from("members")
    .select(`
      id,
      first_name,
      middle_name,
      last_name,
      suffix,
      member_type,
      status
    `)
    .eq(
      "id",
      parsed.data.member_id
    )
    .maybeSingle();

  if (
    memberError ||
    !member
  ) {
    return {
      success: false,
      status: "error",
      message:
        "Member could not be found.",
    };
  }

  if (
    member.status !==
    "active"
  ) {
    return {
      success: false,
      status: "error",
      message:
        "Inactive members cannot be checked in.",
    };
  }

  const displayName =
    getMemberDisplayName(
      member
    );

  const {
    data:
      existingAttendance,

    error:
      existingAttendanceError,
  } = await supabase
    .from(
      "attendance_records"
    )
    .select(
      "id, checked_in_at"
    )
    .eq(
      "event_session_id",
      parsed.data
        .event_session_id
    )
    .eq(
      "member_id",
      parsed.data.member_id
    )
    .is(
      "voided_at",
      null
    )
    .maybeSingle();

  if (
    existingAttendanceError
  ) {
    console.error(
      "Unable to check existing attendance:",
      existingAttendanceError
    );

    return {
      success: false,
      status: "error",
      message:
        "Unable to verify attendance.",
    };
  }

  if (
    existingAttendance
  ) {
    return {
      success: true,
      status:
        "already_checked_in",

      memberId:
        member.id,

      attendanceRecordId:
        existingAttendance.id,

      checkedInAt:
        existingAttendance
          .checked_in_at,

      displayName,
    };
  }

  const {
    data:
      attendanceRecord,

    error:
      attendanceError,
  } = await supabase
    .from(
      "attendance_records"
    )
    .insert({
      event_session_id:
        parsed.data
          .event_session_id,

      member_id:
        parsed.data.member_id,

      check_in_method:
        "manual",

      checked_in_by:
        userId,

      member_type_at_check_in:
        member.member_type,

      notes:
        parsed.data.notes,
    })
    .select(
      "id, checked_in_at"
    )
    .single();

  if (
    attendanceError
  ) {
    if (
      attendanceError.code ===
      "23505"
    ) {
      return {
        success: true,
        status:
          "already_checked_in",

        memberId:
          member.id,

        attendanceRecordId:
          null,

        checkedInAt:
          null,

        displayName,
      };
    }

    console.error(
      "Unable to check in member:",
      attendanceError
    );

    return {
      success: false,
      status: "error",
      message:
        "Member could not be checked in.",
    };
  }

  revalidatePath(
    "/attendance"
  );

  revalidatePath(
    `/attendance/${parsed.data.event_session_id}`
  );

  return {
    success: true,
    status: "checked_in",

    memberId:
      member.id,

    attendanceRecordId:
      attendanceRecord.id,

    checkedInAt:
      attendanceRecord
        .checked_in_at,

    displayName,
  };
}

interface QuickVisitorRpcRow {
  member_id: string;

  member_no: number;

  attendance_record_id:
    string;

  checked_in_at: string;
}

export async function registerVisitorAndCheckInAction(
  input:
    QuickVisitorCheckInInput
): Promise<QuickVisitorRegistrationResult> {
  const parsed =
    quickVisitorCheckInSchema.safeParse(
      input
    );

  if (!parsed.success) {
    return {
      success: false,

      message:
        parsed.error.issues[0]
          ?.message ??
        "Please check the visitor details.",
    };
  }

  const auth =
    await getAuthenticatedStaff();

  if (!auth) {
    return {
      success: false,

      message:
        "Your staff session is no longer available.",
    };
  }

  const {
    supabase,
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
        .event_session_id
    )
    .maybeSingle();

  if (
    sessionError ||
    !session
  ) {
    return {
      success: false,

      message:
        "This attendance session is unavailable.",
    };
  }

  if (
    session.status !==
    "open"
  ) {
    return {
      success: false,

      message:
        "Attendance is no longer open for this session.",
    };
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    "register_visitor_and_check_in",
    {
      p_event_session_id:
        parsed.data
          .event_session_id,

      p_first_name:
        parsed.data
          .first_name,

      p_last_name:
        parsed.data
          .last_name,

      p_phone:
        parsed.data.phone,

      p_email:
        parsed.data.email,
    }
  );

  if (error) {
    console.error(
      "Unable to register and check in visitor:",
      error
    );

    if (
      error.message.includes(
        "Attendance session is not open"
      )
    ) {
      return {
        success: false,

        message:
          "Attendance is no longer open for this session.",
      };
    }

    return {
      success: false,

      message:
        "Visitor could not be registered. Please try again.",
    };
  }

  const row =
    (
      data as
        | QuickVisitorRpcRow[]
        | null
    )?.[0];

  if (!row) {
    return {
      success: false,

      message:
        "Visitor registration did not complete.",
    };
  }

  const displayName =
    `${parsed.data.first_name} ${parsed.data.last_name}`;

  revalidatePath(
    "/members"
  );

  revalidatePath(
    "/attendance"
  );

  revalidatePath(
    `/attendance/${parsed.data.event_session_id}`
  );

  return {
    success: true,

    memberId:
      row.member_id,

    memberNo:
      row.member_no,

    attendanceRecordId:
      row.attendance_record_id,

    checkedInAt:
      row.checked_in_at,

    displayName,
  };
}

export async function voidAttendanceRecordAction({
  eventSessionId,
  attendanceRecordId,
  reason,
}: {
  eventSessionId: string;

  attendanceRecordId:
    string;

  reason: string;
}): Promise<VoidAttendanceResult> {
  const sessionParsed =
    eventSessionIdSchema.safeParse(
      eventSessionId
    );

  const attendanceParsed =
    attendanceRecordIdSchema.safeParse(
      attendanceRecordId
    );

  const voidParsed =
    voidAttendanceSchema.safeParse({
      attendance_record_id:
        attendanceRecordId,

      reason,
    });

  if (
    !sessionParsed.success ||
    !attendanceParsed.success ||
    !voidParsed.success
  ) {
    return {
      success: false,

      message:
        voidParsed.success
          ? "Invalid attendance record."
          : voidParsed.error
              .issues[0]
              ?.message ??
            "Please provide a reason.",
    };
  }

  const auth =
    await getAuthenticatedStaff();

  if (!auth) {
    return {
      success: false,

      message:
        "Your staff session is no longer available.",
    };
  }

  const {
    supabase,
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
      sessionParsed.data
    )
    .maybeSingle();

  if (
    sessionError ||
    !session
  ) {
    return {
      success: false,

      message:
        "This attendance session is unavailable.",
    };
  }

  if (
    session.status !==
    "open"
  ) {
    return {
      success: false,

      message:
        "Attendance corrections are only available while this session is open.",
    };
  }

  const {
    data: attendance,
    error:
      attendanceError,
  } = await supabase
    .from(
      "attendance_records"
    )
    .select(`
      id,
      member_id,
      voided_at,
      members!inner (
        first_name,
        middle_name,
        last_name,
        suffix
      )
    `)
    .eq(
      "id",
      attendanceParsed.data
    )
    .eq(
      "event_session_id",
      sessionParsed.data
    )
    .maybeSingle();

  if (
    attendanceError ||
    !attendance
  ) {
    return {
      success: false,

      message:
        "Attendance record could not be found.",
    };
  }

  if (
    attendance.voided_at
  ) {
    return {
      success: false,

      message:
        "This attendance record has already been corrected.",
    };
  }

  const rawMember =
    attendance.members;

  const member =
    Array.isArray(
      rawMember
    )
      ? rawMember[0]
      : rawMember;

  if (!member) {
    return {
      success: false,

      message:
        "Member information could not be loaded.",
    };
  }

  const displayName =
    getMemberDisplayName(
      member
    );

  const {
    error: updateError,
  } = await supabase
    .from(
      "attendance_records"
    )
    .update({
      voided_at:
        new Date()
          .toISOString(),

      void_reason:
        voidParsed.data
          .reason,
    })
    .eq(
      "id",
      attendanceParsed.data
    )
    .eq(
      "event_session_id",
      sessionParsed.data
    )
    .is(
      "voided_at",
      null
    );

  if (updateError) {
    console.error(
      "Unable to void attendance record:",
      updateError
    );

    return {
      success: false,

      message:
        "Attendance correction could not be saved.",
    };
  }

  revalidatePath(
    "/attendance"
  );

  revalidatePath(
    `/attendance/${sessionParsed.data}`
  );

  return {
    success: true,

    attendanceRecordId:
      attendanceParsed.data,

    memberId:
      attendance.member_id,

    displayName,
  };
}
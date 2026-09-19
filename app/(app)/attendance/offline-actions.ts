"use server";

import {
  attendanceRecordIdSchema,
  eventSessionIdSchema,
  quickVisitorCheckInSchema,
  type AttendanceOfflineBootstrapResult,
  type CachedAttendanceMember,
  type OfflineAttendanceSyncInput,
  type OfflineAttendanceSyncResult,
  type OfflineVisitorSyncInput,
  type OfflineVisitorSyncResult,
} from "@/lib/attendance";

import {
  createClient,
} from "@/lib/supabase/server";

const PAGE_SIZE = 500;

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
    !profile.is_active ||
    ![
      "admin",
      "staff",
    ].includes(
      profile.role
    )
  ) {
    return null;
  }

  return {
    supabase,
    userId,
  };
}

export async function getAttendanceOfflineBootstrapAction(
  eventSessionId: string
): Promise<AttendanceOfflineBootstrapResult> {
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
    .select(`
      id,
      event_id,
      session_date,
      starts_at,
      ends_at,
      status,
      title_override,
      location_override
    `)
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
      success: false,

      message:
        "Attendance session could not be found.",
    };
  }

  const {
    data: event,
    error: eventError,
  } = await supabase
    .from("events")
    .select(`
      id,
      name,
      location,
      timezone
    `)
    .eq(
      "id",
      session.event_id
    )
    .maybeSingle();

  if (
    eventError ||
    !event
  ) {
    return {
      success: false,

      message:
        "Attendance event could not be found.",
    };
  }

  try {
    const [
      members,
      checkedInMemberIds,
    ] =
      await Promise.all([
        loadAllActiveMembers(
          supabase
        ),

        loadCheckedInMemberIds(
          supabase,
          session.id
        ),
      ]);

    const cachedAt =
      new Date()
        .toISOString();

    return {
      success: true,

      payload: {
        cachedAt,

        session: {
          id:
            session.id,

          event_id:
            session.event_id,

          title:
            session.title_override ??
            event.name,

          status:
            session.status,

          session_date:
            session.session_date,

          starts_at:
            session.starts_at,

          ends_at:
            session.ends_at,

          location:
            session.location_override ??
            event.location,

          timezone:
            event.timezone,

          cached_at:
            cachedAt,
        },

        members,

        checkedInMemberIds,
      },
    };
  } catch (error) {
    console.error(
      "Unable to build attendance offline cache:",
      error
    );

    return {
      success: false,

      message:
        "Unable to prepare attendance for offline use.",
    };
  }
}

export async function syncOfflineAttendanceCheckInAction(
  input:
    OfflineAttendanceSyncInput
): Promise<OfflineAttendanceSyncResult> {
  const eventSessionParsed =
    eventSessionIdSchema.safeParse(
      input.event_session_id
    );

  const memberParsed =
    attendanceRecordIdSchema.safeParse(
      input.member_id
    );

  const attendanceParsed =
    attendanceRecordIdSchema.safeParse(
      input.attendance_record_id
    );

  const timestampValid =
    !Number.isNaN(
      Date.parse(
        input.checked_in_at
      )
    );

  if (
    !eventSessionParsed.success ||
    !memberParsed.success ||
    !attendanceParsed.success ||
    !timestampValid
  ) {
    return {
      success: false,

      code:
        "invalid",

      retryable:
        false,

      message:
        "Invalid offline attendance record.",
    };
  }

  const auth =
    await getAuthenticatedStaff();

  if (!auth) {
    return {
      success: false,

      code:
        "unauthorized",

      retryable:
        false,

      message:
        "Your staff session is no longer available.",
    };
  }

  const {
    supabase,
    userId,
  } = auth;

  const {
    data:
      existingById,

    error:
      existingByIdError,
  } = await supabase
    .from(
      "attendance_records"
    )
    .select(`
      id,
      event_session_id,
      member_id
    `)
    .eq(
      "id",
      attendanceParsed.data
    )
    .maybeSingle();

  if (
    existingByIdError
  ) {
    console.error(
      "Unable to verify offline attendance id:",
      existingByIdError
    );

    return {
      success: false,

      code:
        "sync_failed",

      retryable:
        true,

      message:
        "Unable to verify offline attendance.",
    };
  }

  if (
    existingById
  ) {
    if (
      existingById
        .event_session_id !==
        eventSessionParsed.data ||
      existingById
        .member_id !==
        memberParsed.data
    ) {
      return {
        success: false,

        code:
          "invalid",

        retryable:
          false,

        message:
          "The offline attendance identifier conflicts with another record.",
      };
    }

    return {
      success: true,

      status:
        "already_synced",

      attendanceRecordId:
        existingById.id,
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
      eventSessionParsed.data
    )
    .maybeSingle();

  if (
    sessionError
  ) {
    console.error(
      "Unable to verify offline attendance session:",
      sessionError
    );

    return {
      success: false,

      code:
        "sync_failed",

      retryable:
        true,

      message:
        "Unable to verify the attendance session.",
    };
  }

  if (
    !session ||
    session.status !==
      "open"
  ) {
    return {
      success: false,

      code:
        "session_closed",

      retryable:
        false,

      message:
        "This attendance session is no longer open.",
    };
  }

  const {
    data: member,
    error: memberError,
  } = await supabase
    .from("members")
    .select(`
      id,
      status,
      member_type
    `)
    .eq(
      "id",
      memberParsed.data
    )
    .maybeSingle();

  if (
    memberError
  ) {
    console.error(
      "Unable to verify offline attendance member:",
      memberError
    );

    return {
      success: false,

      code:
        "sync_failed",

      retryable:
        true,

      message:
        "Unable to verify the member.",
    };
  }

  if (
    !member ||
    member.status !==
      "active"
  ) {
    return {
      success: false,

      code:
        "member_inactive",

      retryable:
        false,

      message:
        "This member is no longer active.",
    };
  }

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
      "id"
    )
    .eq(
      "event_session_id",
      eventSessionParsed.data
    )
    .eq(
      "member_id",
      memberParsed.data
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
      "Unable to check duplicate offline attendance:",
      existingAttendanceError
    );

    return {
      success: false,

      code:
        "sync_failed",

      retryable:
        true,

      message:
        "Unable to verify existing attendance.",
    };
  }

  if (
    existingAttendance
  ) {
    return {
      success: true,

      status:
        "already_checked_in",

      attendanceRecordId:
        existingAttendance.id,
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
      id:
        attendanceParsed.data,

      event_session_id:
        eventSessionParsed.data,

      member_id:
        memberParsed.data,

      check_in_method:
        "manual",

      checked_in_at:
        input.checked_in_at,

      checked_in_by:
        userId,

      member_type_at_check_in:
        member.member_type,
    })
    .select(
      "id"
    )
    .single();

  if (
    attendanceError
  ) {
    if (
      attendanceError.code ===
      "23505"
    ) {
      const {
        data:
          duplicateAttendance,
      } = await supabase
        .from(
          "attendance_records"
        )
        .select(
          "id"
        )
        .eq(
          "event_session_id",
          eventSessionParsed.data
        )
        .eq(
          "member_id",
          memberParsed.data
        )
        .is(
          "voided_at",
          null
        )
        .maybeSingle();

      if (
        duplicateAttendance
      ) {
        return {
          success:
            true,

          status:
            "already_checked_in",

          attendanceRecordId:
            duplicateAttendance.id,
        };
      }
    }

    console.error(
      "Unable to sync offline attendance:",
      attendanceError
    );

    return {
      success: false,

      code:
        "sync_failed",

      retryable:
        true,

      message:
        "Offline attendance could not be synchronized.",
    };
  }

  return {
    success: true,

    status:
      "synced",

    attendanceRecordId:
      attendanceRecord.id,
  };
}

export async function syncOfflineVisitorRegistrationAction(
  input:
    OfflineVisitorSyncInput
): Promise<OfflineVisitorSyncResult> {
  const visitorParsed =
    quickVisitorCheckInSchema.safeParse({
      event_session_id:
        input.event_session_id,

      first_name:
        input.first_name,

      last_name:
        input.last_name,

      phone:
        input.phone,

      email:
        input.email,
    });

  const memberParsed =
    attendanceRecordIdSchema.safeParse(
      input.member_id
    );

  const attendanceParsed =
    attendanceRecordIdSchema.safeParse(
      input.attendance_record_id
    );

  const timestampValid =
    !Number.isNaN(
      Date.parse(
        input.checked_in_at
      )
    );

  if (
    !visitorParsed.success ||
    !memberParsed.success ||
    !attendanceParsed.success ||
    !timestampValid
  ) {
    return {
      success: false,

      code:
        "invalid",

      retryable:
        false,

      message:
        visitorParsed.success
          ? "Invalid offline visitor record."
          : visitorParsed.error
              .issues[0]
              ?.message ??
            "Invalid offline visitor record.",
    };
  }

  const auth =
    await getAuthenticatedStaff();

  if (!auth) {
    return {
      success: false,

      code:
        "unauthorized",

      retryable:
        false,

      message:
        "Your staff session is no longer available.",
    };
  }

  const {
    supabase,
  } = auth;

  const {
    data,
    error,
  } = await supabase.rpc(
    "sync_offline_visitor_and_check_in",
    {
      p_member_id:
        memberParsed.data,

      p_attendance_record_id:
        attendanceParsed.data,

      p_event_session_id:
        visitorParsed.data
          .event_session_id,

      p_first_name:
        visitorParsed.data
          .first_name,

      p_last_name:
        visitorParsed.data
          .last_name,

      p_phone:
        visitorParsed.data
          .phone,

      p_email:
        visitorParsed.data
          .email,

      p_checked_in_at:
        input.checked_in_at,
    }
  );

  if (error) {
    console.error(
      "Unable to synchronize offline visitor:",
      error
    );

    const message =
      error.message;

    if (
      message.includes(
        "Attendance session is not open"
      )
    ) {
      return {
        success: false,

        code:
          "session_closed",

        retryable:
          false,

        message:
          "This attendance session is no longer open.",
      };
    }

    if (
      message.includes(
        "Only active staff"
      )
    ) {
      return {
        success: false,

        code:
          "unauthorized",

        retryable:
          false,

        message:
          "Your staff session is no longer available.",
      };
    }

    if (
      message.includes(
        "conflicts"
      ) ||
      message.includes(
        "could not be found"
      )
    ) {
      return {
        success: false,

        code:
          "invalid",

        retryable:
          false,

        message,
      };
    }

    return {
      success: false,

      code:
        "sync_failed",

      retryable:
        true,

      message:
        "Offline visitor could not be synchronized.",
    };
  }

  const row =
    (
      data as
        | {
            member_id:
              string;

            member_no:
              number;

            attendance_record_id:
              string;

            checked_in_at:
              string;

            sync_status:
              | "synced"
              | "already_synced"
              | "already_checked_in";
          }[]
        | null
    )?.[0];

  if (!row) {
    return {
      success: false,

      code:
        "sync_failed",

      retryable:
        true,

      message:
        "Offline visitor synchronization returned no result.",
    };
  }

  return {
    success: true,

    status:
      row.sync_status,

    memberId:
      row.member_id,

    memberNo:
      row.member_no,

    attendanceRecordId:
      row.attendance_record_id,

    checkedInAt:
      row.checked_in_at,
  };
}

async function loadAllActiveMembers(
  supabase: Awaited<
    ReturnType<
      typeof createClient
    >
  >
): Promise<
  CachedAttendanceMember[]
> {
  const members:
    CachedAttendanceMember[] =
    [];

  let from = 0;

  while (true) {
    const {
      data,
      error,
    } = await supabase
      .from("members")
      .select(`
        id,
        member_no,
        first_name,
        middle_name,
        last_name,
        suffix,
        preferred_name,
        phone,
        email,
        member_type,
        photo_path
      `)
      .eq(
        "status",
        "active"
      )
      .order(
        "member_no",
        {
          ascending:
            true,
        }
      )
      .range(
        from,
        from +
          PAGE_SIZE -
          1
      );

    if (error) {
      throw error;
    }

    const rows =
      data ?? [];

    for (
      const member of
      rows
    ) {
      members.push({
        id:
          member.id,

        member_no:
          member.member_no,

        first_name:
          member.first_name,

        middle_name:
          member.middle_name,

        last_name:
          member.last_name,

        suffix:
          member.suffix,

        preferred_name:
          member.preferred_name,

        phone:
          member.phone,

        email:
          member.email,

        member_type:
          member.member_type,

        photo_path:
          member.photo_path,
      });
    }

    if (
      rows.length <
      PAGE_SIZE
    ) {
      break;
    }

    from +=
      PAGE_SIZE;
  }

  return members;
}

async function loadCheckedInMemberIds(
  supabase: Awaited<
    ReturnType<
      typeof createClient
    >
  >,
  sessionId: string
) {
  const memberIds:
    string[] = [];

  let from = 0;

  while (true) {
    const {
      data,
      error,
    } = await supabase
      .from(
        "attendance_records"
      )
      .select(
        "member_id"
      )
      .eq(
        "event_session_id",
        sessionId
      )
      .is(
        "voided_at",
        null
      )
      .order(
        "checked_in_at",
        {
          ascending:
            true,
        }
      )
      .range(
        from,
        from +
          PAGE_SIZE -
          1
      );

    if (error) {
      throw error;
    }

    const rows =
      data ?? [];

    for (
      const row of rows
    ) {
      memberIds.push(
        row.member_id
      );
    }

    if (
      rows.length <
      PAGE_SIZE
    ) {
      break;
    }

    from +=
      PAGE_SIZE;
  }

  return memberIds;
}
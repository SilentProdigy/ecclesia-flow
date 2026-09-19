"use server";

import {
  eventSessionIdSchema,
  type AttendanceOfflineBootstrapResult,
  type CachedAttendanceMember,
} from "@/lib/attendance";

import {
  createClient,
} from "@/lib/supabase/server";

const PAGE_SIZE = 500;

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
    profileError ||
    !profile ||
    !profile.is_active ||
    ![
      "admin",
      "staff",
    ].includes(
      profile.role
    )
  ) {
    return {
      success: false,

      message:
        "You do not have permission to cache attendance data.",
    };
  }

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
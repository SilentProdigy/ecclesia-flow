import "server-only";

import {
  createClient,
} from "@/lib/supabase/server";

import type {
  AttendanceMethod,
  AttendanceSessionSummary,
} from "./index";

import type {
  MemberType,
} from "@/lib/members";

interface RawAttendanceSummaryRecord {
  member_type_at_check_in:
    MemberType;

  check_in_method:
    AttendanceMethod;
}

function createEmptySummary(): AttendanceSessionSummary {
  return {
    total: 0,

    byMemberType: {
      member: 0,
      regular_attendee: 0,
      visitor: 0,
    },

    byMethod: {
      manual: 0,
      face: 0,
      qr: 0,
    },
  };
}

export async function getAttendanceSessionSummary(
  eventSessionId: string
): Promise<AttendanceSessionSummary> {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase
    .from(
      "attendance_records"
    )
    .select(`
      member_type_at_check_in,
      check_in_method
    `)
    .eq(
      "event_session_id",
      eventSessionId
    )
    .is(
      "voided_at",
      null
    );

  if (error) {
    console.error(
      "Unable to load attendance summary:",
      error
    );

    throw new Error(
      "Unable to load attendance summary."
    );
  }

  const summary =
    createEmptySummary();

  const records =
    (
      data ?? []
    ) as RawAttendanceSummaryRecord[];

  for (const record of records) {
    summary.total += 1;

    summary.byMemberType[
      record.member_type_at_check_in
    ] += 1;

    summary.byMethod[
      record.check_in_method
    ] += 1;
  }

  return summary;
}
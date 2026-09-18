import "server-only";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  getMemberPhotoUrls,
} from "@/lib/members/member-photo.server";

import type {
  AttendanceMethod,
  AttendanceRosterItem,
} from "./attendance-types";

import type {
  MemberType,
} from "@/lib/members";

interface RawMember {
  id: string;

  member_no: number;

  first_name: string;

  middle_name:
    string | null;

  last_name: string;

  suffix:
    string | null;

  preferred_name:
    string | null;

  photo_path:
    string | null;
}

interface RawAttendanceRecord {
  id: string;

  member_id: string;

  check_in_method:
    AttendanceMethod;

  checked_in_at: string;

  checked_in_by:
    string | null;

  member_type_at_check_in:
    MemberType;

  members:
    | RawMember
    | RawMember[]
    | null;
}

function normalizeMember(
  value:
    | RawMember
    | RawMember[]
    | null
) {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

export async function getAttendanceRoster(
  eventSessionId: string
): Promise<
  AttendanceRosterItem[]
> {
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
      id,
      member_id,
      check_in_method,
      checked_in_at,
      checked_in_by,
      member_type_at_check_in,
      members!inner (
        id,
        member_no,
        first_name,
        middle_name,
        last_name,
        suffix,
        preferred_name,
        photo_path
      )
    `)
    .eq(
      "event_session_id",
      eventSessionId
    )
    .is(
      "voided_at",
      null
    )
    .order(
      "checked_in_at",
      {
        ascending: false,
      }
    );

  if (error) {
    console.error(
      "Unable to load attendance roster:",
      error
    );

    throw new Error(
      "Unable to load attendance roster."
    );
  }

  const records =
    (
      data ??
      []
    ) as unknown as
      RawAttendanceRecord[];

  if (
    records.length === 0
  ) {
    return [];
  }

  const checkedInByIds =
    Array.from(
      new Set(
        records
          .map(
            (record) =>
              record.checked_in_by
          )
          .filter(
            (
              value
            ): value is string =>
              Boolean(value)
          )
      )
    );

  const staffNames =
    new Map<
      string,
      string
    >();

  if (
    checkedInByIds.length >
    0
  ) {
    const {
      data: profiles,
      error:
        profilesError,
    } = await supabase
      .from("profiles")
      .select(
        "id, full_name"
      )
      .in(
        "id",
        checkedInByIds
      );

    if (
      profilesError
    ) {
      console.error(
        "Unable to load attendance staff names:",
        profilesError
      );
    } else {
      for (
        const profile of
        profiles ?? []
      ) {
        staffNames.set(
          profile.id,
          profile.full_name
        );
      }
    }
  }

  const photoPaths =
    records
      .map(
        (record) =>
          normalizeMember(
            record.members
          )?.photo_path ??
          null
      )
      .filter(
        (
          path
        ): path is string =>
          Boolean(path)
      );

  const photoUrls =
    await getMemberPhotoUrls(
      photoPaths
    );

  const roster:
    AttendanceRosterItem[] =
    [];

  for (
    const record of records
  ) {
    const member =
      normalizeMember(
        record.members
      );

    if (!member) {
      continue;
    }

    roster.push({
      id:
        record.id,

      member_id:
        record.member_id,

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

      photo_path:
        member.photo_path,

      photo_url:
        member.photo_path
          ? photoUrls[
              member.photo_path
            ] ?? null
          : null,

      member_type_at_check_in:
        record
          .member_type_at_check_in,

      check_in_method:
        record
          .check_in_method,

      checked_in_at:
        record
          .checked_in_at,

      checked_in_by:
        record
          .checked_in_by,

      checked_in_by_name:
        record.checked_in_by
          ? staffNames.get(
              record.checked_in_by
            ) ?? null
          : null,
    });
  }

  return roster;
}
import "server-only";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  getMemberPhotoUrls,
} from "@/lib/members/member-photo.server";

import type {
  ManualCheckInMember,
} from "./attendance-types";

function sanitizeSearch(
  value: string
) {
  return value
    .normalize("NFKC")
    .replace(
      /[^\p{L}\p{N}@+.\-\s]/gu,
      " "
    )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function getMemberNumberSearch(
  search: string
) {
  const ecclesiaNumber =
    search.match(
      /^EC-(\d+)$/i
    );

  if (ecclesiaNumber) {
    return Number(
      ecclesiaNumber[1]
    );
  }

  if (/^\d+$/.test(search)) {
    return Number(search);
  }

  return null;
}

export async function searchManualCheckInMembers({
  eventSessionId,
  query,
}: {
  eventSessionId: string;
  query: string;
}): Promise<
  ManualCheckInMember[]
> {
  const supabase =
    await createClient();

  const search =
    sanitizeSearch(query);

  let memberQuery =
    supabase
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
      );

  if (search) {
    const memberNumber =
      getMemberNumberSearch(
        search
      );

    if (
      memberNumber !== null &&
      Number.isSafeInteger(
        memberNumber
      )
    ) {
      memberQuery =
        memberQuery.eq(
          "member_no",
          memberNumber
        );
    } else {
      const tokens =
        search
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 5);

      for (
        const token of tokens
      ) {
        memberQuery =
          memberQuery.or(
            [
              `first_name.ilike.*${token}*`,
              `middle_name.ilike.*${token}*`,
              `last_name.ilike.*${token}*`,
              `preferred_name.ilike.*${token}*`,
              `phone.ilike.*${token}*`,
              `email.ilike.*${token}*`,
            ].join(",")
          );
      }
    }
  }

  const {
    data: members,
    error: membersError,
  } = await memberQuery
    .order(
      "last_name",
      {
        ascending: true,
      }
    )
    .order(
      "first_name",
      {
        ascending: true,
      }
    )
    .limit(20);

  if (membersError) {
    console.error(
      "Unable to search attendance members:",
      membersError
    );

    throw new Error(
      "Unable to search members."
    );
  }

  if (
    !members ||
    members.length === 0
  ) {
    return [];
  }

  const memberIds =
    members.map(
      (member) =>
        member.id
    );

  const {
    data:
      attendanceRecords,
    error:
      attendanceError,
  } = await supabase
    .from(
      "attendance_records"
    )
    .select(
      "member_id"
    )
    .eq(
      "event_session_id",
      eventSessionId
    )
    .in(
      "member_id",
      memberIds
    )
    .is(
      "voided_at",
      null
    );

  if (attendanceError) {
    console.error(
      "Unable to load member attendance state:",
      attendanceError
    );

    throw new Error(
      "Unable to load attendance state."
    );
  }

  const checkedInMemberIds =
    new Set(
      (
        attendanceRecords ??
        []
      ).map(
        (record) =>
          record.member_id
      )
    );

  const photoPaths =
    members
      .map(
        (member) =>
          member.photo_path
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

  return members.map(
    (member) => ({
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

      photo_url:
        member.photo_path
          ? photoUrls[
              member
                .photo_path
            ] ?? null
          : null,

      already_checked_in:
        checkedInMemberIds.has(
          member.id
        ),
    })
  );
}
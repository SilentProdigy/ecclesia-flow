import "server-only";

import { createClient } from "@/lib/supabase/server";

import type {
  FaceEnrollmentStatus,
  MemberListItem,
  MemberStatus,
  MemberType,
} from "./member-types";

import { getMemberPhotoUrls } from "./member-photo.server";

export const MEMBER_DIRECTORY_PAGE_SIZE = 20;

export interface MemberDirectoryFilters {
  q?: string;

  type?: MemberType | "all";

  status?: MemberStatus | "all";

  face?:
    | FaceEnrollmentStatus
    | "all";

  page?: number;
}

export interface MemberDirectoryItem
  extends MemberListItem {
  photo_url: string | null;
}

export interface MemberDirectoryStats {
  total: number;

  member: number;
  regular_attendee: number;
  visitor: number;

  active: number;
  inactive: number;

  face_not_enrolled: number;
  face_enrolled: number;
  face_disabled: number;

  needs_face_enrollment: number;
}

export interface MemberDirectoryResult {
  members: MemberDirectoryItem[];

  stats: MemberDirectoryStats;

  page: number;
  pageSize: number;

  resultCount: number;
  totalMembers: number;
  totalPages: number;
}

function sanitizeSearch(value: string) {
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

export async function getMemberDirectory(
  filters: MemberDirectoryFilters = {}
): Promise<MemberDirectoryResult> {
  const supabase = await createClient();

  const requestedPage =
    filters.page ?? 1;

  const page =
    Number.isFinite(requestedPage) &&
    requestedPage > 0
      ? Math.floor(requestedPage)
      : 1;

  const type =
    filters.type ?? "all";

  const status =
    filters.status ?? "all";

  const face =
    filters.face ?? "all";

  const search =
    sanitizeSearch(
      filters.q ?? ""
    );

  const start =
    (page - 1) *
    MEMBER_DIRECTORY_PAGE_SIZE;

  const end =
    start +
    MEMBER_DIRECTORY_PAGE_SIZE -
    1;

  let query = supabase
    .from("members")
    .select(
      `
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
        status,
        photo_path,
        face_status
      `,
      {
        count: "exact",
      }
    );

  if (type !== "all") {
    query = query.eq(
      "member_type",
      type
    );
  }

  if (status !== "all") {
    query = query.eq(
      "status",
      status
    );
  }

  if (face !== "all") {
    query = query.eq(
      "face_status",
      face
    );
  }

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
      query = query.eq(
        "member_no",
        memberNumber
      );
    } else {
      const tokens = search
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 5);

      for (const token of tokens) {
        query = query.or(
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

  query = query
    .order("last_name", {
      ascending: true,
    })
    .order("first_name", {
      ascending: true,
    })
    .range(start, end);

  const [
    directoryResult,

    totalResult,

    memberCountResult,
    regularCountResult,
    visitorCountResult,

    activeCountResult,
    inactiveCountResult,

    faceNotEnrolledResult,
    faceEnrolledResult,
    faceDisabledResult,

    needsFaceEnrollmentResult,
  ] = await Promise.all([
    query,

    supabase
      .from("members")
      .select("id", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("members")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq(
        "member_type",
        "member"
      ),

    supabase
      .from("members")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq(
        "member_type",
        "regular_attendee"
      ),

    supabase
      .from("members")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq(
        "member_type",
        "visitor"
      ),

    supabase
      .from("members")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq(
        "status",
        "active"
      ),

    supabase
      .from("members")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq(
        "status",
        "inactive"
      ),

    supabase
      .from("members")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq(
        "face_status",
        "not_enrolled"
      ),

    supabase
      .from("members")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq(
        "face_status",
        "enrolled"
      ),

    supabase
      .from("members")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq(
        "face_status",
        "disabled"
      ),

    /*
     * Only active people count as currently
     * needing biometric enrollment.
     */
    supabase
      .from("members")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq(
        "status",
        "active"
      )
      .eq(
        "face_status",
        "not_enrolled"
      ),
  ]);

  const {
    data,
    count: resultCount,
    error,
  } = directoryResult;

  if (error) {
    console.error(
      "Unable to load member directory:",
      error
    );

    throw new Error(
      "Unable to load member directory."
    );
  }

  const countResults = [
    totalResult,
    memberCountResult,
    regularCountResult,
    visitorCountResult,
    activeCountResult,
    inactiveCountResult,
    faceNotEnrolledResult,
    faceEnrolledResult,
    faceDisabledResult,
    needsFaceEnrollmentResult,
  ];

  countResults.forEach(
    (result) => {
      if (result.error) {
        console.error(
          "Unable to load member statistics:",
          result.error
        );
      }
    }
  );

  const stats: MemberDirectoryStats =
    {
      total:
        totalResult.count ?? 0,

      member:
        memberCountResult.count ??
        0,

      regular_attendee:
        regularCountResult.count ??
        0,

      visitor:
        visitorCountResult.count ??
        0,

      active:
        activeCountResult.count ??
        0,

      inactive:
        inactiveCountResult.count ??
        0,

      face_not_enrolled:
        faceNotEnrolledResult.count ??
        0,

      face_enrolled:
        faceEnrolledResult.count ??
        0,

      face_disabled:
        faceDisabledResult.count ??
        0,

      needs_face_enrollment:
        needsFaceEnrollmentResult.count ??
        0,
    };

  const members =
    (data ?? []) as MemberListItem[];

  const photoUrls =
    await getMemberPhotoUrls(
      members.map(
        (member) =>
          member.photo_path
      )
    );

  const directoryMembers =
    members.map((member) => ({
      ...member,

      photo_url:
        member.photo_path
          ? photoUrls[
              member.photo_path
            ] ?? null
          : null,
    }));

  const count =
    resultCount ?? 0;

  const totalPages = Math.max(
    1,
    Math.ceil(
      count /
        MEMBER_DIRECTORY_PAGE_SIZE
    )
  );

  return {
    members:
      directoryMembers,

    stats,

    page,

    pageSize:
      MEMBER_DIRECTORY_PAGE_SIZE,

    resultCount:
      count,

    totalMembers:
      stats.total,

    totalPages,
  };
}
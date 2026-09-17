import "server-only";

import { createClient } from "@/lib/supabase/server";

import type {
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
  page?: number;
}

export interface MemberDirectoryItem
  extends MemberListItem {
  photo_url: string | null;
}

export interface MemberDirectoryResult {
  members: MemberDirectoryItem[];
  page: number;
  pageSize: number;
  resultCount: number;
  totalMembers: number;
  totalPages: number;
}

/**
 * Strip characters that could interfere with
 * PostgREST's filter syntax.
 */
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
    search.match(/^EC-(\d+)$/i);

  if (ecclesiaNumber) {
    return Number(ecclesiaNumber[1]);
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

  const page =
    Number.isFinite(filters.page) &&
    (filters.page ?? 1) > 0
      ? Math.floor(filters.page ?? 1)
      : 1;

  const type = filters.type ?? "all";
  const status = filters.status ?? "all";

  const search = sanitizeSearch(
    filters.q ?? ""
  );

  const start =
    (page - 1) *
    MEMBER_DIRECTORY_PAGE_SIZE;

  const end =
    start +
    MEMBER_DIRECTORY_PAGE_SIZE -
    1;

  /*
   * Overall member total, regardless of current
   * filters.
   */
  const totalRequest = supabase
    .from("members")
    .select("id", {
      count: "exact",
      head: true,
    });

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

  if (search) {
    const memberNumber =
      getMemberNumberSearch(search);

    const searchFilters = [
      `first_name.ilike.*${search}*`,
      `middle_name.ilike.*${search}*`,
      `last_name.ilike.*${search}*`,
      `preferred_name.ilike.*${search}*`,
      `phone.ilike.*${search}*`,
      `email.ilike.*${search}*`,
    ];

    if (
      memberNumber !== null &&
      Number.isSafeInteger(memberNumber)
    ) {
      searchFilters.push(
        `member_no.eq.${memberNumber}`
      );
    }

    query = query.or(
      searchFilters.join(",")
    );
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
    {
      count: totalMembers,
      error: totalError,
    },
    {
      data,
      count: resultCount,
      error,
    },
  ] = await Promise.all([
    totalRequest,
    query,
  ]);

  if (totalError) {
    console.error(
      "Unable to count members:",
      totalError
    );
  }

  if (error) {
    console.error(
      "Unable to load member directory:",
      error
    );

    throw new Error(
      "Unable to load member directory."
    );
  }

  const members =
    (data ?? []) as MemberListItem[];

  const photoUrls =
    await getMemberPhotoUrls(
      members.map(
        (member) => member.photo_path
      )
    );

  const directoryMembers =
    members.map((member) => ({
      ...member,

      photo_url: member.photo_path
        ? photoUrls[
            member.photo_path
          ] ?? null
        : null,
    }));

  const count = resultCount ?? 0;

  const totalPages = Math.max(
    1,
    Math.ceil(
      count /
        MEMBER_DIRECTORY_PAGE_SIZE
    )
  );

  return {
    members: directoryMembers,
    page,
    pageSize:
      MEMBER_DIRECTORY_PAGE_SIZE,
    resultCount: count,
    totalMembers:
      totalMembers ?? 0,
    totalPages,
  };
}
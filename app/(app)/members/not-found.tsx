import Link from "next/link";
import { redirect } from "next/navigation";

import {
  ChevronLeft,
  ChevronRight,
  Plus,
  UserRoundSearch,
  UsersRound,
} from "lucide-react";

import {
  getMemberDirectory,
} from "@/lib/members/member-directory.server";

import type {
  FaceEnrollmentStatus,
  MemberStatus,
  MemberType,
} from "@/lib/members";

import {
  MemberCard,
} from "@/components/members/member-card";

import {
  MemberDirectoryToolbar,
} from "@/components/members/member-directory-toolbar";

interface MembersPageProps {
  searchParams: Promise<{
    q?: string;
    type?: string;
    status?: string;
    face?: string;
    page?: string;
  }>;
}

/**
 * Validate attendee type from URL.
 *
 * Invalid URL values fall back to "all".
 */
function validMemberType(
  value?: string
): MemberType | "all" {
  if (
    value === "member" ||
    value === "regular_attendee" ||
    value === "visitor"
  ) {
    return value;
  }

  return "all";
}

/**
 * Validate member status from URL.
 */
function validMemberStatus(
  value?: string
): MemberStatus | "all" {
  if (
    value === "active" ||
    value === "inactive"
  ) {
    return value;
  }

  return "all";
}

/**
 * Validate face enrollment status from URL.
 */
function validFaceStatus(
  value?: string
): FaceEnrollmentStatus | "all" {
  if (
    value === "not_enrolled" ||
    value === "enrolled" ||
    value === "disabled"
  ) {
    return value;
  }

  return "all";
}

/**
 * Generate directory pagination URLs while
 * preserving the current search and filters.
 */
function makePageUrl({
  q,
  type,
  status,
  face,
  page,
}: {
  q: string;
  type: string;
  status: string;
  face: string;
  page: number;
}) {
  const params =
    new URLSearchParams();

  if (q) {
    params.set("q", q);
  }

  if (type !== "all") {
    params.set(
      "type",
      type
    );
  }

  if (status !== "all") {
    params.set(
      "status",
      status
    );
  }

  if (face !== "all") {
    params.set(
      "face",
      face
    );
  }

  /*
   * Page 1 does not need to appear
   * explicitly in the URL.
   */
  if (page > 1) {
    params.set(
      "page",
      String(page)
    );
  }

  const query =
    params.toString();

  return query
    ? `/members?${query}`
    : "/members";
}

export default async function MembersPage({
  searchParams,
}: MembersPageProps) {
  const params =
    await searchParams;

  /*
   * Search
   */
  const q =
    params.q?.trim() ?? "";

  /*
   * Filters
   */
  const type =
    validMemberType(
      params.type
    );

  const status =
    validMemberStatus(
      params.status
    );

  const face =
    validFaceStatus(
      params.face
    );

  /*
   * Pagination
   */
  const requestedPage =
    Number(
      params.page ?? "1"
    );

  const page =
    Number.isFinite(
      requestedPage
    ) &&
    requestedPage > 0
      ? Math.floor(
          requestedPage
        )
      : 1;

  /*
   * Load directory records and global stats.
   */
  const directory =
    await getMemberDirectory({
      q,
      type,
      status,
      face,
      page,
    });

  /**
   * #30.2
   *
   * Handle manually entered or stale page URLs.
   *
   * Example:
   *
   * /members?page=999
   *
   * If results exist but page 999 is beyond the
   * final available page, redirect to the last
   * valid page instead of showing an empty list.
   */
  if (
    directory.resultCount > 0 &&
    directory.page >
      directory.totalPages
  ) {
    redirect(
      makePageUrl({
        q,
        type,
        status,
        face,
        page:
          directory.totalPages,
      })
    );
  }

  const hasFilters =
    Boolean(q) ||
    type !== "all" ||
    status !== "all" ||
    face !== "all";

  /*
   * Current result range.
   *
   * Example:
   * 21–40 of 83
   */
  const firstResult =
    directory.resultCount === 0
      ? 0
      : (directory.page - 1) *
          directory.pageSize +
        1;

  const lastResult =
    Math.min(
      directory.page *
        directory.pageSize,
      directory.resultCount
    );

  /*
   * Preserve current filters while changing page.
   */
  const previousUrl =
    makePageUrl({
      q,
      type,
      status,
      face,
      page:
        directory.page - 1,
    });

  const nextUrl =
    makePageUrl({
      q,
      type,
      status,
      face,
      page:
        directory.page + 1,
    });

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      {/* =========================================
          Header
      ========================================== */}
      <section className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            Members
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Search and manage church
            attendees.
          </p>
        </div>

        <Link
          href="/members/new"
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          <Plus size={18} />

          <span className="hidden sm:inline">
            Add Member
          </span>
        </Link>
      </section>

      {/* =========================================
          Directory Summary
      ========================================== */}
      <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100">
            <UsersRound
              size={23}
              className="text-slate-700"
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Registered People
            </p>

            <p className="mt-0.5 text-xl font-bold text-slate-950">
              {
                directory.stats
                  .total
              }
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-xs font-semibold text-emerald-600">
              {
                directory.stats
                  .active
              }{" "}
              Active
            </p>

            {directory.stats
              .inactive > 0 && (
              <p className="mt-1 text-xs text-slate-400">
                {
                  directory.stats
                    .inactive
                }{" "}
                Inactive
              </p>
            )}

            {directory.stats
              .needs_face_enrollment >
              0 && (
              <p className="mt-1 text-xs font-medium text-amber-600">
                {
                  directory.stats
                    .needs_face_enrollment
                }{" "}
                need face enrollment
              </p>
            )}
          </div>
        </div>
      </section>

      {/* =========================================
          Search + Filter Toolbar
      ========================================== */}
      <div className="mb-5">
        <MemberDirectoryToolbar
          q={q}
          type={type}
          status={status}
          face={face}
          stats={
            directory.stats
          }
        />
      </div>

      {/* =========================================
          Results Summary
      ========================================== */}
      <section className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">
            {directory.resultCount ===
            1
              ? "Showing 1 person"
              : `Showing ${directory.resultCount} people`}
          </p>

          {hasFilters && (
            <p className="mt-0.5 text-xs text-slate-400">
              Matching current search
              and filters
            </p>
          )}
        </div>

        {directory.resultCount >
          0 && (
          <p className="shrink-0 text-xs text-slate-400">
            {firstResult}–
            {lastResult} of{" "}
            {
              directory.resultCount
            }
          </p>
        )}
      </section>

      {/* =========================================
          Member Directory
      ========================================== */}
      {directory.members.length >
      0 ? (
        <div className="space-y-3">
          {directory.members.map(
            (member) => (
              <MemberCard
                key={member.id}
                member={member}
              />
            )
          )}
        </div>
      ) : (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
            <UserRoundSearch
              size={26}
              className="text-slate-500"
            />
          </div>

          <h2 className="mt-4 font-semibold text-slate-950">
            {hasFilters
              ? "No people found"
              : "No members yet"}
          </h2>

          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
            {hasFilters
              ? "Try another search or change your filters."
              : "Register your first church member, regular attendee, or visitor."}
          </p>

          {!hasFilters && (
            <Link
              href="/members/new"
              className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Plus size={18} />
              Add First Member
            </Link>
          )}
        </section>
      )}

      {/* =========================================
          Pagination
      ========================================== */}
      {directory.totalPages >
        1 && (
        <nav
          aria-label="Members pagination"
          className="mt-6 flex items-center justify-between gap-3 border-t border-slate-200 pt-5"
        >
          {directory.page >
          1 ? (
            <Link
              href={previousUrl}
              scroll={false}
              className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <ChevronLeft
                size={17}
              />

              Previous
            </Link>
          ) : (
            <div />
          )}

          <span className="text-xs font-medium text-slate-500">
            Page{" "}
            {directory.page} of{" "}
            {
              directory.totalPages
            }
          </span>

          {directory.page <
          directory.totalPages ? (
            <Link
              href={nextUrl}
              scroll={false}
              className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Next

              <ChevronRight
                size={17}
              />
            </Link>
          ) : (
            <div />
          )}
        </nav>
      )}

      {/* =========================================
          Mobile Floating Add Button
      ========================================== */}
      <Link
        href="/members/new"
        aria-label="Add Member"
        className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-slate-950 text-white shadow-xl transition hover:bg-slate-800 sm:hidden"
      >
        <Plus size={24} />
      </Link>
    </div>
  );
}
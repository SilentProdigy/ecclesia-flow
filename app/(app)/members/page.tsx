import Link from "next/link";

import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  SlidersHorizontal,
  UserRoundSearch,
  UsersRound,
} from "lucide-react";

import {
  getMemberDirectory,
} from "@/lib/members/member-directory.server";

import type {
  MemberStatus,
  MemberType,
} from "@/lib/members";

import {
  MemberCard,
} from "@/components/members/member-card";

interface MembersPageProps {
  searchParams: Promise<{
    q?: string;
    type?: string;
    status?: string;
    page?: string;
  }>;
}

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

function makePageUrl({
  q,
  type,
  status,
  page,
}: {
  q: string;
  type: string;
  status: string;
  page: number;
}) {
  const params =
    new URLSearchParams();

  if (q) {
    params.set("q", q);
  }

  if (type !== "all") {
    params.set("type", type);
  }

  if (status !== "all") {
    params.set(
      "status",
      status
    );
  }

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

  const q =
    params.q?.trim() ?? "";

  const type =
    validMemberType(
      params.type
    );

  const status =
    validMemberStatus(
      params.status
    );

  const requestedPage =
    Number(params.page ?? "1");

  const page =
    Number.isFinite(
      requestedPage
    ) &&
    requestedPage > 0
      ? Math.floor(
          requestedPage
        )
      : 1;

  const directory =
    await getMemberDirectory({
      q,
      type,
      status,
      page,
    });

  const hasFilters =
    Boolean(q) ||
    type !== "all" ||
    status !== "all";

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

  const previousUrl =
    makePageUrl({
      q,
      type,
      status,
      page:
        directory.page - 1,
    });

  const nextUrl =
    makePageUrl({
      q,
      type,
      status,
      page:
        directory.page + 1,
    });

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      {/* Header */}
      <section className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            Members
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Register and manage
            church attendees.
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

      {/* Total */}
      <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
            <UsersRound
              size={22}
              className="text-slate-700"
            />
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Registered People
            </p>

            <p className="mt-0.5 text-xl font-bold text-slate-950">
              {
                directory.totalMembers
              }
            </p>
          </div>
        </div>
      </section>

      {/* Search / Filters */}
      <form
        method="get"
        className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="relative">
          <Search
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search name, phone, email, member no..."
            className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
          />
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <SlidersHorizontal
            size={14}
          />
          Filters
        </div>

        <div className="mt-2 grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="type"
              className="mb-1.5 block text-xs font-medium text-slate-500"
            >
              Type
            </label>

            <select
              id="type"
              name="type"
              defaultValue={type}
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
            >
              <option value="all">
                All Types
              </option>

              <option value="member">
                Members
              </option>

              <option value="regular_attendee">
                Regular Attendees
              </option>

              <option value="visitor">
                Visitors
              </option>
            </select>
          </div>

          <div>
            <label
              htmlFor="status"
              className="mb-1.5 block text-xs font-medium text-slate-500"
            >
              Status
            </label>

            <select
              id="status"
              name="status"
              defaultValue={status}
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
            >
              <option value="all">
                All Statuses
              </option>

              <option value="active">
                Active
              </option>

              <option value="inactive">
                Inactive
              </option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="submit"
            className="flex h-11 flex-1 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Apply
          </button>

          {hasFilters && (
            <Link
              href="/members"
              className="flex h-11 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Clear
            </Link>
          )}
        </div>
      </form>

      {/* Results Header */}
      <section className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">
          {directory.resultCount ===
          1
            ? "1 result"
            : `${directory.resultCount} results`}
        </p>

        {directory.resultCount >
          0 && (
          <p className="text-xs text-slate-400">
            {firstResult}–
            {lastResult} of{" "}
            {
              directory.resultCount
            }
          </p>
        )}
      </section>

      {/* Directory */}
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
              ? "No members found"
              : "No members yet"}
          </h2>

          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
            {hasFilters
              ? "Try changing your search or filters."
              : "Register your first church member, regular attendee, or visitor."}
          </p>

          {!hasFilters && (
            <Link
              href="/members/new"
              className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white"
            >
              <Plus size={18} />
              Add First Member
            </Link>
          )}
        </section>
      )}

      {/* Pagination */}
      {directory.totalPages >
        1 && (
        <nav className="mt-6 flex items-center justify-between border-t border-slate-200 pt-5">
          {directory.page > 1 ? (
            <Link
              href={previousUrl}
              className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
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
              className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
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

      {/* Mobile Floating Add */}
      <Link
        href="/members/new"
        aria-label="Add Member"
        className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-slate-950 text-white shadow-xl sm:hidden"
      >
        <Plus size={24} />
      </Link>
    </div>
  );
}
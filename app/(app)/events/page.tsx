import Link from "next/link";

import {
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";

import {
  EventCard,
} from "@/components/events/event-card";

import {
  EventDirectoryToolbar,
} from "@/components/events/event-directory-toolbar";

import {
  EVENT_RECURRENCES,
  EVENT_STATUSES,
  EVENT_TYPES,
} from "@/lib/events/types";

import type {
  EventRecurrence,
  EventStatus,
  EventType,
} from "@/lib/events/types";

import {
  getCurrentUserRole,
  getEventDirectory,
} from "@/lib/events/queries";

interface EventsPageProps {
  searchParams: Promise<{
    q?: string;
    type?: string;
    status?: string;
    recurrence?: string;
    page?: string;
    created?: string;
  }>;
}

function parseType(
  value: string | undefined,
): EventType | "all" {
  if (
    value &&
    EVENT_TYPES.includes(
      value as EventType,
    )
  ) {
    return value as EventType;
  }

  return "all";
}

function parseStatus(
  value: string | undefined,
): EventStatus | "all" {
  if (
    value &&
    EVENT_STATUSES.includes(
      value as EventStatus,
    )
  ) {
    return value as EventStatus;
  }

  return "all";
}

function parseRecurrence(
  value: string | undefined,
): EventRecurrence | "all" {
  if (
    value &&
    EVENT_RECURRENCES.includes(
      value as EventRecurrence,
    )
  ) {
    return value as EventRecurrence;
  }

  return "all";
}

function parsePage(
  value: string | undefined,
) {
  const parsed =
    Number.parseInt(
      value ?? "1",
      10,
    );

  if (
    Number.isNaN(parsed) ||
    parsed < 1
  ) {
    return 1;
  }

  return parsed;
}

function buildEventsHref({
  q,
  type,
  status,
  recurrence,
  page,
}: {
  q: string;
  type: EventType | "all";
  status: EventStatus | "all";
  recurrence:
    | EventRecurrence
    | "all";
  page: number;
}) {
  const params =
    new URLSearchParams();

  if (q) {
    params.set(
      "q",
      q,
    );
  }

  if (type !== "all") {
    params.set(
      "type",
      type,
    );
  }

  if (status !== "all") {
    params.set(
      "status",
      status,
    );
  }

  if (
    recurrence !== "all"
  ) {
    params.set(
      "recurrence",
      recurrence,
    );
  }

  if (page > 1) {
    params.set(
      "page",
      String(page),
    );
  }

  const query =
    params.toString();

  return query
    ? `/events?${query}`
    : "/events";
}

export default async function EventsPage({
  searchParams,
}: EventsPageProps) {
  const params =
    await searchParams;

  const q =
    params.q?.trim() ?? "";

  const type =
    parseType(
      params.type,
    );

  const status =
    parseStatus(
      params.status,
    );

  const recurrence =
    parseRecurrence(
      params.recurrence,
    );

  const page =
    parsePage(
      params.page,
    );

  const created =
    params.created === "1";

  const [
    directory,
    currentRole,
  ] = await Promise.all([
    getEventDirectory({
      q,
      type,
      status,
      recurrence,
      page,
    }),

    getCurrentUserRole(),
  ]);

  const isAdmin =
    currentRole === "admin";

  const hasFilters =
    Boolean(q) ||
    type !== "all" ||
    status !== "all" ||
    recurrence !== "all";

  const firstResult =
    directory.total === 0
      ? 0
      : (directory.page - 1) *
          directory.pageSize +
        1;

  const lastResult =
    Math.min(
      directory.page *
        directory.pageSize,
      directory.total,
    );

  const previousUrl =
    buildEventsHref({
      q,
      type,
      status,
      recurrence,
      page:
        directory.page - 1,
    });

  const nextUrl =
    buildEventsHref({
      q,
      type,
      status,
      recurrence,
      page:
        directory.page + 1,
    });

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 pb-28">
      <section className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            Events
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage church
            services, meetings,
            and scheduled
            activities.
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <Link
            href="/events/schedule"
            aria-label="Church Schedule"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <CalendarClock
              size={18}
            />

            <span className="hidden sm:inline">
              Schedule
            </span>
          </Link>

          {isAdmin && (
            <Link
              href="/events/new"
              aria-label="Add Event"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 sm:px-4"
            >
              <Plus
                size={18}
              />

              <span className="hidden sm:inline">
                Add Event
              </span>
            </Link>
          )}
        </div>
      </section>

      {created && (
        <section className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2
            size={20}
            className="mt-0.5 shrink-0 text-emerald-600"
          />

          <div>
            <p className="text-sm font-semibold text-emerald-900">
              Event created
            </p>

            <p className="mt-0.5 text-sm text-emerald-700">
              The event and its
              upcoming sessions
              are ready.
            </p>
          </div>
        </section>
      )}

      <div className="mb-5">
        <EventDirectoryToolbar
          q={q}
          type={type}
          status={status}
          recurrence={
            recurrence
          }
        />
      </div>

      <section className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800">
            {directory.total ===
            1
              ? "1 event"
              : `${directory.total} events`}
          </p>

          {hasFilters && (
            <p className="mt-0.5 text-xs text-slate-400">
              Matching current
              search and filters
            </p>
          )}
        </div>

        {directory.total >
          0 && (
          <p className="text-xs text-slate-400">
            {firstResult}–
            {lastResult} of{" "}
            {
              directory.total
            }
          </p>
        )}
      </section>

      {directory.events.length >
      0 ? (
        <div className="space-y-3">
          {directory.events.map(
            (event) => (
              <EventCard
                key={
                  event.id
                }
                event={
                  event
                }
              />
            ),
          )}
        </div>
      ) : (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
            <CalendarDays
              size={26}
              className="text-slate-500"
            />
          </div>

          <h2 className="mt-4 font-semibold text-slate-950">
            {hasFilters
              ? "No events found"
              : "No events yet"}
          </h2>

          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
            {hasFilters
              ? "Try another search or change your filters."
              : "Create your first church service, meeting, or scheduled activity."}
          </p>

          {isAdmin &&
            !hasFilters && (
            <Link
              href="/events/new"
              className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white"
            >
              <Plus
                size={18}
              />
              Add First Event
            </Link>
          )}
        </section>
      )}

      {directory.totalPages >
        1 && (
        <nav className="mt-6 flex items-center justify-between border-t border-slate-200 pt-5">
          {directory.page >
          1 ? (
            <Link
              href={
                previousUrl
              }
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

      {isAdmin &&
        directory.events.length >
          0 && (
        <Link
          href="/events/new"
          aria-label="Add Event"
          className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-slate-950 text-white shadow-xl transition hover:bg-slate-800 sm:hidden"
        >
          <Plus size={24} />
        </Link>
      )}
    </div>
  );
}
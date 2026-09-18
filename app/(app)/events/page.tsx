import Link from "next/link";

import {
  CalendarDays,
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
    params.set("q", q);
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

  const queryString =
    params.toString();

  return queryString
    ? `/events?${queryString}`
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
    parseType(params.type);

  const status =
    parseStatus(
      params.status,
    );

  const recurrence =
    parseRecurrence(
      params.recurrence,
    );

  const page =
    parsePage(params.page);

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

  const hasPrevious =
    directory.page > 1;

  const hasNext =
    directory.page <
    directory.totalPages;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 pb-28">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            Events
          </h1>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Manage church
            services, meetings,
            and scheduled
            activities.
          </p>
        </div>

        {isAdmin ? (
          <Link
            href="/events/new"
            className="hidden h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 sm:inline-flex"
          >
            <Plus size={18} />
            Add Event
          </Link>
        ) : null}
      </div>

      <EventDirectoryToolbar
        q={q}
        type={type}
        status={status}
        recurrence={
          recurrence
        }
      />

      <div className="mt-5 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">
          {directory.total ===
          1
            ? "1 event"
            : `${directory.total} events`}
        </p>

        {directory.total >
        0 ? (
          <p className="text-xs text-slate-400">
            Page{" "}
            {directory.page} of{" "}
            {
              directory.totalPages
            }
          </p>
        ) : null}
      </div>

      {directory.events
        .length > 0 ? (
        <div className="mt-3 space-y-3">
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
        <section className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
            <CalendarDays
              size={23}
              className="text-slate-500"
            />
          </div>

          <h2 className="mt-4 font-semibold text-slate-950">
            No events found
          </h2>

          <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">
            {q ||
            type !== "all" ||
            status !== "all" ||
            recurrence !==
              "all"
              ? "Try changing your search or filters."
              : "Church events and services will appear here once they are created."}
          </p>

          {isAdmin &&
          !q &&
          type === "all" &&
          status === "all" &&
          recurrence ===
            "all" ? (
            <Link
              href="/events/new"
              className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Plus
                size={17}
              />
              Create first event
            </Link>
          ) : null}
        </section>
      )}

      {directory.totalPages >
      1 ? (
        <div className="mt-6 flex items-center justify-between gap-3">
          {hasPrevious ? (
            <Link
              href={buildEventsHref({
                q,
                type,
                status,
                recurrence,
                page:
                  directory.page -
                  1,
              })}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Previous
            </Link>
          ) : (
            <span className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 px-4 text-sm font-semibold text-slate-300">
              Previous
            </span>
          )}

          <span className="text-sm text-slate-500">
            {directory.page} /{" "}
            {
              directory.totalPages
            }
          </span>

          {hasNext ? (
            <Link
              href={buildEventsHref({
                q,
                type,
                status,
                recurrence,
                page:
                  directory.page +
                  1,
              })}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Next
            </Link>
          ) : (
            <span className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 px-4 text-sm font-semibold text-slate-300">
              Next
            </span>
          )}
        </div>
      ) : null}

      {isAdmin ? (
        <Link
          href="/events/new"
          aria-label="Add event"
          className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg transition hover:bg-slate-800 sm:hidden"
        >
          <Plus size={24} />
        </Link>
      ) : null}
    </div>
  );
}
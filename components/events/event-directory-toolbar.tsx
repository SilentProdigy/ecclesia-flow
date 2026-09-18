import Link from "next/link";

import {
  Search,
  X,
} from "lucide-react";

import {
  EVENT_RECURRENCE_OPTIONS,
  EVENT_STATUS_OPTIONS,
  EVENT_TYPE_OPTIONS,
} from "@/lib/events/types";

import type {
  EventDirectoryRecurrenceFilter,
  EventDirectoryStatusFilter,
  EventDirectoryTypeFilter,
} from "@/lib/events/queries";

interface EventDirectoryToolbarProps {
  q: string;
  type: EventDirectoryTypeFilter;
  status: EventDirectoryStatusFilter;
  recurrence: EventDirectoryRecurrenceFilter;
}

export function EventDirectoryToolbar({
  q,
  type,
  status,
  recurrence,
}: EventDirectoryToolbarProps) {
  const hasFilters =
    q.length > 0 ||
    type !== "all" ||
    status !== "all" ||
    recurrence !== "all";

  return (
    <form
      action="/events"
      method="get"
      className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
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
          placeholder="Search events..."
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <select
          name="type"
          defaultValue={type}
          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
        >
          <option value="all">
            All event types
          </option>

          {EVENT_TYPE_OPTIONS.map(
            (option) => (
              <option
                key={
                  option.value
                }
                value={
                  option.value
                }
              >
                {option.label}
              </option>
            ),
          )}
        </select>

        <select
          name="status"
          defaultValue={status}
          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
        >
          <option value="all">
            All statuses
          </option>

          {EVENT_STATUS_OPTIONS.map(
            (option) => (
              <option
                key={
                  option.value
                }
                value={
                  option.value
                }
              >
                {option.label}
              </option>
            ),
          )}
        </select>

        <select
          name="recurrence"
          defaultValue={
            recurrence
          }
          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
        >
          <option value="all">
            All schedules
          </option>

          {EVENT_RECURRENCE_OPTIONS.map(
            (option) => (
              <option
                key={
                  option.value
                }
                value={
                  option.value
                }
              >
                {option.label}
              </option>
            ),
          )}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Apply filters
        </button>

        {hasFilters ? (
          <Link
            href="/events"
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
          >
            <X size={16} />
            Clear
          </Link>
        ) : null}
      </div>
    </form>
  );
}
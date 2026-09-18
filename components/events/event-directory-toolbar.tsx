"use client";

import {
  FormEvent,
  useEffect,
  useState,
  useTransition,
} from "react";

import {
  ChevronDown,
  Filter,
  Search,
  X,
} from "lucide-react";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

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

function getTypeLabel(
  value: EventDirectoryTypeFilter,
) {
  if (value === "all") {
    return null;
  }

  return (
    EVENT_TYPE_OPTIONS.find(
      (option) =>
        option.value === value,
    )?.label ?? value
  );
}

function getStatusLabel(
  value: EventDirectoryStatusFilter,
) {
  if (value === "all") {
    return null;
  }

  return (
    EVENT_STATUS_OPTIONS.find(
      (option) =>
        option.value === value,
    )?.label ?? value
  );
}

function getRecurrenceLabel(
  value: EventDirectoryRecurrenceFilter,
) {
  if (value === "all") {
    return null;
  }

  return (
    EVENT_RECURRENCE_OPTIONS.find(
      (option) =>
        option.value === value,
    )?.label ?? value
  );
}

export function EventDirectoryToolbar({
  q,
  type,
  status,
  recurrence,
}: EventDirectoryToolbarProps) {
  const router = useRouter();
  const searchParams =
    useSearchParams();

  const [
    isPending,
    startTransition,
  ] = useTransition();

  const [
    filtersOpen,
    setFiltersOpen,
  ] = useState(false);

  const [
    searchValue,
    setSearchValue,
  ] = useState(q);

  useEffect(() => {
    setSearchValue(q);
  }, [q]);

  const filterCount = [
    type !== "all",
    status !== "all",
    recurrence !== "all",
  ].filter(Boolean).length;

  const hasAnyFilter =
    filterCount > 0 ||
    q.length > 0;

  function navigate(
    updates: Record<
      string,
      string | null
    >,
  ) {
    const params =
      new URLSearchParams(
        searchParams.toString(),
      );

    for (
      const [key, value]
      of Object.entries(updates)
    ) {
      if (
        value === null ||
        value === "" ||
        value === "all"
      ) {
        params.delete(key);
      } else {
        params.set(
          key,
          value,
        );
      }
    }

    params.delete("page");

    const query =
      params.toString();

    startTransition(() => {
      router.push(
        query
          ? `/events?${query}`
          : "/events",
      );
    });
  }

  function handleSearchSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    navigate({
      q: searchValue.trim(),
    });
  }

  function clearSearch() {
    setSearchValue("");

    navigate({
      q: null,
    });
  }

  function clearAll() {
    setSearchValue("");
    setFiltersOpen(false);

    startTransition(() => {
      router.push("/events");
    });
  }

  const typeLabel =
    getTypeLabel(type);

  const statusLabel =
    getStatusLabel(status);

  const recurrenceLabel =
    getRecurrenceLabel(
      recurrence,
    );

  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm transition ${
        isPending
          ? "opacity-70"
          : ""
      }`}
    >
      <div className="p-3">
        <div className="flex gap-2">
          <form
            onSubmit={
              handleSearchSubmit
            }
            className="min-w-0 flex-1"
          >
            <div className="relative">
              <Search
                size={19}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={
                  searchValue
                }
                onChange={(
                  event,
                ) =>
                  setSearchValue(
                    event.target
                      .value,
                  )
                }
                placeholder="Search events"
                aria-label="Search events"
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-10 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100"
              />

              {searchValue ? (
                <button
                  type="button"
                  onClick={
                    clearSearch
                  }
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <X
                    size={17}
                  />
                </button>
              ) : null}
            </div>
          </form>

          <button
            type="button"
            onClick={() =>
              setFiltersOpen(
                (current) =>
                  !current,
              )
            }
            aria-expanded={
              filtersOpen
            }
            className={`relative flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl border px-3.5 text-sm font-semibold transition ${
              filtersOpen ||
              filterCount > 0
                ? "border-slate-950 bg-slate-950 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Filter
              size={17}
            />

            <span className="hidden sm:inline">
              Filters
            </span>

            {filterCount >
            0 ? (
              <span
                className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                  filtersOpen ||
                  filterCount > 0
                    ? "bg-white text-slate-950"
                    : "bg-slate-950 text-white"
                }`}
              >
                {filterCount}
              </span>
            ) : null}

            <ChevronDown
              size={15}
              className={`hidden transition-transform sm:block ${
                filtersOpen
                  ? "rotate-180"
                  : ""
              }`}
            />
          </button>
        </div>

        {hasAnyFilter ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {q ? (
              <button
                type="button"
                onClick={
                  clearSearch
                }
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-slate-100 px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
              >
                Search: {q}
                <X size={13} />
              </button>
            ) : null}

            {typeLabel ? (
              <button
                type="button"
                onClick={() =>
                  navigate({
                    type: null,
                  })
                }
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-slate-100 px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
              >
                {typeLabel}
                <X size={13} />
              </button>
            ) : null}

            {statusLabel ? (
              <button
                type="button"
                onClick={() =>
                  navigate({
                    status: null,
                  })
                }
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-slate-100 px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
              >
                {statusLabel}
                <X size={13} />
              </button>
            ) : null}

            {recurrenceLabel ? (
              <button
                type="button"
                onClick={() =>
                  navigate({
                    recurrence:
                      null,
                  })
                }
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-slate-100 px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
              >
                {
                  recurrenceLabel
                }
                <X size={13} />
              </button>
            ) : null}

            <button
              type="button"
              onClick={clearAll}
              className="h-8 px-2 text-xs font-semibold text-slate-500 transition hover:text-slate-950"
            >
              Clear all
            </button>
          </div>
        ) : null}
      </div>

      {filtersOpen ? (
        <div className="border-t border-slate-100 px-3 pb-3 pt-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-500">
                Event type
              </span>

              <select
                value={type}
                onChange={(
                  event,
                ) =>
                  navigate({
                    type:
                      event.target
                        .value,
                  })
                }
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              >
                <option value="all">
                  All types
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
                      {
                        option.label
                      }
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-500">
                Status
              </span>

              <select
                value={status}
                onChange={(
                  event,
                ) =>
                  navigate({
                    status:
                      event.target
                        .value,
                  })
                }
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
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
                      {
                        option.label
                      }
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-500">
                Schedule
              </span>

              <select
                value={
                  recurrence
                }
                onChange={(
                  event,
                ) =>
                  navigate({
                    recurrence:
                      event.target
                        .value,
                  })
                }
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
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
                      {
                        option.label
                      }
                    </option>
                  ),
                )}
              </select>
            </label>
          </div>

          {filterCount >
          0 ? (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  navigate({
                    type: null,
                    status: null,
                    recurrence:
                      null,
                  });
                }}
                className="text-sm font-semibold text-slate-500 transition hover:text-slate-950"
              >
                Reset filters
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
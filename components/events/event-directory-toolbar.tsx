"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  Check,
  LoaderCircle,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import type {
  EventDirectoryRecurrenceFilter,
  EventDirectoryStatusFilter,
  EventDirectoryTypeFilter,
} from "@/lib/events/queries";

import {
  EVENT_RECURRENCE_OPTIONS,
  EVENT_STATUS_OPTIONS,
  EVENT_TYPE_OPTIONS,
} from "@/lib/events/types";

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
  const router = useRouter();

  const pathname =
    usePathname();

  const searchParams =
    useSearchParams();

  const inputRef =
    useRef<HTMLInputElement>(null);

  const [
    search,
    setSearch,
  ] = useState(q);

  const [
    filtersOpen,
    setFiltersOpen,
  ] = useState(false);

  const [
    draftType,
    setDraftType,
  ] =
    useState<EventDirectoryTypeFilter>(
      type,
    );

  const [
    draftStatus,
    setDraftStatus,
  ] =
    useState<EventDirectoryStatusFilter>(
      status,
    );

  const [
    draftRecurrence,
    setDraftRecurrence,
  ] =
    useState<EventDirectoryRecurrenceFilter>(
      recurrence,
    );

  const [
    isPending,
    startTransition,
  ] = useTransition();

  const lastRequestedSearch =
    useRef(q);

  const navigate =
    useCallback(
      (
        updates: Record<
          string,
          string | null
        >,
        requestedSearch?: string,
      ) => {
        const params =
          new URLSearchParams(
            searchParams.toString(),
          );

        for (const [
          key,
          value,
        ] of Object.entries(
          updates,
        )) {
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
        params.delete("created");

        if (
          requestedSearch !==
          undefined
        ) {
          lastRequestedSearch.current =
            requestedSearch;
        }

        const query =
          params.toString();

        const destination =
          query
            ? `${pathname}?${query}`
            : pathname;

        startTransition(() => {
          router.replace(
            destination,
            {
              scroll: false,
            },
          );
        });
      },
      [
        pathname,
        router,
        searchParams,
      ],
    );

  useEffect(() => {
    const normalized =
      search.trim();

    if (normalized === q) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          navigate(
            {
              q:
                normalized ||
                null,
            },
            normalized,
          );
        },
        500,
      );

    return () => {
      window.clearTimeout(
        timer,
      );
    };
  }, [
    search,
    q,
    navigate,
  ]);

  useEffect(() => {
    if (
      q ===
      lastRequestedSearch.current
    ) {
      return;
    }

    if (
      document.activeElement ===
      inputRef.current
    ) {
      return;
    }

    setSearch(q);

    lastRequestedSearch.current =
      q;
  }, [q]);

  useEffect(() => {
    setDraftType(type);
    setDraftStatus(status);
    setDraftRecurrence(
      recurrence,
    );
  }, [
    type,
    status,
    recurrence,
  ]);

  useEffect(() => {
    if (!filtersOpen) {
      return;
    }

    const previous =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previous;
    };
  }, [filtersOpen]);

  useEffect(() => {
    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (
        event.key ===
        "Escape"
      ) {
        setFiltersOpen(false);
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, []);

  const activeFilterCount = [
    type !== "all",
    status !== "all",
    recurrence !== "all",
  ].filter(Boolean).length;

  const hasFilters =
    activeFilterCount > 0;

  function clearSearch() {
    setSearch("");

    navigate(
      {
        q: null,
      },
      "",
    );

    inputRef.current?.focus();
  }

  function removeTypeFilter() {
    setDraftType("all");

    navigate({
      type: null,
    });
  }

  function removeStatusFilter() {
    setDraftStatus("all");

    navigate({
      status: null,
    });
  }

  function removeRecurrenceFilter() {
    setDraftRecurrence(
      "all",
    );

    navigate({
      recurrence: null,
    });
  }

  function clearAllFilters() {
    setDraftType("all");
    setDraftStatus("all");
    setDraftRecurrence(
      "all",
    );

    navigate({
      type: null,
      status: null,
      recurrence: null,
    });
  }

  function openFilters() {
    setDraftType(type);
    setDraftStatus(status);
    setDraftRecurrence(
      recurrence,
    );

    setFiltersOpen(true);
  }

  function applyFilters() {
    const normalized =
      search.trim();

    navigate(
      {
        q:
          normalized ||
          null,

        type:
          draftType === "all"
            ? null
            : draftType,

        status:
          draftStatus ===
          "all"
            ? null
            : draftStatus,

        recurrence:
          draftRecurrence ===
          "all"
            ? null
            : draftRecurrence,
      },
      normalized,
    );

    setFiltersOpen(false);
  }

  function clearDraftFilters() {
    setDraftType("all");
    setDraftStatus("all");
    setDraftRecurrence(
      "all",
    );
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search
              size={19}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              ref={inputRef}
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Search events..."
              autoComplete="off"
              spellCheck={false}
              className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-16 text-sm text-black placeholder:text-slate-400 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
            />

            <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
              {isPending && (
                <LoaderCircle
                  size={17}
                  className="animate-spin text-slate-400"
                />
              )}

              {search && (
                <button
                  type="button"
                  onClick={
                    clearSearch
                  }
                  aria-label="Clear search"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
                >
                  <X
                    size={14}
                  />
                </button>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={
              openFilters
            }
            className={`relative flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition ${
              hasFilters
                ? "border-slate-950 bg-slate-950 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <SlidersHorizontal
              size={18}
            />

            <span className="hidden sm:inline">
              Filters
            </span>

            {activeFilterCount >
              0 && (
              <span
                className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                  hasFilters
                    ? "bg-white text-slate-950"
                    : "bg-slate-950 text-white"
                }`}
              >
                {
                  activeFilterCount
                }
              </span>
            )}
          </button>
        </div>

        {hasFilters && (
          <div className="flex flex-wrap items-center gap-2">
            {type !==
              "all" && (
              <ActiveFilter
                label={
                  getTypeLabel(
                    type,
                  )
                }
                onRemove={
                  removeTypeFilter
                }
              />
            )}

            {status !==
              "all" && (
              <ActiveFilter
                label={
                  getStatusLabel(
                    status,
                  )
                }
                onRemove={
                  removeStatusFilter
                }
              />
            )}

            {recurrence !==
              "all" && (
              <ActiveFilter
                label={
                  getRecurrenceLabel(
                    recurrence,
                  )
                }
                onRemove={
                  removeRecurrenceFilter
                }
              />
            )}

            <button
              type="button"
              onClick={
                clearAllFilters
              }
              className="px-1 text-xs font-semibold text-slate-500 transition hover:text-slate-950"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {filtersOpen && (
        <div className="fixed inset-0 z-[100]">
          <button
            type="button"
            aria-label="Close filters"
            onClick={() =>
              setFiltersOpen(
                false,
              )
            }
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px]"
          />

          <div className="absolute inset-x-0 bottom-0 max-h-[90dvh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:w-[520px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl">
            <div className="flex justify-center pt-3 sm:hidden">
              <div className="h-1.5 w-12 rounded-full bg-slate-200" />
            </div>

            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Filter Events
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Narrow down the
                  events directory.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setFiltersOpen(
                    false,
                  )
                }
                aria-label="Close filters"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-7 px-6 py-6">
              <FilterGroup
                title="Event Type"
              >
                <FilterOption
                  label="All Event Types"
                  selected={
                    draftType ===
                    "all"
                  }
                  onClick={() =>
                    setDraftType(
                      "all",
                    )
                  }
                />

                {EVENT_TYPE_OPTIONS.map(
                  (option) => (
                    <FilterOption
                      key={
                        option.value
                      }
                      label={
                        option.label
                      }
                      selected={
                        draftType ===
                        option.value
                      }
                      onClick={() =>
                        setDraftType(
                          option.value,
                        )
                      }
                    />
                  ),
                )}
              </FilterGroup>

              <FilterGroup
                title="Status"
              >
                <FilterOption
                  label="All Statuses"
                  selected={
                    draftStatus ===
                    "all"
                  }
                  onClick={() =>
                    setDraftStatus(
                      "all",
                    )
                  }
                />

                {EVENT_STATUS_OPTIONS.map(
                  (option) => (
                    <FilterOption
                      key={
                        option.value
                      }
                      label={
                        option.label
                      }
                      selected={
                        draftStatus ===
                        option.value
                      }
                      onClick={() =>
                        setDraftStatus(
                          option.value,
                        )
                      }
                    />
                  ),
                )}
              </FilterGroup>

              <FilterGroup
                title="Schedule"
              >
                <FilterOption
                  label="All Schedules"
                  selected={
                    draftRecurrence ===
                    "all"
                  }
                  onClick={() =>
                    setDraftRecurrence(
                      "all",
                    )
                  }
                />

                {EVENT_RECURRENCE_OPTIONS.map(
                  (option) => (
                    <FilterOption
                      key={
                        option.value
                      }
                      label={
                        option.label
                      }
                      selected={
                        draftRecurrence ===
                        option.value
                      }
                      onClick={() =>
                        setDraftRecurrence(
                          option.value,
                        )
                      }
                    />
                  ),
                )}
              </FilterGroup>
            </div>

            <div className="sticky bottom-0 border-t border-slate-100 bg-white px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-5">
              <div className="grid grid-cols-[120px_1fr] gap-3">
                <button
                  type="button"
                  onClick={
                    clearDraftFilters
                  }
                  className="h-12 rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Clear
                </button>

                <button
                  type="button"
                  onClick={
                    applyFilters
                  }
                  className="h-12 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Show Results
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
        {title}
      </h3>

      <div className="grid grid-cols-2 gap-2">
        {children}
      </div>
    </section>
  );
}

function FilterOption({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`relative min-h-14 rounded-xl border px-3 py-3 text-left transition ${
        selected
          ? "border-slate-950 bg-slate-950 text-white"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">
          {label}
        </span>

        {selected && (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white">
            <Check
              size={13}
              className="text-slate-950"
            />
          </span>
        )}
      </div>
    </button>
  );
}

function ActiveFilter({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-slate-100 pl-3 pr-1.5 text-xs font-semibold text-slate-700">
      {label}

      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="flex h-5 w-5 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-200 hover:text-slate-950"
      >
        <X size={12} />
      </button>
    </span>
  );
}

function getTypeLabel(
  value: Exclude<
    EventDirectoryTypeFilter,
    "all"
  >,
) {
  return (
    EVENT_TYPE_OPTIONS.find(
      (option) =>
        option.value === value,
    )?.label ?? value
  );
}

function getStatusLabel(
  value: Exclude<
    EventDirectoryStatusFilter,
    "all"
  >,
) {
  return (
    EVENT_STATUS_OPTIONS.find(
      (option) =>
        option.value === value,
    )?.label ?? value
  );
}

function getRecurrenceLabel(
  value: Exclude<
    EventDirectoryRecurrenceFilter,
    "all"
  >,
) {
  return (
    EVENT_RECURRENCE_OPTIONS.find(
      (option) =>
        option.value === value,
    )?.label ?? value
  );
}
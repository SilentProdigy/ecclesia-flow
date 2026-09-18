"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CheckCircle2,
  ChevronRight,
  Clock3,
  LoaderCircle,
  RotateCcw,
  Search,
  UsersRound,
  X,
} from "lucide-react";

import {
  formatMemberNumber,
  getMemberTypeLabel,
} from "@/lib/members";

import type {
  AttendanceRosterItem,
} from "@/lib/attendance";

import {
  getAttendanceRosterAction,
  voidAttendanceRecordAction,
} from "@/app/(app)/attendance/actions";

interface AttendanceRosterProps {
  sessionId: string;

  timezone: string;

  refreshVersion: number;

  onAttendanceChanged:
    () => void;
}

const PREVIEW_COUNT = 4;

export function AttendanceRoster({
  sessionId,
  timezone,
  refreshVersion,
  onAttendanceChanged,
}: AttendanceRosterProps) {
  const [
    roster,
    setRoster,
  ] =
    useState<
      AttendanceRosterItem[]
    >([]);

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const [
    rosterOpen,
    setRosterOpen,
  ] =
    useState(false);

  const [
    correctionTarget,
    setCorrectionTarget,
  ] =
    useState<
      AttendanceRosterItem | null
    >(null);

  const loadRoster =
    useCallback(
      async (
        showLoading = false
      ) => {
        if (
          showLoading
        ) {
          setIsLoading(
            true
          );
        }

        const result =
          await getAttendanceRosterAction(
            sessionId
          );

        if (
          result.success
        ) {
          setRoster(
            result.roster
          );

          setError(
            null
          );
        } else {
          setError(
            result.message
          );
        }

        setIsLoading(
          false
        );
      },
      [sessionId]
    );

  useEffect(() => {
    void loadRoster(true);
  }, [
    loadRoster,
    refreshVersion,
  ]);

  useEffect(() => {
    const interval =
      window.setInterval(
        () => {
          if (
            document.visibilityState ===
            "visible"
          ) {
            void loadRoster(
              false
            );
          }
        },
        5000
      );

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [loadRoster]);

  const previewRoster =
    roster.slice(
      0,
      PREVIEW_COUNT
    );

  async function handleCorrected() {
    setCorrectionTarget(
      null
    );

    await loadRoster(
      false
    );

    onAttendanceChanged();
  }

  return (
    <>
      <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-slate-950">
                Checked In
              </h2>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Live
              </span>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Current attendance
              roster.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex h-10 items-center gap-1.5 rounded-xl bg-slate-100 px-3 text-sm font-bold text-slate-700">
              <UsersRound
                size={16}
              />

              {roster.length}
            </div>

            {roster.length >
              0 && (
              <button
                type="button"
                onClick={() =>
                  setRosterOpen(
                    true
                  )
                }
                className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                View All
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-9">
            <LoaderCircle
              size={23}
              className="animate-spin text-slate-400"
            />
          </div>
        ) : roster.length ===
          0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 px-5 py-7 text-center">
            <UsersRound
              size={24}
              className="mx-auto text-slate-400"
            />

            <p className="mt-3 text-sm font-semibold text-slate-700">
              No check-ins yet
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Check-ins will
              appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-5 space-y-2">
              {previewRoster.map(
                (record) => (
                  <CompactRosterRow
                    key={
                      record.id
                    }
                    record={
                      record
                    }
                    timezone={
                      timezone
                    }
                    onUndo={() =>
                      setCorrectionTarget(
                        record
                      )
                    }
                  />
                )
              )}
            </div>

            {roster.length >
              PREVIEW_COUNT && (
              <button
                type="button"
                onClick={() =>
                  setRosterOpen(
                    true
                  )
                }
                className="mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-slate-50 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                View all{" "}
                {
                  roster.length
                }{" "}
                check-ins

                <ChevronRight
                  size={15}
                />
              </button>
            )}
          </>
        )}
      </section>

      {rosterOpen && (
        <FullRosterSheet
          roster={roster}
          timezone={
            timezone
          }
          onClose={() =>
            setRosterOpen(
              false
            )
          }
          onCorrect={(
            record
          ) => {
            setRosterOpen(
              false
            );

            setCorrectionTarget(
              record
            );
          }}
        />
      )}

      {correctionTarget && (
        <AttendanceCorrectionModal
          sessionId={
            sessionId
          }
          record={
            correctionTarget
          }
          onClose={() =>
            setCorrectionTarget(
              null
            )
          }
          onCorrected={
            handleCorrected
          }
        />
      )}
    </>
  );
}

function CompactRosterRow({
  record,
  timezone,
  onUndo,
}: {
  record:
    AttendanceRosterItem;

  timezone: string;

  onUndo: () => void;
}) {
  const displayName =
    getDisplayName(
      record
    );

  const initials =
    getInitials(
      record
    );

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 px-3 py-3">
      <Avatar
        photoUrl={
          record.photo_url
        }
        initials={
          initials
        }
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-bold text-slate-950">
            {displayName}
          </p>

          <CheckCircle2
            size={13}
            className="shrink-0 text-emerald-600"
          />
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-slate-400">
          <span>
            {formatMemberNumber(
              record.member_no
            )}
          </span>

          <span>•</span>

          <span>
            {getMemberTypeLabel(
              record
                .member_type_at_check_in
            )}
          </span>
        </div>

        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
          <Clock3
            size={12}
          />

          {formatCheckInTime(
            record.checked_in_at,
            timezone
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={
          onUndo
        }
        aria-label={`Correct attendance for ${displayName}`}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
      >
        <RotateCcw
          size={15}
        />
      </button>
    </div>
  );
}

function FullRosterSheet({
  roster,
  timezone,
  onClose,
  onCorrect,
}: {
  roster:
    AttendanceRosterItem[];

  timezone: string;

  onClose: () => void;

  onCorrect: (
    record:
      AttendanceRosterItem
  ) => void;
}) {
  const [
    search,
    setSearch,
  ] =
    useState("");

  useEffect(() => {
    const previousOverflow =
      document.body.style
        .overflow;

    document.body.style
      .overflow =
      "hidden";

    function handleEscape(
      event:
        KeyboardEvent
    ) {
      if (
        event.key ===
        "Escape"
      ) {
        onClose();
      }
    }

    window.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.body.style
        .overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [onClose]);

  const filteredRoster =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return roster;
      }

      return roster.filter(
        (record) => {
          const name =
            getDisplayName(
              record
            ).toLowerCase();

          const memberNumber =
            formatMemberNumber(
              record.member_no
            ).toLowerCase();

          const type =
            getMemberTypeLabel(
              record
                .member_type_at_check_in
            ).toLowerCase();

          return (
            name.includes(
              query
            ) ||
            memberNumber.includes(
              query
            ) ||
            type.includes(
              query
            )
          );
        }
      );
    }, [
      roster,
      search,
    ]);

  return (
    <div className="fixed inset-0 z-[110]">
      <button
        type="button"
        aria-label="Close attendance roster"
        onClick={
          onClose
        }
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px]"
      />

      <div className="absolute inset-x-0 bottom-0 flex max-h-[90dvh] flex-col rounded-t-3xl bg-white shadow-2xl sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:h-[720px] sm:max-h-[88dvh] sm:w-[560px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl">
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="h-1.5 w-12 rounded-full bg-slate-200" />
        </div>

        <div className="shrink-0 border-b border-slate-100 px-6 pb-5 pt-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-950">
                  Attendance Roster
                </h2>

                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                  {
                    roster.length
                  }
                </span>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Everyone currently
                checked in.
              </p>
            </div>

            <button
              type="button"
              onClick={
                onClose
              }
              aria-label="Close"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600"
            >
              <X size={18} />
            </button>
          </div>

          <div className="relative mt-4">
            <Search
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={
                search
              }
              onChange={(
                event
              ) =>
                setSearch(
                  event.target
                    .value
                )
              }
              placeholder="Search checked-in people..."
              className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm text-black placeholder:text-slate-400 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
          {filteredRoster.length >
          0 ? (
            <div className="space-y-2">
              {filteredRoster.map(
                (record) => (
                  <FullRosterRow
                    key={
                      record.id
                    }
                    record={
                      record
                    }
                    timezone={
                      timezone
                    }
                    onCorrect={() =>
                      onCorrect(
                        record
                      )
                    }
                  />
                )
              )}
            </div>
          ) : (
            <div className="py-12 text-center">
              <Search
                size={24}
                className="mx-auto text-slate-300"
              />

              <p className="mt-3 text-sm font-semibold text-slate-700">
                No results
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FullRosterRow({
  record,
  timezone,
  onCorrect,
}: {
  record:
    AttendanceRosterItem;

  timezone: string;

  onCorrect:
    () => void;
}) {
  const displayName =
    getDisplayName(
      record
    );

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3">
      <Avatar
        photoUrl={
          record.photo_url
        }
        initials={
          getInitials(
            record
          )
        }
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-slate-950">
          {displayName}
        </p>

        <div className="mt-1 flex flex-wrap gap-x-2 text-xs text-slate-400">
          <span>
            {formatMemberNumber(
              record.member_no
            )}
          </span>

          <span>
            •
          </span>

          <span>
            {getMemberTypeLabel(
              record
                .member_type_at_check_in
            )}
          </span>
        </div>

        <p className="mt-1 text-xs text-slate-500">
          {formatCheckInTime(
            record.checked_in_at,
            timezone
          )}
          {" • "}
          <span className="capitalize">
            {
              record.check_in_method
            }
          </span>
        </p>

        {record.checked_in_by_name && (
          <p className="mt-1 truncate text-[11px] text-slate-400">
            Checked in by{" "}
            {
              record.checked_in_by_name
            }
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={
          onCorrect
        }
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
      >
        <RotateCcw
          size={15}
        />
      </button>
    </div>
  );
}

function AttendanceCorrectionModal({
  sessionId,
  record,
  onClose,
  onCorrected,
}: {
  sessionId: string;

  record:
    AttendanceRosterItem;

  onClose: () => void;

  onCorrected:
    () => void;
}) {
  const [
    reason,
    setReason,
  ] =
    useState(
      "Checked in by mistake"
    );

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const [
    isSubmitting,
    setIsSubmitting,
  ] =
    useState(false);

  const displayName =
    getDisplayName(
      record
    );

  useEffect(() => {
    const previous =
      document.body.style
        .overflow;

    document.body.style
      .overflow =
      "hidden";

    return () => {
      document.body.style
        .overflow =
        previous;
    };
  }, []);

  async function handleSubmit(
    event:
      React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setError(null);

    setIsSubmitting(
      true
    );

    const result =
      await voidAttendanceRecordAction({
        eventSessionId:
          sessionId,

        attendanceRecordId:
          record.id,

        reason,
      });

    setIsSubmitting(
      false
    );

    if (!result.success) {
      setError(
        result.message
      );

      return;
    }

    await onCorrected();
  }

  return (
    <div className="fixed inset-0 z-[120]">
      <button
        type="button"
        aria-label="Close attendance correction"
        onClick={
          isSubmitting
            ? undefined
            : onClose
        }
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px]"
      />

      <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white shadow-2xl sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:w-[480px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl">
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="h-1.5 w-12 rounded-full bg-slate-200" />
        </div>

        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              Correct Check-In
            </h2>

            <p className="mt-1 text-sm leading-5 text-slate-500">
              Remove{" "}
              <strong className="font-semibold text-slate-700">
                {displayName}
              </strong>{" "}
              from this roster.
            </p>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            disabled={
              isSubmitting
            }
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 disabled:opacity-50"
          >
            <X
              size={18}
            />
          </button>
        </div>

        <form
          onSubmit={
            handleSubmit
          }
        >
          <div className="px-6 py-6">
            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                Reason
              </span>

              <textarea
                value={
                  reason
                }
                onChange={(
                  event
                ) =>
                  setReason(
                    event.target
                      .value
                  )
                }
                required
                minLength={3}
                maxLength={500}
                rows={3}
                className="mt-2 w-full resize-none rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-black outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
              />
            </label>

            <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3">
              <p className="text-xs font-semibold text-amber-800">
                This does not
                delete the record.
              </p>

              <p className="mt-1 text-xs leading-5 text-amber-700">
                The original
                attendance record
                and correction audit
                are retained.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-[110px_1fr] gap-3 border-t border-slate-100 px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-5">
            <button
              type="button"
              onClick={
                onClose
              }
              disabled={
                isSubmitting
              }
              className="h-12 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                isSubmitting
              }
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:bg-red-300"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle
                    size={17}
                    className="animate-spin"
                  />

                  Correcting...
                </>
              ) : (
                <>
                  <RotateCcw
                    size={17}
                  />

                  Remove Check-In
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Avatar({
  photoUrl,
  initials,
}: {
  photoUrl:
    string | null;

  initials: string;
}) {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-sm font-bold text-slate-600">
      {photoUrl ? (
        <img
          src={
            photoUrl
          }
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        initials
      )}
    </div>
  );
}

function getDisplayName(
  record:
    AttendanceRosterItem
) {
  return [
    record.first_name,
    record.middle_name,
    record.last_name,
    record.suffix,
  ]
    .filter(Boolean)
    .join(" ");
}

function getInitials(
  record:
    AttendanceRosterItem
) {
  return `${record.first_name.charAt(
    0
  )}${record.last_name.charAt(
    0
  )}`.toUpperCase();
}

function formatCheckInTime(
  value: string,
  timezone: string
) {
  return new Intl.DateTimeFormat(
    "en-PH",
    {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone:
        timezone ||
        "Asia/Manila",
    }
  ).format(
    new Date(value)
  );
}
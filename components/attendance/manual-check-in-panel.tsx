"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  Check,
  CheckCircle2,
  CloudOff,
  CloudUpload,
  LoaderCircle,
  Search,
  UserPlus,
  UserRoundSearch,
  WifiOff,
  XCircle,
} from "lucide-react";

import {
  formatMemberNumber,
  getMemberTypeLabel,
} from "@/lib/members";

import type {
  ManualCheckInMember,
  QuickVisitorRegistrationResult,
} from "@/lib/attendance";

import {
  ATTENDANCE_OUTBOX_CHANGED_EVENT,
  getAttendanceCacheInfo,
  getQueuedOfflineMemberIds,
  queueOfflineAttendanceCheckIn,
  searchCachedAttendanceMembers,
  setCachedMemberCheckedIn,
} from "@/lib/attendance/attendance-offline-db";

import {
  manualCheckInMemberAction,
  searchAttendanceMembersAction,
} from "@/app/(app)/attendance/actions";

import {
  QuickVisitorRegistration,
} from "./quick-visitor-registration";

interface ManualCheckInPanelProps {
  sessionId: string;

  onAttendanceChanged:
    () => void;
}

interface FeedbackState {
  type:
    | "success"
    | "warning"
    | "error";

  message: string;
}

type SearchSource =
  | "online"
  | "cache"
  | null;

export function ManualCheckInPanel({
  sessionId,
  onAttendanceChanged,
}: ManualCheckInPanelProps) {
  const router =
    useRouter();

  const inputRef =
    useRef<HTMLInputElement>(
      null
    );

  const requestIdRef =
    useRef(0);

  const [
    query,
    setQuery,
  ] =
    useState("");

  const [
    members,
    setMembers,
  ] =
    useState<
      ManualCheckInMember[]
    >([]);

  const [
    isSearching,
    setIsSearching,
  ] =
    useState(false);

  const [
    pendingMemberId,
    setPendingMemberId,
  ] =
    useState<
      string | null
    >(null);

  const [
    refreshVersion,
    setRefreshVersion,
  ] =
    useState(0);

  const [
    feedback,
    setFeedback,
  ] =
    useState<
      FeedbackState | null
    >(null);

  const [
    visitorRegistrationOpen,
    setVisitorRegistrationOpen,
  ] =
    useState(false);

  const [
    isOnline,
    setIsOnline,
  ] =
    useState(true);

  const [
    cacheAvailable,
    setCacheAvailable,
  ] =
    useState(false);

  const [
    cacheMemberCount,
    setCacheMemberCount,
  ] =
    useState(0);

  const [
    searchSource,
    setSearchSource,
  ] =
    useState<
      SearchSource
    >(null);

  const trimmedQuery =
    query.trim();

  const shouldSearch =
    trimmedQuery.length >
    0;

  useEffect(() => {
    async function updateConnectionState() {
      setIsOnline(
        navigator.onLine
      );

      const info =
        await getAttendanceCacheInfo(
          sessionId
        );

      setCacheAvailable(
        info.available
      );

      setCacheMemberCount(
        info.memberCount
      );
    }

    void updateConnectionState();

    function handleOnline() {
      void updateConnectionState();

      setRefreshVersion(
        (current) =>
          current + 1
      );
    }

    function handleOffline() {
      void updateConnectionState();

      setRefreshVersion(
        (current) =>
          current + 1
      );
    }

    function handleOutboxChange(
      event: Event
    ) {
      const customEvent =
        event as CustomEvent<{
          sessionId?: string;
        }>;

      if (
        customEvent.detail
          ?.sessionId &&
        customEvent.detail
          .sessionId !==
          sessionId
      ) {
        return;
      }

      setRefreshVersion(
        (current) =>
          current + 1
      );
    }

    window.addEventListener(
      "online",
      handleOnline
    );

    window.addEventListener(
      "offline",
      handleOffline
    );

    window.addEventListener(
      ATTENDANCE_OUTBOX_CHANGED_EVENT,
      handleOutboxChange
    );

    const interval =
      window.setInterval(
        () => {
          void updateConnectionState();
        },
        30_000
      );

    return () => {
      window.removeEventListener(
        "online",
        handleOnline
      );

      window.removeEventListener(
        "offline",
        handleOffline
      );

      window.removeEventListener(
        ATTENDANCE_OUTBOX_CHANGED_EVENT,
        handleOutboxChange
      );

      window.clearInterval(
        interval
      );
    };
  }, [sessionId]);

  useEffect(() => {
    if (!shouldSearch) {
      requestIdRef.current +=
        1;

      setMembers([]);

      setIsSearching(
        false
      );

      setSearchSource(
        null
      );

      return;
    }

    const requestId =
      ++requestIdRef.current;

    let cancelled =
      false;

    const timer =
      window.setTimeout(
        async () => {
          setIsSearching(
            true
          );

          try {
            if (
              !navigator.onLine
            ) {
              const cached =
                await searchCachedAttendanceMembers(
                  sessionId,
                  trimmedQuery
                );

              if (
                cancelled ||
                requestId !==
                  requestIdRef
                    .current
              ) {
                return;
              }

              setMembers(
                cached.members
              );

              setCacheAvailable(
                cached.available
              );

              setSearchSource(
                "cache"
              );

              return;
            }

            const result =
              await searchAttendanceMembersAction({
                eventSessionId:
                  sessionId,

                query:
                  trimmedQuery,
              });

            if (
              cancelled ||
              requestId !==
                requestIdRef
                  .current
            ) {
              return;
            }

            if (
              result.success
            ) {
              const queuedIds =
                await getQueuedOfflineMemberIds(
                  sessionId
                );

              if (
                cancelled ||
                requestId !==
                  requestIdRef
                    .current
              ) {
                return;
              }

              setMembers(
                result.members.map(
                  (
                    member
                  ) => {
                    const pendingSync =
                      queuedIds.has(
                        member.id
                      );

                    return {
                      ...member,

                      already_checked_in:
                        member.already_checked_in ||
                        pendingSync,

                      pending_sync:
                        pendingSync,
                    };
                  }
                )
              );

              setSearchSource(
                "online"
              );

              return;
            }

            const cached =
              await searchCachedAttendanceMembers(
                sessionId,
                trimmedQuery
              );

            if (
              cancelled ||
              requestId !==
                requestIdRef
                  .current
            ) {
              return;
            }

            if (
              cached.available
            ) {
              setMembers(
                cached.members
              );

              setSearchSource(
                "cache"
              );
            } else {
              setMembers([]);

              setFeedback({
                type:
                  "error",

                message:
                  result.message,
              });
            }
          } catch (error) {
            console.error(
              "Attendance search failed:",
              error
            );

            try {
              const cached =
                await searchCachedAttendanceMembers(
                  sessionId,
                  trimmedQuery
                );

              if (
                cancelled ||
                requestId !==
                  requestIdRef
                    .current
              ) {
                return;
              }

              setMembers(
                cached.members
              );

              setCacheAvailable(
                cached.available
              );

              setSearchSource(
                cached.available
                  ? "cache"
                  : null
              );
            } catch (
              cacheError
            ) {
              console.error(
                "Cached attendance search failed:",
                cacheError
              );

              setMembers([]);
            }
          } finally {
            if (
              !cancelled &&
              requestId ===
                requestIdRef
                  .current
            ) {
              setIsSearching(
                false
              );
            }
          }
        },
        isOnline
          ? 300
          : 50
      );

    return () => {
      cancelled = true;

      window.clearTimeout(
        timer
      );
    };
  }, [
    trimmedQuery,
    shouldSearch,
    sessionId,
    refreshVersion,
    isOnline,
  ]);

  async function handleCheckIn(
    member:
      ManualCheckInMember
  ) {
    if (
      member.already_checked_in ||
      pendingMemberId
    ) {
      return;
    }

    if (
      !navigator.onLine
    ) {
      if (
        !cacheAvailable
      ) {
        setFeedback({
          type:
            "error",

          message:
            "Offline attendance is unavailable because this device does not have a member cache yet.",
        });

        return;
      }

      setPendingMemberId(
        member.id
      );

      setFeedback(
        null
      );

      try {
        await queueOfflineAttendanceCheckIn({
          sessionId,

          member: {
            id:
              member.id,

            member_no:
              member.member_no,

            first_name:
              member.first_name,

            middle_name:
              member.middle_name,

            last_name:
              member.last_name,

            suffix:
              member.suffix,

            preferred_name:
              member.preferred_name,

            phone:
              member.phone,

            email:
              member.email,

            member_type:
              member.member_type,

            photo_path:
              member.photo_path,
          },
        });

        await setCachedMemberCheckedIn(
          sessionId,
          member.id,
          true
        );

        setMembers(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                member.id
                  ? {
                      ...item,

                      already_checked_in:
                        true,

                      pending_sync:
                        true,
                    }
                  : item
            )
        );

        const displayName =
          [
            member.first_name,
            member.middle_name,
            member.last_name,
            member.suffix,
          ]
            .filter(Boolean)
            .join(" ");

        setFeedback({
          type:
            "success",

          message:
            `${displayName} checked in offline. Attendance will sync automatically when the connection returns.`,
        });
      } catch (error) {
        console.error(
          "Unable to queue offline attendance:",
          error
        );

        setFeedback({
          type:
            "error",

          message:
            "Offline attendance could not be saved on this device.",
        });
      } finally {
        setPendingMemberId(
          null
        );
      }

      return;
    }

    setPendingMemberId(
      member.id
    );

    setFeedback(
      null
    );

    const result =
      await manualCheckInMemberAction({
        eventSessionId:
          sessionId,

        memberId:
          member.id,
      });

    setPendingMemberId(
      null
    );

    if (
      !result.success
    ) {
      setFeedback({
        type:
          "error",

        message:
          result.message,
      });

      inputRef.current?.focus();

      return;
    }

    await setCachedMemberCheckedIn(
      sessionId,
      result.memberId,
      true
    );

    setMembers(
      (current) =>
        current.map(
          (item) =>
            item.id ===
            result.memberId
              ? {
                  ...item,

                  already_checked_in:
                    true,

                  pending_sync:
                    false,
                }
              : item
        )
    );

    if (
      result.status ===
      "already_checked_in"
    ) {
      setFeedback({
        type:
          "warning",

        message:
          `${result.displayName} is already checked in.`,
      });
    } else {
      setFeedback({
        type:
          "success",

        message:
          `${result.displayName} checked in successfully.`,
      });

      setQuery("");

      setMembers([]);

      setRefreshVersion(
        (current) =>
          current + 1
      );

      onAttendanceChanged();

      router.refresh();
    }

    window.setTimeout(
      () => {
        inputRef.current?.focus();
      },
      50
    );
  }

  function handleVisitorRegistered(
    result: Extract<
      QuickVisitorRegistrationResult,
      {
        success:
          true;
      }
    >
  ) {
    setVisitorRegistrationOpen(
      false
    );

    setQuery("");

    setMembers([]);

    setFeedback({
      type:
        "success",

      message:
        `${result.displayName} was registered as a visitor and checked in successfully.`,
    });

    setRefreshVersion(
      (current) =>
        current + 1
    );

    onAttendanceChanged();

    router.refresh();

    window.setTimeout(
      () => {
        inputRef.current?.focus();
      },
      100
    );
  }

  return (
    <>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              Manual Check-In
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Search for a member,
              attendee, or visitor.
            </p>
          </div>

          {!isOnline && (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
              <WifiOff
                size={12}
              />

              Offline
            </span>
          )}
        </div>

        {feedback && (
          <FeedbackMessage
            feedback={
              feedback
            }
          />
        )}

        {!isOnline && (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <CloudOff
              size={18}
              className="mt-0.5 shrink-0 text-amber-700"
            />

            <div>
              <p className="text-xs font-semibold text-amber-900">
                {cacheAvailable
                  ? "Offline attendance is available"
                  : "No offline attendance cache is available"}
              </p>

              <p className="mt-1 text-xs leading-5 text-amber-700">
                {cacheAvailable
                  ? `${cacheMemberCount} active people are cached. Check-ins will be stored on this device and synchronized automatically when internet returns.`
                  : "Reconnect once so Ecclesia Flow can cache the active member directory."}
              </p>
            </div>
          </div>
        )}

        <div className="relative mt-5">
          <Search
            size={19}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            ref={inputRef}
            type="search"
            value={
              query
            }
            onChange={(
              event
            ) => {
              setQuery(
                event.target
                  .value
              );

              setFeedback(
                null
              );
            }}
            autoComplete="off"
            spellCheck={
              false
            }
            placeholder="Search name, phone, email or EC number..."
            className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-11 text-sm text-black placeholder:text-slate-400 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
          />

          {isSearching && (
            <LoaderCircle
              size={18}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-slate-400"
            />
          )}
        </div>

        {searchSource ===
          "cache" &&
          shouldSearch && (
            <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-amber-600">
              <CloudOff
                size={12}
              />

              Results from offline
              member cache
            </div>
          )}

        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800">
              New visitor?
            </p>

            <p className="mt-0.5 text-xs leading-5 text-slate-500">
              {isOnline
                ? "Register and check them in without leaving attendance."
                : "Offline visitor registration will be added in #52."}
            </p>
          </div>

          <button
            type="button"
            disabled={
              !isOnline
            }
            onClick={() => {
              if (
                !isOnline
              ) {
                return;
              }

              setFeedback(
                null
              );

              setVisitorRegistrationOpen(
                true
              );
            }}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <UserPlus
              size={15}
            />

            Register
          </button>
        </div>

        {!shouldSearch && (
          <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-center">
            <UserRoundSearch
              size={18}
              className="shrink-0 text-slate-400"
            />

            <p className="text-xs leading-5 text-slate-500">
              Start typing to find
              someone to check in.
            </p>
          </div>
        )}

        {shouldSearch && (
          <div className="mt-4">
            {!isSearching &&
              members.length ===
                0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-7 text-center">
                  <UserRoundSearch
                    size={24}
                    className="mx-auto text-slate-400"
                  />

                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    No person found
                  </p>

                  <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-slate-500">
                    {isOnline
                      ? "Check the spelling or register them as a new visitor."
                      : cacheAvailable
                        ? "No match was found in the cached member directory."
                        : "Reconnect to download the active member directory."}
                  </p>

                  {isOnline && (
                    <button
                      type="button"
                      onClick={() =>
                        setVisitorRegistrationOpen(
                          true
                        )
                      }
                      className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-xs font-semibold text-white"
                    >
                      <UserPlus
                        size={15}
                      />

                      Register Visitor
                    </button>
                  )}
                </div>
              )}

            {members.length >
              0 && (
              <>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Search Results
                  </p>

                  <span className="text-xs text-slate-400">
                    {
                      members.length
                    }{" "}
                    found
                  </span>
                </div>

                <div className="max-h-[340px] space-y-2 overflow-y-auto overscroll-contain pr-1">
                  {members.map(
                    (
                      member
                    ) => (
                      <MemberCheckInRow
                        key={
                          member.id
                        }
                        member={
                          member
                        }
                        isPending={
                          pendingMemberId ===
                          member.id
                        }
                        disabled={
                          Boolean(
                            pendingMemberId
                          ) ||
                          (!isOnline &&
                            !cacheAvailable)
                        }
                        offline={
                          !isOnline
                        }
                        onCheckIn={() =>
                          handleCheckIn(
                            member
                          )
                        }
                      />
                    )
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </section>

      <QuickVisitorRegistration
        sessionId={
          sessionId
        }
        open={
          visitorRegistrationOpen &&
          isOnline
        }
        onClose={() =>
          setVisitorRegistrationOpen(
            false
          )
        }
        onRegistered={
          handleVisitorRegistered
        }
      />
    </>
  );
}

function MemberCheckInRow({
  member,
  isPending,
  disabled,
  offline,
  onCheckIn,
}: {
  member:
    ManualCheckInMember;

  isPending:
    boolean;

  disabled:
    boolean;

  offline:
    boolean;

  onCheckIn:
    () => void;
}) {
  const displayName =
    [
      member.first_name,
      member.middle_name,
      member.last_name,
      member.suffix,
    ]
      .filter(Boolean)
      .join(" ");

  const initials =
    `${member.first_name.charAt(
      0
    )}${member.last_name.charAt(
      0
    )}`.toUpperCase();

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-sm font-bold text-slate-600">
        {member.photo_url ? (
          <img
            src={
              member.photo_url
            }
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          initials
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-slate-950">
          {
            displayName
          }
        </p>

        {member.preferred_name && (
          <p className="mt-0.5 truncate text-xs text-slate-500">
            “
            {
              member.preferred_name
            }
            ”
          </p>
        )}

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
          <span>
            {formatMemberNumber(
              member.member_no
            )}
          </span>

          <span>•</span>

          <span>
            {getMemberTypeLabel(
              member.member_type
            )}
          </span>
        </div>
      </div>

      {member.pending_sync ? (
        <div className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-amber-50 px-3 text-[10px] font-semibold text-amber-700">
          <CloudUpload
            size={14}
          />

          Queued
        </div>
      ) : member.already_checked_in ? (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
          <Check
            size={17}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={
            onCheckIn
          }
          disabled={
            disabled
          }
          className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-slate-950 px-3 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isPending ? (
            <LoaderCircle
              size={16}
              className="animate-spin"
            />
          ) : (
            <>
              {offline && (
                <CloudOff
                  size={14}
                />
              )}

              Check In
            </>
          )}
        </button>
      )}
    </div>
  );
}

function FeedbackMessage({
  feedback,
}: {
  feedback:
    FeedbackState;
}) {
  if (
    feedback.type ===
    "success"
  ) {
    return (
      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <CheckCircle2
          size={20}
          className="mt-0.5 shrink-0 text-emerald-600"
        />

        <p className="text-sm font-medium leading-6 text-emerald-800">
          {
            feedback.message
          }
        </p>
      </div>
    );
  }

  if (
    feedback.type ===
    "warning"
  ) {
    return (
      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
        <CheckCircle2
          size={20}
          className="mt-0.5 shrink-0 text-amber-600"
        />

        <p className="text-sm font-medium leading-6 text-amber-800">
          {
            feedback.message
          }
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
      <XCircle
        size={20}
        className="mt-0.5 shrink-0 text-red-600"
      />

      <p className="text-sm font-medium leading-6 text-red-800">
        {
          feedback.message
        }
      </p>
    </div>
  );
}
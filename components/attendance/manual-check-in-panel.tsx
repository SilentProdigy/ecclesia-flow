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
  LoaderCircle,
  Search,
  UserPlus,
  UserRound,
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
  manualCheckInMemberAction,
  searchAttendanceMembersAction,
} from "@/app/(app)/attendance/actions";

import {
  QuickVisitorRegistration,
} from "./quick-visitor-registration";

interface ManualCheckInPanelProps {
  sessionId: string;
}

interface FeedbackState {
  type:
    | "success"
    | "warning"
    | "error";

  message: string;
}

export function ManualCheckInPanel({
  sessionId,
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
    useState(true);

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

  useEffect(() => {
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

          const result =
            await searchAttendanceMembersAction({
              eventSessionId:
                sessionId,

              query,
            });

          if (
            cancelled ||
            requestId !==
              requestIdRef.current
          ) {
            return;
          }

          if (
            result.success
          ) {
            setMembers(
              result.members
            );
          } else {
            setMembers([]);

            setFeedback({
              type: "error",

              message:
                result.message,
            });
          }

          setIsSearching(
            false
          );
        },
        query.trim()
          ? 300
          : 0
      );

    return () => {
      cancelled = true;

      window.clearTimeout(
        timer
      );
    };
  }, [
    query,
    sessionId,
    refreshVersion,
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

    setPendingMemberId(
      member.id
    );

    setFeedback(null);

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
        type: "error",

        message:
          result.message,
      });

      inputRef.current?.focus();

      return;
    }

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
                }
              : item
        )
    );

    if (
      result.status ===
      "already_checked_in"
    ) {
      setFeedback({
        type: "warning",

        message:
          `${result.displayName} is already checked in.`,
      });
    } else {
      setFeedback({
        type: "success",

        message:
          `${result.displayName} checked in successfully.`,
      });

      setQuery("");

      setRefreshVersion(
        (current) =>
          current + 1
      );

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
        success: true;
      }
    >
  ) {
    setVisitorRegistrationOpen(
      false
    );

    setQuery("");

    setFeedback({
      type: "success",

      message:
        `${result.displayName} was registered as a visitor and checked in successfully.`,
    });

    setRefreshVersion(
      (current) =>
        current + 1
    );

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
        <div>
          <h2 className="text-lg font-bold text-slate-950">
            Manual Check-In
          </h2>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Search for an active
            member or attendee and
            check them in.
          </p>
        </div>

        {feedback && (
          <FeedbackMessage
            feedback={
              feedback
            }
          />
        )}

        <div className="relative mt-5">
          <Search
            size={19}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            ref={inputRef}
            type="search"
            value={query}
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
            spellCheck={false}
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

        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800">
              New visitor?
            </p>

            <p className="mt-0.5 text-xs leading-5 text-slate-500">
              Register and check
              them in without
              leaving attendance.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setFeedback(
                null
              );

              setVisitorRegistrationOpen(
                true
              );
            }}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            <UserPlus
              size={15}
            />

            Register
          </button>
        </div>

        <div className="mt-4">
          {!isSearching &&
            members.length ===
              0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center">
                <UserRound
                  size={25}
                  className="mx-auto text-slate-400"
                />

                <p className="mt-3 text-sm font-semibold text-slate-700">
                  No members found
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Try another name,
                  phone number,
                  email address or
                  member number.
                </p>

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
              </div>
            )}

          {members.length >
            0 && (
            <div className="space-y-2">
              {members.map(
                (member) => (
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
                      )
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
          )}
        </div>

        {!query.trim() &&
          members.length >
            0 && (
            <p className="mt-3 text-center text-xs text-slate-400">
              Showing up to 20
              active people. Search
              to narrow the list.
            </p>
          )}
      </section>

      <QuickVisitorRegistration
        sessionId={
          sessionId
        }
        open={
          visitorRegistrationOpen
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
  onCheckIn,
}: {
  member:
    ManualCheckInMember;

  isPending: boolean;

  disabled: boolean;

  onCheckIn: () => void;
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
          {displayName}
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

        {(member.phone ||
          member.email) && (
          <p className="mt-1 truncate text-xs text-slate-400">
            {member.phone ??
              member.email}
          </p>
        )}
      </div>

      {member.already_checked_in ? (
        <div className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-emerald-50 px-3 text-xs font-semibold text-emerald-700">
          <Check
            size={15}
          />

          <span className="hidden sm:inline">
            Checked In
          </span>
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
          className="flex h-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 px-3 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isPending ? (
            <LoaderCircle
              size={16}
              className="animate-spin"
            />
          ) : (
            "Check In"
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
"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  AlertTriangle,
  LoaderCircle,
  RotateCcw,
  X,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import {
  reopenAttendanceSessionAction,
} from "@/app/(app)/attendance/session-actions";

interface ReopenAttendancePanelProps {
  sessionId: string;

  attendanceCount: number;
}

export function ReopenAttendancePanel({
  sessionId,
  attendanceCount,
}: ReopenAttendancePanelProps) {
  const router =
    useRouter();

  const [
    open,
    setOpen,
  ] =
    useState(false);

  const [
    confirmed,
    setConfirmed,
  ] =
    useState(false);

  const [
    isSubmitting,
    setIsSubmitting,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  function closeModal() {
    if (isSubmitting) {
      return;
    }

    setOpen(false);
    setConfirmed(false);
    setError(null);
  }

  async function handleReopen() {
    if (
      !confirmed ||
      isSubmitting
    ) {
      return;
    }

    setError(null);

    setIsSubmitting(
      true
    );

    const result =
      await reopenAttendanceSessionAction(
        sessionId
      );

    setIsSubmitting(
      false
    );

    if (!result.success) {
      setError(
        result.message
      );

      return;
    }

    setOpen(false);

    router.refresh();
  }

  return (
    <>
      <section className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white">
            <RotateCcw
              size={20}
              className="text-amber-700"
            />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-slate-950">
              Re-open Attendance
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-600">
              Re-open this session
              if attendance was
              completed too early or
              additional check-ins
              are still required.
            </p>

            <p className="mt-1 text-xs font-medium text-amber-700">
              Admin only
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            setOpen(true)
          }
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white px-4 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
        >
          <RotateCcw
            size={17}
          />

          Re-open Attendance
        </button>
      </section>

      {open && (
        <ReopenAttendanceModal
          attendanceCount={
            attendanceCount
          }
          confirmed={
            confirmed
          }
          setConfirmed={
            setConfirmed
          }
          isSubmitting={
            isSubmitting
          }
          error={error}
          onClose={
            closeModal
          }
          onReopen={
            handleReopen
          }
        />
      )}
    </>
  );
}

function ReopenAttendanceModal({
  attendanceCount,
  confirmed,
  setConfirmed,
  isSubmitting,
  error,
  onClose,
  onReopen,
}: {
  attendanceCount:
    number;

  confirmed:
    boolean;

  setConfirmed: (
    value: boolean
  ) => void;

  isSubmitting:
    boolean;

  error:
    string | null;

  onClose:
    () => void;

  onReopen:
    () => void;
}) {
  useEffect(() => {
    const previousOverflow =
      document.body.style
        .overflow;

    document.body.style
      .overflow =
      "hidden";

    function handleKeyDown(
      event:
        KeyboardEvent
    ) {
      if (
        event.key ===
          "Escape" &&
        !isSubmitting
      ) {
        onClose();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.body.style
        .overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    isSubmitting,
    onClose,
  ]);

  return (
    <div className="fixed inset-0 z-[130]">
      <button
        type="button"
        aria-label="Close re-open attendance dialog"
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
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50">
              <AlertTriangle
                size={20}
                className="text-amber-700"
              />
            </div>

            <h2 className="mt-3 text-lg font-bold text-slate-950">
              Re-open Attendance?
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              This session will
              return to active
              attendance mode.
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
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 disabled:opacity-50"
          >
            <X
              size={18}
            />
          </button>
        </div>

        <div className="px-6 py-6">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Recorded Attendance
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-950">
              {
                attendanceCount
              }
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Existing check-ins
              will remain intact.
            </p>
          </div>

          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900">
              Re-opening will enable
            </p>

            <ul className="mt-2 space-y-1.5 text-xs leading-5 text-amber-800">
              <li>
                • New member
                check-ins
              </li>

              <li>
                • Visitor
                registration
              </li>

              <li>
                • Attendance
                corrections
              </li>

              <li>
                • Kiosk mode
              </li>

              <li>
                • Live attendance
                summary
              </li>
            </ul>
          </div>

          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4">
            <input
              type="checkbox"
              checked={
                confirmed
              }
              onChange={(
                event
              ) =>
                setConfirmed(
                  event.target
                    .checked
                )
              }
              disabled={
                isSubmitting
              }
              className="mt-0.5 h-4 w-4 rounded border-slate-300"
            />

            <span className="text-sm leading-5 text-slate-700">
              I understand this
              session will accept
              attendance again.
            </span>
          </label>
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
            className="h-12 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={
              onReopen
            }
            disabled={
              !confirmed ||
              isSubmitting
            }
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSubmitting ? (
              <>
                <LoaderCircle
                  size={17}
                  className="animate-spin"
                />

                Re-opening...
              </>
            ) : (
              <>
                <RotateCcw
                  size={17}
                />

                Re-open Attendance
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
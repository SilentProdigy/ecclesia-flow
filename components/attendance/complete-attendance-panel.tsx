"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  CheckCircle2,
  LoaderCircle,
  LockKeyhole,
  X,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import {
  completeAttendanceSessionAction,
} from "@/app/(app)/attendance/session-actions";

interface CompleteAttendancePanelProps {
  sessionId: string;
  attendanceCount: number;
}

export function CompleteAttendancePanel({
  sessionId,
  attendanceCount,
}: CompleteAttendancePanelProps) {
  const router =
    useRouter();

  const [
    modalOpen,
    setModalOpen,
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

    setModalOpen(false);
    setConfirmed(false);
    setError(null);
  }

  async function handleComplete() {
    if (
      !confirmed ||
      isSubmitting
    ) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const result =
      await completeAttendanceSessionAction(
        sessionId
      );

    setIsSubmitting(false);

    if (!result.success) {
      setError(
        result.message
      );

      return;
    }

    setModalOpen(false);

    router.refresh();
  }

  return (
    <>
      <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100">
            <LockKeyhole
              size={20}
              className="text-slate-600"
            />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-slate-950">
              Finish Attendance
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Complete this session
              when check-in is
              finished.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            setModalOpen(true)
          }
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <CheckCircle2
            size={18}
          />

          Complete Attendance
        </button>
      </section>

      {modalOpen && (
        <CompleteAttendanceModal
          attendanceCount={
            attendanceCount
          }
          confirmed={
            confirmed
          }
          setConfirmed={
            setConfirmed
          }
          error={error}
          isSubmitting={
            isSubmitting
          }
          onClose={
            closeModal
          }
          onComplete={
            handleComplete
          }
        />
      )}
    </>
  );
}

function CompleteAttendanceModal({
  attendanceCount,
  confirmed,
  setConfirmed,
  error,
  isSubmitting,
  onClose,
  onComplete,
}: {
  attendanceCount: number;

  confirmed: boolean;

  setConfirmed: (
    value: boolean
  ) => void;

  error:
    string | null;

  isSubmitting: boolean;

  onClose: () => void;

  onComplete: () => void;
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
        aria-label="Close complete attendance dialog"
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
              <LockKeyhole
                size={20}
                className="text-amber-700"
              />
            </div>

            <h2 className="mt-3 text-lg font-bold text-slate-950">
              Complete Attendance?
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              This will close the
              session for new
              check-ins.
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
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-6">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">
              {error}
            </div>
          )}

          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Current Check-Ins
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-950">
              {
                attendanceCount
              }
            </p>
          </div>

          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900">
              After completion
            </p>

            <ul className="mt-2 space-y-1.5 text-xs leading-5 text-amber-800">
              <li>
                • New check-ins will
                be blocked.
              </li>

              <li>
                • Visitor
                registration for this
                session will stop.
              </li>

              <li>
                • Attendance
                corrections will be
                disabled.
              </li>

              <li>
                • The final roster
                remains available
                for review.
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
              I understand that
              completing attendance
              will stop new
              check-ins for this
              session.
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
              onComplete
            }
            disabled={
              !confirmed ||
              isSubmitting
            }
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSubmitting ? (
              <>
                <LoaderCircle
                  size={17}
                  className="animate-spin"
                />

                Completing...
              </>
            ) : (
              <>
                <CheckCircle2
                  size={17}
                />

                Complete Attendance
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
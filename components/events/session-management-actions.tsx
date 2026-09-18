"use client";

import {
  useState,
  useTransition,
} from "react";

import {
  Ban,
  Loader2,
  RotateCcw,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import {
  setEventSessionCancelledAction,
} from "@/app/(app)/events/actions";

import type {
  EventSessionStatus,
} from "@/lib/events/types";

interface SessionManagementActionsProps {
  eventId: string;
  sessionId: string;
  status: EventSessionStatus;
}

export function SessionManagementActions({
  eventId,
  sessionId,
  status,
}: SessionManagementActionsProps) {
  const router =
    useRouter();

  const [
    pending,
    startTransition,
  ] = useTransition();

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const cancelled =
    status ===
    "cancelled";

  if (
    status ===
    "completed"
  ) {
    return null;
  }

  function changeStatus() {
    if (
      !cancelled &&
      !window.confirm(
        "Cancel this session? The recurring event and other sessions will not be affected.",
      )
    ) {
      return;
    }

    setError(null);

    startTransition(
      async () => {
        const result =
          await setEventSessionCancelledAction(
            eventId,
            sessionId,
            !cancelled,
          );

        if (
          !result.success
        ) {
          setError(
            result.error ??
              "Unable to update the session.",
          );

          return;
        }

        router.refresh();
      },
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pending}
        onClick={
          changeStatus
        }
        className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition disabled:opacity-50 ${
          cancelled
            ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
        }`}
      >
        {pending ? (
          <Loader2
            size={17}
            className="animate-spin"
          />
        ) : cancelled ? (
          <RotateCcw
            size={17}
          />
        ) : (
          <Ban
            size={17}
          />
        )}

        {cancelled
          ? "Restore Session"
          : "Cancel Session"}
      </button>

      {error && (
        <p className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
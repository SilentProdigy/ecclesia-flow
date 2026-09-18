"use client";

import {
  useState,
  useTransition,
} from "react";

import Link from "next/link";

import {
  Archive,
  Loader2,
  Pencil,
  RotateCcw,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import {
  setEventArchivedAction,
} from "@/app/(app)/events/actions";

import type {
  EventStatus,
} from "@/lib/events/types";

interface EventManagementActionsProps {
  eventId: string;
  status: EventStatus;
}

export function EventManagementActions({
  eventId,
  status,
}: EventManagementActionsProps) {
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

  const archived =
    status ===
    "archived";

  function changeArchiveState() {
    if (
      !archived &&
      !window.confirm(
        "Archive this event? Historical sessions will remain available.",
      )
    ) {
      return;
    }

    setError(null);

    startTransition(
      async () => {
        const result =
          await setEventArchivedAction(
            eventId,
            !archived,
          );

        if (
          !result.success
        ) {
          setError(
            result.error ??
              "Unable to update the event.",
          );

          return;
        }

        router.refresh();
      },
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/events/${eventId}/edit`}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <Pencil
            size={16}
          />
          Edit
        </Link>

        <button
          type="button"
          disabled={pending}
          onClick={
            changeArchiveState
          }
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          {pending ? (
            <Loader2
              size={16}
              className="animate-spin"
            />
          ) : archived ? (
            <RotateCcw
              size={16}
            />
          ) : (
            <Archive
              size={16}
            />
          )}

          {archived
            ? "Restore"
            : "Archive"}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
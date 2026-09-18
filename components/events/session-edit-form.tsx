"use client";

import {
  FormEvent,
  useState,
} from "react";

import Link from "next/link";

import {
  AlertCircle,
  Loader2,
  Save,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import {
  updateEventSessionAction,
} from "@/app/(app)/events/actions";

interface SessionEditFormProps {
  eventId: string;
  sessionId: string;
  initialValues: {
    sessionDate: string;
    startTime: string;
    durationMinutes: string;
    titleOverride: string;
    locationOverride: string;
    notes: string;
  };
}

export function SessionEditForm({
  eventId,
  sessionId,
  initialValues,
}: SessionEditFormProps) {
  const router =
    useRouter();

  const [
    values,
    setValues,
  ] = useState(
    initialValues,
  );

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const [
    fieldErrors,
    setFieldErrors,
  ] = useState<
    Record<
      string,
      string[]
    >
  >({});

  function update(
    field: keyof typeof values,
    value: string,
  ) {
    setValues(
      (current) => ({
        ...current,
        [field]: value,
      }),
    );

    setFieldErrors(
      (current) => {
        const next = {
          ...current,
        };

        delete next[field];

        return next;
      },
    );
  }

  async function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setFieldErrors({});

    const result =
      await updateEventSessionAction(
        eventId,
        sessionId,
        values,
      );

    if (!result.success) {
      setError(
        result.error ??
          "Unable to update the session.",
      );

      setFieldErrors(
        result.fieldErrors ??
          {},
      );

      setSubmitting(false);

      return;
    }

    router.push(
      `/events/${eventId}?sessionUpdated=1`,
    );

    router.refresh();
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-5"
    >
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle
            size={19}
            className="mt-0.5 shrink-0"
          />

          <p>{error}</p>
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">
              Session date
            </span>

            <input
              type="date"
              value={
                values.sessionDate
              }
              onChange={(
                event,
              ) =>
                update(
                  "sessionDate",
                  event.target
                    .value,
                )
              }
              className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
            />

            {fieldErrors
              .sessionDate?.[0] && (
              <p className="mt-1.5 text-sm text-red-600">
                {
                  fieldErrors
                    .sessionDate[0]
                }
              </p>
            )}
          </label>

          <label>
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">
              Start time
            </span>

            <input
              type="time"
              value={
                values.startTime
              }
              onChange={(
                event,
              ) =>
                update(
                  "startTime",
                  event.target
                    .value,
                )
              }
              className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
            />
          </label>

          <label className="sm:col-span-2">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">
              Duration
            </span>

            <div className="relative">
              <input
                type="number"
                min={1}
                max={1440}
                value={
                  values.durationMinutes
                }
                onChange={(
                  event,
                ) =>
                  update(
                    "durationMinutes",
                    event.target
                      .value,
                  )
                }
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 pr-20 text-sm"
              />

              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                minutes
              </span>
            </div>
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="font-semibold text-slate-950">
          Session overrides
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Leave these blank to
          use the event defaults.
        </p>

        <div className="mt-5 space-y-4">
          <label>
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">
              Custom title
            </span>

            <input
              value={
                values.titleOverride
              }
              onChange={(
                event,
              ) =>
                update(
                  "titleOverride",
                  event.target
                    .value,
                )
              }
              placeholder="Use event name"
              className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm"
            />
          </label>

          <label>
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">
              Custom location
            </span>

            <input
              value={
                values.locationOverride
              }
              onChange={(
                event,
              ) =>
                update(
                  "locationOverride",
                  event.target
                    .value,
                )
              }
              placeholder="Use event location"
              className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm"
            />
          </label>

          <label>
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">
              Notes
            </span>

            <textarea
              rows={4}
              value={
                values.notes
              }
              onChange={(
                event,
              ) =>
                update(
                  "notes",
                  event.target
                    .value,
                )
              }
              placeholder="Optional notes for this specific session..."
              className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6"
            />
          </label>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Link
          href={`/events/${eventId}`}
          className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700"
        >
          Cancel
        </Link>

        <button
          type="submit"
          disabled={
            submitting
          }
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2
                size={18}
                className="animate-spin"
              />
              Saving...
            </>
          ) : (
            <>
              <Save
                size={18}
              />
              Save Session
            </>
          )}
        </button>
      </div>
    </form>
  );
}
"use client";

import {
  FormEvent,
  useState,
} from "react";

import Link from "next/link";

import {
  AlertCircle,
  CalendarDays,
  Check,
  Clock3,
  Loader2,
  MapPin,
  Repeat2,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import {
  createEventAction,
} from "@/app/(app)/events/actions";

import {
  DAYS_OF_WEEK,
  EVENT_TYPE_OPTIONS,
} from "@/lib/events/types";

import type {
  EventRecurrence,
  EventType,
} from "@/lib/events/types";

interface EventFormProps {
  defaultStartDate: string;
}

interface EventDraft {
  name: string;
  description: string;
  eventType: EventType;
  location: string;
  recurrence: EventRecurrence;
  recurrenceInterval: string;
  daysOfWeek: number[];
  dayOfMonth: string;
  startsOn: string;
  endsOn: string;
  defaultStartTime: string;
  durationMinutes: string;
}

const RECURRENCE_OPTIONS: Array<{
  value: EventRecurrence;
  label: string;
  description: string;
}> = [
  {
    value: "none",
    label: "Does not repeat",
    description:
      "For one-time services and special events.",
  },
  {
    value: "daily",
    label: "Daily",
    description:
      "Repeats every day or every few days.",
  },
  {
    value: "weekly",
    label: "Weekly",
    description:
      "Best for Sunday services and weekly meetings.",
  },
  {
    value: "monthly",
    label: "Monthly",
    description:
      "Repeats on a specific day each month.",
  },
];

function FieldError({
  errors,
}: {
  errors:
    | string[]
    | undefined;
}) {
  if (
    !errors ||
    errors.length === 0
  ) {
    return null;
  }

  return (
    <p className="mt-1.5 text-sm text-red-600">
      {errors[0]}
    </p>
  );
}

function getIntervalUnit(
  recurrence: EventRecurrence,
  value: string,
) {
  const count =
    Number(value);

  switch (recurrence) {
    case "daily":
      return count === 1
        ? "day"
        : "days";

    case "weekly":
      return count === 1
        ? "week"
        : "weeks";

    case "monthly":
      return count === 1
        ? "month"
        : "months";

    default:
      return "";
  }
}

export function EventForm({
  defaultStartDate,
}: EventFormProps) {
  const router = useRouter();

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    generalError,
    setGeneralError,
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

  const [
    draft,
    setDraft,
  ] = useState<EventDraft>({
    name: "",
    description: "",
    eventType:
      "worship_service",
    location: "",
    recurrence:
      "weekly",
    recurrenceInterval: "1",
    daysOfWeek: [0],
    dayOfMonth: "1",
    startsOn:
      defaultStartDate,
    endsOn: "",
    defaultStartTime:
      "09:00",
    durationMinutes:
      "90",
  });

  function updateDraft<
    K extends keyof EventDraft,
  >(
    field: K,
    value: EventDraft[K],
  ) {
    setDraft(
      (current) => ({
        ...current,
        [field]: value,
      }),
    );

    setFieldErrors(
      (current) => {
        if (!current[field]) {
          return current;
        }

        const next = {
          ...current,
        };

        delete next[field];

        return next;
      },
    );
  }

  function toggleDay(
    day: number,
  ) {
    const exists =
      draft.daysOfWeek.includes(
        day,
      );

    const next = exists
      ? draft.daysOfWeek.filter(
          (value) =>
            value !== day,
        )
      : [
          ...draft.daysOfWeek,
          day,
        ].sort(
          (a, b) => a - b,
        );

    updateDraft(
      "daysOfWeek",
      next,
    );
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setSubmitting(true);
    setGeneralError(null);
    setFieldErrors({});

    const result =
      await createEventAction({
        name: draft.name,

        description:
          draft.description,

        eventType:
          draft.eventType,

        location:
          draft.location,

        status: "active",

        recurrence:
          draft.recurrence,

        recurrenceInterval:
          draft.recurrenceInterval,

        daysOfWeek:
          draft.daysOfWeek,

        dayOfMonth:
          draft.recurrence ===
          "monthly"
            ? draft.dayOfMonth
            : null,

        startsOn:
          draft.startsOn,

        endsOn:
          draft.recurrence ===
          "none"
            ? null
            : draft.endsOn,

        defaultStartTime:
          draft.defaultStartTime,

        durationMinutes:
          draft.durationMinutes,

        timezone:
          "Asia/Manila",
      });

    if (!result.success) {
      setGeneralError(
        result.error ??
          "Unable to create the event.",
      );

      setFieldErrors(
        result.fieldErrors ??
          {},
      );

      setSubmitting(false);
      return;
    }

    router.push(
      "/events?created=1",
    );

    router.refresh();
  }

  const intervalUnit =
    getIntervalUnit(
      draft.recurrence,
      draft.recurrenceInterval,
    );

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      {generalError ? (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle
            size={19}
            className="mt-0.5 shrink-0"
          />

          <p>
            {generalError}
          </p>
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-5">
          <h2 className="font-semibold text-slate-950">
            Event details
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Add the basic
            information people
            use to identify this
            event.
          </p>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">
              Event name
              <span className="ml-1 text-red-500">
                *
              </span>
            </span>

            <input
              type="text"
              value={
                draft.name
              }
              onChange={(
                event,
              ) =>
                updateDraft(
                  "name",
                  event.target
                    .value,
                )
              }
              placeholder="Sunday Worship"
              autoFocus
              aria-invalid={
                Boolean(
                  fieldErrors.name,
                )
              }
              className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
            />

            <FieldError
              errors={
                fieldErrors.name
              }
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                Event type
              </span>

              <select
                value={
                  draft.eventType
                }
                onChange={(
                  event,
                ) =>
                  updateDraft(
                    "eventType",
                    event.target
                      .value as EventType,
                  )
                }
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
              >
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

              <FieldError
                errors={
                  fieldErrors.eventType
                }
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                Location
              </span>

              <div className="relative">
                <MapPin
                  size={18}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={
                    draft.location
                  }
                  onChange={(
                    event,
                  ) =>
                    updateDraft(
                      "location",
                      event
                        .target
                        .value,
                    )
                  }
                  placeholder="Main Sanctuary"
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                />
              </div>

              <FieldError
                errors={
                  fieldErrors.location
                }
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">
              Description
              <span className="ml-1 font-normal text-slate-400">
                optional
              </span>
            </span>

            <textarea
              value={
                draft.description
              }
              onChange={(
                event,
              ) =>
                updateDraft(
                  "description",
                  event.target
                    .value,
                )
              }
              rows={3}
              placeholder="Add notes or a short description..."
              className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
            />

            <FieldError
              errors={
                fieldErrors.description
              }
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <Repeat2
              size={19}
            />
          </div>

          <div>
            <h2 className="font-semibold text-slate-950">
              Schedule
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Choose when this
              event happens and
              whether it repeats.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Repeats
            </span>

            <div className="grid gap-2 sm:grid-cols-2">
              {RECURRENCE_OPTIONS.map(
                (option) => {
                  const selected =
                    draft.recurrence ===
                    option.value;

                  return (
                    <button
                      key={
                        option.value
                      }
                      type="button"
                      onClick={() =>
                        updateDraft(
                          "recurrence",
                          option.value,
                        )
                      }
                      className={`flex min-h-20 items-start gap-3 rounded-xl border p-3 text-left transition ${
                        selected
                          ? "border-slate-950 bg-slate-50 ring-1 ring-slate-950"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                          selected
                            ? "border-slate-950 bg-slate-950 text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {selected ? (
                          <Check
                            size={12}
                          />
                        ) : null}
                      </span>

                      <span>
                        <span className="block text-sm font-semibold text-slate-900">
                          {
                            option.label
                          }
                        </span>

                        <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                          {
                            option.description
                          }
                        </span>
                      </span>
                    </button>
                  );
                },
              )}
            </div>

            <FieldError
              errors={
                fieldErrors.recurrence
              }
            />
          </div>

          {draft.recurrence !==
          "none" ? (
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-700">
                  Repeat every
                </span>

                <input
                  type="number"
                  min={1}
                  max={52}
                  inputMode="numeric"
                  value={
                    draft.recurrenceInterval
                  }
                  onChange={(
                    event,
                  ) =>
                    updateDraft(
                      "recurrenceInterval",
                      event
                        .target
                        .value,
                    )
                  }
                  className="h-10 w-20 rounded-lg border border-slate-300 bg-white px-3 text-center text-sm font-semibold text-slate-950 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                />

                <span className="text-sm font-medium text-slate-700">
                  {intervalUnit}
                </span>
              </div>

              <FieldError
                errors={
                  fieldErrors.recurrenceInterval
                }
              />
            </div>
          ) : null}

          {draft.recurrence ===
          "weekly" ? (
            <div>
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Days of the week
              </span>

              <div className="grid grid-cols-7 gap-1.5">
                {DAYS_OF_WEEK.map(
                  (day) => {
                    const selected =
                      draft.daysOfWeek.includes(
                        day.value,
                      );

                    return (
                      <button
                        key={
                          day.value
                        }
                        type="button"
                        aria-label={
                          day.label
                        }
                        aria-pressed={
                          selected
                        }
                        onClick={() =>
                          toggleDay(
                            day.value,
                          )
                        }
                        className={`flex aspect-square min-h-10 items-center justify-center rounded-xl text-xs font-semibold transition sm:aspect-auto sm:h-11 ${
                          selected
                            ? "bg-slate-950 text-white"
                            : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {
                          day.shortLabel
                        }
                      </button>
                    );
                  },
                )}
              </div>

              <FieldError
                errors={
                  fieldErrors.daysOfWeek
                }
              />
            </div>
          ) : null}

          {draft.recurrence ===
          "monthly" ? (
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                Day of month
              </span>

              <input
                type="number"
                min={1}
                max={31}
                inputMode="numeric"
                value={
                  draft.dayOfMonth
                }
                onChange={(
                  event,
                ) =>
                  updateDraft(
                    "dayOfMonth",
                    event.target
                      .value,
                  )
                }
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
              />

              <p className="mt-1.5 text-xs leading-5 text-slate-500">
                Months that do
                not contain this
                date will be
                skipped.
              </p>

              <FieldError
                errors={
                  fieldErrors.dayOfMonth
                }
              />
            </label>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                <CalendarDays
                  size={16}
                  className="text-slate-400"
                />

                {draft.recurrence ===
                "none"
                  ? "Event date"
                  : "Starts on"}
              </span>

              <input
                type="date"
                value={
                  draft.startsOn
                }
                onChange={(
                  event,
                ) =>
                  updateDraft(
                    "startsOn",
                    event.target
                      .value,
                  )
                }
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
              />

              <FieldError
                errors={
                  fieldErrors.startsOn
                }
              />
            </label>

            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                <Clock3
                  size={16}
                  className="text-slate-400"
                />

                Start time
              </span>

              <input
                type="time"
                value={
                  draft.defaultStartTime
                }
                onChange={(
                  event,
                ) =>
                  updateDraft(
                    "defaultStartTime",
                    event.target
                      .value,
                  )
                }
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
              />

              <FieldError
                errors={
                  fieldErrors.defaultStartTime
                }
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                Duration
              </span>

              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={1440}
                  inputMode="numeric"
                  value={
                    draft.durationMinutes
                  }
                  onChange={(
                    event,
                  ) =>
                    updateDraft(
                      "durationMinutes",
                      event
                        .target
                        .value,
                    )
                  }
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 pr-20 text-sm text-slate-950 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                />

                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                  minutes
                </span>
              </div>

              <FieldError
                errors={
                  fieldErrors.durationMinutes
                }
              />
            </label>

            {draft.recurrence !==
            "none" ? (
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Ends on
                  <span className="ml-1 font-normal text-slate-400">
                    optional
                  </span>
                </span>

                <input
                  type="date"
                  min={
                    draft.startsOn ||
                    undefined
                  }
                  value={
                    draft.endsOn
                  }
                  onChange={(
                    event,
                  ) =>
                    updateDraft(
                      "endsOn",
                      event
                        .target
                        .value,
                    )
                  }
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                />

                <FieldError
                  errors={
                    fieldErrors.endsOn
                  }
                />
              </label>
            ) : (
              <div className="hidden sm:block" />
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs leading-5 text-slate-500">
              ChurchFlow will
              create the next
              90 days of service
              sessions
              automatically.
              One-time events
              create a single
              session.
            </p>
          </div>
        </div>
      </section>

      <div className="sticky bottom-[76px] z-20 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:flex sm:justify-end sm:gap-3 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
        <div className="grid grid-cols-2 gap-3 sm:flex">
          <Link
            href="/events"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={
              submitting
            }
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2
                  size={18}
                  className="animate-spin"
                />
                Creating...
              </>
            ) : (
              <>
                <CalendarDays
                  size={18}
                />
                Create Event
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
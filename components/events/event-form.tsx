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
  Save,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import {
  createEventAction,
  updateEventAction,
} from "@/app/(app)/events/actions";

import {
  DAYS_OF_WEEK,
  EVENT_STATUS_OPTIONS,
  EVENT_TYPE_OPTIONS,
} from "@/lib/events/types";

import type {
  EventRecurrence,
  EventStatus,
  EventType,
} from "@/lib/events/types";

interface EventDraft {
  name: string;
  description: string;
  eventType: EventType;
  location: string;
  status: EventStatus;
  recurrence: EventRecurrence;
  recurrenceInterval: string;
  daysOfWeek: number[];
  dayOfMonth: string;
  startsOn: string;
  endsOn: string;
  defaultStartTime: string;
  durationMinutes: string;
}

interface EventFormProps {
  mode?: "create" | "edit";
  eventId?: string;
  defaultStartDate: string;
  initialValues?: EventDraft;
}

const RECURRENCE_OPTIONS: Array<{
  value: EventRecurrence;
  label: string;
  description: string;
}> = [
  {
    value: "none",
    label:
      "Does not repeat",
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
  errors?:
    string[];
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
  mode = "create",
  eventId,
  defaultStartDate,
  initialValues,
}: EventFormProps) {
  const router =
    useRouter();

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
  ] = useState<EventDraft>(
    initialValues ?? {
      name: "",
      description: "",
      eventType:
        "worship_service",
      location: "",
      status: "active",
      recurrence:
        "weekly",
      recurrenceInterval:
        "1",
      daysOfWeek: [0],
      dayOfMonth: "1",
      startsOn:
        defaultStartDate,
      endsOn: "",
      defaultStartTime:
        "09:00",
      durationMinutes:
        "90",
    },
  );

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
          (a, b) =>
            a - b,
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

    const input = {
      name:
        draft.name,

      description:
        draft.description,

      eventType:
        draft.eventType,

      location:
        draft.location,

      status:
        draft.status,

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
    };

    const result =
      mode === "edit" &&
      eventId
        ? await updateEventAction(
            eventId,
            input,
          )
        : await createEventAction(
            input,
          );

    if (!result.success) {
      setGeneralError(
        result.error ??
          "Unable to save the event.",
      );

      setFieldErrors(
        result.fieldErrors ??
          {},
      );

      setSubmitting(false);

      return;
    }

    if (
      mode === "edit" &&
      eventId
    ) {
      router.push(
        `/events/${eventId}?updated=1`,
      );
    } else {
      router.push(
        "/events?created=1",
      );
    }

    router.refresh();
  }

  const intervalUnit =
    getIntervalUnit(
      draft.recurrence,
      draft.recurrenceInterval,
    );

  const isEditing =
    mode === "edit";

  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="space-y-5"
    >
      {generalError && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle
            size={19}
            className="mt-0.5 shrink-0"
          />

          <p>
            {generalError}
          </p>
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-5">
          <h2 className="font-semibold text-slate-950">
            Event details
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Add the basic
            information used to
            identify this event.
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
              autoFocus={
                !isEditing
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
            <label>
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
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
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
            </label>

            <label>
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                Location
              </span>

              <div className="relative">
                <MapPin
                  size={18}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={
                    draft.location
                  }
                  onChange={(
                    event,
                  ) =>
                    updateDraft(
                      "location",
                      event.target
                        .value,
                    )
                  }
                  placeholder="Main Sanctuary"
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-sm text-slate-950 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                />
              </div>
            </label>
          </div>

          {isEditing && (
            <label>
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                Event status
              </span>

              <select
                value={
                  draft.status
                }
                onChange={(
                  event,
                ) =>
                  updateDraft(
                    "status",
                    event.target
                      .value as EventStatus,
                  )
                }
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
              >
                {EVENT_STATUS_OPTIONS.map(
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
            </label>
          )}

          <label>
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
              className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-950 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
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
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                          selected
                            ? "border-slate-950 bg-slate-950 text-white"
                            : "border-slate-300"
                        }`}
                      >
                        {selected && (
                          <Check
                            size={12}
                          />
                        )}
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
          </div>

          {draft.recurrence !==
            "none" && (
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-700">
                  Repeat every
                </span>

                <input
                  type="number"
                  min={1}
                  max={52}
                  value={
                    draft.recurrenceInterval
                  }
                  onChange={(
                    event,
                  ) =>
                    updateDraft(
                      "recurrenceInterval",
                      event.target
                        .value,
                    )
                  }
                  className="h-10 w-20 rounded-lg border border-slate-300 bg-white px-3 text-center text-sm font-semibold"
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
          )}

          {draft.recurrence ===
            "weekly" && (
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
                        onClick={() =>
                          toggleDay(
                            day.value,
                          )
                        }
                        className={`flex aspect-square min-h-10 items-center justify-center rounded-xl text-xs font-semibold transition ${
                          selected
                            ? "bg-slate-950 text-white"
                            : "border border-slate-200 bg-white text-slate-600"
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
          )}

          {draft.recurrence ===
            "monthly" && (
            <label>
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                Day of month
              </span>

              <input
                type="number"
                min={1}
                max={31}
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
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm"
              />

              <FieldError
                errors={
                  fieldErrors.dayOfMonth
                }
              />
            </label>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                <CalendarDays
                  size={16}
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
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
              />

              <FieldError
                errors={
                  fieldErrors.startsOn
                }
              />
            </label>

            <label>
              <span className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                <Clock3
                  size={16}
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
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                Duration
              </span>

              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={1440}
                  value={
                    draft.durationMinutes
                  }
                  onChange={(
                    event,
                  ) =>
                    updateDraft(
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

            {draft.recurrence !==
            "none" ? (
              <label>
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
                      event.target
                        .value,
                    )
                  }
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
                />

                <FieldError
                  errors={
                    fieldErrors.endsOn
                  }
                />
              </label>
            ) : (
              <div />
            )}
          </div>

          {isEditing && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
              Saving schedule
              changes regenerates
              ordinary future
              sessions. Cancelled,
              completed, open, or
              customized sessions
              are preserved.
            </div>
          )}
        </div>
      </section>

      <div className="sticky bottom-[76px] z-20 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:flex sm:justify-end sm:border-0 sm:bg-transparent sm:px-0">
        <div className="grid grid-cols-2 gap-3 sm:flex">
          <Link
            href={
              isEditing &&
              eventId
                ? `/events/${eventId}`
                : "/events"
            }
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
            ) : isEditing ? (
              <>
                <Save
                  size={18}
                />
                Save Changes
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
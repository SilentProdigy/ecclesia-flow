import Link from "next/link";

import {
  CalendarDays,
  ChevronRight,
  Clock3,
  MapPin,
  Repeat2,
} from "lucide-react";

import type {
  EventDirectoryItem,
} from "@/lib/events/queries";

import {
  getDayOfWeekShortLabel,
  getEventTypeLabel,
} from "@/lib/events/types";

interface EventCardProps {
  event: EventDirectoryItem;
}

function getStatusClasses(
  status: EventDirectoryItem["status"],
) {
  switch (status) {
    case "active":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";

    case "inactive":
      return "bg-amber-50 text-amber-700 ring-amber-200";

    case "archived":
      return "bg-slate-100 text-slate-600 ring-slate-200";
  }
}

function getStatusLabel(
  status: EventDirectoryItem["status"],
) {
  switch (status) {
    case "active":
      return "Active";

    case "inactive":
      return "Inactive";

    case "archived":
      return "Archived";
  }
}

function getRecurrenceText(
  event: EventDirectoryItem,
) {
  switch (event.recurrence) {
    case "none":
      return "One-time event";

    case "daily":
      if (
        event.recurrence_interval ===
        1
      ) {
        return "Daily";
      }

      return `Every ${event.recurrence_interval} days`;

    case "weekly": {
      const days =
        event.days_of_week
          .map(
            getDayOfWeekShortLabel,
          )
          .join(", ");

      const frequency =
        event.recurrence_interval ===
        1
          ? "Weekly"
          : `Every ${event.recurrence_interval} weeks`;

      return days
        ? `${frequency} · ${days}`
        : frequency;
    }

    case "monthly": {
      const frequency =
        event.recurrence_interval ===
        1
          ? "Monthly"
          : `Every ${event.recurrence_interval} months`;

      if (!event.day_of_month) {
        return frequency;
      }

      return `${frequency} · Day ${event.day_of_month}`;
    }
  }
}

function formatSessionDate(
  startsAt: string,
  timezone: string,
) {
  const date =
    new Date(startsAt);

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      timeZone: timezone,
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    },
  ).format(date);
}

export function EventCard({
  event,
}: EventCardProps) {
  const eventType =
    getEventTypeLabel(
      event.event_type,
    );

  const recurrence =
    getRecurrenceText(event);

  const nextSession =
    event.next_session;

  return (
    <Link
      href={`/events/${event.id}`}
      className="group block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          <CalendarDays
            size={21}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate font-semibold text-slate-950">
                {event.name}
              </h2>

              <p className="mt-0.5 text-sm text-slate-500">
                {eventType}
              </p>
            </div>

            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusClasses(
                event.status,
              )}`}
            >
              {getStatusLabel(
                event.status,
              )}
            </span>
          </div>

          {event.description ? (
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
              {
                event.description
              }
            </p>
          ) : null}

          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Repeat2
                size={16}
                className="shrink-0 text-slate-400"
              />

              <span>
                {recurrence}
              </span>
            </div>

            {event.location ? (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <MapPin
                  size={16}
                  className="shrink-0 text-slate-400"
                />

                <span className="truncate">
                  {
                    event.location
                  }
                </span>
              </div>
            ) : null}

            <div className="flex items-start gap-2 text-sm text-slate-600">
              <Clock3
                size={16}
                className="mt-0.5 shrink-0 text-slate-400"
              />

              {nextSession ? (
                <span>
                  Next:{" "}
                  {formatSessionDate(
                    nextSession.starts_at,
                    event.timezone,
                  )}
                </span>
              ) : (
                <span className="text-slate-500">
                  No upcoming
                  session
                </span>
              )}
            </div>
          </div>
        </div>

        <ChevronRight
          size={19}
          className="mt-2 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500"
        />
      </div>
    </Link>
  );
}
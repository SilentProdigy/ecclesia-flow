import Link from "next/link";

import {
  ArrowRight,
  CalendarDays,
  Clock3,
  MapPin,
} from "lucide-react";

import {
  SessionStatusBadge,
} from "@/components/events/session-status-badge";

import {
  getEventTypeLabel,
} from "@/lib/events/types";

import type {
  ScheduledEventSession,
} from "@/lib/events/schedule.server";

interface ScheduleSessionCardProps {
  session: ScheduledEventSession;
  showDate?: boolean;
  highlighted?: boolean;
}

function formatDate(
  startsAt: string,
  timezone: string,
) {
  return new Intl.DateTimeFormat(
    "en-PH",
    {
      timeZone: timezone,
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  ).format(
    new Date(startsAt),
  );
}

function formatTime(
  value: string,
  timezone: string,
) {
  return new Intl.DateTimeFormat(
    "en-PH",
    {
      timeZone: timezone,
      hour: "numeric",
      minute: "2-digit",
    },
  ).format(
    new Date(value),
  );
}

export function ScheduleSessionCard({
  session,
  showDate = false,
  highlighted = false,
}: ScheduleSessionCardProps) {
  const title =
    session.title_override ??
    session.event.name;

  const location =
    session.location_override ??
    session.event.location;

  const timezone =
    session.event.timezone;

  return (
    <Link
      href={`/events/${session.event.id}`}
      className={`group block rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md ${
        highlighted
          ? "border-slate-950 ring-1 ring-slate-950"
          : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            highlighted
              ? "bg-slate-950 text-white"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          <CalendarDays
            size={20}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {getEventTypeLabel(
                  session.event
                    .event_type,
                )}
              </p>

              <h3 className="mt-1 truncate font-semibold text-slate-950">
                {title}
              </h3>
            </div>

            <SessionStatusBadge
              status={
                session.status
              }
            />
          </div>

          <div className="mt-3 space-y-2">
            {showDate && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <CalendarDays
                  size={16}
                  className="shrink-0 text-slate-400"
                />

                <span>
                  {formatDate(
                    session.starts_at,
                    timezone,
                  )}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Clock3
                size={16}
                className="shrink-0 text-slate-400"
              />

              <span>
                {formatTime(
                  session.starts_at,
                  timezone,
                )}
                {" – "}
                {formatTime(
                  session.ends_at,
                  timezone,
                )}
              </span>
            </div>

            {location && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <MapPin
                  size={16}
                  className="shrink-0 text-slate-400"
                />

                <span className="truncate">
                  {location}
                </span>
              </div>
            )}
          </div>

          {session.notes && (
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">
              {session.notes}
            </p>
          )}

          <div className="mt-4 flex items-center justify-end">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 transition group-hover:text-slate-950">
              View Event
              <ArrowRight
                size={14}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
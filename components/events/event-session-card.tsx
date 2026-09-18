import {
  CalendarDays,
  Clock3,
  MapPin,
} from "lucide-react";

import {
  SessionStatusBadge,
} from "@/components/events/session-status-badge";

import type {
  EventSessionRecord,
} from "@/lib/events/types";

interface EventSessionCardProps {
  session: EventSessionRecord;
  eventName: string;
  eventLocation: string | null;
  timezone: string;
}

function formatSessionDate(
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

function formatSessionTime(
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

export function EventSessionCard({
  session,
  eventName,
  eventLocation,
  timezone,
}: EventSessionCardProps) {
  const title =
    session.title_override ??
    eventName;

  const location =
    session.location_override ??
    eventLocation;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-950">
            {title}
          </h3>

          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <CalendarDays
                size={16}
                className="shrink-0 text-slate-400"
              />

              <span>
                {formatSessionDate(
                  session.starts_at,
                  timezone,
                )}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Clock3
                size={16}
                className="shrink-0 text-slate-400"
              />

              <span>
                {formatSessionTime(
                  session.starts_at,
                  timezone,
                )}
                {" – "}
                {formatSessionTime(
                  session.ends_at,
                  timezone,
                )}
              </span>
            </div>

            {location ? (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <MapPin
                  size={16}
                  className="shrink-0 text-slate-400"
                />

                <span>
                  {location}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        <SessionStatusBadge
          status={
            session.status
          }
        />
      </div>

      {session.notes ? (
        <p className="mt-4 border-t border-slate-100 pt-3 text-sm leading-6 text-slate-500">
          {session.notes}
        </p>
      ) : null}
    </article>
  );
}
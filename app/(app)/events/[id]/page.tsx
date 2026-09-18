import Link from "next/link";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  Repeat2,
  Tag,
} from "lucide-react";

import {
  notFound,
} from "next/navigation";

import {
  EventManagementActions,
} from "@/components/events/event-management-actions";

import {
  EventSessionCard,
} from "@/components/events/event-session-card";

import {
  getCurrentUserRole,
  getEventDetail,
} from "@/lib/events/queries";

import {
  eventIdSchema,
} from "@/lib/events/validation";

import {
  getDayOfWeekLabel,
  getEventStatusLabel,
  getEventTypeLabel,
} from "@/lib/events/types";

import type {
  EventRecord,
} from "@/lib/events/types";

interface EventDetailPageProps {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    updated?: string;
    sessionUpdated?: string;
  }>;
}

function formatDate(
  date: string,
) {
  return new Intl.DateTimeFormat(
    "en-PH",
    {
      timeZone: "UTC",
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  ).format(
    new Date(
      `${date}T12:00:00Z`,
    ),
  );
}

function formatTime(
  value: string,
) {
  const [
    hourValue,
    minuteValue,
  ] = value.split(":");

  const hour =
    Number(hourValue);

  const minute =
    minuteValue ?? "00";

  const period =
    hour >= 12
      ? "PM"
      : "AM";

  const displayHour =
    hour % 12 || 12;

  return `${displayHour}:${minute} ${period}`;
}

function formatDuration(
  minutes: number,
) {
  const hours =
    Math.floor(
      minutes / 60,
    );

  const remaining =
    minutes % 60;

  if (
    hours > 0 &&
    remaining > 0
  ) {
    return `${hours} hr ${remaining} min`;
  }

  if (hours > 0) {
    return hours === 1
      ? "1 hour"
      : `${hours} hours`;
  }

  return `${remaining} min`;
}

function getRecurrenceText(
  event: EventRecord,
) {
  switch (event.recurrence) {
    case "none":
      return "Does not repeat";

    case "daily":
      return event.recurrence_interval ===
        1
        ? "Daily"
        : `Every ${event.recurrence_interval} days`;

    case "weekly": {
      const days =
        event.days_of_week
          .map(
            getDayOfWeekLabel,
          )
          .join(", ");

      const frequency =
        event.recurrence_interval ===
        1
          ? "Weekly"
          : `Every ${event.recurrence_interval} weeks`;

      return days
        ? `${frequency} on ${days}`
        : frequency;
    }

    case "monthly": {
      const frequency =
        event.recurrence_interval ===
        1
          ? "Monthly"
          : `Every ${event.recurrence_interval} months`;

      return event.day_of_month
        ? `${frequency} on day ${event.day_of_month}`
        : frequency;
    }
  }
}

function getStatusClasses(
  status: EventRecord["status"],
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

export default async function EventDetailPage({
  params,
  searchParams,
}: EventDetailPageProps) {
  const {
    id,
  } = await params;

  const query =
    await searchParams;

  const parsedId =
    eventIdSchema.safeParse(
      id,
    );

  if (!parsedId.success) {
    notFound();
  }

  const [
    detail,
    role,
  ] = await Promise.all([
    getEventDetail(
      parsedId.data,
    ),

    getCurrentUserRole(),
  ]);

  if (!detail) {
    notFound();
  }

  const {
    event,
    currentAndUpcomingSessions,
    recentSessions,
    totalSessions,
  } = detail;

  const isAdmin =
    role === "admin";

  const nextSession =
    currentAndUpcomingSessions.find(
      (session) =>
        session.status ===
          "scheduled" ||
        session.status ===
          "open",
    );

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 pb-28">
      <Link
        href="/events"
        className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950"
      >
        <ArrowLeft
          size={17}
        />
        Events
      </Link>

      {(query.updated ===
        "1" ||
        query.sessionUpdated ===
          "1") && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2
            size={20}
            className="mt-0.5 shrink-0 text-emerald-600"
          />

          <p className="text-sm font-medium text-emerald-800">
            {query.sessionUpdated ===
            "1"
              ? "Session updated successfully."
              : "Event updated successfully."}
          </p>
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-500">
              {getEventTypeLabel(
                event.event_type,
              )}
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
              {event.name}
            </h1>
          </div>

          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusClasses(
              event.status,
            )}`}
          >
            {getEventStatusLabel(
              event.status,
            )}
          </span>
        </div>

        {event.description && (
          <p className="mt-4 text-sm leading-6 text-slate-600">
            {event.description}
          </p>
        )}

        {isAdmin && (
          <div className="mt-5">
            <EventManagementActions
              eventId={
                event.id
              }
              status={
                event.status
              }
            />
          </div>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
            <Repeat2
              size={18}
              className="mt-0.5 shrink-0 text-slate-400"
            />

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Schedule
              </p>

              <p className="mt-1 text-sm font-medium text-slate-800">
                {getRecurrenceText(
                  event,
                )}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
            <Clock3
              size={18}
              className="mt-0.5 shrink-0 text-slate-400"
            />

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Time
              </p>

              <p className="mt-1 text-sm font-medium text-slate-800">
                {formatTime(
                  event.default_start_time,
                )}
                {" · "}
                {formatDuration(
                  event.duration_minutes,
                )}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
            <CalendarDays
              size={18}
              className="mt-0.5 shrink-0 text-slate-400"
            />

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Date range
              </p>

              <p className="mt-1 text-sm font-medium text-slate-800">
                {formatDate(
                  event.starts_on,
                )}

                {event.ends_on
                  ? ` – ${formatDate(
                      event.ends_on,
                    )}`
                  : event.recurrence ===
                      "none"
                    ? ""
                    : " – Ongoing"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
            {event.location ? (
              <MapPin
                size={18}
                className="mt-0.5 shrink-0 text-slate-400"
              />
            ) : (
              <Tag
                size={18}
                className="mt-0.5 shrink-0 text-slate-400"
              />
            )}

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {event.location
                  ? "Location"
                  : "Sessions"}
              </p>

              <p className="mt-1 text-sm font-medium text-slate-800">
                {event.location ??
                  `${totalSessions} generated sessions`}
              </p>
            </div>
          </div>
        </div>
      </section>

      {nextSession && (
        <section className="mt-5">
          <h2 className="mb-3 text-lg font-bold text-slate-950">
            Next session
          </h2>

          <EventSessionCard
            session={
              nextSession
            }
            eventName={
              event.name
            }
            eventLocation={
              event.location
            }
            timezone={
              event.timezone
            }
            manageHref={
              isAdmin
                ? `/events/${event.id}/sessions/${nextSession.id}/edit`
                : undefined
            }
          />
        </section>
      )}

      <section className="mt-7">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              Today & upcoming
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Scheduled sessions
              from today onward.
            </p>
          </div>

          <span className="text-xs font-medium text-slate-400">
            {
              currentAndUpcomingSessions.length
            }{" "}
            shown
          </span>
        </div>

        {currentAndUpcomingSessions.length >
        0 ? (
          <div className="space-y-3">
            {currentAndUpcomingSessions.map(
              (session) => (
                <EventSessionCard
                  key={
                    session.id
                  }
                  session={
                    session
                  }
                  eventName={
                    event.name
                  }
                  eventLocation={
                    event.location
                  }
                  timezone={
                    event.timezone
                  }
                  manageHref={
                    isAdmin
                      ? `/events/${event.id}/sessions/${session.id}/edit`
                      : undefined
                  }
                />
              ),
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center">
            <CalendarDays
              size={24}
              className="mx-auto text-slate-400"
            />

            <h3 className="mt-3 font-semibold text-slate-950">
              No upcoming sessions
            </h3>
          </div>
        )}
      </section>

      {recentSessions.length >
        0 && (
        <section className="mt-7">
          <div className="mb-3">
            <h2 className="text-lg font-bold text-slate-950">
              Recent sessions
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Previous sessions
              for this event.
            </p>
          </div>

          <div className="space-y-3">
            {recentSessions.map(
              (session) => (
                <EventSessionCard
                  key={
                    session.id
                  }
                  session={
                    session
                  }
                  eventName={
                    event.name
                  }
                  eventLocation={
                    event.location
                  }
                  timezone={
                    event.timezone
                  }
                  manageHref={
                    isAdmin
                      ? `/events/${event.id}/sessions/${session.id}/edit`
                      : undefined
                  }
                />
              ),
            )}
          </div>
        </section>
      )}

      <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Timezone
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {event.timezone}
            </p>
          </div>

          <div className="text-right">
            <p className="text-sm font-semibold text-slate-900">
              Total sessions
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {totalSessions}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
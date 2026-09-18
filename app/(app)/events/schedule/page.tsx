import Link from "next/link";

import {
  ArrowLeft,
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  CircleDot,
} from "lucide-react";

import {
  ScheduleSessionCard,
} from "@/components/events/schedule-session-card";

import {
  CHURCH_TIMEZONE,
  getOperationalEventSchedule,
} from "@/lib/events/schedule.server";

import type {
  ScheduledEventSession,
} from "@/lib/events/schedule.server";

function formatDateOnly(
  date: string,
  options: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat(
    "en-PH",
    {
      timeZone: "UTC",
      ...options,
    },
  ).format(
    new Date(
      `${date}T12:00:00Z`,
    ),
  );
}

function formatToday(
  date: string,
) {
  return formatDateOnly(
    date,
    {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    },
  );
}

function formatGroupDate(
  date: string,
) {
  return formatDateOnly(
    date,
    {
      weekday: "long",
      month: "short",
      day: "numeric",
    },
  );
}

function groupSessionsByDate(
  sessions: ScheduledEventSession[],
) {
  const groups =
    new Map<
      string,
      ScheduledEventSession[]
    >();

  for (
    const session
    of sessions
  ) {
    const existing =
      groups.get(
        session.session_date,
      );

    if (existing) {
      existing.push(
        session,
      );
    } else {
      groups.set(
        session.session_date,
        [session],
      );
    }
  }

  return Array.from(
    groups.entries(),
  );
}

export default async function EventSchedulePage() {
  const schedule =
    await getOperationalEventSchedule();

  const upcomingGroups =
    groupSessionsByDate(
      schedule.upcomingSessions,
    );

  const upcomingActiveCount =
    schedule.upcomingSessions.filter(
      (session) =>
        session.status ===
          "scheduled" ||
        session.status ===
          "open",
    ).length;

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

      <section className="mb-6">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <CalendarClock
              size={23}
            />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">
              Church Schedule
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              {formatToday(
                schedule.today,
              )}
            </p>
          </div>
        </div>
      </section>

      <section className="mb-7 grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <CalendarCheck2
              size={18}
            />
          </div>

          <p className="mt-3 text-xl font-bold text-slate-950">
            {
              schedule
                .todaySessions
                .length
            }
          </p>

          <p className="mt-0.5 text-xs font-medium text-slate-500">
            Today
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <CircleDot
              size={18}
            />
          </div>

          <p className="mt-3 text-xl font-bold text-slate-950">
            {
              schedule
                .openTodayCount
            }
          </p>

          <p className="mt-0.5 text-xs font-medium text-slate-500">
            Open
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <CalendarDays
              size={18}
            />
          </div>

          <p className="mt-3 text-xl font-bold text-slate-950">
            {
              upcomingActiveCount
            }
          </p>

          <p className="mt-0.5 text-xs font-medium text-slate-500">
            Upcoming
          </p>
        </div>
      </section>

      {schedule.nextSession && (
        <section className="mb-7">
          <div className="mb-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {schedule.nextSession
                .status === "open"
                ? "Happening Now"
                : "Next Service"}
            </p>

            <h2 className="mt-1 text-lg font-bold text-slate-950">
              {schedule.nextSession
                .status === "open"
                ? "Current session"
                : "Coming up next"}
            </h2>
          </div>

          <ScheduleSessionCard
            session={
              schedule.nextSession
            }
            showDate={
              schedule.nextSession
                .session_date !==
              schedule.today
            }
            highlighted
          />
        </section>
      )}

      <section className="mb-8">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              Today
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              All scheduled
              activities for
              today.
            </p>
          </div>

          {schedule.todaySessions
            .length > 0 && (
            <span className="text-xs font-semibold text-slate-400">
              {
                schedule
                  .todaySessions
                  .length
              }{" "}
              {schedule.todaySessions
                .length === 1
                ? "session"
                : "sessions"}
            </span>
          )}
        </div>

        {schedule.todaySessions
          .length > 0 ? (
          <div className="space-y-3">
            {schedule.todaySessions.map(
              (session) => (
                <ScheduleSessionCard
                  key={
                    session.id
                  }
                  session={
                    session
                  }
                />
              ),
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-9 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
              <CalendarCheck2
                size={23}
                className="text-slate-500"
              />
            </div>

            <h3 className="mt-4 font-semibold text-slate-950">
              No sessions today
            </h3>

            <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">
              There are no active
              church events
              scheduled for today.
            </p>
          </div>
        )}
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-950">
            Upcoming
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            The next 30 days of
            scheduled church
            activities.
          </p>
        </div>

        {upcomingGroups.length >
        0 ? (
          <div className="space-y-7">
            {upcomingGroups.map(
              ([
                date,
                sessions,
              ]) => (
                <section
                  key={date}
                >
                  <div className="mb-2 flex items-center gap-3">
                    <p className="shrink-0 text-sm font-bold text-slate-700">
                      {formatGroupDate(
                        date,
                      )}
                    </p>

                    <div className="h-px flex-1 bg-slate-200" />
                  </div>

                  <div className="space-y-3">
                    {sessions.map(
                      (
                        session,
                      ) => (
                        <ScheduleSessionCard
                          key={
                            session.id
                          }
                          session={
                            session
                          }
                        />
                      ),
                    )}
                  </div>
                </section>
              ),
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-9 text-center">
            <CalendarDays
              size={24}
              className="mx-auto text-slate-400"
            />

            <h3 className="mt-3 font-semibold text-slate-950">
              No upcoming
              sessions
            </h3>

            <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">
              There are no active
              event sessions in
              the next 30 days.
            </p>
          </div>
        )}
      </section>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Schedule window
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Today through{" "}
              {formatGroupDate(
                schedule.endDate,
              )}
            </p>
          </div>

          <div className="text-right">
            <p className="text-sm font-semibold text-slate-900">
              {
                schedule
                  .totalInWindow
              }
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Total sessions
            </p>
          </div>
        </div>

        <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-400">
          Times are shown using{" "}
          {CHURCH_TIMEZONE}.
        </p>
      </div>
    </div>
  );
}
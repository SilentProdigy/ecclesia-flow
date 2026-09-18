import Link from "next/link";

import {
  CalendarDays,
  Radio,
} from "lucide-react";

import {
  getAttendanceSessionDashboard,
} from "@/lib/attendance/attendance-sessions.server";

import {
  AttendanceSessionCard,
} from "@/components/attendance/attendance-session-card";

interface AttendancePageProps {
  searchParams: Promise<{
    error?: string;
  }>;
}

export default async function AttendancePage({
  searchParams,
}: AttendancePageProps) {
  const params =
    await searchParams;

  const dashboard =
    await getAttendanceSessionDashboard();

  const noSessions =
    dashboard.openSessions
      .length === 0 &&
    dashboard.todaySessions
      .length === 0 &&
    dashboard.upcomingSessions
      .length === 0;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <section className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            Attendance
          </h1>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Select an event session
            to start or continue
            attendance.
          </p>
        </div>

        <Link
          href="/events"
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Events
        </Link>
      </section>

      {params.error && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Unable to open that
          attendance session. Please
          try again.
        </div>
      )}

      {dashboard.openSessions
        .length > 0 && (
        <section className="mb-7">
          <div className="mb-3 flex items-center gap-2">
            <Radio
              size={18}
              className="text-emerald-600"
            />

            <h2 className="font-bold text-slate-950">
              Open Attendance
            </h2>
          </div>

          <div className="space-y-3">
            {dashboard.openSessions.map(
              (session) => (
                <AttendanceSessionCard
                  key={
                    session.id
                  }
                  session={
                    session
                  }
                  isToday={
                    session.session_date ===
                    dashboard.date
                  }
                />
              )
            )}
          </div>
        </section>
      )}

      {dashboard.todaySessions
        .length > 0 && (
        <section className="mb-7">
          <div className="mb-3 flex items-center gap-2">
            <CalendarDays
              size={18}
              className="text-slate-500"
            />

            <h2 className="font-bold text-slate-950">
              Today
            </h2>
          </div>

          <div className="space-y-3">
            {dashboard.todaySessions.map(
              (session) => (
                <AttendanceSessionCard
                  key={
                    session.id
                  }
                  session={
                    session
                  }
                  isToday
                />
              )
            )}
          </div>
        </section>
      )}

      {dashboard.upcomingSessions
        .length > 0 && (
        <section>
          <h2 className="mb-3 font-bold text-slate-950">
            Upcoming Sessions
          </h2>

          <div className="space-y-3">
            {dashboard.upcomingSessions.map(
              (session) => (
                <AttendanceSessionCard
                  key={
                    session.id
                  }
                  session={
                    session
                  }
                />
              )
            )}
          </div>
        </section>
      )}

      {noSessions && (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
            <CalendarDays
              size={27}
              className="text-slate-500"
            />
          </div>

          <h2 className="mt-4 font-bold text-slate-950">
            No sessions available
          </h2>

          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
            Create or activate an
            event session before
            starting attendance.
          </p>

          <Link
            href="/events"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white"
          >
            Manage Events
          </Link>
        </section>
      )}
    </div>
  );
}
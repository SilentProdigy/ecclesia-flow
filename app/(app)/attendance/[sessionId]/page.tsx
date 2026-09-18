import Link from "next/link";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  MonitorSmartphone,
  Play,
  UsersRound,
} from "lucide-react";

import {
  notFound,
} from "next/navigation";

import {
  formatAttendanceSessionDate,
  formatAttendanceSessionTime,
  getAttendanceSessionLocation,
  getAttendanceSessionTitle,
} from "@/lib/attendance";

import {
  getAttendanceSession,
} from "@/lib/attendance/attendance-sessions.server";

import {
  getAttendanceSessionSummary,
} from "@/lib/attendance/attendance-summary.server";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  AttendanceSessionStatus,
} from "@/components/attendance/attendance-session-status";

import {
  AttendanceWorkspace,
} from "@/components/attendance/attendance-workspace";

import {
  AttendanceRoster,
} from "@/components/attendance/attendance-roster";

import {
  AttendanceSummary,
} from "@/components/attendance/attendance-summary";

import {
  CompleteAttendancePanel,
} from "@/components/attendance/complete-attendance-panel";

import {
  ReopenAttendancePanel,
} from "@/components/attendance/reopen-attendance-panel";

import {
  openAttendanceSessionAction,
} from "../actions";

interface AttendanceSessionPageProps {
  params: Promise<{
    sessionId: string;
  }>;

  searchParams: Promise<{
    error?: string;
  }>;
}

export default async function AttendanceSessionPage({
  params,
  searchParams,
}: AttendanceSessionPageProps) {
  const {
    sessionId,
  } = await params;

  const query =
    await searchParams;

  const session =
    await getAttendanceSession(
      sessionId
    );

  if (!session) {
    notFound();
  }

  const summary =
    await getAttendanceSessionSummary(
      session.id
    );

  const title =
    getAttendanceSessionTitle(
      session
    );

  const location =
    getAttendanceSessionLocation(
      session
    );

  const supabase =
    await createClient();

  const {
    data: claimsData,
  } =
    await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub;

  let canReopen =
    false;

  if (userId) {
    const {
      data: profile,
    } = await supabase
      .from("profiles")
      .select(
        "role, is_active"
      )
      .eq(
        "id",
        userId
      )
      .maybeSingle();

    canReopen =
      Boolean(
        profile?.is_active &&
          profile.role ===
            "admin"
      );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <Link
        href="/attendance"
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-950"
      >
        <ArrowLeft
          size={17}
        />

        Attendance
      </Link>

      {query.error && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {getErrorMessage(
            query.error
          )}
        </div>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <AttendanceSessionStatus
              status={
                session.status
              }
            />

            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
              {title}
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700">
            <UsersRound
              size={17}
            />

            {
              session.attendance_count
            }
          </div>
        </div>

        <div className="mt-5 space-y-2.5 border-t border-slate-100 pt-4">
          <DetailRow
            icon={
              <CalendarDays
                size={17}
              />
            }
          >
            {formatAttendanceSessionDate(
              session.session_date
            )}
          </DetailRow>

          <DetailRow
            icon={
              <Clock3
                size={17}
              />
            }
          >
            {formatAttendanceSessionTime(
              session
            )}
          </DetailRow>

          {location && (
            <DetailRow
              icon={
                <MapPin
                  size={17}
                />
              }
            >
              {location}
            </DetailRow>
          )}
        </div>
      </section>

      {(session.status ===
        "open" ||
        session.status ===
          "completed") && (
        <AttendanceSummary
          sessionId={
            session.id
          }
          initialSummary={
            summary
          }
          mode={
            session.status ===
            "open"
              ? "live"
              : "final"
          }
        />
      )}

      {session.status ===
        "scheduled" && (
        <section className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-bold text-slate-950">
            Ready to take
            attendance?
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Starting attendance
            will open this session
            and allow staff to
            check members in.
          </p>

          <form
            action={
              openAttendanceSessionAction
            }
            className="mt-5"
          >
            <input
              type="hidden"
              name="session_id"
              value={
                session.id
              }
            />

            <button
              type="submit"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Play
                size={18}
                fill="currentColor"
              />

              Start Attendance
            </button>
          </form>
        </section>
      )}

      {session.status ===
        "open" && (
        <>
          <Link
            href={`/kiosk/${session.id}`}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <MonitorSmartphone
              size={18}
            />

            Enter Kiosk Mode
          </Link>

          <div className="mt-5">
            <AttendanceWorkspace
              sessionId={
                session.id
              }
              timezone={
                session.event
                  .timezone
              }
            />
          </div>

          <CompleteAttendancePanel
            sessionId={
              session.id
            }
            attendanceCount={
              summary.total
            }
          />
        </>
      )}

      {session.status ===
        "completed" && (
        <>
          <section className="mt-5 rounded-3xl border border-blue-200 bg-blue-50 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/70">
                <CheckCircle2
                  size={21}
                  className="text-blue-700"
                />
              </div>

              <div>
                <h2 className="font-bold text-blue-950">
                  Attendance Completed
                </h2>

                <p className="mt-1 text-sm leading-6 text-blue-700">
                  Check-in is now
                  closed. The final
                  attendance roster
                  is available below
                  for review.
                </p>
              </div>
            </div>
          </section>

          <AttendanceRoster
            sessionId={
              session.id
            }
            timezone={
              session.event
                .timezone
            }
            mode="readonly"
          />

          {canReopen && (
            <ReopenAttendancePanel
              sessionId={
                session.id
              }
              attendanceCount={
                summary.total
              }
            />
          )}
        </>
      )}

      {session.status ===
        "cancelled" && (
        <section className="mt-5 rounded-2xl border border-slate-200 bg-slate-100 p-5">
          <h2 className="font-bold text-slate-900">
            Session Cancelled
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Attendance cannot be
            started for a cancelled
            session.
          </p>
        </section>
      )}
    </div>
  );
}

function DetailRow({
  icon,
  children,
}: {
  icon:
    React.ReactNode;

  children:
    React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 text-sm text-slate-600">
      <span className="mt-0.5 shrink-0 text-slate-400">
        {icon}
      </span>

      <span>
        {children}
      </span>
    </div>
  );
}

function getErrorMessage(
  error: string
) {
  switch (error) {
    case "cannot-open":
      return "This session can no longer be opened for attendance.";

    case "session-unavailable":
      return "This session is unavailable.";

    case "start-failed":
      return "Attendance could not be started. Please try again.";

    default:
      return "Something went wrong. Please try again.";
  }
}
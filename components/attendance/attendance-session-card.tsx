import Link from "next/link";

import {
  CalendarDays,
  ChevronRight,
  Clock3,
  MapPin,
  Repeat2,
  UsersRound,
} from "lucide-react";

import {
  formatAttendanceSessionDate,
  formatAttendanceSessionTime,
  getAttendanceSessionLocation,
  getAttendanceSessionTitle,
  getEventRecurrenceLabel,
  type AttendanceSessionListItem,
} from "@/lib/attendance";

import {
  AttendanceSessionStatus,
} from "./attendance-session-status";

interface AttendanceSessionCardProps {
  session:
    AttendanceSessionListItem;

  isToday?: boolean;
}

export function AttendanceSessionCard({
  session,
  isToday = false,
}: AttendanceSessionCardProps) {
  const title =
    getAttendanceSessionTitle(
      session
    );

  const location =
    getAttendanceSessionLocation(
      session
    );

  const recurrenceLabel =
    getEventRecurrenceLabel({
      recurrence:
        session.event
          .recurrence,

      recurrenceInterval:
        session.event
          .recurrence_interval,

      daysOfWeek:
        session.event
          .days_of_week,

      dayOfMonth:
        session.event
          .day_of_month,
    });

  return (
    <Link
      href={`/attendance/${session.id}`}
      className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {isToday && (
              <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[11px] font-semibold text-white">
                Today
              </span>
            )}

            <AttendanceSessionStatus
              status={
                session.status
              }
            />
          </div>

          <h3 className="mt-3 text-base font-bold text-slate-950">
            {title}
          </h3>

          {recurrenceLabel && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700">
              <Repeat2
                size={13}
              />

              {recurrenceLabel}
            </div>
          )}
        </div>

        <ChevronRight
          size={19}
          className="mt-1 shrink-0 text-slate-300"
        />
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <CalendarDays
            size={15}
          />

          <span>
            {formatAttendanceSessionDate(
              session.session_date
            )}
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Clock3
            size={15}
          />

          <span>
            {formatAttendanceSessionTime(
              session
            )}
          </span>
        </div>

        {location && (
          <div className="flex items-start gap-2 text-sm text-slate-500">
            <MapPin
              size={15}
              className="mt-0.5 shrink-0"
            />

            <span>
              {location}
            </span>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 text-xs font-medium text-slate-500">
        <UsersRound
          size={15}
        />

        <span>
          {session.attendance_count ===
          1
            ? "1 check-in"
            : `${session.attendance_count} check-ins`}
        </span>
      </div>
    </Link>
  );
}
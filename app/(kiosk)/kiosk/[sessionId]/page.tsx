import {
  notFound,
  redirect,
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
  KioskModeShell,
} from "@/components/attendance/kiosk-mode-shell";

interface KioskPageProps {
  params: Promise<{
    sessionId: string;
  }>;
}

export default async function KioskPage({
  params,
}: KioskPageProps) {
  const {
    sessionId,
  } = await params;

  const session =
    await getAttendanceSession(
      sessionId
    );

  if (!session) {
    notFound();
  }

  if (
    session.status !==
    "open"
  ) {
    redirect(
      `/attendance/${session.id}`
    );
  }

  const title =
    getAttendanceSessionTitle(
      session
    );

  const location =
    getAttendanceSessionLocation(
      session
    );

  return (
    <KioskModeShell
      sessionId={
        session.id
      }
      title={
        title
      }
      dateLabel={
        formatAttendanceSessionDate(
          session.session_date
        )
      }
      timeLabel={
        formatAttendanceSessionTime(
          session
        )
      }
      location={
        location
      }
      timezone={
        session.event
          .timezone
      }
      attendanceCount={
        session.attendance_count
      }
    />
  );
}
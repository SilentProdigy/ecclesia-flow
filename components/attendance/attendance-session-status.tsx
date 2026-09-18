import {
  CheckCircle2,
  CircleOff,
  Clock3,
  Radio,
} from "lucide-react";

import {
  getAttendanceSessionStatusLabel,
  type AttendanceSessionStatus,
} from "@/lib/attendance";

interface AttendanceSessionStatusProps {
  status:
    AttendanceSessionStatus;
}

export function AttendanceSessionStatus({
  status,
}: AttendanceSessionStatusProps) {
  if (status === "open") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        <Radio size={13} />
        Open
      </span>
    );
  }

  if (
    status === "completed"
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
        <CheckCircle2
          size={13}
        />
        Completed
      </span>
    );
  }

  if (
    status === "cancelled"
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
        <CircleOff
          size={13}
        />
        Cancelled
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
      <Clock3 size={13} />

      {getAttendanceSessionStatusLabel(
        status
      )}
    </span>
  );
}
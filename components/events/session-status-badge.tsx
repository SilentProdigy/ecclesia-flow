import {
  getSessionStatusLabel,
} from "@/lib/events/types";

import type {
  EventSessionStatus,
} from "@/lib/events/types";

interface SessionStatusBadgeProps {
  status: EventSessionStatus;
}

function getStatusClasses(
  status: EventSessionStatus,
) {
  switch (status) {
    case "scheduled":
      return "bg-slate-100 text-slate-700 ring-slate-200";

    case "open":
      return "bg-blue-50 text-blue-700 ring-blue-200";

    case "completed":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";

    case "cancelled":
      return "bg-red-50 text-red-700 ring-red-200";
  }
}

export function SessionStatusBadge({
  status,
}: SessionStatusBadgeProps) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusClasses(
        status,
      )}`}
    >
      {getSessionStatusLabel(
        status,
      )}
    </span>
  );
}
import type {
  AttendanceSessionListItem,
  AttendanceSessionStatus,
  EventRecurrence,
} from "./attendance-session-types";

export const ATTENDANCE_TIMEZONE =
  "Asia/Manila";

const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function getDateKeyInTimeZone(
  date = new Date(),
  timeZone = ATTENDANCE_TIMEZONE
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).formatToParts(date);

  const year =
    parts.find(
      (part) =>
        part.type === "year"
    )?.value;

  const month =
    parts.find(
      (part) =>
        part.type === "month"
    )?.value;

  const day =
    parts.find(
      (part) =>
        part.type === "day"
    )?.value;

  return `${year}-${month}-${day}`;
}

export function addDaysToDateKey(
  dateKey: string,
  days: number
) {
  const [
    year,
    month,
    day,
  ] = dateKey
    .split("-")
    .map(Number);

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );

  date.setUTCDate(
    date.getUTCDate() + days
  );

  return date
    .toISOString()
    .slice(0, 10);
}

export function getAttendanceSessionTitle(
  session:
    AttendanceSessionListItem
) {
  return (
    session.title_override ??
    session.event.name
  );
}

export function getAttendanceSessionLocation(
  session:
    AttendanceSessionListItem
) {
  return (
    session.location_override ??
    session.event.location
  );
}

export function formatAttendanceSessionDate(
  dateValue: string
) {
  const [
    year,
    month,
    day,
  ] = dateValue
    .split("-")
    .map(Number);

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }
  ).format(date);
}

export function formatAttendanceSessionTime(
  session:
    AttendanceSessionListItem
) {
  const timeZone =
    session.event.timezone ||
    ATTENDANCE_TIMEZONE;

  const formatter =
    new Intl.DateTimeFormat(
      "en-PH",
      {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone,
      }
    );

  return `${formatter.format(
    new Date(
      session.starts_at
    )
  )} – ${formatter.format(
    new Date(
      session.ends_at
    )
  )}`;
}

export function getAttendanceSessionStatusLabel(
  status:
    AttendanceSessionStatus
) {
  switch (status) {
    case "scheduled":
      return "Scheduled";

    case "open":
      return "Open";

    case "completed":
      return "Completed";

    case "cancelled":
      return "Cancelled";
  }
}

export function getEventRecurrenceLabel({
  recurrence,
  recurrenceInterval,
  daysOfWeek,
  dayOfMonth,
}: {
  recurrence:
    EventRecurrence;

  recurrenceInterval:
    number;

  daysOfWeek:
    number[];

  dayOfMonth:
    number | null;
}) {
  if (recurrence === "none") {
    return null;
  }

  if (recurrence === "daily") {
    if (
      recurrenceInterval === 1
    ) {
      return "Every day";
    }

    return `Every ${recurrenceInterval} days`;
  }

  if (recurrence === "weekly") {
    const intervalLabel =
      recurrenceInterval === 1
        ? "Every week"
        : `Every ${recurrenceInterval} weeks`;

    const validDays =
      daysOfWeek
        .map(
          (day) =>
            WEEKDAY_LABELS[
              day
            ]
        )
        .filter(
          (
            day
          ): day is string =>
            Boolean(day)
        );

    if (
      validDays.length === 0
    ) {
      return intervalLabel;
    }

    return `${intervalLabel} • ${validDays.join(
      ", "
    )}`;
  }

  const intervalLabel =
    recurrenceInterval === 1
      ? "Every month"
      : `Every ${recurrenceInterval} months`;

  if (!dayOfMonth) {
    return intervalLabel;
  }

  return `${intervalLabel} • Day ${dayOfMonth}`;
}
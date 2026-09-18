import type {
  EventRecurrence,
  EventSessionStatus,
} from "@/lib/events/types";

/**
 * Number of milliseconds in one day.
 *
 * Used only for UTC date-only calculations.
 */
const DAY_IN_MS =
  24 * 60 * 60 * 1000;

/**
 * Safety limit.
 *
 * ChurchFlow should never need to generate
 * an unbounded number of sessions in one call.
 *
 * 36,600 days is roughly 100 years.
 */
const MAX_GENERATION_RANGE_DAYS =
  36_600;

/**
 * Default number of days generated when
 * initially creating a recurring event.
 *
 * The server action can override this later.
 */
export const DEFAULT_SESSION_GENERATION_DAYS =
  90;

/**
 * Minimum schedule information required
 * by the recurrence engine.
 *
 * EventFormData from validation.ts is
 * structurally compatible with this type.
 */
export interface RecurrenceEventInput {
  recurrence: EventRecurrence;

  recurrenceInterval: number;

  daysOfWeek: number[];

  dayOfMonth: number | null;

  startsOn: string;

  endsOn: string | null;

  defaultStartTime: string;

  durationMinutes: number;

  timezone: string;
}

/**
 * Date range in which ChurchFlow should
 * generate physical event sessions.
 *
 * Dates use:
 *
 * YYYY-MM-DD
 */
export interface SessionGenerationRange {
  startDate: string;
  endDate: string;
}

/**
 * A generated event session before
 * insertion into Supabase.
 *
 * These use the application/domain naming
 * convention. The server action will later
 * map them to:
 *
 * session_date
 * starts_at
 * ends_at
 * status
 */
export interface GeneratedEventSession {
  sessionDate: string;

  startsAt: string;

  endsAt: string;

  status: EventSessionStatus;
}

interface DateParts {
  year: number;
  month: number;
  day: number;
}

interface TimeParts {
  hour: number;
  minute: number;
  second: number;
}

interface ZonedDateTimeParts
  extends DateParts,
    TimeParts {}

/**
 * Date format accepted by the
 * recurrence engine.
 */
const DATE_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Time formats accepted:
 *
 * HH:mm
 * HH:mm:ss
 */
const TIME_PATTERN =
  /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

/**
 * Cache timezone formatters.
 *
 * Session generation can process many dates,
 * so recreating Intl.DateTimeFormat for every
 * generated session is unnecessary.
 */
const timezoneFormatterCache =
  new Map<
    string,
    Intl.DateTimeFormat
  >();

/**
 * Parse and validate a YYYY-MM-DD string.
 */
function parseDateString(
  value: string,
): DateParts {
  const match =
    value.match(DATE_PATTERN);

  if (!match) {
    throw new Error(
      `Invalid date "${value}". Expected YYYY-MM-DD.`,
    );
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day,
    ),
  );

  const isValid =
    date.getUTCFullYear() ===
      year &&
    date.getUTCMonth() ===
      month - 1 &&
    date.getUTCDate() ===
      day;

  if (!isValid) {
    throw new Error(
      `Invalid calendar date "${value}".`,
    );
  }

  return {
    year,
    month,
    day,
  };
}

/**
 * Parse HH:mm or HH:mm:ss.
 */
function parseTimeString(
  value: string,
): TimeParts {
  const match =
    value.match(TIME_PATTERN);

  if (!match) {
    throw new Error(
      `Invalid time "${value}". Expected HH:mm or HH:mm:ss.`,
    );
  }

  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
    second:
      match[3] === undefined
        ? 0
        : Number(match[3]),
  };
}

/**
 * Format date parts back into
 * YYYY-MM-DD.
 */
function formatDateParts(
  parts: DateParts,
): string {
  const year = String(
    parts.year,
  ).padStart(4, "0");

  const month = String(
    parts.month,
  ).padStart(2, "0");

  const day = String(
    parts.day,
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * Convert a date-only value into a UTC Date.
 *
 * This is intentionally UTC-based so
 * calculations do not depend on the timezone
 * of the server running ChurchFlow.
 */
function dateStringToUtcDate(
  dateString: string,
): Date {
  const {
    year,
    month,
    day,
  } = parseDateString(
    dateString,
  );

  return new Date(
    Date.UTC(
      year,
      month - 1,
      day,
    ),
  );
}

/**
 * Add calendar days to YYYY-MM-DD.
 */
export function addDaysToDate(
  dateString: string,
  days: number,
): string {
  if (!Number.isInteger(days)) {
    throw new Error(
      "Days must be a whole number.",
    );
  }

  const date =
    dateStringToUtcDate(
      dateString,
    );

  date.setUTCDate(
    date.getUTCDate() + days,
  );

  return formatDateParts({
    year:
      date.getUTCFullYear(),

    month:
      date.getUTCMonth() + 1,

    day:
      date.getUTCDate(),
  });
}

/**
 * Number of calendar days from
 * startDate to endDate.
 *
 * Examples:
 *
 * 2026-09-20 -> 2026-09-20 = 0
 * 2026-09-20 -> 2026-09-21 = 1
 */
export function differenceInCalendarDays(
  startDate: string,
  endDate: string,
): number {
  const start =
    dateStringToUtcDate(
      startDate,
    ).getTime();

  const end =
    dateStringToUtcDate(
      endDate,
    ).getTime();

  return Math.round(
    (end - start) /
      DAY_IN_MS,
  );
}

/**
 * Return Sunday for the week containing
 * the provided date.
 *
 * ChurchFlow follows the database
 * convention:
 *
 * 0 = Sunday
 * 1 = Monday
 * ...
 * 6 = Saturday
 */
function getSundayOfWeek(
  dateString: string,
): string {
  const date =
    dateStringToUtcDate(
      dateString,
    );

  const dayOfWeek =
    date.getUTCDay();

  return addDaysToDate(
    dateString,
    -dayOfWeek,
  );
}

/**
 * Return the day of week using:
 *
 * 0 = Sunday
 * ...
 * 6 = Saturday
 */
function getDayOfWeek(
  dateString: string,
): number {
  return dateStringToUtcDate(
    dateString,
  ).getUTCDay();
}

/**
 * Calculate how many calendar months
 * separate two dates.
 *
 * Only the year/month portions matter.
 */
function differenceInMonths(
  startDate: string,
  endDate: string,
): number {
  const start =
    parseDateString(
      startDate,
    );

  const end =
    parseDateString(
      endDate,
    );

  return (
    (end.year - start.year) *
      12 +
    (end.month - start.month)
  );
}

/**
 * Compare ISO date-only strings.
 *
 * YYYY-MM-DD values are lexicographically
 * sortable.
 */
function isDateBefore(
  left: string,
  right: string,
): boolean {
  return left < right;
}

function isDateAfter(
  left: string,
  right: string,
): boolean {
  return left > right;
}

function maxDate(
  left: string,
  right: string,
): string {
  return isDateAfter(
    left,
    right,
  )
    ? left
    : right;
}

function minDate(
  left: string,
  right: string,
): string {
  return isDateBefore(
    left,
    right,
  )
    ? left
    : right;
}

/**
 * Check whether a timezone is supported
 * by the current JavaScript runtime.
 */
function assertValidTimezone(
  timezone: string,
): void {
  try {
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone: timezone,
      },
    ).format();
  } catch {
    throw new Error(
      `Invalid timezone "${timezone}".`,
    );
  }
}

/**
 * Get or create a formatter for an
 * IANA timezone.
 *
 * Example:
 *
 * Asia/Manila
 */
function getTimezoneFormatter(
  timezone: string,
): Intl.DateTimeFormat {
  const cached =
    timezoneFormatterCache.get(
      timezone,
    );

  if (cached) {
    return cached;
  }

  const formatter =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone: timezone,

        year: "numeric",
        month: "2-digit",
        day: "2-digit",

        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",

        hourCycle: "h23",
      },
    );

  timezoneFormatterCache.set(
    timezone,
    formatter,
  );

  return formatter;
}

/**
 * Get the calendar date/time that a UTC
 * Date represents inside a specific
 * IANA timezone.
 */
function getZonedDateTimeParts(
  date: Date,
  timezone: string,
): ZonedDateTimeParts {
  const formatter =
    getTimezoneFormatter(
      timezone,
    );

  const parts =
    formatter.formatToParts(
      date,
    );

  const values: Record<
    string,
    string
  > = {};

  for (const part of parts) {
    if (
      part.type ===
      "literal"
    ) {
      continue;
    }

    values[part.type] =
      part.value;
  }

  return {
    year: Number(
      values.year,
    ),

    month: Number(
      values.month,
    ),

    day: Number(
      values.day,
    ),

    hour: Number(
      values.hour,
    ),

    minute: Number(
      values.minute,
    ),

    second: Number(
      values.second,
    ),
  };
}

/**
 * Convert a local date/time in an IANA
 * timezone into a real UTC Date.
 *
 * Example:
 *
 * Local:
 * 2026-09-20
 * 09:00
 * Asia/Manila
 *
 * UTC:
 * 2026-09-20T01:00:00.000Z
 *
 * This avoids relying on the timezone of
 * the server itself.
 */
export function zonedDateTimeToUtc(
  dateString: string,
  timeString: string,
  timezone: string,
): Date {
  assertValidTimezone(
    timezone,
  );

  const dateParts =
    parseDateString(
      dateString,
    );

  const timeParts =
    parseTimeString(
      timeString,
    );

  const targetUtcLike =
    Date.UTC(
      dateParts.year,
      dateParts.month - 1,
      dateParts.day,

      timeParts.hour,
      timeParts.minute,
      timeParts.second,
    );

  /**
   * Begin by pretending the local
   * date/time is UTC.
   *
   * We then repeatedly compare that
   * timestamp with how it appears in the
   * requested timezone and correct it.
   */
  let timestamp =
    targetUtcLike;

  for (
    let iteration = 0;
    iteration < 4;
    iteration += 1
  ) {
    const represented =
      getZonedDateTimeParts(
        new Date(timestamp),
        timezone,
      );

    const representedUtcLike =
      Date.UTC(
        represented.year,
        represented.month - 1,
        represented.day,

        represented.hour,
        represented.minute,
        represented.second,
      );

    const difference =
      targetUtcLike -
      representedUtcLike;

    if (difference === 0) {
      break;
    }

    timestamp += difference;
  }

  const result =
    new Date(timestamp);

  /**
   * Verify the conversion.
   *
   * This also catches nonexistent local
   * times caused by DST transitions in
   * timezones that observe daylight
   * saving time.
   */
  const verified =
    getZonedDateTimeParts(
      result,
      timezone,
    );

  const matches =
    verified.year ===
      dateParts.year &&
    verified.month ===
      dateParts.month &&
    verified.day ===
      dateParts.day &&
    verified.hour ===
      timeParts.hour &&
    verified.minute ===
      timeParts.minute &&
    verified.second ===
      timeParts.second;

  if (!matches) {
    throw new Error(
      [
        "Unable to create session at",
        `${dateString} ${timeString}`,
        `in timezone "${timezone}".`,
        "The local time may not exist because of a timezone transition.",
      ].join(" "),
    );
  }

  return result;
}

/**
 * Validate recurrence-specific values.
 *
 * validation.ts normally catches these
 * before the recurrence engine is called,
 * but the engine protects itself because
 * it may also be used with database data.
 */
function assertValidRecurrenceInput(
  event: RecurrenceEventInput,
): void {
  parseDateString(
    event.startsOn,
  );

  if (event.endsOn) {
    parseDateString(
      event.endsOn,
    );

    if (
      isDateBefore(
        event.endsOn,
        event.startsOn,
      )
    ) {
      throw new Error(
        "Event end date cannot be before its start date.",
      );
    }
  }

  parseTimeString(
    event.defaultStartTime,
  );

  assertValidTimezone(
    event.timezone,
  );

  if (
    !Number.isInteger(
      event.recurrenceInterval,
    ) ||
    event.recurrenceInterval <
      1
  ) {
    throw new Error(
      "Recurrence interval must be a positive whole number.",
    );
  }

  if (
    !Number.isInteger(
      event.durationMinutes,
    ) ||
    event.durationMinutes < 1
  ) {
    throw new Error(
      "Event duration must be a positive whole number.",
    );
  }

  const uniqueDays =
    new Set(
      event.daysOfWeek,
    );

  if (
    uniqueDays.size !==
    event.daysOfWeek.length
  ) {
    throw new Error(
      "daysOfWeek cannot contain duplicate values.",
    );
  }

  for (
    const day
    of event.daysOfWeek
  ) {
    if (
      !Number.isInteger(day) ||
      day < 0 ||
      day > 6
    ) {
      throw new Error(
        "Each daysOfWeek value must be an integer between 0 and 6.",
      );
    }
  }

  if (
    event.recurrence ===
      "weekly" &&
    event.daysOfWeek.length ===
      0
  ) {
    throw new Error(
      "Weekly events require at least one day of week.",
    );
  }

  if (
    event.recurrence ===
    "monthly"
  ) {
    if (
      event.dayOfMonth ===
      null
    ) {
      throw new Error(
        "Monthly events require a day of month.",
      );
    }

    if (
      !Number.isInteger(
        event.dayOfMonth,
      ) ||
      event.dayOfMonth < 1 ||
      event.dayOfMonth > 31
    ) {
      throw new Error(
        "Monthly day of month must be between 1 and 31.",
      );
    }
  }
}

/**
 * Determine whether a particular calendar
 * date belongs to an event's recurrence.
 */
function shouldGenerateSessionOnDate(
  event: RecurrenceEventInput,
  date: string,
): boolean {
  /**
   * Never generate before the event's
   * official start date.
   */
  if (
    isDateBefore(
      date,
      event.startsOn,
    )
  ) {
    return false;
  }

  /**
   * Never generate after the event's
   * configured end date.
   */
  if (
    event.endsOn &&
    isDateAfter(
      date,
      event.endsOn,
    )
  ) {
    return false;
  }

  switch (
    event.recurrence
  ) {
    /**
     * A non-recurring event has exactly
     * one physical session.
     */
    case "none":
      return (
        date ===
        event.startsOn
      );

    /**
     * Every N calendar days starting from
     * startsOn.
     */
    case "daily": {
      const daysSinceStart =
        differenceInCalendarDays(
          event.startsOn,
          date,
        );

      return (
        daysSinceStart >= 0 &&
        daysSinceStart %
          event.recurrenceInterval ===
          0
      );
    }

    /**
     * Weekly recurrence is anchored to
     * the Sunday-containing week of
     * startsOn.
     *
     * Example:
     *
     * startsOn:
     * Sep 20, 2026
     *
     * selected:
     * Sunday + Wednesday
     *
     * interval:
     * 1
     *
     * produces:
     *
     * Sep 20
     * Sep 23
     * Sep 27
     * Sep 30
     * ...
     */
    case "weekly": {
      const dayOfWeek =
        getDayOfWeek(date);

      if (
        !event.daysOfWeek.includes(
          dayOfWeek,
        )
      ) {
        return false;
      }

      const startWeek =
        getSundayOfWeek(
          event.startsOn,
        );

      const currentWeek =
        getSundayOfWeek(
          date,
        );

      const daysBetweenWeeks =
        differenceInCalendarDays(
          startWeek,
          currentWeek,
        );

      const weeksBetween =
        Math.floor(
          daysBetweenWeeks /
            7,
        );

      return (
        weeksBetween >= 0 &&
        weeksBetween %
          event.recurrenceInterval ===
          0
      );
    }

    /**
     * Monthly recurrence is anchored to
     * the month containing startsOn.
     *
     * A day that does not exist in a
     * particular month is skipped.
     *
     * Example:
     *
     * dayOfMonth = 31
     *
     * January 31 -> generated
     * February    -> skipped
     * March 31    -> generated
     */
    case "monthly": {
      if (
        event.dayOfMonth ===
        null
      ) {
        return false;
      }

      const parts =
        parseDateString(
          date,
        );

      if (
        parts.day !==
        event.dayOfMonth
      ) {
        return false;
      }

      const monthsSinceStart =
        differenceInMonths(
          event.startsOn,
          date,
        );

      return (
        monthsSinceStart >=
          0 &&
        monthsSinceStart %
          event.recurrenceInterval ===
          0
      );
    }

    default: {
      const exhaustiveCheck:
        never =
          event.recurrence;

      throw new Error(
        `Unsupported recurrence: ${String(
          exhaustiveCheck,
        )}`,
      );
    }
  }
}

/**
 * Produce a sensible initial generation
 * window for a new event.
 *
 * By default ChurchFlow creates up to
 * 90 days of sessions.
 *
 * An explicit event endsOn date can make
 * this window shorter.
 */
export function getInitialSessionGenerationRange(
  event: RecurrenceEventInput,
  generationDays: number =
    DEFAULT_SESSION_GENERATION_DAYS,
): SessionGenerationRange {
  assertValidRecurrenceInput(
    event,
  );

  if (
    !Number.isInteger(
      generationDays,
    ) ||
    generationDays < 1
  ) {
    throw new Error(
      "Generation days must be a positive whole number.",
    );
  }

  let endDate =
    addDaysToDate(
      event.startsOn,
      generationDays - 1,
    );

  if (
    event.endsOn &&
    isDateBefore(
      event.endsOn,
      endDate,
    )
  ) {
    endDate =
      event.endsOn;
  }

  return {
    startDate:
      event.startsOn,

    endDate,
  };
}

/**
 * Build a rolling generation window.
 *
 * This will be useful later when ChurchFlow
 * needs to extend recurring sessions without
 * recreating the original event.
 *
 * Example:
 *
 * startDate:
 * 2026-12-01
 *
 * generationDays:
 * 90
 */
export function getRollingSessionGenerationRange(
  event: RecurrenceEventInput,
  startDate: string,
  generationDays: number =
    DEFAULT_SESSION_GENERATION_DAYS,
): SessionGenerationRange | null {
  assertValidRecurrenceInput(
    event,
  );

  parseDateString(
    startDate,
  );

  if (
    !Number.isInteger(
      generationDays,
    ) ||
    generationDays < 1
  ) {
    throw new Error(
      "Generation days must be a positive whole number.",
    );
  }

  /**
   * A requested range before startsOn
   * automatically begins at startsOn.
   */
  const effectiveStart =
    maxDate(
      startDate,
      event.startsOn,
    );

  /**
   * The event has already ended.
   */
  if (
    event.endsOn &&
    isDateAfter(
      effectiveStart,
      event.endsOn,
    )
  ) {
    return null;
  }

  let endDate =
    addDaysToDate(
      effectiveStart,
      generationDays - 1,
    );

  if (
    event.endsOn &&
    isDateBefore(
      event.endsOn,
      endDate,
    )
  ) {
    endDate =
      event.endsOn;
  }

  return {
    startDate:
      effectiveStart,

    endDate,
  };
}

/**
 * Generate the actual event session drafts
 * for a requested calendar range.
 *
 * This function:
 *
 * - respects startsOn
 * - respects endsOn
 * - handles one-time events
 * - handles daily recurrence
 * - handles multi-day weekly recurrence
 * - handles monthly recurrence
 * - handles recurrence intervals
 * - converts local event times to UTC
 * - calculates endsAt
 *
 * It does NOT write to Supabase.
 */
export function generateEventSessions(
  event: RecurrenceEventInput,
  range: SessionGenerationRange,
): GeneratedEventSession[] {
  assertValidRecurrenceInput(
    event,
  );

  parseDateString(
    range.startDate,
  );

  parseDateString(
    range.endDate,
  );

  if (
    isDateAfter(
      range.startDate,
      range.endDate,
    )
  ) {
    throw new Error(
      "Session generation start date cannot be after the end date.",
    );
  }

  /**
   * Don't scan before the event starts.
   */
  const effectiveStart =
    maxDate(
      range.startDate,
      event.startsOn,
    );

  /**
   * If the event itself has an end date,
   * don't scan past it.
   */
  let effectiveEnd =
    range.endDate;

  if (
    event.endsOn
  ) {
    effectiveEnd =
      minDate(
        effectiveEnd,
        event.endsOn,
      );
  }

  /**
   * Nothing can be generated.
   */
  if (
    isDateAfter(
      effectiveStart,
      effectiveEnd,
    )
  ) {
    return [];
  }

  const rangeDays =
    differenceInCalendarDays(
      effectiveStart,
      effectiveEnd,
    ) + 1;

  if (
    rangeDays >
    MAX_GENERATION_RANGE_DAYS
  ) {
    throw new Error(
      [
        "Requested session generation range is too large.",
        `Maximum allowed range is ${MAX_GENERATION_RANGE_DAYS.toLocaleString()} days.`,
      ].join(" "),
    );
  }

  const sessions:
    GeneratedEventSession[] =
      [];

  let currentDate =
    effectiveStart;

  while (
    !isDateAfter(
      currentDate,
      effectiveEnd,
    )
  ) {
    const shouldGenerate =
      shouldGenerateSessionOnDate(
        event,
        currentDate,
      );

    if (
      shouldGenerate
    ) {
      const startsAt =
        zonedDateTimeToUtc(
          currentDate,
          event.defaultStartTime,
          event.timezone,
        );

      const endsAt =
        new Date(
          startsAt.getTime() +
            event.durationMinutes *
              60 *
              1000,
        );

      sessions.push({
        sessionDate:
          currentDate,

        startsAt:
          startsAt.toISOString(),

        endsAt:
          endsAt.toISOString(),

        status:
          "scheduled",
      });
    }

    currentDate =
      addDaysToDate(
        currentDate,
        1,
      );
  }

  return sessions;
}
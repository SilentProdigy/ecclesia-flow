// lib/events/validation.ts

import { z } from "zod";

import {
  EVENT_RECURRENCES,
  EVENT_SESSION_STATUSES,
  EVENT_STATUSES,
  EVENT_TYPES,
} from "@/lib/events/types";

/**
 * Convert an empty string into undefined.
 *
 * Useful for optional text fields coming from FormData.
 */
function emptyStringToUndefined(
  value: unknown,
): unknown {
  if (
    typeof value === "string" &&
    value.trim() === ""
  ) {
    return undefined;
  }

  return value;
}

/**
 * Convert empty values into null.
 *
 * Useful for optional database fields such as:
 * - ends_on
 * - day_of_month
 */
function emptyValueToNull(
  value: unknown,
): unknown {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  if (
    typeof value === "string" &&
    value.trim() === ""
  ) {
    return null;
  }

  return value;
}

/**
 * Validate YYYY-MM-DD without allowing
 * impossible dates such as 2026-02-31.
 */
function isValidDateString(
  value: string,
): boolean {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})$/,
  );

  if (!match) {
    return false;
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

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() ===
      month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * Accept:
 *
 * HH:mm
 * HH:mm:ss
 */
function isValidTimeString(
  value: string,
): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(
    value,
  );
}

/**
 * Validate an IANA timezone.
 *
 * Example:
 * Asia/Manila
 */
function isValidTimezone(
  value: string,
): boolean {
  try {
    Intl.DateTimeFormat(
      "en-US",
      {
        timeZone: value,
      },
    ).format();

    return true;
  } catch {
    return false;
  }
}

/**
 * Optional trimmed text.
 */
function optionalText(
  maxLength: number,
  maxLengthMessage: string,
) {
  return z.preprocess(
    emptyStringToUndefined,
    z
      .string()
      .trim()
      .max(
        maxLength,
        maxLengthMessage,
      )
      .optional(),
  );
}

/**
 * Required date field.
 */
const requiredDateSchema = z
  .string()
  .trim()
  .min(
    1,
    "Date is required.",
  )
  .refine(
    isValidDateString,
    {
      message:
        "Enter a valid date.",
    },
  );

/**
 * Optional nullable date.
 */
const optionalDateSchema =
  z.preprocess(
    emptyValueToNull,
    z
      .string()
      .refine(
        isValidDateString,
        {
          message:
            "Enter a valid date.",
        },
      )
      .nullable(),
  );

/**
 * Required time field.
 */
const requiredTimeSchema = z
  .string()
  .trim()
  .min(
    1,
    "Time is required.",
  )
  .refine(
    isValidTimeString,
    {
      message:
        "Enter a valid time.",
    },
  );

/**
 * Convert string/number form values
 * into an integer.
 */
function requiredIntegerSchema(
  options: {
    min: number;
    max: number;
    minMessage: string;
    maxMessage: string;
  },
) {
  return z.preprocess(
    (value) => {
      if (
        typeof value === "string"
      ) {
        const trimmed =
          value.trim();

        if (trimmed === "") {
          return undefined;
        }

        return Number(trimmed);
      }

      return value;
    },
    z
      .number()
      .int(
        "Enter a whole number.",
      )
      .min(
        options.min,
        options.minMessage,
      )
      .max(
        options.max,
        options.maxMessage,
      ),
  );
}

/**
 * Recurrence interval.
 *
 * Examples:
 * 1 = every week
 * 2 = every 2 weeks
 */
const recurrenceIntervalSchema =
  requiredIntegerSchema({
    min: 1,
    max: 52,
    minMessage:
      "Repeat interval must be at least 1.",
    maxMessage:
      "Repeat interval cannot exceed 52.",
  });

/**
 * Event/session duration in minutes.
 */
const durationSchema =
  requiredIntegerSchema({
    min: 1,
    max: 1440,
    minMessage:
      "Duration must be at least 1 minute.",
    maxMessage:
      "Duration cannot exceed 24 hours.",
  });

/**
 * Optional monthly recurrence day.
 *
 * 1 - 31
 */
const dayOfMonthSchema =
  z.preprocess(
    (value) => {
      const normalized =
        emptyValueToNull(value);

      if (normalized === null) {
        return null;
      }

      if (
        typeof normalized ===
        "number"
      ) {
        return normalized;
      }

      if (
        typeof normalized ===
        "string"
      ) {
        return Number(
          normalized,
        );
      }

      return normalized;
    },
    z
      .number()
      .int(
        "Day of month must be a whole number.",
      )
      .min(
        1,
        "Day of month must be between 1 and 31.",
      )
      .max(
        31,
        "Day of month must be between 1 and 31.",
      )
      .nullable(),
  );

/**
 * Normalize weekday values.
 *
 * FormData may return:
 *
 * "0"
 *
 * or:
 *
 * ["0", "3", "5"]
 *
 * We normalize those into:
 *
 * [0, 3, 5]
 */
const daysOfWeekSchema =
  z
    .preprocess(
      (value) => {
        if (
          value === undefined ||
          value === null ||
          value === ""
        ) {
          return [];
        }

        const values =
          Array.isArray(value)
            ? value
            : [value];

        return values.map(
          (item) => {
            if (
              typeof item ===
              "number"
            ) {
              return item;
            }

            return Number(item);
          },
        );
      },
      z
        .array(
          z
            .number()
            .int()
            .min(
              0,
              "Invalid weekday.",
            )
            .max(
              6,
              "Invalid weekday.",
            ),
        )
        .max(
          7,
          "A week cannot contain more than seven days.",
        ),
    )
    .transform((days) => {
      return Array.from(
        new Set(days),
      ).sort(
        (a, b) => a - b,
      );
    });

/**
 * Main Event schema.
 *
 * This matches the form/domain layer,
 * not the raw Supabase column names.
 */
const eventBaseSchema =
  z.object({
    name: z
      .string()
      .trim()
      .min(
        1,
        "Event name is required.",
      )
      .min(
        2,
        "Event name must contain at least 2 characters.",
      )
      .max(
        120,
        "Event name cannot exceed 120 characters.",
      ),

    description: optionalText(
      2000,
      "Description cannot exceed 2,000 characters.",
    ),

    eventType:
      z.enum(EVENT_TYPES),

    location: optionalText(
      200,
      "Location cannot exceed 200 characters.",
    ),

    status: z
      .enum(EVENT_STATUSES)
      .default("active"),

    recurrence: z
      .enum(
        EVENT_RECURRENCES,
      )
      .default("none"),

    recurrenceInterval:
      recurrenceIntervalSchema.default(
        1,
      ),

    daysOfWeek:
      daysOfWeekSchema.default(
        [],
      ),

    dayOfMonth:
      dayOfMonthSchema.default(
        null,
      ),

    startsOn:
      requiredDateSchema,

    endsOn:
      optionalDateSchema.default(
        null,
      ),

    defaultStartTime:
      requiredTimeSchema,

    durationMinutes:
      durationSchema.default(
        90,
      ),

    timezone: z
      .string()
      .trim()
      .min(
        1,
        "Timezone is required.",
      )
      .max(
        100,
        "Timezone cannot exceed 100 characters.",
      )
      .refine(
        isValidTimezone,
        {
          message:
            "Enter a valid timezone.",
        },
      )
      .default(
        "Asia/Manila",
      ),
  });

/**
 * Cross-field validation.
 */
export const eventFormSchema =
  eventBaseSchema.superRefine(
    (
      data,
      context,
    ) => {
      /**
       * End date cannot precede
       * the event start date.
       */
      if (
        data.endsOn &&
        data.endsOn <
          data.startsOn
      ) {
        context.addIssue({
          code:
            "custom",
          path: [
            "endsOn",
          ],
          message:
            "End date cannot be before the start date.",
        });
      }

      /**
       * Weekly events must have
       * at least one weekday.
       */
      if (
        data.recurrence ===
          "weekly" &&
        data.daysOfWeek
          .length === 0
      ) {
        context.addIssue({
          code:
            "custom",
          path: [
            "daysOfWeek",
          ],
          message:
            "Select at least one day for a weekly event.",
        });
      }

      /**
       * Monthly events need
       * a day of month.
       */
      if (
        data.recurrence ===
          "monthly" &&
        data.dayOfMonth ===
          null
      ) {
        context.addIssue({
          code:
            "custom",
          path: [
            "dayOfMonth",
          ],
          message:
            "Select a day of the month for a monthly event.",
        });
      }

      /**
       * Non-monthly events should not
       * retain stale monthly data.
       *
       * This isn't an error because
       * the server action can normalize it.
       */
    },
  );

export const createEventSchema =
  eventFormSchema;

export const updateEventSchema =
  eventFormSchema;

/**
 * Raw input accepted by the schema.
 */
export type EventFormInput =
  z.input<
    typeof eventFormSchema
  >;

/**
 * Validated/normalized output.
 */
export type EventFormData =
  z.output<
    typeof eventFormSchema
  >;

/**
 * Individual Event Session schema.
 */
const eventSessionBaseSchema =
  z.object({
    sessionDate:
      requiredDateSchema,

    startTime:
      requiredTimeSchema,

    durationMinutes:
      durationSchema.default(
        90,
      ),

    status: z
      .enum(
        EVENT_SESSION_STATUSES,
      )
      .default(
        "scheduled",
      ),

    titleOverride:
      optionalText(
        120,
        "Session title cannot exceed 120 characters.",
      ),

    locationOverride:
      optionalText(
        200,
        "Session location cannot exceed 200 characters.",
      ),

    notes: optionalText(
      2000,
      "Notes cannot exceed 2,000 characters.",
    ),
  });

export const eventSessionFormSchema =
  eventSessionBaseSchema;

export const createEventSessionSchema =
  eventSessionBaseSchema;

export const updateEventSessionSchema =
  eventSessionBaseSchema;

export type EventSessionFormInput =
  z.input<
    typeof eventSessionFormSchema
  >;

export type EventSessionFormData =
  z.output<
    typeof eventSessionFormSchema
  >;

/**
 * Route/database identifiers.
 */
export const eventIdSchema = z
  .string()
  .uuid(
    "Invalid event ID.",
  );

export const eventSessionIdSchema =
  z
    .string()
    .uuid(
      "Invalid session ID.",
    );
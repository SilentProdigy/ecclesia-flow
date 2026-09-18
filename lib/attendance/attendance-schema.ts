import { z } from "zod";

export const ATTENDANCE_METHODS = [
  "manual",
  "face",
  "qr",
] as const;

export const attendanceMethodSchema =
  z.enum(ATTENDANCE_METHODS);

export const eventSessionIdSchema =
  z
    .string()
    .uuid(
      "Invalid event session."
    );

const optionalVisitorPhoneSchema =
  z
    .union([
      z
        .string()
        .trim()
        .min(
          7,
          "Phone number must contain at least 7 characters."
        )
        .max(
          30,
          "Phone number is too long."
        )
        .regex(
          /^[0-9+\-()\s.]+$/,
          "Please enter a valid phone number."
        ),

      z.literal(""),
      z.null(),
      z.undefined(),
    ])
    .transform(
      (value) =>
        value || null
    );

const optionalVisitorEmailSchema =
  z
    .union([
      z
        .string()
        .trim()
        .email(
          "Please enter a valid email address."
        )
        .max(
          254,
          "Email address is too long."
        ),

      z.literal(""),
      z.null(),
      z.undefined(),
    ])
    .transform(
      (value) =>
        value
          ? value.toLowerCase()
          : null
    );

export const manualCheckInSchema =
  z.object({
    event_session_id:
      eventSessionIdSchema,

    member_id: z
      .string()
      .uuid(
        "Invalid member."
      ),

    notes: z
      .string()
      .trim()
      .max(
        500,
        "Notes cannot exceed 500 characters."
      )
      .optional()
      .nullable()
      .transform(
        (value) =>
          value?.length
            ? value
            : null
      ),
  });

export const quickVisitorCheckInSchema =
  z.object({
    event_session_id:
      eventSessionIdSchema,

    first_name: z
      .string()
      .trim()
      .min(
        1,
        "First name is required."
      )
      .max(
        100,
        "First name is too long."
      ),

    last_name: z
      .string()
      .trim()
      .min(
        1,
        "Last name is required."
      )
      .max(
        100,
        "Last name is too long."
      ),

    phone:
      optionalVisitorPhoneSchema,

    email:
      optionalVisitorEmailSchema,
  });

export const voidAttendanceSchema =
  z.object({
    attendance_record_id: z
      .string()
      .uuid(
        "Invalid attendance record."
      ),

    reason: z
      .string()
      .trim()
      .min(
        3,
        "Please provide a reason."
      )
      .max(
        500,
        "Reason cannot exceed 500 characters."
      ),
  });

export const attendanceRecordIdSchema =
  z
    .string()
    .uuid(
      "Invalid attendance record."
    );
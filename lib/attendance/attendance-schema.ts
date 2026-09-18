import { z } from "zod";

export const ATTENDANCE_METHODS = [
  "manual",
  "face",
  "qr",
] as const;

export const attendanceMethodSchema =
  z.enum(ATTENDANCE_METHODS);

export const manualCheckInSchema =
  z.object({
    event_session_id: z
      .string()
      .uuid(
        "Invalid event session."
      ),

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
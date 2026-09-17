import { z } from "zod";

export const MEMBER_TYPES = [
  "member",
  "regular_attendee",
  "visitor",
] as const;

export const MEMBER_STATUSES = [
  "active",
  "inactive",
] as const;

export const FACE_STATUSES = [
  "not_enrolled",
  "enrolled",
  "disabled",
] as const;

export const memberTypeSchema =
  z.enum(MEMBER_TYPES);

export const memberStatusSchema =
  z.enum(MEMBER_STATUSES);

export const faceStatusSchema =
  z.enum(FACE_STATUSES);

/**
 * Converts:
 * "" → null
 * "   " → null
 * undefined → null
 */
function optionalText(maxLength: number) {
  return z
    .string()
    .trim()
    .max(maxLength)
    .transform((value) =>
      value.length === 0 ? null : value
    )
    .nullable()
    .optional()
    .transform((value) => value ?? null);
}

/**
 * Validates YYYY-MM-DD without allowing invalid dates
 * such as 2026-02-31.
 */
const dateStringSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "Invalid date format."
  )
  .refine((value) => {
    const [year, month, day] = value
      .split("-")
      .map(Number);

    const date = new Date(
      Date.UTC(year, month - 1, day)
    );

    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }, "Please enter a valid date.");

const optionalDateSchema = z
  .union([
    dateStringSchema,
    z.literal(""),
    z.null(),
    z.undefined(),
  ])
  .transform((value) => {
    if (!value) {
      return null;
    }

    return value;
  });

const optionalEmailSchema = z
  .union([
    z
      .string()
      .trim()
      .email("Please enter a valid email address.")
      .max(254),
    z.literal(""),
    z.null(),
    z.undefined(),
  ])
  .transform((value) => {
    if (!value) {
      return null;
    }

    return value.toLowerCase();
  });

const optionalPhoneSchema = z
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
  .transform((value) => {
    if (!value) {
      return null;
    }

    return value;
  });

/**
 * This schema represents fields staff are allowed
 * to submit when creating or editing a member.
 *
 * Database-controlled fields such as:
 *
 * id
 * member_no
 * photo_path
 * face_status
 * created_by
 * updated_by
 * created_at
 * updated_at
 *
 * are intentionally excluded.
 */
export const memberFormSchema = z.object({
  first_name: z
    .string()
    .trim()
    .min(1, "First name is required.")
    .max(
      100,
      "First name cannot exceed 100 characters."
    ),

  middle_name: optionalText(100),

  last_name: z
    .string()
    .trim()
    .min(1, "Last name is required.")
    .max(
      100,
      "Last name cannot exceed 100 characters."
    ),

  suffix: optionalText(30),

  preferred_name: optionalText(100),

  phone: optionalPhoneSchema,

  email: optionalEmailSchema,

  date_of_birth: optionalDateSchema,

  gender: optionalText(50),

  address: optionalText(500),

  member_type:
    memberTypeSchema.default("member"),

  status:
    memberStatusSchema.default("active"),

  member_since: optionalDateSchema,

  first_attended_on: optionalDateSchema,

  notes: optionalText(2000),
});

/**
 * We will use this for Add Member.
 */
export const createMemberSchema =
  memberFormSchema;

/**
 * We will use this for Edit Member.
 */
export const updateMemberSchema =
  memberFormSchema.partial();

/**
 * Useful later for route params.
 */
export const memberIdSchema = z
  .string()
  .uuid("Invalid member ID.");
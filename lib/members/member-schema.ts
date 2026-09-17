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
 * "" -> null
 * "   " -> null
 * undefined -> null
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
 * Validates a real YYYY-MM-DD date.
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
      .email(
        "Please enter a valid email address."
      )
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
 * Base object.
 *
 * IMPORTANT:
 * Do not put .refine() / .superRefine()
 * directly on this schema.
 *
 * We need the raw object so we can safely call
 * .partial() for the Edit Member schema.
 */
const memberFormBaseSchema = z.object({
  first_name: z
    .string()
    .trim()
    .min(
      1,
      "First name is required."
    )
    .max(
      100,
      "First name cannot exceed 100 characters."
    ),

  middle_name:
    optionalText(100),

  last_name: z
    .string()
    .trim()
    .min(
      1,
      "Last name is required."
    )
    .max(
      100,
      "Last name cannot exceed 100 characters."
    ),

  suffix:
    optionalText(30),

  preferred_name:
    optionalText(100),

  phone:
    optionalPhoneSchema,

  email:
    optionalEmailSchema,

  date_of_birth:
    optionalDateSchema,

  gender:
    optionalText(50),

  address:
    optionalText(500),

  member_type:
    memberTypeSchema,

  status:
    memberStatusSchema,

  member_since:
    optionalDateSchema,

  first_attended_on:
    optionalDateSchema,

  notes:
    optionalText(2000),
});

interface MemberDateFields {
  date_of_birth?: string | null;
  first_attended_on?: string | null;
  member_since?: string | null;
}

/**
 * Shared cross-field validation.
 */
function validateMemberDates(
  data: MemberDateFields,
  ctx: z.RefinementCtx
) {
  if (
    data.first_attended_on &&
    data.member_since &&
    data.member_since <
      data.first_attended_on
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["member_since"],
      message:
        "Member Since cannot be earlier than First Attended.",
    });
  }

  if (
    data.date_of_birth &&
    data.first_attended_on &&
    data.first_attended_on <
      data.date_of_birth
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["first_attended_on"],
      message:
        "First Attended cannot be earlier than the person's birth date.",
    });
  }

  if (
    data.date_of_birth &&
    data.member_since &&
    data.member_since <
      data.date_of_birth
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["member_since"],
      message:
        "Member Since cannot be earlier than the person's birth date.",
    });
  }
}

/**
 * Full Add Member form schema.
 *
 * Defaults belong here rather than on the
 * base schema because Edit Member will use
 * partial updates.
 */
export const memberFormSchema =
  memberFormBaseSchema
    .extend({
      member_type:
        memberTypeSchema.default(
          "member"
        ),

      status:
        memberStatusSchema.default(
          "active"
        ),
    })
    .superRefine(
      validateMemberDates
    );

/**
 * Add Member.
 */
export const createMemberSchema =
  memberFormSchema;

/**
 * Edit Member.
 *
 * We call .partial() BEFORE adding the
 * refinement, which fixes your runtime error.
 */
export const updateMemberSchema =
  memberFormBaseSchema
    .partial()
    .superRefine(
      validateMemberDates
    );

/**
 * Route parameter validation.
 */
export const memberIdSchema = z
  .string()
  .uuid(
    "Invalid member ID."
  );
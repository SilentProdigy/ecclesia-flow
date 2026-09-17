import { z } from "zod";

import {
  createMemberSchema,
  faceStatusSchema,
  memberFormSchema,
  memberStatusSchema,
  memberTypeSchema,
  updateMemberSchema,
} from "./member-schema";

export type MemberType =
  z.infer<typeof memberTypeSchema>;

export type MemberStatus =
  z.infer<typeof memberStatusSchema>;

export type FaceEnrollmentStatus =
  z.infer<typeof faceStatusSchema>;

export type MemberFormValues =
  z.infer<typeof memberFormSchema>;

export type CreateMemberInput =
  z.infer<typeof createMemberSchema>;

export type UpdateMemberInput =
  z.infer<typeof updateMemberSchema>;

/**
 * Full representation of a members table row.
 */
export interface Member {
  id: string;

  member_no: number;

  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  preferred_name: string | null;

  phone: string | null;
  email: string | null;

  date_of_birth: string | null;
  gender: string | null;
  address: string | null;

  member_type: MemberType;
  status: MemberStatus;

  member_since: string | null;
  first_attended_on: string | null;

  photo_path: string | null;

  face_status: FaceEnrollmentStatus;

  notes: string | null;

  created_by: string | null;
  updated_by: string | null;

  created_at: string;
  updated_at: string;
}

/**
 * Lightweight data for the members directory.
 */
export type MemberListItem = Pick<
  Member,
  | "id"
  | "member_no"
  | "first_name"
  | "middle_name"
  | "last_name"
  | "suffix"
  | "preferred_name"
  | "phone"
  | "email"
  | "member_type"
  | "status"
  | "photo_path"
  | "face_status"
>;

/**
 * Data that will eventually appear in the member
 * profile header.
 */
export type MemberProfileSummary = Pick<
  Member,
  | "id"
  | "member_no"
  | "first_name"
  | "middle_name"
  | "last_name"
  | "suffix"
  | "preferred_name"
  | "member_type"
  | "status"
  | "photo_path"
  | "face_status"
>;
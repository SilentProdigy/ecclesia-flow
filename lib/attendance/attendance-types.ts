import { z } from "zod";

import type {
  MemberType,
} from "@/lib/members";

import {
  attendanceMethodSchema,
  manualCheckInSchema,
  voidAttendanceSchema,
} from "./attendance-schema";

export type AttendanceMethod =
  z.infer<
    typeof attendanceMethodSchema
  >;

export type ManualCheckInInput =
  z.infer<
    typeof manualCheckInSchema
  >;

export type VoidAttendanceInput =
  z.infer<
    typeof voidAttendanceSchema
  >;

export interface AttendanceRecord {
  id: string;

  event_session_id: string;

  member_id: string;

  check_in_method:
    AttendanceMethod;

  checked_in_at: string;

  checked_in_by:
    string | null;

  member_type_at_check_in:
    MemberType;

  notes:
    string | null;

  voided_at:
    string | null;

  voided_by:
    string | null;

  void_reason:
    string | null;

  created_at: string;

  updated_at: string;
}
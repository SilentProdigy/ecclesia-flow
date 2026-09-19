import { z } from "zod";

import type {
  MemberType,
} from "@/lib/members";

import {
  attendanceMethodSchema,
  manualCheckInSchema,
  quickVisitorCheckInSchema,
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

export type QuickVisitorCheckInInput =
  z.infer<
    typeof quickVisitorCheckInSchema
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

export interface ManualCheckInMember {
  id: string;

  member_no: number;

  first_name: string;

  middle_name:
    string | null;

  last_name: string;

  suffix:
    string | null;

  preferred_name:
    string | null;

  phone:
    string | null;

  email:
    string | null;

  member_type:
    MemberType;

  photo_path:
    string | null;

  photo_url:
    string | null;

  already_checked_in:
    boolean;

  pending_sync?:
    boolean;
}

export interface AttendanceRosterItem {
  id: string;

  member_id: string;

  member_no: number;

  first_name: string;

  middle_name:
    string | null;

  last_name: string;

  suffix:
    string | null;

  preferred_name:
    string | null;

  photo_path:
    string | null;

  photo_url:
    string | null;

  member_type_at_check_in:
    MemberType;

  check_in_method:
    AttendanceMethod;

  checked_in_at: string;

  checked_in_by:
    string | null;

  checked_in_by_name:
    string | null;
}

export type AttendanceMemberSearchResult =
  | {
      success: true;

      members:
        ManualCheckInMember[];
    }
  | {
      success: false;

      members: [];

      message: string;
    };

export type AttendanceRosterResult =
  | {
      success: true;

      roster:
        AttendanceRosterItem[];

      count: number;
    }
  | {
      success: false;

      roster: [];

      count: 0;

      message: string;
    };

export type ManualMemberCheckInResult =
  | {
      success: true;

      status:
        "checked_in";

      memberId: string;

      attendanceRecordId:
        string;

      checkedInAt: string;

      displayName: string;
    }
  | {
      success: true;

      status:
        "already_checked_in";

      memberId: string;

      attendanceRecordId:
        string | null;

      checkedInAt:
        string | null;

      displayName: string;
    }
  | {
      success: false;

      status: "error";

      message: string;
    };

export type QuickVisitorRegistrationResult =
  | {
      success: true;

      memberId: string;

      memberNo: number;

      attendanceRecordId:
        string;

      checkedInAt: string;

      displayName: string;
    }
  | {
      success: false;

      message: string;
    };

export type VoidAttendanceResult =
  | {
      success: true;

      attendanceRecordId:
        string;

      memberId: string;

      displayName: string;
    }
  | {
      success: false;

      message: string;
    };
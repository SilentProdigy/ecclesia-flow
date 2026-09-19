import type {
  MemberType,
} from "@/lib/members";

import type {
  AttendanceSessionStatus,
} from "./attendance-session-types";

import type {
  ManualCheckInMember,
} from "./attendance-types";

export interface CachedAttendanceMember {
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
}

export interface CachedAttendanceSession {
  id: string;

  event_id: string;

  title: string;

  status:
    AttendanceSessionStatus;

  session_date: string;

  starts_at: string;

  ends_at: string;

  location:
    string | null;

  timezone: string;

  cached_at: string;
}

export interface AttendanceOfflineBootstrapPayload {
  session:
    CachedAttendanceSession;

  members:
    CachedAttendanceMember[];

  checkedInMemberIds:
    string[];

  cachedAt: string;
}

export type AttendanceOfflineBootstrapResult =
  | {
      success: true;

      payload:
        AttendanceOfflineBootstrapPayload;
    }
  | {
      success: false;

      message: string;
    };

export interface CachedMemberSearchResult {
  available: boolean;

  cachedAt:
    string | null;

  members:
    ManualCheckInMember[];
}

export interface AttendanceCacheInfo {
  available: boolean;

  cachedAt:
    string | null;

  memberCount:
    number;
}

export type OfflineAttendanceOutboxStatus =
  | "pending"
  | "syncing"
  | "failed";

interface OfflineAttendanceOutboxBase {
  member_key: string;

  attendance_record_id:
    string;

  event_session_id:
    string;

  member_id: string;

  checked_in_at:
    string;

  member:
    CachedAttendanceMember;

  status:
    OfflineAttendanceOutboxStatus;

  attempts: number;

  last_error:
    string | null;

  created_at:
    string;

  updated_at:
    string;
}

export interface OfflineMemberCheckInOutboxItem
  extends OfflineAttendanceOutboxBase {
  type:
    "member_check_in";
}

export interface OfflineVisitorRegistrationOutboxItem
  extends OfflineAttendanceOutboxBase {
  type:
    "visitor_registration";

  visitor: {
    first_name:
      string;

    last_name:
      string;

    phone:
      string | null;

    email:
      string | null;
  };
}

export type OfflineAttendanceOutboxItem =
  | OfflineMemberCheckInOutboxItem
  | OfflineVisitorRegistrationOutboxItem;

export interface OfflineAttendanceSyncInput {
  attendance_record_id:
    string;

  event_session_id:
    string;

  member_id:
    string;

  checked_in_at:
    string;
}

export type OfflineSyncFailureCode =
  | "invalid"
  | "unauthorized"
  | "session_closed"
  | "member_inactive"
  | "sync_failed";

export type OfflineAttendanceSyncResult =
  | {
      success: true;

      status:
        | "synced"
        | "already_synced"
        | "already_checked_in";

      attendanceRecordId:
        string;
    }
  | {
      success: false;

      code:
        OfflineSyncFailureCode;

      retryable:
        boolean;

      message: string;
    };

export interface OfflineVisitorSyncInput {
  member_id:
    string;

  attendance_record_id:
    string;

  event_session_id:
    string;

  first_name:
    string;

  last_name:
    string;

  phone:
    string | null;

  email:
    string | null;

  checked_in_at:
    string;
}

export type OfflineVisitorSyncResult =
  | {
      success: true;

      status:
        | "synced"
        | "already_synced"
        | "already_checked_in";

      memberId:
        string;

      memberNo:
        number;

      attendanceRecordId:
        string;

      checkedInAt:
        string;
    }
  | {
      success: false;

      code:
        OfflineSyncFailureCode;

      retryable:
        boolean;

      message: string;
    };
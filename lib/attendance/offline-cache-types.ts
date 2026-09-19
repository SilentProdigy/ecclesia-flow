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
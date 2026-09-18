import type {
  AttendanceMethod,
} from "./attendance-types";

import type {
  MemberType,
} from "@/lib/members";

export interface AttendanceSessionSummary {
  total: number;

  byMemberType: Record<
    MemberType,
    number
  >;

  byMethod: Record<
    AttendanceMethod,
    number
  >;
}

export type AttendanceSummaryResult =
  | {
      success: true;

      summary:
        AttendanceSessionSummary;
    }
  | {
      success: false;

      message: string;
    };
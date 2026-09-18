export type AttendanceSessionStatus =
  | "scheduled"
  | "open"
  | "completed"
  | "cancelled";

export type EventRecurrence =
  | "none"
  | "daily"
  | "weekly"
  | "monthly";

export interface AttendanceEventSummary {
  id: string;
  name: string;
  event_type: string;
  location: string | null;
  timezone: string;

  recurrence:
    EventRecurrence;

  recurrence_interval:
    number;

  days_of_week:
    number[];

  day_of_month:
    number | null;
}

export interface AttendanceSessionListItem {
  id: string;
  event_id: string;

  session_date: string;

  starts_at: string;
  ends_at: string;

  status:
    AttendanceSessionStatus;

  title_override:
    string | null;

  location_override:
    string | null;

  event:
    AttendanceEventSummary;

  attendance_count: number;
}

export interface AttendanceSessionDashboard {
  date: string;

  openSessions:
    AttendanceSessionListItem[];

  todaySessions:
    AttendanceSessionListItem[];

  upcomingSessions:
    AttendanceSessionListItem[];
}
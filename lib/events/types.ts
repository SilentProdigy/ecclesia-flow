// lib/events/types.ts

export const EVENT_TYPES = [
  "worship_service",
  "prayer_meeting",
  "youth_service",
  "ministry_event",
  "special_event",
  "other",
] as const;

export type EventType =
  (typeof EVENT_TYPES)[number];

export const EVENT_RECURRENCES = [
  "none",
  "daily",
  "weekly",
  "monthly",
] as const;

export type EventRecurrence =
  (typeof EVENT_RECURRENCES)[number];

export const EVENT_STATUSES = [
  "active",
  "inactive",
  "archived",
] as const;

export type EventStatus =
  (typeof EVENT_STATUSES)[number];

export const EVENT_SESSION_STATUSES = [
  "scheduled",
  "open",
  "completed",
  "cancelled",
] as const;

export type EventSessionStatus =
  (typeof EVENT_SESSION_STATUSES)[number];

export const DAYS_OF_WEEK = [
  {
    value: 0,
    label: "Sunday",
    shortLabel: "Sun",
  },
  {
    value: 1,
    label: "Monday",
    shortLabel: "Mon",
  },
  {
    value: 2,
    label: "Tuesday",
    shortLabel: "Tue",
  },
  {
    value: 3,
    label: "Wednesday",
    shortLabel: "Wed",
  },
  {
    value: 4,
    label: "Thursday",
    shortLabel: "Thu",
  },
  {
    value: 5,
    label: "Friday",
    shortLabel: "Fri",
  },
  {
    value: 6,
    label: "Saturday",
    shortLabel: "Sat",
  },
] as const;

export type DayOfWeek =
  (typeof DAYS_OF_WEEK)[number]["value"];

export interface EventRecord {
  id: string;

  name: string;
  description: string | null;

  event_type: EventType;

  location: string | null;

  status: EventStatus;

  recurrence: EventRecurrence;

  recurrence_interval: number;

  days_of_week: number[];

  day_of_month: number | null;

  starts_on: string;
  ends_on: string | null;

  default_start_time: string;

  duration_minutes: number;

  timezone: string;

  created_by: string | null;
  updated_by: string | null;

  created_at: string;
  updated_at: string;
}

export interface EventSessionRecord {
  id: string;

  event_id: string;

  session_date: string;

  starts_at: string;
  ends_at: string;

  status: EventSessionStatus;

  title_override: string | null;
  location_override: string | null;

  notes: string | null;

  created_by: string | null;
  updated_by: string | null;

  created_at: string;
  updated_at: string;
}

export interface EventWithSessions
  extends EventRecord {
  event_sessions: EventSessionRecord[];
}

export interface EventFormValues {
  name: string;

  description?: string;

  eventType: EventType;

  location?: string;

  status: EventStatus;

  recurrence: EventRecurrence;

  recurrenceInterval: number;

  daysOfWeek: number[];

  dayOfMonth: number | null;

  startsOn: string;

  endsOn: string | null;

  defaultStartTime: string;

  durationMinutes: number;

  timezone: string;
}

export interface EventSessionFormValues {
  sessionDate: string;

  startTime: string;

  durationMinutes: number;

  status: EventSessionStatus;

  titleOverride?: string;

  locationOverride?: string;

  notes?: string;
}

export const EVENT_TYPE_OPTIONS = [
  {
    value: "worship_service",
    label: "Worship Service",
  },
  {
    value: "prayer_meeting",
    label: "Prayer Meeting",
  },
  {
    value: "youth_service",
    label: "Youth Service",
  },
  {
    value: "ministry_event",
    label: "Ministry Event",
  },
  {
    value: "special_event",
    label: "Special Event",
  },
  {
    value: "other",
    label: "Other",
  },
] satisfies ReadonlyArray<{
  value: EventType;
  label: string;
}>;

export const EVENT_RECURRENCE_OPTIONS = [
  {
    value: "none",
    label: "Does not repeat",
  },
  {
    value: "daily",
    label: "Daily",
  },
  {
    value: "weekly",
    label: "Weekly",
  },
  {
    value: "monthly",
    label: "Monthly",
  },
] satisfies ReadonlyArray<{
  value: EventRecurrence;
  label: string;
}>;

export const EVENT_STATUS_OPTIONS = [
  {
    value: "active",
    label: "Active",
  },
  {
    value: "inactive",
    label: "Inactive",
  },
  {
    value: "archived",
    label: "Archived",
  },
] satisfies ReadonlyArray<{
  value: EventStatus;
  label: string;
}>;

export const EVENT_SESSION_STATUS_OPTIONS = [
  {
    value: "scheduled",
    label: "Scheduled",
  },
  {
    value: "open",
    label: "Open",
  },
  {
    value: "completed",
    label: "Completed",
  },
  {
    value: "cancelled",
    label: "Cancelled",
  },
] satisfies ReadonlyArray<{
  value: EventSessionStatus;
  label: string;
}>;

export function getEventTypeLabel(
  type: EventType,
) {
  return (
    EVENT_TYPE_OPTIONS.find(
      (option) => option.value === type,
    )?.label ?? type
  );
}

export function getRecurrenceLabel(
  recurrence: EventRecurrence,
) {
  return (
    EVENT_RECURRENCE_OPTIONS.find(
      (option) =>
        option.value === recurrence,
    )?.label ?? recurrence
  );
}

export function getEventStatusLabel(
  status: EventStatus,
) {
  return (
    EVENT_STATUS_OPTIONS.find(
      (option) => option.value === status,
    )?.label ?? status
  );
}

export function getSessionStatusLabel(
  status: EventSessionStatus,
) {
  return (
    EVENT_SESSION_STATUS_OPTIONS.find(
      (option) => option.value === status,
    )?.label ?? status
  );
}

export function getDayOfWeekLabel(
  day: number,
) {
  return (
    DAYS_OF_WEEK.find(
      (item) => item.value === day,
    )?.label ?? `Day ${day}`
  );
}

export function getDayOfWeekShortLabel(
  day: number,
) {
  return (
    DAYS_OF_WEEK.find(
      (item) => item.value === day,
    )?.shortLabel ?? `${day}`
  );
}
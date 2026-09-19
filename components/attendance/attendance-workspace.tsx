"use client";

import {
  useState,
} from "react";

import {
  AttendanceOfflineBootstrap,
} from "./attendance-offline-bootstrap";

import {
  AttendanceRoster,
} from "./attendance-roster";

import {
  ManualCheckInPanel,
} from "./manual-check-in-panel";

interface AttendanceWorkspaceProps {
  sessionId: string;

  timezone: string;

  onAttendanceCountChange?:
    (
      count: number
    ) => void;
}

export function AttendanceWorkspace({
  sessionId,
  timezone,
  onAttendanceCountChange,
}: AttendanceWorkspaceProps) {
  const [
    refreshVersion,
    setRefreshVersion,
  ] =
    useState(0);

  function handleAttendanceChanged() {
    setRefreshVersion(
      (current) =>
        current + 1
    );
  }

  return (
    <>
      <AttendanceOfflineBootstrap
        sessionId={
          sessionId
        }
      />

      <ManualCheckInPanel
        sessionId={
          sessionId
        }
        onAttendanceChanged={
          handleAttendanceChanged
        }
      />

      <AttendanceRoster
        sessionId={
          sessionId
        }
        timezone={
          timezone
        }
        refreshVersion={
          refreshVersion
        }
        onAttendanceChanged={
          handleAttendanceChanged
        }
        onCountChange={
          onAttendanceCountChange
        }
      />
    </>
  );
}
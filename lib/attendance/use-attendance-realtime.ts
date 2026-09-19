"use client";

import {
  useEffect,
  useRef,
} from "react";

import {
  createClient,
} from "@/lib/supabase/client";

interface UseAttendanceRealtimeOptions {
  sessionId: string;

  channelKey: string;

  onAttendanceChanged?:
    () => void;

  onSessionChanged?:
    () => void;
}

export function useAttendanceRealtime({
  sessionId,
  channelKey,
  onAttendanceChanged,
  onSessionChanged,
}: UseAttendanceRealtimeOptions) {
  const attendanceHandlerRef =
    useRef(
      onAttendanceChanged
    );

  const sessionHandlerRef =
    useRef(
      onSessionChanged
    );

  useEffect(() => {
    attendanceHandlerRef.current =
      onAttendanceChanged;
  }, [
    onAttendanceChanged,
  ]);

  useEffect(() => {
    sessionHandlerRef.current =
      onSessionChanged;
  }, [
    onSessionChanged,
  ]);

  useEffect(() => {
    const supabase =
      createClient();

    const channel =
      supabase
        .channel(
          `attendance-${channelKey}-${sessionId}`
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table:
              "attendance_records",
            filter:
              `event_session_id=eq.${sessionId}`,
          },
          () => {
            attendanceHandlerRef
              .current?.();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table:
              "attendance_records",
            filter:
              `event_session_id=eq.${sessionId}`,
          },
          () => {
            attendanceHandlerRef
              .current?.();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table:
              "event_sessions",
            filter:
              `id=eq.${sessionId}`,
          },
          () => {
            sessionHandlerRef
              .current?.();
          }
        )
        .subscribe();

    return () => {
      void supabase
        .removeChannel(
          channel
        );
    };
  }, [
    sessionId,
    channelKey,
  ]);
}
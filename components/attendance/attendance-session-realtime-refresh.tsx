"use client";

import {
  useCallback,
  useEffect,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  useAttendanceRealtime,
} from "@/lib/attendance/use-attendance-realtime";

interface AttendanceSessionRealtimeRefreshProps {
  sessionId: string;
}

export function AttendanceSessionRealtimeRefresh({
  sessionId,
}: AttendanceSessionRealtimeRefreshProps) {
  const router =
    useRouter();

  const refresh =
    useCallback(() => {
      router.refresh();
    }, [router]);

  useAttendanceRealtime({
    sessionId,

    channelKey:
      "session-status",

    onSessionChanged:
      refresh,
  });

  useEffect(() => {
    const interval =
      window.setInterval(
        () => {
          if (
            document.visibilityState ===
            "visible"
          ) {
            router.refresh();
          }
        },
        60_000
      );

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [router]);

  return null;
}
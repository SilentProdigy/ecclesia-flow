"use client";

import {
  useCallback,
  useEffect,
  useRef,
} from "react";

import {
  getAttendanceOfflineBootstrapAction,
} from "@/app/(app)/attendance/offline-actions";

import {
  cacheAttendanceBootstrap,
  hasCachedMember,
  setCachedMemberCheckedIn,
  updateCachedSessionStatus,
} from "@/lib/attendance/attendance-offline-db";

import {
  createClient,
} from "@/lib/supabase/client";

import type {
  AttendanceSessionStatus,
} from "@/lib/attendance";

interface AttendanceOfflineBootstrapProps {
  sessionId: string;
}

export function AttendanceOfflineBootstrap({
  sessionId,
}: AttendanceOfflineBootstrapProps) {
  const syncingRef =
    useRef(false);

  const sync =
    useCallback(
      async () => {
        if (
          typeof navigator !==
            "undefined" &&
          !navigator.onLine
        ) {
          return;
        }

        if (
          syncingRef.current
        ) {
          return;
        }

        syncingRef.current =
          true;

        try {
          const result =
            await getAttendanceOfflineBootstrapAction(
              sessionId
            );

          if (
            result.success
          ) {
            await cacheAttendanceBootstrap(
              result.payload
            );
          }
        } catch (error) {
          console.error(
            "Attendance offline cache sync failed:",
            error
          );
        } finally {
          syncingRef.current =
            false;
        }
      },
      [sessionId]
    );

  useEffect(() => {
    void sync();

    function handleOnline() {
      void sync();
    }

    function handleVisibilityChange() {
      if (
        document.visibilityState ===
          "visible" &&
        navigator.onLine
      ) {
        void sync();
      }
    }

    window.addEventListener(
      "online",
      handleOnline
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    const interval =
      window.setInterval(
        () => {
          if (
            navigator.onLine &&
            document.visibilityState ===
              "visible"
          ) {
            void sync();
          }
        },
        5 * 60 * 1000
      );

    return () => {
      window.removeEventListener(
        "online",
        handleOnline
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      window.clearInterval(
        interval
      );
    };
  }, [sync]);

  useEffect(() => {
    const supabase =
      createClient();

    const channel =
      supabase
        .channel(
          `attendance-cache-${sessionId}`
        )
        .on(
          "postgres_changes",
          {
            event:
              "INSERT",

            schema:
              "public",

            table:
              "attendance_records",

            filter:
              `event_session_id=eq.${sessionId}`,
          },
          async (
            payload
          ) => {
            const record =
              payload.new as {
                member_id?:
                  string;
              };

            if (
              !record.member_id
            ) {
              return;
            }

            await setCachedMemberCheckedIn(
              sessionId,
              record.member_id,
              true
            );

            const memberExists =
              await hasCachedMember(
                record.member_id
              );

            if (
              !memberExists
            ) {
              void sync();
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event:
              "UPDATE",

            schema:
              "public",

            table:
              "attendance_records",

            filter:
              `event_session_id=eq.${sessionId}`,
          },
          async (
            payload
          ) => {
            const record =
              payload.new as {
                member_id?:
                  string;

                voided_at?:
                  string | null;
              };

            if (
              !record.member_id
            ) {
              return;
            }

            await setCachedMemberCheckedIn(
              sessionId,
              record.member_id,
              !record.voided_at
            );
          }
        )
        .on(
          "postgres_changes",
          {
            event:
              "UPDATE",

            schema:
              "public",

            table:
              "event_sessions",

            filter:
              `id=eq.${sessionId}`,
          },
          async (
            payload
          ) => {
            const record =
              payload.new as {
                status?:
                  AttendanceSessionStatus;
              };

            if (
              !record.status
            ) {
              return;
            }

            await updateCachedSessionStatus(
              sessionId,
              record.status
            );
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
    sync,
  ]);

  return null;
}
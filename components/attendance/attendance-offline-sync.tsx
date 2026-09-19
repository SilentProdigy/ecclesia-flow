"use client";

import {
  useCallback,
  useEffect,
  useRef,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  syncOfflineAttendanceCheckInAction,
} from "@/app/(app)/attendance/offline-actions";

import {
  dispatchAttendanceOutboxChanged,
  getOfflineAttendanceOutboxItems,
  removeOfflineAttendanceOutboxItem,
  setCachedMemberCheckedIn,
  updateOfflineAttendanceOutboxItem,
} from "@/lib/attendance/attendance-offline-db";

interface AttendanceOfflineSyncProps {
  sessionId: string;

  onAttendanceChanged:
    () => void;
}

export function AttendanceOfflineSync({
  sessionId,
  onAttendanceChanged,
}: AttendanceOfflineSyncProps) {
  const router =
    useRouter();

  const syncingRef =
    useRef(false);

  const syncOutbox =
    useCallback(
      async () => {
        if (
          !navigator.onLine ||
          syncingRef.current
        ) {
          return;
        }

        syncingRef.current =
          true;

        let syncedAny =
          false;

        try {
          const items =
            await getOfflineAttendanceOutboxItems(
              sessionId
            );

          const syncable =
            items.filter(
              (item) =>
                item.status ===
                  "pending" ||
                item.status ===
                  "syncing"
            );

          for (
            const item of
            syncable
          ) {
            await updateOfflineAttendanceOutboxItem(
              item.member_key,
              {
                status:
                  "syncing",

                lastError:
                  null,

                incrementAttempts:
                  true,
              }
            );

            try {
              const result =
                await syncOfflineAttendanceCheckInAction({
                  attendance_record_id:
                    item.attendance_record_id,

                  event_session_id:
                    item.event_session_id,

                  member_id:
                    item.member_id,

                  checked_in_at:
                    item.checked_in_at,
                });

              if (
                result.success
              ) {
                await setCachedMemberCheckedIn(
                  item.event_session_id,
                  item.member_id,
                  true
                );

                await removeOfflineAttendanceOutboxItem(
                  item.member_key
                );

                syncedAny =
                  true;

                dispatchAttendanceOutboxChanged(
                  sessionId
                );

                continue;
              }

              if (
                result.retryable
              ) {
                await updateOfflineAttendanceOutboxItem(
                  item.member_key,
                  {
                    status:
                      "pending",

                    lastError:
                      result.message,
                  }
                );
              } else {
                await updateOfflineAttendanceOutboxItem(
                  item.member_key,
                  {
                    status:
                      "failed",

                    lastError:
                      result.message,
                  }
                );

                await setCachedMemberCheckedIn(
                  item.event_session_id,
                  item.member_id,
                  false
                );
              }

              dispatchAttendanceOutboxChanged(
                sessionId
              );
            } catch (
              error
            ) {
              console.error(
                "Offline attendance synchronization request failed:",
                error
              );

              await updateOfflineAttendanceOutboxItem(
                item.member_key,
                {
                  status:
                    "pending",

                  lastError:
                    "Connection interrupted while synchronizing.",
                }
              );
            }
          }

          if (
            syncedAny
          ) {
            onAttendanceChanged();

            router.refresh();
          }
        } finally {
          syncingRef.current =
            false;
        }
      },
      [
        sessionId,
        onAttendanceChanged,
        router,
      ]
    );

  useEffect(() => {
    if (
      navigator.onLine
    ) {
      void syncOutbox();
    }

    function handleOnline() {
      void syncOutbox();
    }

    function handleVisibilityChange() {
      if (
        document.visibilityState ===
          "visible" &&
        navigator.onLine
      ) {
        void syncOutbox();
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
            void syncOutbox();
          }
        },
        30_000
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
  }, [syncOutbox]);

  return null;
}
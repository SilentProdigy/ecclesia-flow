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
  syncOfflineVisitorRegistrationAction,
} from "@/app/(app)/attendance/offline-actions";

import {
  dispatchAttendanceOutboxChanged,
  getOfflineAttendanceOutboxItems,
  removeOfflineAttendanceOutboxItem,
  setCachedMemberCheckedIn,
  updateOfflineAttendanceOutboxItem,
  upsertCachedAttendanceMember,
} from "@/lib/attendance/attendance-offline-db";

import type {
  OfflineAttendanceOutboxItem,
  OfflineSyncFailureCode,
} from "@/lib/attendance";

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

  const markFailure =
    useCallback(
      async (
        item:
          OfflineAttendanceOutboxItem,
        failure: {
          code:
            OfflineSyncFailureCode;

          retryable:
            boolean;

          message:
            string;
        }
      ) => {
        if (
          failure.retryable
        ) {
          await updateOfflineAttendanceOutboxItem(
            item.member_key,
            {
              status:
                "pending",

              lastError:
                failure.message,
            }
          );
        } else {
          await updateOfflineAttendanceOutboxItem(
            item.member_key,
            {
              status:
                "failed",

              lastError:
                failure.message,
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
      },
      [sessionId]
    );

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
              if (
                item.type ===
                "visitor_registration"
              ) {
                const result =
                  await syncOfflineVisitorRegistrationAction({
                    member_id:
                      item.member_id,

                    attendance_record_id:
                      item.attendance_record_id,

                    event_session_id:
                      item.event_session_id,

                    first_name:
                      item.visitor
                        .first_name,

                    last_name:
                      item.visitor
                        .last_name,

                    phone:
                      item.visitor
                        .phone,

                    email:
                      item.visitor
                        .email,

                    checked_in_at:
                      item.checked_in_at,
                  });

                if (
                  result.success
                ) {
                  await upsertCachedAttendanceMember({
                    ...item.member,

                    member_no:
                      result.memberNo,
                  });

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

                await markFailure(
                  item,
                  result
                );

                continue;
              }

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

              await markFailure(
                item,
                result
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

              dispatchAttendanceOutboxChanged(
                sessionId
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
        markFailure,
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
"use client";

import type {
  AttendanceCacheInfo,
  AttendanceOfflineBootstrapPayload,
  CachedAttendanceMember,
  CachedAttendanceSession,
  CachedMemberSearchResult,
  OfflineAttendanceOutboxItem,
  OfflineAttendanceOutboxStatus,
} from "./offline-cache-types";

import type {
  AttendanceSessionStatus,
} from "./attendance-session-types";

const DB_NAME =
  "ecclesia-flow-attendance";

const DB_VERSION = 2;

const MEMBER_STORE =
  "members";

const SESSION_STORE =
  "sessions";

const CHECKIN_STORE =
  "checkins";

const META_STORE =
  "meta";

const OUTBOX_STORE =
  "outbox";

export const ATTENDANCE_OUTBOX_CHANGED_EVENT =
  "ecclesia:attendance-outbox-changed";

interface CachedCheckIn {
  key: string;

  session_id: string;

  member_id: string;
}

interface CachedMeta {
  key: string;

  cached_at: string;
}

function supportsIndexedDb() {
  return (
    typeof window !==
      "undefined" &&
    "indexedDB" in window
  );
}

function requestToPromise<T>(
  request:
    IDBRequest<T>
) {
  return new Promise<T>(
    (
      resolve,
      reject
    ) => {
      request.onsuccess =
        () => {
          resolve(
            request.result
          );
        };

      request.onerror =
        () => {
          reject(
            request.error
          );
        };
    }
  );
}

function transactionToPromise(
  transaction:
    IDBTransaction
) {
  return new Promise<void>(
    (
      resolve,
      reject
    ) => {
      transaction.oncomplete =
        () => {
          resolve();
        };

      transaction.onerror =
        () => {
          reject(
            transaction.error
          );
        };

      transaction.onabort =
        () => {
          reject(
            transaction.error
          );
        };
    }
  );
}

async function openAttendanceDb(): Promise<
  IDBDatabase | null
> {
  if (
    !supportsIndexedDb()
  ) {
    return null;
  }

  return new Promise<
    IDBDatabase
  >(
    (
      resolve,
      reject
    ) => {
      const request =
        window.indexedDB.open(
          DB_NAME,
          DB_VERSION
        );

      request.onupgradeneeded =
        () => {
          const db =
            request.result;

          if (
            !db.objectStoreNames
              .contains(
                MEMBER_STORE
              )
          ) {
            const members =
              db.createObjectStore(
                MEMBER_STORE,
                {
                  keyPath:
                    "id",
                }
              );

            members.createIndex(
              "member_no",
              "member_no",
              {
                unique:
                  true,
              }
            );
          }

          if (
            !db.objectStoreNames
              .contains(
                SESSION_STORE
              )
          ) {
            db.createObjectStore(
              SESSION_STORE,
              {
                keyPath:
                  "id",
              }
            );
          }

          if (
            !db.objectStoreNames
              .contains(
                CHECKIN_STORE
              )
          ) {
            const checkins =
              db.createObjectStore(
                CHECKIN_STORE,
                {
                  keyPath:
                    "key",
                }
              );

            checkins.createIndex(
              "session_id",
              "session_id",
              {
                unique:
                  false,
              }
            );

            checkins.createIndex(
              "member_id",
              "member_id",
              {
                unique:
                  false,
              }
            );
          }

          if (
            !db.objectStoreNames
              .contains(
                META_STORE
              )
          ) {
            db.createObjectStore(
              META_STORE,
              {
                keyPath:
                  "key",
              }
            );
          }

          if (
            !db.objectStoreNames
              .contains(
                OUTBOX_STORE
              )
          ) {
            const outbox =
              db.createObjectStore(
                OUTBOX_STORE,
                {
                  keyPath:
                    "member_key",
                }
              );

            outbox.createIndex(
              "session_id",
              "event_session_id",
              {
                unique:
                  false,
              }
            );

            outbox.createIndex(
              "status",
              "status",
              {
                unique:
                  false,
              }
            );
          }
        };

      request.onsuccess =
        () => {
          resolve(
            request.result
          );
        };

      request.onerror =
        () => {
          reject(
            request.error
          );
        };
    }
  );
}

function getSessionMetaKey(
  sessionId: string
) {
  return `session:${sessionId}`;
}

function getCheckInKey(
  sessionId: string,
  memberId: string
) {
  return `${sessionId}:${memberId}`;
}

function getOutboxMemberKey(
  sessionId: string,
  memberId: string
) {
  return `${sessionId}:${memberId}`;
}

export function dispatchAttendanceOutboxChanged(
  sessionId: string
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(
      ATTENDANCE_OUTBOX_CHANGED_EVENT,
      {
        detail: {
          sessionId,
        },
      }
    )
  );
}

export async function cacheAttendanceBootstrap(
  payload:
    AttendanceOfflineBootstrapPayload
) {
  const db =
    await openAttendanceDb();

  if (!db) {
    return;
  }

  const transaction =
    db.transaction(
      [
        MEMBER_STORE,
        SESSION_STORE,
        META_STORE,
      ],
      "readwrite"
    );

  const memberStore =
    transaction.objectStore(
      MEMBER_STORE
    );

  const sessionStore =
    transaction.objectStore(
      SESSION_STORE
    );

  const metaStore =
    transaction.objectStore(
      META_STORE
    );

  memberStore.clear();

  for (
    const member of
    payload.members
  ) {
    memberStore.put(
      member
    );
  }

  sessionStore.put(
    payload.session
  );

  metaStore.put({
    key:
      getSessionMetaKey(
        payload.session.id
      ),

    cached_at:
      payload.cachedAt,
  } satisfies CachedMeta);

  await transactionToPromise(
    transaction
  );

  db.close();

  await replaceCachedSessionCheckIns(
    payload.session.id,
    payload.checkedInMemberIds
  );
}

export async function replaceCachedSessionCheckIns(
  sessionId: string,
  memberIds: string[]
) {
  const db =
    await openAttendanceDb();

  if (!db) {
    return;
  }

  await new Promise<void>(
    (
      resolve,
      reject
    ) => {
      const transaction =
        db.transaction(
          CHECKIN_STORE,
          "readwrite"
        );

      const store =
        transaction.objectStore(
          CHECKIN_STORE
        );

      const index =
        store.index(
          "session_id"
        );

      const cursorRequest =
        index.openCursor(
          IDBKeyRange.only(
            sessionId
          )
        );

      cursorRequest.onsuccess =
        () => {
          const cursor =
            cursorRequest.result;

          if (cursor) {
            cursor.delete();

            cursor.continue();

            return;
          }

          for (
            const memberId of
            memberIds
          ) {
            store.put({
              key:
                getCheckInKey(
                  sessionId,
                  memberId
                ),

              session_id:
                sessionId,

              member_id:
                memberId,
            } satisfies CachedCheckIn);
          }
        };

      cursorRequest.onerror =
        () => {
          reject(
            cursorRequest.error
          );
        };

      transaction.oncomplete =
        () => {
          resolve();
        };

      transaction.onerror =
        () => {
          reject(
            transaction.error
          );
        };

      transaction.onabort =
        () => {
          reject(
            transaction.error
          );
        };
    }
  );

  db.close();
}

export async function setCachedMemberCheckedIn(
  sessionId: string,
  memberId: string,
  checkedIn: boolean
) {
  const db =
    await openAttendanceDb();

  if (!db) {
    return;
  }

  const transaction =
    db.transaction(
      CHECKIN_STORE,
      "readwrite"
    );

  const store =
    transaction.objectStore(
      CHECKIN_STORE
    );

  const key =
    getCheckInKey(
      sessionId,
      memberId
    );

  if (checkedIn) {
    store.put({
      key,

      session_id:
        sessionId,

      member_id:
        memberId,
    } satisfies CachedCheckIn);
  } else {
    store.delete(
      key
    );
  }

  await transactionToPromise(
    transaction
  );

  db.close();
}

export async function hasCachedMember(
  memberId: string
) {
  const db =
    await openAttendanceDb();

  if (!db) {
    return false;
  }

  const transaction =
    db.transaction(
      MEMBER_STORE,
      "readonly"
    );

  const request =
    transaction
      .objectStore(
        MEMBER_STORE
      )
      .get(
        memberId
      );

  const result =
    await requestToPromise<
      CachedAttendanceMember | undefined
    >(
      request
    );

  db.close();

  return Boolean(
    result
  );
}

export async function updateCachedSessionStatus(
  sessionId: string,
  status:
    AttendanceSessionStatus
) {
  const db =
    await openAttendanceDb();

  if (!db) {
    return;
  }

  await new Promise<void>(
    (
      resolve,
      reject
    ) => {
      const transaction =
        db.transaction(
          SESSION_STORE,
          "readwrite"
        );

      const store =
        transaction.objectStore(
          SESSION_STORE
        );

      const request =
        store.get(
          sessionId
        );

      request.onsuccess =
        () => {
          const session =
            request.result as
              | CachedAttendanceSession
              | undefined;

          if (!session) {
            return;
          }

          store.put({
            ...session,

            status,

            cached_at:
              new Date()
                .toISOString(),
          });
        };

      request.onerror =
        () => {
          reject(
            request.error
          );
        };

      transaction.oncomplete =
        () => {
          resolve();
        };

      transaction.onerror =
        () => {
          reject(
            transaction.error
          );
        };

      transaction.onabort =
        () => {
          reject(
            transaction.error
          );
        };
    }
  );

  db.close();
}

export async function getCachedAttendanceSession(
  sessionId: string
) {
  const db =
    await openAttendanceDb();

  if (!db) {
    return null;
  }

  const transaction =
    db.transaction(
      SESSION_STORE,
      "readonly"
    );

  const request =
    transaction
      .objectStore(
        SESSION_STORE
      )
      .get(
        sessionId
      );

  const session =
    await requestToPromise<
      CachedAttendanceSession | undefined
    >(
      request
    );

  db.close();

  return (
    session ??
    null
  );
}

export async function getAttendanceCacheInfo(
  sessionId: string
): Promise<AttendanceCacheInfo> {
  const db =
    await openAttendanceDb();

  if (!db) {
    return {
      available:
        false,

      cachedAt:
        null,

      memberCount:
        0,
    };
  }

  const transaction =
    db.transaction(
      [
        MEMBER_STORE,
        SESSION_STORE,
        META_STORE,
      ],
      "readonly"
    );

  const memberCountRequest =
    transaction
      .objectStore(
        MEMBER_STORE
      )
      .count();

  const sessionRequest =
    transaction
      .objectStore(
        SESSION_STORE
      )
      .get(
        sessionId
      );

  const metaRequest =
    transaction
      .objectStore(
        META_STORE
      )
      .get(
        getSessionMetaKey(
          sessionId
        )
      );

  const [
    memberCount,
    session,
    meta,
  ] =
    await Promise.all([
      requestToPromise(
        memberCountRequest
      ),

      requestToPromise<
        CachedAttendanceSession | undefined
      >(
        sessionRequest
      ),

      requestToPromise<
        CachedMeta | undefined
      >(
        metaRequest
      ),
    ]);

  db.close();

  return {
    available:
      Boolean(
        session &&
          meta &&
          memberCount >
            0
      ),

    cachedAt:
      meta?.cached_at ??
      null,

    memberCount,
  };
}

export async function queueOfflineAttendanceCheckIn({
  sessionId,
  member,
}: {
  sessionId: string;

  member:
    CachedAttendanceMember;
}): Promise<OfflineAttendanceOutboxItem> {
  const db =
    await openAttendanceDb();

  if (!db) {
    throw new Error(
      "IndexedDB is not available."
    );
  }

  const memberKey =
    getOutboxMemberKey(
      sessionId,
      member.id
    );

  const result =
    await new Promise<
      OfflineAttendanceOutboxItem
    >(
      (
        resolve,
        reject
      ) => {
        const transaction =
          db.transaction(
            OUTBOX_STORE,
            "readwrite"
          );

        const store =
          transaction.objectStore(
            OUTBOX_STORE
          );

        const request =
          store.get(
            memberKey
          );

        let value:
          OfflineAttendanceOutboxItem | null =
          null;

        request.onsuccess =
          () => {
            const existing =
              request.result as
                | OfflineAttendanceOutboxItem
                | undefined;

            if (
              existing &&
              existing.status !==
                "failed"
            ) {
              value =
                existing;

              return;
            }

            const now =
              new Date()
                .toISOString();

            value = {
              member_key:
                memberKey,

              type:
                "member_check_in",

              attendance_record_id:
                existing
                  ?.attendance_record_id ??
                crypto.randomUUID(),

              event_session_id:
                sessionId,

              member_id:
                member.id,

              checked_in_at:
                existing
                  ?.checked_in_at ??
                now,

              member,

              status:
                "pending",

              attempts:
                existing
                  ?.attempts ??
                0,

              last_error:
                null,

              created_at:
                existing
                  ?.created_at ??
                now,

              updated_at:
                now,
            };

            store.put(
              value
            );
          };

        request.onerror =
          () => {
            reject(
              request.error
            );
          };

        transaction.oncomplete =
          () => {
            if (!value) {
              reject(
                new Error(
                  "Unable to create offline attendance record."
                )
              );

              return;
            }

            resolve(
              value
            );
          };

        transaction.onerror =
          () => {
            reject(
              transaction.error
            );
          };

        transaction.onabort =
          () => {
            reject(
              transaction.error
            );
          };
      }
    );

  db.close();

  dispatchAttendanceOutboxChanged(
    sessionId
  );

  return result;
}

export async function getOfflineAttendanceOutboxItems(
  sessionId: string
): Promise<
  OfflineAttendanceOutboxItem[]
> {
  const db =
    await openAttendanceDb();

  if (!db) {
    return [];
  }

  const transaction =
    db.transaction(
      OUTBOX_STORE,
      "readonly"
    );

  const request =
    transaction
      .objectStore(
        OUTBOX_STORE
      )
      .index(
        "session_id"
      )
      .getAll(
        sessionId
      );

  const items =
    await requestToPromise<
      OfflineAttendanceOutboxItem[]
    >(
      request
    );

  db.close();

  return items.sort(
    (
      first,
      second
    ) =>
      first.created_at.localeCompare(
        second.created_at
      )
  );
}

export async function getQueuedOfflineMemberIds(
  sessionId: string
) {
  const items =
    await getOfflineAttendanceOutboxItems(
      sessionId
    );

  return new Set(
    items
      .filter(
        (item) =>
          item.status ===
            "pending" ||
          item.status ===
            "syncing"
      )
      .map(
        (item) =>
          item.member_id
      )
  );
}

export async function updateOfflineAttendanceOutboxItem(
  memberKey: string,
  {
    status,
    lastError,
    incrementAttempts = false,
  }: {
    status:
      OfflineAttendanceOutboxStatus;

    lastError:
      string | null;

    incrementAttempts?:
      boolean;
  }
) {
  const db =
    await openAttendanceDb();

  if (!db) {
    return;
  }

  await new Promise<void>(
    (
      resolve,
      reject
    ) => {
      const transaction =
        db.transaction(
          OUTBOX_STORE,
          "readwrite"
        );

      const store =
        transaction.objectStore(
          OUTBOX_STORE
        );

      const request =
        store.get(
          memberKey
        );

      request.onsuccess =
        () => {
          const existing =
            request.result as
              | OfflineAttendanceOutboxItem
              | undefined;

          if (!existing) {
            return;
          }

          store.put({
            ...existing,

            status,

            attempts:
              incrementAttempts
                ? existing.attempts +
                  1
                : existing.attempts,

            last_error:
              lastError,

            updated_at:
              new Date()
                .toISOString(),
          });
        };

      request.onerror =
        () => {
          reject(
            request.error
          );
        };

      transaction.oncomplete =
        () => {
          resolve();
        };

      transaction.onerror =
        () => {
          reject(
            transaction.error
          );
        };

      transaction.onabort =
        () => {
          reject(
            transaction.error
          );
        };
    }
  );

  db.close();
}

export async function removeOfflineAttendanceOutboxItem(
  memberKey: string
) {
  const db =
    await openAttendanceDb();

  if (!db) {
    return;
  }

  const transaction =
    db.transaction(
      OUTBOX_STORE,
      "readwrite"
    );

  transaction
    .objectStore(
      OUTBOX_STORE
    )
    .delete(
      memberKey
    );

  await transactionToPromise(
    transaction
  );

  db.close();
}

export async function searchCachedAttendanceMembers(
  sessionId: string,
  query: string,
  limit = 20
): Promise<CachedMemberSearchResult> {
  const db =
    await openAttendanceDb();

  if (!db) {
    return {
      available:
        false,

      cachedAt:
        null,

      members: [],
    };
  }

  const transaction =
    db.transaction(
      [
        MEMBER_STORE,
        CHECKIN_STORE,
        META_STORE,
        OUTBOX_STORE,
      ],
      "readonly"
    );

  const memberRequest =
    transaction
      .objectStore(
        MEMBER_STORE
      )
      .getAll();

  const checkinRequest =
    transaction
      .objectStore(
        CHECKIN_STORE
      )
      .index(
        "session_id"
      )
      .getAll(
        sessionId
      );

  const metaRequest =
    transaction
      .objectStore(
        META_STORE
      )
      .get(
        getSessionMetaKey(
          sessionId
        )
      );

  const outboxRequest =
    transaction
      .objectStore(
        OUTBOX_STORE
      )
      .index(
        "session_id"
      )
      .getAll(
        sessionId
      );

  const [
    members,
    checkins,
    meta,
    outbox,
  ] =
    await Promise.all([
      requestToPromise<
        CachedAttendanceMember[]
      >(
        memberRequest
      ),

      requestToPromise<
        CachedCheckIn[]
      >(
        checkinRequest
      ),

      requestToPromise<
        CachedMeta | undefined
      >(
        metaRequest
      ),

      requestToPromise<
        OfflineAttendanceOutboxItem[]
      >(
        outboxRequest
      ),
    ]);

  db.close();

  const checkedInIds =
    new Set(
      checkins.map(
        (record) =>
          record.member_id
      )
    );

  const queuedIds =
    new Set(
      outbox
        .filter(
          (item) =>
            item.status ===
              "pending" ||
            item.status ===
              "syncing"
        )
        .map(
          (item) =>
            item.member_id
        )
    );

  const normalizedQuery =
    normalizeSearchQuery(
      query
    );

  const matchedMembers =
    findCachedMembers(
      members,
      normalizedQuery
    )
      .slice(
        0,
        limit
      )
      .map(
        (member) => {
          const pendingSync =
            queuedIds.has(
              member.id
            );

          return {
            ...member,

            photo_url:
              null,

            already_checked_in:
              checkedInIds.has(
                member.id
              ) ||
              pendingSync,

            pending_sync:
              pendingSync,
          };
        }
      );

  return {
    available:
      Boolean(meta),

    cachedAt:
      meta?.cached_at ??
      null,

    members:
      matchedMembers,
  };
}

function findCachedMembers(
  members:
    CachedAttendanceMember[],
  query: string
) {
  if (!query) {
    return [];
  }

  const memberNumberMatch =
    query.match(
      /^(?:ec-?)?0*(\d+)$/
    );

  if (
    memberNumberMatch
  ) {
    const number =
      Number(
        memberNumberMatch[1]
      );

    const exact =
      members.find(
        (member) =>
          member.member_no ===
          number
      );

    if (exact) {
      return [
        exact,
      ];
    }
  }

  const tokens =
    query
      .split(/\s+/)
      .filter(Boolean)
      .slice(
        0,
        6
      );

  return members
    .filter(
      (member) => {
        const memberNumber =
          formatCachedMemberNumber(
            member.member_no
          ).toLowerCase();

        const haystack =
          [
            member.first_name,
            member.middle_name,
            member.last_name,
            member.suffix,
            member.preferred_name,
            member.phone,
            member.email,
            memberNumber,
            String(
              member.member_no
            ),
          ]
            .filter(Boolean)
            .join(" ")
            .normalize(
              "NFKC"
            )
            .toLowerCase();

        return tokens.every(
          (token) =>
            haystack.includes(
              token
            )
        );
      }
    )
    .sort(
      (
        first,
        second
      ) => {
        const lastNameCompare =
          first.last_name.localeCompare(
            second.last_name
          );

        if (
          lastNameCompare !==
          0
        ) {
          return lastNameCompare;
        }

        return first.first_name.localeCompare(
          second.first_name
        );
      }
    );
}

function normalizeSearchQuery(
  value: string
) {
  return value
    .normalize(
      "NFKC"
    )
    .trim()
    .replace(
      /\s+/g,
      " "
    )
    .toLowerCase();
}

function formatCachedMemberNumber(
  memberNo: number
) {
  return `EC-${String(
    memberNo
  ).padStart(
    6,
    "0"
  )}`;
}
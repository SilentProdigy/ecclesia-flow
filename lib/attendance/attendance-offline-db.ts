"use client";

import type {
  AttendanceCacheInfo,
  AttendanceOfflineBootstrapPayload,
  CachedAttendanceMember,
  CachedAttendanceSession,
  CachedMemberSearchResult,
} from "./offline-cache-types";

import type {
  AttendanceSessionStatus,
} from "./attendance-session-types";

const DB_NAME =
  "ecclesia-flow-attendance";

const DB_VERSION = 1;

const MEMBER_STORE =
  "members";

const SESSION_STORE =
  "sessions";

const CHECKIN_STORE =
  "checkins";

const META_STORE =
  "meta";

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

  await replaceCachedSessionCheckIns(
    payload.session.id,
    payload.checkedInMemberIds
  );

  db.close();
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
            const record:
              CachedCheckIn =
              {
                key:
                  getCheckInKey(
                    sessionId,
                    memberId
                  ),

                session_id:
                  sessionId,

                member_id:
                  memberId,
              };

            store.put(
              record
            );
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

  const [
    members,
    checkins,
    meta,
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
    ]);

  db.close();

  const checkedInIds =
    new Set(
      checkins.map(
        (record) =>
          record.member_id
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
        (member) => ({
          ...member,

          photo_url:
            null,

          already_checked_in:
            checkedInIds.has(
              member.id
            ),
        })
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
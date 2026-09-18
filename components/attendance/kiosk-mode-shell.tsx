"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import Link from "next/link";

import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  MapPin,
  Maximize2,
  Minimize2,
  MonitorSmartphone,
  MoonStar,
  UsersRound,
  Wifi,
  WifiOff,
} from "lucide-react";

import {
  AttendanceWorkspace,
} from "./attendance-workspace";

interface KioskModeShellProps {
  sessionId: string;

  title: string;

  dateLabel: string;

  timeLabel: string;

  location:
    string | null;

  timezone: string;

  attendanceCount:
    number;
}

export function KioskModeShell({
  sessionId,
  title,
  dateLabel,
  timeLabel,
  location,
  timezone,
  attendanceCount,
}: KioskModeShellProps) {
  const wakeLockRef =
    useRef<
      WakeLockSentinel | null
    >(null);

  const [
    isOnline,
    setIsOnline,
  ] =
    useState(true);

  const [
    isFullscreen,
    setIsFullscreen,
  ] =
    useState(false);

  const [
    fullscreenSupported,
    setFullscreenSupported,
  ] =
    useState(false);

  const [
    wakeLockActive,
    setWakeLockActive,
  ] =
    useState(false);

  const [
    wakeLockSupported,
    setWakeLockSupported,
  ] =
    useState(false);

  const requestWakeLock =
    useCallback(
      async () => {
        if (
          !(
            "wakeLock" in
            navigator
          )
        ) {
          setWakeLockSupported(
            false
          );

          return;
        }

        setWakeLockSupported(
          true
        );

        if (
          document.visibilityState !==
          "visible"
        ) {
          return;
        }

        try {
          if (
            wakeLockRef.current &&
            !wakeLockRef.current
              .released
          ) {
            return;
          }

          const lock =
            await navigator
              .wakeLock
              .request(
                "screen"
              );

          wakeLockRef.current =
            lock;

          setWakeLockActive(
            true
          );

          lock.addEventListener(
            "release",
            () => {
              setWakeLockActive(
                false
              );

              wakeLockRef.current =
                null;
            }
          );
        } catch (
          error
        ) {
          console.error(
            "Unable to acquire screen wake lock:",
            error
          );

          setWakeLockActive(
            false
          );
        }
      },
      []
    );

  useEffect(() => {
    setIsOnline(
      navigator.onLine
    );

    setFullscreenSupported(
      typeof document
        .documentElement
        .requestFullscreen ===
        "function"
    );

    setIsFullscreen(
      Boolean(
        document
          .fullscreenElement
      )
    );

    setWakeLockSupported(
      "wakeLock" in
        navigator
    );

    function handleOnline() {
      setIsOnline(
        true
      );
    }

    function handleOffline() {
      setIsOnline(
        false
      );
    }

    function handleFullscreenChange() {
      setIsFullscreen(
        Boolean(
          document
            .fullscreenElement
        )
      );
    }

    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void requestWakeLock();
      }
    }

    window.addEventListener(
      "online",
      handleOnline
    );

    window.addEventListener(
      "offline",
      handleOffline
    );

    document.addEventListener(
      "fullscreenchange",
      handleFullscreenChange
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    void requestWakeLock();

    return () => {
      window.removeEventListener(
        "online",
        handleOnline
      );

      window.removeEventListener(
        "offline",
        handleOffline
      );

      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      const currentLock =
        wakeLockRef.current;

      wakeLockRef.current =
        null;

      if (
        currentLock &&
        !currentLock.released
      ) {
        void currentLock.release();
      }
    };
  }, [requestWakeLock]);

  async function toggleFullscreen() {
    try {
      if (
        document
          .fullscreenElement
      ) {
        await document
          .exitFullscreen();

        return;
      }

      if (
        document
          .documentElement
          .requestFullscreen
      ) {
        await document
          .documentElement
          .requestFullscreen();
      }
    } catch (
      error
    ) {
      console.error(
        "Unable to change fullscreen state:",
        error
      );
    }
  }

  return (
    <div className="min-h-dvh overscroll-none bg-slate-50 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
            <MonitorSmartphone
              size={19}
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Kiosk Mode
            </p>

            <p className="truncate text-sm font-bold text-slate-950">
              {title}
            </p>
          </div>

          <ConnectionBadge
            isOnline={
              isOnline
            }
          />

          {fullscreenSupported && (
            <button
              type="button"
              onClick={
                toggleFullscreen
              }
              aria-label={
                isFullscreen
                  ? "Exit fullscreen"
                  : "Enter fullscreen"
              }
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
            >
              {isFullscreen ? (
                <Minimize2
                  size={18}
                />
              ) : (
                <Maximize2
                  size={18}
                />
              )}
            </button>
          )}

          <Link
            href={`/attendance/${sessionId}`}
            aria-label="Exit kiosk mode"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
          >
            <ArrowLeft
              size={18}
            />
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 py-5">
        {!isOnline && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <WifiOff
              size={19}
              className="mt-0.5 shrink-0 text-amber-700"
            />

            <div>
              <p className="text-sm font-semibold text-amber-900">
                You are offline
              </p>

              <p className="mt-0.5 text-xs leading-5 text-amber-700">
                Offline check-in
                syncing will be
                added in the next
                Phase 5 steps.
                Reconnect before
                recording new
                attendance for now.
              </p>
            </div>
          </div>
        )}

        <section className="rounded-3xl bg-slate-950 p-5 text-white shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[10px] font-semibold text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

                Attendance Open
              </div>

              <h1 className="mt-3 text-xl font-bold tracking-tight">
                {title}
              </h1>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2">
              <UsersRound
                size={17}
                className="text-slate-300"
              />

              <span className="text-lg font-bold">
                {
                  attendanceCount
                }
              </span>
            </div>
          </div>

          <div className="mt-5 grid gap-2 border-t border-white/10 pt-4">
            <KioskDetail
              icon={
                <CalendarDays
                  size={15}
                />
              }
            >
              {dateLabel}
            </KioskDetail>

            <KioskDetail
              icon={
                <Clock3
                  size={15}
                />
              }
            >
              {timeLabel}
            </KioskDetail>

            {location && (
              <KioskDetail
                icon={
                  <MapPin
                    size={15}
                  />
                }
              >
                {location}
              </KioskDetail>
            )}
          </div>
        </section>

        <div className="mt-3 flex flex-wrap items-center gap-2 px-1">
          {wakeLockSupported && (
            <div
              className={`inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[10px] font-semibold ${
                wakeLockActive
                  ? "bg-violet-50 text-violet-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              <MoonStar
                size={12}
              />

              {wakeLockActive
                ? "Screen Awake"
                : "Wake Lock Available"}
            </div>
          )}

          <div className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 text-[10px] font-semibold text-slate-500">
            <MonitorSmartphone
              size={12}
            />

            Shared Device
          </div>
        </div>

        <div className="mt-5">
          <AttendanceWorkspace
            sessionId={
              sessionId
            }
            timezone={
              timezone
            }
          />
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center">
          <p className="text-xs leading-5 text-slate-500">
            Exit Kiosk Mode to
            complete attendance or
            manage the session.
          </p>
        </div>
      </main>
    </div>
  );
}

function ConnectionBadge({
  isOnline,
}: {
  isOnline: boolean;
}) {
  return (
    <div
      className={`hidden h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[10px] font-semibold sm:inline-flex ${
        isOnline
          ? "bg-emerald-50 text-emerald-700"
          : "bg-amber-50 text-amber-700"
      }`}
    >
      {isOnline ? (
        <Wifi
          size={13}
        />
      ) : (
        <WifiOff
          size={13}
        />
      )}

      {isOnline
        ? "Online"
        : "Offline"}
    </div>
  );
}

function KioskDetail({
  icon,
  children,
}: {
  icon:
    React.ReactNode;

  children:
    React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 text-sm text-slate-300">
      <span className="mt-0.5 shrink-0 text-slate-400">
        {icon}
      </span>

      <span>
        {children}
      </span>
    </div>
  );
}
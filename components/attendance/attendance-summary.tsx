"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ContactRound,
  QrCode,
  ScanFace,
  UserRound,
  UsersRound,
} from "lucide-react";

import type {
  AttendanceSessionSummary,
} from "@/lib/attendance";

import {
  getAttendanceSummaryAction,
} from "@/app/(app)/attendance/summary-actions";

interface AttendanceSummaryProps {
  sessionId: string;

  initialSummary:
    AttendanceSessionSummary;

  mode:
    | "live"
    | "final";
}

export function AttendanceSummary({
  sessionId,
  initialSummary,
  mode,
}: AttendanceSummaryProps) {
  const [
    summary,
    setSummary,
  ] =
    useState(
      initialSummary
    );

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const isLive =
    mode === "live";

  useEffect(() => {
    setSummary(
      initialSummary
    );
  }, [initialSummary]);

  const refreshSummary =
    useCallback(
      async () => {
        const result =
          await getAttendanceSummaryAction(
            sessionId
          );

        if (
          result.success
        ) {
          setSummary(
            result.summary
          );

          setError(null);

          return;
        }

        setError(
          result.message
        );
      },
      [sessionId]
    );

  useEffect(() => {
    if (!isLive) {
      return;
    }

    const interval =
      window.setInterval(
        () => {
          if (
            document.visibilityState ===
            "visible"
          ) {
            void refreshSummary();
          }
        },
        5000
      );

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [
    isLive,
    refreshSummary,
  ]);

  return (
    <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-bold text-slate-950">
              Attendance Summary
            </h2>

            {isLive ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

                Live
              </span>
            ) : (
              <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">
                Final
              </span>
            )}
          </div>

          <p className="mt-1 text-xs text-slate-500">
            Attendance breakdown
            for this session.
          </p>
        </div>

        <div className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-slate-950 px-3 text-sm font-bold text-white">
          <UsersRound
            size={16}
          />

          {
            summary.total
          }
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          {error}
        </div>
      )}

      <div className="mt-5 grid grid-cols-3 gap-2">
        <SummaryMetric
          icon={
            <UserRound
              size={16}
            />
          }
          value={
            summary
              .byMemberType
              .member
          }
          label="Members"
        />

        <SummaryMetric
          icon={
            <UsersRound
              size={16}
            />
          }
          value={
            summary
              .byMemberType
              .regular_attendee
          }
          label="Regular"
        />

        <SummaryMetric
          icon={
            <ContactRound
              size={16}
            />
          }
          value={
            summary
              .byMemberType
              .visitor
          }
          label="Visitors"
        />
      </div>

      <div className="mt-4 border-t border-slate-100 pt-4">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Check-In Methods
        </p>

        <div className="mt-2 flex flex-wrap gap-2">
          <MethodMetric
            icon={
              <UserRound
                size={13}
              />
            }
            label="Manual"
            value={
              summary
                .byMethod
                .manual
            }
          />

          <MethodMetric
            icon={
              <ScanFace
                size={13}
              />
            }
            label="Face"
            value={
              summary
                .byMethod
                .face
            }
          />

          <MethodMetric
            icon={
              <QrCode
                size={13}
              />
            }
            label="QR"
            value={
              summary
                .byMethod
                .qr
            }
          />
        </div>
      </div>
    </section>
  );
}

function SummaryMetric({
  icon,
  value,
  label,
}: {
  icon:
    React.ReactNode;

  value: number;

  label: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl bg-slate-50 px-2 py-3 text-center">
      <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
        {icon}
      </div>

      <p className="mt-2 text-lg font-bold leading-none text-slate-950">
        {value}
      </p>

      <p className="mt-1 truncate text-[10px] font-medium text-slate-500">
        {label}
      </p>
    </div>
  );
}

function MethodMetric({
  icon,
  label,
  value,
}: {
  icon:
    React.ReactNode;

  label: string;

  value: number;
}) {
  return (
    <div className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 text-xs font-medium text-slate-600">
      {icon}

      <span>
        {label}
      </span>

      <span className="font-bold text-slate-950">
        {value}
      </span>
    </div>
  );
}
import Link from "next/link";

import {
  ArrowLeft,
} from "lucide-react";

import {
  notFound,
  redirect,
} from "next/navigation";

import {
  SessionEditForm,
} from "@/components/events/session-edit-form";

import {
  SessionManagementActions,
} from "@/components/events/session-management-actions";

import {
  SessionStatusBadge,
} from "@/components/events/session-status-badge";

import {
  getCurrentUserRole,
  getEventSessionDetail,
} from "@/lib/events/queries";

import {
  eventIdSchema,
  eventSessionIdSchema,
} from "@/lib/events/validation";

interface SessionEditPageProps {
  params: Promise<{
    id: string;
    sessionId: string;
  }>;
}

function getLocalTime(
  value: string,
  timezone: string,
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      },
    ).formatToParts(
      new Date(value),
    );

  const values: Record<
    string,
    string
  > = {};

  for (
    const part
    of parts
  ) {
    if (
      part.type !==
      "literal"
    ) {
      values[part.type] =
        part.value;
    }
  }

  return `${values.hour}:${values.minute}`;
}

export default async function SessionEditPage({
  params,
}: SessionEditPageProps) {
  const {
    id,
    sessionId,
  } = await params;

  const parsedEventId =
    eventIdSchema.safeParse(
      id,
    );

  const parsedSessionId =
    eventSessionIdSchema.safeParse(
      sessionId,
    );

  if (
    !parsedEventId.success ||
    !parsedSessionId.success
  ) {
    notFound();
  }

  const [
    role,
    detail,
  ] = await Promise.all([
    getCurrentUserRole(),

    getEventSessionDetail(
      parsedEventId.data,
      parsedSessionId.data,
    ),
  ]);

  if (!detail) {
    notFound();
  }

  if (
    role !== "admin"
  ) {
    redirect(
      `/events/${detail.event.id}`,
    );
  }

  const durationMinutes =
    Math.max(
      1,
      Math.round(
        (
          new Date(
            detail.session.ends_at,
          ).getTime() -
          new Date(
            detail.session.starts_at,
          ).getTime()
        ) /
          60_000,
      ),
    );

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 pb-28">
      <Link
        href={`/events/${detail.event.id}`}
        className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950"
      >
        <ArrowLeft
          size={17}
        />
        {detail.event.name}
      </Link>

      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">
              Manage Session
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Changes apply only
              to this occurrence.
            </p>
          </div>

          <SessionStatusBadge
            status={
              detail.session.status
            }
          />
        </div>
      </div>

      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-slate-950">
          Session status
        </p>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          Cancelling this
          session does not cancel
          the recurring event or
          any other date.
        </p>

        <div className="mt-4">
          <SessionManagementActions
            eventId={
              detail.event.id
            }
            sessionId={
              detail.session.id
            }
            status={
              detail.session.status
            }
          />
        </div>
      </div>

      <SessionEditForm
        eventId={
          detail.event.id
        }
        sessionId={
          detail.session.id
        }
        initialValues={{
          sessionDate:
            detail.session.session_date,

          startTime:
            getLocalTime(
              detail.session.starts_at,
              detail.event.timezone,
            ),

          durationMinutes:
            String(
              durationMinutes,
            ),

          titleOverride:
            detail.session.title_override ??
            "",

          locationOverride:
            detail.session.location_override ??
            "",

          notes:
            detail.session.notes ??
            "",
        }}
      />
    </div>
  );
}
import Link from "next/link";

import {
  ArrowLeft,
} from "lucide-react";

import {
  notFound,
  redirect,
} from "next/navigation";

import {
  EventForm,
} from "@/components/events/event-form";

import {
  getCurrentUserRole,
  getEventById,
} from "@/lib/events/queries";

import {
  eventIdSchema,
} from "@/lib/events/validation";

interface EditEventPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditEventPage({
  params,
}: EditEventPageProps) {
  const {
    id,
  } = await params;

  const parsed =
    eventIdSchema.safeParse(
      id,
    );

  if (!parsed.success) {
    notFound();
  }

  const [
    role,
    event,
  ] = await Promise.all([
    getCurrentUserRole(),
    getEventById(
      parsed.data,
    ),
  ]);

  if (!event) {
    notFound();
  }

  if (
    role !== "admin"
  ) {
    redirect(
      `/events/${event.id}`,
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 pb-32">
      <Link
        href={`/events/${event.id}`}
        className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950"
      >
        <ArrowLeft
          size={17}
        />
        Event
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">
          Edit Event
        </h1>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          Update event details
          and its recurring
          schedule.
        </p>
      </div>

      <EventForm
        mode="edit"
        eventId={
          event.id
        }
        defaultStartDate={
          event.starts_on
        }
        initialValues={{
          name:
            event.name,

          description:
            event.description ??
            "",

          eventType:
            event.event_type,

          location:
            event.location ??
            "",

          status:
            event.status,

          recurrence:
            event.recurrence,

          recurrenceInterval:
            String(
              event.recurrence_interval,
            ),

          daysOfWeek:
            event.days_of_week,

          dayOfMonth:
            event.day_of_month ===
            null
              ? "1"
              : String(
                  event.day_of_month,
                ),

          startsOn:
            event.starts_on,

          endsOn:
            event.ends_on ??
            "",

          defaultStartTime:
            event.default_start_time.slice(
              0,
              5,
            ),

          durationMinutes:
            String(
              event.duration_minutes,
            ),
        }}
      />
    </div>
  );
}
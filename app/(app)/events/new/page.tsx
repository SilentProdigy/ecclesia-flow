import Link from "next/link";

import {
  ArrowLeft,
} from "lucide-react";

import {
  redirect,
} from "next/navigation";

import {
  EventForm,
} from "@/components/events/event-form";

import {
  getCurrentUserRole,
} from "@/lib/events/queries";

function getTodayInTimezone(
  timezone: string,
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      },
    ).formatToParts(
      new Date(),
    );

  const values: Record<
    string,
    string
  > = {};

  for (const part of parts) {
    if (
      part.type !==
      "literal"
    ) {
      values[part.type] =
        part.value;
    }
  }

  return `${values.year}-${values.month}-${values.day}`;
}

export default async function NewEventPage() {
  const role =
    await getCurrentUserRole();

  if (role !== "admin") {
    redirect("/events");
  }

  const defaultStartDate =
    getTodayInTimezone(
      "Asia/Manila",
    );

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 pb-32">
      <Link
        href="/events"
        className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950"
      >
        <ArrowLeft
          size={17}
        />
        Events
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">
          Create Event
        </h1>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          Create a church
          service, meeting, or
          scheduled activity.
        </p>
      </div>

      <EventForm
        defaultStartDate={
          defaultStartDate
        }
      />
    </div>
  );
}
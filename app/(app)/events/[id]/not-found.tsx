import Link from "next/link";

import {
  ArrowLeft,
  CalendarX2,
} from "lucide-react";

export default function EventNotFound() {
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
          <CalendarX2
            size={28}
            className="text-slate-500"
          />
        </div>

        <h1 className="mt-4 text-xl font-bold text-slate-950">
          Event Not Found
        </h1>

        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
          This event does not
          exist, or the record is
          no longer available.
        </p>

        <Link
          href="/events"
          className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <ArrowLeft
            size={17}
          />
          Back to Events
        </Link>
      </section>
    </div>
  );
}
import Link from "next/link";

import {
  ArrowLeft,
  MonitorX,
} from "lucide-react";

export default function KioskSessionNotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-8">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
          <MonitorX
            size={27}
            className="text-slate-500"
          />
        </div>

        <h1 className="mt-4 text-xl font-bold text-slate-950">
          Kiosk Session Not Found
        </h1>

        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
          This attendance session
          is unavailable or no
          longer exists.
        </p>

        <Link
          href="/attendance"
          className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white"
        >
          <ArrowLeft
            size={17}
          />

          Back to Attendance
        </Link>
      </section>
    </div>
  );
}
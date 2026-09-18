"use client";

import {
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

interface MembersErrorProps {
  error: Error & {
    digest?: string;
  };

  reset: () => void;
}

export default function MembersError({
  error,
  reset,
}: MembersErrorProps) {
  console.error(
    "Members module error:",
    error
  );

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <section className="rounded-3xl border border-red-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
          <AlertTriangle
            size={27}
            className="text-red-600"
          />
        </div>

        <h1 className="mt-4 text-xl font-bold text-slate-950">
          Unable to load members
        </h1>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          Ecclesia Flow could not load
          the member information.
          Please try again.
        </p>

        <button
          type="button"
          onClick={reset}
          className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <RefreshCw size={17} />
          Try Again
        </button>
      </section>
    </div>
  );
}
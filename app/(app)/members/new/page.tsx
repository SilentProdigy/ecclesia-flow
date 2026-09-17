import Link from "next/link";

import {
  ArrowLeft,
  UserRoundPlus,
} from "lucide-react";

export default function NewMemberPage() {
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6">
      <Link
        href="/members"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-950"
      >
        <ArrowLeft size={17} />
        Members
      </Link>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
          <UserRoundPlus
            size={26}
            className="text-slate-700"
          />
        </div>

        <h1 className="mt-4 text-xl font-bold text-slate-950">
          Add Member
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          The member registration form
          will be added in step #25.
        </p>
      </div>
    </div>
  );
}
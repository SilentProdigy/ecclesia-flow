import Link from "next/link";

import {
  ArrowLeft,
} from "lucide-react";

import {
  MemberForm,
} from "@/components/members/member-form";

export default function NewMemberPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <Link
        href="/members"
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-950"
      >
        <ArrowLeft size={17} />
        Back to Members
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">
          Register Member
        </h1>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          Add a member, regular
          attendee, or visitor to
          Ecclesia Flow.
        </p>
      </div>

      <MemberForm />
    </div>
  );
}
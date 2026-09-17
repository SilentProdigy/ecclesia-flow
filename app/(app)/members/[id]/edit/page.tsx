import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ArrowLeft,
  Edit3,
} from "lucide-react";

import {
  getMemberProfile,
} from "@/lib/members/member-profile.server";

import {
  getMemberFullName,
} from "@/lib/members";

interface EditMemberPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditMemberPage({
  params,
}: EditMemberPageProps) {
  const { id } = await params;

  const result =
    await getMemberProfile(id);

  if (!result) {
    notFound();
  }

  const name =
    getMemberFullName(
      result.member
    );

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6">
      <Link
        href={`/members/${id}`}
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-950"
      >
        <ArrowLeft size={17} />
        Back to Profile
      </Link>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
          <Edit3
            size={26}
            className="text-slate-700"
          />
        </div>

        <h1 className="mt-4 text-xl font-bold text-slate-950">
          Edit {name}
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Member editing and
          active/inactive management
          will be implemented in
          step #27.
        </p>
      </div>
    </div>
  );
}
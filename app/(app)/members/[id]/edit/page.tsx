import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ArrowLeft,
} from "lucide-react";

import {
  getMemberProfile,
} from "@/lib/members/member-profile.server";

import {
  formatMemberNumber,
  getMemberFullName,
} from "@/lib/members";

import {
  MemberEditForm,
} from "@/components/members/member-edit-form";

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

  const {
    member,
    photoUrl,
  } = result;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <Link
        href={`/members/${id}`}
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-950"
      >
        <ArrowLeft size={17} />
        Back to Profile
      </Link>

      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {formatMemberNumber(
            member.member_no
          )}
        </p>

        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
          Edit{" "}
          {getMemberFullName(
            member
          )}
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Update member information,
          status and profile photo.
        </p>
      </div>

      <MemberEditForm
        member={member}
        photoUrl={photoUrl}
      />
    </div>
  );
}
import Link from "next/link";

import {
  CheckCircle2,
  ChevronRight,
  CircleOff,
  Mail,
  Phone,
  ScanFace,
} from "lucide-react";

import type {
  MemberDirectoryItem,
} from "@/lib/members/member-directory.server";

import {
  formatMemberNumber,
  getFaceStatusLabel,
  getMemberFullName,
  getMemberTypeLabel,
} from "@/lib/members";

import {
  MemberAvatar,
} from "./member-avatar";

interface MemberCardProps {
  member: MemberDirectoryItem;
}

export function MemberCard({
  member,
}: MemberCardProps) {
  const fullName =
    getMemberFullName(member);

  return (
    <Link
      href={`/members/${member.id}`}
      className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex gap-3">
        <MemberAvatar
          member={member}
          photoUrl={member.photo_url}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate font-semibold text-slate-950">
                {fullName}
              </h2>

              {member.preferred_name && (
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  Preferred:{" "}
                  {member.preferred_name}
                </p>
              )}

              <p className="mt-1 text-xs font-medium text-slate-400">
                {formatMemberNumber(
                  member.member_no
                )}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {member.status ===
              "active" ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                  <CheckCircle2
                    size={12}
                  />
                  Active
                </span>
              ) : (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500">
                  <CircleOff
                    size={12}
                  />
                  Inactive
                </span>
              )}

              <ChevronRight
                size={17}
                className="text-slate-300"
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700">
              {getMemberTypeLabel(
                member.member_type
              )}
            </span>

            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                member.face_status ===
                "enrolled"
                  ? "bg-emerald-50 text-emerald-700"
                  : member.face_status ===
                      "disabled"
                    ? "bg-slate-100 text-slate-500"
                    : "bg-amber-50 text-amber-700"
              }`}
            >
              <ScanFace size={12} />
              Face:{" "}
              {getFaceStatusLabel(
                member.face_status
              )}
            </span>
          </div>

          {(member.phone ||
            member.email) && (
            <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3">
              {member.phone && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Phone size={13} />
                  <span className="truncate">
                    {member.phone}
                  </span>
                </div>
              )}

              {member.email && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Mail size={13} />
                  <span className="truncate">
                    {member.email}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
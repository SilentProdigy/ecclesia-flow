import {
  CheckCircle2,
  CircleOff,
  ScanFace,
} from "lucide-react";

import type {
  FaceEnrollmentStatus,
  MemberStatus,
  MemberType,
} from "@/lib/members";

import {
  getFaceStatusLabel,
  getMemberTypeLabel,
} from "@/lib/members";

interface MemberStatusBadgesProps {
  type: MemberType;
  status: MemberStatus;
  faceStatus: FaceEnrollmentStatus;
}

export function MemberStatusBadges({
  type,
  status,
  faceStatus,
}: MemberStatusBadgesProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
        {getMemberTypeLabel(type)}
      </span>

      {status === "active" ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
          <CheckCircle2 size={14} />
          Active
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">
          <CircleOff size={14} />
          Inactive
        </span>
      )}

      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
          faceStatus === "enrolled"
            ? "bg-emerald-50 text-emerald-700"
            : faceStatus === "disabled"
              ? "bg-slate-100 text-slate-500"
              : "bg-amber-50 text-amber-700"
        }`}
      >
        <ScanFace size={14} />
        Face:{" "}
        {getFaceStatusLabel(
          faceStatus
        )}
      </span>
    </div>
  );
}
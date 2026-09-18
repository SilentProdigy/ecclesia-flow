import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ArrowLeft,
  CheckCircle2,
  CircleOff,
  ScanFace,
  ShieldCheck,
} from "lucide-react";

import {
  formatMemberNumber,
  getFaceStatusLabel,
  getMemberFullName,
} from "@/lib/members";

import {
  getMemberProfile,
} from "@/lib/members/member-profile.server";

import {
  MemberAvatar,
} from "@/components/members/member-avatar";

interface FaceEnrollmentPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function FaceEnrollmentPage({
  params,
}: FaceEnrollmentPageProps) {
  const { id } =
    await params;

  const result =
    await getMemberProfile(id);

  if (!result) {
    notFound();
  }

  const {
    member,
    photoUrl,
  } = result;

  const fullName =
    getMemberFullName(member);

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6">
      <Link
        href={`/members/${member.id}`}
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-950"
      >
        <ArrowLeft size={17} />
        Back to Profile
      </Link>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <MemberAvatar
            member={member}
            photoUrl={photoUrl}
            size="lg"
          />

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {formatMemberNumber(
                member.member_no
              )}
            </p>

            <h1 className="mt-1 text-xl font-bold text-slate-950">
              {fullName}
            </h1>
          </div>
        </div>
      </section>

      <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
          <ScanFace
            size={30}
            className="text-slate-700"
          />
        </div>

        <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Current Status
        </p>

        <div className="mt-2">
          <FaceState
            status={
              member.face_status
            }
          />
        </div>

        <div className="mt-6 border-t border-slate-100 pt-5">
          {member.face_status ===
          "not_enrolled" ? (
            <>
              <h2 className="font-bold text-slate-950">
                Face Enrollment
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                This member has not
                yet completed biometric
                face enrollment.
              </p>

              <button
                type="button"
                disabled
                className="mt-5 flex h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-200 text-sm font-semibold text-slate-500"
              >
                <ScanFace
                  size={19}
                />
                Start Face Enrollment
              </button>
            </>
          ) : member.face_status ===
            "enrolled" ? (
            <>
              <h2 className="font-bold text-slate-950">
                Enrollment Complete
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                This member is marked
                as enrolled for future
                face-recognition
                attendance.
              </p>
            </>
          ) : (
            <>
              <h2 className="font-bold text-slate-950">
                Face Recognition
                Disabled
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Biometric face
                recognition is disabled
                for this member.
              </p>
            </>
          )}
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex gap-3">
          <ShieldCheck
            size={20}
            className="mt-0.5 shrink-0 text-blue-700"
          />

          <div>
            <p className="text-sm font-semibold text-blue-900">
              Biometric enrollment is
              not active yet
            </p>

            <p className="mt-1 text-xs leading-5 text-blue-700">
              Camera capture,
              liveness checks,
              biometric templates and
              face matching will be
              implemented in Phase 7.
              A normal profile photo
              does not count as face
              enrollment.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function FaceState({
  status,
}: {
  status:
    | "not_enrolled"
    | "enrolled"
    | "disabled";
}) {
  if (
    status === "enrolled"
  ) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
        <CheckCircle2
          size={17}
        />
        {getFaceStatusLabel(
          status
        )}
      </span>
    );
  }

  if (
    status === "disabled"
  ) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600">
        <CircleOff
          size={17}
        />
        {getFaceStatusLabel(
          status
        )}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
      <ScanFace size={17} />

      {getFaceStatusLabel(
        status
      )}
    </span>
  );
}
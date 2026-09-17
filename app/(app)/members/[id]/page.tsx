import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ArrowLeft,
  CalendarDays,
  Cake,
  Edit3,
  History,
  Home,
  Mail,
  MapPin,
  NotebookText,
  Phone,
  ScanFace,
  UserRound,
} from "lucide-react";

import {
  getMemberProfile,
} from "@/lib/members/member-profile.server";

import {
  formatMemberDate,
  formatMemberNumber,
  getMemberFullName,
} from "@/lib/members";

import {
  MemberAvatar,
} from "@/components/members/member-avatar";

import {
  MemberStatusBadges,
} from "@/components/members/member-status-badges";

interface MemberProfilePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function MemberProfilePage({
  params,
}: MemberProfilePageProps) {
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

  const fullName =
    getMemberFullName(member);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      {/* Back */}
      <Link
        href="/members"
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-950"
      >
        <ArrowLeft size={17} />
        Back to Members
      </Link>

      {/* Profile Header */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <MemberAvatar
            member={member}
            photoUrl={photoUrl}
            size="lg"
          />

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {formatMemberNumber(
                member.member_no
              )}
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
              {fullName}
            </h1>

            {member.preferred_name && (
              <p className="mt-1 text-sm text-slate-500">
                Preferred name:{" "}
                {member.preferred_name}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5">
          <MemberStatusBadges
            type={member.member_type}
            status={member.status}
            faceStatus={
              member.face_status
            }
          />
        </div>

        <Link
          href={`/members/${member.id}/edit`}
          className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <Edit3 size={17} />
          Edit Member
        </Link>
      </section>

      {/* Contact */}
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-950">
          Contact Information
        </h2>

        <div className="mt-4 divide-y divide-slate-100">
          <ProfileRow
            icon={<Phone size={18} />}
            label="Phone"
            value={
              member.phone ??
              "Not recorded"
            }
          />

          <ProfileRow
            icon={<Mail size={18} />}
            label="Email"
            value={
              member.email ??
              "Not recorded"
            }
          />

          <ProfileRow
            icon={<MapPin size={18} />}
            label="Address"
            value={
              member.address ??
              "Not recorded"
            }
          />
        </div>
      </section>

      {/* Personal */}
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-950">
          Personal Information
        </h2>

        <div className="mt-4 divide-y divide-slate-100">
          <ProfileRow
            icon={<Cake size={18} />}
            label="Date of Birth"
            value={formatMemberDate(
              member.date_of_birth
            )}
          />

          <ProfileRow
            icon={
              <UserRound size={18} />
            }
            label="Gender"
            value={
              member.gender ??
              "Not recorded"
            }
          />
        </div>
      </section>

      {/* Church History */}
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <History
            size={19}
            className="text-slate-500"
          />

          <h2 className="font-bold text-slate-950">
            Church History
          </h2>
        </div>

        <div className="mt-4 divide-y divide-slate-100">
          <ProfileRow
            icon={
              <CalendarDays
                size={18}
              />
            }
            label="First Attended"
            value={formatMemberDate(
              member.first_attended_on
            )}
          />

          <ProfileRow
            icon={<Home size={18} />}
            label="Member Since"
            value={formatMemberDate(
              member.member_since
            )}
          />
        </div>
      </section>

      {/* Face */}
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100">
            <ScanFace
              size={22}
              className="text-slate-700"
            />
          </div>

          <div>
            <h2 className="font-bold text-slate-950">
              Face Recognition
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              {member.face_status ===
              "enrolled"
                ? "This member has completed face enrollment."
                : member.face_status ===
                    "disabled"
                  ? "Face recognition is disabled for this member."
                  : "This member has not yet completed face enrollment."}
            </p>
          </div>
        </div>

        {member.face_status ===
          "not_enrolled" && (
          <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-700">
            Face enrollment will be
            available in the biometric
            attendance phase.
          </div>
        )}
      </section>

      {/* Attendance Placeholder */}
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <CalendarDays
            size={19}
            className="text-slate-500"
          />

          <h2 className="font-bold text-slate-950">
            Attendance History
          </h2>
        </div>

        <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
          <p className="text-sm font-medium text-slate-700">
            No attendance records yet
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Service and event
            attendance will appear
            here once the attendance
            module is active.
          </p>
        </div>
      </section>

      {/* Notes */}
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <NotebookText
            size={19}
            className="text-slate-500"
          />

          <h2 className="font-bold text-slate-950">
            Staff Notes
          </h2>
        </div>

        {member.notes ? (
          <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">
            {member.notes}
          </p>
        ) : (
          <p className="mt-4 text-sm text-slate-400">
            No notes recorded.
          </p>
        )}
      </section>

      {/* Registration Metadata */}
      <section className="mt-5 pb-4 text-center">
        <p className="text-xs text-slate-400">
          Registered{" "}
          {formatTimestamp(
            member.created_at
          )}
        </p>
      </section>
    </div>
  );
}

function ProfileRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <div className="mt-0.5 text-slate-400">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-400">
          {label}
        </p>

        <p className="mt-1 break-words text-sm font-medium text-slate-800">
          {value}
        </p>
      </div>
    </div>
  );
}

function formatTimestamp(
  value: string
) {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  ).format(new Date(value));
}
import {
  UserRound,
} from "lucide-react";

import type {
  MemberListItem,
} from "@/lib/members";

import {
  getMemberInitials,
} from "@/lib/members";

interface MemberAvatarProps {
  member: MemberListItem;
  photoUrl?: string | null;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: "h-10 w-10 text-xs",
  md: "h-14 w-14 text-sm",
  lg: "h-20 w-20 text-lg",
};

export function MemberAvatar({
  member,
  photoUrl,
  size = "md",
}: MemberAvatarProps) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        className={`${sizes[size]} shrink-0 rounded-full border border-slate-200 object-cover`}
      />
    );
  }

  const initials =
    getMemberInitials(member);

  if (!initials) {
    return (
      <div
        className={`${sizes[size]} flex shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500`}
      >
        <UserRound size={22} />
      </div>
    );
  }

  return (
    <div
      className={`${sizes[size]} flex shrink-0 items-center justify-center rounded-full bg-slate-900 font-bold text-white`}
    >
      {initials}
    </div>
  );
}
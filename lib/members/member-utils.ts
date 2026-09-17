import type {
  FaceEnrollmentStatus,
  Member,
  MemberStatus,
  MemberType,
} from "./member-types";

export function getMemberFullName(
  member: Pick<
    Member,
    | "first_name"
    | "middle_name"
    | "last_name"
    | "suffix"
  >
) {
  return [
    member.first_name,
    member.middle_name,
    member.last_name,
    member.suffix,
  ]
    .filter(Boolean)
    .join(" ");
}

export function getMemberDisplayName(
  member: Pick<
    Member,
    | "first_name"
    | "middle_name"
    | "last_name"
    | "suffix"
    | "preferred_name"
  >
) {
  if (member.preferred_name) {
    return member.preferred_name;
  }

  return getMemberFullName(member);
}

export function formatMemberNumber(
  memberNo: number
) {
  return `EC-${String(memberNo).padStart(
    6,
    "0"
  )}`;
}

export function getMemberTypeLabel(
  type: MemberType
) {
  switch (type) {
    case "member":
      return "Member";

    case "regular_attendee":
      return "Regular Attendee";

    case "visitor":
      return "Visitor";
  }
}

export function getMemberStatusLabel(
  status: MemberStatus
) {
  switch (status) {
    case "active":
      return "Active";

    case "inactive":
      return "Inactive";
  }
}

export function getFaceStatusLabel(
  status: FaceEnrollmentStatus
) {
  switch (status) {
    case "not_enrolled":
      return "Not Enrolled";

    case "enrolled":
      return "Enrolled";

    case "disabled":
      return "Disabled";
  }
}

export function getMemberInitials(
  member: Pick<
    Member,
    "first_name" | "last_name"
  >
) {
  const first =
    member.first_name
      ?.trim()
      .charAt(0)
      .toUpperCase() ?? "";

  const last =
    member.last_name
      ?.trim()
      .charAt(0)
      .toUpperCase() ?? "";

  return `${first}${last}` || "M";
}
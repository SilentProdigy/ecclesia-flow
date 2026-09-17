import type {
  MemberStatus,
  MemberType,
} from "./member-types";

interface MemberTypeOption {
  value: MemberType;
  label: string;
  description: string;
}

interface MemberStatusOption {
  value: MemberStatus;
  label: string;
}

export const MEMBER_TYPE_OPTIONS: MemberTypeOption[] =
  [
    {
      value: "member",
      label: "Member",
      description:
        "An established church member.",
    },
    {
      value: "regular_attendee",
      label: "Regular Attendee",
      description:
        "Regularly attends but is not registered as a church member.",
    },
    {
      value: "visitor",
      label: "Visitor",
      description:
        "A first-time or occasional visitor.",
    },
  ];

export const MEMBER_STATUS_OPTIONS: MemberStatusOption[] =
  [
    {
      value: "active",
      label: "Active",
    },
    {
      value: "inactive",
      label: "Inactive",
    },
  ];
import type { MemberFormValues } from "./member-types";

export const DEFAULT_MEMBER_FORM_VALUES: MemberFormValues =
  {
    first_name: "",
    middle_name: null,
    last_name: "",
    suffix: null,
    preferred_name: null,

    phone: null,
    email: null,

    date_of_birth: null,
    gender: null,
    address: null,

    member_type: "member",
    status: "active",

    member_since: null,
    first_attended_on: null,

    notes: null,
  };
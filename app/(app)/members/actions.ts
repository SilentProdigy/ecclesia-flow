"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

import {
  createMemberSchema,
  memberIdSchema,
  updateMemberSchema,
} from "@/lib/members";

export interface CreatedMemberResult {
  id: string;
  member_no: number;
}

export type MemberActionResult =
  | {
      success: true;
    }
  | {
      success: false;
      message: string;
      fieldErrors?: Record<string, string[]>;
    };

export type CreateMemberActionResult =
  | {
      success: true;
      member: CreatedMemberResult;
    }
  | {
      success: false;
      message: string;
      fieldErrors?: Record<string, string[]>;
    };

function collectFieldErrors(
  issues: Array<{
    path: PropertyKey[];
    message: string;
  }>
) {
  const errors: Record<string, string[]> = {};

  for (const issue of issues) {
    const field = issue.path[0];

    if (typeof field !== "string") {
      continue;
    }

    if (!errors[field]) {
      errors[field] = [];
    }

    errors[field].push(issue.message);
  }

  return errors;
}

async function getAuthenticatedStaff() {
  const supabase = await createClient();

  const { data: claimsData } =
    await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub;

  if (!userId) {
    return {
      supabase,
      allowed: false as const,
      message:
        "Your session has expired. Please sign in again.",
    };
  }

  const {
    data: profile,
    error,
  } = await supabase
    .from("profiles")
    .select("id, is_active")
    .eq("id", userId)
    .single();

  if (
    error ||
    !profile ||
    !profile.is_active
  ) {
    return {
      supabase,
      allowed: false as const,
      message:
        "Your staff account is not allowed to perform this action.",
    };
  }

  return {
    supabase,
    allowed: true as const,
    userId,
  };
}

export async function createMemberAction(
  input: unknown
): Promise<CreateMemberActionResult> {
  const parsed =
    createMemberSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message:
        "Please check the highlighted fields.",
      fieldErrors: collectFieldErrors(
        parsed.error.issues
      ),
    };
  }

  const auth =
    await getAuthenticatedStaff();

  if (!auth.allowed) {
    return {
      success: false,
      message: auth.message,
    };
  }

  const {
    data: member,
    error,
  } = await auth.supabase
    .from("members")
    .insert(parsed.data)
    .select("id, member_no")
    .single();

  if (error) {
    console.error(
      "Member creation failed:",
      error
    );

    return {
      success: false,
      message:
        "Unable to register the member. Please try again.",
    };
  }

  revalidatePath("/members");

  return {
    success: true,
    member,
  };
}

export async function updateMemberAction(
  memberId: string,
  input: unknown
): Promise<MemberActionResult> {
  const parsedId =
    memberIdSchema.safeParse(memberId);

  if (!parsedId.success) {
    return {
      success: false,
      message: "Invalid member ID.",
    };
  }

  const parsed =
    updateMemberSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message:
        "Please check the highlighted fields.",
      fieldErrors: collectFieldErrors(
        parsed.error.issues
      ),
    };
  }

  const auth =
    await getAuthenticatedStaff();

  if (!auth.allowed) {
    return {
      success: false,
      message: auth.message,
    };
  }

  const {
    data: existingMember,
    error: memberError,
  } = await auth.supabase
    .from("members")
    .select("id")
    .eq("id", parsedId.data)
    .maybeSingle();

  if (
    memberError ||
    !existingMember
  ) {
    return {
      success: false,
      message:
        "The member could not be found.",
    };
  }

  const { error } =
    await auth.supabase
      .from("members")
      .update(parsed.data)
      .eq("id", parsedId.data);

  if (error) {
    console.error(
      "Member update failed:",
      error
    );

    return {
      success: false,
      message:
        "Unable to update the member. Please try again.",
    };
  }

  revalidatePath("/members");
  revalidatePath(
    `/members/${parsedId.data}`
  );
  revalidatePath(
    `/members/${parsedId.data}/edit`
  );

  return {
    success: true,
  };
}
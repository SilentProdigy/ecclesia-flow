"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createMemberSchema } from "@/lib/members";

export interface CreatedMemberResult {
  id: string;
  member_no: number;
}

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

  const supabase = await createClient();

  const { data: claimsData } =
    await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub;

  if (!userId) {
    return {
      success: false,
      message:
        "Your session has expired. Please sign in again.",
    };
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("id, is_active")
    .eq("id", userId)
    .single();

  if (
    profileError ||
    !profile ||
    !profile.is_active
  ) {
    return {
      success: false,
      message:
        "Your staff account is not allowed to register members.",
    };
  }

  const {
    data: member,
    error,
  } = await supabase
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
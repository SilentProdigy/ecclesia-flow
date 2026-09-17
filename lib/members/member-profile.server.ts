import "server-only";

import { createClient } from "@/lib/supabase/server";
import { memberIdSchema } from "./member-schema";
import { getMemberPhotoUrl } from "./member-photo.server";
import type { Member } from "./member-types";

export interface MemberProfileResult {
  member: Member;
  photoUrl: string | null;
}

export async function getMemberProfile(
  memberId: string
): Promise<MemberProfileResult | null> {
  const parsedId =
    memberIdSchema.safeParse(memberId);

  if (!parsedId.success) {
    return null;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("members")
    .select(`
      id,
      member_no,
      first_name,
      middle_name,
      last_name,
      suffix,
      preferred_name,
      phone,
      email,
      date_of_birth,
      gender,
      address,
      member_type,
      status,
      member_since,
      first_attended_on,
      photo_path,
      face_status,
      notes,
      created_by,
      updated_by,
      created_at,
      updated_at
    `)
    .eq("id", parsedId.data)
    .maybeSingle();

  if (error) {
    console.error(
      "Unable to load member profile:",
      error
    );

    throw new Error(
      "Unable to load member profile."
    );
  }

  if (!data) {
    return null;
  }

  const member = data as Member;

  const photoUrl =
    await getMemberPhotoUrl(
      member.photo_path
    );

  return {
    member,
    photoUrl,
  };
}
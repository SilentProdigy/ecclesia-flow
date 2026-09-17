import "server-only";

import { createClient } from "@/lib/supabase/server";

const BUCKET = "member-photos";

export async function getMemberPhotoUrl(
  photoPath: string | null | undefined
) {
  if (!photoPath) {
    return null;
  }

  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(
      photoPath,
      60 * 60
    );

  if (error) {
    console.error(
      "Unable to create member photo URL:",
      error
    );

    return null;
  }

  return data.signedUrl;
}
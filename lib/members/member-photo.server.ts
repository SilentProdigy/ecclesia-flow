import "server-only";

import { createClient } from "@/lib/supabase/server";

const BUCKET = "member-photos";

const SIGNED_URL_EXPIRY = 60 * 60;

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
      SIGNED_URL_EXPIRY
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

export async function getMemberPhotoUrls(
  photoPaths: Array<string | null | undefined>
) {
  const validPaths = Array.from(
    new Set(
      photoPaths.filter(
        (path): path is string =>
          typeof path === "string" &&
          path.length > 0
      )
    )
  );

  if (validPaths.length === 0) {
    return {} as Record<string, string>;
  }

  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(
      validPaths,
      SIGNED_URL_EXPIRY
    );

  if (error) {
    console.error(
      "Unable to create member photo URLs:",
      error
    );

    return {};
  }

  const urls: Record<string, string> = {};

  data?.forEach((item, index) => {
    const path = validPaths[index];

    if (path && item.signedUrl) {
      urls[path] = item.signedUrl;
    }
  });

  return urls;
}
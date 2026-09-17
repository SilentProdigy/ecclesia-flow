"use client";

import { createClient } from "@/lib/supabase/client";

const BUCKET = "member-photos";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function validateMemberPhoto(file: File) {
  if (!ALLOWED_TYPES.includes(file.type as (typeof ALLOWED_TYPES)[number])) {
    throw new Error(
      "Invalid photo format. Please use JPG, PNG, or WebP."
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      "Photo is too large. Maximum file size is 5 MB."
    );
  }

  if (file.size === 0) {
    throw new Error("The selected photo is empty.");
  }
}

export async function uploadMemberPhoto({
  memberId,
  file,
  currentPhotoPath,
}: {
  memberId: string;
  file: File;
  currentPhotoPath?: string | null;
}) {
  validateMemberPhoto(file);

  const supabase = createClient();

  const extension = EXTENSIONS[file.type];

  if (!extension) {
    throw new Error("Unsupported image format.");
  }

  const fileName = `${Date.now()}-${crypto.randomUUID()}.${extension}`;

  const path = `${memberId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { error: memberUpdateError } = await supabase
    .from("members")
    .update({
      photo_path: path,
    })
    .eq("id", memberId);

  if (memberUpdateError) {
    // Avoid leaving an orphaned file if member update fails.
    await supabase.storage
      .from(BUCKET)
      .remove([path]);

    throw new Error(memberUpdateError.message);
  }

  /*
   * Remove the previous photo only after the new photo
   * has been uploaded and saved successfully.
   */
  if (
    currentPhotoPath &&
    currentPhotoPath !== path
  ) {
    const { error: removeOldError } =
      await supabase.storage
        .from(BUCKET)
        .remove([currentPhotoPath]);

    if (removeOldError) {
      console.error(
        "Could not remove old member photo:",
        removeOldError
      );
    }
  }

  return path;
}

export async function deleteMemberPhoto({
  memberId,
  photoPath,
}: {
  memberId: string;
  photoPath: string;
}) {
  const supabase = createClient();

  /*
   * Clear the member record first.
   * If Storage cleanup fails afterwards, the only
   * consequence is an orphaned file rather than
   * a broken member profile.
   */
  const { error: memberUpdateError } = await supabase
    .from("members")
    .update({
      photo_path: null,
    })
    .eq("id", memberId);

  if (memberUpdateError) {
    throw new Error(memberUpdateError.message);
  }

  const { error: storageError } =
    await supabase.storage
      .from(BUCKET)
      .remove([photoPath]);

  if (storageError) {
    console.error(
      "Could not delete member photo from storage:",
      storageError
    );
  }
}
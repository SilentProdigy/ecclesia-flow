"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import {
  AlertCircle,
  Camera,
  CheckCircle2,
  ImagePlus,
  LoaderCircle,
  Save,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

import {
  updateMemberAction,
} from "@/app/(app)/members/actions";

import {
  MEMBER_TYPE_OPTIONS,
  type Member,
  type MemberStatus,
  type MemberType,
} from "@/lib/members";

import {
  deleteMemberPhoto,
  uploadMemberPhoto,
  validateMemberPhoto,
} from "@/lib/members/member-photo.client";

interface MemberEditFormProps {
  member: Member;
  photoUrl: string | null;
}

interface MemberEditDraft {
  first_name: string;
  middle_name: string;
  last_name: string;
  suffix: string;
  preferred_name: string;

  phone: string;
  email: string;

  date_of_birth: string;
  gender: string;
  address: string;

  member_type: MemberType;
  status: MemberStatus;

  member_since: string;
  first_attended_on: string;

  notes: string;
}

export function MemberEditForm({
  member,
  photoUrl,
}: MemberEditFormProps) {
  const router = useRouter();

  const cameraInputRef =
    useRef<HTMLInputElement>(null);

  const galleryInputRef =
    useRef<HTMLInputElement>(null);

  const [form, setForm] =
    useState<MemberEditDraft>({
      first_name: member.first_name,
      middle_name:
        member.middle_name ?? "",
      last_name: member.last_name,
      suffix: member.suffix ?? "",
      preferred_name:
        member.preferred_name ?? "",

      phone: member.phone ?? "",
      email: member.email ?? "",

      date_of_birth:
        member.date_of_birth ?? "",
      gender: member.gender ?? "",
      address: member.address ?? "",

      member_type:
        member.member_type,
      status: member.status,

      member_since:
        member.member_since ?? "",
      first_attended_on:
        member.first_attended_on ??
        "",

      notes: member.notes ?? "",
    });

  const [newPhoto, setNewPhoto] =
    useState<File | null>(null);

  const [
    newPhotoPreview,
    setNewPhotoPreview,
  ] = useState<string | null>(null);

  const [
    removeExistingPhoto,
    setRemoveExistingPhoto,
  ] = useState(false);

  const [
    photoError,
    setPhotoError,
  ] = useState("");

  const [
    generalError,
    setGeneralError,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [
    fieldErrors,
    setFieldErrors,
  ] = useState<
    Record<string, string[]>
  >({});

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  useEffect(() => {
    if (!newPhoto) {
      setNewPhotoPreview(null);
      return;
    }

    const url =
      URL.createObjectURL(newPhoto);

    setNewPhotoPreview(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [newPhoto]);

  function setValue<
    K extends keyof MemberEditDraft,
  >(
    key: K,
    value: MemberEditDraft[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    setFieldErrors((current) => {
      if (!current[key]) {
        return current;
      }

      const next = {
        ...current,
      };

      delete next[key];

      return next;
    });
  }

  function getFieldError(
    field: keyof MemberEditDraft
  ) {
    return fieldErrors[field]?.[0];
  }

  function inputClass(
    field: keyof MemberEditDraft
  ) {
    return `h-12 w-full rounded-xl border bg-white px-4 text-sm text-black placeholder:text-black outline-none transition ${
      getFieldError(field)
        ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/10"
        : "border-slate-300 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
    }`;
  }

  function textareaClass(
    field: keyof MemberEditDraft
  ) {
    return `w-full rounded-xl border bg-white px-4 py-3 text-sm text-black placeholder:text-black outline-none transition ${
      getFieldError(field)
        ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/10"
        : "border-slate-300 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
    }`;
  }

  function handlePhotoSelected(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      validateMemberPhoto(file);

      setNewPhoto(file);
      setRemoveExistingPhoto(false);
      setPhotoError("");
    } catch (error) {
      setNewPhoto(null);

      setPhotoError(
        error instanceof Error
          ? error.message
          : "Unable to use this photo."
      );
    }
  }

  function removeSelectedPhoto() {
    setNewPhoto(null);
    setPhotoError("");

    if (cameraInputRef.current) {
      cameraInputRef.current.value = "";
    }

    if (galleryInputRef.current) {
      galleryInputRef.current.value =
        "";
    }
  }

  function removeCurrentPhoto() {
    setNewPhoto(null);
    setRemoveExistingPhoto(true);
    setPhotoError("");
  }

  function restoreCurrentPhoto() {
    setRemoveExistingPhoto(false);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setSubmitting(true);
    setGeneralError("");
    setSuccessMessage("");
    setFieldErrors({});

    if (newPhoto) {
      try {
        validateMemberPhoto(
          newPhoto
        );
      } catch (error) {
        setPhotoError(
          error instanceof Error
            ? error.message
            : "Unable to use this photo."
        );

        setSubmitting(false);
        return;
      }
    }

    try {
      const result =
        await updateMemberAction(
          member.id,
          form
        );

      if (!result.success) {
        setGeneralError(
          result.message
        );

        setFieldErrors(
          result.fieldErrors ?? {}
        );

        setSubmitting(false);
        return;
      }

      /*
       * Replace photo only after normal member
       * information has been saved successfully.
       */
      if (newPhoto) {
        try {
          await uploadMemberPhoto({
            memberId: member.id,
            file: newPhoto,
            currentPhotoPath:
              member.photo_path,
          });
        } catch (error) {
          console.error(
            "Member updated but photo replacement failed:",
            error
          );

          setGeneralError(
            "Member details were saved, but the new profile photo could not be uploaded."
          );

          setSubmitting(false);
          return;
        }
      } else if (
        removeExistingPhoto &&
        member.photo_path
      ) {
        try {
          await deleteMemberPhoto({
            memberId: member.id,
            photoPath:
              member.photo_path,
          });
        } catch (error) {
          console.error(
            "Member updated but photo removal failed:",
            error
          );

          setGeneralError(
            "Member details were saved, but the profile photo could not be removed."
          );

          setSubmitting(false);
          return;
        }
      }

      setSuccessMessage(
        "Member updated successfully."
      );

      router.push(
        `/members/${member.id}?updated=1`
      );

      router.refresh();
    } catch (error) {
      console.error(
        "Member update failed:",
        error
      );

      setGeneralError(
        "Something went wrong while updating the member."
      );

      setSubmitting(false);
    }
  }

  const displayedPhoto =
    newPhotoPreview ??
    (!removeExistingPhoto
      ? photoUrl
      : null);

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      {generalError && (
        <div className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle
            size={20}
            className="mt-0.5 shrink-0"
          />

          <span>
            {generalError}
          </span>
        </div>
      )}

      {successMessage && (
        <div className="flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2
            size={20}
            className="mt-0.5 shrink-0"
          />

          <span>
            {successMessage}
          </span>
        </div>
      )}

      {/* Profile Photo */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-950">
          Profile Photo
        </h2>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          Profile photos are separate
          from biometric face
          enrollment.
        </p>

        <div className="mt-5 flex flex-col items-center">
          {displayedPhoto ? (
            <div className="relative">
              <img
                src={displayedPhoto}
                alt=""
                className="h-28 w-28 rounded-full border-4 border-white object-cover shadow-md ring-1 ring-slate-200"
              />

              {newPhoto ? (
                <button
                  type="button"
                  onClick={
                    removeSelectedPhoto
                  }
                  aria-label="Remove selected photo"
                  className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-white shadow"
                >
                  <X size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={
                    removeCurrentPhoto
                  }
                  aria-label="Remove profile photo"
                  className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white shadow"
                >
                  <Trash2
                    size={15}
                  />
                </button>
              )}
            </div>
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-slate-100">
              <UserRound
                size={38}
                className="text-slate-400"
              />
            </div>
          )}

          {removeExistingPhoto &&
            member.photo_path &&
            !newPhoto && (
              <button
                type="button"
                onClick={
                  restoreCurrentPhoto
                }
                className="mt-3 text-xs font-semibold text-slate-600 underline"
              >
                Keep current photo
              </button>
            )}

          <div className="mt-4 grid w-full grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                cameraInputRef.current?.click()
              }
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700"
            >
              <Camera size={17} />
              Take Photo
            </button>

            <button
              type="button"
              onClick={() =>
                galleryInputRef.current?.click()
              }
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700"
            >
              <ImagePlus size={17} />
              Choose
            </button>
          </div>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="user"
            onChange={
              handlePhotoSelected
            }
            className="hidden"
          />

          <input
            ref={galleryInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={
              handlePhotoSelected
            }
            className="hidden"
          />

          {photoError && (
            <p className="mt-3 text-center text-xs font-medium text-red-600">
              {photoError}
            </p>
          )}
        </div>
      </section>

      {/* Status */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-950">
          Member Status
        </h2>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          Deactivating a member does
          not delete their record or
          historical attendance.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <StatusOption
            active={
              form.status === "active"
            }
            label="Active"
            description="Can be used normally in attendance."
            onClick={() =>
              setValue(
                "status",
                "active"
              )
            }
          />

          <StatusOption
            active={
              form.status ===
              "inactive"
            }
            label="Inactive"
            description="Kept for historical records."
            onClick={() =>
              setValue(
                "status",
                "inactive"
              )
            }
          />
        </div>

        {form.status ===
          "inactive" && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
            This member will remain in
            Ecclesia Flow but can be
            excluded using the Active
            member filter.
          </div>
        )}
      </section>

      {/* Personal Information */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-950">
          Personal Information
        </h2>

        <div className="mt-5 space-y-4">
          <Field
            label="First Name"
            required
            error={getFieldError(
              "first_name"
            )}
          >
            <input
              type="text"
              value={form.first_name}
              onChange={(event) =>
                setValue(
                  "first_name",
                  event.target.value
                )
              }
              className={inputClass(
                "first_name"
              )}
            />
          </Field>

          <Field label="Middle Name">
            <input
              type="text"
              value={
                form.middle_name
              }
              onChange={(event) =>
                setValue(
                  "middle_name",
                  event.target.value
                )
              }
              className={inputClass(
                "middle_name"
              )}
            />
          </Field>

          <div className="grid grid-cols-[1fr_100px] gap-3">
            <Field
              label="Last Name"
              required
              error={getFieldError(
                "last_name"
              )}
            >
              <input
                type="text"
                value={
                  form.last_name
                }
                onChange={(event) =>
                  setValue(
                    "last_name",
                    event.target.value
                  )
                }
                className={inputClass(
                  "last_name"
                )}
              />
            </Field>

            <Field label="Suffix">
              <input
                type="text"
                value={form.suffix}
                onChange={(event) =>
                  setValue(
                    "suffix",
                    event.target.value
                  )
                }
                className={inputClass(
                  "suffix"
                )}
              />
            </Field>
          </div>

          <Field label="Preferred Name">
            <input
              type="text"
              value={
                form.preferred_name
              }
              onChange={(event) =>
                setValue(
                  "preferred_name",
                  event.target.value
                )
              }
              className={inputClass(
                "preferred_name"
              )}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Date of Birth"
              error={getFieldError(
                "date_of_birth"
              )}
            >
              <input
                type="date"
                value={
                  form.date_of_birth
                }
                onChange={(event) =>
                  setValue(
                    "date_of_birth",
                    event.target.value
                  )
                }
                className={inputClass(
                  "date_of_birth"
                )}
              />
            </Field>

            <Field label="Gender">
              <input
                type="text"
                value={form.gender}
                onChange={(event) =>
                  setValue(
                    "gender",
                    event.target.value
                  )
                }
                className={inputClass(
                  "gender"
                )}
              />
            </Field>
          </div>
        </div>
      </section>

      {/* Type */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-950">
          Attendee Type
        </h2>

        <div className="mt-4 space-y-2">
          {MEMBER_TYPE_OPTIONS.map(
            (option) => {
              const active =
                form.member_type ===
                option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    setValue(
                      "member_type",
                      option.value
                    )
                  }
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    active
                      ? "border-slate-950 bg-slate-50 ring-1 ring-slate-950"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                        active
                          ? "border-slate-950 bg-slate-950"
                          : "border-slate-300"
                      }`}
                    >
                      {active && (
                        <CheckCircle2
                          size={14}
                          className="text-white"
                        />
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        {
                          option.label
                        }
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {
                          option.description
                        }
                      </p>
                    </div>
                  </div>
                </button>
              );
            }
          )}
        </div>
      </section>

      {/* Contact */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-950">
          Contact Information
        </h2>

        <div className="mt-5 space-y-4">
          <Field
            label="Phone Number"
            error={getFieldError(
              "phone"
            )}
          >
            <input
              type="tel"
              value={form.phone}
              onChange={(event) =>
                setValue(
                  "phone",
                  event.target.value
                )
              }
              className={inputClass(
                "phone"
              )}
            />
          </Field>

          <Field
            label="Email Address"
            error={getFieldError(
              "email"
            )}
          >
            <input
              type="email"
              value={form.email}
              onChange={(event) =>
                setValue(
                  "email",
                  event.target.value
                )
              }
              className={inputClass(
                "email"
              )}
            />
          </Field>

          <Field label="Address">
            <textarea
              rows={3}
              value={form.address}
              onChange={(event) =>
                setValue(
                  "address",
                  event.target.value
                )
              }
              className={textareaClass(
                "address"
              )}
            />
          </Field>
        </div>
      </section>

      {/* Church History */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-950">
          Church History
        </h2>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="First Attended"
            error={getFieldError(
              "first_attended_on"
            )}
          >
            <input
              type="date"
              value={
                form.first_attended_on
              }
              onChange={(event) =>
                setValue(
                  "first_attended_on",
                  event.target.value
                )
              }
              className={inputClass(
                "first_attended_on"
              )}
            />
          </Field>

          <Field
            label="Member Since"
            error={getFieldError(
              "member_since"
            )}
          >
            <input
              type="date"
              value={
                form.member_since
              }
              onChange={(event) =>
                setValue(
                  "member_since",
                  event.target.value
                )
              }
              className={inputClass(
                "member_since"
              )}
            />
          </Field>
        </div>
      </section>

      {/* Notes */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-950">
          Staff Notes
        </h2>

        <textarea
          rows={4}
          value={form.notes}
          onChange={(event) =>
            setValue(
              "notes",
              event.target.value
            )
          }
          className={`mt-4 ${textareaClass(
            "notes"
          )}`}
        />
      </section>

      <div className="sticky bottom-20 z-20 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur">
        <button
          type="submit"
          disabled={submitting}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <>
              <LoaderCircle
                size={19}
                className="animate-spin"
              />
              Saving Changes...
            </>
          ) : (
            <>
              <Save size={19} />
              Save Changes
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  required = false,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}

        {required && (
          <span className="text-red-500">
            {" "}
            *
          </span>
        )}
      </label>

      {children}

      {error && (
        <p className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

function StatusOption({
  active,
  label,
  description,
  onClick,
}: {
  active: boolean;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition ${
        active
          ? "border-slate-950 bg-slate-50 ring-1 ring-slate-950"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center gap-2">
        <div
          className={`flex h-5 w-5 items-center justify-center rounded-full border ${
            active
              ? "border-slate-950 bg-slate-950"
              : "border-slate-300"
          }`}
        >
          {active && (
            <CheckCircle2
              size={14}
              className="text-white"
            />
          )}
        </div>

        <span className="text-sm font-semibold text-slate-950">
          {label}
        </span>
      </div>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </button>
  );
}
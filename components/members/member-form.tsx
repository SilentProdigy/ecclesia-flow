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
  UserRoundPlus,
  X,
} from "lucide-react";

import {
  createMemberAction,
  type CreatedMemberResult,
} from "@/app/(app)/members/actions";

import {
  MEMBER_TYPE_OPTIONS,
  formatMemberNumber,
  type MemberStatus,
  type MemberType,
} from "@/lib/members";

import {
  uploadMemberPhoto,
  validateMemberPhoto,
} from "@/lib/members/member-photo.client";

interface MemberFormDraft {
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

const INITIAL_FORM: MemberFormDraft = {
  first_name: "",
  middle_name: "",
  last_name: "",
  suffix: "",
  preferred_name: "",

  phone: "",
  email: "",

  date_of_birth: "",
  gender: "",
  address: "",

  member_type: "member",
  status: "active",

  member_since: "",
  first_attended_on: "",

  notes: "",
};

export function MemberForm() {
  const router = useRouter();

  const cameraInputRef =
    useRef<HTMLInputElement>(null);

  const galleryInputRef =
    useRef<HTMLInputElement>(null);

  const [form, setForm] =
    useState<MemberFormDraft>(
      INITIAL_FORM
    );

  const [photo, setPhoto] =
    useState<File | null>(null);

  const [
    photoPreview,
    setPhotoPreview,
  ] = useState<string | null>(null);

  const [
    photoError,
    setPhotoError,
  ] = useState("");

  const [
    generalError,
    setGeneralError,
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

  const [
    createdMember,
    setCreatedMember,
  ] =
    useState<CreatedMemberResult | null>(
      null
    );

  const [
    photoUploadError,
    setPhotoUploadError,
  ] = useState("");

  const [
    retryingPhoto,
    setRetryingPhoto,
  ] = useState(false);

  useEffect(() => {
    if (!photo) {
      setPhotoPreview(null);
      return;
    }

    const url =
      URL.createObjectURL(photo);

    setPhotoPreview(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [photo]);

  function setValue<
    K extends keyof MemberFormDraft,
  >(
    key: K,
    value: MemberFormDraft[K]
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
    field: keyof MemberFormDraft
  ) {
    return fieldErrors[field]?.[0];
  }

  function inputClass(
    field: keyof MemberFormDraft
  ) {
    return `h-12 w-full rounded-xl border bg-white px-4 text-sm outline-none transition ${
      getFieldError(field)
        ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/10"
        : "border-slate-300 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
    }`;
  }

  function textareaClass(
    field: keyof MemberFormDraft
  ) {
    return `w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition ${
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

      setPhoto(file);
      setPhotoError("");
    } catch (error) {
      setPhoto(null);

      setPhotoError(
        error instanceof Error
          ? error.message
          : "Unable to use this photo."
      );
    }
  }

  function removePhoto() {
    setPhoto(null);
    setPhotoError("");

    if (cameraInputRef.current) {
      cameraInputRef.current.value = "";
    }

    if (galleryInputRef.current) {
      galleryInputRef.current.value =
        "";
    }
  }

  function goToCreatedMember(
    member: CreatedMemberResult
  ) {
    const memberNumber =
      formatMemberNumber(
        member.member_no
      );

    router.push(
      `/members?q=${encodeURIComponent(
        memberNumber
      )}`
    );

    router.refresh();
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setGeneralError("");
    setFieldErrors({});
    setPhotoUploadError("");

    /*
     * Validate the photo before creating the
     * database record. This prevents creating
     * a member if the selected photo is invalid.
     */
    if (photo) {
      try {
        validateMemberPhoto(photo);
      } catch (error) {
        setPhotoError(
          error instanceof Error
            ? error.message
            : "Unable to use this photo."
        );

        return;
      }
    }

    setSubmitting(true);

    try {
      const result =
        await createMemberAction(form);

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

      const member =
        result.member;

      /*
       * The member exists at this point.
       * Upload the optional photo afterwards
       * because its Storage folder uses the
       * member UUID.
       */
      if (photo) {
        try {
          await uploadMemberPhoto({
            memberId: member.id,
            file: photo,
          });
        } catch (error) {
          console.error(
            "Member created but photo upload failed:",
            error
          );

          setCreatedMember(member);

          setPhotoUploadError(
            error instanceof Error
              ? error.message
              : "The member was registered, but the profile photo could not be uploaded."
          );

          setSubmitting(false);

          return;
        }
      }

      goToCreatedMember(member);
    } catch (error) {
      console.error(
        "Registration failed:",
        error
      );

      setGeneralError(
        "Something went wrong while registering the member. Please try again."
      );

      setSubmitting(false);
    }
  }

  async function retryPhotoUpload() {
    if (
      !createdMember ||
      !photo ||
      retryingPhoto
    ) {
      return;
    }

    setRetryingPhoto(true);
    setPhotoUploadError("");

    try {
      await uploadMemberPhoto({
        memberId:
          createdMember.id,
        file: photo,
      });

      goToCreatedMember(
        createdMember
      );
    } catch (error) {
      setPhotoUploadError(
        error instanceof Error
          ? error.message
          : "Unable to upload the photo."
      );

      setRetryingPhoto(false);
    }
  }

  /*
   * If the database registration succeeded but
   * Storage failed, do NOT show the original
   * registration form again. That could cause
   * an accidental duplicate member.
   */
  if (
    createdMember &&
    photoUploadError
  ) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100">
          <AlertCircle
            size={24}
            className="text-amber-700"
          />
        </div>

        <h2 className="mt-4 text-lg font-bold text-slate-950">
          Member Registered
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          The member was successfully
          registered as{" "}
          <strong>
            {formatMemberNumber(
              createdMember.member_no
            )}
          </strong>
          , but the profile photo could
          not be uploaded.
        </p>

        <div className="mt-4 rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm text-amber-800">
          {photoUploadError}
        </div>

        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={retryPhotoUpload}
            disabled={retryingPhoto}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 text-sm font-semibold text-white disabled:opacity-60"
          >
            {retryingPhoto ? (
              <>
                <LoaderCircle
                  size={18}
                  className="animate-spin"
                />
                Uploading...
              </>
            ) : (
              <>
                <ImagePlus
                  size={18}
                />
                Retry Photo Upload
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() =>
              goToCreatedMember(
                createdMember
              )
            }
            className="h-12 w-full rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700"
          >
            Continue Without Photo
          </button>
        </div>
      </div>
    );
  }

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

      {/* Photo */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-950">
          Profile Photo
        </h2>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          Optional. This is separate
          from Face Recognition
          enrollment.
        </p>

        <div className="mt-5 flex flex-col items-center">
          {photoPreview ? (
            <div className="relative">
              <img
                src={photoPreview}
                alt="Selected member"
                className="h-28 w-28 rounded-full border-4 border-white object-cover shadow-md ring-1 ring-slate-200"
              />

              <button
                type="button"
                onClick={removePhoto}
                aria-label="Remove photo"
                className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-white shadow"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-slate-100">
              <UserRoundPlus
                size={38}
                className="text-slate-400"
              />
            </div>
          )}

          {photo && (
            <p className="mt-2 max-w-full truncate text-xs text-slate-400">
              {photo.name}
            </p>
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

          <p className="mt-3 text-center text-[11px] leading-5 text-slate-400">
            JPG, PNG or WebP. Maximum
            5 MB.
          </p>
        </div>
      </section>

      {/* Name */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-950">
          Personal Information
        </h2>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              First Name{" "}
              <span className="text-red-500">
                *
              </span>
            </label>

            <input
              type="text"
              required
              autoComplete="given-name"
              value={
                form.first_name
              }
              onChange={(event) =>
                setValue(
                  "first_name",
                  event.target.value
                )
              }
              className={inputClass(
                "first_name"
              )}
              placeholder="Juan"
            />

            {getFieldError(
              "first_name"
            ) && (
              <p className="mt-1.5 text-xs text-red-600">
                {getFieldError(
                  "first_name"
                )}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Middle Name
            </label>

            <input
              type="text"
              autoComplete="additional-name"
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
              placeholder="Santos"
            />
          </div>

          <div className="grid grid-cols-[1fr_100px] gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Last Name{" "}
                <span className="text-red-500">
                  *
                </span>
              </label>

              <input
                type="text"
                required
                autoComplete="family-name"
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
                placeholder="Dela Cruz"
              />

              {getFieldError(
                "last_name"
              ) && (
                <p className="mt-1.5 text-xs text-red-600">
                  {getFieldError(
                    "last_name"
                  )}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Suffix
              </label>

              <input
                type="text"
                value={
                  form.suffix
                }
                onChange={(event) =>
                  setValue(
                    "suffix",
                    event.target.value
                  )
                }
                className={inputClass(
                  "suffix"
                )}
                placeholder="Jr."
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Preferred Name
            </label>

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
              placeholder="Optional nickname"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Date of Birth
              </label>

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

              {getFieldError(
                "date_of_birth"
              ) && (
                <p className="mt-1.5 text-xs text-red-600">
                  {getFieldError(
                    "date_of_birth"
                  )}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Gender
              </label>

              <input
                type="text"
                value={
                  form.gender
                }
                onChange={(event) =>
                  setValue(
                    "gender",
                    event.target.value
                  )
                }
                className={inputClass(
                  "gender"
                )}
                placeholder="Optional"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Classification */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-950">
          Attendee Type
        </h2>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          Choose how this person
          currently relates to the
          church.
        </p>

        <div className="mt-4 space-y-2">
          {MEMBER_TYPE_OPTIONS.map(
            (option) => {
              const active =
                form.member_type ===
                option.value;

              return (
                <label
                  key={
                    option.value
                  }
                  className={`block cursor-pointer rounded-2xl border p-4 transition ${
                    active
                      ? "border-slate-950 bg-slate-50 ring-1 ring-slate-950"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="member_type"
                    value={
                      option.value
                    }
                    checked={active}
                    onChange={() =>
                      setValue(
                        "member_type",
                        option.value
                      )
                    }
                    className="sr-only"
                  />

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
                </label>
              );
            }
          )}
        </div>

        <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
          New registrations are
          created as Active. Status
          management will be available
          from the member profile.
        </div>
      </section>

      {/* Contact */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-950">
          Contact Information
        </h2>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Phone Number
            </label>

            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
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
              placeholder="0917 123 4567"
            />

            {getFieldError(
              "phone"
            ) && (
              <p className="mt-1.5 text-xs text-red-600">
                {getFieldError(
                  "phone"
                )}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Email Address
            </label>

            <input
              type="email"
              inputMode="email"
              autoComplete="email"
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
              placeholder="juan@example.com"
            />

            {getFieldError(
              "email"
            ) && (
              <p className="mt-1.5 text-xs text-red-600">
                {getFieldError(
                  "email"
                )}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Address
            </label>

            <textarea
              rows={3}
              autoComplete="street-address"
              value={
                form.address
              }
              onChange={(event) =>
                setValue(
                  "address",
                  event.target.value
                )
              }
              className={textareaClass(
                "address"
              )}
              placeholder="Home address"
            />
          </div>
        </div>
      </section>

      {/* Church history */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-950">
          Church History
        </h2>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          These dates can be historical,
          so existing long-time members
          retain their original timeline.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              First Attended
            </label>

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

            {getFieldError(
              "first_attended_on"
            ) && (
              <p className="mt-1.5 text-xs text-red-600">
                {getFieldError(
                  "first_attended_on"
                )}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Member Since
            </label>

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

            {getFieldError(
              "member_since"
            ) && (
              <p className="mt-1.5 text-xs text-red-600">
                {getFieldError(
                  "member_since"
                )}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Notes */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-950">
          Notes
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
          placeholder="Optional staff notes..."
        />

        {getFieldError(
          "notes"
        ) && (
          <p className="mt-1.5 text-xs text-red-600">
            {getFieldError(
              "notes"
            )}
          </p>
        )}
      </section>

      {/* Submit */}
      <div className="sticky bottom-20 z-20 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur">
        <button
          type="submit"
          disabled={submitting}
          className="flex h-13 min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <>
              <LoaderCircle
                size={19}
                className="animate-spin"
              />

              {photo
                ? "Registering & Uploading..."
                : "Registering..."}
            </>
          ) : (
            <>
              <Save size={19} />
              Register Member
            </>
          )}
        </button>
      </div>
    </form>
  );
}
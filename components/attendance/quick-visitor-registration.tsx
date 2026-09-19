"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  CloudUpload,
  LoaderCircle,
  UserPlus,
  WifiOff,
  X,
} from "lucide-react";

import {
  registerVisitorAndCheckInAction,
} from "@/app/(app)/attendance/actions";

import {
  quickVisitorCheckInSchema,
  type QuickVisitorRegistrationResult,
} from "@/lib/attendance";

import {
  queueOfflineVisitorRegistration,
} from "@/lib/attendance/attendance-offline-db";

interface OfflineQueuedVisitor {
  memberId: string;

  attendanceRecordId:
    string;

  checkedInAt:
    string;

  displayName:
    string;
}

interface QuickVisitorRegistrationProps {
  sessionId: string;

  open: boolean;

  onClose: () => void;

  onRegistered: (
    result: Extract<
      QuickVisitorRegistrationResult,
      {
        success: true;
      }
    >
  ) => void;

  onQueued: (
    visitor:
      OfflineQueuedVisitor
  ) => void;
}

export function QuickVisitorRegistration({
  sessionId,
  open,
  onClose,
  onRegistered,
  onQueued,
}: QuickVisitorRegistrationProps) {
  const [
    firstName,
    setFirstName,
  ] =
    useState("");

  const [
    lastName,
    setLastName,
  ] =
    useState("");

  const [
    phone,
    setPhone,
  ] =
    useState("");

  const [
    email,
    setEmail,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const [
    isSubmitting,
    setIsSubmitting,
  ] =
    useState(false);

  const [
    isOnline,
    setIsOnline,
  ] =
    useState(true);

  useEffect(() => {
    function updateOnlineStatus() {
      setIsOnline(
        navigator.onLine
      );
    }

    updateOnlineStatus();

    window.addEventListener(
      "online",
      updateOnlineStatus
    );

    window.addEventListener(
      "offline",
      updateOnlineStatus
    );

    return () => {
      window.removeEventListener(
        "online",
        updateOnlineStatus
      );

      window.removeEventListener(
        "offline",
        updateOnlineStatus
      );
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow =
      document.body.style
        .overflow;

    document.body.style
      .overflow =
      "hidden";

    return () => {
      document.body.style
        .overflow =
        previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    function handleKeyDown(
      event:
        KeyboardEvent
    ) {
      if (
        event.key ===
          "Escape" &&
        open &&
        !isSubmitting
      ) {
        onClose();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    open,
    isSubmitting,
    onClose,
  ]);

  if (!open) {
    return null;
  }

  function resetForm() {
    setFirstName("");
    setLastName("");
    setPhone("");
    setEmail("");
    setError(null);
  }

  function close() {
    if (
      isSubmitting
    ) {
      return;
    }

    onClose();
  }

  async function queueOfflineVisitor(
    parsed: {
      first_name: string;

      last_name: string;

      phone:
        string | null;

      email:
        string | null;
    }
  ) {
    const item =
      await queueOfflineVisitorRegistration({
        sessionId,

        firstName:
          parsed.first_name,

        lastName:
          parsed.last_name,

        phone:
          parsed.phone,

        email:
          parsed.email,
      });

    const displayName =
      `${parsed.first_name} ${parsed.last_name}`;

    resetForm();

    onQueued({
      memberId:
        item.member_id,

      attendanceRecordId:
        item.attendance_record_id,

      checkedInAt:
        item.checked_in_at,

      displayName,
    });
  }

  async function handleSubmit(
    event:
      React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      isSubmitting
    ) {
      return;
    }

    setError(null);

    const parsed =
      quickVisitorCheckInSchema.safeParse({
        event_session_id:
          sessionId,

        first_name:
          firstName,

        last_name:
          lastName,

        phone,

        email,
      });

    if (
      !parsed.success
    ) {
      setError(
        parsed.error
          .issues[0]
          ?.message ??
          "Please check the visitor details."
      );

      return;
    }

    setIsSubmitting(
      true
    );

    try {
      if (
        !navigator.onLine
      ) {
        await queueOfflineVisitor(
          parsed.data
        );

        return;
      }

      const result =
        await registerVisitorAndCheckInAction(
          parsed.data
        );

      if (
        !result.success
      ) {
        setError(
          result.message
        );

        return;
      }

      resetForm();

      onRegistered(
        result
      );
    } catch (submitError) {
      console.error(
        "Visitor registration failed:",
        submitError
      );

      if (
        !navigator.onLine
      ) {
        try {
          await queueOfflineVisitor(
            parsed.data
          );

          return;
        } catch (
          queueError
        ) {
          console.error(
            "Unable to queue visitor offline:",
            queueError
          );
        }
      }

      setError(
        "Visitor registration could not be completed. Please try again."
      );
    } finally {
      setIsSubmitting(
        false
      );
    }
  }

  return (
    <div className="fixed inset-0 z-[110]">
      <button
        type="button"
        aria-label="Close visitor registration"
        onClick={
          close
        }
        disabled={
          isSubmitting
        }
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px]"
      />

      <div className="absolute inset-x-0 bottom-0 max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:w-[520px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl">
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="h-1.5 w-12 rounded-full bg-slate-200" />
        </div>

        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-6 py-5">
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
              <UserPlus
                size={21}
                className="text-slate-700"
              />
            </div>

            <h2 className="mt-3 text-lg font-bold text-slate-950">
              Register Visitor
            </h2>

            <p className="mt-1 text-sm leading-5 text-slate-500">
              Create their visitor
              profile and check
              them into this
              session.
            </p>
          </div>

          <button
            type="button"
            onClick={
              close
            }
            disabled={
              isSubmitting
            }
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
          >
            <X
              size={18}
            />
          </button>
        </div>

        <form
          onSubmit={
            handleSubmit
          }
        >
          <div className="space-y-5 px-6 py-6">
            {!isOnline && (
              <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <WifiOff
                  size={18}
                  className="mt-0.5 shrink-0 text-amber-700"
                />

                <div>
                  <p className="text-xs font-semibold text-amber-900">
                    Offline visitor
                    registration
                  </p>

                  <p className="mt-1 text-xs leading-5 text-amber-700">
                    This visitor and
                    their check-in
                    will be saved on
                    this device and
                    synchronized when
                    internet returns.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">
                {error}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="First Name"
                required
              >
                <input
                  type="text"
                  value={
                    firstName
                  }
                  onChange={(
                    event
                  ) =>
                    setFirstName(
                      event.target
                        .value
                    )
                  }
                  required
                  maxLength={
                    100
                  }
                  autoComplete="given-name"
                  placeholder="First name"
                  className={
                    inputClassName
                  }
                />
              </Field>

              <Field
                label="Last Name"
                required
              >
                <input
                  type="text"
                  value={
                    lastName
                  }
                  onChange={(
                    event
                  ) =>
                    setLastName(
                      event.target
                        .value
                    )
                  }
                  required
                  maxLength={
                    100
                  }
                  autoComplete="family-name"
                  placeholder="Last name"
                  className={
                    inputClassName
                  }
                />
              </Field>
            </div>

            <Field
              label="Phone"
              optional
            >
              <input
                type="tel"
                value={
                  phone
                }
                onChange={(
                  event
                ) =>
                  setPhone(
                    event.target
                      .value
                  )
                }
                maxLength={
                  30
                }
                autoComplete="tel"
                inputMode="tel"
                placeholder="Phone number"
                className={
                  inputClassName
                }
              />
            </Field>

            <Field
              label="Email"
              optional
            >
              <input
                type="email"
                value={
                  email
                }
                onChange={(
                  event
                ) =>
                  setEmail(
                    event.target
                      .value
                  )
                }
                maxLength={
                  254
                }
                autoComplete="email"
                inputMode="email"
                placeholder="Email address"
                className={
                  inputClassName
                }
              />
            </Field>

            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold text-slate-700">
                Visitor profile
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                They will be saved
                as an active Visitor.
                Their first attended
                date will be this
                event session.
              </p>
            </div>

            <p className="text-xs leading-5 text-slate-400">
              Search the member
              directory first when
              possible to avoid
              duplicate profiles.
            </p>
          </div>

          <div className="sticky bottom-0 border-t border-slate-100 bg-white px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-5">
            <div className="grid grid-cols-[110px_1fr] gap-3">
              <button
                type="button"
                onClick={
                  close
                }
                disabled={
                  isSubmitting
                }
                className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  isSubmitting
                }
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isSubmitting ? (
                  <>
                    <LoaderCircle
                      size={17}
                      className="animate-spin"
                    />

                    {isOnline
                      ? "Registering..."
                      : "Saving..."}
                  </>
                ) : isOnline ? (
                  <>
                    <UserPlus
                      size={17}
                    />

                    Register & Check In
                  </>
                ) : (
                  <>
                    <CloudUpload
                      size={17}
                    />

                    Save Offline & Check In
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  required = false,
  optional = false,
  children,
}: {
  label: string;

  required?: boolean;

  optional?: boolean;

  children:
    React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center gap-1.5">
        <span className="text-sm font-semibold text-slate-700">
          {label}
        </span>

        {required && (
          <span className="text-red-500">
            *
          </span>
        )}

        {optional && (
          <span className="text-xs text-slate-400">
            Optional
          </span>
        )}
      </div>

      {children}
    </label>
  );
}

const inputClassName =
  "h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-black placeholder:text-slate-400 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10";
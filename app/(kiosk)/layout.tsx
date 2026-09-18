import type {
  ReactNode,
} from "react";

import {
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

interface KioskLayoutProps {
  children:
    ReactNode;
}

export default async function KioskLayout({
  children,
}: KioskLayoutProps) {
  const supabase =
    await createClient();

  const {
    data: claimsData,
  } =
    await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub;

  if (!userId) {
    redirect(
      "/auth/login"
    );
  }

  const {
    data: profile,
    error,
  } = await supabase
    .from("profiles")
    .select(`
      id,
      is_active
    `)
    .eq(
      "id",
      userId
    )
    .maybeSingle();

  if (
    error ||
    !profile ||
    !profile.is_active
  ) {
    redirect(
      "/account-disabled"
    );
  }

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-950">
      {children}
    </div>
  );
}
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";

interface AppLayoutProps {
  children: ReactNode;
}

export default async function AppLayout({
  children,
}: AppLayoutProps) {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  const claims = claimsData?.claims;

  if (claimsError || !claims?.sub) {
    redirect("/auth/login");
  }

  const { data: profile, error: profileError } =
    await supabase
      .from("profiles")
      .select("id, full_name, role, is_active")
      .eq("id", claims.sub)
      .single();

  if (profileError || !profile) {
    redirect("/account-disabled");
  }

  if (!profile.is_active) {
    redirect("/account-disabled");
  }

  return (
    <AppShell
      profile={{
        full_name: profile.full_name,
        role: profile.role,
      }}
    >
      {children}
    </AppShell>
  );
}
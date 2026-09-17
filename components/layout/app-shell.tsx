import type { ReactNode } from "react";
import { AppHeader } from "./app-header";
import { BottomNavigation } from "./bottom-navigation";

interface AppShellProps {
  children: ReactNode;
  profile: {
    full_name: string;
    role: "admin" | "staff";
  };
}

export function AppShell({
  children,
  profile,
}: AppShellProps) {
  return (
    <div className="min-h-dvh bg-slate-50">
      <AppHeader
        fullName={profile.full_name}
        role={profile.role}
      />

      <main className="mx-auto w-full max-w-3xl pb-28">
        {children}
      </main>

      <BottomNavigation />
    </div>
  );
}
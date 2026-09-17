import Link from "next/link";
import { LogOut, Settings, ShieldCheck } from "lucide-react";

interface AppHeaderProps {
  fullName: string;
  role: "admin" | "staff";
}

export function AppHeader({
  fullName,
  role,
}: AppHeaderProps) {
  const initial =
    fullName?.trim().charAt(0).toUpperCase() || "S";

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Church
          </p>

          <h1 className="text-base font-bold text-slate-900">
            Attendance
          </h1>
        </div>

        <details className="group relative">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full outline-none [&::-webkit-details-marker]:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 font-semibold text-white">
              {initial}
            </div>
          </summary>

          <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 px-4 py-4">
              <p className="truncate font-semibold text-slate-900">
                {fullName}
              </p>

              <div className="mt-1 flex items-center gap-1 text-xs capitalize text-slate-500">
                <ShieldCheck size={14} />
                {role}
              </div>
            </div>

            <div className="p-2">
              <Link
                href="/settings"
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-700 hover:bg-slate-50"
              >
                <Settings size={18} />
                Settings
              </Link>

              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut size={18} />
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}
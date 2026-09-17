"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ChartNoAxesCombined,
  House,
  Menu,
  UsersRound,
} from "lucide-react";

const navigation = [
  {
    href: "/dashboard",
    label: "Home",
    icon: House,
  },
  {
    href: "/members",
    label: "Members",
    icon: UsersRound,
  },
  {
    href: "/events",
    label: "Events",
    icon: CalendarDays,
  },
  {
    href: "/reports",
    label: "Reports",
    icon: ChartNoAxesCombined,
  },
  {
    href: "/settings",
    label: "More",
    icon: Menu,
  },
];

export function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-around px-1 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2">
        {navigation.map((item) => {
          const Icon = item.icon;

          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" &&
              pathname.startsWith(`${item.href}/`));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-16 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-xs font-medium transition ${
                active
                  ? "text-slate-950"
                  : "text-slate-400 hover:text-slate-700"
              }`}
            >
              <Icon
                size={22}
                strokeWidth={active ? 2.4 : 1.8}
              />

              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
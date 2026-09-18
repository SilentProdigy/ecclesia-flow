"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  CalendarDays,
  ClipboardCheck,
  House,
  Menu,
  UsersRound,
} from "lucide-react";

const navigationItems = [
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
    href: "/attendance",
    label: "Attendance",
    icon: ClipboardCheck,
  },
  {
    href: "/events",
    label: "Events",
    icon: CalendarDays,
  },
  {
    href: "/settings",
    label: "More",
    icon: Menu,
  },
];

export function BottomNavigation() {
  const pathname =
    usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-stretch px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2">
        {navigationItems.map(
          (item) => {
            const Icon =
              item.icon;

            const isActive =
              pathname ===
                item.href ||
              (
                item.href !==
                  "/dashboard" &&
                pathname.startsWith(
                  `${item.href}/`
                )
              );

            return (
              <Link
                key={
                  item.href
                }
                href={
                  item.href
                }
                aria-current={
                  isActive
                    ? "page"
                    : undefined
                }
                className="group flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2"
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
                    isActive
                      ? "bg-slate-950 text-white"
                      : "text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-700"
                  }`}
                >
                  <Icon
                    size={19}
                    strokeWidth={
                      isActive
                        ? 2.4
                        : 1.8
                    }
                  />
                </div>

                <span
                  className={`max-w-full truncate text-[10px] font-semibold transition ${
                    isActive
                      ? "text-slate-950"
                      : "text-slate-400 group-hover:text-slate-700"
                  }`}
                >
                  {
                    item.label
                  }
                </span>
              </Link>
            );
          }
        )}
      </div>
    </nav>
  );
}
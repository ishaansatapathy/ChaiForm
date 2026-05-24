"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart2, LayoutDashboard, PlusCircle, Settings } from "lucide-react";

const NAV = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "Create", href: "/forms/new", icon: PlusCircle },
  { label: "Stats", href: "/analytics", icon: BarChart2 },
  { label: "Profile", href: "/settings", icon: Settings },
] as const;

export function AppMobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-black/55 backdrop-blur-2xl lg:hidden">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 py-2">
        {NAV.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className="relative flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium"
            >
              {active && (
                <span className="absolute -top-0.5 h-0.5 w-8 rounded-full bg-lime-400" />
              )}
              <item.icon
                size={20}
                className={active ? "text-lime-400" : "text-white/40"}
              />
              <span className={active ? "text-lime-400" : "text-white/40"}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

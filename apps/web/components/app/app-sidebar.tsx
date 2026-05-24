"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart2,
  LayoutDashboard,
  LogOut,
  PlusCircle,
  Settings,
  User as UserIcon,
} from "lucide-react";

import { trpc } from "~/trpc/client";
import { useLogout } from "~/lib/use-logout";
import { getPublicDisplayName } from "~/lib/user-display-name";

const NAV = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Create Form", href: "/forms/new", icon: PlusCircle },
  { label: "Analytics", href: "/analytics", icon: BarChart2 },
  { label: "Settings", href: "/settings", icon: Settings },
] as const;

export function AppSidebar() {
  const pathname = usePathname();
  const { data: user } = trpc.auth.me.useQuery({});
  const logout = useLogout();

  return (
    <aside className="hidden min-h-screen w-72 flex-col border-r border-white/10 bg-black/45 backdrop-blur-xl lg:flex">
      <div className="border-b border-white/5 p-8">
        <Link href="/dashboard" className="font-display text-lg font-black tracking-[0.22em] text-lime-400 uppercase">
          ChaiForm
        </Link>
        <p className="font-mono mt-1 text-[9px] tracking-[0.32em] text-white/30 uppercase">
          creator console
        </p>
      </div>

      <nav className="flex-1 space-y-1.5 p-6">
        {NAV.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={`group relative flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-medium transition-all duration-300 ${
                active
                  ? "bg-white/5 text-white inset-shadow-sm"
                  : "text-white/40 hover:bg-white/2 hover:text-white"
              }`}
            >
              {active && (
                <span className="absolute left-0 h-6 w-1 rounded-r-full bg-lime-400" />
              )}
              <item.icon
                size={18}
                strokeWidth={active ? 2.5 : 2}
                className={active ? "text-lime-400" : "transition-colors group-hover:text-lime-400"}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-white/5 bg-linear-to-t from-white/5 to-transparent p-6">
        {user && (
          <div className="flex items-center justify-between gap-3 rounded-3xl border border-white/5 bg-white/3 p-4 transition-all duration-500 hover:border-white/10">
            <div className="flex min-w-0 items-center gap-3">
              {user.profileImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.profileImageUrl}
                  alt={user.fullName}
                  referrerPolicy="no-referrer"
                  className="size-10 rounded-2xl object-cover ring-2 ring-white/5"
                />
              ) : (
                <div className="flex size-10 items-center justify-center rounded-2xl border border-white/5 bg-white/5">
                  <UserIcon size={20} className="text-white/30" />
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">
                  {user ? getPublicDisplayName(user) : "Hero"}
                </p>
                <p className="truncate text-[10px] font-medium tracking-wider text-white/30">
                  {user.email}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => logout.mutate({})}
              disabled={logout.isPending}
              className="rounded-xl p-2 text-white/30 transition-colors hover:bg-white/5 hover:text-lime-400"
              aria-label="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

"use client";

import { useEffect, useState } from "react";
import { LogOut, Shield, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

import { Highlight } from "~/components/app/highlight";
import { ClientRoughNotation } from "~/components/ui/client-rough-notation";
import { getPublicDisplayName } from "~/lib/user-display-name";
import { trpc } from "~/trpc/client";
import { useLogout } from "~/lib/use-logout";

export default function SettingsContent() {
  const utils = trpc.useUtils();
  const { data: user } = trpc.auth.me.useQuery({});
  const [showRough, setShowRough] = useState(false);
  const logout = useLogout();
  const toggle2FA = trpc.auth.toggle2FA.useMutation({
    onSuccess: async (res) => {
      toast.success(res.message);
      await utils.auth.me.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  useEffect(() => {
    const t = setTimeout(() => setShowRough(true), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className="py-4">
      <div className="mb-10 pb-8">
        <div className="mb-2 flex items-center gap-3">
          <span className="h-px w-8 bg-lime-400" />
          <p className="text-[10px] font-bold tracking-[0.3em] text-white/30 uppercase">Account</p>
        </div>
        <h1 className="font-display text-5xl tracking-tight text-white md:text-6xl">
          <Highlight>Profile</Highlight> & Security
        </h1>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_0.55fr]">
        <div className="space-y-6">
          <div className="app-surface rounded-3xl p-8">
            <div className="flex items-start gap-5">
              {user?.profileImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.profileImageUrl}
                  alt={user.fullName}
                  referrerPolicy="no-referrer"
                  className="size-24 rounded-3xl object-cover ring-2 ring-white/10"
                />
              ) : (
                <div className="flex size-24 items-center justify-center rounded-3xl border border-white/10 bg-white/5">
                  <UserIcon size={36} className="text-white/30" />
                </div>
              )}
              <div>
                <p className="font-mono text-[10px] tracking-[0.28em] text-lime-400/70 uppercase">Username</p>
                <ClientRoughNotation type="underline" show={showRough} color="#4ade80" padding={4}>
                  <h2 className="font-display text-2xl font-bold text-white">
                    {user ? getPublicDisplayName(user) : "—"}
                  </h2>
                </ClientRoughNotation>
                <p className="mt-3 text-base font-medium text-white/70">{user?.fullName}</p>
                <p className="mt-1.5 text-sm text-white/45">{user?.email}</p>
                <p className="font-mono mt-3 text-[10px] tracking-[0.28em] text-white/30 uppercase">
                  member · creator tier
                </p>
              </div>
            </div>
          </div>

          <div className="app-surface rounded-3xl p-8">
            <div className="mb-6 flex items-center gap-3">
              <Shield size={18} className="text-cyan-400" />
              <h3 className="font-display text-lg font-bold text-white">Security</h3>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/5 bg-white/2 p-4">
              <div>
                <p className="text-sm font-medium text-white">Two-factor authentication</p>
                <p className="text-xs text-white/40">Email OTP on sign-in</p>
              </div>
              <button
                type="button"
                onClick={() => toggle2FA.mutate({ enabled: !user?.twoFactorEnabled })}
                disabled={toggle2FA.isPending}
                className={`rounded-full px-4 py-2 text-[10px] font-bold tracking-[0.2em] uppercase transition-colors ${
                  user?.twoFactorEnabled
                    ? "bg-lime-400/15 text-lime-400 border border-lime-400/30"
                    : "bg-white/5 text-white/50 border border-white/10 hover:border-white/20"
                }`}
              >
                {user?.twoFactorEnabled ? "Enabled" : "Enable"}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:sticky lg:top-10 lg:self-start">
          <div className="app-surface rounded-3xl border-lime-400/10 p-8">
            <ClientRoughNotation type="underline" show={showRough} color="#4ade80">
              <p className="font-annotate text-xl text-lime-400">See you next time!</p>
            </ClientRoughNotation>
            <button
              type="button"
              onClick={() => logout.mutate({})}
              disabled={logout.isPending}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 py-3.5 text-sm font-black tracking-[0.18em] text-red-400 uppercase transition-colors hover:bg-red-500/20"
            >
              <LogOut size={16} />
              Sign Out
            </button>
            <p className="font-annotate mt-6 text-center text-lg text-white/40">
              Every logout saves a cup of chai. ☕
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

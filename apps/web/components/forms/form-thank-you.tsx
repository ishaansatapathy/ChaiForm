"use client";

import Link from "next/link";

import { trpc } from "~/trpc/client";

export function FormThankYou({ formTitle }: { formTitle?: string }) {
  const { data: user } = trpc.auth.me.useQuery(undefined, { retry: false });

  const continueHref = user ? "/dashboard" : "/explore";
  const continueLabel = user ? "Back to dashboard" : "Explore ChaiForm";

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-black px-4 py-16 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(74,222,128,0.12),transparent_45%)]" />
      <div className="relative mx-auto max-w-lg text-center">
        <p className="font-mono mb-3 text-[10px] tracking-[0.35em] text-lime-400/80 uppercase">Submitted</p>
        <h1 className="font-display text-4xl font-black tracking-tight">Thank you!</h1>
        <p className="mt-4 text-white/55">
          {formTitle ? `Your response to "${formTitle}" was recorded.` : "Your response was recorded."}
        </p>
        <Link
          href={continueHref}
          className="btn-omni font-display mt-8 inline-flex rounded-2xl px-8 py-3.5 text-sm font-black tracking-[0.18em] uppercase"
        >
          {continueLabel}
        </Link>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";

import { trpc } from "~/trpc/client";

function CheckEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const [sent, setSent] = useState(false);

  const sendAgain = trpc.auth.sendVerificationEmailAgain.useMutation({
    onSuccess: (data) => {
      setSent(true);
      toast.success(data.message);
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
      <div className="app-surface max-w-md rounded-3xl p-10 text-center">
        <p className="font-mono text-[10px] tracking-[0.32em] text-lime-400/70 uppercase">
          {"// verify email"}
        </p>
        <h1 className="font-display mt-4 text-3xl font-bold">Check your inbox</h1>
        <p className="mt-4 text-sm leading-relaxed text-white/55">
          We sent a verification link{email ? ` to ${email}` : ""}. Open it to activate your account
          before signing in.
        </p>
        {email && (
          <button
            type="button"
            disabled={sendAgain.isPending || sent}
            onClick={() => sendAgain.mutate({ email })}
            className="btn-omni font-display mt-8 w-full rounded-2xl py-3 text-sm font-black tracking-[0.16em] uppercase disabled:opacity-50"
          >
            {sendAgain.isPending ? "Sending…" : sent ? "Link sent" : "Send verification email again"}
          </button>
        )}
        <Link href="/sign-in" className="font-mono mt-6 inline-block text-xs tracking-widest text-lime-400/80 hover:text-lime-400">
          Back to sign in →
        </Link>
      </div>
    </div>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black text-white/40">
          Loading…
        </div>
      }
    >
      <CheckEmailContent />
    </Suspense>
  );
}

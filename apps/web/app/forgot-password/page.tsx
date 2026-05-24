"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { AuthField, AuthSubmitButton } from "~/components/auth/auth-field";
import { trpc } from "~/trpc/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const forgotPassword = trpc.auth.forgotPassword.useMutation({
    onSuccess: (data) => {
      setSent(true);
      toast.success(data.message);
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
      <div className="auth-card relative mx-auto w-full max-w-[360px] rounded-[1.8rem] p-7 sm:p-8">
        <p className="font-mono mb-2 text-[9px] tracking-[0.32em] text-lime-400/70 uppercase">
          {"// password recovery"}
        </p>
        <h1 className="text-[30px] leading-[1.05] font-semibold tracking-tight text-white">
          Reset your
          <br />
          password.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-white/55">
          Enter your account email and we&apos;ll send a secure reset link.
        </p>

        {sent ? (
          <p className="mt-6 rounded-xl border border-lime-400/20 bg-lime-400/5 px-4 py-3 text-sm text-lime-300/90">
            If an account exists for that email, check your inbox for reset instructions.
          </p>
        ) : (
          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              forgotPassword.mutate({ email, method: "link" });
            }}
          >
            <AuthField
              label="Email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              required
              autoComplete="email"
            />
            <AuthSubmitButton
              disabled={forgotPassword.isPending}
              className="w-full rounded-xl bg-[#d4d4d8] py-3.5 text-sm font-bold text-black transition-colors hover:bg-white disabled:opacity-60"
            >
              {forgotPassword.isPending ? "Sending…" : "Send reset link"}
            </AuthSubmitButton>
          </form>
        )}

        <Link
          href="/sign-in"
          className="font-mono mt-6 inline-block text-xs tracking-widest text-lime-400/80 hover:text-lime-400"
        >
          ← Back to sign in
        </Link>
      </div>
    </div>
  );
}

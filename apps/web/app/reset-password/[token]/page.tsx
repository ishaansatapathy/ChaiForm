"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";

import { AuthField, AuthSubmitButton } from "~/components/auth/auth-field";
import { trpc } from "~/trpc/client";

function ResetPasswordContent() {
  const params = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const token = params.token;
  const emailFromQuery = searchParams.get("email") ?? "";

  const [email, setEmail] = useState(emailFromQuery);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [done, setDone] = useState(false);

  const resetPassword = trpc.auth.resetPassword.useMutation({
    onSuccess: () => {
      setDone(true);
      toast.success("Password updated — you can sign in now");
    },
    onError: (err) => toast.error(err.message),
  });

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
        <div className="auth-card mx-auto w-full max-w-[360px] rounded-[1.8rem] p-7 text-center sm:p-8">
          <h1 className="text-2xl font-semibold text-white">Password updated</h1>
          <p className="mt-3 text-sm text-white/55">Your password has been reset successfully.</p>
          <Link
            href="/sign-in"
            className="btn-omni font-display mt-8 inline-block w-full rounded-2xl py-3 text-sm font-black tracking-[0.16em] uppercase"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
      <div className="auth-card relative mx-auto w-full max-w-[360px] rounded-[1.8rem] p-7 sm:p-8">
        <p className="font-mono mb-2 text-[9px] tracking-[0.32em] text-lime-400/70 uppercase">
          {"// set new password"}
        </p>
        <h1 className="text-[30px] leading-[1.05] font-semibold tracking-tight text-white">
          Choose a new
          <br />
          password.
        </h1>

        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (password !== confirmPassword) {
              toast.error("Passwords do not match");
              return;
            }
            resetPassword.mutate({
              email,
              newPassword: password,
              token,
            });
          }}
        >
          <AuthField
            label="Email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <AuthField
            label="New password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          <AuthField
            label="Confirm password"
            name="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          <AuthSubmitButton
            disabled={resetPassword.isPending}
            className="w-full rounded-xl bg-[#d4d4d8] py-3.5 text-sm font-bold text-black transition-colors hover:bg-white disabled:opacity-60"
          >
            {resetPassword.isPending ? "Saving…" : "Update password"}
          </AuthSubmitButton>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black text-white/40">
          Loading…
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}

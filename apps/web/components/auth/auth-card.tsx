"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TRPCClientError } from "@repo/trpc/client";
import { toast } from "sonner";

import { AuthField, AuthModeToggle, AuthSubmitButton } from "~/components/auth/auth-field";
import { SocialButtons } from "~/components/auth/social-buttons";
import { markHeroTimePending, withHeroTimeParam } from "~/lib/hero-time";
import { prefetchAppRoutes } from "~/lib/prefetch-app-routes";
import { trpc } from "~/trpc/client";

type AuthCardProps = {
  mode: "sign-in" | "sign-up";
};

export function AuthCard({ mode }: AuthCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/dashboard";
  const isLogin = mode === "sign-in";
  const [loading, setLoading] = useState(false);
  const [twoFactorStep, setTwoFactorStep] = useState<{
    email: string;
    displayEmail: string;
    otp: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const initialized2FA = useRef(false);

  const signUpMutation = trpc.auth.signUp.useMutation();
  const signInMutation = trpc.auth.signIn.useMutation();
  const verify2FAMutation = trpc.auth.verify2FA.useMutation();
  const utils = trpc.useUtils();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const getErrorMessage = (err: unknown) => {
    if (err instanceof TRPCClientError) return err.message;
    if (err instanceof Error) return err.message;
    return "Something went wrong";
  };

  const completeSignIn = async (path: string) => {
    await utils.auth.me.invalidate();
    prefetchAppRoutes(router);
    markHeroTimePending();
    const destination = path.startsWith("/") ? path : "/dashboard";
    window.location.assign(withHeroTimeParam(destination));
  };

  useEffect(() => {
    if (!isLogin || initialized2FA.current) return;

    const pending2FA = searchParams.get("2fa");
    const email = searchParams.get("email");
    if (pending2FA !== "1" || !email) return;

    initialized2FA.current = true;
    setTwoFactorStep({ email, displayEmail: email, otp: "" });
    toast.info("Enter the 2FA code sent to your email");
  }, [isLogin, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (twoFactorStep) {
        await verify2FAMutation.mutateAsync({
          email: twoFactorStep.email,
          otp: twoFactorStep.otp,
        });
        await completeSignIn(nextPath);
        return;
      }

      if (isLogin) {
        const result = await signInMutation.mutateAsync({
          email: formData.email,
          password: formData.password,
        });

        if (result.twoFactorRequired) {
          setTwoFactorStep({
            email: result.email,
            displayEmail: formData.email.trim() || result.email,
            otp: "",
          });
          toast.info(result.message);
          return;
        }

        await completeSignIn(nextPath);
        return;
      }

      await signUpMutation.mutateAsync({
        fullName: formData.name,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });

      toast.success("Account created — verify your email to continue");
      router.push(`/check-email?email=${encodeURIComponent(formData.email)}`);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      if (message.toLowerCase().includes("verify your email") && formData.email) {
        router.push(`/check-email?email=${encodeURIComponent(formData.email)}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const pwStrength = useMemo(() => computeStrength(formData.password), [formData.password]);

  return (
    <div className="auth-card relative mx-auto w-full max-w-[360px] rounded-[1.8rem] p-7 sm:p-8">
      {/* Header */}
      <div className="relative mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="font-mono mb-2 text-[9px] tracking-[0.32em] text-lime-400/70 uppercase">
            {twoFactorStep
              ? "// verify identity"
              : isLogin
                ? "// initiate session"
                : "// new hero registration"}
          </p>
          <h2 className="text-[30px] leading-[1.05] font-semibold tracking-tight text-white">
            {twoFactorStep ? (
              <>
                Enter
                <br />
                2FA code.
              </>
            ) : isLogin ? (
              <>
                Welcome
                <br />
                back.
              </>
            ) : (
              <>
                Create
                <br />
                account.
              </>
            )}
          </h2>
        </div>
        {!twoFactorStep && <AuthModeToggle mode={mode} />}
      </div>

      {!twoFactorStep && <SocialButtons />}

      {!twoFactorStep && (
        <div className="relative my-7 flex items-center gap-3">
          <span className="h-px flex-1 bg-linear-to-r from-transparent via-white/10 to-transparent" />
          <span className="font-mono text-[9px] tracking-[0.28em] text-white/30 uppercase">
            or with email
          </span>
          <span className="h-px flex-1 bg-linear-to-r from-transparent via-white/10 to-transparent" />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {twoFactorStep ? (
          <>
            <p className="font-mono text-[10px] tracking-[0.18em] text-white/45">
              <span className="uppercase">Code sent to</span>{" "}
              <span className="tracking-normal text-white/60">{twoFactorStep.displayEmail}</span>
            </p>
            <AuthField
              label="2FA Code"
              name="otp"
              type="text"
              value={twoFactorStep.otp}
              onChange={(e) =>
                setTwoFactorStep((prev) => (prev ? { ...prev, otp: e.target.value } : prev))
              }
              placeholder="123456"
              required
              autoComplete="one-time-code"
              inputMode="numeric"
            />
          </>
        ) : (
          <>
            {!isLogin && (
              <AuthField
                label="Full Name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                required
                autoComplete="name"
              />
            )}

            <AuthField
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="name@company.com"
              required
              autoComplete="email"
            />

            <AuthField
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              autoComplete={isLogin ? "current-password" : "new-password"}
            />

            {!isLogin && formData.password && <PasswordStrength score={pwStrength} />}

            {isLogin && (
              <div className="-mt-2 flex justify-end">
                <Link
                  href="/forgot-password"
                  className="font-mono text-[10px] tracking-widest text-white/35 uppercase transition-colors hover:text-lime-400"
                >
                  Forgot password?
                </Link>
              </div>
            )}

            {!isLogin && (
              <AuthField
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                required
                autoComplete="new-password"
              />
            )}
          </>
        )}

        {error && (
          <p className="font-mono flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/6 px-3 py-2 text-[10.5px] font-bold tracking-widest text-red-400 uppercase">
            <span className="size-1.5 animate-pulse rounded-full bg-red-500" />
            {error}
          </p>
        )}

        <AuthSubmitButton
          disabled={loading}
          className="mt-3 w-full rounded-xl bg-[#d4d4d8] py-3.5 text-sm font-bold text-black transition-colors hover:bg-white active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? "Processing…"
            : twoFactorStep
              ? "Verify Code"
              : isLogin
                ? "Sign In"
                : "Sign Up"}
        </AuthSubmitButton>

        {!twoFactorStep && (
          <p className="font-mono mt-3 text-center text-[9px] tracking-[0.28em] text-white/30 uppercase">
            {isLogin ? (
              <>
                new here?{" "}
                <a href="/sign-up" className="text-lime-400/80 hover:text-lime-400">
                  create account
                </a>
              </>
            ) : (
              <>
                already a hero?{" "}
                <a href="/sign-in" className="text-lime-400/80 hover:text-lime-400">
                  sign in
                </a>
              </>
            )}
          </p>
        )}
      </form>
    </div>
  );
}

function computeStrength(pw: string): number {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 4);
}

function PasswordStrength({ score }: { score: number }) {
  const labels = ["Weak", "Fair", "Good", "Strong", "Hero-grade"];
  const colors = [
    "bg-red-500/70",
    "bg-orange-400/80",
    "bg-yellow-400/80",
    "bg-lime-400/90",
    "bg-lime-400",
  ];
  return (
    <div className="-mt-1 space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-[3px] flex-1 rounded-full transition-all duration-300 ${
              i < score ? colors[score] : "bg-white/6"
            }`}
          />
        ))}
      </div>
      <p className="font-mono text-[9px] tracking-[0.22em] text-white/40 uppercase">
        {"// strength: "}
        <span className="text-lime-400/90">{labels[score]}</span>
      </p>
    </div>
  );
}

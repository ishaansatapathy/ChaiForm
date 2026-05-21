"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AuthField, AuthModeToggle } from "~/components/auth/auth-field";
import { SocialButtons } from "~/components/auth/social-buttons";

type AuthCardProps = {
  mode: "sign-in" | "sign-up";
};

export function AuthCard({ mode }: AuthCardProps) {
  const isLogin = mode === "sign-in";
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!isLogin) {
        if (formData.password.length < 8) {
          throw new Error("Password must be at least 8 characters");
        }
        if (formData.password !== formData.confirmPassword) {
          throw new Error("Passwords do not match");
        }
      }

      toast.info("Email sign-in is coming soon — use Google for now.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
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
            {isLogin ? "// initiate session" : "// new hero registration"}
          </p>
          <h2 className="text-[30px] leading-[1.05] font-semibold tracking-tight text-white">
            {isLogin ? (
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
        <AuthModeToggle mode={mode} />
      </div>

      <SocialButtons />

      {/* Divider */}
      <div className="relative my-7 flex items-center gap-3">
        <span className="h-px flex-1 bg-linear-to-r from-transparent via-white/10 to-transparent" />
        <span className="font-mono text-[9px] tracking-[0.28em] text-white/30 uppercase">
          or with email
        </span>
        <span className="h-px flex-1 bg-linear-to-r from-transparent via-white/10 to-transparent" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
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
            <button
              type="button"
              onClick={() => toast.info("Password recovery coming soon.")}
              className="font-mono text-[10px] tracking-widest text-white/35 uppercase transition-colors hover:text-lime-400"
            >
              Forgot password?
            </button>
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

        {error && (
          <p className="font-mono flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/6 px-3 py-2 text-[10.5px] font-bold tracking-widest text-red-400 uppercase">
            <span className="size-1.5 animate-pulse rounded-full bg-red-500" />
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-3 w-full rounded-xl bg-[#d4d4d8] py-3.5 text-sm font-bold text-black transition-colors hover:bg-white active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Processing…" : isLogin ? "Sign In" : "Sign Up"}
        </button>

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

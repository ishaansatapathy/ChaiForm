"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { trpc } from "~/trpc/client";

export default function VerifyEmailPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;
  const started = useRef(false);

  const verify = trpc.auth.verifyEmail.useMutation({
    onSuccess: () => {
      toast.success("Email verified — welcome to ChaiForm");
      router.replace("/dashboard");
    },
    onError: (err) => toast.error(err.message),
  });

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    verify.mutate({ token });
  }, [token, verify]);

  if (verify.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
        <div className="app-surface max-w-md rounded-3xl p-10 text-center">
          <h1 className="font-display text-2xl font-bold">Verification failed</h1>
          <p className="mt-3 text-sm text-white/50">{verify.error.message}</p>
          <Link
            href="/sign-in"
            className="font-mono mt-6 inline-block text-xs tracking-widest text-lime-400/80 hover:text-lime-400"
          >
            Back to sign in →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-white/50">
      Verifying your email…
    </div>
  );
}

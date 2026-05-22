"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

function AuthErrorToastInner({ path }: { path: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const error = searchParams.get("error");
    if (!error) return;

    toast.error(error, { duration: 8000 });
    router.replace(path, { scroll: false });
  }, [searchParams, router, path]);

  return null;
}

export function AuthErrorToast({ path }: { path: string }) {
  return (
    <Suspense fallback={null}>
      <AuthErrorToastInner path={path} />
    </Suspense>
  );
}

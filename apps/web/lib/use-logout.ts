"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { trpc } from "~/trpc/client";

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const utils = trpc.useUtils();

  return trpc.auth.logout.useMutation({
    onSuccess: async () => {
      await utils.auth.me.cancel();
      queryClient.clear();
      router.replace("/sign-in");
    },
    onError: (err) => {
      toast.error(err.message || "Sign out failed");
    },
  });
}

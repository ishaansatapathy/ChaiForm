"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { trpc } from "~/trpc/client";

type DeleteFormButtonProps = {
  formId: string;
  formTitle: string;
  redirectTo?: string;
  className?: string;
  label?: string;
};

export function DeleteFormButton({
  formId,
  formTitle,
  redirectTo = "/dashboard",
  className = "inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-red-300 uppercase transition-colors hover:text-red-200",
  label = "Delete",
}: DeleteFormButtonProps) {
  const router = useRouter();
  const utils = trpc.useUtils();

  const deleteForm = trpc.forms.delete.useMutation({
    onSuccess: async () => {
      await utils.forms.list.invalidate();
      await utils.analytics.summary.invalidate();
      toast.success("Form deleted — check your email for confirmation");
      router.push(redirectTo);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleDelete = () => {
    const confirmed = window.confirm(
      `Delete "${formTitle}" and all its responses? You'll receive an email confirmation.`,
    );
    if (!confirmed) return;
    deleteForm.mutate({ formId });
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleteForm.isPending}
      className={className}
    >
      {deleteForm.isPending ? "Deleting…" : label}
    </button>
  );
}

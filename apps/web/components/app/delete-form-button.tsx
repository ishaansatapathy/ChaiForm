"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, MailCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { trpc } from "~/trpc/client";

type DeleteFormButtonProps = {
  formId: string;
  formTitle: string;
  redirectTo?: string;
  stayOnPage?: boolean;
  className?: string;
  label?: string;
};

export function DeleteFormButton({
  formId,
  formTitle,
  redirectTo = "/dashboard",
  stayOnPage = false,
  className = "inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-red-300 uppercase transition-colors hover:text-red-200",
  label = "Delete",
}: DeleteFormButtonProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);

  const deleteForm = trpc.forms.delete.useMutation({
    onSuccess: async () => {
      await utils.forms.list.invalidate();
      await utils.analytics.summary.invalidate();
      toast.success("Form deleted — check your email for confirmation");
      setOpen(false);
      if (stayOnPage) {
        router.refresh();
      } else {
        router.push(redirectTo);
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const handleDelete = () => {
    deleteForm.mutate({ formId });
  };

  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => !deleteForm.isPending && setOpen(nextOpen)}>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          disabled={deleteForm.isPending}
          className={className}
        >
          {deleteForm.isPending ? "Deleting…" : (
            <>
              <Trash2 size={13} />
              {label}
            </>
          )}
        </button>
      </AlertDialogTrigger>

      <AlertDialogContent className="overflow-hidden rounded-[32px] border border-lime-400/25 bg-[#030603] p-0 text-white shadow-none sm:max-w-lg">
        <div className="pointer-events-none absolute -top-24 -right-20 size-52 rounded-full border border-lime-400/20 bg-lime-400/8" />
        <div className="pointer-events-none absolute -bottom-28 -left-20 size-56 rounded-full border border-lime-400/15 bg-lime-400/7" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-lime-400/50 to-transparent" />

        <div className="relative p-7">
          <AlertDialogHeader className="text-left">
            <div className="mb-4 flex items-center justify-between gap-4">
              <span className="inline-flex size-12 items-center justify-center rounded-2xl border border-lime-400/30 bg-lime-400/10 text-lime-300">
                <AlertTriangle size={22} />
              </span>
              <span className="font-mono rounded-full border border-lime-400/20 bg-lime-400/5 px-3 py-1 text-[9px] tracking-[0.26em] text-lime-300/70 uppercase">
                Omnitrix lock
              </span>
            </div>

            <AlertDialogTitle className="font-display text-2xl font-bold tracking-tight text-white">
              Delete this form?
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-3 text-sm leading-relaxed text-white/55">
              <span className="font-semibold text-white">&quot;{formTitle}&quot;</span> and its collected
              responses will be removed from your dashboard. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="mt-6 rounded-2xl border border-lime-400/15 bg-lime-400/5 p-4">
            <div className="flex gap-3">
              <MailCheck size={18} className="mt-0.5 shrink-0 text-lime-400" />
              <div>
                <p className="font-mono text-[10px] tracking-[0.22em] text-lime-300 uppercase">
                  Email confirmation
                </p>
                <p className="mt-1 text-xs leading-relaxed text-white/45">
                  We&apos;ll send a deletion confirmation to the creator email after this completes.
                </p>
              </div>
            </div>
          </div>

          <AlertDialogFooter className="mt-7 gap-3 sm:justify-between">
            <AlertDialogCancel className="rounded-2xl border border-lime-400/20 bg-lime-400/5 px-5 py-3 font-mono text-[11px] font-bold tracking-[0.18em] text-lime-200/75 uppercase hover:bg-lime-400/10 hover:text-lime-100">
              Cancel
            </AlertDialogCancel>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteForm.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-lime-400/35 bg-lime-400/12 px-5 py-3 font-mono text-[11px] font-black tracking-[0.18em] text-lime-100 uppercase transition-colors hover:bg-lime-400/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 size={14} />
              {deleteForm.isPending ? "Deleting..." : "Confirm delete"}
            </button>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

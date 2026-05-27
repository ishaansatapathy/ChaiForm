"use client";

import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";

type ChaiConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  badge?: string;
  icon?: ReactNode;
  onConfirm: () => void;
};

export function ChaiConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  badge = "ChaiForm",
  icon,
  onConfirm,
}: ChaiConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="overflow-hidden rounded-[32px] border border-lime-400/25 bg-[#030603] p-0 text-white shadow-none sm:max-w-lg">
        <div className="pointer-events-none absolute -top-24 -right-20 size-52 rounded-full border border-lime-400/20 bg-lime-400/8" />
        <div className="pointer-events-none absolute -bottom-28 -left-20 size-56 rounded-full border border-lime-400/15 bg-lime-400/7" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-lime-400/50 to-transparent" />

        <div className="relative p-7">
          <AlertDialogHeader className="text-left">
            <div className="mb-4 flex items-center justify-between gap-4">
              <span className="inline-flex size-12 items-center justify-center rounded-2xl border border-lime-400/30 bg-lime-400/10 text-lime-300">
                {icon ?? <AlertTriangle size={22} />}
              </span>
              <span className="font-mono rounded-full border border-lime-400/20 bg-lime-400/5 px-3 py-1 text-[9px] tracking-[0.26em] text-lime-300/70 uppercase">
                {badge}
              </span>
            </div>

            <AlertDialogTitle className="font-display text-2xl font-bold tracking-tight text-white">
              {title}
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-3 text-sm leading-relaxed text-white/55">
              {description}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="mt-7 gap-3 sm:justify-between">
            <AlertDialogCancel className="rounded-2xl border border-lime-400/20 bg-lime-400/5 px-5 py-3 font-mono text-[11px] font-bold tracking-[0.18em] text-lime-200/75 uppercase hover:bg-lime-400/10 hover:text-lime-100">
              {cancelLabel}
            </AlertDialogCancel>
            <button
              type="button"
              onClick={handleConfirm}
              className="inline-flex items-center justify-center rounded-2xl border border-lime-400/35 bg-lime-400 px-5 py-3 font-mono text-[11px] font-black tracking-[0.18em] text-black uppercase transition-opacity hover:opacity-90"
            >
              {confirmLabel}
            </button>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

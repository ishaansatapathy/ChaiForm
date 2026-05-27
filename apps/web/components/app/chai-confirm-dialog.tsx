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

function HudCorners() {
  return (
    <>
      <span
        className="pointer-events-none absolute top-3 left-3 size-4 border-t-2 border-l-2 border-lime-400/40"
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute top-3 right-3 size-4 border-t-2 border-r-2 border-lime-400/40"
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute bottom-3 left-3 size-4 border-b-2 border-l-2 border-lime-400/40"
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute right-3 bottom-3 size-4 border-r-2 border-b-2 border-lime-400/40"
        aria-hidden="true"
      />
    </>
  );
}

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
      <AlertDialogContent className="overflow-hidden rounded-[28px] border border-lime-400/30 bg-[#030603] p-0 text-white shadow-[0_0_0_1px_rgba(163,230,53,0.06),0_28px_90px_rgba(0,0,0,0.9)] sm:max-w-[440px]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgb(163 230 53) 1px, transparent 1px), linear-gradient(to bottom, rgb(163 230 53) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-lime-400/60 to-transparent"
          aria-hidden="true"
        />
        <HudCorners />

        <div className="relative flex items-center justify-between gap-3 border-b border-lime-400/12 px-6 py-3">
          <span className="font-mono text-[9px] tracking-[0.32em] text-lime-400/45 uppercase">
            {"// system confirm"}
          </span>
          <span className="font-mono shrink-0 rounded-full border border-lime-400/25 bg-lime-400/6 px-3 py-1 text-[9px] font-black tracking-[0.24em] text-lime-300/80 uppercase">
            {badge}
          </span>
        </div>

        <div className="relative px-6 py-6">
          <AlertDialogHeader className="space-y-0 text-left">
            <div className="flex items-start gap-5">
              <div className="relative shrink-0">
                <div
                  className="pointer-events-none absolute -inset-2 flex items-center justify-center"
                  aria-hidden="true"
                >
                  <span className="size-18 rounded-full border border-lime-400/12" />
                  <span className="absolute size-14 rounded-full border border-dashed border-lime-400/22" />
                  <span className="absolute size-10 rounded-full border border-lime-400/30" />
                </div>
                <span className="relative z-10 inline-flex size-14 items-center justify-center rounded-2xl border border-lime-400/35 bg-[#030603] text-lime-300 shadow-[inset_0_0_24px_rgba(163,230,53,0.08)]">
                  {icon ?? <AlertTriangle size={24} strokeWidth={2.25} />}
                </span>
              </div>

              <div className="min-w-0 flex-1 pt-0.5">
                <AlertDialogTitle className="font-display text-[1.35rem] leading-snug font-bold tracking-tight text-white">
                  {title}
                </AlertDialogTitle>
                <AlertDialogDescription className="mt-2.5 text-[13px] leading-relaxed text-white/50">
                  {description}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
        </div>

        <AlertDialogFooter className="flex-row gap-3 border-t border-lime-400/12 bg-black/50 px-6 py-4 sm:justify-stretch">
          <AlertDialogCancel className="mt-0 h-11 flex-1 rounded-2xl border border-lime-400/22 bg-transparent px-4 font-mono text-[11px] font-bold tracking-[0.16em] text-lime-300/80 uppercase shadow-none hover:border-lime-400/35 hover:bg-lime-400/8 hover:text-lime-200">
            {cancelLabel}
          </AlertDialogCancel>
          <button
            type="button"
            onClick={handleConfirm}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl border border-lime-400/40 bg-lime-400 px-4 font-mono text-[11px] font-black tracking-[0.16em] text-black uppercase shadow-[0_0_28px_rgba(163,230,53,0.22)] transition-[opacity,box-shadow] hover:opacity-95 hover:shadow-[0_0_36px_rgba(163,230,53,0.32)]"
          >
            {confirmLabel}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

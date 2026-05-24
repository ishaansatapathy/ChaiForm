"use client";

import { useEffect, useState } from "react";
import { Check, Copy, X } from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";

type ShareFormModalProps = {
  open: boolean;
  shareUrl: string;
  formTitle: string;
  onClose: () => void;
};

export function ShareFormModal({ open, shareUrl, formTitle, onClose }: ShareFormModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      setCopied(false);
      return;
    }

    let cancelled = false;
    QRCode.toDataURL(shareUrl, {
      width: 320,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
      errorCorrectionLevel: "H",
    })
      .then((dataUrl) => {
        if (!cancelled) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [open, shareUrl]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/75 px-4 py-8 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Share form"
    >
      <div
        className="relative w-full max-w-md rounded-[32px] border border-white/10 bg-[#0b0b0b] p-7 shadow-[0_30px_80px_rgba(0,0,0,0.6)]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-5 top-5 rounded-full border border-white/10 bg-white/5 p-1.5 text-white/55 transition-colors hover:border-white/25 hover:text-white"
        >
          <X size={14} />
        </button>

        <p className="font-mono text-[9px] tracking-[0.32em] text-lime-400/80 uppercase">Share form</p>
        <h3 className="font-display mt-1 text-2xl font-bold text-white">{formTitle}</h3>
        <p className="mt-2 text-xs text-white/45">
          Scan the QR with a phone or copy the link to send anywhere.
        </p>

        <div className="mt-6 flex flex-col items-center gap-4">
          <div className="rounded-3xl border border-white/15 bg-white p-4">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt={`QR code for ${formTitle}`}
                width={256}
                height={256}
                className="h-64 w-64 rounded-2xl"
              />
            ) : (
              <div className="h-64 w-64 animate-pulse rounded-2xl bg-white/5" />
            )}
          </div>

          <div className="w-full rounded-2xl border border-white/10 bg-black/60 p-3">
            <p className="font-mono mb-1.5 text-[9px] tracking-[0.28em] text-white/35 uppercase">Public link</p>
            <div className="flex items-center gap-2">
              <p className="flex-1 truncate text-xs text-white/75">{shareUrl}</p>
              <button
                type="button"
                onClick={handleCopy}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold tracking-[0.18em] uppercase transition-colors ${
                  copied
                    ? "bg-lime-400 text-black"
                    : "border border-lime-400/35 text-lime-400 hover:bg-lime-400/10"
                }`}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          <a
            href={shareUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] font-bold tracking-[0.22em] text-white/45 uppercase transition-colors hover:text-lime-400"
          >
            Open in new tab →
          </a>
        </div>
      </div>
    </div>
  );
}

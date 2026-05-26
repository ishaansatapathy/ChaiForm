"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        },
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

type TurnstileWidgetProps = {
  siteKey: string;
  onTokenChange: (token: string) => void;
  placement?: "inline" | "bottom-left" | "bottom-right";
};

const placementClasses: Record<NonNullable<TurnstileWidgetProps["placement"]>, string> = {
  inline:
    "flex min-h-[65px] items-center justify-start rounded-2xl border border-white/10 bg-white/5 px-3 py-2",
  "bottom-left":
    "fixed bottom-4 left-4 z-50 flex min-h-[65px] items-center justify-start rounded-xl border border-white/10 bg-black/80 px-3 py-2 shadow-lg backdrop-blur-sm sm:bottom-6 sm:left-6",
  "bottom-right":
    "fixed bottom-4 right-4 z-50 flex min-h-[65px] items-center justify-start rounded-xl border border-white/10 bg-black/80 px-3 py-2 shadow-lg backdrop-blur-sm sm:bottom-6 sm:right-6",
};

export function TurnstileWidget({
  siteKey,
  onTokenChange,
  placement = "inline",
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  const cleanup = useCallback(() => {
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    }
    onTokenChange("");
  }, [onTokenChange]);

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile || widgetIdRef.current) return;

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      theme: "dark",
      callback: (token) => onTokenChange(token),
      "expired-callback": () => onTokenChange(""),
      "error-callback": () => onTokenChange(""),
    });
  }, [siteKey, onTokenChange]);

  useEffect(() => {
    if (!scriptReady) return;
    renderWidget();
  }, [scriptReady, renderWidget]);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />
      <div
        ref={containerRef}
        className={placementClasses[placement]}
        aria-label="CAPTCHA verification"
      />
    </>
  );
}

export function getClientTurnstileSiteKey() {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";
}

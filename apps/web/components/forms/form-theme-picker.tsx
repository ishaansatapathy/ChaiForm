"use client";

import type { FormThemeId } from "~/lib/form-themes";
import { FORM_THEMES } from "~/lib/form-themes";

type FormThemePickerProps = {
  value: FormThemeId;
  onChange: (theme: FormThemeId) => void;
};

export function FormThemePicker({ value, onChange }: FormThemePickerProps) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold tracking-[0.25em] text-white/40 uppercase">Theme</p>
      <div className="grid gap-2">
        {FORM_THEMES.map((theme) => {
          const active = value === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => onChange(theme.id)}
              className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                active
                  ? "border-lime-400/40 bg-lime-400/10"
                  : "border-white/8 bg-white/2 hover:border-white/15"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{theme.label}</p>
                  <p className="mt-0.5 text-xs text-white/45">{theme.description}</p>
                </div>
                <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase ${theme.badge}`}>
                  {theme.category}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

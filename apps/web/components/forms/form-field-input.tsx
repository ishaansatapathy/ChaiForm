"use client";

import type { RouterOutputs } from "@repo/trpc/client";

import type { FormThemeStyle } from "~/lib/form-themes";

type PublicField = RouterOutputs["forms"]["getPublic"]["fields"][number];

export function FormFieldInput({
  field,
  value,
  onChange,
  theme,
}: {
  field: PublicField;
  value: string;
  onChange: (value: string) => void;
  theme?: FormThemeStyle;
}) {
  const accent = theme?.accent ?? "border-lime-400 bg-lime-400/20 text-lime-300";
  const inputClassName =
    "w-full rounded-2xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm text-white outline-none focus:border-lime-400/40";
  const selectClassName = `${inputClassName} form-select cursor-pointer`;

  switch (field.type) {
    case "select":
      return (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          className={selectClassName}
        >
          <option value="" className="bg-[#0a0a0a] text-white">
            Select an option
          </option>
          {(field.config?.options ?? []).map((option) => (
            <option key={option} value={option} className="bg-[#0a0a0a] text-white">
              {option}
            </option>
          ))}
        </select>
      );
    case "rating": {
      const max = field.config?.maxRating ?? 5;
      return (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: max }, (_, index) => {
            const rating = String(index + 1);
            const active = value === rating;
            return (
              <button
                key={rating}
                type="button"
                onClick={() => onChange(rating)}
                className={`h-11 w-11 rounded-xl border text-sm font-bold transition-colors ${
                  active ? accent : "border-white/10 bg-white/2 text-white/50 hover:border-lime-400/30"
                }`}
              >
                {rating}
              </button>
            );
          })}
        </div>
      );
    }
    case "checkbox": {
      const checked = value === "true";
      const checkboxLabel = field.config?.checkboxLabel ?? field.label;
      return (
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/3 px-4 py-3">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked ? "true" : "false")}
            required={field.required}
            className="mt-0.5 accent-lime-400"
          />
          <span className="text-sm text-white/80">
            {checkboxLabel}
            {field.required && <span className={theme?.accentText ?? "text-lime-400"}> *</span>}
          </span>
        </label>
      );
    }
    case "date":
      return (
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          className={inputClassName}
        />
      );
    default:
      return (
        <input
          type={field.type === "email" ? "email" : field.type === "number" ? "number" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          placeholder={field.config?.placeholder}
          className={inputClassName}
        />
      );
  }
}

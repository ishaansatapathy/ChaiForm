"use client";

import type { RouterOutputs } from "@repo/trpc/client";

import {
  isMultiCheckboxConfig,
  parseMultiCheckboxValue,
} from "~/lib/checkbox-value";
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
      const groupLabel = field.label || "Rating";
      return (
        <div>
          <div
            role="radiogroup"
            aria-label={groupLabel}
            aria-required={field.required || undefined}
            className="flex flex-wrap gap-2"
          >
            {Array.from({ length: max }, (_, index) => {
              const rating = String(index + 1);
              const active = value === rating;
              return (
                <button
                  key={rating}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={`${rating} of ${max}`}
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
          {(field.config?.lowLabel || field.config?.highLabel) && (
            <div className="mt-2 flex justify-between text-xs text-white/40">
              <span>{field.config.lowLabel}</span>
              <span>{field.config.highLabel}</span>
            </div>
          )}
        </div>
      );
    }
    case "checkbox": {
      if (isMultiCheckboxConfig(field.config)) {
        const options = field.config?.options ?? [];
        const selected = parseMultiCheckboxValue(value);

        const toggleOption = (option: string) => {
          const next = selected.includes(option)
            ? selected.filter((item) => item !== option)
            : [...selected, option];
          onChange(JSON.stringify(next));
        };

        return (
          <div className="space-y-2">
            {options.map((option) => (
              <label
                key={option}
                className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/3 px-4 py-3"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(option)}
                  onChange={() => toggleOption(option)}
                  className="mt-0.5 accent-lime-400"
                />
                <span className="text-sm text-white/80">{option}</span>
              </label>
            ))}
            {field.required && selected.length === 0 && (
              <p className="text-xs text-white/40">
                Select at least one option
                <span className={theme?.accentText ?? "text-lime-400"}> *</span>
              </p>
            )}
          </div>
        );
      }

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
    case "textarea":
      return (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          placeholder={field.config?.placeholder}
          minLength={field.config?.validation?.minLength}
          maxLength={field.config?.validation?.maxLength}
          rows={4}
          className={`${inputClassName} min-h-[120px] resize-y`}
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
          min={field.type === "number" ? field.config?.validation?.minValue : undefined}
          max={field.type === "number" ? field.config?.validation?.maxValue : undefined}
          minLength={field.type !== "number" ? field.config?.validation?.minLength : undefined}
          maxLength={field.type !== "number" ? field.config?.validation?.maxLength : undefined}
          pattern={field.type !== "number" ? field.config?.validation?.pattern : undefined}
          className={inputClassName}
        />
      );
  }
}

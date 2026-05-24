"use client";

import type { RouterOutputs } from "@repo/trpc/client";

type PublicField = RouterOutputs["forms"]["getPublic"]["fields"][number];

const inputClassName =
  "w-full rounded-2xl border border-white/10 bg-white/3 px-4 py-3 text-sm outline-none focus:border-lime-400/40";

export function FormFieldInput({
  field,
  value,
  onChange,
}: {
  field: PublicField;
  value: string;
  onChange: (value: string) => void;
}) {
  switch (field.type) {
    case "select":
      return (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          className={inputClassName}
        >
          <option value="">Select an option</option>
          {(field.config?.options ?? []).map((option) => (
            <option key={option} value={option}>
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
                  active
                    ? "border-lime-400 bg-lime-400/20 text-lime-300"
                    : "border-white/10 bg-white/2 text-white/50 hover:border-lime-400/30"
                }`}
              >
                {rating}
              </button>
            );
          })}
        </div>
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

import {
  FORM_RETENTION_OPTIONS,
  formatExpiresAt,
  retentionHint,
  type FormRetentionOption,
} from "~/lib/form-retention";

type FormRetentionPickerProps = {
  value: FormRetentionOption;
  onChange: (value: FormRetentionOption) => void;
  expiresAt?: string | null;
};

export function FormRetentionPicker({ value, onChange, expiresAt }: FormRetentionPickerProps) {
  const formattedExpiry = formatExpiresAt(expiresAt);

  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-bold tracking-[0.25em] text-white/40 uppercase">
        Keep form for
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as FormRetentionOption)}
        className="form-select w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-3 py-2.5 text-sm text-white outline-none"
      >
        {FORM_RETENTION_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <p className="text-[11px] leading-relaxed text-white/35">{retentionHint(value)}</p>
      {formattedExpiry && value !== "forever" ? (
        <p className="font-mono text-[10px] text-amber-300/80">Scheduled removal: {formattedExpiry}</p>
      ) : null}
    </div>
  );
}

type AllowAnonymousResponsesToggleProps = {
  value: boolean;
  onChange: (value: boolean) => void;
};

export function AllowAnonymousResponsesToggle({ value, onChange }: AllowAnonymousResponsesToggleProps) {
  return (
    <div className="space-y-2">
      <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-white/20 bg-black/40 accent-lime-400"
        />
        <span className="space-y-1">
          <span className="block text-sm font-semibold text-white">Allow anonymous responses</span>
          <span className="block text-[11px] leading-relaxed text-white/40">
            {value
              ? "Anyone with the link can submit — no ChaiForm account needed."
              : "Only signed-in ChaiForm users can submit this form."}
          </span>
        </span>
      </label>
    </div>
  );
}

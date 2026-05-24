"use client";

import Link from "next/link";

type AuthFieldProps = React.ComponentProps<"input"> & {
  label: string;
};

export function AuthField({ label, className, id, ...props }: AuthFieldProps) {
  const fieldId = id ?? props.name;

  return (
    <div className="space-y-2">
      <label
        htmlFor={fieldId}
        className="ml-1 text-[9px] font-bold tracking-[0.2em] text-white/40 uppercase"
      >
        {label}
      </label>
      <input
        id={fieldId}
        suppressHydrationWarning
        className={`auth-input ${className ?? ""}`}
        {...props}
      />
    </div>
  );
}

export function AuthSubmitButton({
  className,
  type = "submit",
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type={type}
      suppressHydrationWarning
      className={className}
      {...props}
    />
  );
}

export function AuthModeToggle({
  mode,
}: {
  mode: "sign-in" | "sign-up";
}) {
  return (
    <div className="mt-1 flex rounded-[1.2rem] border border-white/6 bg-[#1a1a1a] p-1">
      <Link
        href="/sign-in"
        className={`flex h-10 w-12 flex-col items-center justify-center rounded-[1rem] transition-all ${
          mode === "sign-in"
            ? "bg-[#2a2a2a] text-white shadow-md"
            : "text-white/40 hover:text-white/60"
        }`}
      >
        <span className="text-[8px] leading-tight font-bold tracking-widest uppercase">Sign</span>
        <span className="text-[8px] leading-tight font-bold tracking-widest uppercase">In</span>
      </Link>
      <Link
        href="/sign-up"
        className={`flex h-10 w-12 flex-col items-center justify-center rounded-[1rem] transition-all ${
          mode === "sign-up"
            ? "bg-[#2a2a2a] text-white shadow-md"
            : "text-white/40 hover:text-white/60"
        }`}
      >
        <span className="text-[8px] leading-tight font-bold tracking-widest uppercase">Sign</span>
        <span className="text-[8px] leading-tight font-bold tracking-widest uppercase">Up</span>
      </Link>
    </div>
  );
}

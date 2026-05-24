import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

export function Highlight({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative inline-block rounded-[2px] border border-white/14 bg-white/[0.015] px-[0.055em] pb-[0.01em]",
        className,
      )}
    >
      {["-left-1 -top-1", "-right-1 -top-1", "-bottom-1 -left-1", "-bottom-1 -right-1"].map(
        (pos) => (
          <span
            key={pos}
            className={`absolute ${pos} size-1 rounded-[1px] border border-white/25 bg-black`}
          />
        ),
      )}
      {children}
    </span>
  );
}

import type { ReactNode } from "react";

/** Visually hidden but reachable by screen readers and keyboard nav. */
export function VisuallyHidden({ children }: { children: ReactNode }) {
  return (
    <span className="absolute h-px w-px overflow-hidden whitespace-nowrap border-0 p-0 [clip:rect(0,0,0,0)] [clip-path:inset(50%)]">
      {children}
    </span>
  );
}

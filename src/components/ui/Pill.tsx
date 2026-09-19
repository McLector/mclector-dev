import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** A small status indicator — e.g. the live-clock "online" dot, project status. */
export function Pill({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "positive" | "warning";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
        tone === "neutral" && "bg-[color-mix(in_oklab,var(--color-text-primary)_8%,transparent)] text-[var(--color-text-secondary)]",
        tone === "positive" && "bg-emerald-400/15 text-emerald-300 light:bg-emerald-600/15 light:text-emerald-800",
        tone === "warning" && "bg-amber-400/15 text-amber-300 light:bg-amber-600/15 light:text-amber-800",
        className,
      )}
    >
      {children}
    </span>
  );
}

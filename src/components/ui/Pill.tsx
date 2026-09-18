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
        tone === "neutral" && "bg-white/8 text-[var(--color-text-secondary)]",
        tone === "positive" && "bg-emerald-400/15 text-emerald-300",
        tone === "warning" && "bg-amber-400/15 text-amber-300",
        className,
      )}
    >
      {children}
    </span>
  );
}

import { cn } from "@/lib/cn";

/** `sm` is the compact chip used for the "Open to" row in the intro card. */
export type ChipSize = "md" | "sm";

export function Chip({
  children,
  className,
  size = "md",
}: {
  children: string;
  className?: string;
  size?: ChipSize;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-[color-mix(in_oklab,var(--color-text-primary)_8%,transparent)]",
        "font-medium text-[var(--color-text-secondary)] ring-1 ring-[var(--glass-border)]",
        size === "md" && "px-3 py-1 text-xs",
        size === "sm" && "px-2 py-[2.5px] text-[9.5px] leading-[normal] font-semibold",
        className,
      )}
    >
      {children}
    </span>
  );
}

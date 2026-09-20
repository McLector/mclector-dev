import { cn } from "@/lib/cn";

/** `sm` is the compact chip used for the "Open to" row in the intro card. */
export type ChipSize = "md" | "sm";

/**
 * `default` is the quiet neutral pill. `accent` is the arc-tinted look the "Open to"
 * row uses so it reads as availability rather than another label.
 *
 * A tone SWAPS the surface/ring/ink classes rather than layering over them: `cn` is a
 * plain joiner with no Tailwind conflict resolution, so passing an accent background
 * through `className` would emit two `background-color` rules and let stylesheet order
 * pick the winner. Every colour is a theme token, so both themes re-skin for free.
 */
export type ChipTone = "default" | "accent";

export function Chip({
  children,
  className,
  size = "md",
  tone = "default",
}: {
  children: string;
  className?: string;
  size?: ChipSize;
  tone?: ChipTone;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        tone === "default" && [
          "bg-[color-mix(in_oklab,var(--color-text-primary)_8%,transparent)]",
          "text-[var(--color-text-secondary)] ring-1 ring-[var(--glass-border)]",
        ],
        tone === "accent" && [
          "bg-[color-mix(in_oklab,var(--arc)_10%,transparent)]",
          // Inset, like the approved mockup: the ring is drawn inside the pill, not outside it.
          "text-[var(--color-text-primary)] ring-1 ring-inset",
          "ring-[color:color-mix(in_oklab,var(--arc)_36%,transparent)]",
        ],
        size === "md" && "px-3 py-1 text-xs",
        size === "sm" && "px-2 py-[2.5px] text-[9.5px] leading-[normal] font-semibold",
        className,
      )}
    >
      {children}
    </span>
  );
}

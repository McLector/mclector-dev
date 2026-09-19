import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BentoArea =
  | "intro"
  | "skills"
  | "pass"
  | "social"
  | "place"
  | "work"
  | "actions"
  | "certifications";

type BentoCardProps = {
  area: BentoArea;
  children: ReactNode;
  className?: string;
  /** Cards hosting a WebGL canvas need to bleed to their edges; padding is opt-out, not opt-in. */
  padded?: boolean;
  /** Drop the glass surface entirely so the cell floats directly in the galaxy
   *  (the badge stage and the action row). Defaults to true for the pass area. */
  bare?: boolean;
  as?: "div" | "section" | "article";
};

/**
 * The shared visual primitive for every card in the bento grid. Owned by
 * Phase 0 — feature streams compose it, they never modify it. A needed
 * variant not covered here is handled locally in the stream's own files
 * and filed for the integration pass (see docs/contracts.md).
 */
export function BentoCard({
  area,
  children,
  className,
  padded = true,
  bare,
  as: Component = "div",
}: BentoCardProps) {
  // The badge cell is not a solid card: it stays transparent so the galaxy's
  // nebula glow, stars and dot-grid read behind the hanging badge — the open
  // centre stage. Other cells can opt in via the `bare` prop.
  const isBare = bare ?? area === "pass";

  return (
    <Component
      data-bento-area={area}
      style={{ gridArea: area }}
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-card)]",
        "transition-[background-color,box-shadow,transform] duration-300",
        isBare
          ? "" // The cell floats directly in the galaxy — no surface at all.
          : // A raised glass surface floating over the stars: translucent so the
            // sky bleeds through, a bright top edge, a hairline border and a deep
            // drop shadow. Every colour is a theme token, so it re-skins for
            // light/dark automatically.
            cn(
              "bg-[var(--glass-bg)] backdrop-blur-xl",
              "shadow-[var(--glass-shadow),inset_0_1px_0_0_var(--glass-highlight),inset_0_0_0_1px_var(--glass-border)]",
            ),
        padded && "p-[clamp(1rem,0.7rem+1vw,1.5rem)]",
        className,
      )}
    >
      {children}
    </Component>
  );
}

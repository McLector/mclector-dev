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
  as: Component = "div",
}: BentoCardProps) {
  // The badge cell is not a solid card: it stays near-transparent so the
  // window's nebula glow and dot-grid read behind the hanging badge, exactly
  // like the reference's open center column.
  const bare = area === "pass";

  return (
    <Component
      data-bento-area={area}
      style={{ gridArea: area }}
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-card)]",
        bare
          ? // Faint hairline only — the badge floats in the window's own glow.
            "shadow-[inset_0_0_0_1px_oklch(1_0_0/0.05)]"
          : // A raised glass surface floating in the dark: translucent so the
            // interior glow bleeds through, a bright top edge, a hairline
            // border, and a deep drop shadow for real separation.
            cn(
              "bg-[oklch(0.155_0.011_285_/_0.72)] backdrop-blur-xl",
              "shadow-[0_24px_60px_-26px_oklch(0_0_0/0.8),inset_0_1px_0_0_oklch(1_0_0/0.08),inset_0_0_0_1px_oklch(1_0_0/0.06)]",
            ),
        padded && "p-5 sm:p-6",
        className,
      )}
    >
      {children}
    </Component>
  );
}

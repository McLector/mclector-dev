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
  return (
    <Component
      data-bento-area={area}
      style={{ gridArea: area }}
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-card)]",
        "bg-neutral-950/85 ring-1 ring-white/10",
        "shadow-[0_24px_60px_-20px_rgb(0_0_0/0.7)]",
        "backdrop-blur-xl",
        padded && "p-5 sm:p-6",
        className,
      )}
    >
      {children}
    </Component>
  );
}

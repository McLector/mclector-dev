import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/cn";

type EyebrowProps = {
  children: ReactNode;
  /** Keep real heading semantics where the label is a section heading. */
  as?: Extract<ElementType, "span" | "p" | "h2" | "h3">;
  className?: string;
};

/**
 * The livelier section subheader: an uppercase mono label with a glowing
 * arc-reactor lead dot and a cyan-tinted colour. The dot and tint live in the
 * `.eyebrow` rule in styles/index.css so they follow the theme tokens.
 * Trailing counts ("4 featured") use the plain `.count` class instead — no dot.
 */
export function Eyebrow({ children, as: Tag = "span", className }: EyebrowProps) {
  return <Tag className={cn("eyebrow font-mono", className)}>{children}</Tag>;
}

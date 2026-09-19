import { createPortal } from "react-dom";

export type SkillTip = { label: string; x: number; y: number };

/**
 * The single hover label for the whole skills grid.
 *
 * It is portaled to `<body>` on purpose: the framed window is scaled with a CSS
 * `transform`, and a transformed ancestor both clips `position: fixed` children
 * and shrinks them. The tile's `getBoundingClientRect()` is already in viewport
 * (post-scale) coordinates, so a body-level fixed node lines up exactly.
 * Purely a sighted-mouse affordance — every label is also real text in the DOM.
 */
export function SkillTooltip({ tip }: { tip: SkillTip | null }) {
  if (!tip || typeof document === "undefined") return null;
  return createPortal(
    <div
      data-skill-tooltip
      data-visible="true"
      aria-hidden="true"
      className="pointer-events-none fixed z-[60] rounded-lg border border-[var(--arc)] px-[9px] py-[5px] font-[family-name:var(--font-mono)] text-[11px] font-semibold whitespace-nowrap text-[#eafaff] shadow-[0_0_14px_-2px_var(--arc-soft)]"
      style={{
        left: tip.x,
        top: tip.y,
        background: "rgba(10,22,40,0.92)",
        transform: "translate(-50%, -100%) translateY(-6px)",
      }}
    >
      {tip.label}
    </div>,
    document.body,
  );
}

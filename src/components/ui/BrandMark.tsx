/**
 * The brand mark: the owner's M inside the arc reactor inside a hexagon (approved in round 3b: "L1 hex tile", the
 * full cut at every size). It is the SAME artwork as the tab icon, public/favicon.svg; BrandMark.test.tsx reads that
 * file and fails if the two drift apart, so change them together.
 *
 * Geometry is computed, not eyeballed: the ring's centre resolves to exactly (16, 16) (checked from the path by
 * e2e/branding.spec.ts), and the M clears the ring's inner edge. It is flat colour, two values only (the navy tile
 * and the arc cyan), and theme-independent like the hologram stage and the neon sign: it keeps its own tile, so it
 * reads on the dark card and the light card alike.
 *
 * Decorative by default: it sits beside the "@McLector" handle, which already names it.
 */
const NAVY = "#07122e";
const CYAN = "#5ec8ff";

export function BrandMark({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      aria-hidden="true"
      className={className}
    >
      <path
        d="M 16,1 L 28.99,8.5 L 28.99,23.5 L 16,31 L 3.01,23.5 L 3.01,8.5 Z"
        fill={NAVY}
        stroke={CYAN}
        strokeOpacity="0.4"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <path
        d="M 23.82,13.53 A 8.2,8.2 0 1 1 18.47,8.18"
        fill="none"
        stroke={CYAN}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M 11.8,19.7 V 12.3 L 16,17 L 20.2,12.3 V 19.7"
        fill="none"
        stroke={CYAN}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

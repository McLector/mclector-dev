import type { ReactNode } from "react";
import { useFitScale } from "./useFitScale";

/**
 * The framed window's fixed design size (logical px) — the single source of
 * truth: it is applied inline below (not in CSS) so it cannot drift from the
 * value fed to useFitScale. 770 tall is what the full 29-skill grid needs to
 * show every row without an internal scrollbar.
 */
const DESIGN_W = 1200;
const DESIGN_H = 770;

/**
 * The framed "window" the whole portfolio lives in. On desktop it is a
 * fixed-size panel scaled as one unit to fit the viewport, so the page opens
 * with everything visible and no scroll. Below the mobile breakpoint it drops
 * the scale and becomes a normal, centred scrolling column.
 *
 * Overlays (theme toggle, project overlay, contact dialog) are mounted as
 * siblings of this component in App.tsx — never inside it — because a scaled
 * (transformed) ancestor would break their `position: fixed`.
 */
export function AppFrame({ children }: { children: ReactNode }) {
  const { scale, isMobile } = useFitScale(DESIGN_W, DESIGN_H);

  if (isMobile) {
    // Padding clears the notch / home indicator (env() is 0px unless index.html sets viewport-fit=cover). The
    // bottom also leaves room for the fixed toggle dock (.toggle-dock: 2.5rem tall, 1rem up) so the last card
    // scrolls clear of it instead of ending underneath.
    return (
      <main
        className={[
          "relative z-[2] flex min-h-dvh w-full justify-center",
          "pt-[max(1.5rem,env(safe-area-inset-top,0px))]",
          "pr-[max(1rem,env(safe-area-inset-right,0px))]",
          "pl-[max(1rem,env(safe-area-inset-left,0px))]",
          "pb-[calc(5rem_+_env(safe-area-inset-bottom,0px))]",
        ].join(" ")}
      >
        <div className="app-window app-window--mobile">{children}</div>
      </main>
    );
  }

  return (
    <main className="app-fit">
      <div
        className="app-window"
        style={{ width: DESIGN_W, height: DESIGN_H, transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </main>
  );
}

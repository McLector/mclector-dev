import { useEffect, useState } from "react";

/**
 * The scale factor that makes a fixed `dw × dh` design fit inside a
 * `vw × vh` viewport (minus `pad` of breathing room), never magnified past
 * 1:1. This is what lets the whole framed window sit on one screen without
 * scrolling — the desktop portfolio is designed at a fixed size and shrunk to
 * fit, rather than reflowed.
 */
export function computeFitScale(
  vw: number,
  vh: number,
  dw: number,
  dh: number,
  pad = 48,
): number {
  const availW = Math.max(1, vw - pad);
  const availH = Math.max(1, vh - pad);
  return Math.min(availW / dw, availH / dh, 1);
}

/** Below this width the framed, scaled layout gives way to a scrolling stack. */
export const MOBILE_MAX = 860;

export type FitState = { scale: number; isMobile: boolean };

/**
 * Live fit scale for the framed window. Recomputes on resize; returns
 * `scale: 1` on mobile (where the layout scrolls instead of scaling) and
 * during SSR/first paint before measurements exist.
 */
export function useFitScale(designW: number, designH: number): FitState {
  const read = (): FitState => {
    if (typeof window === "undefined") return { scale: 1, isMobile: false };
    const isMobile = window.innerWidth <= MOBILE_MAX;
    return {
      isMobile,
      scale: isMobile
        ? 1
        : computeFitScale(window.innerWidth, window.innerHeight, designW, designH),
    };
  };

  const [state, setState] = useState<FitState>(read);

  useEffect(() => {
    const onResize = () => setState(read());
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // read closes over the two design dimensions; re-subscribe if they change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designW, designH]);

  return state;
}

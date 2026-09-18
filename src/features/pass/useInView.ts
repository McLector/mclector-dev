import { useCallback, useEffect, useRef, useState } from "react";

export type UseInViewOptions = {
  /** Pre-load margin — the 3D chunk starts downloading before the card scrolls in. */
  rootMargin?: string;
  threshold?: number | number[];
  /** Latch on first intersection and stop observing (used for the lazy import). */
  once?: boolean;
};

/**
 * Visibility gate for the 3D canvas.
 *
 * Two jobs: deciding when to download the lazy 3D chunk (`once: true`), and
 * pausing the render loop while the card is off-screen (`once: false`) — the
 * second half of "don't cook the reviewer's laptop while they read the bio".
 *
 * Returns a callback ref rather than a RefObject so the observer attaches the
 * instant the node mounts, with no extra render.
 */
export function useInView({ rootMargin = "200px", threshold = 0, once = false }: UseInViewOptions = {}) {
  const [inView, setInView] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const nodeRef = useRef<Element | null>(null);

  const disconnect = useCallback(() => {
    observerRef.current?.disconnect();
    observerRef.current = null;
  }, []);

  const ref = useCallback(
    (node: Element | null) => {
      disconnect();
      nodeRef.current = node;
      if (!node) return;

      // No IntersectionObserver (old Safari, some test environments) — assume
      // visible rather than silently never rendering the badge.
      if (typeof IntersectionObserver !== "function") {
        setInView(true);
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[entries.length - 1];
          if (!entry) return;
          if (entry.isIntersecting) {
            setInView(true);
            if (once) disconnect();
          } else if (!once) {
            setInView(false);
          }
        },
        { rootMargin, threshold },
      );
      observer.observe(node);
      observerRef.current = observer;
    },
    [disconnect, once, rootMargin, threshold],
  );

  useEffect(() => disconnect, [disconnect]);

  return { ref, inView };
}

import { useEffect, type RefObject } from "react";

/**
 * Keeps Tab / Shift+Tab inside `containerRef` while `active`.
 *
 * The list of focusable elements is recomputed on every Tab rather than
 * cached at mount: the overlay's content changes with the open project, and
 * a trap built on a stale snapshot silently lets focus escape (or traps it
 * on a removed node). The cost is one `querySelectorAll` per keypress.
 *
 * Elements with `tabindex="-1"` (such as the dialog heading we focus on
 * open) are intentionally NOT boundaries — they are programmatically
 * focusable but not tab stops, so they must not become the wrap point.
 */

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "audio[controls]",
  "video[controls]",
  "[contenteditable]:not([contenteditable='false'])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function focusableWithin(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) =>
      !element.hasAttribute("inert") &&
      element.getAttribute("aria-hidden") !== "true" &&
      element.closest("[inert]") === null,
  );
}

export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
): void {
  useEffect(() => {
    if (!active) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || event.defaultPrevented) return;

      const container = containerRef.current;
      if (!container) return;

      const focusable = focusableWithin(container);
      // Nothing to move to — swallow the Tab rather than letting focus slip
      // out to the (inert, scroll-locked) page behind the dialog.
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement as HTMLElement | null;
      const inside = current !== null && container.contains(current);

      if (event.shiftKey) {
        if (!inside || current === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (!inside || current === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [containerRef, active]);
}

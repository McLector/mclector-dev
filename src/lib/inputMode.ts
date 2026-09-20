/**
 * Which kind of input the visitor is actually using: a mouse (or pen), which can hover, or touch, which cannot.
 *
 * WHY THIS EXISTS. Hover effects used to be gated by `@media (hover: hover) and (pointer: fine)`. That asks the
 * browser what the DEVICE is, and some devices answer wrongly for the input in use (a touchscreen laptop was the
 * owner's): hover never fired, and the social hexagons fell back to showing every name permanently. So the mode is
 * decided by real events instead. The `<html data-input>` attribute is the single source of truth and every hover
 * rule keys off `[data-input="mouse"]`.
 *
 * Pure decision logic is exported and unit-tested; `installInputMode` wires the events.
 * Keep the inline boot script in index.html in agreement with {@link initialInputMode}.
 */

export type InputMode = "mouse" | "touch";

/**
 * The mode after a pointer event of `pointerType`. Touch means touch; a mouse or a pen can hover, so both mean
 * mouse. Anything unrecognised leaves the mode alone.
 */
export function modeForPointer(pointerType: string, current: InputMode): InputMode {
  if (pointerType === "touch") return "touch";
  if (pointerType === "mouse" || pointerType === "pen") return "mouse";
  return current;
}

/**
 * The first-paint guess, before any pointer has moved: mouse if ANY input can hover, otherwise touch.
 * It is only a hint. The first real pointer event overrides it, so a wrong answer costs one animated swap.
 */
export function initialInputMode(anyHover: boolean): InputMode {
  return anyHover ? "mouse" : "touch";
}

/** The current mode. Absent or unrecognised means touch: with no evidence of a mouse, hover-free styling is safe. */
export function getInputMode(root: HTMLElement = document.documentElement): InputMode {
  return root.dataset.input === "mouse" ? "mouse" : "touch";
}

/**
 * Seed the attribute if the boot script did not, then follow the visitor's real input. Listeners are on `window`
 * in the CAPTURE phase so a component that stops propagation cannot hide an event from them. Returns an
 * uninstall function.
 */
export function installInputMode(root: HTMLElement, win: Window): () => void {
  if (root.dataset.input !== "mouse" && root.dataset.input !== "touch") {
    const anyHover = typeof win.matchMedia === "function" && win.matchMedia("(any-hover: hover)").matches;
    root.dataset.input = initialInputMode(anyHover);
  }

  const onPointer = (event: Event) => {
    const current = getInputMode(root);
    const next = modeForPointer((event as PointerEvent).pointerType ?? "", current);
    if (next !== current) root.dataset.input = next;
  };

  win.addEventListener("pointerdown", onPointer, true);
  win.addEventListener("pointermove", onPointer, true);
  return () => {
    win.removeEventListener("pointerdown", onPointer, true);
    win.removeEventListener("pointermove", onPointer, true);
  };
}

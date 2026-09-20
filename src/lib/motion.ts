/**
 * The visitor's Animations setting (the toggle top-right). Same shape as `theme.ts`: pure decision logic
 * here, unit-tested directly; the toggle and the components that react to it live elsewhere.
 *
 * WHAT IT GOVERNS: ambient, decorative motion only: the starfield, falling code and drifting rocks, the
 * comet, pointer parallax, the hologram's autonomous spin, the status ripple, entrance staggers and the
 * project overlay's large open/close motion.
 *
 * WHAT IT NEVER TOUCHES: hover, focus and active transitions. They are locked on, in both states, for every
 * visitor. The `[data-motion="off"]` CSS rule freezes keyframe animations and nothing else.
 *
 * THE OS `prefers-reduced-motion` SETTING IS NOT AN INPUT (owner decision). The default is on for everyone;
 * this toggle is the visitor's only way to switch ambient motion off, which is why it is visible and labelled.
 * Seeding the default from the OS later would be a one-line change in {@link resolveInitialMotion}.
 * Keep the inline boot script in index.html in agreement with that rule.
 */

export const MOTIONS = ["on", "off"] as const;
export type Motion = (typeof MOTIONS)[number];

/** What every visitor gets until they switch it off. */
export const DEFAULT_MOTION: Motion = "on";

/** localStorage key the visitor's explicit choice is persisted under. */
export const MOTION_STORAGE_KEY = "mclector-motion";

export function isMotion(value: unknown): value is Motion {
  return value === "on" || value === "off";
}

/**
 * Resolve the setting to apply on first paint: "off" only for an explicit stored "off", otherwise "on".
 * A corrupt or unknown stored value falls back to on, so it can never silently freeze the site.
 */
export function resolveInitialMotion(stored: string | null | undefined): Motion {
  return stored === "off" ? "off" : "on";
}

/** The other setting: what the toggle switches to. */
export function nextMotion(motion: Motion): Motion {
  return motion === "on" ? "off" : "on";
}

/* ---------------------------------------------------------------------------------------------------------
 * The live setting. The `<html data-motion>` attribute is the single source of truth: the inline boot script
 * sets it before first paint, CSS keys off it, and everything else reads it. Reading it is a plain property
 * access, cheap enough for a per-frame check in the galaxy's draw loop.
 * ------------------------------------------------------------------------------------------------------- */

const listeners = new Set<(motion: Motion) => void>();

function readStored(): string | null {
  try {
    return localStorage.getItem(MOTION_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** The current setting. An absent or unrecognised attribute means on. */
export function getMotion(root: HTMLElement = document.documentElement): Motion {
  return root.dataset.motion === "off" ? "off" : "on";
}

/** True while ambient motion should run. */
export function motionOn(root: HTMLElement = document.documentElement): boolean {
  return getMotion(root) === "on";
}

/**
 * Make sure the attribute exists. The boot script normally has already set it; this covers the case where it
 * did not run, so the attribute (and therefore the CSS) never disagrees with the stored choice.
 */
export function initMotion(root: HTMLElement = document.documentElement): void {
  if (!isMotion(root.dataset.motion)) root.dataset.motion = resolveInitialMotion(readStored());
}

/** Apply a setting: write the attribute, remember the choice, and tell subscribers if it actually changed. */
export function setMotion(next: Motion, root: HTMLElement = document.documentElement): void {
  const changed = getMotion(root) !== next;
  root.dataset.motion = next;
  try {
    localStorage.setItem(MOTION_STORAGE_KEY, next);
  } catch {
    // Persisting is a convenience, not a requirement: a private window must not break the toggle.
  }
  if (changed) for (const listener of listeners) listener(next);
}

/** Subscribe to changes. Returns the unsubscribe function. */
export function subscribeMotion(listener: (motion: Motion) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

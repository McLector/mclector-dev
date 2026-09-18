import type { ImageRef } from "./types";

/**
 * The asset swap point. Adding a real photo, CV, or screenshot is a
 * one-line edit here (or directly on the relevant `ImageRef` in
 * profile.ts / projects.ts) — never a component change.
 *
 * Example, once a real avatar photo exists at public/avatar.jpg:
 *   profile.avatar.src = "/avatar.jpg"
 */
export function placeholderImage(
  seed: string,
  alt: string,
  from = "#4f7cff",
  to = "#b34fff",
): ImageRef {
  return {
    alt,
    placeholder: { kind: "gradient", seed, from, to },
  };
}

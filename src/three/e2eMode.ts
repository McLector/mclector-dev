/**
 * Deterministic mode for visual regression tests.
 *
 * ## How to trigger it
 *
 *   http://localhost:5173/?e2e=1
 *
 * Any of these also work, so a Playwright project can pick whichever is
 * convenient: the query param `?e2e=1`, or building with
 * `VITE_E2E=1 npm run build`.
 *
 * ## What it changes
 *
 * - The scene runs until the badge reaches its hanging rest pose, at which
 *   point the strap interpolation is snapped to exact values, `<Physics>` is
 *   paused and the per-frame update short-circuits. Every frame after that is
 *   byte-identical, so a screenshot baseline cannot flake.
 *
 *   A rest pose is used rather than "stop after exactly N steps" deliberately:
 *   a hanging badge is a stable attractor, so the pose does not depend on how
 *   many physics steps a given machine happened to run in wall-clock time.
 *   {@link E2E_FREEZE_STEPS} is only the safety cap for a renderer so slow it
 *   never gets there.
 * - The starfield is disabled and the strap texture's `offset.x` drift is
 *   frozen, removing the two per-frame animations.
 * - Any randomness routes through {@link seededRandom}, so repeated runs draw
 *   identical frames.
 *
 * Note the textures themselves are already deterministic (no `Math.random` in
 * `badgeFaceTexture.ts` / `bandTexture.ts`); this flag only freezes *time*.
 */

/** Safety cap: force the freeze after this many frames even if rest is never
 *  detected (e.g. a software rasteriser running at a few frames per second). */
export const E2E_FREEZE_STEPS = 900;

export function isE2EMode(): boolean {
  if (import.meta.env?.VITE_E2E === "1") return true;
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get("e2e") === "1";
  } catch {
    return false;
  }
}

/** A tiny deterministic PRNG (mulberry32). Same seed → same sequence. */
export function seededRandom(seed = 0x9e3779b9): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

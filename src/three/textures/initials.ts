/**
 * Lives in its own module on purpose.
 *
 * `BadgeFallback` runs in the INITIAL bundle (it is what PassCard renders
 * before, or instead of, the 3D chunk) and needs the monogram, but nothing
 * else from `badgeFaceTexture.ts`. Importing it from there dragged the whole
 * canvas painter — font stacks, barcode loop, gradient tables — into the
 * non-lazy chunk, because the module is not side-effect-free enough for the
 * bundler to shake it. Splitting this one function out fixes that.
 */

/** Initials for the monogram: first letter of the first and last word. */
export function initialsFrom(name: string): string {
  const words = name.trim().split(/\s+/u).filter(Boolean);
  if (words.length === 0) return "?";

  const firstOf = (word: string) => Array.from(word)[0] ?? "";
  if (words.length === 1) {
    return Array.from(words[0]).slice(0, 2).join("").toUpperCase();
  }
  return (firstOf(words[0]) + firstOf(words[words.length - 1])).toUpperCase();
}

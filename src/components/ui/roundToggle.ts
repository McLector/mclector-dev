/**
 * The shared look of the two round toggles top-right (day/night and Animations): a 40px disc on the window
 * material with a hairline ring. One definition, so the pair can never drift apart.
 *
 * `hover-fine:` is Tailwind's hover variant keyed to a real mouse (see the `@custom-variant` note in
 * styles/index.css); the transition is a locked-on interaction effect, never switched off by the Animations toggle.
 */
export const ROUND_TOGGLE_CLASSES = [
  "group relative grid size-10 place-items-center overflow-hidden rounded-full",
  // The window-panel surface (as in the approved mockup): at dusk --glass-bg is
  // now a near-white .9 that would read as a bright disc on the sky.
  "bg-[var(--panel)] text-[var(--color-text-secondary)] backdrop-blur-md",
  "ring-1 ring-[var(--panel-edge)] shadow-[var(--glass-shadow)]",
  "transition-[transform,color] duration-200 active:scale-[0.92]",
  "hover-fine:text-[var(--color-text-primary)]",
  "focus-visible:outline-2 focus-visible:outline-[var(--color-accent-blue)]",
].join(" ");

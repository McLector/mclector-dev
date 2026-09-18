/**
 * The vivid gradient WALLPAPER behind the inset app window. Unlike the previous
 * full-bleed version, this is only ever seen as a colored frame around the
 * near-black window (see `.wallpaper` / `.app-window` in src/styles/index.css) —
 * it is not the background of the cards. CSS, not WebGL: cheaper,
 * GPU-composited, and trivially frozen under prefers-reduced-motion.
 */
export function GradientBackdrop() {
  return <div aria-hidden="true" className="wallpaper" />;
}

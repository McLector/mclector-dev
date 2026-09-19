/**
 * The full-bleed galaxy behind the whole portfolio: a night/dawn sky, breathing
 * nebula clouds, two twinkling star fields, a faint dot-grid and an occasional
 * shooting star. All CSS (see `.galaxy` / `.stars` / `.comet` in
 * src/styles/index.css) — cheap, GPU-composited, and frozen under
 * `prefers-reduced-motion`. Colours are theme tokens, so it re-skins for
 * light/dark with no JS.
 */
export function GalaxyBackdrop() {
  return (
    <>
      <div aria-hidden="true" className="galaxy" />
      <div aria-hidden="true" className="stars" />
      <div aria-hidden="true" className="stars-bright" />
      <div aria-hidden="true" className="comet" />
      <div aria-hidden="true" className="starfield-grid" />
    </>
  );
}

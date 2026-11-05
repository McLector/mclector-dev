/**
 * The full-bleed backdrop behind the portfolio: a sky, two star layers and a horizon hairline, all plain
 * layers. The look lives in index.css; any motion is CSS too, governed by the Animations toggle through
 * html[data-motion]. There is no canvas, pointer tracking or frame loop here.
 */
export function GalaxyBackdrop() {
  return (
    <>
      <div aria-hidden="true" className="galaxy" />
      <div aria-hidden="true" className="stars" />
      <div aria-hidden="true" className="stars-near" />
      <div aria-hidden="true" className="horizon-line" />
    </>
  );
}

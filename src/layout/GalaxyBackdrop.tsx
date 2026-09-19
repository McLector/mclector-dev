import { useEffect, useRef } from "react";
import { makeAsteroids, makeRainColumns, type Asteroid, type RainColumn } from "./galaxyCanvas";

/**
 * The full-bleed galaxy behind the portfolio: CSS sky + nebula + twinkling
 * star layers (in index.css), plus a 2D canvas of drifting asteroids, an
 * occasional comet, and a faint binary data-rain — and mouse parallax on the
 * star layers. All motion is frozen under `prefers-reduced-motion`.
 */
export function GalaxyBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const parallaxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    const colW = 22;
    let rocks: Asteroid[] = [];
    let cols: RainColumn[] = [];

    const size = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      rocks = makeAsteroids(11, w, h);
      cols = makeRainColumns(w, colW, 60);
    };
    size();
    window.addEventListener("resize", size);

    // Theme-reactive rain colour.
    let rainCol = "";
    const readRain = () =>
      getComputedStyle(document.documentElement).getPropertyValue("--rain").trim() ||
      "rgba(90,200,255,0.5)";
    rainCol = readRain();
    const themeObserver = new MutationObserver(() => {
      rainCol = readRain();
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    let comet: { x: number; y: number; vx: number; vy: number } | null = null;
    let ct = 0;
    let raf = 0;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // data rain (stable glyph per cell → no flicker)
      if (!reduce) {
        ctx.font = "12px 'Space Mono', monospace";
        ctx.textAlign = "left";
        for (let c = 0; c < cols.length; c++) {
          const col = cols[c];
          const x = c * colW + 4;
          const row = Math.floor(col.y / 15);
          for (let k = 0; k < 9; k++) {
            const rr = row - k;
            if (rr < 0) continue;
            const yy = rr * 15;
            if (yy > h + 15) continue;
            const ch = col.str[((rr % 60) + 60) % 60];
            const op = k === 0 ? 0.55 : 0.3 * (1 - k / 9);
            ctx.fillStyle =
              k === 0 ? `rgba(190,240,255,${op})` : rainCol.replace(/[\d.]+\)$/, `${op.toFixed(2)})`);
            ctx.fillText(ch, x, yy);
          }
          col.y += col.sp * 2.4;
          if ((row - 9) * 15 > h) col.y = -Math.random() * 140;
        }
      }

      // asteroids
      for (const r of rocks) {
        if (!reduce) {
          r.x += r.vx;
          r.y += r.vy;
          r.rot += r.vr;
        }
        if (r.x < -40) r.x = w + 40;
        if (r.y < -40) r.y = h + 40;
        if (r.y > h + 40) r.y = -40;
        ctx.save();
        ctx.translate(r.x, r.y);
        ctx.rotate(r.rot);
        ctx.beginPath();
        ctx.moveTo(r.verts[0][0], r.verts[0][1]);
        for (let m = 1; m < r.verts.length; m++) ctx.lineTo(r.verts[m][0], r.verts[m][1]);
        ctx.closePath();
        const g = ctx.createLinearGradient(-8, -8, 8, 8);
        g.addColorStop(0, `rgba(155,168,205,${0.28 * r.depth})`);
        g.addColorStop(1, `rgba(55,66,100,${0.16 * r.depth})`);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = `rgba(180,205,255,${0.1 * r.depth})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();
        ctx.restore();
      }

      // comet
      if (!reduce) {
        ct++;
        if (!comet && ct > 150 && Math.random() < 0.012) {
          comet = { x: -60, y: Math.random() * h * 0.55, vx: 6 + Math.random() * 4, vy: 1.6 + Math.random() * 1.8 };
          ct = 0;
        }
        if (comet) {
          comet.x += comet.vx;
          comet.y += comet.vy;
          const tx = comet.x - comet.vx * 15;
          const ty = comet.y - comet.vy * 15;
          const cg = ctx.createLinearGradient(tx, ty, comet.x, comet.y);
          cg.addColorStop(0, "rgba(160,220,255,0)");
          cg.addColorStop(1, "rgba(210,238,255,0.9)");
          ctx.strokeStyle = cg;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(comet.x, comet.y);
          ctx.stroke();
          ctx.fillStyle = "rgba(225,242,255,0.95)";
          ctx.beginPath();
          ctx.arc(comet.x, comet.y, 2, 0, 7);
          ctx.fill();
          if (comet.x > w + 100 || comet.y > h + 100) comet = null;
        }
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    // parallax
    const onMove = (e: PointerEvent) => {
      if (reduce || !parallaxRef.current) return;
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      parallaxRef.current.style.transform = `translate(${-nx * 16}px, ${-ny * 12}px)`;
    };
    window.addEventListener("pointermove", onMove);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", size);
      window.removeEventListener("pointermove", onMove);
      themeObserver.disconnect();
    };
  }, []);

  return (
    <>
      <div aria-hidden="true" className="galaxy" />
      <div ref={parallaxRef} aria-hidden="true" className="galaxy-parallax">
        <div className="stars" />
        <div className="stars-bright" />
      </div>
      <canvas ref={canvasRef} aria-hidden="true" className="galaxy-canvas" />
      <div aria-hidden="true" className="starfield-grid" />
    </>
  );
}

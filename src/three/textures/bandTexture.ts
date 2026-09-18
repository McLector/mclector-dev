/**
 * The lanyard strap texture.
 *
 * Split in two on purpose:
 *   - `computeBandSpec` is a pure description of what to paint (gradient
 *     stops, repeated lettering positions, deterministic noise specks). It is
 *     unit-tested.
 *   - `drawBandStrip` walks that spec onto a 2D context. Also pure w.r.t. its
 *     inputs and testable with a recorder ctx.
 *   - `createBandTexture` (textures/createBandTexture.ts) is the untested
 *     glue that allocates a canvas and wraps it in a THREE.Texture with
 *     RepeatWrapping.
 *
 * Determinism matters beyond tidiness: `?e2e=1` visual baselines require the
 * strap to be byte-identical across runs, so there is no `Math.random` here.
 */

export interface BandGradientLike {
  addColorStop(offset: number, color: string): void;
}

/** The narrow slice of CanvasRenderingContext2D the strap painter uses. */
export interface BandCanvasContext {
  fillStyle: string | object;
  globalAlpha: number;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  rotate(angle: number): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  fillText(text: string, x: number, y: number, maxWidth?: number): void;
  measureText(text: string): { width: number };
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): BandGradientLike;
}

export type BandSpecOptions = {
  width: number;
  height: number;
  accentFrom: string;
  accentTo: string;
  /** Repeated lettering, e.g. the GitHub handle. Empty → no lettering. */
  label: string;
  /** Deterministic noise seed. */
  seed?: number;
  /** How many times the label repeats down the strip. */
  labelRepeats?: number;
};

export type BandSpec = {
  width: number;
  height: number;
  gradient: {
    from: [number, number];
    to: [number, number];
    stops: Array<[number, string]>;
  };
  labels: Array<{ text: string; y: number }>;
  noise: Array<{ x: number; y: number; w: number; h: number; alpha: number }>;
  fontSize: number;
};

/**
 * 32 × 1024: narrow and tall. The strap's UV runs down its length, so all the
 * resolution belongs on the long axis; 32px across is plenty for a ribbon a
 * few dozen pixels wide on screen.
 */
export const BAND_TEXTURE_SIZE = { width: 32, height: 1024 } as const;

const NOISE_COUNT = 240;

/** Deterministic [0,1) hash — no Math.random, so baselines stay stable. */
function hash(n: number, seed: number): number {
  const x = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function computeBandSpec(options: BandSpecOptions): BandSpec {
  const width = Math.max(0, options.width);
  const height = Math.max(0, options.height);
  const seed = options.seed ?? 7;
  const repeats = Math.max(1, options.labelRepeats ?? 8);
  const fontSize = Math.max(1, Math.round(width * 0.42));

  const gradient: BandSpec["gradient"] = {
    from: [0, 0],
    to: [0, height],
    stops: [
      [0, options.accentFrom],
      [0.28, "rgba(255,255,255,0.14)"],
      [0.5, "rgba(8,8,14,0.55)"],
      [0.72, "rgba(255,255,255,0.10)"],
      [1, options.accentTo],
    ],
  };

  const text = options.label.trim();
  const labels: BandSpec["labels"] =
    text && height > 0
      ? Array.from({ length: repeats }, (_, i) => ({
          text,
          y: ((i + 0.5) * height) / repeats,
        }))
      : [];

  const noise: BandSpec["noise"] = [];
  if (width > 0 && height > 0) {
    for (let i = 0; i < NOISE_COUNT; i++) {
      const w = Math.min(width, 1 + hash(i * 3, seed) * 2);
      const h = Math.min(height, 1 + hash(i * 3 + 1, seed) * 3);
      noise.push({
        x: hash(i * 3 + 2, seed) * (width - w),
        y: hash(i * 5, seed) * (height - h),
        w,
        h,
        alpha: 0.04 + hash(i * 7, seed) * 0.1,
      });
    }
  }

  return { width, height, gradient, labels, noise, fontSize };
}

export function drawBandStrip(ctx: BandCanvasContext, spec: BandSpec): void {
  const { width, height } = spec;

  ctx.save();

  const grad = ctx.createLinearGradient(
    spec.gradient.from[0],
    spec.gradient.from[1],
    spec.gradient.to[0],
    spec.gradient.to[1],
  );
  for (const [offset, color] of spec.gradient.stops) grad.addColorStop(offset, color);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Stitched edges — two thin light rails.
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  const rail = Math.max(0, width * 0.06);
  ctx.fillRect(rail, 0, Math.max(0, width * 0.02), height);
  ctx.fillRect(Math.max(0, width - rail), 0, Math.max(0, width * 0.02), height);

  // Repeated lettering, rotated to run along the strap.
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = `700 ${spec.fontSize}px "JetBrains Mono", Consolas, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const label of spec.labels) {
    ctx.save();
    ctx.translate(width / 2, label.y);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(label.text, 0, 0);
    ctx.restore();
  }

  // Fabric noise.
  ctx.fillStyle = "rgba(255,255,255,1)";
  for (const speck of spec.noise) {
    ctx.globalAlpha = speck.alpha;
    ctx.fillRect(speck.x, speck.y, speck.w, speck.h);
  }
  ctx.globalAlpha = 1;

  ctx.restore();
}

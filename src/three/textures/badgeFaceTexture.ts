/**
 * The badge face — a pure function of content.
 *
 * `drawBadgeFace` paints the whole ID-card front onto a 2D context. It has no
 * React, three, WebGL or DOM-lookup dependency: hand it any object that
 * implements {@link BadgeCanvasContext} and it will record a deterministic
 * sequence of drawing calls. That is what makes it the most testable piece of
 * the 3D stream — tests inject a recorder and assert on calls, never pixels.
 *
 * `createBadgeFaceTexture` (textures/createBadgeTexture.ts) is the thin,
 * untested glue that allocates a real canvas and wraps the result in a
 * THREE.CanvasTexture.
 */

import { initialsFrom } from "./initials";

/** Minimal structural subset of CanvasGradient. */
export interface GradientLike {
  addColorStop(offset: number, color: string): void;
}

/**
 * The narrow slice of CanvasRenderingContext2D this module uses. A real
 * `CanvasRenderingContext2D` is assignable to it (asserted in the tests), so
 * production passes the genuine thing and tests pass a recorder.
 */
export interface BadgeCanvasContext {
  fillStyle: string | object;
  strokeStyle: string | object;
  lineWidth: number;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  globalAlpha: number;

  save(): void;
  restore(): void;
  beginPath(): void;
  closePath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void;
  fill(): void;
  stroke(): void;
  clip(): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  fillText(text: string, x: number, y: number, maxWidth?: number): void;
  measureText(text: string): { width: number };
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): GradientLike;
  drawImage(image: CanvasImageSource, dx: number, dy: number, dw: number, dh: number): void;
  /** Not in every engine (and absent from jsdom); the rounded-rect helper falls back to arcTo. */
  roundRect?(x: number, y: number, w: number, h: number, radii?: number): void;
}

export type BadgeFaceData = {
  width: number;
  height: number;
  /** Source of the monogram when there is no avatar. */
  displayName: string;
  title: string;
  subtitle: string;
  idLabel: string;
  caption: string;
  accentFrom: string;
  accentTo: string;
  /** A decoded image. Absent/null → the monogram path. */
  avatar?: CanvasImageSource | null;
};

/**
 * Texture resolution. 512 × 720 matches the card's 1.6 × 2.25 aspect exactly
 * (0.7111…) and is a comfortable power-of-two-ish size for a face that is
 * only ever seen at a slight angle.
 */
export const BADGE_FACE_SIZE = { width: 512, height: 720 } as const;

const FONT_STACK =
  '"Inter", "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';
const MONO_STACK = '"JetBrains Mono", "SFMono-Regular", Consolas, monospace';

const INK = "#f4f4f7";
const INK_DIM = "rgba(244,244,247,0.62)";
const PANEL = "rgba(10,10,15,0.55)";

/** Re-exported for convenience; the implementation lives in its own module so
 *  the initial bundle can take the monogram without the painter. */
export { initialsFrom };

/**
 * Shrink `text` until it measures within `maxWidth` under the context's
 * current font, appending an ellipsis. Returns the ellipsis alone when even
 * one glyph will not fit — the card must never overflow, whatever the content
 * module says.
 */
export function fitText(
  ctx: BadgeCanvasContext,
  text: string,
  maxWidth: number,
): string {
  if (!text) return "";
  if (maxWidth > 0 && ctx.measureText(text).width <= maxWidth) return text;

  const glyphs = Array.from(text);
  for (let i = glyphs.length - 1; i > 0; i--) {
    const candidate = glyphs.slice(0, i).join("").trimEnd() + "…";
    if (maxWidth > 0 && ctx.measureText(candidate).width <= maxWidth) return candidate;
  }
  return "…";
}

function roundedRectPath(
  ctx: BadgeCanvasContext,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
): void {
  const width = Math.max(0, w);
  const height = Math.max(0, h);
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));

  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, width, height, r);
    return;
  }
  // jsdom and older Safari have no roundRect.
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.arcTo(x + width, y, x + width, y + r, r);
  ctx.lineTo(x + width, y + height - r);
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
  ctx.lineTo(x + r, y + height);
  ctx.arcTo(x, y + height, x, y + height - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/** Paint the complete badge face. Pure with respect to `data`. */
export function drawBadgeFace(ctx: BadgeCanvasContext, data: BadgeFaceData): void {
  const w = Math.max(0, data.width);
  const h = Math.max(0, data.height);
  const pad = Math.max(0, Math.round(w * 0.085));
  const inner = Math.max(0, w - pad * 2);

  ctx.save();

  // --- Base: a diagonal accent gradient, then a dark panel for contrast ---
  const base = ctx.createLinearGradient(0, 0, w, h);
  base.addColorStop(0, data.accentFrom);
  base.addColorStop(1, data.accentTo);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  // A soft vertical sheen so the plastic reads as curved even head-on.
  const sheen = ctx.createLinearGradient(0, 0, 0, h);
  sheen.addColorStop(0, "rgba(255,255,255,0.22)");
  sheen.addColorStop(0.45, "rgba(255,255,255,0.03)");
  sheen.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, w, h);

  // --- Punch hole for the clip, top centre ---
  const holeR = Math.max(0, w * 0.045);
  const holeY = Math.max(0, h * 0.055);
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  roundedRectPath(ctx, w / 2 - holeR * 2.4, holeY - holeR * 0.7, holeR * 4.8, holeR * 1.4, holeR);
  ctx.fill();
  ctx.restore();

  // --- Portrait frame -----------------------------------------------------
  const photoTop = Math.max(0, h * 0.14);
  const photoSize = Math.max(0, Math.min(inner, h * 0.36));
  const photoX = Math.max(0, (w - photoSize) / 2);
  const photoR = photoSize * 0.18;

  ctx.save();
  roundedRectPath(ctx, photoX, photoTop, photoSize, photoSize, photoR);
  ctx.clip();

  if (data.avatar) {
    ctx.drawImage(data.avatar, photoX, photoTop, photoSize, photoSize);
  } else {
    const monoFill = ctx.createLinearGradient(
      photoX,
      photoTop,
      photoX + photoSize,
      photoTop + photoSize,
    );
    monoFill.addColorStop(0, data.accentTo);
    monoFill.addColorStop(1, data.accentFrom);
    ctx.fillStyle = monoFill;
    ctx.fillRect(photoX, photoTop, photoSize, photoSize);

    ctx.fillStyle = "rgba(0,0,0,0.30)";
    ctx.fillRect(photoX, photoTop, photoSize, photoSize);

    ctx.fillStyle = INK;
    ctx.font = `600 ${Math.max(1, Math.round(photoSize * 0.42))}px ${FONT_STACK}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initialsFrom(data.displayName), photoX + photoSize / 2, photoTop + photoSize / 2);
  }
  ctx.restore();

  // A hairline frame drawn after the clip is released.
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = Math.max(1, w * 0.004);
  roundedRectPath(ctx, photoX, photoTop, photoSize, photoSize, photoR);
  ctx.stroke();
  ctx.restore();

  // --- Identity block -----------------------------------------------------
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const titleY = Math.min(h, photoTop + photoSize + h * 0.085);
  ctx.fillStyle = INK;
  ctx.font = `700 ${Math.max(1, Math.round(w * 0.088))}px ${FONT_STACK}`;
  const title = fitText(ctx, data.title, inner);
  if (title) ctx.fillText(title, w / 2, titleY);

  const subtitleY = Math.min(h, titleY + h * 0.052);
  ctx.fillStyle = INK_DIM;
  ctx.font = `500 ${Math.max(1, Math.round(w * 0.044))}px ${FONT_STACK}`;
  const subtitle = fitText(ctx, data.subtitle, inner);
  if (subtitle) ctx.fillText(subtitle, w / 2, subtitleY);

  // --- ID chip ------------------------------------------------------------
  ctx.font = `600 ${Math.max(1, Math.round(w * 0.042))}px ${MONO_STACK}`;
  const idText = fitText(ctx, data.idLabel, inner * 0.8);
  if (idText) {
    const chipW = Math.max(0, Math.min(inner, ctx.measureText(idText).width + w * 0.09));
    const chipH = Math.max(0, h * 0.052);
    const chipY = Math.min(h - chipH, subtitleY + h * 0.045);
    ctx.save();
    ctx.fillStyle = PANEL;
    roundedRectPath(ctx, (w - chipW) / 2, chipY, chipW, chipH, chipH / 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = INK;
    ctx.fillText(idText, w / 2, Math.min(h, chipY + chipH / 2));
  }

  // --- Barcode strip + caption -------------------------------------------
  const stripY = Math.max(0, h * 0.875);
  const stripH = Math.max(0, h * 0.035);
  const barCount = 34;
  const barGap = inner / barCount;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  for (let i = 0; i < barCount; i++) {
    // Deterministic pseudo-random widths — no Math.random, so the face is
    // byte-identical across runs (which is what ?e2e=1 relies on).
    const seeded = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    const wide = Math.abs(seeded) > 0.6;
    ctx.fillRect(
      pad + i * barGap,
      stripY,
      Math.max(0, barGap * (wide ? 0.62 : 0.28)),
      stripH,
    );
  }
  ctx.restore();

  const captionY = Math.min(h, stripY + stripH + h * 0.035);
  ctx.fillStyle = INK_DIM;
  ctx.font = `600 ${Math.max(1, Math.round(w * 0.034))}px ${MONO_STACK}`;
  const caption = fitText(ctx, data.caption, inner);
  if (caption) ctx.fillText(caption, w / 2, captionY);

  ctx.restore();
}

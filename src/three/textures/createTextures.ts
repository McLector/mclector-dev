/**
 * Canvas + THREE glue around the pure painters. Deliberately thin: everything
 * with a decision in it lives in `badgeFaceTexture.ts` / `bandTexture.ts`,
 * which are unit-tested. This file only allocates canvases and wraps them.
 */
import * as THREE from "three";
import {
  BADGE_FACE_SIZE,
  drawBadgeFace,
  type BadgeCanvasContext,
  type BadgeFaceData,
} from "./badgeFaceTexture";
import {
  BAND_TEXTURE_SIZE,
  computeBandSpec,
  drawBandStrip,
  type BandCanvasContext,
  type BandSpecOptions,
} from "./bandTexture";

function make2d(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  return ctx ? { canvas, ctx } : null;
}

export type BadgeTextureInput = Omit<BadgeFaceData, "width" | "height">;

/** A CanvasTexture of the badge face, or null where 2D canvas is unavailable. */
export function createBadgeFaceTexture(input: BadgeTextureInput): THREE.CanvasTexture | null {
  const surface = make2d(BADGE_FACE_SIZE.width, BADGE_FACE_SIZE.height);
  if (!surface) return null;

  drawBadgeFace(surface.ctx as BadgeCanvasContext, { ...BADGE_FACE_SIZE, ...input });

  const texture = new THREE.CanvasTexture(surface.canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

/** The plain back face — same palette, no identity, so the card reads solid. */
export function createBadgeBackTexture(input: BadgeTextureInput): THREE.CanvasTexture | null {
  return createBadgeFaceTexture({
    ...input,
    avatar: null,
    title: "",
    subtitle: "",
    displayName: input.idLabel || input.displayName,
  });
}

export type BandTextureInput = Omit<BandSpecOptions, "width" | "height">;

export function createBandTexture(input: BandTextureInput): THREE.CanvasTexture | null {
  const surface = make2d(BAND_TEXTURE_SIZE.width, BAND_TEXTURE_SIZE.height);
  if (!surface) return null;

  drawBandStrip(
    surface.ctx as BandCanvasContext,
    computeBandSpec({ ...BAND_TEXTURE_SIZE, ...input }),
  );

  const texture = new THREE.CanvasTexture(surface.canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

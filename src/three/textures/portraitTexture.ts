import * as THREE from "three";

export type CropUV = { repeat: [number, number]; offset: [number, number] };

/**
 * The `repeat`/`offset` that make an `imgW × imgH` image cover-crop (fill,
 * centred, no distortion) a plane of aspect `targetAspect` (= width / height).
 * Pure — the loader below applies the result to a THREE texture.
 */
export function coverCropUV(imgW: number, imgH: number, targetAspect: number): CropUV {
  const imgAspect = imgW / imgH;
  if (imgAspect > targetAspect) {
    // image is wider than the target → crop the sides
    const rx = targetAspect / imgAspect;
    return { repeat: [rx, 1], offset: [(1 - rx) / 2, 0] };
  }
  // image is taller than the target → crop top/bottom
  const ry = imgAspect / targetAspect;
  return { repeat: [1, ry], offset: [0, (1 - ry) / 2] };
}

/** A deterministic fallback avatar texture, used when the photo can't load. */
export function fallbackAvatarTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 360;
  c.height = 460;
  const x = c.getContext("2d")!;
  const g = x.createRadialGradient(180, 175, 20, 180, 240, 340);
  g.addColorStop(0, "#1c376a");
  g.addColorStop(1, "#0a1430");
  x.fillStyle = g;
  x.fillRect(0, 0, 360, 460);
  x.fillStyle = "#b8caf2";
  x.beginPath();
  x.arc(180, 168, 72, 0, 7);
  x.fill();
  x.beginPath();
  x.moveTo(58, 460);
  x.quadraticCurveTo(80, 272, 180, 272);
  x.quadraticCurveTo(280, 272, 302, 460);
  x.closePath();
  x.fill();
  x.fillStyle = "rgba(255,255,255,.78)";
  x.font = "700 30px 'Space Mono', monospace";
  x.textAlign = "center";
  x.fillText("ML", 180, 179);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Load the portrait photo as a cover-cropped texture for the hologram screen.
 * Returns a texture immediately (three fills it in on load); calls `onReady`
 * once the crop is applied, and swaps in the fallback avatar on error.
 */
export function loadPortraitTexture(
  src: string,
  targetAspect: number,
  onReady?: (tex: THREE.Texture) => void,
): THREE.Texture {
  const loader = new THREE.TextureLoader();
  const tex = loader.load(
    src,
    (loaded) => {
      const img = loaded.image as { width: number; height: number };
      const { repeat, offset } = coverCropUV(img.width, img.height, targetAspect);
      loaded.repeat.set(repeat[0], repeat[1]);
      loaded.offset.set(offset[0], offset[1]);
      loaded.needsUpdate = true;
      onReady?.(loaded);
    },
    undefined,
    () => onReady?.(fallbackAvatarTexture()),
  );
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

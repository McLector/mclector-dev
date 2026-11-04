import { afterEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { coverCropUV, focalCropUV, loadPortraitTexture } from "./portraitTexture";

describe("coverCropUV", () => {
  it("crops a ~square photo horizontally into a portrait card", () => {
    // 2048x2021 photo → aspect ~1.01; card aspect 0.8 (portrait)
    const { repeat, offset } = coverCropUV(2048, 2021, 0.8);
    expect(repeat[0]).toBeLessThan(1); // horizontal crop
    expect(repeat[1]).toBe(1);
    expect(offset[0]).toBeGreaterThan(0); // centred inset
    expect(offset[1]).toBe(0);
    // centred: offset is half the cropped amount
    expect(offset[0]).toBeCloseTo((1 - repeat[0]) / 2, 5);
  });

  it("crops a tall photo vertically into a wider target", () => {
    const { repeat, offset } = coverCropUV(1000, 3000, 0.8);
    expect(repeat[1]).toBeLessThan(1); // vertical crop
    expect(repeat[0]).toBe(1);
    expect(offset[1]).toBeGreaterThan(0);
    expect(offset[0]).toBe(0);
  });

  it("leaves an exactly-matching aspect uncropped", () => {
    const { repeat, offset } = coverCropUV(800, 1000, 0.8); // 0.8 aspect
    expect(repeat[0]).toBeCloseTo(1, 5);
    expect(repeat[1]).toBeCloseTo(1, 5);
    expect(offset[0]).toBeCloseTo(0, 5);
    expect(offset[1]).toBeCloseTo(0, 5);
  });
});

describe("loadPortraitTexture", () => {
  afterEach(() => vi.restoreAllMocks());

  /** Drive THREE's loader by hand so the load/error callbacks fire without a network or a decoder. */
  function stubLoader(outcome: "load" | "error", image = { width: 2048, height: 1365 }) {
    return vi
      .spyOn(THREE.TextureLoader.prototype, "load")
      .mockImplementation((_url, onLoad, _onProgress, onError) => {
        const tex = new THREE.Texture() as THREE.Texture<HTMLImageElement>;
        (tex as { image: unknown }).image = image;
        if (outcome === "load") onLoad?.(tex);
        else onError?.(new Error("404"));
        return tex;
      });
  }

  it("bakes the focal crop into the texture matrix, so a raw ShaderMaterial that reads map.matrix sees it", () => {
    let loaded: THREE.Texture | undefined;
    stubLoader("load");
    loadPortraitTexture("photo.jpg", 0.8, { zoom: 1.5, focusX: 0.495, focusY: 0.6 }, (t) => (loaded = t));
    const expected = focalCropUV(2048, 1365, 0.8, 1.5, 0.495, 0.6);

    expect(loaded).toBeDefined();
    expect(loaded!.repeat.toArray()).toEqual(expected.repeat);
    expect(loaded!.offset.toArray()).toEqual(expected.offset);
    // matrixAutoUpdate is false on a bare Texture in a ShaderMaterial path; the matrix must be current.
    const ref = new THREE.Texture();
    ref.repeat.set(...expected.repeat);
    ref.offset.set(...expected.offset);
    ref.updateMatrix();
    expect(loaded!.matrix.toArray()).toEqual(ref.matrix.toArray());
    // And it is not the identity: zooming in really does change the transform.
    expect(loaded!.matrix.toArray()).not.toEqual(new THREE.Matrix3().toArray());
  });

  it("falls back to the drawn avatar when the photo fails to load", () => {
    let loaded: THREE.Texture | undefined;
    stubLoader("error");
    // jsdom has no 2D canvas, so the avatar's drawing context is stubbed out.
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      createRadialGradient: () => ({ addColorStop: () => undefined }),
      fillRect: () => undefined,
      beginPath: () => undefined,
      arc: () => undefined,
      fill: () => undefined,
      moveTo: () => undefined,
      quadraticCurveTo: () => undefined,
      closePath: () => undefined,
      fillText: () => undefined,
    } as unknown as CanvasRenderingContext2D);
    loadPortraitTexture("missing.jpg", 0.8, {}, (t) => (loaded = t));
    expect(loaded).toBeInstanceOf(THREE.CanvasTexture);
  });
});

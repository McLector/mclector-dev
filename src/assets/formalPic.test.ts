import { describe, expect, it } from "vitest";
// `?inline` gives a base64 data URI, so this needs no `fs` (src's tsconfig loads only
// vite/client types) — the same trick themedSurfaces.test.ts plays with `?raw`.
import formalPic from "./formal-pic.webp?inline";

/**
 * The back face of the hologram card is the formal portrait with its background
 * REMOVED. The original PNG is 600×600 RGBA with every pixel opaque on white — a
 * header that says "has an alpha channel" proves nothing (that is exactly how the
 * plan first got this wrong) — so this pins that the shipped file carries a
 * non-trivial matte, and is a WebP the renderer can decode with alpha.
 */
function bytesOf(dataUri: string): Uint8Array {
  const binary = atob(dataUri.slice(dataUri.indexOf(",") + 1));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function ascii(b: Uint8Array, from: number, to: number): string {
  return String.fromCharCode(...b.slice(from, to));
}

type Chunk = { fourcc: string; size: number };

/** RIFF/WebP chunk walk: 4-byte fourcc, 4-byte little-endian size, payload padded to even. */
function chunksOf(b: Uint8Array): Chunk[] {
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const out: Chunk[] = [];
  for (let o = 12; o + 8 <= b.length; ) {
    const size = view.getUint32(o + 4, true);
    out.push({ fourcc: ascii(b, o, o + 4), size });
    o += 8 + size + (size & 1);
  }
  return out;
}

describe("src/assets/formal-pic.webp", () => {
  const bytes = bytesOf(formalPic);

  it("is a RIFF/WEBP container", () => {
    expect(ascii(bytes, 0, 4)).toBe("RIFF");
    expect(ascii(bytes, 8, 12)).toBe("WEBP");
  });

  it("uses the extended (VP8X) format, with the alpha flag set", () => {
    expect(ascii(bytes, 12, 16)).toBe("VP8X");
    // Test the alpha BIT (0x10), not the whole flags byte: the encoder also sets 0x20 (ICC).
    expect(bytes[20] & 0x10).toBe(0x10);
  });

  it("is 512×512", () => {
    const le24 = (o: number) => bytes[o] | (bytes[o + 1] << 8) | (bytes[o + 2] << 16);
    expect(1 + le24(24)).toBe(512);
    expect(1 + le24(27)).toBe(512);
  });

  it("carries a real matte, not a token alpha channel", () => {
    const alph = chunksOf(bytes).find((c) => c.fourcc === "ALPH");
    expect(alph, "no ALPH chunk — the background was not removed").toBeDefined();
    // The shipped matte is ~6.4 KB; a fully opaque channel compresses to a few dozen bytes.
    expect(alph!.size).toBeGreaterThan(1000);
  });
});

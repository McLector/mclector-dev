import { describe, expect, it } from "vitest";
import {
  HEX_DIRECTIONS,
  hexNeighbor,
  hexNeighborMap,
  type HexDirection,
} from "./hexNeighbors";

/** Convenience: every layout keyed by its own index. */
function byIndex(cellCount: number) {
  return hexNeighborMap(cellCount);
}

describe("hexNeighborMap — shape", () => {
  it("returns one layout per cell, in row-major order, with index === array position", () => {
    const layouts = byIndex(7);
    expect(layouts).toHaveLength(7);
    layouts.forEach((layout, i) => {
      expect(layout.index).toBe(i);
    });
  });

  it("packs cells into the 2 / 3 / 2 honeycomb rows", () => {
    const layouts = byIndex(7);
    expect(layouts.map((l) => l.row)).toEqual([0, 0, 1, 1, 1, 2, 2]);
    expect(layouts.map((l) => l.column)).toEqual([0, 1, 0, 1, 2, 0, 1]);
    expect(layouts.map((l) => l.rowLength)).toEqual([2, 2, 3, 3, 3, 2, 2]);
  });

  it("centres each row on x = 0 in half-cell units", () => {
    const layouts = byIndex(7);
    expect(layouts.slice(0, 2).map((l) => l.x)).toEqual([-0.5, 0.5]);
    expect(layouts.slice(2, 5).map((l) => l.x)).toEqual([-1, 0, 1]);
    expect(layouts.slice(5, 7).map((l) => l.x)).toEqual([-0.5, 0.5]);
  });

  it("keeps filling alternating 2/3 rows beyond the seven-cell honeycomb", () => {
    const layouts = byIndex(10);
    expect(layouts.map((l) => l.row)).toEqual([0, 0, 1, 1, 1, 2, 2, 3, 3, 3]);
  });
});

describe("hexNeighborMap — edge cases", () => {
  it("returns an empty array for a zero-cell grid", () => {
    expect(hexNeighborMap(0)).toEqual([]);
  });

  it("gives a single-cell grid no neighbors in any direction and does not throw", () => {
    expect(() => hexNeighborMap(1)).not.toThrow();
    const [only] = hexNeighborMap(1);
    expect(only.index).toBe(0);
    expect(only.neighbors).toEqual({});
    for (const direction of HEX_DIRECTIONS) {
      expect(only.neighbors[direction]).toBeUndefined();
    }
  });

  it("rejects a negative or non-integer cell count with a RangeError", () => {
    expect(() => hexNeighborMap(-1)).toThrow(RangeError);
    expect(() => hexNeighborMap(2.5)).toThrow(RangeError);
    expect(() => hexNeighborMap(Number.NaN)).toThrow(RangeError);
  });
});

describe("hexNeighborMap — neighbor wiring", () => {
  it("wires left/right along a row and omits them at the row edges", () => {
    const [a, b, c] = byIndex(3); // rows: [0, 1] then [2]
    expect(a.neighbors.left).toBeUndefined();
    expect(a.neighbors.right).toBe(1);
    expect(b.neighbors.left).toBe(0);
    expect(b.neighbors.right).toBeUndefined();
    expect(c.neighbors.left).toBeUndefined();
    expect(c.neighbors.right).toBeUndefined();
  });

  it("wires up/down between adjacent rows for the 3-cell layout", () => {
    const [a, b, c] = byIndex(3);
    expect(a.neighbors.up).toBeUndefined();
    expect(a.neighbors.down).toBe(2);
    expect(b.neighbors.down).toBe(2);
    expect(c.neighbors.up).toBe(0);
  });

  it("gives corner cells strictly fewer neighbors than the centre cell", () => {
    const layouts = byIndex(7);
    const count = (i: number) => Object.keys(layouts[i].neighbors).length;
    const centre = 3; // middle cell of the middle row
    expect(count(centre)).toBe(4);
    for (const corner of [0, 1, 2, 4, 5, 6]) {
      expect(count(corner)).toBeLessThan(count(centre));
    }
  });

  it("never points at an index outside the grid", () => {
    for (const n of [1, 2, 3, 4, 5, 6, 7, 10]) {
      for (const layout of byIndex(n)) {
        for (const direction of HEX_DIRECTIONS) {
          const target = layout.neighbors[direction];
          if (target === undefined) continue;
          expect(target).toBeGreaterThanOrEqual(0);
          expect(target).toBeLessThan(n);
          expect(target).not.toBe(layout.index);
        }
      }
    }
  });
});

describe("hexNeighborMap — reciprocity contract", () => {
  it("left/right are strictly reciprocal: right(A) === B implies left(B) === A", () => {
    for (const n of [1, 2, 3, 4, 5, 6, 7, 10]) {
      const layouts = byIndex(n);
      for (const layout of layouts) {
        const right = layout.neighbors.right;
        if (right !== undefined) {
          expect(layouts[right].neighbors.left).toBe(layout.index);
        }
        const left = layout.neighbors.left;
        if (left !== undefined) {
          expect(layouts[left].neighbors.right).toBe(layout.index);
        }
      }
    }
  });

  it("up/down are deliberately NOT reciprocal — offset rows have no 1:1 partner", () => {
    // Row 0 holds two cells (x = -0.5, +0.5); row 1 holds three (x = -1, 0, +1).
    // Cell 1 sits equidistant from cells 3 and 4, so `down` breaks the tie
    // leftwards to 3 — but cell 3 is equidistant from 0 and 1, so its `up`
    // also breaks leftwards, to 0. This is documented, not a bug: a hex grid
    // has six directions squeezed into four arrow keys.
    const layouts = byIndex(7);
    expect(layouts[1].neighbors.down).toBe(3);
    expect(layouts[3].neighbors.up).toBe(0);
  });

  it("resolves every up/down tie towards the lower x (leftmost) candidate", () => {
    const layouts = byIndex(7);
    expect(layouts[0].neighbors.down).toBe(2); // ties between x = -1 and x = 0
    expect(layouts[5].neighbors.up).toBe(2); // ties between x = -1 and x = 0
    expect(layouts[2].neighbors.down).toBe(5);
  });
});

describe("hexNeighbor", () => {
  it("looks up a neighbor by index and direction", () => {
    const layouts = hexNeighborMap(3);
    expect(hexNeighbor(layouts, 0, "right")).toBe(1);
    expect(hexNeighbor(layouts, 0, "down")).toBe(2);
  });

  it("returns undefined for a direction with no neighbor", () => {
    const layouts = hexNeighborMap(3);
    expect(hexNeighbor(layouts, 0, "left")).toBeUndefined();
    expect(hexNeighbor(layouts, 0, "up")).toBeUndefined();
  });

  it("returns undefined (never throws) for an index at or beyond cellCount", () => {
    const layouts = hexNeighborMap(3);
    for (const direction of HEX_DIRECTIONS) {
      expect(() => hexNeighbor(layouts, 3, direction)).not.toThrow();
      expect(hexNeighbor(layouts, 3, direction)).toBeUndefined();
      expect(hexNeighbor(layouts, 99, direction)).toBeUndefined();
      expect(hexNeighbor(layouts, -1, direction)).toBeUndefined();
      expect(hexNeighbor([], 0, direction)).toBeUndefined();
    }
  });

  it("exposes the four arrow-key directions", () => {
    const expected: HexDirection[] = ["up", "down", "left", "right"];
    expect([...HEX_DIRECTIONS].sort()).toEqual([...expected].sort());
  });
});

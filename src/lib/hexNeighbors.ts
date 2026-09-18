/**
 * Honeycomb geometry for the social hex grid (Stream D).
 *
 * A real hex grid has six directions; a keyboard has four arrow keys. This
 * module resolves that mismatch once, in a pure function, so the component
 * never has to reason about geometry — it just asks "from cell 3, where does
 * ArrowDown go?".
 *
 * ## Layout
 *
 * Cells are packed row-major into alternating rows of 2 and 3, the classic
 * pointy-top honeycomb: two on top, three in the middle, two below (seven
 * cells — the reference shape). Counts above seven simply keep alternating.
 * A partial final row is centred like any other.
 *
 *     n = 3         n = 7
 *      0 1           0 1
 *       2           2 3 4
 *                    5 6
 *
 * `x` is the cell's horizontal centre in half-cell units, with each row
 * centred on 0. It is the same number the CSS uses to offset a row, which is
 * why keyboard navigation and the rendered picture can never drift apart.
 *
 * ## Direction contract
 *
 * - `left` / `right` move within a row and are **strictly reciprocal**:
 *   if `right(A) === B` then `left(B) === A`.
 * - `up` / `down` move to the adjacent row, landing on the cell whose `x` is
 *   closest. Offset rows mean a cell often sits exactly between two
 *   candidates; ties resolve towards the **lower x** (leftmost). Because of
 *   that tie rule, up/down are deliberately **not** reciprocal —
 *   `down(1) === 3` while `up(3) === 0`. Arrow keys stay predictable (the
 *   same key from the same cell always lands in the same place) rather than
 *   perfectly invertible, which is the better trade for a 3–7 cell grid.
 * - A missing neighbor is `undefined`, never a wrapped-around index: focus
 *   stays put at the edge instead of teleporting.
 */

export const HEX_DIRECTIONS = ["up", "down", "left", "right"] as const;

export type HexDirection = (typeof HEX_DIRECTIONS)[number];

export type HexLayout = {
  /** Position in the grid; always equal to this entry's array index. */
  index: number;
  /** Zero-based honeycomb row. */
  row: number;
  /** Zero-based position within `row`. */
  column: number;
  /** How many cells that row holds (2 or 3, or fewer in a partial last row). */
  rowLength: number;
  /** Horizontal centre in half-cell units, with each row centred on 0. */
  x: number;
  /** Index reachable via each arrow key; absent when there is nothing there. */
  neighbors: Partial<Record<HexDirection, number>>;
};

/** Row capacities of the honeycomb, alternating forever. */
const ROW_CAPACITIES = [2, 3] as const;

function rowLengths(cellCount: number): number[] {
  const rows: number[] = [];
  let remaining = cellCount;
  let row = 0;
  while (remaining > 0) {
    const capacity = ROW_CAPACITIES[row % ROW_CAPACITIES.length];
    const length = Math.min(capacity, remaining);
    rows.push(length);
    remaining -= length;
    row += 1;
  }
  return rows;
}

/** Index of the cell in `row` whose x is nearest `x`; ties go leftmost. */
function nearestInRow(
  cells: readonly HexLayout[],
  row: readonly number[],
  x: number,
): number | undefined {
  let best: number | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of row) {
    const distance = Math.abs(cells[candidate].x - x);
    // Strictly-less keeps the first (leftmost) candidate on a tie, because
    // rows are built left to right.
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }
  return best;
}

/**
 * Build the honeycomb layout for `cellCount` cells.
 *
 * @throws {RangeError} if `cellCount` is not a non-negative integer.
 */
export function hexNeighborMap(cellCount: number): HexLayout[] {
  if (!Number.isInteger(cellCount) || cellCount < 0) {
    throw new RangeError(
      `hexNeighborMap expects a non-negative integer cell count, received ${cellCount}`,
    );
  }
  if (cellCount === 0) return [];

  const lengths = rowLengths(cellCount);
  const cells: HexLayout[] = [];
  const rows: number[][] = [];

  let index = 0;
  for (const [row, rowLength] of lengths.entries()) {
    const indices: number[] = [];
    for (let column = 0; column < rowLength; column += 1) {
      cells.push({
        index,
        row,
        column,
        rowLength,
        x: column - (rowLength - 1) / 2,
        neighbors: {},
      });
      indices.push(index);
      index += 1;
    }
    rows.push(indices);
  }

  for (const cell of cells) {
    const row = rows[cell.row];
    if (cell.column > 0) cell.neighbors.left = row[cell.column - 1];
    if (cell.column < row.length - 1) cell.neighbors.right = row[cell.column + 1];

    const above = rows[cell.row - 1];
    if (above) {
      const up = nearestInRow(cells, above, cell.x);
      if (up !== undefined) cell.neighbors.up = up;
    }
    const below = rows[cell.row + 1];
    if (below) {
      const down = nearestInRow(cells, below, cell.x);
      if (down !== undefined) cell.neighbors.down = down;
    }
  }

  return cells;
}

/**
 * Where does `direction` lead from `index`? Returns `undefined` for an index
 * outside the grid (including negatives) rather than throwing, so a component
 * holding a stale focus index degrades to "stay put" instead of crashing.
 */
export function hexNeighbor(
  layouts: readonly HexLayout[],
  index: number,
  direction: HexDirection,
): number | undefined {
  const layout = layouts[index];
  if (!layout || index < 0) return undefined;
  return layout.neighbors[direction];
}

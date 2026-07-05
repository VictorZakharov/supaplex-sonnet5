import { addPoints, Point } from "../types";
import { Grid } from "../engine/Grid";
import { FX_TICKS } from "../constants";

/** The 3x3 area (including center) affected by a bomb explosion or an Electron's death burst. */
export const BLAST_OFFSETS: readonly Point[] = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
  { x: 1, y: 1 },
  { x: 1, y: -1 },
  { x: -1, y: 1 },
  { x: -1, y: -1 },
];

/** Purely visual 3x3 explosion flash around `center` — no terrain or occupant changes. */
export function blastFx(grid: Grid, center: Point): void {
  for (const offset of BLAST_OFFSETS) {
    const p = addPoints(center, offset);
    if (!grid.inBounds(p)) continue;
    grid.at(p).fx = { kind: "explode", ticksLeft: FX_TICKS.explode };
  }
}

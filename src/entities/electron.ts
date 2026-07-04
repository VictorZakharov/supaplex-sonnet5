import { addPoints, Point } from "../types";
import { Grid } from "../engine/Grid";
import { ClaimSet, claim, isClaimed, TickEvents } from "../engine/TickCommands";
import { ElectronOccupant, TerrainType } from "../tiles/TileType";
import { createInfotron } from "../tiles/occupantFactory";
import { BLAST_OFFSETS } from "./blastOffsets";
import { FX_TICKS } from "../constants";

/** The 8 cells immediately surrounding a home Bug tile, listed in clockwise order (see stepElectron for actual travel direction). */
export const RING_OFFSETS: readonly Point[] = [
  { x: 0, y: -1 }, // N
  { x: 1, y: -1 }, // NE
  { x: 1, y: 0 }, // E
  { x: 1, y: 1 }, // SE
  { x: 0, y: 1 }, // S
  { x: -1, y: 1 }, // SW
  { x: -1, y: 0 }, // W
  { x: -1, y: -1 }, // NW
];

function ringPoint(home: Point, index: number): Point {
  const offset = RING_OFFSETS[((index % 8) + 8) % 8]!;
  return addPoints(home, offset);
}

export function resolveElectrons(grid: Grid, events: TickEvents, claims: ClaimSet): void {
  const electrons = grid.allOccupants().filter((o) => o.type === "electron") as ElectronOccupant[];
  for (const electron of electrons) {
    if (electron.movementKind !== "idle") continue;
    stepElectron(grid, electron, events, claims);
  }
}

function stepElectron(grid: Grid, electron: ElectronOccupant, events: TickEvents, claims: ClaimSet): void {
  // Counterclockwise: on the ring's shared column/row with a level's falling-object drop path,
  // this makes the electron approach a dropped Zonk head-on instead of drifting away from it in
  // lockstep (same speed, same direction never converges) — see Level 4's zonk-on-electron puzzle.
  const nextIndex = (electron.ringIndex + 7) % 8;
  const target = ringPoint(electron.homeBug, nextIndex);
  if (!grid.inBounds(target)) return;

  const cell = grid.at(target);
  if (cell.occupant?.type === "murphy") {
    events.murphyDied = true;
    return;
  }

  if (cell.terrain === TerrainType.Empty && cell.occupant === null && !isClaimed(claims, target)) {
    claim(claims, target);
    grid.moveOccupant(electron.pos, target, "orbiting");
    electron.ringIndex = nextIndex;
  }
  // Blocked: stay put this tick and retry the same ring cell next tick — never skip ahead.
}

/**
 * Destroying a Bug's Electron bursts it like a small bomb: every Base tile in the blast radius
 * turns into a fresh Infotron (which then falls naturally under gravity like any other Infotron),
 * matching original Supaplex's Bug-death-spawns-Infotrons mechanic.
 */
export function destroyElectron(grid: Grid, pos: Point, events: TickEvents, nextId: () => number): void {
  const occ = grid.at(pos).occupant;
  if (!occ || occ.type !== "electron") return;
  events.destroyedOccupantIds.add(occ.id);
  grid.removeOccupant(pos);

  for (const offset of BLAST_OFFSETS) {
    const p = addPoints(pos, offset);
    if (!grid.inBounds(p)) continue;
    const cell = grid.at(p);
    if (cell.terrain === TerrainType.Base) {
      cell.terrain = TerrainType.Empty;
      if (cell.occupant === null) grid.spawnOccupant(p, createInfotron(nextId(), p));
    }
    cell.fx = { kind: "explode", ticksLeft: FX_TICKS.explode };
  }
}

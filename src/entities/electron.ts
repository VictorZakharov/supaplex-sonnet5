import { addPoints, Point } from "../types";
import { Grid } from "../engine/Grid";
import { ClaimSet, claim, isClaimed, TickEvents } from "../engine/TickCommands";
import { ElectronOccupant, TerrainType } from "../tiles/TileType";
import { createInfotron } from "../tiles/occupantFactory";
import { BLAST_OFFSETS } from "./blastOffsets";
// Circular with bomb.ts (explodeBomb chains back into destroyElectron for electrons caught in a
// blast) — safe because both are hoisted function declarations only called at runtime.
import { explodeBomb } from "./bomb";

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
 * Destroying a Bug's Electron is a full explosion followed by an Infotron shower: everything
 * destructible in the blast radius is destroyed (via `explodeBomb`, which also clears Base,
 * chain-reacts bombs, and kills Murphy if he's in range). The shower itself is only *recorded*
 * here — PhysicsEngine spawns it at end-of-tick via `spawnElectronHarvest`, after every blast of
 * the tick has finished, so no overlapping explosion can eat the fresh Infotrons.
 */
export function destroyElectron(grid: Grid, pos: Point, events: TickEvents, nextId: () => number): void {
  const occ = grid.at(pos).occupant;
  if (!occ || occ.type !== "electron") return;
  events.destroyedOccupantIds.add(occ.id);
  grid.removeOccupant(pos);

  explodeBomb(grid, pos, events, nextId);
  events.electronBursts.push(pos);
}

/**
 * End-of-tick Infotron shower for each Electron destroyed this tick: every open cell in the
 * blast radius — including the Electron's own — fills with a fresh Infotron that then falls
 * naturally under gravity. Matches original Supaplex's Bug-death-spawns-Infotrons mechanic.
 */
export function spawnElectronHarvest(grid: Grid, centers: readonly Point[], nextId: () => number): void {
  for (const center of centers) {
    for (const offset of BLAST_OFFSETS) {
      const p = addPoints(center, offset);
      if (!grid.inBounds(p)) continue;
      const cell = grid.at(p);
      if (cell.terrain === TerrainType.Empty && cell.occupant === null && !cell.plantedBomb) {
        grid.spawnOccupant(p, createInfotron(nextId(), p));
      }
    }
  }
}

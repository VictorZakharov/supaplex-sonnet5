import { Direction, Point, rotateCCW, rotateCW } from "../types";
import { Grid } from "../engine/Grid";
import { GravityDirection } from "../engine/GravityDirection";
import { ClaimSet, claim, isClaimed, TickEvents } from "../engine/TickCommands";
import { Cell } from "../engine/Cell";
import { Occupant, TerrainType } from "../tiles/TileType";
import {
  hasWasFalling,
  isOccupantFallable,
  isOccupantRotating,
  isOccupantRounded,
  isTerrainRounded,
} from "../tiles/TileProps";
import { explodeBomb } from "./bomb";
import { destroyElectron } from "./electron";
import { FX_TICKS, ROLL_ROTATION_STEP } from "../constants";

function isOpenTarget(cell: Cell): boolean {
  return cell.terrain === TerrainType.Empty && cell.occupant === null;
}

/** Whether the occupant at `pos` is currently resting on solid support (used to gate Infotron collection). */
export function isSupported(grid: Grid, pos: Point, gravityDir: Direction): boolean {
  const below = grid.neighbor(pos, gravityDir);
  if (!below) return true;
  return !isOpenTarget(grid.at(below));
}

export function resolveFallingObjects(
  grid: Grid,
  gravity: GravityDirection,
  events: TickEvents,
  claims: ClaimSet,
  nextId: () => number,
): void {
  const dir = gravity.get();
  const sideA = rotateCW(dir);
  const sideB = rotateCCW(dir);
  for (const y of grid.rowIndicesInFallOrder(dir)) {
    for (let x = 0; x < grid.width; x++) {
      const pos = { x, y };
      const cell = grid.at(pos);
      const occ = cell.occupant;
      if (!occ || occ.movementKind !== "idle") continue;
      if (!isOccupantFallable(occ)) continue;
      resolveOne(grid, pos, occ, dir, sideA, sideB, events, claims, nextId);
    }
  }
}

function resolveOne(
  grid: Grid,
  pos: Point,
  occ: Occupant,
  gravDir: Direction,
  sideA: Direction,
  sideB: Direction,
  events: TickEvents,
  claims: ClaimSet,
  nextId: () => number,
): void {
  const below = grid.neighbor(pos, gravDir);
  if (!below) return;
  const belowCell = grid.at(below);

  if (isOpenTarget(belowCell) && !isClaimed(claims, below)) {
    if (occ.type === "bomb") occ.hasFallen = true;
    commitMove(grid, pos, below, "falling", claims);
    return;
  }

  if (belowCell.occupant?.type === "murphy") {
    if (occ.type === "bomb") {
      // Bombs are always primed — any collision detonates them, moving or not.
      events.murphyDied = true;
      grid.removeOccupant(below);
      commitMove(grid, pos, below, "falling", claims);
      explodeBomb(grid, below, events, nextId);
      return;
    }
    if (hasWasFalling(occ) && occ.wasFalling) {
      // Only a rock already in motion has the momentum to be lethal on landing.
      events.murphyDied = true;
      grid.removeOccupant(below);
      commitMove(grid, pos, below, "falling", claims);
      belowCell.fx = { kind: "explode", ticksLeft: FX_TICKS.explode };
      return;
    }
    // A resting rock that just lost support can't fall through Murphy — it's blocked exactly like
    // solid ground below, so it falls through to the rolling check (or just stays put) instead.
  }

  if (belowCell.occupant?.type === "snikSnak" || belowCell.occupant?.type === "electron") {
    if (belowCell.occupant.type === "electron") {
      destroyElectron(grid, below, events, nextId);
    } else {
      events.destroyedOccupantIds.add(belowCell.occupant.id);
      grid.removeOccupant(below);
    }
    if (occ.type === "bomb") {
      commitMove(grid, pos, below, "falling", claims);
      explodeBomb(grid, below, events, nextId);
      return;
    }
    commitMove(grid, pos, below, "falling", claims);
    return;
  }

  // Rolling needs BOTH a rounded surface below AND a round-shaped occupant doing the rolling —
  // a square Bomb sitting on a rounded Wall doesn't roll, it just rests flush (see TileProps).
  const surfaceRounded = isTerrainRounded(belowCell.terrain) || isOccupantRounded(belowCell.occupant);
  if (surfaceRounded && isOccupantRounded(occ)) {
    if (tryRoll(grid, pos, occ, sideA, gravDir, claims, "rolling-left")) return;
    if (tryRoll(grid, pos, occ, sideB, gravDir, claims, "rolling-right")) return;
  }

  // Coming to rest directly on an impact bomb (can't roll off it) counts as dropping something on it.
  if (belowCell.occupant?.type === "bomb") {
    explodeBomb(grid, below, events, nextId);
    return;
  }

  if (occ.type === "bomb" && occ.hasFallen) {
    explodeBomb(grid, pos, events, nextId);
  }
}

function tryRoll(
  grid: Grid,
  pos: Point,
  occ: Occupant,
  sideDir: Direction,
  gravDir: Direction,
  claims: ClaimSet,
  kind: "rolling-left" | "rolling-right",
): boolean {
  const side = grid.neighbor(pos, sideDir);
  if (!side) return false;
  const sideCell = grid.at(side);
  if (!isOpenTarget(sideCell) || isClaimed(claims, side)) return false;
  const sideBelow = grid.neighbor(side, gravDir);
  if (!sideBelow || !isOpenTarget(grid.at(sideBelow))) return false;
  if (occ.type === "bomb") occ.hasFallen = true;
  if (isOccupantRotating(occ)) occ.rotation += Math.sign(side.x - pos.x) * ROLL_ROTATION_STEP;
  commitMove(grid, pos, side, kind, claims);
  return true;
}

function commitMove(
  grid: Grid,
  from: Point,
  to: Point,
  kind: "falling" | "rolling-left" | "rolling-right",
  claims: ClaimSet,
): void {
  claim(claims, to);
  grid.moveOccupant(from, to, kind);
}

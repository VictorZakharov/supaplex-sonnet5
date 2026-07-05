import { ALL_DIRECTIONS, rotateCCW, rotateCW } from "../types";
import { Grid } from "../engine/Grid";
import { ClaimSet, claim, isClaimed, TickEvents } from "../engine/TickCommands";
import { Cell } from "../engine/Cell";
import { SnikSnakOccupant, TerrainType } from "../tiles/TileType";

export function resolveSnikSnaks(grid: Grid, events: TickEvents, claims: ClaimSet): void {
  const snikSnaks = grid.allOccupants().filter((o) => o.type === "snikSnak") as SnikSnakOccupant[];
  for (const snik of snikSnaks) {
    if (snik.movementKind !== "idle") continue;
    stepSnikSnak(grid, snik, events, claims);
  }
}

function isOpenCell(cell: Cell): boolean {
  return cell.terrain === TerrainType.Empty && cell.occupant === null;
}

const QUARTER_TURN = Math.PI / 2;

function turnLeft(snik: SnikSnakOccupant): void {
  snik.facing = rotateCCW(snik.facing);
  snik.rotation -= QUARTER_TURN;
  snik.turnedLastTick = true;
}

function turnRight(snik: SnikSnakOccupant): void {
  snik.facing = rotateCW(snik.facing);
  snik.rotation += QUARTER_TURN;
  snik.turnedLastTick = true;
}

/**
 * Original-style facing-driven scissors: everything happens in the faced cell, and turning is a
 * visible 90°-per-tick rotation, never an instant snap. Per tick, exactly one of:
 * Murphy ahead → snip (death explosion); Murphy beside → rotate one step toward him (the
 * telegraph that gives the player a beat to escape); open left → turn left (the wall-hug bias);
 * open ahead → move there; blocked → rotate toward an open side.
 */
function stepSnikSnak(grid: Grid, snik: SnikSnakOccupant, events: TickEvents, claims: ClaimSet): void {
  const ahead = grid.neighbor(snik.pos, snik.facing);
  const aheadCell = ahead ? grid.at(ahead) : null;

  if (aheadCell?.occupant?.type === "murphy") {
    events.murphyDied = true;
    return;
  }

  for (const dir of ALL_DIRECTIONS) {
    const target = grid.neighbor(snik.pos, dir);
    if (target && grid.at(target).occupant?.type === "murphy") {
      if (dir === rotateCW(snik.facing)) turnRight(snik);
      else turnLeft(snik);
      return;
    }
  }

  // Left-hand hug: turn toward an open left cell — but never twice in a row, or open ground
  // would make them spin in place instead of patrolling little circles like the original.
  const leftDir = rotateCCW(snik.facing);
  const left = grid.neighbor(snik.pos, leftDir);
  if (!snik.turnedLastTick && left && isOpenCell(grid.at(left))) {
    turnLeft(snik);
    return;
  }

  if (ahead && aheadCell && isOpenCell(aheadCell) && !isClaimed(claims, ahead)) {
    claim(claims, ahead);
    grid.moveOccupant(snik.pos, ahead, "walking");
    snik.turnedLastTick = false;
    return;
  }

  // Blocked ahead (and a left turn was declined or blocked): rotate one step toward an open
  // side, right first. A dead end resolves itself — two left rotations reach the way back.
  const rightDir = rotateCW(snik.facing);
  const right = grid.neighbor(snik.pos, rightDir);
  if (right && isOpenCell(grid.at(right))) turnRight(snik);
  else turnLeft(snik);
}

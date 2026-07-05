import { rotateCCW, rotateCW } from "../types";
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

function isEnemy(cell: Cell | null): boolean {
  return cell?.occupant?.type === "snikSnak" || cell?.occupant?.type === "electron";
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

/** Turn toward the hugged wall's side. */
function hugTurn(snik: SnikSnakOccupant): void {
  if (snik.hugRight) turnRight(snik);
  else turnLeft(snik);
}

/** Turn away from the hugged wall's side. */
function offTurn(snik: SnikSnakOccupant): void {
  if (snik.hugRight) turnLeft(snik);
  else turnRight(snik);
}

/** Flip the hug side and start the two-turn about-face — the ONLY ways a patrol reverses. */
function reversePatrol(snik: SnikSnakOccupant): void {
  snik.hugRight = !snik.hugRight;
  snik.retreatTurns = 2;
}

/**
 * Original-style wall-hugging scissors, fully predictable: they never seek Murphy — standing
 * beside (or even dead ahead of) one is safe as long as its patrol wouldn't step into your cell.
 * The ONLY kill is the patrol's own forward step finding Murphy in the faced cell, and even that
 * has a one-beat wind-up (`attacking`): dodge it and the scissors reverse — hug side flips and
 * they about-face, the classic trick. The hug side otherwise never changes, except when the
 * patrol bumps into another enemy. Turning is always a visible 90° per tick, never a snap.
 */
function stepSnikSnak(grid: Grid, snik: SnikSnakOccupant, events: TickEvents, claims: ClaimSet): void {
  const ahead = grid.neighbor(snik.pos, snik.facing);
  const aheadCell = ahead ? grid.at(ahead) : null;
  const aheadMurphy = aheadCell?.occupant?.type === "murphy";

  // A wound-up strike from last tick: Murphy still in the faced cell → the step lands on him.
  if (snik.attacking && aheadMurphy) {
    events.murphyDied = true;
    return;
  }

  // Murphy dodged the wind-up: the player's reversal trick.
  if (snik.attacking) {
    snik.attacking = false;
    reversePatrol(snik);
  }
  if (snik.retreatTurns > 0) {
    snik.retreatTurns -= 1;
    hugTurn(snik); // two hug-side turns = about-face, ending with the wall on the new hug side
    return;
  }

  // Hug turn: turn toward an open hug-side cell — but never twice in a row, or open ground
  // would make them spin in place instead of patrolling little circles like the original.
  // This fires even with Murphy dead ahead: a wall-hugger turning away doesn't snip.
  const hugDir = snik.hugRight ? rotateCW(snik.facing) : rotateCCW(snik.facing);
  const hugCell = grid.neighbor(snik.pos, hugDir);
  if (!snik.turnedLastTick && hugCell && isOpenCell(grid.at(hugCell))) {
    hugTurn(snik);
    return;
  }

  // Patrol steps forward. Murphy in the faced cell means the step lands on him — wind up for
  // one beat (his dodge window) instead of moving.
  if (aheadMurphy) {
    snik.attacking = true;
    return;
  }
  if (ahead && aheadCell && isOpenCell(aheadCell) && !isClaimed(claims, ahead)) {
    claim(claims, ahead);
    grid.moveOccupant(snik.pos, ahead, "walking");
    snik.turnedLastTick = false;
    return;
  }

  // Ran head-on into another enemy: the other patrol-reversal trigger.
  if (isEnemy(aheadCell)) {
    reversePatrol(snik);
    snik.retreatTurns -= 1;
    hugTurn(snik);
    return;
  }

  // Blocked ahead (and a hug turn was declined or blocked): rotate one step toward an open
  // side, off-side first. A dead end resolves itself — two hug turns reach the way back.
  const offDir = snik.hugRight ? rotateCCW(snik.facing) : rotateCW(snik.facing);
  const off = grid.neighbor(snik.pos, offDir);
  if (off && isOpenCell(grid.at(off))) offTurn(snik);
  else hugTurn(snik);
}

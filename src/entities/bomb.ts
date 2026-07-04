import { addPoints, Point } from "../types";
import { Grid } from "../engine/Grid";
import { TickEvents } from "../engine/TickCommands";
import { TerrainType, TimedBombOccupant } from "../tiles/TileType";
import { CHAIN_BOMB_FUSE_TICKS, FX_TICKS, TIMED_BOMB_FUSE_TICKS } from "../constants";
import { BLAST_OFFSETS } from "./blastOffsets";
import { destroyElectron } from "./electron";

/** Detonates whatever bomb (impact or timed) occupies `pos`. Chain-reacts neighboring bombs. */
export function explodeBomb(grid: Grid, pos: Point, events: TickEvents, nextId: () => number): void {
  if (grid.at(pos).occupant) grid.removeOccupant(pos);

  for (const offset of BLAST_OFFSETS) {
    const p = addPoints(pos, offset);
    if (!grid.inBounds(p)) continue;
    const cell = grid.at(p);

    if (cell.terrain === TerrainType.Base) {
      cell.terrain = TerrainType.Empty;
    }

    const occ = cell.occupant;
    if (occ) {
      if (occ.type === "murphy") {
        events.murphyDied = true;
      } else if (occ.type === "timedBomb") {
        if (occ.fuseTicks > CHAIN_BOMB_FUSE_TICKS) occ.fuseTicks = CHAIN_BOMB_FUSE_TICKS;
      } else if (occ.type === "bomb") {
        explodeBomb(grid, p, events, nextId); // impact bombs have no fuse — a blast is itself a collision
      } else if (occ.type === "electron") {
        destroyElectron(grid, p, events, nextId);
      } else {
        events.destroyedOccupantIds.add(occ.id);
        grid.removeOccupant(p);
      }
    }

    cell.fx = { kind: "explode", ticksLeft: FX_TICKS.explode };
  }
}

/** Ticks down every planted timed bomb, detonating any that reach zero. */
export function resolveTimedBombs(grid: Grid, events: TickEvents, nextId: () => number): void {
  const bombs = grid.allOccupants().filter((o) => o.type === "timedBomb") as TimedBombOccupant[];
  for (const bomb of bombs) {
    bomb.fuseTicks -= 1;
    if (bomb.fuseTicks <= 0) {
      explodeBomb(grid, bomb.pos, events, nextId);
    }
  }
}

function isOpenForPlant(grid: Grid, p: Point): boolean {
  const cell = grid.at(p);
  return cell.terrain === TerrainType.Empty && cell.occupant === null;
}

/** Plants a timed bomb at `target` (if it's open ground) from Murphy's limited supply. */
export function plantTimedBombAt(
  grid: Grid,
  target: Point,
  spendSupply: () => void,
  nextId: () => number,
): void {
  if (!isOpenForPlant(grid, target)) return;

  spendSupply();
  grid.spawnOccupant(target, {
    id: nextId(),
    type: "timedBomb",
    pos: target,
    prevPos: target,
    movementKind: "idle",
    fuseTicks: TIMED_BOMB_FUSE_TICKS,
  });
}

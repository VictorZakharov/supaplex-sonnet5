import { addPoints, Point } from "../types";
import { Grid } from "../engine/Grid";
import { TickEvents } from "../engine/TickCommands";
import { TerrainType, TimedBombOccupant } from "../tiles/TileType";
import { CHAIN_BLAST_DELAY_TICKS, CHAIN_BOMB_FUSE_TICKS, FX_TICKS, TIMED_BOMB_FUSE_TICKS } from "../constants";
import { BLAST_OFFSETS } from "./blastOffsets";

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

    if (cell.plantedBomb && cell.plantedBomb.fuseTicks > CHAIN_BOMB_FUSE_TICKS) {
      cell.plantedBomb.fuseTicks = CHAIN_BOMB_FUSE_TICKS;
    }

    const occ = cell.occupant;
    if (occ) {
      if (occ.type === "murphy") {
        events.murphyDied = true;
      } else if (occ.type === "timedBomb") {
        if (occ.fuseTicks > CHAIN_BOMB_FUSE_TICKS) occ.fuseTicks = CHAIN_BOMB_FUSE_TICKS;
      } else if (occ.type === "bomb" || occ.type === "electron" || occ.type === "snikSnak") {
        // Chain links (impact bombs and enemies) die NOW but their own blasts fire a beat
        // later, so chains visibly ripple outward (see resolvePendingBlasts). Only the
        // electron's detonation will seed Infotrons — a Snik-Snak's blast contributes none.
        if (occ.type !== "bomb") events.destroyedOccupantIds.add(occ.id);
        grid.removeOccupant(p);
        cell.pendingBlast = { ticksLeft: CHAIN_BLAST_DELAY_TICKS, electron: occ.type === "electron" };
      } else {
        events.destroyedOccupantIds.add(occ.id);
        grid.removeOccupant(p);
      }
    }

    cell.fx = { kind: "explode", ticksLeft: FX_TICKS.explode };
  }
}

/**
 * Fires chain-reaction blasts whose delay has elapsed. Due cells are collected before any of
 * them detonates, so a fresh marker set by one of this tick's blasts always waits its full
 * delay — chains ripple one visible step per beat, never collapse into a single tick.
 */
export function resolvePendingBlasts(grid: Grid, events: TickEvents, nextId: () => number): void {
  const due: Point[] = [];
  const electronDue: Point[] = [];
  grid.forEach((cell, pos) => {
    const pending = cell.pendingBlast;
    if (!pending) return;
    pending.ticksLeft -= 1;
    if (pending.ticksLeft > 0) return;
    delete cell.pendingBlast;
    due.push(pos);
    if (pending.electron) electronDue.push(pos);
  });
  for (const pos of due) explodeBomb(grid, pos, events, nextId);
  for (const pos of electronDue) events.electronBursts.push(pos);
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

  // Bombs planted under Murphy's own feet: the fuse burns while he still stands on the cell, and
  // the disk becomes a real occupant the moment the cell frees up. Reaching zero with Murphy (or
  // anything else) still on it detonates in place.
  grid.forEach((cell, pos) => {
    const planted = cell.plantedBomb;
    if (!planted) return;
    planted.fuseTicks -= 1;
    if (planted.fuseTicks <= 0) {
      delete cell.plantedBomb;
      if (cell.occupant?.type === "murphy") events.murphyDied = true;
      explodeBomb(grid, pos, events, nextId);
      return;
    }
    if (cell.occupant === null) {
      delete cell.plantedBomb;
      grid.spawnOccupant(pos, {
        id: nextId(),
        type: "timedBomb",
        pos,
        prevPos: pos,
        movementKind: "idle",
        fuseTicks: planted.fuseTicks,
      });
    }
  });
}

function isOpenForPlant(grid: Grid, p: Point): boolean {
  const cell = grid.at(p);
  return cell.terrain === TerrainType.Empty && cell.occupant === null;
}

/** Plants a timed bomb at `target` (if it's open ground). Supply is spent by the caller. */
export function plantTimedBombAt(grid: Grid, target: Point, nextId: () => number): void {
  if (!isOpenForPlant(grid, target)) return;

  grid.spawnOccupant(target, {
    id: nextId(),
    type: "timedBomb",
    pos: target,
    prevPos: target,
    movementKind: "idle",
    fuseTicks: TIMED_BOMB_FUSE_TICKS,
  });
}

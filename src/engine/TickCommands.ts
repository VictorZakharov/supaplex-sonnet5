import { Point } from "../types";

/**
 * Cells already claimed by a mover earlier in the current tick's resolution pass.
 * Combined with processing cells in fall/scan order, this prevents two occupants
 * from being committed into the same destination within one tick.
 */
export type ClaimSet = Set<string>;

export function createClaimSet(): ClaimSet {
  return new Set<string>();
}

export function posKey(p: Point): string {
  return `${p.x},${p.y}`;
}

export function claim(set: ClaimSet, p: Point): void {
  set.add(posKey(p));
}

export function isClaimed(set: ClaimSet, p: Point): boolean {
  return set.has(posKey(p));
}

/** Accumulates cross-cutting outcomes from one tick's rule resolution for CollisionResolver. */
export interface TickEvents {
  murphyDied: boolean;
  levelWon: boolean;
  destroyedOccupantIds: Set<number>;
  /**
   * Centers of Electrons destroyed this tick. Their Infotron showers spawn at end-of-tick
   * (PhysicsEngine), after ALL of the tick's explosions have finished — otherwise a bomb blast
   * that killed the Electron would keep iterating and eat part of the just-spawned harvest,
   * which could soft-lock a level whose required count depends on it (the Finale's does).
   */
  electronBursts: Point[];
}

export function createTickEvents(): TickEvents {
  return {
    murphyDied: false,
    levelWon: false,
    destroyedOccupantIds: new Set<number>(),
    electronBursts: [],
  };
}

import { Occupant, TerrainType } from "../tiles/TileType";

export interface FxState {
  kind: "dig" | "collect" | "explode" | "death" | "spawn" | "portal";
  ticksLeft: number;
}

export interface GeneratorState {
  intervalTicks: number;
  ticksUntilNextSpawn: number;
}

/** A timed bomb planted under Murphy's feet: the fuse burns while he still stands on the cell,
 * and the disk materializes as a real TimedBombOccupant the moment the cell frees up. */
export interface PlantedBombState {
  fuseTicks: number;
}

/** A chain-reaction explosion scheduled at this cell: the occupant that was hit is already gone,
 * its own blast fires when the countdown ends (see resolvePendingBlasts). `electron` marks that
 * the detonation must also seed the Infotron shower. */
export interface PendingBlastState {
  ticksLeft: number;
  electron: boolean;
}

export interface Cell {
  terrain: TerrainType;
  occupant: Occupant | null;
  generator?: GeneratorState;
  plantedBomb?: PlantedBombState;
  pendingBlast?: PendingBlastState;
  fx?: FxState;
}

export function createCell(terrain: TerrainType): Cell {
  return { terrain, occupant: null };
}

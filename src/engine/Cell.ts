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

export interface Cell {
  terrain: TerrainType;
  occupant: Occupant | null;
  generator?: GeneratorState;
  plantedBomb?: PlantedBombState;
  fx?: FxState;
}

export function createCell(terrain: TerrainType): Cell {
  return { terrain, occupant: null };
}

import { Occupant, TerrainType } from "../tiles/TileType";

export interface FxState {
  kind: "dig" | "collect" | "explode" | "death" | "spawn" | "portal";
  ticksLeft: number;
}

export interface GeneratorState {
  intervalTicks: number;
  ticksUntilNextSpawn: number;
}

export interface Cell {
  terrain: TerrainType;
  occupant: Occupant | null;
  generator?: GeneratorState;
  fx?: FxState;
}

export function createCell(terrain: TerrainType): Cell {
  return { terrain, occupant: null };
}

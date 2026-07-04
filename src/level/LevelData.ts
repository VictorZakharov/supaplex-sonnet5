import { Point } from "../types";
import { Occupant, TerrainType } from "../tiles/TileType";

export interface LegendEntry {
  terrain: TerrainType;
  isGenerator?: boolean;
  spawnOccupant?: (id: number, pos: Point) => Occupant;
}

export type Legend = Record<string, LegendEntry>;

export interface LevelData {
  name: string;
  rows: string[];
  legend: Legend;
  timeLimitSeconds: number;
  /** Timed bombs Murphy can plant this level (hold Space to charge). Omit for levels without the ability. */
  bombSupply?: number;
}

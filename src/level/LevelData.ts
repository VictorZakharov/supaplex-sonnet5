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
  /** Timed bombs Murphy starts the level already carrying. Usually omitted — supply normally
   * comes from bomb pickups ("b" legend char) collected in the level itself. */
  bombSupply?: number;
}

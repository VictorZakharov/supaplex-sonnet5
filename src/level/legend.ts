import { Direction } from "../types";
import { TerrainType } from "../tiles/TileType";
import { createInfotron, createZonk } from "../tiles/occupantFactory";
import { Legend } from "./LevelData";

export const LEGEND: Legend = {
  " ": { terrain: TerrainType.Empty },
  "#": { terrain: TerrainType.Wall },
  "%": { terrain: TerrainType.WallSquare },
  "=": { terrain: TerrainType.Hardware1 },
  "+": { terrain: TerrainType.Hardware2 },
  ".": { terrain: TerrainType.Base },
  X: { terrain: TerrainType.ExitClosed },
  "^": { terrain: TerrainType.PortUp },
  v: { terrain: TerrainType.PortDown },
  "<": { terrain: TerrainType.PortLeft },
  ">": { terrain: TerrainType.PortRight },
  A: { terrain: TerrainType.GravityPortUp },
  V: { terrain: TerrainType.GravityPortDown },
  N: { terrain: TerrainType.ZonkGenerator, isGenerator: true },
  "@": { terrain: TerrainType.Bug },
  M: {
    terrain: TerrainType.Empty,
    spawnOccupant: (id, pos) => ({
      id,
      type: "murphy",
      pos,
      prevPos: pos,
      movementKind: "idle",
      facing: Direction.Down,
    }),
  },
  Z: {
    terrain: TerrainType.Empty,
    spawnOccupant: (id, pos) => createZonk(id, pos),
  },
  "*": {
    terrain: TerrainType.Empty,
    spawnOccupant: (id, pos) => createInfotron(id, pos),
  },
  O: {
    terrain: TerrainType.Empty,
    spawnOccupant: (id, pos) => ({ id, type: "orangeDisk", pos, prevPos: pos, movementKind: "idle" }),
  },
  D: {
    terrain: TerrainType.Empty,
    spawnOccupant: (id, pos) => ({
      id,
      type: "bomb",
      pos,
      prevPos: pos,
      movementKind: "idle",
      hasFallen: false,
    }),
  },
  S: {
    terrain: TerrainType.Empty,
    spawnOccupant: (id, pos) => ({
      id,
      type: "snikSnak",
      pos,
      prevPos: pos,
      movementKind: "idle",
      facing: Direction.Right,
    }),
  },
  e: {
    terrain: TerrainType.Empty,
    spawnOccupant: (id, pos) => ({
      id,
      type: "electron",
      pos,
      prevPos: pos,
      movementKind: "idle",
      homeBug: { x: 0, y: 0 },
      ringIndex: 0,
    }),
  },
};

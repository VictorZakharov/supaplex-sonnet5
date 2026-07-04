import { Point } from "../types";
import { InfotronOccupant, ZonkOccupant } from "./TileType";

export function createZonk(id: number, pos: Point): ZonkOccupant {
  return {
    id,
    type: "zonk",
    pos,
    prevPos: pos,
    movementKind: "idle",
    rotation: 0,
    prevRotation: 0,
    wasFalling: false,
  };
}

export function createInfotron(id: number, pos: Point): InfotronOccupant {
  return {
    id,
    type: "infotron",
    pos,
    prevPos: pos,
    movementKind: "idle",
    rotation: 0,
    prevRotation: 0,
    wasFalling: false,
  };
}

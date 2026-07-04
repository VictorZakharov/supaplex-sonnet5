import { Direction } from "../types";
import { InfotronOccupant, Occupant, TerrainType, ZonkOccupant } from "./TileType";

/** Terrain a Zonk/Infotron/unarmed Bomb can roll off of when its straight fall is blocked. */
export function isTerrainRounded(t: TerrainType): boolean {
  return (
    t === TerrainType.Wall ||
    t === TerrainType.Hardware1 ||
    t === TerrainType.Hardware2
  );
}

/** Terrain Murphy (and falling objects, where relevant) can walk/fall onto directly. */
export function isTerrainOpen(t: TerrainType): boolean {
  return t === TerrainType.Empty || t === TerrainType.ExitOpen;
}

export function isTerrainDiggable(t: TerrainType): boolean {
  return t === TerrainType.Base;
}

export function portDirectionOf(t: TerrainType): Direction | null {
  switch (t) {
    case TerrainType.PortUp:
    case TerrainType.GravityPortUp:
      return Direction.Up;
    case TerrainType.PortDown:
    case TerrainType.GravityPortDown:
      return Direction.Down;
    case TerrainType.PortLeft:
      return Direction.Left;
    case TerrainType.PortRight:
      return Direction.Right;
    default:
      return null;
  }
}

export function isPort(t: TerrainType): boolean {
  return portDirectionOf(t) !== null;
}

export function isGravityPort(t: TerrainType): boolean {
  return t === TerrainType.GravityPortUp || t === TerrainType.GravityPortDown;
}

/** True if Murphy may freely step onto this terrain (ignoring what's occupying the cell). */
export function isTerrainWalkable(t: TerrainType): boolean {
  return isTerrainOpen(t) || isTerrainDiggable(t);
}

/** True for ball/puck-shaped objects: they roll diagonally off a rounded edge, and other round
 * objects can roll off of them when resting on top. Bombs are square — they never roll either way. */
export function isOccupantRounded(o: Occupant | null): boolean {
  if (!o) return false;
  return o.type === "zonk" || o.type === "infotron" || o.type === "orangeDisk";
}

export function isOccupantPushable(o: Occupant | null): boolean {
  if (!o) return false;
  return o.type === "zonk" || o.type === "orangeDisk" || o.type === "bomb";
}

export function isOccupantFallable(o: Occupant | null): boolean {
  if (!o) return false;
  return o.type === "zonk" || o.type === "infotron" || o.type === "bomb";
}

/** Zonk and Infotron carry a cosmetic rotation the renderer spins as they roll off a ledge. */
export function isOccupantRotating(o: Occupant | null): o is ZonkOccupant | InfotronOccupant {
  return o !== null && (o.type === "zonk" || o.type === "infotron");
}

/** Zonk and Infotron track whether they were already falling/rolling last tick — only a rock
 * already in motion has the momentum to be lethal on landing (see fallingObjects.ts). */
export function hasWasFalling(o: Occupant | null): o is ZonkOccupant | InfotronOccupant {
  return o !== null && (o.type === "zonk" || o.type === "infotron");
}

export function isOccupantDeadlyToMurphy(o: Occupant | null): boolean {
  if (!o) return false;
  return o.type === "snikSnak" || o.type === "electron";
}

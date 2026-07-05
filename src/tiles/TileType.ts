import { Direction, Point } from "../types";

/** Static, grid-attached tile kind. Distinct from the movable Occupant sitting on a cell. */
export enum TerrainType {
  Empty,
  Wall,
  WallSquare,
  Hardware1,
  Hardware2,
  Base,
  PortUp,
  PortDown,
  PortLeft,
  PortRight,
  GravityPortUp,
  GravityPortDown,
  ZonkGenerator,
  Bug,
  ExitClosed,
  ExitOpen,
}

export type OccupantType =
  | "murphy"
  | "zonk"
  | "infotron"
  | "orangeDisk"
  | "bomb"
  | "bombPickup"
  | "timedBomb"
  | "snikSnak"
  | "electron";

export type MovementKind =
  | "idle"
  | "walking"
  | "pushed"
  | "falling"
  | "rolling-left"
  | "rolling-right"
  | "orbiting"
  | "teleporting";

interface OccupantBase {
  id: number;
  pos: Point;
  /** Position at the start of the current tick; used by the renderer to interpolate. */
  prevPos: Point;
  movementKind: MovementKind;
}

export interface MurphyOccupant extends OccupantBase {
  type: "murphy";
  facing: Direction;
  /** Ticks Space has been held toward planting a timed bomb (see resolveMurphyLook). */
  bombCharge: number;
  /** The cell the current charge is aimed at — changing targets restarts the charge. */
  bombChargeTarget: Point | null;
}

export interface ZonkOccupant extends OccupantBase {
  type: "zonk";
  /** Radians, accumulated as it rolls off ledges — purely cosmetic, gives the renderer something to spin. */
  rotation: number;
  prevRotation: number;
  /** Was already falling/rolling as of the end of the previous tick — only a moving rock has the momentum to be lethal on landing. */
  wasFalling: boolean;
}

export interface InfotronOccupant extends OccupantBase {
  type: "infotron";
  /** Radians, accumulated as it rolls off ledges — purely cosmetic, gives the renderer something to spin. */
  rotation: number;
  prevRotation: number;
  /** Was already falling/rolling as of the end of the previous tick — only a moving rock has the momentum to be lethal on landing. */
  wasFalling: boolean;
}

export interface OrangeDiskOccupant extends OccupantBase {
  type: "orangeDisk";
}

/** Pushable like a Zonk; explodes the instant it collides with something (lands, or gets landed on) — otherwise permanently inert. */
export interface BombOccupant extends OccupantBase {
  type: "bomb";
  /** Whether this bomb has ever fallen/rolled — a collision-triggered explosion only applies once it's actually been disturbed. */
  hasFallen: boolean;
}

/** Planted by Murphy (see resolveMurphyLook) from his collected supply; counts down and detonates on its own. */
export interface TimedBombOccupant extends OccupantBase {
  type: "timedBomb";
  fuseTicks: number;
}

/** A collectible timed-bomb disk sitting in the level — walk into it (or Space + direction) to add one to Murphy's supply. */
export interface BombPickupOccupant extends OccupantBase {
  type: "bombPickup";
}

export interface SnikSnakOccupant extends OccupantBase {
  type: "snikSnak";
  facing: Direction;
  /** Turned on the previous tick — blocks two left-hugs in a row, so open ground circles instead of spinning in place. */
  turnedLastTick: boolean;
}

export interface ElectronOccupant extends OccupantBase {
  type: "electron";
  homeBug: Point;
  ringIndex: number;
}

export type Occupant =
  | MurphyOccupant
  | ZonkOccupant
  | InfotronOccupant
  | OrangeDiskOccupant
  | BombOccupant
  | BombPickupOccupant
  | TimedBombOccupant
  | SnikSnakOccupant
  | ElectronOccupant;

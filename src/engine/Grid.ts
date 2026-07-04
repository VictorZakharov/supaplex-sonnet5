import { Direction, Point, addPoints, directionVector } from "../types";
import { Cell } from "./Cell";
import { MovementKind, Occupant } from "../tiles/TileType";
import { hasWasFalling, isOccupantRotating } from "../tiles/TileProps";

const IN_MOTION_KINDS: readonly MovementKind[] = ["falling", "rolling-left", "rolling-right"];

export class Grid {
  readonly width: number;
  readonly height: number;
  private readonly cells: Cell[][];

  constructor(width: number, height: number, factory: (x: number, y: number) => Cell) {
    this.width = width;
    this.height = height;
    this.cells = [];
    for (let y = 0; y < height; y++) {
      const row: Cell[] = [];
      for (let x = 0; x < width; x++) {
        row.push(factory(x, y));
      }
      this.cells.push(row);
    }
  }

  inBounds(p: Point): boolean {
    return p.x >= 0 && p.y >= 0 && p.x < this.width && p.y < this.height;
  }

  at(p: Point): Cell {
    const row = this.cells[p.y];
    const cell = row?.[p.x];
    if (!cell) {
      throw new Error(`Grid.at out of bounds: (${p.x}, ${p.y})`);
    }
    return cell;
  }

  tryAt(p: Point): Cell | null {
    return this.inBounds(p) ? this.at(p) : null;
  }

  neighbor(p: Point, dir: Direction): Point | null {
    const n = addPoints(p, directionVector(dir));
    return this.inBounds(n) ? n : null;
  }

  forEach(cb: (cell: Cell, pos: Point) => void): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        cb(this.at({ x, y }), { x, y });
      }
    }
  }

  /** Row indices ordered so the row furthest along the fall direction is visited first. */
  rowIndicesInFallOrder(gravity: Direction): number[] {
    const rows = Array.from({ length: this.height }, (_, i) => i);
    return gravity === Direction.Down ? rows.reverse() : rows;
  }

  moveOccupant(from: Point, to: Point, kind: MovementKind): void {
    const fromCell = this.at(from);
    const toCell = this.at(to);
    const occupant = fromCell.occupant;
    if (!occupant) {
      throw new Error(`Grid.moveOccupant: no occupant at (${from.x}, ${from.y})`);
    }
    fromCell.occupant = null;
    occupant.pos = to;
    occupant.movementKind = kind;
    toCell.occupant = occupant;
  }

  setOccupantMovementKind(pos: Point, kind: MovementKind): void {
    const occupant = this.at(pos).occupant;
    if (occupant) occupant.movementKind = kind;
  }

  spawnOccupant(pos: Point, occupant: Occupant): void {
    this.at(pos).occupant = occupant;
  }

  removeOccupant(pos: Point): Occupant | null {
    const cell = this.at(pos);
    const occupant = cell.occupant;
    cell.occupant = null;
    return occupant;
  }

  /** Captures prevPos = pos for every occupant, marking the interpolation baseline for this tick. */
  beginTick(): void {
    this.forEach((cell) => {
      if (cell.occupant) {
        if (hasWasFalling(cell.occupant)) {
          cell.occupant.wasFalling = IN_MOTION_KINDS.includes(cell.occupant.movementKind);
        }
        cell.occupant.prevPos = cell.occupant.pos;
        cell.occupant.movementKind = "idle";
        if (isOccupantRotating(cell.occupant)) cell.occupant.prevRotation = cell.occupant.rotation;
      }
      if (cell.fx) {
        cell.fx.ticksLeft -= 1;
        if (cell.fx.ticksLeft <= 0) cell.fx = undefined;
      }
    });
  }

  allOccupants(): Occupant[] {
    const result: Occupant[] = [];
    this.forEach((cell) => {
      if (cell.occupant) result.push(cell.occupant);
    });
    return result;
  }
}

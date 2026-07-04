export enum Direction {
  Up = 0,
  Right = 1,
  Down = 2,
  Left = 3,
}

export interface Point {
  x: number;
  y: number;
}

export const ALL_DIRECTIONS: readonly Direction[] = [
  Direction.Up,
  Direction.Right,
  Direction.Down,
  Direction.Left,
];

export function directionVector(dir: Direction): Point {
  switch (dir) {
    case Direction.Up:
      return { x: 0, y: -1 };
    case Direction.Right:
      return { x: 1, y: 0 };
    case Direction.Down:
      return { x: 0, y: 1 };
    case Direction.Left:
      return { x: -1, y: 0 };
  }
}

export function addPoints(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function pointsEqual(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

export function opposite(dir: Direction): Direction {
  return ((dir + 2) % 4) as Direction;
}

export function rotateCW(dir: Direction): Direction {
  return ((dir + 1) % 4) as Direction;
}

export function rotateCCW(dir: Direction): Direction {
  return ((dir + 3) % 4) as Direction;
}

export function isHorizontal(dir: Direction): boolean {
  return dir === Direction.Left || dir === Direction.Right;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

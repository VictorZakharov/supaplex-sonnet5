import { Direction } from "../types";

/** Tracks the single global gravity direction, flipped by Gravity Ports. Only Up/Down are ever used. */
export class GravityDirection {
  private current: Direction;

  constructor(initial: Direction = Direction.Down) {
    this.current = initial;
  }

  get(): Direction {
    return this.current;
  }

  flip(): void {
    this.current = this.current === Direction.Down ? Direction.Up : Direction.Down;
  }
}

import { Direction } from "../types";

export interface InputEdgeEvents {
  pause: boolean;
  restart: boolean;
  anyKey: boolean;
  confirm: boolean;
  selectPrev: boolean;
  selectNext: boolean;
  selectLeft: boolean;
  selectRight: boolean;
}

function keyToDirection(key: string): Direction | null {
  switch (key) {
    case "ArrowUp":
    case "w":
    case "W":
      return Direction.Up;
    case "ArrowDown":
    case "s":
    case "S":
      return Direction.Down;
    case "ArrowLeft":
    case "a":
    case "A":
      return Direction.Left;
    case "ArrowRight":
    case "d":
    case "D":
      return Direction.Right;
    default:
      return null;
  }
}

/**
 * Tracks held movement direction plus one-shot edge events (pause/restart/menu-nav) for menus.
 *
 * Two things make quick maneuvering feel unresponsive if not handled carefully:
 *  1. The simulation only samples input once per fixed tick (TICK_MS) — a tap shorter than one
 *     tick can fall entirely between two samples and be dropped. `pendingIntent` latches every
 *     fresh keydown so the very next tick always sees it, regardless of how briefly it was held.
 *  2. The OS re-fires keydown (with `repeat: true`) for a held key. If that were allowed to keep
 *     overwriting the tracked direction, holding Right while tapping Down could have Right's
 *     auto-repeat "steal back" priority the instant after the Down tap — only non-repeat keydowns
 *     update direction state.
 */
export class InputController {
  private readonly heldDirections = new Set<Direction>();
  private lastHeldDirection: Direction | null = null;
  private pendingIntent: Direction | null = null;
  private spaceHeld = false;
  private pauseQueued = false;
  private restartQueued = false;
  private anyKeyQueued = false;
  private confirmQueued = false;
  private selectPrevQueued = false;
  private selectNextQueued = false;
  private selectLeftQueued = false;
  private selectRightQueued = false;

  constructor(target: Window) {
    target.addEventListener("keydown", this.onKeyDown);
    target.addEventListener("keyup", this.onKeyUp);
    target.addEventListener("blur", this.onBlur);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    const dir = keyToDirection(e.key);
    if (dir !== null) {
      e.preventDefault();
      if (!e.repeat) {
        this.heldDirections.add(dir);
        this.lastHeldDirection = dir;
        this.pendingIntent = dir;
      }
    }
    if (e.key === " ") {
      e.preventDefault();
      this.spaceHeld = true;
    }
    if (!e.repeat) {
      if (e.key === "p" || e.key === "P") this.pauseQueued = true;
      if (e.key === "r" || e.key === "R") this.restartQueued = true;
      if (e.key === "Enter" || e.key === " ") this.confirmQueued = true;
      if (dir === Direction.Up) this.selectPrevQueued = true;
      if (dir === Direction.Down) this.selectNextQueued = true;
      if (dir === Direction.Left) this.selectLeftQueued = true;
      if (dir === Direction.Right) this.selectRightQueued = true;
      this.anyKeyQueued = true;
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    const dir = keyToDirection(e.key);
    if (dir !== null) {
      this.heldDirections.delete(dir);
      if (this.lastHeldDirection === dir) {
        const remaining = this.heldDirections.values().next();
        this.lastHeldDirection = remaining.done ? null : remaining.value;
      }
    }
    if (e.key === " ") this.spaceHeld = false;
  };

  /** Clears all held state on window blur (e.g. alt-tab) so a swallowed keyup can't leave a key stuck "held" forever. */
  private onBlur = (): void => {
    this.heldDirections.clear();
    this.lastHeldDirection = null;
    this.spaceHeld = false;
  };

  /**
   * Forget all movement state (latched intent, held/tracked directions, Space). Called on level
   * load: the menu's Up/Down/Enter presses latch into `pendingIntent`/`lastHeldDirection` like any
   * other keydown, and without this the very first tick consumes them and "ghost-moves" Murphy a
   * cell with no gameplay input. A key still physically held stays inert until re-pressed.
   */
  resetMovement(): void {
    this.heldDirections.clear();
    this.lastHeldDirection = null;
    this.pendingIntent = null;
    this.spaceHeld = false;
  }

  /** Call exactly once per simulation tick. A fresh tap always wins; otherwise falls back to whatever's held. */
  consumeIntent(): Direction | null {
    if (this.pendingIntent !== null) {
      const intent = this.pendingIntent;
      this.pendingIntent = null;
      return intent;
    }
    return this.lastHeldDirection;
  }

  /** Whether Space is currently held down (used to charge/plant a timed bomb). */
  isSpaceHeld(): boolean {
    return this.spaceHeld;
  }

  /** Returns and clears one-shot key events since the last call. */
  consumeEdgeEvents(): InputEdgeEvents {
    const result = {
      pause: this.pauseQueued,
      restart: this.restartQueued,
      anyKey: this.anyKeyQueued,
      confirm: this.confirmQueued,
      selectPrev: this.selectPrevQueued,
      selectNext: this.selectNextQueued,
      selectLeft: this.selectLeftQueued,
      selectRight: this.selectRightQueued,
    };
    this.pauseQueued = false;
    this.restartQueued = false;
    this.anyKeyQueued = false;
    this.confirmQueued = false;
    this.selectPrevQueued = false;
    this.selectNextQueued = false;
    this.selectLeftQueued = false;
    this.selectRightQueued = false;
    return result;
  }
}

import { Direction } from "../types";
import { TICK_MS } from "../constants";
import { LEVELS } from "../level/levels";
import { parseLevel } from "../level/parseLevel";
import { Grid } from "./Grid";
import { GravityDirection } from "./GravityDirection";
import { GameState, createInitialGameState } from "./GameState";
import { PhysicsEngine } from "./PhysicsEngine";
import { InputController, InputEdgeEvents } from "./InputController";
import { Renderer } from "../render/Renderer";

const LIVES_START = 3;

export class Game {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly input: InputController;
  private readonly renderer: Renderer;

  private state: GameState;
  private grid: Grid | null = null;
  private gravity: GravityDirection = new GravityDirection(Direction.Down);
  private physics: PhysicsEngine | null = null;

  private accumulatorMs = 0;
  private wallClockAccumulatorMs = 0;
  private lastTimestamp: number | null = null;
  private idCounter = 1;
  private selectedLevelIndex = 0;

  constructor(canvas: HTMLCanvasElement, dpr = 1) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas context unavailable");
    ctx.scale(dpr, dpr);
    this.ctx = ctx;
    this.input = new InputController(window);
    this.renderer = new Renderer(this.ctx);
    this.state = createInitialGameState(LIVES_START);
  }

  start(): void {
    requestAnimationFrame(this.loop);
  }

  private nextOccupantId = (): number => this.idCounter++;

  private loadLevel(index: number): void {
    const data = LEVELS[index];
    if (!data) throw new Error(`No level at index ${index}`);
    const parsed = parseLevel(data, this.nextOccupantId);

    this.grid = parsed.grid;
    this.gravity = new GravityDirection(Direction.Down);
    this.state.levelIndex = index;
    this.state.collectedInfotrons = 0;
    this.state.requiredInfotrons = parsed.infotronsRequired;
    this.state.remainingSeconds = data.timeLimitSeconds;
    this.state.bombSupply = data.bombSupply ?? 0;
    this.state.deathDelayTicks = null;
    this.state.status = "playing";
    this.physics = new PhysicsEngine(this.grid, this.gravity, this.state, this.nextOccupantId);
    this.accumulatorMs = 0;
    this.wallClockAccumulatorMs = 0;
  }

  private loop = (timestamp: number): void => {
    if (this.lastTimestamp === null) this.lastTimestamp = timestamp;
    const dt = timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;

    const events = this.input.consumeEdgeEvents();

    switch (this.state.status) {
      case "start":
        if (events.selectPrev) {
          this.selectedLevelIndex = (this.selectedLevelIndex - 1 + LEVELS.length) % LEVELS.length;
        }
        if (events.selectNext) {
          this.selectedLevelIndex = (this.selectedLevelIndex + 1) % LEVELS.length;
        }
        if (events.confirm) this.loadLevel(this.selectedLevelIndex);
        break;
      case "playing":
        this.updatePlaying(dt, events);
        break;
      case "paused":
        if (events.pause) this.state.status = "playing";
        break;
      case "dead":
        if (events.anyKey) this.loadLevel(this.state.levelIndex);
        break;
      case "levelComplete":
        if (events.anyKey) {
          const next = this.state.levelIndex + 1;
          if (next < LEVELS.length) this.loadLevel(next);
          else this.state.status = "victory";
        }
        break;
      case "gameOver":
      case "victory":
        if (events.anyKey) {
          this.state = createInitialGameState(LIVES_START);
          this.grid = null;
        }
        break;
    }

    if (this.state.status === "start") {
      this.renderer.renderStartScreen(this.selectedLevelIndex);
    } else if (this.grid) {
      this.renderer.render(this.grid, this.state, this.accumulatorMs / TICK_MS);
    }

    requestAnimationFrame(this.loop);
  };

  private updatePlaying(dt: number, events: InputEdgeEvents): void {
    if (events.pause) {
      this.state.status = "paused";
      return;
    }
    if (events.restart) {
      this.loadLevel(this.state.levelIndex);
      return;
    }
    if (!this.physics) return;

    this.wallClockAccumulatorMs += dt;
    while (this.wallClockAccumulatorMs >= 1000) {
      this.wallClockAccumulatorMs -= 1000;
      this.state.remainingSeconds -= 1;
      if (this.state.remainingSeconds <= 0) {
        this.state.remainingSeconds = 0;
        this.state.lives -= 1;
        this.state.status = this.state.lives > 0 ? "dead" : "gameOver";
        return;
      }
    }

    this.accumulatorMs += dt;
    while (this.accumulatorMs >= TICK_MS) {
      this.accumulatorMs -= TICK_MS;
      this.physics.tick(this.input.consumeIntent(), this.input.isSpaceHeld());
      if (this.state.status !== "playing") {
        this.accumulatorMs = 0;
        break;
      }
    }
  }
}

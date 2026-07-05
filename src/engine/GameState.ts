export type GameStatus =
  | "start"
  | "playing"
  | "paused"
  | "dead"
  | "levelComplete"
  | "gameOver"
  | "victory";

export interface GameState {
  levelIndex: number;
  score: number;
  lives: number;
  collectedInfotrons: number;
  requiredInfotrons: number;
  elapsedTicks: number;
  remainingSeconds: number;
  status: GameStatus;
  /** Murphy's remaining supply of timed bombs he can plant this level. */
  bombSupply: number;
  /**
   * Non-null while Murphy has just exploded but the "died" overlay hasn't shown yet — the
   * countdown (in ticks) until the status actually flips to dead/gameOver. The world keeps
   * simulating during it so the explosion and its aftermath stay visible.
   */
  deathDelayTicks: number | null;
}

export function createInitialGameState(lives: number): GameState {
  return {
    levelIndex: 0,
    score: 0,
    lives,
    collectedInfotrons: 0,
    requiredInfotrons: 0,
    elapsedTicks: 0,
    remainingSeconds: 0,
    status: "start",
    bombSupply: 0,
    deathDelayTicks: null,
  };
}

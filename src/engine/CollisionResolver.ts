import { GameState } from "./GameState";
import { TickEvents } from "./TickCommands";
import { EXIT_BONUS_PER_REMAINING_SECOND } from "../constants";

/** Applies the death/win outcomes accumulated by this tick's rule modules to game state. */
export function resolveCollisions(state: GameState, events: TickEvents): void {
  if (state.status !== "playing") return;

  if (events.murphyDied) {
    state.lives -= 1;
    state.status = state.lives > 0 ? "dead" : "gameOver";
    return;
  }

  if (events.levelWon) {
    state.score += state.remainingSeconds * EXIT_BONUS_PER_REMAINING_SECOND;
    state.status = "levelComplete";
  }
}

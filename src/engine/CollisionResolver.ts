import { GameState } from "./GameState";
import { TickEvents } from "./TickCommands";
import { EXIT_BONUS_PER_REMAINING_SECOND, MURPHY_DEATH_DELAY_TICKS } from "../constants";

/** Applies the death/win outcomes accumulated by this tick's rule modules to game state. */
export function resolveCollisions(state: GameState, events: TickEvents): void {
  if (state.status !== "playing") return;

  // Murphy already exploded a few ticks ago (PhysicsEngine removed him and played the blast);
  // the world keeps simulating until this countdown flips the status to the died overlay.
  if (state.deathDelayTicks !== null) {
    state.deathDelayTicks -= 1;
    if (state.deathDelayTicks <= 0) {
      state.deathDelayTicks = null;
      state.lives -= 1;
      state.status = state.lives > 0 ? "dead" : "gameOver";
    }
    return;
  }

  if (events.murphyDied) {
    state.deathDelayTicks = MURPHY_DEATH_DELAY_TICKS;
    return;
  }

  if (events.levelWon) {
    state.score += state.remainingSeconds * EXIT_BONUS_PER_REMAINING_SECOND;
    state.status = "levelComplete";
  }
}

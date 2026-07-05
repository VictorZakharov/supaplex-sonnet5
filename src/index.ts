import "./styles.css";
import { Game } from "./engine/Game";
import { createDebugHarness, DebugHarness } from "./engine/debugHarness";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "./render/Renderer";

const canvas = document.getElementById("game-canvas");
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("#game-canvas not found");
}

// Render at native device resolution so text and shapes stay crisp on HiDPI displays —
// the canvas's CSS size stays the same, only its backing pixel store gets denser.
const dpr = window.devicePixelRatio || 1;
canvas.width = CANVAS_WIDTH * dpr;
canvas.height = CANVAS_HEIGHT * dpr;
canvas.style.width = `${CANVAS_WIDTH}px`;
canvas.style.height = `${CANVAS_HEIGHT}px`;

const game = new Game(canvas, dpr);
game.start();

// Debug harness: only exposed under ?debug, so normal play (and prod) stays untouched.
// Usage: http://localhost:8080/?debug then drive window.__game from the console/Playwright.
if (new URLSearchParams(window.location.search).has("debug")) {
  (window as unknown as { __game: DebugHarness }).__game = createDebugHarness(game);
}

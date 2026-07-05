import { GameState } from "../engine/GameState";
import { LEVELS } from "../level/levels";
import { CANVAS_FONT } from "../constants";
import { PALETTE } from "../render/palette";

function drawCenteredBanner(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  title: string,
  subtitle: string,
): void {
  ctx.fillStyle = PALETTE.overlayBg;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = PALETTE.overlayText;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold 32px ${CANVAS_FONT}`;
  ctx.fillText(title, width / 2, height / 2 - 14);
  ctx.font = `16px ${CANVAS_FONT}`;
  ctx.fillText(subtitle, width / 2, height / 2 + 22);
}

export function drawStartScreen(
  ctx: CanvasRenderingContext2D,
  width: number,
  _height: number,
  selectedLevelIndex: number,
): void {
  ctx.fillStyle = PALETTE.overlayText;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold 40px ${CANVAS_FONT}`;
  ctx.fillText("SUPAPLEX", width / 2, 60);

  ctx.font = `16px ${CANVAS_FONT}`;
  const lines = [
    "Arrow keys / WASD — move, dig, push, collect",
    "Hold Space (+ direction) — act in place / charge a bomb plant",
    "P — pause     R — restart level",
    "Collect all Infotrons to open the Exit",
  ];
  lines.forEach((line, i) => {
    ctx.fillText(line, width / 2, 110 + i * 24);
  });

  ctx.font = `bold 18px ${CANVAS_FONT}`;
  ctx.fillText("Select a level — Up/Down, then Enter/Space", width / 2, 205);

  const listTop = 240;
  const rowHeight = 30;
  LEVELS.forEach((level, i) => {
    const y = listTop + i * rowHeight;
    const selected = i === selectedLevelIndex;
    if (selected) {
      ctx.fillStyle = PALETTE.hudBg;
      ctx.fillRect(width / 2 - 160, y - rowHeight / 2 + 2, 320, rowHeight - 4);
    }
    ctx.fillStyle = selected ? PALETTE.exitOpen : PALETTE.overlayText;
    ctx.font = selected ? `bold 18px ${CANVAS_FONT}` : `16px ${CANVAS_FONT}`;
    ctx.fillText(`${selected ? "▶ " : "  "}${i + 1}. ${level.name}`, width / 2, y);
  });
}

export function drawOverlayForStatus(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  width: number,
  height: number,
): void {
  switch (state.status) {
    case "paused":
      drawCenteredBanner(ctx, width, height, "PAUSED", "Press P to resume");
      break;
    case "dead":
      drawCenteredBanner(ctx, width, height, "Murphy Died!", "Press any key to retry");
      break;
    case "levelComplete":
      drawCenteredBanner(ctx, width, height, "Level Complete!", "Press any key to continue");
      break;
    case "gameOver":
      drawCenteredBanner(ctx, width, height, "GAME OVER", `Final score: ${state.score} — press any key`);
      break;
    case "victory":
      drawCenteredBanner(ctx, width, height, "YOU WIN!", `Final score: ${state.score} — press any key`);
      break;
    default:
      break;
  }
}

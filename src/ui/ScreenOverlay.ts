import { GameState } from "../engine/GameState";
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

import { GameState } from "../engine/GameState";
import { LEVELS } from "../level/levels";
import { CANVAS_FONT, HUD_HEIGHT } from "../constants";
import { PALETTE } from "../render/palette";

export function drawHUD(ctx: CanvasRenderingContext2D, state: GameState, width: number): void {
  ctx.fillStyle = PALETTE.hudBg;
  ctx.fillRect(0, 0, width, HUD_HEIGHT);

  ctx.fillStyle = PALETTE.hudText;
  ctx.font = `16px ${CANVAS_FONT}`;
  ctx.textBaseline = "middle";
  const y = HUD_HEIGHT / 2;

  ctx.textAlign = "left";
  let x = 10;
  const drawField = (text: string): void => {
    ctx.fillText(text, x, y);
    x += ctx.measureText(text).width + 24;
  };
  drawField(`Lives: ${state.lives}`);
  drawField(`Score: ${state.score}`);
  drawField(`Infotrons: ${state.collectedInfotrons}/${state.requiredInfotrons}`);
  if (state.bombSupply > 0) {
    drawField(`Bombs: ${state.bombSupply}`);
  }
  const level = LEVELS[state.levelIndex];
  if (level) drawField(level.name);

  ctx.textAlign = "right";
  ctx.fillText(`Time: ${state.remainingSeconds}s`, width - 10, y);
}

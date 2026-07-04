import { CANVAS_FONT } from "../constants";
import { PALETTE } from "../render/palette";
import { LEVEL_HINTS } from "./hints";

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && ctx.measureText(candidate).width > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function drawHintPanel(
  ctx: CanvasRenderingContext2D,
  levelIndex: number,
  panelX: number,
  panelHeight: number,
  panelWidth: number,
): void {
  ctx.fillStyle = PALETTE.hudBg;
  ctx.fillRect(panelX, 0, panelWidth, panelHeight);
  ctx.strokeStyle = "#2a2a36";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(panelX, 0);
  ctx.lineTo(panelX, panelHeight);
  ctx.stroke();

  const padding = 16;
  const textWidth = panelWidth - padding * 2;
  let y = 16;

  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = `bold 17px ${CANVAS_FONT}`;
  ctx.fillText("New in this level", panelX + padding, y);
  y += 32;

  const hints = LEVEL_HINTS[levelIndex] ?? [];
  if (hints.length === 0) {
    ctx.font = `13px ${CANVAS_FONT}`;
    ctx.fillStyle = "#9090a0";
    ctx.fillText("Nothing new — you know every piece.", panelX + padding, y);
    return;
  }

  for (const hint of hints) {
    ctx.fillStyle = hint.swatch;
    ctx.fillRect(panelX + padding, y + 2, 14, 14);

    ctx.fillStyle = PALETTE.hudText;
    ctx.font = `bold 14px ${CANVAS_FONT}`;
    ctx.fillText(hint.label, panelX + padding + 22, y);
    y += 24;

    ctx.font = `13px ${CANVAS_FONT}`;
    ctx.fillStyle = "#b8b8c8";
    for (const line of wrapText(ctx, hint.desc, textWidth)) {
      ctx.fillText(line, panelX + padding, y);
      y += 18;
    }
    y += 16;
  }
}

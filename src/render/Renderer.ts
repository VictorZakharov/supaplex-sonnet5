import { lerp } from "../types";
import { Grid } from "../engine/Grid";
import { GameState } from "../engine/GameState";
import { TerrainType } from "../tiles/TileType";
import { GRID_COLS, GRID_ROWS, HUD_HEIGHT, SIDE_PANEL_WIDTH, TILE_SIZE } from "../constants";
import { drawFx, drawOccupant, drawTeleportingOccupant, drawTerrain, wallCornerMask } from "./tileDrawers";
import { drawHUD } from "../ui/HUD";
import { drawHintPanel } from "../ui/HintPanel";
import { drawOverlayForStatus } from "../ui/ScreenOverlay";
import { PALETTE } from "./palette";
import { isOccupantRotating } from "../tiles/TileProps";

export const GRID_WIDTH = GRID_COLS * TILE_SIZE;
export const CANVAS_WIDTH = GRID_WIDTH + SIDE_PANEL_WIDTH;
export const CANVAS_HEIGHT = HUD_HEIGHT + GRID_ROWS * TILE_SIZE;

export class Renderer {
  constructor(private readonly ctx: CanvasRenderingContext2D) {}

  /** The start menu itself is a DOM overlay (see StartMenu) — the canvas just clears behind it. */
  renderStartScreen(): void {
    this.ctx.fillStyle = PALETTE.background;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  render(grid: Grid, state: GameState, alpha: number): void {
    const ctx = this.ctx;

    ctx.fillStyle = PALETTE.background;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    drawHUD(ctx, state, GRID_WIDTH);

    grid.forEach((cell, pos) => {
      const px = pos.x * TILE_SIZE;
      const py = HUD_HEIGHT + pos.y * TILE_SIZE;
      const corners = cell.terrain === TerrainType.Wall ? wallCornerMask(grid, pos) : undefined;
      drawTerrain(ctx, cell, px, py, TILE_SIZE, corners);
      if (cell.fx) drawFx(ctx, cell.fx, px, py, TILE_SIZE);
    });

    for (const occ of grid.allOccupants()) {
      if (occ.movementKind === "teleporting") {
        drawTeleportingOccupant(ctx, occ, alpha, HUD_HEIGHT, TILE_SIZE);
        continue;
      }
      const ix = lerp(occ.prevPos.x, occ.pos.x, alpha) * TILE_SIZE;
      const iy = HUD_HEIGHT + lerp(occ.prevPos.y, occ.pos.y, alpha) * TILE_SIZE;
      const rotation = isOccupantRotating(occ) ? lerp(occ.prevRotation, occ.rotation, alpha) : 0;
      drawOccupant(ctx, occ, ix, iy, TILE_SIZE, rotation);
    }

    drawHintPanel(ctx, state.levelIndex, GRID_WIDTH, CANVAS_HEIGHT, SIDE_PANEL_WIDTH);

    if (state.status !== "playing") {
      drawOverlayForStatus(ctx, state, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
  }
}

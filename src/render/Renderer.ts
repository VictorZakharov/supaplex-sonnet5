import { lerp, Point } from "../types";
import { Grid } from "../engine/Grid";
import { GameState } from "../engine/GameState";
import { TerrainType } from "../tiles/TileType";
import { GRID_COLS, GRID_ROWS, HUD_HEIGHT, SIDE_PANEL_WIDTH, TILE_SIZE } from "../constants";
import { drawFx, drawOccupant, drawTeleportingOccupant, drawTerrain, WallCorners } from "./tileDrawers";
import { drawHUD } from "../ui/HUD";
import { drawHintPanel } from "../ui/HintPanel";
import { drawOverlayForStatus, drawStartScreen } from "../ui/ScreenOverlay";
import { PALETTE } from "./palette";
import { isOccupantRotating } from "../tiles/TileProps";

export const GRID_WIDTH = GRID_COLS * TILE_SIZE;
export const CANVAS_WIDTH = GRID_WIDTH + SIDE_PANEL_WIDTH;
export const CANVAS_HEIGHT = HUD_HEIGHT + GRID_ROWS * TILE_SIZE;

/** Terrain a Wall run visually continues into — no rounding against these, so no background notches between solid tiles. */
const WALL_CONTINUOUS = new Set<TerrainType>([
  TerrainType.Wall,
  TerrainType.WallSquare,
  TerrainType.Hardware1,
  TerrainType.Hardware2,
  TerrainType.ZonkGenerator,
  TerrainType.Bug,
]);

function solidAt(grid: Grid, x: number, y: number): boolean {
  const p: Point = { x, y };
  if (!grid.inBounds(p)) return true; // off-map counts as solid — border walls stay flush
  return WALL_CONTINUOUS.has(grid.at(p).terrain);
}

/** A corner is rounded only where the wall run ends: both neighbors on that side are open. */
function wallCornerMask(grid: Grid, pos: Point): WallCorners {
  const left = solidAt(grid, pos.x - 1, pos.y);
  const right = solidAt(grid, pos.x + 1, pos.y);
  const up = solidAt(grid, pos.x, pos.y - 1);
  const down = solidAt(grid, pos.x, pos.y + 1);
  return [!left && !up, !right && !up, !right && !down, !left && !down];
}

export class Renderer {
  constructor(private readonly ctx: CanvasRenderingContext2D) {}

  renderStartScreen(selectedLevelIndex: number): void {
    this.ctx.fillStyle = PALETTE.background;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawStartScreen(this.ctx, CANVAS_WIDTH, CANVAS_HEIGHT, selectedLevelIndex);
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

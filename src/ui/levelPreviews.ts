import { LEVELS } from "../level/levels";
import { parseLevel } from "../level/parseLevel";
import { TerrainType } from "../tiles/TileType";
import { drawOccupant, drawTerrain, wallCornerMask } from "../render/tileDrawers";

/** Tile size the previews are rasterized at — 2x the on-screen card scale, for HiDPI crispness. */
const PREVIEW_TILE = 14;

const cache = new Map<number, HTMLCanvasElement>();

/**
 * A miniature render of a level's starting state, drawn once per level with the real tile
 * drawers onto an offscreen canvas and cached — the start screen just drawImage()s it per frame.
 */
export function getLevelPreview(index: number): HTMLCanvasElement {
  const cached = cache.get(index);
  if (cached) return cached;

  const data = LEVELS[index];
  if (!data) throw new Error(`No level at index ${index}`);
  let id = 1;
  const parsed = parseLevel(data, () => id++);

  const canvas = document.createElement("canvas");
  canvas.width = parsed.grid.width * PREVIEW_TILE;
  canvas.height = parsed.grid.height * PREVIEW_TILE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context unavailable for level preview");

  parsed.grid.forEach((cell, pos) => {
    const corners = cell.terrain === TerrainType.Wall ? wallCornerMask(parsed.grid, pos) : undefined;
    drawTerrain(ctx, cell, pos.x * PREVIEW_TILE, pos.y * PREVIEW_TILE, PREVIEW_TILE, corners);
  });
  for (const occ of parsed.grid.allOccupants()) {
    drawOccupant(ctx, occ, occ.pos.x * PREVIEW_TILE, occ.pos.y * PREVIEW_TILE, PREVIEW_TILE);
  }

  cache.set(index, canvas);
  return canvas;
}

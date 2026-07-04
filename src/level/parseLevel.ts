import { Point } from "../types";
import { Grid } from "../engine/Grid";
import { Cell } from "../engine/Cell";
import { TerrainType } from "../tiles/TileType";
import { LevelData } from "./LevelData";
import { ParsedLevel } from "./Level";
import { RING_OFFSETS } from "../entities/electron";
import { DEFAULT_ZONK_GENERATOR_INTERVAL_TICKS, GRID_COLS, GRID_ROWS } from "../constants";

export function parseLevel(data: LevelData, nextId: () => number): ParsedLevel {
  const rows = data.rows;
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  if (height !== GRID_ROWS || width !== GRID_COLS) {
    throw new Error(
      `Level "${data.name}" must be ${GRID_COLS}x${GRID_ROWS}, got ${width}x${height}`,
    );
  }

  const pending: { ch: string; pos: Point }[] = [];

  const grid = new Grid(width, height, (x, y) => {
    const row = rows[y];
    const ch = row?.[x];
    if (ch === undefined) {
      throw new Error(`Level "${data.name}" row ${y} shorter than width ${width}`);
    }
    const entry = data.legend[ch];
    if (!entry) {
      throw new Error(`Level "${data.name}" has unknown symbol '${ch}' at (${x}, ${y})`);
    }
    pending.push({ ch, pos: { x, y } });
    const cell: Cell = { terrain: entry.terrain, occupant: null };
    if (entry.isGenerator) {
      cell.generator = {
        intervalTicks: DEFAULT_ZONK_GENERATOR_INTERVAL_TICKS,
        ticksUntilNextSpawn: DEFAULT_ZONK_GENERATOR_INTERVAL_TICKS,
      };
    }
    return cell;
  });

  const bugPositions: Point[] = [];
  grid.forEach((cell, pos) => {
    if (cell.terrain === TerrainType.Bug) bugPositions.push(pos);
  });

  let murphyStart: Point | null = null;
  let infotronsRequired = 0;
  const electronPositions: Point[] = [];

  for (const { ch, pos } of pending) {
    const entry = data.legend[ch]!;
    if (!entry.spawnOccupant) continue;
    const occupant = entry.spawnOccupant(nextId(), pos);
    grid.spawnOccupant(pos, occupant);
    if (occupant.type === "murphy") murphyStart = pos;
    else if (occupant.type === "infotron") infotronsRequired += 1;
    else if (occupant.type === "electron") electronPositions.push(pos);
  }

  for (const ePos of electronPositions) {
    const occ = grid.at(ePos).occupant;
    if (!occ || occ.type !== "electron") continue;
    const bug = bugPositions.find(
      (b) => Math.abs(b.x - ePos.x) <= 1 && Math.abs(b.y - ePos.y) <= 1 && !(b.x === ePos.x && b.y === ePos.y),
    );
    if (!bug) {
      throw new Error(`Level "${data.name}": electron at (${ePos.x}, ${ePos.y}) has no adjacent Bug`);
    }
    const dx = ePos.x - bug.x;
    const dy = ePos.y - bug.y;
    const ringIndex = RING_OFFSETS.findIndex((o) => o.x === dx && o.y === dy);
    if (ringIndex === -1) {
      throw new Error(`Level "${data.name}": electron at (${ePos.x}, ${ePos.y}) is not ring-adjacent to its Bug`);
    }
    occ.homeBug = bug;
    occ.ringIndex = ringIndex;
  }

  if (!murphyStart) {
    throw new Error(`Level "${data.name}" has no Murphy start position`);
  }

  return { grid, murphyStart, infotronsRequired };
}

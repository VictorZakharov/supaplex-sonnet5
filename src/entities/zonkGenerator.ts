import { Grid } from "../engine/Grid";
import { GravityDirection } from "../engine/GravityDirection";
import { ClaimSet, claim, isClaimed } from "../engine/TickCommands";
import { TerrainType } from "../tiles/TileType";
import { createZonk } from "../tiles/occupantFactory";
import { FX_TICKS } from "../constants";

export function resolveZonkGenerators(
  grid: Grid,
  gravity: GravityDirection,
  claims: ClaimSet,
  nextId: () => number,
): void {
  grid.forEach((cell, pos) => {
    if (cell.terrain !== TerrainType.ZonkGenerator || !cell.generator) return;

    cell.generator.ticksUntilNextSpawn -= 1;
    if (cell.generator.ticksUntilNextSpawn > 0) return;
    cell.generator.ticksUntilNextSpawn = cell.generator.intervalTicks;

    const spawnPos = grid.neighbor(pos, gravity.get());
    if (!spawnPos) return;
    const spawnCell = grid.at(spawnPos);
    if (spawnCell.terrain !== TerrainType.Empty || spawnCell.occupant !== null) return;
    if (isClaimed(claims, spawnPos)) return;

    claim(claims, spawnPos);
    grid.spawnOccupant(spawnPos, createZonk(nextId(), spawnPos));
    spawnCell.fx = { kind: "spawn", ticksLeft: FX_TICKS.spawn };
  });
}

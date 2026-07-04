import { Direction, opposite, rotateCCW, rotateCW } from "../types";
import { Grid } from "../engine/Grid";
import { ClaimSet, claim, isClaimed, TickEvents } from "../engine/TickCommands";
import { SnikSnakOccupant, TerrainType } from "../tiles/TileType";

export function resolveSnikSnaks(grid: Grid, events: TickEvents, claims: ClaimSet): void {
  const snikSnaks = grid.allOccupants().filter((o) => o.type === "snikSnak") as SnikSnakOccupant[];
  for (const snik of snikSnaks) {
    if (snik.movementKind !== "idle") continue;
    stepSnikSnak(grid, snik, events, claims);
  }
}

/** Left-hand wall-following: try turn-toward-bias, then straight, then turn-away, then reverse. */
function stepSnikSnak(grid: Grid, snik: SnikSnakOccupant, events: TickEvents, claims: ClaimSet): void {
  const candidates: Direction[] = [
    rotateCCW(snik.facing),
    snik.facing,
    rotateCW(snik.facing),
    opposite(snik.facing),
  ];

  for (const dir of candidates) {
    const target = grid.neighbor(snik.pos, dir);
    if (!target) continue;
    const cell = grid.at(target);

    if (cell.occupant?.type === "murphy") {
      events.murphyDied = true;
      snik.facing = dir;
      return;
    }

    if (cell.terrain === TerrainType.Empty && cell.occupant === null && !isClaimed(claims, target)) {
      claim(claims, target);
      snik.facing = dir;
      grid.moveOccupant(snik.pos, target, "walking");
      return;
    }
  }
  // Boxed in on all four sides — pace in place. Correct classic behavior, not a bug.
}

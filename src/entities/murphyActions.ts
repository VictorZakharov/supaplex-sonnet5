import { Direction, isHorizontal } from "../types";
import { Grid } from "../engine/Grid";
import { GravityDirection } from "../engine/GravityDirection";
import { TickEvents } from "../engine/TickCommands";
import { GameState } from "../engine/GameState";
import { Cell } from "../engine/Cell";
import { MurphyOccupant, TerrainType } from "../tiles/TileType";
import {
  isGravityPort,
  isOccupantDeadlyToMurphy,
  isOccupantPushable,
  isPort,
  isTerrainDiggable,
  portDirectionOf,
} from "../tiles/TileProps";
import { isSupported } from "./fallingObjects";
import { plantTimedBombAt } from "./bomb";
import { FX_TICKS, INFOTRON_SCORE } from "../constants";

function isOpenForPush(cell: Cell): boolean {
  return cell.terrain === TerrainType.Empty && cell.occupant === null;
}

export function resolveMurphyAction(
  grid: Grid,
  murphy: MurphyOccupant,
  intent: Direction | null,
  gravity: GravityDirection,
  state: GameState,
  events: TickEvents,
): void {
  if (intent === null) return;
  murphy.facing = intent;

  const target = grid.neighbor(murphy.pos, intent);
  if (!target) return;
  const targetCell = grid.at(target);

  if (isOccupantDeadlyToMurphy(targetCell.occupant)) {
    events.murphyDied = true;
    return;
  }

  if (isPort(targetCell.terrain)) {
    const portDir = portDirectionOf(targetCell.terrain);
    if (portDir !== intent || targetCell.occupant) return;
    const exitPos = grid.neighbor(target, intent);
    if (!exitPos) return; // port sits at the map edge — nowhere to emerge, blocked
    const exitCell = grid.at(exitPos);
    if (exitCell.terrain !== TerrainType.Empty || exitCell.occupant !== null) return; // exit blocked
    grid.moveOccupant(murphy.pos, exitPos, "teleporting");
    targetCell.fx = { kind: "portal", ticksLeft: FX_TICKS.portal };
    exitCell.fx = { kind: "portal", ticksLeft: FX_TICKS.portal };
    if (isGravityPort(targetCell.terrain)) gravity.flip();
    return;
  }

  if (targetCell.occupant?.type === "infotron" && isSupported(grid, target, gravity.get())) {
    grid.removeOccupant(target);
    state.collectedInfotrons += 1;
    state.score += INFOTRON_SCORE;
    targetCell.fx = { kind: "collect", ticksLeft: FX_TICKS.collect };
    grid.moveOccupant(murphy.pos, target, "walking");
    unlockExitIfReady(grid, state);
    return;
  }

  if (isOccupantPushable(targetCell.occupant) && isHorizontal(intent)) {
    const beyond = grid.neighbor(target, intent);
    if (beyond && isOpenForPush(grid.at(beyond))) {
      grid.moveOccupant(target, beyond, "pushed");
      grid.moveOccupant(murphy.pos, target, "walking");
    }
    return;
  }

  if (targetCell.occupant) {
    return; // occupied by something that can't be entered from this direction
  }

  if (targetCell.terrain === TerrainType.ExitOpen) {
    grid.moveOccupant(murphy.pos, target, "walking");
    events.levelWon = true;
    return;
  }

  if (targetCell.terrain === TerrainType.Empty) {
    grid.moveOccupant(murphy.pos, target, "walking");
    return;
  }

  if (isTerrainDiggable(targetCell.terrain)) {
    targetCell.terrain = TerrainType.Empty;
    targetCell.fx = { kind: "dig", ticksLeft: FX_TICKS.dig };
    grid.moveOccupant(murphy.pos, target, "walking");
    return;
  }

  // Wall / Hardware / ZonkGenerator / Bug / closed Exit — blocked, no-op.
}

/**
 * Space + direction: act on the adjacent cell without stepping into it — collect a supported
 * Infotron, dig a Base tile clear, or plant a timed bomb, whichever applies. Anything else
 * (a wall, a pushable object, a port, an enemy) has no effect without actually moving into it.
 */
export function resolveMurphyLook(
  grid: Grid,
  murphy: MurphyOccupant,
  intent: Direction,
  gravity: GravityDirection,
  state: GameState,
  spendBombSupply: () => void,
  nextId: () => number,
): void {
  murphy.facing = intent;

  const target = grid.neighbor(murphy.pos, intent);
  if (!target) return;
  const targetCell = grid.at(target);

  if (targetCell.occupant?.type === "infotron" && isSupported(grid, target, gravity.get())) {
    grid.removeOccupant(target);
    state.collectedInfotrons += 1;
    state.score += INFOTRON_SCORE;
    targetCell.fx = { kind: "collect", ticksLeft: FX_TICKS.collect };
    unlockExitIfReady(grid, state);
    return;
  }

  if (targetCell.occupant === null && isTerrainDiggable(targetCell.terrain)) {
    targetCell.terrain = TerrainType.Empty;
    targetCell.fx = { kind: "dig", ticksLeft: FX_TICKS.dig };
    return;
  }

  if (targetCell.terrain === TerrainType.Empty && targetCell.occupant === null && state.bombSupply > 0) {
    plantTimedBombAt(grid, target, spendBombSupply, nextId);
  }
}

function unlockExitIfReady(grid: Grid, state: GameState): void {
  if (state.collectedInfotrons < state.requiredInfotrons) return;
  grid.forEach((cell) => {
    if (cell.terrain === TerrainType.ExitClosed) cell.terrain = TerrainType.ExitOpen;
  });
}

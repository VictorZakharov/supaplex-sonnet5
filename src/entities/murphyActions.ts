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
import { BOMB_PLANT_CHARGE_TICKS, CHAIN_BLAST_DELAY_TICKS, FX_TICKS, INFOTRON_SCORE, TIMED_BOMB_FUSE_TICKS } from "../constants";

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

  const killer = targetCell.occupant;
  if (killer && isOccupantDeadlyToMurphy(killer)) {
    // Walking into an enemy kills Murphy — and must kill the enemy too. Its phase runs AFTER
    // Murphy's, so left alive it could patrol/orbit out of the 3x3 death blast this same tick
    // and survive. Destroy it here with the standard chain semantics (dies now, own blast a
    // beat later — an electron's seeds its Infotron shower). The extra +1 on the delay offsets
    // this tick's resolvePendingBlasts decrement, so the ripple lands on the same beat as an
    // enemy caught by the end-of-tick death blast would.
    events.murphyDied = true;
    events.destroyedOccupantIds.add(killer.id);
    grid.removeOccupant(target);
    targetCell.pendingBlast = { ticksLeft: CHAIN_BLAST_DELAY_TICKS + 1, electron: killer.type === "electron" };
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

  if (targetCell.occupant?.type === "bombPickup") {
    grid.removeOccupant(target);
    state.bombSupply += 1;
    targetCell.fx = { kind: "collect", ticksLeft: FX_TICKS.collect };
    grid.moveOccupant(murphy.pos, target, "walking");
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

export function resetBombCharge(murphy: MurphyOccupant): void {
  murphy.bombCharge = 0;
  murphy.bombChargeTarget = null;
}

/**
 * Space held: act without moving. With a direction, a supported Infotron / bomb pickup / Base tile
 * on the adjacent cell is collected/dug instantly, exactly as before. If the adjacent cell is open
 * ground instead (or no direction is held, targeting Murphy's own cell), Space *charges* a bomb
 * plant: hold for BOMB_PLANT_CHARGE_TICKS and a timed bomb is planted there from Murphy's collected
 * supply. An under-Murphy plant burns its fuse in the cell and materializes when he steps off.
 */
export function resolveMurphyLook(
  grid: Grid,
  murphy: MurphyOccupant,
  intent: Direction | null,
  gravity: GravityDirection,
  state: GameState,
  spendBombSupply: () => void,
  nextId: () => number,
): void {
  if (intent !== null) murphy.facing = intent;

  const target = intent !== null ? grid.neighbor(murphy.pos, intent) : murphy.pos;
  if (!target) {
    resetBombCharge(murphy);
    return;
  }
  const targetCell = grid.at(target);

  if (intent !== null) {
    if (targetCell.occupant?.type === "infotron" && isSupported(grid, target, gravity.get())) {
      grid.removeOccupant(target);
      state.collectedInfotrons += 1;
      state.score += INFOTRON_SCORE;
      targetCell.fx = { kind: "collect", ticksLeft: FX_TICKS.collect };
      unlockExitIfReady(grid, state);
      resetBombCharge(murphy);
      return;
    }

    if (targetCell.occupant?.type === "bombPickup") {
      grid.removeOccupant(target);
      state.bombSupply += 1;
      targetCell.fx = { kind: "collect", ticksLeft: FX_TICKS.collect };
      resetBombCharge(murphy);
      return;
    }

    if (targetCell.occupant === null && isTerrainDiggable(targetCell.terrain)) {
      targetCell.terrain = TerrainType.Empty;
      targetCell.fx = { kind: "dig", ticksLeft: FX_TICKS.dig };
      resetBombCharge(murphy);
      return;
    }
  }

  const plantable =
    targetCell.terrain === TerrainType.Empty &&
    targetCell.plantedBomb === undefined &&
    (intent !== null ? targetCell.occupant === null : true);
  if (!plantable || state.bombSupply <= 0) {
    resetBombCharge(murphy);
    return;
  }

  if (!murphy.bombChargeTarget || murphy.bombChargeTarget.x !== target.x || murphy.bombChargeTarget.y !== target.y) {
    murphy.bombChargeTarget = target;
    murphy.bombCharge = 0;
  }
  murphy.bombCharge += 1;
  if (murphy.bombCharge < BOMB_PLANT_CHARGE_TICKS) return;

  resetBombCharge(murphy);
  spendBombSupply();
  if (intent !== null) {
    plantTimedBombAt(grid, target, nextId);
  } else {
    targetCell.plantedBomb = { fuseTicks: TIMED_BOMB_FUSE_TICKS };
  }
}

function unlockExitIfReady(grid: Grid, state: GameState): void {
  if (state.collectedInfotrons < state.requiredInfotrons) return;
  grid.forEach((cell) => {
    if (cell.terrain === TerrainType.ExitClosed) cell.terrain = TerrainType.ExitOpen;
  });
}

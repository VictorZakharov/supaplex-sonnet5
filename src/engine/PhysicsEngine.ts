import { Direction } from "../types";
import { Grid } from "./Grid";
import { GravityDirection } from "./GravityDirection";
import { GameState } from "./GameState";
import { createClaimSet, createTickEvents } from "./TickCommands";
import { resolveCollisions } from "./CollisionResolver";
import { MurphyOccupant } from "../tiles/TileType";
import { resetBombCharge, resolveMurphyAction, resolveMurphyLook } from "../entities/murphyActions";
import { resolveFallingObjects } from "../entities/fallingObjects";
import { resolveSnikSnaks } from "../entities/snikSnak";
import { resolveElectrons, spawnElectronHarvest } from "../entities/electron";
import { resolveZonkGenerators } from "../entities/zonkGenerator";
import { explodeBomb, resolveTimedBombs } from "../entities/bomb";

function findMurphy(grid: Grid): MurphyOccupant | null {
  for (const occ of grid.allOccupants()) {
    if (occ.type === "murphy") return occ;
  }
  return null;
}

export class PhysicsEngine {
  constructor(
    private readonly grid: Grid,
    private readonly gravity: GravityDirection,
    private readonly state: GameState,
    private readonly nextId: () => number,
  ) {}

  tick(intent: Direction | null, spaceHeld: boolean): void {
    if (this.state.status !== "playing") return;

    this.grid.beginTick();
    const events = createTickEvents();
    const claims = createClaimSet();

    const murphy = findMurphy(this.grid);
    if (murphy) {
      if (spaceHeld) {
        resolveMurphyLook(
          this.grid,
          murphy,
          intent,
          this.gravity,
          this.state,
          () => (this.state.bombSupply -= 1),
          this.nextId,
        );
      } else {
        resetBombCharge(murphy);
        resolveMurphyAction(this.grid, murphy, intent, this.gravity, this.state, events);
      }
    }

    resolveFallingObjects(this.grid, this.gravity, events, claims, this.nextId);
    resolveSnikSnaks(this.grid, events, claims);
    resolveElectrons(this.grid, events, claims);
    resolveZonkGenerators(this.grid, this.gravity, claims, this.nextId);
    resolveTimedBombs(this.grid, events, this.nextId);

    // Every Murphy death is an explosion first, message later: blow him off the grid with a
    // REAL blast — the enemy that snipped/touched him is adjacent, so it dies in the explosion
    // too (an electron killer chain-bursts into its Infotron shower) — then resolveCollisions
    // starts the delay before the died overlay. Some killers (a landing rock) already removed
    // him — then only their own fx applies and the rock survives.
    if (events.murphyDied) {
      const victim = findMurphy(this.grid);
      if (victim) {
        const at = victim.pos;
        this.grid.removeOccupant(at);
        explodeBomb(this.grid, at, events, this.nextId);
      }
    }

    // Deferred Electron showers — after every blast of the tick, so none of them get eaten.
    spawnElectronHarvest(this.grid, events.electronBursts, this.nextId);

    this.state.elapsedTicks += 1;
    resolveCollisions(this.state, events);
  }
}

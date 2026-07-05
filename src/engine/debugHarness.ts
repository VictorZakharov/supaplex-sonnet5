import { Direction } from "../types";
import { Game } from "./Game";
import { Grid } from "./Grid";
import { GameState } from "./GameState";
import { PhysicsEngine } from "./PhysicsEngine";

/**
 * Deterministic-testing harness (see CLAUDE.md gotcha 4). Only wired up when the page is loaded
 * with the `?debug` URL flag — index.ts exposes it as `window.__game`; normal play never touches
 * this module's API. It reaches into Game's private fields via the cast below, kept in sync by
 * hand — acceptable for debug-only code, and it keeps Game's public surface clean.
 */
interface GameInternals {
  grid: Grid | null;
  physics: PhysicsEngine | null;
  state: GameState;
  debugFrozen: boolean;
  loadLevel(index: number): void;
  nextOccupantId(): number;
}

export interface DebugHarness {
  debugFreeze(frozen: boolean): void;
  debugLoadLevel(index: number): void;
  debugTick(n?: number, intent?: Direction | null, spaceHeld?: boolean): void;
  debugState(): unknown;
  debugDumpGrid(): string;
  debugMoveMurphy(x: number, y: number): void;
  debugSpawnZonk(x: number, y: number): void;
}

export function createDebugHarness(game: Game): DebugHarness {
  const g = game as unknown as GameInternals;

  return {
    /** Freeze the rAF-driven simulation so manual debugTick calls aren't contaminated by automatic ticks. */
    debugFreeze(frozen: boolean): void {
      g.debugFrozen = frozen;
    },

    /** Load a level and auto-freeze — the standard starting point for deterministic tests. */
    debugLoadLevel(index: number): void {
      g.loadLevel(index);
      g.debugFrozen = true;
    },

    debugTick(n = 1, intent: Direction | null = null, spaceHeld = false): void {
      for (let i = 0; i < n; i++) g.physics?.tick(intent, spaceHeld);
    },

    /** Deep-copied snapshot — never returns live references (they'd mutate before serialization). */
    debugState(): unknown {
      return JSON.parse(
        JSON.stringify({
          status: g.state.status,
          lives: g.state.lives,
          deathDelayTicks: g.state.deathDelayTicks,
          bombSupply: g.state.bombSupply,
          required: g.state.requiredInfotrons,
          collected: g.state.collectedInfotrons,
          occupants: g.grid ? g.grid.allOccupants().map((o) => ({ ...o })) : [],
        }),
      );
    },

    debugDumpGrid(): string {
      if (!g.grid) return "";
      const occChars: Record<string, string> = {
        murphy: "M", zonk: "Z", infotron: "*", orangeDisk: "O", bomb: "B",
        bombPickup: "b", timedBomb: "T", snikSnak: "S", electron: "E",
      };
      const lines: string[] = [];
      for (let y = 0; y < g.grid.height; y++) {
        let line = "";
        for (let x = 0; x < g.grid.width; x++) {
          const cell = g.grid.at({ x, y });
          line += cell.occupant ? (occChars[cell.occupant.type] ?? "?") : (".#%12:^v<>UDGgXo"[cell.terrain] ?? "?");
        }
        lines.push(line);
      }
      return lines.join("\n");
    },

    debugMoveMurphy(x: number, y: number): void {
      if (!g.grid) return;
      for (const occ of g.grid.allOccupants()) {
        if (occ.type === "murphy") {
          g.grid.moveOccupant(occ.pos, { x, y }, "walking");
          occ.prevPos = { x, y };
          occ.movementKind = "idle";
          return;
        }
      }
    },

    /** Spawn a test Zonk. Target an area with nothing else nearby — see CLAUDE.md gotcha 4. */
    debugSpawnZonk(x: number, y: number): void {
      g.grid?.spawnOccupant({ x, y }, {
        id: g.nextOccupantId(), type: "zonk", pos: { x, y }, prevPos: { x, y },
        movementKind: "idle", rotation: 0, prevRotation: 0, wasFalling: false,
      });
    },
  };
}

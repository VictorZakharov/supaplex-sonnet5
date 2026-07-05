import { GRID_COLS, GRID_ROWS } from "../constants";
import { LevelCanvas } from "./levelBuilder";
import { LEGEND } from "./legend";
import { LevelData } from "./LevelData";

function level1(): LevelData {
  // Default fill is now diggable dirt, not open air — no pushing/rolling/patrolling/porting
  // happens anywhere in this level, so there's nothing that requires open terrain to remain safe.
  const c = new LevelCanvas(GRID_COLS, GRID_ROWS, ".");
  c.border("#");
  c.vline(10, 1, 14, "."); // diggable base wall splitting the room (now just part of the dirt)
  c.set(2, 2, "M");
  c.set(4, 2, "*");
  c.hline(3, 5, 3, "#"); // 3-wide platform — a 1-wide pedestal lets it roll off the edge
  c.set(2, 5, "*");
  c.hline(1, 3, 6, "#");
  c.set(6, 6, "*");
  c.hline(5, 7, 7, "#");
  c.set(14, 7, "*");
  c.hline(13, 15, 8, "#");
  c.set(3, 10, "=");
  c.set(18, 3, "*"); // rests on a single square pedestal — flat edges hold without a 3-wide platform
  c.set(18, 4, "%");
  c.set(20, 7, "X");
  return { name: "First Steps", rows: c.toRows(), legend: LEGEND, timeLimitSeconds: 150 };
}

function level2(): LevelData {
  // Default fill is dirt; carve out the handful of spots that specific Zonk mechanics need to stay
  // open (roll landings, a push lane, a fall shaft) — everything else stays diggable.
  const c = new LevelCanvas(GRID_COLS, GRID_ROWS, ".");
  c.border("#");
  c.set(9, 9, " ");
  c.set(9, 10, " "); // roll landing for the zonk at (8,9)
  c.set(15, 14, " ");
  c.set(16, 14, " "); // push lane for the zonk blocking the floor corridor
  // Fall shaft for the height-drop zonk demo — kept short (lands at y=8, resting on dirt) rather
  // than falling all the way to the row-14 corridor. A full-length shaft lands there right around
  // the tick a max-speed walk from spawn reaches that column — a deterministic death for anyone
  // moving efficiently, not a fair hazard. Landing well short and off the main corridor avoids it.
  c.vline(12, 6, 8, " ");

  c.set(2, 14, "M");
  c.hline(5, 8, 10, "#");
  c.set(8, 9, "Z"); // rests at the edge of the ledge — rolls off to the right
  c.set(14, 14, "Z"); // blocks the floor corridor — push it aside
  c.set(12, 5, "Z"); // falls straight down from height
  c.set(3, 14, "*"); // rests directly on the floor
  c.set(10, 3, "*");
  c.hline(9, 11, 4, "#"); // 3-wide platform so this one stays put up high
  c.set(20, 14, "*"); // rests directly on the floor

  // Contrast demo: same setup as the (8,9) round-Wall zonk above (open air on both diagonals),
  // but the pedestal is a single-cell Square Wall — it stays put instead of rolling off.
  c.set(18, 9, "Z");
  c.set(17, 9, " ");
  c.set(19, 9, " ");
  c.set(18, 10, "%");
  c.set(17, 10, " ");
  c.set(19, 10, " ");

  c.set(21, 2, "X");
  return { name: "Rolling Rocks", rows: c.toRows(), legend: LEGEND, timeLimitSeconds: 180 };
}

function level3(): LevelData {
  // Fully linear, one direction only: room -> corridor -> port -> gravity room -> gravity port ->
  // final room -> exit. Every one-way gate (Port/GravityPort) only ever leads further forward, so
  // there is never a required pickup stranded behind a gate the player can't walk back through.
  // Default fill is dirt; carved-out exceptions below are cells that specific mechanics (a push
  // demo, a Port's landing spot, a Zonk's fall path, the Gravity Port's landing spot) require to
  // stay open terrain rather than diggable ground.
  const c = new LevelCanvas(GRID_COLS, GRID_ROWS, ".");
  c.border("#");
  c.set(14, 2, " ");
  c.set(16, 2, " "); // push lane on both sides of the free-push disk demo
  c.set(11, 5, " "); // landing spot for the one-way port — a Port's exit must be open ground
  c.vline(20, 7, 12, " "); // fall path for the zonk dropping into the gravity room
  c.set(19, 14, " "); // landing spot for the gravity port

  c.set(2, 2, "M");
  c.set(4, 2, "*");
  c.set(15, 2, "O"); // free push demo — also proves disks ignore gravity: it never falls despite open space below

  c.hline(1, 22, 4, "#");
  c.set(2, 4, " "); // doorway down into the corridor (ordinary gap — always two-way)

  c.hline(1, 22, 6, "#");
  c.set(20, 6, " "); // the only way down into the gravity room

  c.set(10, 5, ">"); // one-way port — teleports across to (11,5), gravity room is the only way onward
  c.set(15, 5, "*");
  c.set(20, 5, "Z"); // falls through the gap into the gravity room below

  c.vline(16, 6, 14, "#"); // left wall of the gravity room and the final room beneath it
  c.hline(17, 19, 9, "#");
  c.set(18, 8, "*");
  c.hline(16, 22, 13, "#");
  c.set(19, 13, "V"); // gravity port — the only way down into the final room

  c.set(21, 14, "*");
  c.set(17, 14, "X");
  return { name: "Disks & Ports", rows: c.toRows(), legend: LEGEND, timeLimitSeconds: 220 };
}

function level4(): LevelData {
  // Default fill is dirt. Enemies can't dig, so the Snik-Snak's whole loop and the Electron's
  // whole ring must stay open terrain — carved out explicitly before anything else is placed.
  // The zonk-drop puzzle's push lane and fall-through path need the same treatment.
  const c = new LevelCanvas(GRID_COLS, GRID_ROWS, ".");
  c.border("#");
  c.hline(6, 11, 4, " ");
  c.hline(6, 11, 9, " ");
  c.vline(6, 4, 9, " ");
  c.vline(11, 4, 9, " "); // snik-snak loop ring (the inner wall block below re-carves its own interior)
  c.hline(16, 18, 4, " ");
  c.hline(16, 18, 6, " ");
  c.vline(16, 4, 6, " ");
  c.vline(18, 4, 8, " "); // electron ring, plus the zonk's fall-through path below it
  c.set(19, 3, " ");
  c.set(18, 3, " "); // push lane for the zonk-on-electron puzzle

  c.set(2, 2, "M");

  c.hline(5, 12, 3, "#");
  c.hline(5, 12, 10, "#");
  c.vline(5, 3, 10, "#");
  c.vline(12, 3, 10, "#");
  c.set(12, 9, " "); // doorway into the loop — without this the ring was fully sealed off from Murphy
  for (let y = 5; y <= 8; y++) c.hline(7, 10, y, "#");
  c.set(6, 4, "S");
  c.set(9, 4, "*"); // rests on the loop's inner wall block — inside the snik-snak's path

  c.set(17, 5, "@");
  c.set(17, 4, "e");
  c.set(14, 3, "*");
  c.hline(13, 15, 4, "#");
  c.set(17, 8, "*");
  c.hline(16, 18, 9, "#");

  c.hline(19, 21, 4, "#"); // platform for the push-a-zonk-onto-the-electron puzzle (x18 stays open — it's the electron's ring cell)
  c.set(20, 3, "Z"); // push it left twice to drop it down the electron's ring column

  c.set(3, 8, "*");
  c.hline(2, 4, 9, "#");
  c.set(14, 12, "*");
  c.hline(13, 15, 13, "#");
  c.set(21, 13, "X");
  return { name: "Enemies", rows: c.toRows(), legend: LEGEND, timeLimitSeconds: 240 };
}

function level5(): LevelData {
  // Default fill is dirt. The Zonk Generator's drop chute needs to stay open (it can only spawn
  // into an Empty cell), and the impact bomb's push lane + fall path need the same treatment.
  const c = new LevelCanvas(GRID_COLS, GRID_ROWS, ".");
  c.border("#");
  c.vline(10, 4, 13, " "); // zonk generator's drop chute
  c.set(5, 5, " ");
  c.set(6, 5, " ");
  c.set(6, 6, " "); // push lane + fall path for the impact bomb demo

  c.set(2, 2, "M");

  // Murphy starts with no bombs — these two pickups on the way down are his whole supply.
  c.set(2, 4, "b");
  c.set(3, 4, "b");

  c.set(10, 3, "N");
  c.vline(9, 4, 13, "#");
  c.vline(11, 4, 13, "#");
  c.hline(9, 11, 14, "#");

  // Impact bomb outcome 1: square, so it never rolls — pushing it only matters when it clears the
  // platform entirely. Push right once and it's still on the platform (supported, stays inert).
  // Push right again and it's pushed clear off the edge onto open air, falls, and lands — a
  // collision, so it detonates and the blast clears the nearby Base tile.
  c.set(4, 5, "D");
  c.hline(3, 5, 6, "#");
  c.set(6, 7, "."); // diggable ground the blast will clear
  c.hline(6, 8, 8, "#"); // floor beneath, catches the debris

  // Impact bomb outcome 2: drop a falling Zonk on top of a resting bomb instead. Push the zonk off
  // its square pedestal; it falls through open air and lands on the bomb below — detonating it
  // (and itself) even though the bomb was never touched directly.
  c.set(15, 5, "Z");
  c.set(15, 6, "%");
  c.set(16, 5, " ");
  c.set(16, 6, " ");
  c.set(16, 7, "D");
  c.set(16, 8, "#"); // bombs are square, not round — a single support cell is enough, no roll risk

  c.set(3, 14, "*"); // rests directly on the floor
  c.set(15, 8, "*");
  c.hline(14, 16, 9, "#");
  c.set(20, 4, "*");
  c.hline(19, 21, 5, "#");
  c.set(21, 13, "X");
  return {
    name: "Bombs",
    rows: c.toRows(),
    legend: LEGEND,
    timeLimitSeconds: 260,
  };
}

function level6(): LevelData {
  // The capstone: every mechanic from levels 1-5 in one level. Built as a hub (the vertical strip
  // at x1-5) with independent branch rooms off it — none gate any other, so the four rooms can be
  // tackled in any order ("multiple possible playthroughs"), same completion rule as every other
  // level (collect every Infotron, then reach the Exit).
  const c = new LevelCanvas(GRID_COLS, GRID_ROWS, ".");
  c.border("#");

  // --- Hub ---
  c.set(2, 2, "M");
  c.set(3, 5, "b"); // bomb pickups — Murphy starts with none
  c.set(3, 10, "b");
  c.vline(6, 1, 14, "#");
  c.set(6, 3, " "); // -> Zone A: Zonks
  c.set(6, 6, " "); // -> Zone B: Disks & Ports (one-way; comes back out a different door)
  c.set(6, 9, " "); // <- Zone B's return door
  c.set(6, 12, " "); // -> Zone C: Enemies (continues on into Zone D: Bombs & Generator)
  c.set(4, 13, "X");

  // --- Zone A: Zonks (x7-22, y1-3) ---
  c.hline(7, 22, 4, "#"); // floor for A, ceiling for B
  // (7,1)-(7,3) stay clear — that's the doorway column in from the hub.
  // Round Wall — rolls off the edge when pushed.
  c.set(9, 2, "Z");
  c.hline(8, 10, 3, "#");
  c.set(10, 2, " "); // push destination — still on the platform, safe until it's pushed once more
  c.set(11, 2, " ");
  c.set(11, 3, " ");
  // Square Wall, right next to it — same setup, but it stays put (contrast).
  c.set(13, 2, "Z");
  c.set(13, 3, "%");
  c.set(12, 2, " ");
  c.set(14, 2, " ");
  c.set(12, 3, " ");
  c.set(14, 3, " ");
  c.set(16, 1, "*");
  c.set(16, 2, "%");

  // --- Zone B: Disks & Ports (x7-22, y5-9) ---
  c.hline(7, 22, 10, "#"); // floor for B, ceiling for C/D
  c.set(9, 6, "O"); // free push demo
  c.set(8, 6, " ");
  c.set(10, 6, " ");
  c.set(14, 6, ">"); // one-way port
  c.set(15, 6, " "); // landing spot
  c.vline(15, 6, 8, " "); // shaft down from the port landing to the gravity port
  c.hline(7, 22, 7, "#");
  c.set(15, 7, " ");
  c.hline(7, 22, 8, "#");
  c.set(15, 8, "V"); // gravity port — the only way down to the return corridor
  c.set(15, 9, " "); // landing spot
  c.set(10, 9, "*"); // on the return corridor, resting on the floor below
  // Gravity-port payoff: a Zonk plugs the corridor's far end, guarding one Infotron. It can't be
  // pushed (the Infotron blocks the far side) and the walls around it are solid — but passing the
  // gravity port flips gravity, and the Zonk floats up this escape chute, unplugging the corridor.
  c.set(21, 9, "Z"); // the plug
  c.set(21, 8, " "); // escape chute through the double wall above it
  c.set(21, 7, " ");
  c.set(22, 9, "*"); // the Infotron the plug guards — only reachable after the gravity flip
  c.set(22, 8, "%"); // flat ceiling above the Infotron — on round Wall it would roll into the
  // vacated plug cell once gravity flips and chase the Zonk up the chute

  // --- Zone C: Enemies (x7-14, y11-14) ---
  c.vline(15, 11, 14, "#"); // right wall, separating from Zone D
  c.set(15, 13, " "); // doorway through to Zone D
  c.set(8, 12, "*");
  c.set(8, 13, "%");
  c.set(9, 11, "S"); // snik-snak, patrols this room (routes around the Bug like any other obstacle)
  c.set(11, 13, "@"); // bug, ring spans (10-12, 12-14)
  c.set(11, 12, "e");
  c.set(12, 12, " ");
  c.set(12, 13, " ");
  c.set(12, 14, " ");
  c.set(11, 14, " ");
  c.set(10, 14, " ");
  c.set(10, 13, " ");
  c.set(10, 12, " ");
  // Zonk-drop-on-electron bonus: push left to send it down into the ring's NE column — destroying
  // the electron bursts it into bonus Infotrons (see destroyElectron), which then fall naturally.
  // Not required for completion, purely a bonus. Pushed from (14,11), clear of the Zone D wall.
  // The pedestal MUST be a single square wall: a wider platform here would pave over the ring cell
  // at (12,12), permanently blocking the electron's orbit (shipped bug: the electron froze at the
  // E cell forever, waiting for a walled-off NE cell to open).
  c.set(13, 11, "Z");
  c.set(13, 12, "%");
  c.set(12, 11, " ");

  // --- Zone D: Bombs & Generator (x16-22, y11-14) ---
  c.set(18, 10, "N"); // zonk generator built into the dividing wall
  c.vline(18, 11, 14, " "); // its drop chute
  c.set(20, 11, "D"); // impact bomb
  c.hline(19, 21, 12, "#");
  c.set(21, 11, " ");
  c.set(22, 11, " ");
  c.set(22, 12, " ");
  c.set(22, 13, "."); // diggable ground the bomb's blast will clear when it lands
  c.set(21, 14, "*"); // rests directly on the border floor

  return {
    name: "Finale",
    rows: c.toRows(),
    legend: LEGEND,
    timeLimitSeconds: 400,
  };
}

export const LEVELS: readonly LevelData[] = [level1(), level2(), level3(), level4(), level5(), level6()];

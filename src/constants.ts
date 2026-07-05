export const TILE_SIZE = 32;
export const GRID_COLS = 24;
export const GRID_ROWS = 16;
export const HUD_HEIGHT = 40;
export const SIDE_PANEL_WIDTH = 300;

export const CANVAS_FONT = '"Cascadia Code", "JetBrains Mono", "SF Mono", "Consolas", "Courier New", monospace';

/** Duration of one logical simulation tick, in milliseconds. */
export const TICK_MS = 140;

export const LIVES_START = 3;

export const INFOTRON_SCORE = 20;
export const EXIT_BONUS_PER_REMAINING_SECOND = 5;

export const DEFAULT_ZONK_GENERATOR_INTERVAL_TICKS = 25;

/** How long a planted timed bomb burns before it detonates on its own. */
export const TIMED_BOMB_FUSE_TICKS = 20;
/** Ticks Space must be held before a timed bomb is actually planted (the "charge"). */
export const BOMB_PLANT_CHARGE_TICKS = 5;
export const CHAIN_BOMB_FUSE_TICKS = 3;
/** Ticks before a chain-hit enemy/bomb's own blast fires — chains visibly ripple, never instant. */
export const CHAIN_BLAST_DELAY_TICKS = 3;

/** Ticks between Murphy's death explosion and the "died" overlay — the world keeps running. */
export const MURPHY_DEATH_DELAY_TICKS = 14;

/** Radians a rolling Zonk/Infotron's texture spins per rolled cell (cosmetic only). */
export const ROLL_ROTATION_STEP = Math.PI / 2;

/** How many ticks a transient render effect (dig/collect/explosion/death) stays visible. */
export const FX_TICKS = {
  dig: 2,
  collect: 3,
  explode: 5,
  death: 6,
  spawn: 3,
  portal: 4,
} as const;

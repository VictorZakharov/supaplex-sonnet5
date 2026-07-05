import { Direction } from "../types";
import { Cell, FxState } from "../engine/Cell";
import { Occupant, TerrainType } from "../tiles/TileType";
import { BOMB_PLANT_CHARGE_TICKS } from "../constants";
import { PALETTE } from "./palette";

function directionAngle(dir: Direction): number {
  switch (dir) {
    case Direction.Up:
      return -Math.PI / 2;
    case Direction.Right:
      return 0;
    case Direction.Down:
      return Math.PI / 2;
    case Direction.Left:
      return Math.PI;
  }
}

function drawArrow(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, dir: Direction, color: string): void {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size * 0.32;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(directionAngle(dir));
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(-r * 0.6, -r * 0.8);
  ctx.lineTo(-r * 0.6, r * 0.8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Bombs are square 3.5" floppy disks, not round — that's *why* they never roll off a ledge. */
function drawFloppyDisk(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, body: string): void {
  const pad = size * 0.12;
  const w = size - pad * 2;
  const notch = size * 0.16;

  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(x + pad, y + pad);
  ctx.lineTo(x + pad + w - notch, y + pad);
  ctx.lineTo(x + pad + w, y + pad + notch);
  ctx.lineTo(x + pad + w, y + pad + w);
  ctx.lineTo(x + pad, y + pad + w);
  ctx.closePath();
  ctx.fill();

  // Metal shutter band, like the sliding cover on a real 3.5" disk.
  ctx.fillStyle = PALETTE.bombShutter;
  ctx.fillRect(x + pad + w * 0.16, y + pad + w * 0.14, w * 0.68, w * 0.3);
  ctx.fillStyle = PALETTE.bombShutterDark;
  ctx.fillRect(x + pad + w * 0.58, y + pad + w * 0.19, w * 0.16, w * 0.2);

  // Write-protect tab, bottom-left corner.
  ctx.fillStyle = PALETTE.bombShutter;
  ctx.fillRect(x + pad + w * 0.1, y + pad + w * 0.78, w * 0.16, w * 0.12);
}

/** An armed (fuse burning) timed-bomb disk, shared by the occupant and the planted-under-Murphy state. */
function drawArmedDisk(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, fuseTicks: number): void {
  drawFloppyDisk(ctx, x, y, size, PALETTE.bombArmed);
  const urgent = fuseTicks < 6 && fuseTicks % 2 === 0;
  ctx.fillStyle = urgent ? "#ffffff" : PALETTE.fuseSpark;
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size * 0.14, size * 0.08, 0, Math.PI * 2);
  ctx.fill();
}

/** Which corners of a Wall cell are exposed (no solid neighbor on either adjacent side). */
export type WallCorners = readonly [tl: boolean, tr: boolean, br: boolean, bl: boolean];

/** Traces the cell outline with the exposed corners rounded off; unexposed corners stay square. */
function roundedCellPath(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, corners: WallCorners): void {
  const r = size * 0.42;
  const [tl, tr, br, bl] = corners;
  ctx.beginPath();
  ctx.moveTo(x + (tl ? r : 0), y);
  ctx.lineTo(x + size - (tr ? r : 0), y);
  if (tr) ctx.quadraticCurveTo(x + size, y, x + size, y + r);
  ctx.lineTo(x + size, y + size - (br ? r : 0));
  if (br) ctx.quadraticCurveTo(x + size, y + size, x + size - r, y + size);
  ctx.lineTo(x + (bl ? r : 0), y + size);
  if (bl) ctx.quadraticCurveTo(x, y + size, x, y + size - r);
  ctx.lineTo(x, y + (tl ? r : 0));
  if (tl) ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function drawTerrain(
  ctx: CanvasRenderingContext2D,
  cell: Cell,
  x: number,
  y: number,
  size: number,
  wallCorners?: WallCorners,
): void {
  ctx.fillStyle = PALETTE.background;
  ctx.fillRect(x, y, size, size);

  switch (cell.terrain) {
    case TerrainType.Empty:
      break;
    case TerrainType.Wall:
      // Rounded surface — rocks/bombs roll off it, so where a wall run *ends* the corner is
      // actually drawn round (per the neighbor-derived mask), matching the mechanic.
      ctx.save();
      roundedCellPath(ctx, x, y, size, wallCorners ?? [false, false, false, false]);
      ctx.fillStyle = PALETTE.wall;
      ctx.fill();
      ctx.clip();
      ctx.fillStyle = PALETTE.wallShade;
      ctx.beginPath();
      ctx.arc(x + size * 0.72, y + size * 0.28, size * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + size * 0.28, y + size * 0.72, size * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    case TerrainType.WallSquare:
      // Flat, square-edged surface — nothing rolls off it, even a 1-wide pedestal holds. Sharp
      // right-angle crosshatch sells "square," contrasting with Wall's rounded blobs.
      ctx.fillStyle = PALETTE.wallSquare;
      ctx.fillRect(x, y, size, size);
      ctx.strokeStyle = PALETTE.wallSquareShade;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 3, y + 3, size - 6, size - 6);
      ctx.beginPath();
      ctx.moveTo(x + size / 2, y + 3);
      ctx.lineTo(x + size / 2, y + size - 3);
      ctx.moveTo(x + 3, y + size / 2);
      ctx.lineTo(x + size - 3, y + size / 2);
      ctx.stroke();
      break;
    case TerrainType.Hardware1:
      ctx.fillStyle = PALETTE.hardware1;
      ctx.fillRect(x, y, size, size);
      ctx.fillStyle = PALETTE.hardware1Shade;
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(x + 2, y + 2 + i * (size / 3), size - 4, size / 3 - 4);
      }
      break;
    case TerrainType.Hardware2:
      ctx.fillStyle = PALETTE.hardware2;
      ctx.fillRect(x, y, size, size);
      ctx.strokeStyle = PALETTE.hardware2Shade;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 4, y + 4, size - 8, size - 8);
      break;
    case TerrainType.Base:
      ctx.fillStyle = PALETTE.base;
      ctx.fillRect(x, y, size, size);
      ctx.fillStyle = PALETTE.baseDot;
      for (let i = 0; i < 4; i++) {
        const dx = ((i * 37) % 10) / 10;
        const dy = ((i * 53) % 10) / 10;
        ctx.fillRect(x + 4 + dx * (size - 12), y + 4 + dy * (size - 12), 3, 3);
      }
      break;
    case TerrainType.PortUp:
      drawArrow(ctx, x, y, size, Direction.Up, PALETTE.port);
      break;
    case TerrainType.PortDown:
      drawArrow(ctx, x, y, size, Direction.Down, PALETTE.port);
      break;
    case TerrainType.PortLeft:
      drawArrow(ctx, x, y, size, Direction.Left, PALETTE.port);
      break;
    case TerrainType.PortRight:
      drawArrow(ctx, x, y, size, Direction.Right, PALETTE.port);
      break;
    case TerrainType.GravityPortUp:
      drawArrow(ctx, x, y, size, Direction.Up, PALETTE.gravityPort);
      break;
    case TerrainType.GravityPortDown:
      drawArrow(ctx, x, y, size, Direction.Down, PALETTE.gravityPort);
      break;
    case TerrainType.ZonkGenerator: {
      ctx.fillStyle = PALETTE.generator;
      ctx.fillRect(x, y, size, size);
      const progress = cell.generator
        ? 1 - cell.generator.ticksUntilNextSpawn / cell.generator.intervalTicks
        : 0;
      ctx.fillStyle = PALETTE.generatorCore;
      ctx.fillRect(x + size * 0.25, y + size * (1 - progress) * 0.5 + size * 0.25, size * 0.5, size * 0.5 * progress);
      ctx.strokeStyle = PALETTE.generatorCore;
      ctx.strokeRect(x + 3, y + 3, size - 6, size - 6);
      break;
    }
    case TerrainType.Bug:
      ctx.fillStyle = PALETTE.bug;
      ctx.fillRect(x, y, size, size);
      ctx.fillStyle = PALETTE.bugCore;
      ctx.fillRect(x + size * 0.3, y + size * 0.3, size * 0.4, size * 0.4);
      break;
    case TerrainType.ExitClosed:
      ctx.fillStyle = PALETTE.exitClosed;
      ctx.fillRect(x, y, size, size);
      ctx.strokeStyle = PALETTE.exitClosedGlyph;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 5, y + 5, size - 10, size - 10);
      break;
    case TerrainType.ExitOpen:
      ctx.fillStyle = PALETTE.exitOpen;
      ctx.fillRect(x, y, size, size);
      ctx.strokeStyle = "#ffffff";
      ctx.strokeRect(x + 5, y + 5, size - 10, size - 10);
      break;
  }

  // A bomb planted under Murphy's feet — drawn as part of the cell so Murphy renders on top of it.
  if (cell.plantedBomb) {
    drawArmedDisk(ctx, x, y, size, cell.plantedBomb.fuseTicks);
  }
}

export function drawFx(ctx: CanvasRenderingContext2D, fx: FxState, x: number, y: number, size: number): void {
  const alpha = Math.max(0, Math.min(1, fx.ticksLeft / 4));
  ctx.save();
  ctx.globalAlpha = alpha;
  switch (fx.kind) {
    case "dig":
      ctx.fillStyle = PALETTE.digFx;
      ctx.fillRect(x + size * 0.3, y + size * 0.3, size * 0.4, size * 0.4);
      break;
    case "collect":
      ctx.strokeStyle = PALETTE.collectFx;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size * 0.5 * (1 - alpha) + size * 0.1, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case "explode":
      ctx.fillStyle = PALETTE.explosion;
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size * 0.55, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "spawn":
      ctx.strokeStyle = PALETTE.generatorCore;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 2, y + 2, size - 4, size - 4);
      break;
    case "death":
      ctx.fillStyle = "#ff0000";
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size * 0.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "portal":
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size * 0.5 * (1 - alpha) + size * 0.15, 0, Math.PI * 2);
      ctx.stroke();
      break;
  }
  ctx.restore();
}

export function drawOccupant(
  ctx: CanvasRenderingContext2D,
  occ: Occupant,
  x: number,
  y: number,
  size: number,
  rotation = 0,
): void {
  switch (occ.type) {
    case "murphy": {
      ctx.fillStyle = PALETTE.murphy;
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size * 0.38, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = PALETTE.murphyOutline;
      ctx.lineWidth = 2;
      ctx.stroke();
      drawArrow(ctx, x, y, size, occ.facing, PALETTE.murphyOutline);
      // Bomb-plant charge progress: a ring filling clockwise while Space is held.
      if (occ.bombCharge > 0) {
        const fraction = Math.min(1, occ.bombCharge / BOMB_PLANT_CHARGE_TICKS);
        ctx.strokeStyle = PALETTE.fuseSpark;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size * 0.46, -Math.PI / 2, -Math.PI / 2 + fraction * Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
    case "zonk": {
      const cx = x + size / 2;
      const cy = y + size / 2;
      const r = size * 0.4;
      ctx.fillStyle = PALETTE.zonkShade;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.zonk;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.85, 0, Math.PI * 2);
      ctx.fill();

      // Highlight + shadow speck spin with `rotation` so a rolling Zonk visibly reads as rolling,
      // not just sliding — the two specks are fixed on the ball's surface, not the screen.
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotation);
      ctx.fillStyle = PALETTE.zonkHighlight;
      ctx.beginPath();
      ctx.arc(r * 0.4, -r * 0.35, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.zonkShade;
      ctx.beginPath();
      ctx.arc(-r * 0.35, r * 0.2, r * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    }
    case "infotron": {
      const cx = x + size / 2;
      const cy = y + size / 2;
      const r = size * 0.42;

      // Classic pinwheel: alternating red/cyan pie slices, spun by `rotation` — makes a rolling
      // Infotron read as clearly as a rolling Zonk, per the same rotation mechanism.
      const slices = 8;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotation);
      for (let i = 0; i < slices; i++) {
        const a0 = (i / slices) * Math.PI * 2;
        const a1 = ((i + 1) / slices) * Math.PI * 2;
        ctx.fillStyle = i % 2 === 0 ? PALETTE.infotron : PALETTE.infotronAlt;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, r, a0, a1);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      ctx.fillStyle = PALETTE.infotronShine;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.arc(cx - r * 0.28, cy - r * 0.28, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      break;
    }
    case "orangeDisk": {
      ctx.fillStyle = PALETTE.orangeDiskShade;
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.orangeDisk;
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size * 0.32, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "bomb": {
      drawFloppyDisk(ctx, x, y, size, PALETTE.bomb);
      break;
    }
    case "timedBomb": {
      drawArmedDisk(ctx, x, y, size, occ.fuseTicks);
      break;
    }
    case "bombPickup": {
      // A dormant timed-bomb disk waiting to be picked up — the smaller inset size alone
      // distinguishes it from a planted one; no glow frame (no other object glows).
      const inset = size * 0.14;
      drawFloppyDisk(ctx, x + inset, y + inset, size - inset * 2, PALETTE.bombArmed);
      break;
    }
    case "snikSnak": {
      // Scissors oriented along their facing: pointed snipping blades at the FRONT (the deadly
      // direction), handle rings at the BACK — front and back must never read the same. The
      // blades scissor open/closed on the wall clock (cosmetic), the orientation is game state.
      const cx = x + size / 2;
      const cy = y + size / 2;
      const snip = 0.14 + 0.24 * (0.5 + 0.5 * Math.sin(performance.now() / 110));
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(directionAngle(occ.facing));
      const half = (angle: number, color: string): void => {
        ctx.save();
        ctx.rotate(angle);
        // Blade: slim dart from the pivot to a pointed tip out front.
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(-size * 0.06, -size * 0.07);
        ctx.lineTo(size * 0.46, 0);
        ctx.lineTo(-size * 0.06, size * 0.07);
        ctx.closePath();
        ctx.fill();
        // Handle ring trailing behind the pivot.
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(-size * 0.24, 0, size * 0.1, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      };
      half(snip, PALETTE.snikSnak);
      half(-snip, PALETTE.snikSnakBlade);
      // Pivot screw.
      ctx.fillStyle = PALETTE.snikSnakEye;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.06, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    }
    case "electron": {
      ctx.fillStyle = PALETTE.electron;
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.electronCore;
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size * 0.1, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
}

/**
 * Ports teleport rather than walk-through, so the occupant must never be seen sliding
 * across the intervening cell. Shrink out at the origin for the first half of the tick,
 * then grow back in at the destination for the second half.
 */
export function drawTeleportingOccupant(
  ctx: CanvasRenderingContext2D,
  occ: Occupant,
  alpha: number,
  offsetY: number,
  size: number,
): void {
  const arriving = alpha >= 0.5;
  const localT = arriving ? (alpha - 0.5) / 0.5 : alpha / 0.5;
  const scale = arriving ? localT : 1 - localT;
  if (scale <= 0.02) return;

  const pos = arriving ? occ.pos : occ.prevPos;
  const px = pos.x * size;
  const py = offsetY + pos.y * size;
  const cx = px + size / 2;
  const cy = py + size / 2;

  ctx.save();
  ctx.globalAlpha = scale;
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);
  drawOccupant(ctx, occ, px, py, size);
  ctx.restore();
}

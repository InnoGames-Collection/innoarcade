// Crossy Road — canvas rendering helpers (vehicles, player, VFX).

import {
  drawVoxelChicken,
  drawVoxelCoin,
  drawVoxelLog,
  drawVoxelVehicle,
} from './voxel';

import type { VehicleKind } from './voxel';

export type { VehicleKind } from './voxel';
export { draw3DBox } from './voxel';

export function drawDropShadow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  alpha = 0.22,
): void {
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawVehicle(
  ctx: CanvasRenderingContext2D,
  kind: VehicleKind,
  cx: number,
  cy: number,
  gridSpan: number,
  facingRight: boolean,
  unit: number,
): void {
  drawDropShadow(ctx, cx, cy + unit * 0.35, gridSpan * unit * 0.35, unit * 0.1, 0.2);
  drawVoxelVehicle(ctx, cx, cy, gridSpan, kind, facingRight, unit);
}

export function drawLog(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  gridSpan: number,
  unit: number,
): void {
  drawDropShadow(ctx, cx, cy + unit * 0.32, gridSpan * unit * 0.38, unit * 0.08, 0.18);
  drawVoxelLog(ctx, cx, cy, gridSpan, unit);
}

export function drawCoin(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spin: number,
  animT = 0,
  col = 0,
  size = 14,
): void {
  drawVoxelCoin(ctx, cx, cy, spin, animT, col, size);
}

export function hopEase(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Parabolic hop height — peaks at mid-air via sin(π·t). */
export function hopArcHeight(hopProgress: number, peak: number): number {
  if (hopProgress <= 0 || hopProgress >= 1) return 0;
  return Math.sin(hopProgress * Math.PI) * peak;
}

export function hopSquash(hopProgress: number): { sx: number; sy: number } {
  const p = hopProgress;
  let sx = 1;
  let sy = 1;
  if (p < 0.12) {
    const t = p / 0.12;
    sx = 1.16 - t * 0.16;
    sy = 0.84 + t * 0.16;
  } else if (p < 0.88) {
    const t = (p - 0.12) / 0.76;
    sx = 1 - 0.08 * Math.sin(t * Math.PI);
    sy = 1 + 0.14 * Math.sin(t * Math.PI);
  } else {
    const t = (p - 0.88) / 0.12;
    sx = 0.94 + t * 0.06;
    sy = 1.14 - t * 0.14;
  }
  return { sx, sy };
}

export function drawChicken(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  cell: number,
  hopProgress: number,
  isHopping: boolean,
): void {
  const squash = isHopping ? hopSquash(hopProgress) : { sx: 1, sy: 1 };
  const peak = cell * 0.5;
  const arcZ = isHopping ? hopArcHeight(hopProgress, peak) : 0;
  const unit = cell * 0.22;
  const shadowT = 1 - (arcZ / peak) * 0.4;
  drawDropShadow(
    ctx,
    cx,
    cy + unit * 0.9,
    unit * 1.1 * shadowT,
    unit * 0.35 * shadowT,
    0.24 * shadowT,
  );
  drawVoxelChicken(ctx, cx, cy, unit, arcZ, squash);
}

export function drawEagle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  wingPhase: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  const wing = Math.sin(wingPhase) * 0.35;
  ctx.fillStyle = '#2c3e50';
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ecf0f1';
  ctx.beginPath();
  ctx.ellipse(8, -4, 10, 8, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f39c12';
  ctx.beginPath();
  ctx.moveTo(16, -2);
  ctx.lineTo(24, 0);
  ctx.lineTo(16, 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(44,62,80,0.85)';
  ctx.beginPath();
  ctx.ellipse(-10, wing * 8, 18, 6 + Math.abs(wing) * 4, -0.5 + wing, 0, Math.PI * 2);
  ctx.ellipse(10, wing * 8, 18, 6 + Math.abs(wing) * 4, 0.5 - wing, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawGrassRow(
  ctx: CanvasRenderingContext2D,
  sy: number,
  w: number,
  cell: number,
  isStart: boolean,
): void {
  const top = isStart ? '#6ab04c' : '#7ec850';
  const g = ctx.createLinearGradient(0, sy, 0, sy + cell);
  g.addColorStop(0, top);
  g.addColorStop(1, isStart ? '#5a9a3e' : '#6eb844');
  ctx.fillStyle = g;
  ctx.fillRect(0, sy, w, cell + 1);
  if (!isStart) {
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (let i = 0; i < 5; i++) {
      const gx = ((i * 97 + sy) % w);
      ctx.fillRect(gx, sy + cell * 0.3, 3, cell * 0.35);
    }
  }
}

export function drawRoadRow(ctx: CanvasRenderingContext2D, sy: number, w: number, cell: number): void {
  const g = ctx.createLinearGradient(0, sy, 0, sy + cell);
  g.addColorStop(0, '#555');
  g.addColorStop(1, '#3d3d3d');
  ctx.fillStyle = g;
  ctx.fillRect(0, sy, w, cell + 1);
  ctx.fillStyle = '#f0c040';
  for (let x = 0; x < w; x += 40) ctx.fillRect(x, sy + cell / 2 - 2, 18, 4);
}

export function drawRiverRow(ctx: CanvasRenderingContext2D, sy: number, w: number, cell: number, t: number): void {
  const g = ctx.createLinearGradient(0, sy, 0, sy + cell);
  g.addColorStop(0, '#5dade2');
  g.addColorStop(1, '#2980b9');
  ctx.fillStyle = g;
  ctx.fillRect(0, sy, w, cell + 1);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  for (let x = -((t * 40) % 30); x < w; x += 30) {
    ctx.fillRect(x, sy + cell * 0.35, 14, 3);
  }
}

type IsoCorner = { x: number; y: number };

/** Vertical screen-space thickness of terrain voxels. */
export const SLAB_DEPTH = 14;

interface SlabPalette {
  topLight: string;
  topDark: string;
  eastFace: string;
  southFace: string;
}

const SLAB_PALETTES = {
  grass: {
    topLight: '#8ed85c',
    topDark: '#6eb844',
    eastFace: '#4a9a38',
    southFace: '#3d8230',
  },
  grassStart: {
    topLight: '#7ec850',
    topDark: '#5a9a3e',
    eastFace: '#428a32',
    southFace: '#357028',
  },
  road: {
    topLight: '#6a6a6a',
    topDark: '#434343',
    eastFace: '#2e2e2e',
    southFace: '#252525',
  },
  river: {
    topLight: '#6ec8f0',
    topDark: '#2980b9',
    eastFace: '#1f6f9f',
    southFace: '#185a82',
  },
} satisfies Record<string, SlabPalette>;

function dropCorner(corner: IsoCorner, depth: number): IsoCorner {
  return { x: corner.x, y: corner.y + depth };
}

function fillQuad(
  ctx: CanvasRenderingContext2D,
  a: IsoCorner,
  b: IsoCorner,
  c: IsoCorner,
  d: IsoCorner,
  fill: string | CanvasGradient,
): void {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.lineTo(c.x, c.y);
  ctx.lineTo(d.x, d.y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function traceDiamond(ctx: CanvasRenderingContext2D, corners: [IsoCorner, IsoCorner, IsoCorner, IsoCorner]): void {
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  ctx.lineTo(corners[1].x, corners[1].y);
  ctx.lineTo(corners[2].x, corners[2].y);
  ctx.lineTo(corners[3].x, corners[3].y);
  ctx.closePath();
}

function fillTopFace(
  ctx: CanvasRenderingContext2D,
  corners: [IsoCorner, IsoCorner, IsoCorner, IsoCorner],
  palette: SlabPalette,
): void {
  const cx = (corners[0].x + corners[2].x) / 2;
  const g = ctx.createLinearGradient(cx, corners[0].y, cx, corners[2].y);
  g.addColorStop(0, palette.topLight);
  g.addColorStop(1, palette.topDark);
  traceDiamond(ctx, corners);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.lineWidth = 0.75;
  ctx.stroke();
}

function drawSlabSides(
  ctx: CanvasRenderingContext2D,
  corners: [IsoCorner, IsoCorner, IsoCorner, IsoCorner],
  palette: SlabPalette,
  depth: number,
): void {
  const [, ne, se, sw] = corners;
  const neB = dropCorner(ne, depth);
  const seB = dropCorner(se, depth);
  const swB = dropCorner(sw, depth);

  // East face — right edge of the diamond (ne → se).
  fillQuad(ctx, ne, se, seB, neB, palette.eastFace);
  // South face — front edge of the diamond (se → sw).
  fillQuad(ctx, se, sw, swB, seB, palette.southFace);
}

function paletteForKind(kind: 'grass' | 'road' | 'river', isStart?: boolean): SlabPalette {
  if (kind === 'grass' && isStart) return SLAB_PALETTES.grassStart;
  return SLAB_PALETTES[kind];
}

function drawRoadMarking(
  ctx: CanvasRenderingContext2D,
  corners: [IsoCorner, IsoCorner, IsoCorner, IsoCorner],
): void {
  const mid = {
    x: (corners[1].x + corners[3].x) / 2,
    y: (corners[1].y + corners[3].y) / 2,
  };
  const tip = {
    x: (corners[0].x + corners[2].x) / 2,
    y: (corners[0].y + corners[2].y) / 2,
  };
  ctx.strokeStyle = 'rgba(240,192,64,0.55)';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(mid.x, mid.y);
  ctx.lineTo(tip.x, tip.y);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawRiverShimmer(
  ctx: CanvasRenderingContext2D,
  corners: [IsoCorner, IsoCorner, IsoCorner, IsoCorner],
  t: number,
  col: number,
): void {
  const cy = (corners[0].y + corners[2].y) / 2;
  const cx = corners[1].x + ((t * 36 + col * 19) % 40) - 20;
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, 10, 3, -0.4, 0, Math.PI * 2);
  ctx.fill();
}

/** Side faces only — queue at base paint depth. */
export function drawIsoTerrainSlabSides(
  ctx: CanvasRenderingContext2D,
  corners: [IsoCorner, IsoCorner, IsoCorner, IsoCorner],
  kind: 'grass' | 'road' | 'river',
  opts: { isStart?: boolean; depth?: number } = {},
): void {
  const depth = opts.depth ?? SLAB_DEPTH;
  drawSlabSides(ctx, corners, paletteForKind(kind, opts.isStart), depth);
}

/** Top face only — queue slightly above sides for correct overlap. */
export function drawIsoTerrainSlabTop(
  ctx: CanvasRenderingContext2D,
  corners: [IsoCorner, IsoCorner, IsoCorner, IsoCorner],
  kind: 'grass' | 'road' | 'river',
  opts: { isStart?: boolean; animT?: number; col?: number } = {},
): void {
  const palette = paletteForKind(kind, opts.isStart);
  fillTopFace(ctx, corners, palette);
  if (kind === 'road') drawRoadMarking(ctx, corners);
  if (kind === 'river' && opts.animT !== undefined && opts.col !== undefined) {
    drawRiverShimmer(ctx, corners, opts.animT, opts.col);
  }
}

/** Draw a full 3D terrain voxel in one call (sides then top). */
export function drawIsoTerrainSlab(
  ctx: CanvasRenderingContext2D,
  corners: [IsoCorner, IsoCorner, IsoCorner, IsoCorner],
  kind: 'grass' | 'road' | 'river',
  opts: { isStart?: boolean; animT?: number; col?: number; depth?: number } = {},
): void {
  drawIsoTerrainSlabSides(ctx, corners, kind, opts);
  drawIsoTerrainSlabTop(ctx, corners, kind, opts);
}

export function fillIsoCell(
  ctx: CanvasRenderingContext2D,
  corners: [IsoCorner, IsoCorner, IsoCorner, IsoCorner],
  fill: string | CanvasGradient,
): void {
  traceDiamond(ctx, corners);
  ctx.fillStyle = fill;
  ctx.fill();
}

export function strokeIsoCell(
  ctx: CanvasRenderingContext2D,
  corners: [IsoCorner, IsoCorner, IsoCorner, IsoCorner],
  stroke: string,
  lineWidth = 1,
): void {
  traceDiamond(ctx, corners);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

/** @deprecated Use drawIsoTerrainSlab — kept for reference during voxel migration. */
export function drawIsoGrassCell(
  ctx: CanvasRenderingContext2D,
  corners: [IsoCorner, IsoCorner, IsoCorner, IsoCorner],
  isStart: boolean,
): void {
  drawIsoTerrainSlab(ctx, corners, 'grass', { isStart });
}

export function drawIsoRoadCell(
  ctx: CanvasRenderingContext2D,
  corners: [IsoCorner, IsoCorner, IsoCorner, IsoCorner],
): void {
  drawIsoTerrainSlab(ctx, corners, 'road');
}

export function drawIsoRiverCell(
  ctx: CanvasRenderingContext2D,
  corners: [IsoCorner, IsoCorner, IsoCorner, IsoCorner],
  t: number,
  col: number,
): void {
  drawIsoTerrainSlab(ctx, corners, 'river', { animT: t, col });
}

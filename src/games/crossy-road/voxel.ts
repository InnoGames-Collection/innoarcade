// Pseudo-3D voxel primitives for Crossy Road — pure 2D canvas isometric boxes.

import { COS30, SIN30 } from './iso';

export type VehicleKind = 'minibus' | 'bus' | 'telecomVan';

interface Point {
  x: number;
  y: number;
}

function fillQuad(
  ctx: CanvasRenderingContext2D,
  a: Point,
  b: Point,
  c: Point,
  d: Point,
  fill: string,
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

export function shadeColor(hex: string, factor: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const clamp = (c: number) => Math.max(0, Math.min(255, Math.round(c * factor)));
  return `rgb(${clamp(r)},${clamp(g)},${clamp(b)})`;
}

function isoOffset(dgx: number, dgy: number, scale: number): Point {
  return {
    x: (dgx - dgy) * COS30 * scale,
    y: (dgx + dgy) * SIN30 * scale,
  };
}

/**
 * Draw an isometric 3D box at a screen base anchor.
 * @param x Screen X of footprint center
 * @param y Screen Y of footprint base (slab top)
 * @param z Vertical lift above base (screen pixels up)
 * @param width Footprint extent along grid-X (voxel units)
 * @param length Footprint extent along grid-Y / row axis (voxel units)
 * @param height Box vertical extrusion (screen pixels)
 * @param color Top-face color; sides are auto-shaded darker
 * @param unitScale Pixels per one voxel unit
 */
export function draw3DBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  z: number,
  width: number,
  length: number,
  height: number,
  color: string,
  unitScale = 1,
): void {
  const hw = width / 2;
  const hl = length / 2;
  const baseY = y - z;

  const pt = (dgx: number, dgy: number, lift: number): Point => {
    const o = isoOffset(dgx, dgy, unitScale);
    return { x: x + o.x, y: baseY + o.y - lift };
  };

  const nw = pt(-hw, -hl, height);
  const ne = pt(hw, -hl, height);
  const se = pt(hw, hl, height);
  const sw = pt(-hw, hl, height);

  const neB = pt(hw, -hl, 0);
  const seB = pt(hw, hl, 0);
  const swB = pt(-hw, hl, 0);

  const east = shadeColor(color, 0.72);
  const south = shadeColor(color, 0.52);

  fillQuad(ctx, neB, seB, se, ne, east);
  fillQuad(ctx, seB, swB, sw, se, south);
  fillQuad(ctx, nw, ne, se, sw, color);

  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(nw.x, nw.y);
  ctx.lineTo(ne.x, ne.y);
  ctx.lineTo(se.x, se.y);
  ctx.lineTo(sw.x, sw.y);
  ctx.closePath();
  ctx.stroke();
}

const VEHICLE_BODY: Record<VehicleKind, { main: string; accent: string; trim: string }> = {
  minibus: { main: '#1f74e0', accent: '#f4f8ff', trim: '#0d4a9e' },
  bus: { main: '#f39c12', accent: '#fff8e8', trim: '#b86a08' },
  telecomVan: { main: '#ffffff', accent: '#e67e22', trim: '#d35400' },
};

export function drawVoxelChicken(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  unit: number,
  hopLift: number,
  squash: { sx: number; sy: number },
): void {
  const footY = cy + unit * 0.22;
  const z = hopLift;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(squash.sx, squash.sy);
  ctx.translate(-cx, -cy);

  draw3DBox(ctx, cx, footY, z + 1, 0.52, 0.48, unit * 0.58, '#f8f8f8', unit);
  draw3DBox(ctx, cx - unit * 0.04, footY - unit * 0.06, z + unit * 0.58, 0.2, 0.16, unit * 0.22, '#e74c3c', unit);
  draw3DBox(ctx, cx + unit * 0.24, footY - unit * 0.02, z + unit * 0.18, 0.14, 0.1, unit * 0.12, '#f2c40a', unit);
  draw3DBox(ctx, cx + unit * 0.14, footY - unit * 0.1, z + unit * 0.38, 0.09, 0.07, unit * 0.08, '#2c2c2c', unit);
  draw3DBox(ctx, cx - unit * 0.18, footY + unit * 0.02, z + unit * 0.08, 0.1, 0.08, unit * 0.1, '#f2c40a', unit);

  ctx.restore();
}

export function drawVoxelVehicle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  gridSpan: number,
  kind: VehicleKind,
  facingRight: boolean,
  unit: number,
): void {
  const span = Math.max(0.85, Math.abs(gridSpan));
  const footY = cy + unit * 0.18;
  const pal = VEHICLE_BODY[kind];
  const bodyH = kind === 'bus' ? unit * 0.52 : unit * 0.44;

  ctx.save();
  if (!facingRight) {
    ctx.translate(cx, cy);
    ctx.scale(-1, 1);
    ctx.translate(-cx, -cy);
  }

  draw3DBox(ctx, cx, footY, 2, span * 0.96, 0.54, bodyH, pal.main, unit);

  if (kind === 'telecomVan') {
    draw3DBox(ctx, cx, footY - unit * 0.02, unit * 0.48, span * 0.82, 0.5, unit * 0.14, pal.accent, unit);
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.max(6, unit * 0.14)}px system-ui,sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ethio telecom', cx + span * unit * 0.08, footY - unit * 0.38);
  } else {
    const winCount = kind === 'bus' ? 4 : 2;
    for (let i = 0; i < winCount; i++) {
      const wx = cx + (i - (winCount - 1) / 2) * span * unit * 0.22;
      draw3DBox(ctx, wx, footY - unit * 0.04, bodyH + 3, 0.18, 0.14, unit * 0.1, pal.accent, unit);
    }
    draw3DBox(ctx, cx - span * unit * 0.38, footY, bodyH * 0.35, 0.14, 0.12, unit * 0.1, '#ffd54f', unit);
  }

  draw3DBox(ctx, cx, footY - unit * 0.02, bodyH + 1, span * 0.98, 0.08, unit * 0.06, pal.trim, unit);

  const wheelN = kind === 'bus' ? 4 : 2;
  const wheelSlots = wheelN === 4
    ? [-0.32, -0.1, 0.1, 0.32]
    : [-0.22, 0.22];
  for (const slot of wheelSlots) {
    draw3DBox(
      ctx,
      cx + slot * span * unit,
      footY + unit * 0.08,
      0,
      0.14,
      0.12,
      unit * 0.14,
      '#1a1a1a',
      unit,
    );
  }

  ctx.restore();
}

export function drawVoxelLog(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  gridSpan: number,
  unit: number,
): void {
  const span = Math.max(0.7, Math.abs(gridSpan));
  const footY = cy + unit * 0.16;
  draw3DBox(ctx, cx, footY, 1, span * 0.95, 0.44, unit * 0.3, '#a0622a', unit);
  draw3DBox(ctx, cx - span * unit * 0.38, footY, unit * 0.22, 0.1, 0.38, unit * 0.08, '#5c3418', unit);
  draw3DBox(ctx, cx + span * unit * 0.38, footY, unit * 0.22, 0.1, 0.38, unit * 0.08, '#5c3418', unit);
}

export function drawVoxelCoin(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spin: number,
  _animT: number,
  col: number,
  unit: number,
): void {
  const bob = Math.sin(Date.now() * 0.005 + col * 0.9) * 5;
  const z = 8 + bob;
  const footY = cy + unit * 0.1;
  const spinW = 0.26 + Math.abs(Math.cos(spin)) * 0.12;

  draw3DBox(ctx, cx, footY, z, spinW, spinW * 0.85, unit * 0.26, '#f2b21a', unit);
  draw3DBox(ctx, cx, footY, z + unit * 0.24, spinW * 0.55, spinW * 0.45, unit * 0.06, '#fff4a8', unit);

  ctx.save();
  ctx.translate(cx, footY - z - unit * 0.2);
  ctx.fillStyle = shadeColor('#f2b21a', 0.85);
  ctx.font = `bold ${unit * 0.22}px system-ui,sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ብ', 0, 0);
  ctx.restore();
}

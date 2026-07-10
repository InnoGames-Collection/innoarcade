// Premium voxel entities — classic lane layout (horizontal roads, vertical hops).

import { CELL } from '../types';
import type { VehicleKind } from '../types';

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
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * factor)));
  return `rgb(${c(r)},${c(g)},${c(b)})`;
}

/** 3/4 cabinet box: width along X, height up, shallow depth down (+Y). */
function drawClassicBox(
  ctx: CanvasRenderingContext2D,
  cx: number,
  bottomY: number,
  widthPx: number,
  heightPx: number,
  depthPx: number,
  color: string,
  liftPx = 0,
): void {
  const hw = widthPx / 2;
  const baseY = bottomY - liftPx;
  const topY = baseY - heightPx;
  const lip = depthPx * 0.55;

  fillQuad(
    ctx,
    { x: cx - hw, y: topY },
    { x: cx + hw, y: topY },
    { x: cx + hw, y: topY + lip },
    { x: cx - hw, y: topY + lip },
    color,
  );
  fillQuad(
    ctx,
    { x: cx - hw, y: topY + lip },
    { x: cx + hw, y: topY + lip },
    { x: cx + hw, y: baseY + depthPx },
    { x: cx - hw, y: baseY + depthPx },
    shadeColor(color, 0.78),
  );
  fillQuad(
    ctx,
    { x: cx + hw, y: topY },
    { x: cx + hw, y: baseY },
    { x: cx + hw, y: baseY + depthPx },
    { x: cx + hw, y: topY + lip },
    shadeColor(color, 0.58),
  );
}

const VEHICLE_PAL: Record<VehicleKind, { body: string; accent: string; trim: string }> = {
  sedan: { body: '#3498db', accent: '#dff4ff', trim: '#1f5f8b' },
  suv: { body: '#5d6d7e', accent: '#ecf0f1', trim: '#2c3e50' },
  taxi: { body: '#f1c40f', accent: '#fff8dc', trim: '#b7950b' },
  bus: { body: '#e67e22', accent: '#fff4e6', trim: '#a04000' },
  police: { body: '#ecf0f1', accent: '#3498db', trim: '#2c3e50' },
  van: { body: '#ffffff', accent: '#e67e22', trim: '#d35400' },
  minibus: { body: '#1f74e0', accent: '#f4f8ff', trim: '#0d4a9e' },
};

export function drawVoxelChicken(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  unit: number,
  arcZ: number,
  squash: { sx: number; sy: number },
  animT: number,
): void {
  const footY = cy + unit * 0.12;
  const breathe = 1 + Math.sin(animT * 2.4) * 0.03;
  const blink = Math.sin(animT * 0.9) > 0.92;
  const u = unit;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(squash.sx * breathe, squash.sy * breathe);
  ctx.translate(-cx, -cy);

  drawClassicBox(ctx, cx, footY, u * 0.58, u * 0.52, u * 0.14, '#f8f8f8', arcZ);
  drawClassicBox(ctx, cx - u * 0.02, footY, u * 0.22, u * 0.14, u * 0.08, '#e74c3c', arcZ + u * 0.48);
  drawClassicBox(ctx, cx + u * 0.2, footY, u * 0.16, u * 0.1, u * 0.07, '#f2c40a', arcZ + u * 0.12);
  if (!blink) {
    drawClassicBox(ctx, cx + u * 0.12, footY, u * 0.1, u * 0.08, u * 0.05, '#2c2c2c', arcZ + u * 0.32);
  }
  drawClassicBox(ctx, cx - u * 0.16, footY, u * 0.12, u * 0.08, u * 0.06, '#f2c40a', arcZ + u * 0.06);

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
  animT: number,
  simple = false,
): void {
  const span = Math.max(0.85, Math.abs(gridSpan));
  const bounce = Math.sin(animT * 10 + cx * 0.05) * 1.2;
  const footY = cy + unit * 0.1 + bounce;
  const pal = VEHICLE_PAL[kind];
  const bodyW = span * CELL * 0.92;
  const bodyH = kind === 'bus' ? unit * 0.48 : unit * 0.38;
  const bodyD = unit * 0.16;

  ctx.save();
  if (!facingRight) {
    ctx.translate(cx, cy);
    ctx.scale(-1, 1);
    ctx.translate(-cx, -cy);
  }

  drawClassicBox(ctx, cx, footY, bodyW, bodyH, bodyD, pal.body);

  if (!simple) {
    if (kind === 'van') {
      drawClassicBox(ctx, cx, footY, bodyW * 0.82, unit * 0.12, unit * 0.08, pal.accent, bodyH * 0.7);
      drawClassicBox(ctx, cx - bodyW * 0.18, footY, bodyW * 0.2, unit * 0.06, unit * 0.04, '#1f74e0', bodyH * 0.85);
      drawClassicBox(ctx, cx + bodyW * 0.18, footY, bodyW * 0.12, unit * 0.06, unit * 0.04, '#27ae60', bodyH * 0.85);
    } else if (kind === 'taxi') {
      drawClassicBox(ctx, cx, footY, bodyW * 0.45, unit * 0.08, unit * 0.05, '#2c2c2c', bodyH * 0.9);
    } else if (kind === 'police') {
      drawClassicBox(ctx, cx, footY, bodyW * 0.32, unit * 0.08, unit * 0.05, '#3498db', bodyH * 0.95);
      drawClassicBox(ctx, cx + bodyW * 0.12, footY, bodyW * 0.1, unit * 0.06, unit * 0.04, '#e74c3c', bodyH * 0.95);
    } else {
      const winCount = kind === 'bus' ? 4 : 2;
      for (let i = 0; i < winCount; i++) {
        const wx = cx + (i - (winCount - 1) / 2) * bodyW * 0.22;
        drawClassicBox(ctx, wx, footY, unit * 0.14, unit * 0.1, unit * 0.06, pal.accent, bodyH * 0.75);
      }
    }
    drawClassicBox(ctx, cx, footY, bodyW * 0.98, unit * 0.06, unit * 0.04, pal.trim, bodyH * 0.82);
  }

  const wheelN = simple ? 2 : (kind === 'bus' ? 4 : 2);
  const slots = wheelN === 4 ? [-0.32, -0.1, 0.1, 0.32] : [-0.24, 0.24];
  const wheelRot = animT * 8;
  for (const slot of slots) {
    const wx = cx + slot * bodyW;
    const wy = footY + unit * 0.06;
    drawClassicBox(ctx, wx, wy, unit * 0.14, unit * 0.14, unit * 0.08, '#1a1a1a');
    if (!simple) {
      ctx.fillStyle = '#666';
      ctx.beginPath();
      ctx.ellipse(wx + Math.cos(wheelRot) * 1.5, wy + unit * 0.04, 2.5, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

export function drawVoxelLog(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  gridSpan: number,
  unit: number,
  animT: number,
  gridCx: number,
): void {
  const span = Math.max(0.7, Math.abs(gridSpan));
  const bob = Math.sin(animT * 2.2 + gridCx * 0.8) * 2;
  const footY = cy + unit * 0.08 + bob;
  const logW = span * CELL * 0.9;
  const logH = unit * 0.28;

  drawClassicBox(ctx, cx, footY, logW, logH, unit * 0.12, '#a0622a');
  drawClassicBox(ctx, cx - logW * 0.42, footY, unit * 0.12, logH * 0.85, unit * 0.1, '#5c3418', logH * 0.1);
  drawClassicBox(ctx, cx + logW * 0.42, footY, unit * 0.12, logH * 0.85, unit * 0.1, '#5c3418', logH * 0.1);

  ctx.strokeStyle = 'rgba(60,40,20,0.3)';
  ctx.lineWidth = 1;
  for (let i = -2; i <= 2; i++) {
    const lx = cx + i * logW * 0.14;
    ctx.beginPath();
    ctx.moveTo(lx, footY - logH * 0.35);
    ctx.lineTo(lx, footY + unit * 0.08);
    ctx.stroke();
  }
}

export function drawVoxelCoin(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  unit: number,
  animT: number,
  col: number,
): void {
  const bob = Math.sin(animT * 4 + col * 1.3) * 5;
  const spin = animT * 3 + col;
  const y = cy + bob;
  const rx = unit * 0.2 * (0.55 + Math.abs(Math.cos(spin)) * 0.45);
  const ry = unit * 0.22;

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.ellipse(cx, y + unit * 0.18, rx, unit * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();

  const g = ctx.createLinearGradient(cx, y - ry, cx, y + ry);
  g.addColorStop(0, '#ffe566');
  g.addColorStop(0.5, '#f1c40f');
  g.addColorStop(1, '#d4a017');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(cx, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#b8860b';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#fff8dc';
  ctx.font = `bold ${Math.max(9, unit * 0.22)}px system-ui,sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('★', cx, y);
  ctx.restore();
}

/** Small classic box for tree trunks in decorations. */
export function drawDecorBox(
  ctx: CanvasRenderingContext2D,
  cx: number,
  bottomY: number,
  w: number,
  h: number,
  d: number,
  color: string,
  lift = 0,
): void {
  drawClassicBox(ctx, cx, bottomY, w, h, d, color, lift);
}

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

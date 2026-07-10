// Grass decorations — trees, flowers, rocks.

import { gridToScreen, type IsoCamera, type ScreenOrigin } from '../iso';
import { draw3DBox } from './voxel';
import { cellRand } from './cellHash';

const UNIT = 13;

export function drawGrassDecor(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
  camera: IsoCamera,
  origin: ScreenOrigin,
  bob: number,
  animT: number,
  isStart: boolean,
): void {
  if (isStart) return;
  const r = cellRand(col, row);

  if (r < 0.12) drawFlower(ctx, col, row, camera, origin, bob, r);
  else if (r < 0.18) drawRock(ctx, col, row, camera, origin, bob, r);
  else if (r > 0.88 && (col === 0 || col === 7)) {
    drawTree(ctx, col, row, camera, origin, bob, animT);
  }
}

function decorCenter(
  col: number,
  row: number,
  camera: IsoCamera,
  origin: ScreenOrigin,
  bob: number,
  jx: number,
  jy: number,
): { x: number; y: number } {
  const c = gridToScreen(col + 0.5 + jx, row + 0.5 + jy, camera, origin, bob);
  return c;
}

function drawFlower(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
  camera: IsoCamera,
  origin: ScreenOrigin,
  bob: number,
  r: number,
): void {
  const { x, y } = decorCenter(col, row, camera, origin, bob, (r - 0.5) * 0.3, (r - 0.3) * 0.2);
  const sway = Math.sin(r * 20) * 1.5;
  const colors = ['#ff6b9d', '#f9ca24', '#e17055', '#a29bfe'];
  const color = colors[Math.floor(r * colors.length) % colors.length];
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x + sway, y, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2ecc71';
  ctx.fillRect(x + sway - 0.5, y, 1, 4);
}

function drawRock(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
  camera: IsoCamera,
  origin: ScreenOrigin,
  bob: number,
  r: number,
): void {
  const { x, y } = decorCenter(col, row, camera, origin, bob, (r - 0.5) * 0.35, (r - 0.4) * 0.25);
  ctx.fillStyle = '#8a8a8a';
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 4 + r * 2, 3, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawTree(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
  camera: IsoCamera,
  origin: ScreenOrigin,
  bob: number,
  animT: number,
): void {
  const { x, y } = decorCenter(col, row, camera, origin, bob, col === 0 ? -0.25 : 0.25, 0);
  const sway = Math.sin(animT * 1.5 + col) * 2;
  draw3DBox(ctx, x + sway, y + 8, 4, 0.14, 0.12, UNIT * 0.55, '#5d4037', UNIT);
  draw3DBox(ctx, x + sway, y - 2, UNIT * 0.5, 0.42, 0.38, UNIT * 0.35, '#2ecc71', UNIT);
  draw3DBox(ctx, x + sway, y - UNIT * 0.35, UNIT * 0.65, 0.48, 0.42, UNIT * 0.28, '#27ae60', UNIT);
}

// Grass decorations — trees, flowers, rocks (classic horizontal layout).

import { classicGridToScreen } from '../classic';
import { drawDecorBox } from './voxel';
import { cellRand } from './cellHash';

const UNIT = 13;

export function drawGrassDecor(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
  camZ: number,
  camBob: number,
  animT: number,
  isStart: boolean,
): void {
  if (isStart) return;
  const r = cellRand(col, row);

  if (r < 0.12) drawFlower(ctx, col, row, camZ, camBob, r);
  else if (r < 0.18) drawRock(ctx, col, row, camZ, camBob, r);
  else if (r > 0.88 && (col === 0 || col === 7)) {
    drawTree(ctx, col, row, camZ, camBob, animT);
  }
}

function decorCenter(
  col: number,
  row: number,
  camZ: number,
  camBob: number,
  jx: number,
): { x: number; y: number } {
  return classicGridToScreen(col + 0.5 + jx, row + 0.5, camZ, camBob);
}

function drawFlower(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
  camZ: number,
  camBob: number,
  r: number,
): void {
  const { x, y } = decorCenter(col, row, camZ, camBob, (r - 0.5) * 0.3);
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
  camZ: number,
  camBob: number,
  r: number,
): void {
  const { x, y } = decorCenter(col, row, camZ, camBob, (r - 0.5) * 0.35);
  ctx.fillStyle = '#8a8a8a';
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 4 + r * 2, 3, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawTree(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
  camZ: number,
  camBob: number,
  animT: number,
): void {
  const { x, y } = decorCenter(col, row, camZ, camBob, col === 0 ? -0.2 : 0.2);
  const sway = Math.sin(animT * 1.5 + col) * 2;
  drawDecorBox(ctx, x + sway, y + 10, UNIT * 0.16, UNIT * 0.55, UNIT * 0.1, '#5d4037');
  drawDecorBox(ctx, x + sway, y - 4, UNIT * 0.5, UNIT * 0.35, UNIT * 0.14, '#2ecc71', UNIT * 0.5);
  drawDecorBox(ctx, x + sway, y - UNIT * 0.45, UNIT * 0.62, UNIT * 0.28, UNIT * 0.12, '#27ae60', UNIT * 0.72);
}

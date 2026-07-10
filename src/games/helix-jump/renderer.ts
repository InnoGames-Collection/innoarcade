import { CX, H, THEME, W } from './constants';
import type { GameState } from './types';

export function drawHud(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  combo: number,
  feverLeft: number,
  multiplier: number,
): void {
  ctx.clearRect(0, 0, W, H);
  if (state !== 'playing') return;

  ctx.textAlign = 'center';
  ctx.font = '600 13px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(40,40,60,0.55)';
  ctx.fillText('Drag to rotate', CX, H - 18);

  if (combo > 1) {
    const fever = feverLeft > 0;
    ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
    const grad = ctx.createLinearGradient(CX - 60, 0, CX + 60, 0);
    if (fever) {
      grad.addColorStop(0, '#ff9f1c');
      grad.addColorStop(0.5, THEME.fever);
      grad.addColorStop(1, '#ff6b6b');
    } else {
      grad.addColorStop(0, THEME.accent);
      grad.addColorStop(1, '#00d4ff');
    }
    ctx.fillStyle = grad;
    const label = fever ? `FEVER ×${multiplier}` : `COMBO ×${combo}`;
    ctx.shadowColor = fever ? 'rgba(255,217,61,0.6)' : 'rgba(0,212,170,0.4)';
    ctx.shadowBlur = 12;
    ctx.fillText(label, CX, 48);
    ctx.shadowBlur = 0;
  }
}

export function drawFlash(
  ctx: CanvasRenderingContext2D,
  color: string,
  alpha: number,
): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

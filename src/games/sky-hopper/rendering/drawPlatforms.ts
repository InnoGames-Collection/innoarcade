// Glossy premium platforms — rounded, textured, soft shadows, 3D depth.

const PLATFORM_H = 12;

interface PlatformData {
  x: number;
  y: number;
  w: number;
  moving: boolean;
}

export function drawPlatforms(
  ctx: CanvasRenderingContext2D,
  platforms: PlatformData[],
  offsetY: number,
  canvasH: number,
  squashMap: Map<string, number>,
  time: number,
): void {
  for (const p of platforms) {
    const y = p.y - offsetY;
    if (y < -50 || y > canvasH + 50) continue;

    const key = `${p.x.toFixed(0)}_${p.y.toFixed(0)}`;
    const squash = squashMap.get(key) ?? 0;
    const squashAmt = squash * 0.15;

    ctx.save();
    ctx.translate(p.x + p.w / 2, y + PLATFORM_H / 2);
    ctx.scale(1, 1 - squashAmt);
    ctx.translate(-(p.x + p.w / 2), -(y + PLATFORM_H / 2));

    const r = 6;
    const px = p.x;
    const py = y;
    const pw = p.w;
    const ph = PLATFORM_H;

    // Drop shadow
    ctx.fillStyle = 'rgba(15,40,60,0.22)';
    ctx.beginPath();
    ctx.roundRect(px + 2, py + 4, pw, ph, r);
    ctx.fill();

    if (p.moving) {
      drawMovingPlatform(ctx, px, py, pw, ph, r, time);
    } else {
      drawStaticPlatform(ctx, px, py, pw, ph, r);
    }

    ctx.restore();
  }
}

function drawStaticPlatform(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
  const body = ctx.createLinearGradient(x, y, x, y + h);
  body.addColorStop(0, '#5cc870');
  body.addColorStop(0.35, '#3fa34d');
  body.addColorStop(0.7, '#2d8a42');
  body.addColorStop(1, '#1e6b32');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();

  // Side depth
  ctx.fillStyle = '#1a5c2a';
  ctx.beginPath();
  ctx.roundRect(x, y + h * 0.55, w, h * 0.45, [0, 0, r, r]);
  ctx.fill();

  // Gloss highlight
  const gloss = ctx.createLinearGradient(x, y, x, y + h * 0.5);
  gloss.addColorStop(0, 'rgba(255,255,255,0.45)');
  gloss.addColorStop(0.5, 'rgba(255,255,255,0.12)');
  gloss.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gloss;
  ctx.beginPath();
  ctx.roundRect(x + 2, y + 1, w - 4, h * 0.45, [r - 1, r - 1, 2, 2]);
  ctx.fill();

  // Grass texture dots
  ctx.fillStyle = 'rgba(30,100,40,0.15)';
  for (let i = 0; i < 4; i++) {
    const dx = x + 8 + (i * 13) % (w - 16);
    ctx.beginPath();
    ctx.arc(dx, y + 4 + (i % 2), 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Soft edge glow
  ctx.strokeStyle = 'rgba(80,200,100,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x + 0.5, y + 0.5, w - 1, h - 1, r);
  ctx.stroke();
}

function drawMovingPlatform(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
  time: number,
): void {
  const pulse = 0.5 + Math.sin(time * 4) * 0.5;

  const body = ctx.createLinearGradient(x, y, x, y + h);
  body.addColorStop(0, '#ffd080');
  body.addColorStop(0.35, '#ffb347');
  body.addColorStop(0.7, '#e89a30');
  body.addColorStop(1, '#c47a20');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();

  ctx.fillStyle = '#a86818';
  ctx.beginPath();
  ctx.roundRect(x, y + h * 0.55, w, h * 0.45, [0, 0, r, r]);
  ctx.fill();

  const gloss = ctx.createLinearGradient(x, y, x, y + h * 0.5);
  gloss.addColorStop(0, 'rgba(255,255,255,0.5)');
  gloss.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gloss;
  ctx.beginPath();
  ctx.roundRect(x + 2, y + 1, w - 4, h * 0.4, [r - 1, r - 1, 2, 2]);
  ctx.fill();

  // Animated glow ring
  ctx.strokeStyle = `rgba(255, 200, 80, ${0.35 + pulse * 0.25})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x - 2, y - 2, w + 4, h + 4, r + 2);
  ctx.stroke();

  // Arrow indicators
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.moveTo(x + 6, y + h / 2);
  ctx.lineTo(x + 10, y + h / 2 - 3);
  ctx.lineTo(x + 10, y + h / 2 + 3);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + w - 6, y + h / 2);
  ctx.lineTo(x + w - 10, y + h / 2 - 3);
  ctx.lineTo(x + w - 10, y + h / 2 + 3);
  ctx.closePath();
  ctx.fill();
}

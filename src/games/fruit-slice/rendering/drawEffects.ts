// Swipe trail, combo bursts, screen effects — visual polish only.

import { RW as W, RH as H } from './types';

export function drawSliceTrail(
  ctx: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number }>,
  age: number,
  maxAge: number,
): void {
  if (points.length < 2) return;
  const a = Math.max(0, 1 - age / maxAge);
  const fade = a * a;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Soft motion-blur underglow
  ctx.strokeStyle = `rgba(56,189,248,${fade * 0.22})`;
  ctx.lineWidth = 14;
  ctx.shadowColor = 'rgba(56,189,248,0.3)';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Mid glow
  ctx.strokeStyle = `rgba(180,230,255,${fade * 0.5})`;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();

  // Core blade — crisp white
  ctx.strokeStyle = `rgba(255,255,255,${fade * 0.98})`;
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();

  // Edge highlight
  ctx.strokeStyle = `rgba(220,245,255,${fade * 0.6})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();

  // Sparks and sparkles along path
  for (let i = 1; i < points.length; i += 2) {
    const p = points[i];
    ctx.fillStyle = `rgba(255,255,255,${fade * 0.85})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
    ctx.fill();
    if (i % 4 === 0) {
      ctx.fillStyle = `rgba(200,240,255,${fade * 0.5})`;
      ctx.beginPath();
      ctx.arc(p.x + 2, p.y - 2, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function drawComboEffect(
  ctx: CanvasRenderingContext2D,
  combo: number,
  flashT: number,
  cx: number,
  cy: number,
): void {
  if (combo < 2 || flashT <= 0) return;
  const a = Math.min(1, flashT * 3);
  ctx.save();
  ctx.globalAlpha = a * 0.42;

  if (combo >= 20) {
    const hue = (Date.now() / 16) % 360;
    const g = ctx.createRadialGradient(cx, cy, 8, cx, cy, 230);
    g.addColorStop(0, `hsla(${hue},92%,62%,0.6)`);
    g.addColorStop(0.45, `hsla(${(hue + 70) % 360},85%,55%,0.25)`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2 + flashT * 4;
      ctx.fillStyle = `rgba(255,255,255,${a * 0.5})`;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(ang) * 90 * (1 - flashT), cy + Math.sin(ang) * 65 * (1 - flashT), 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (combo >= 10) {
    const g = ctx.createRadialGradient(cx, cy, 8, cx, cy, 200);
    g.addColorStop(0, 'rgba(255,215,0,0.7)');
    g.addColorStop(0.4, 'rgba(255,180,0,0.3)');
    g.addColorStop(1, 'rgba(255,215,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * Math.PI * 2 + flashT * 3.5;
      ctx.fillStyle = `rgba(255,240,140,${a * 0.7})`;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(ang) * 80 * (1 - flashT), cy + Math.sin(ang) * 58 * (1 - flashT), 4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (combo >= 5) {
    ctx.strokeStyle = `rgba(255,255,140,${a * 0.8})`;
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 4; i++) {
      const ox = (Math.sin(i * 2.1 + flashT * 5) * 0.5 + 0.5 - 0.5) * 200;
      ctx.beginPath();
      ctx.moveTo(cx + ox, 0);
      ctx.lineTo(cx + ox + (Math.sin(i * 1.7) * 20), 200);
      ctx.stroke();
    }
    const g = ctx.createRadialGradient(cx, cy, 20, cx, cy, 140);
    g.addColorStop(0, `rgba(255,200,50,${a * 0.35})`);
    g.addColorStop(1, 'rgba(255,150,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, 140, 0, Math.PI * 2);
    ctx.fill();
  } else if (combo >= 3) {
    const g = ctx.createRadialGradient(cx, cy, 18, cx, cy, 130);
    g.addColorStop(0, `rgba(255,130,40,${a * 0.45})`);
    g.addColorStop(1, 'rgba(255,90,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, 130, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const g = ctx.createRadialGradient(cx, cy, 8, cx, cy, 90);
    g.addColorStop(0, `rgba(255,220,150,${a * 0.35})`);
    g.addColorStop(1, 'rgba(255,200,100,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, 90, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

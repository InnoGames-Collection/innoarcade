// EthioRunner procedural visuals — parallax landscape, road textures, lighting.
// Rendering only; no gameplay impact.

const W = 480;
const H = 720;
const HORIZON_Y = 250;
const TAU = Math.PI * 2;

export const CHAR_VISUAL_SCALE = 1.26;

interface ParallaxCtx {
  dist: number;
  time: number;
  horizonY: number;
}

function seeded(seed: number): number {
  const x = Math.sin(seed * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Warm daylight sky with sun glow and layered parallax. */
export function drawEthiopianSky(
  ctx: CanvasRenderingContext2D,
  { dist, time, horizonY }: ParallaxCtx,
): void {
  const grad = ctx.createLinearGradient(0, 0, 0, horizonY + 40);
  grad.addColorStop(0, '#4a90d9');
  grad.addColorStop(0.35, '#7eb8e8');
  grad.addColorStop(0.7, '#f5d9a8');
  grad.addColorStop(1, '#f0e6c8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, horizonY + 40);

  // Sun
  const sunX = W * 0.78;
  const sunY = horizonY * 0.22;
  const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 90);
  sunGrad.addColorStop(0, 'rgba(255,248,200,0.95)');
  sunGrad.addColorStop(0.3, 'rgba(255,220,120,0.5)');
  sunGrad.addColorStop(1, 'rgba(255,200,80,0)');
  ctx.fillStyle = sunGrad;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 90, 0, TAU);
  ctx.fill();

  drawClouds(ctx, dist, time, horizonY);
  drawDistantMountains(ctx, dist, horizonY);
  drawMidHills(ctx, dist, horizonY);
}

function drawClouds(
  ctx: CanvasRenderingContext2D, dist: number, time: number, _horizonY: number,
): void {
  ctx.save();
  for (let i = 0; i < 7; i++) {
    const speed = 0.08 + i * 0.02;
    const baseX = ((dist * speed + i * 137) % (W + 200)) - 100;
    const y = 30 + i * 22 + Math.sin(time * 0.3 + i) * 4;
    const w = 70 + i * 18;
    ctx.globalAlpha = 0.35 + (i % 3) * 0.1;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(baseX, y, w * 0.5, 16, 0, 0, TAU);
    ctx.ellipse(baseX + w * 0.25, y - 6, w * 0.35, 14, 0, 0, TAU);
    ctx.ellipse(baseX - w * 0.2, y - 3, w * 0.3, 12, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawDistantMountains(
  ctx: CanvasRenderingContext2D, dist: number, horizonY: number,
): void {
  const scroll = (dist * 0.12) % W;
  ctx.save();
  ctx.globalAlpha = 0.55;
  for (let layer = 0; layer < 2; layer++) {
    const baseY = horizonY - 20 - layer * 35;
    const color = layer === 0 ? '#6b8fa3' : '#8aa8b8';
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-scroll - W, baseY + 60);
    for (let x = -scroll - W; x < W * 2; x += 60) {
      const peak = baseY - 25 - seeded(x * 0.1 + layer * 50) * 55;
      ctx.lineTo(x, peak);
      ctx.lineTo(x + 30, baseY + 10 - seeded(x * 0.07) * 20);
    }
    ctx.lineTo(W * 2, baseY + 60);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawMidHills(
  ctx: CanvasRenderingContext2D, dist: number, horizonY: number,
): void {
  const scroll = (dist * 0.25) % W;
  ctx.save();
  ctx.globalAlpha = 0.7;
  const grad = ctx.createLinearGradient(0, horizonY - 80, 0, horizonY + 10);
  grad.addColorStop(0, '#5a9e3a');
  grad.addColorStop(1, '#7cb84a');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-scroll - W, horizonY + 20);
  for (let x = -scroll - W; x < W * 2; x += 45) {
    const h = 18 + seeded(x * 0.15) * 35;
    ctx.lineTo(x, horizonY + 20 - h);
    ctx.lineTo(x + 22, horizonY + 20);
  }
  ctx.lineTo(W * 2, horizonY + 20);
  ctx.closePath();
  ctx.fill();

  // Distant traditional houses
  for (let i = 0; i < 12; i++) {
    const hx = ((dist * 0.3 + i * 97) % (W + 120)) - 60;
    const hy = horizonY - 8 - seeded(i * 17) * 28;
    const scale = 0.5 + seeded(i * 23) * 0.5;
    drawTinyHouse(ctx, hx, hy, scale);
  }
  ctx.restore();
}

function drawTinyHouse(
  ctx: CanvasRenderingContext2D, x: number, y: number, scale: number,
): void {
  const w = 22 * scale;
  const h = 16 * scale;
  ctx.globalAlpha = 0.45 * scale;
  ctx.fillStyle = '#c4a574';
  ctx.fillRect(x - w / 2, y - h, w, h);
  ctx.fillStyle = '#8b5a2b';
  ctx.beginPath();
  ctx.moveTo(x - w * 0.7, y - h);
  ctx.lineTo(x, y - h - h * 0.6);
  ctx.lineTo(x + w * 0.7, y - h);
  ctx.closePath();
  ctx.fill();
}

/** Side vegetation beside the track — grass, flowers, acacia, coffee, fences. */
export function drawSideScenery(
  ctx: CanvasRenderingContext2D,
  dist: number,
  _time: number,
  sx: (lane: number, z: number) => number,
  sy: (z: number) => number,
  p: (z: number) => number,
  trackEdge: number,
): void {
  const zStart = Math.floor(dist / 3) * 3;
  for (let wz = zStart; wz < dist + 80; wz += 3) {
    const zr = wz - dist;
    if (zr < 1 || zr > 70) continue;
    const pr = p(zr);
    const groundY = sy(zr);
    const seed = Math.floor(wz * 3.7);

    for (const side of [-1, 1]) {
      const edgeX = sx(side * trackEdge, zr);
      const offX = side * (LANE_PAD(pr) + seeded(seed + side) * 30 * pr);

      // Grass strip
      ctx.globalAlpha = Math.min(0.85, (70 - zr) / 12) * 0.9;
      const grassGrad = ctx.createLinearGradient(edgeX, groundY - 40 * pr, edgeX, groundY);
      grassGrad.addColorStop(0, '#4a9e2a');
      grassGrad.addColorStop(1, '#3d8a22');
      ctx.fillStyle = grassGrad;
      ctx.fillRect(edgeX + offX * 0.3 - 25 * pr, groundY - 8 * pr, 50 * pr, 12 * pr);

      if (seeded(seed + 1) > 0.55) {
        drawFlower(ctx, edgeX + offX, groundY - 12 * pr, pr, seed);
      }
      if (seeded(seed + 2) > 0.82) {
        drawAcacia(ctx, edgeX + offX * 1.2, groundY, pr, seed);
      }
      if (seeded(seed + 3) > 0.88) {
        drawCoffeePlant(ctx, edgeX + offX * 0.8, groundY - 4 * pr, pr);
      }
      if (seeded(seed + 4) > 0.9) {
        drawRock(ctx, edgeX + offX * 0.6, groundY - 2 * pr, pr * (0.5 + seeded(seed) * 0.5));
      }
      if (seeded(seed + 5) > 0.93) {
        drawFence(ctx, edgeX + offX, groundY, pr, side);
      }
      if (seeded(seed + 6) > 0.75) {
        drawShrub(ctx, edgeX + offX * 0.9, groundY - 6 * pr, pr);
      }
    }
  }
  ctx.globalAlpha = 1;
}

function LANE_PAD(pr: number): number { return 55 * pr + 20; }

function drawFlower(
  ctx: CanvasRenderingContext2D, x: number, y: number, pr: number, seed: number,
): void {
  const colors = ['#e85b9c', '#f1c40f', '#ff6b35', '#9b59b6', '#fff'];
  const c = colors[Math.floor(seeded(seed) * colors.length)];
  const r = 3 * pr;
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#2d6a1e';
  ctx.fillRect(x - 0.5 * pr, y, 1 * pr, 8 * pr);
}

function drawAcacia(
  ctx: CanvasRenderingContext2D, x: number, y: number, pr: number, seed: number,
): void {
  const h = (35 + seeded(seed) * 25) * pr;
  ctx.fillStyle = '#5c3d1e';
  ctx.fillRect(x - 2 * pr, y - h, 4 * pr, h);
  ctx.fillStyle = '#3d7a28';
  ctx.beginPath();
  ctx.ellipse(x, y - h, 18 * pr, 8 * pr, 0, 0, TAU);
  ctx.fill();
  ctx.globalAlpha *= 0.7;
  ctx.beginPath();
  ctx.ellipse(x + 8 * pr, y - h + 4 * pr, 12 * pr, 6 * pr, 0.3, 0, TAU);
  ctx.fill();
}

function drawCoffeePlant(ctx: CanvasRenderingContext2D, x: number, y: number, pr: number): void {
  ctx.fillStyle = '#2d5a1a';
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU;
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * 6 * pr, y + Math.sin(a) * 4 * pr, 5 * pr, 3 * pr, a, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = '#8b4513';
  ctx.beginPath();
  ctx.arc(x, y - 2 * pr, 2 * pr, 0, TAU);
  ctx.fill();
}

function drawRock(ctx: CanvasRenderingContext2D, x: number, y: number, pr: number): void {
  ctx.fillStyle = '#8a8070';
  ctx.beginPath();
  ctx.ellipse(x, y, 6 * pr, 4 * pr, 0.2, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath();
  ctx.ellipse(x - 2 * pr, y - 1 * pr, 3 * pr, 2 * pr, 0, 0, TAU);
  ctx.fill();
}

function drawFence(
  ctx: CanvasRenderingContext2D, x: number, y: number, pr: number, side: number,
): void {
  ctx.strokeStyle = '#8b6914';
  ctx.lineWidth = 2 * pr;
  const len = 30 * pr;
  ctx.beginPath();
  ctx.moveTo(x, y - 14 * pr);
  ctx.lineTo(x, y);
  ctx.moveTo(x + side * len, y - 14 * pr);
  ctx.lineTo(x + side * len, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y - 10 * pr);
  ctx.lineTo(x + side * len, y - 10 * pr);
  ctx.moveTo(x, y - 5 * pr);
  ctx.lineTo(x + side * len, y - 5 * pr);
  ctx.stroke();
}

function drawShrub(ctx: CanvasRenderingContext2D, x: number, y: number, pr: number): void {
  ctx.fillStyle = '#3a7a24';
  ctx.beginPath();
  ctx.arc(x, y, 10 * pr, 0, TAU);
  ctx.arc(x + 8 * pr, y - 2 * pr, 8 * pr, 0, TAU);
  ctx.arc(x - 6 * pr, y - 1 * pr, 7 * pr, 0, TAU);
  ctx.fill();
}

/** Enhanced road surface with wear, lane dashes, and soft edges. */
export function drawPremiumRoad(
  ctx: CanvasRenderingContext2D,
  dist: number,
  sx: (lane: number, z: number) => number,
  sy: (z: number) => number,
  p: (z: number) => number,
  groundColor: string,
  tieColor: string,
  trackEdge: number,
  tieGap: number,
): void {
  const zf = 300;
  // Road surface gradient
  const roadGrad = ctx.createLinearGradient(0, sy(zf), 0, sy(0));
  roadGrad.addColorStop(0, shadeColor(groundColor, -15));
  roadGrad.addColorStop(0.5, groundColor);
  roadGrad.addColorStop(1, shadeColor(groundColor, 10));
  ctx.fillStyle = roadGrad;
  ctx.beginPath();
  ctx.moveTo(sx(-trackEdge, zf), sy(zf));
  ctx.lineTo(sx(trackEdge, zf), sy(zf));
  ctx.lineTo(sx(trackEdge, 0), sy(0));
  ctx.lineTo(sx(-trackEdge, 0), sy(0));
  ctx.closePath();
  ctx.fill();

  // Subtle wear texture
  ctx.save();
  ctx.clip();
  for (let wz = Math.floor(dist / 2) * 2; wz < dist + 90; wz += 2) {
    const zr = wz - dist;
    if (zr < 0.5) continue;
    const pr = p(zr);
    const wx = sx((seeded(wz) - 0.5) * trackEdge * 1.6, zr);
    const wy = sy(zr);
    ctx.globalAlpha = 0.06 * pr;
    ctx.fillStyle = seeded(wz + 1) > 0.5 ? '#000' : '#fff';
    ctx.fillRect(wx - 3 * pr, wy - 2 * pr, 6 * pr, 3 * pr);
  }
  ctx.restore();

  // Cross ties
  ctx.strokeStyle = tieColor;
  for (let wz = Math.floor(dist / tieGap) * tieGap + tieGap; wz < dist + 90; wz += tieGap) {
    const zr = wz - dist;
    ctx.lineWidth = Math.max(1, 5 * p(zr));
    ctx.beginPath();
    ctx.moveTo(sx(-trackEdge, zr), sy(zr));
    ctx.lineTo(sx(trackEdge, zr), sy(zr));
    ctx.stroke();
  }

  // Lane dividers (dashed)
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  for (const l of [-0.5, 0.5]) {
    for (let wz = Math.floor(dist / 3) * 3; wz < dist + 90; wz += 6) {
      const zr = wz - dist;
      if (zr < 0.5) continue;
      const pr = p(zr);
      ctx.lineWidth = Math.max(1, 2.5 * pr);
      const x1 = sx(l, zr);
      const y1 = sy(zr);
      const x2 = sx(l, zr + 2.5);
      const y2 = sy(zr + 2.5);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }

  // Track edges with shadow
  for (const side of [-trackEdge, trackEdge]) {
    const edgeGrad = ctx.createLinearGradient(sx(side, 0), sy(0), sx(side, zf), sy(zf));
    edgeGrad.addColorStop(0, '#6b5230');
    edgeGrad.addColorStop(1, '#8a6840');
    ctx.strokeStyle = edgeGrad;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(sx(side, zf), sy(zf));
    ctx.lineTo(sx(side, 0), sy(0));
    ctx.stroke();
    // Inner shadow
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(sx(side * 0.95, zf), sy(zf));
    ctx.lineTo(sx(side * 0.95, 0), sy(0));
    ctx.stroke();
  }
}

function shadeColor(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amount));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amount));
  const b = Math.max(0, Math.min(255, (n & 255) + amount));
  return `rgb(${r},${g},${b})`;
}

/** Soft drop shadow under a projected sprite. */
export function drawObjectShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  alpha = 0.28,
): void {
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(x, y + 2, w * 0.45, w * 0.12, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** Subtle bloom overlay for warm daylight feel. */
export function drawBloom(
  ctx: CanvasRenderingContext2D, w: number, h: number, intensity: number,
): void {
  if (intensity <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const grad = ctx.createRadialGradient(w * 0.5, h * 0.35, 0, w * 0.5, h * 0.35, w * 0.7);
  grad.addColorStop(0, `rgba(255,240,200,${0.06 * intensity})`);
  grad.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Wind particles drifting across the scene. */
export function emitWindParticles(
  emit: (spec: {
    x: number; y: number; vx: number; vy: number; life: number;
    size: number; color: string; fade: boolean;
  }) => void,
  _time: number,
  speed: number,
): void {
  if (Math.random() > 0.15 + speed * 0.008) return;
  const y = 80 + Math.random() * (H - 200);
  emit({
    x: W + 10,
    y,
    vx: -(120 + speed * 3 + Math.random() * 80),
    vy: (Math.random() - 0.5) * 20,
    life: 1.2 + Math.random() * 0.8,
    size: 1.5 + Math.random() * 2,
    color: 'rgba(255,255,255,0.25)',
    fade: true,
  });
}

export { HORIZON_Y };

/** Canvas fluid renderer — continuous liquid bodies inside glass bottles. */

import { gemIdFromIndex, type GemId } from '../premiumGems';

export interface FluidLayer {
  colorId: number;
  units: number;
  mystery?: boolean;
}

export interface BottleDrawOpts {
  capacity: number;
  hiddenBottom: number;
  selected?: boolean;
  highlightTop?: number;
}

const PALETTE: Record<GemId, { light: string; mid: string; dark: string }> = {
  sapphire: { light: '#c8deff', mid: '#5b8cff', dark: '#2a4db8' },
  emerald: { light: '#9ef5c4', mid: '#2ecc71', dark: '#1a7a42' },
  amber: { light: '#ffe49a', mid: '#f39c12', dark: '#b86a08' },
  ruby: { light: '#ffaebc', mid: '#e74c3c', dark: '#9c2418' },
  amethyst: { light: '#dfc8ff', mid: '#9b59b6', dark: '#5c2d78' },
  aquamarine: { light: '#9af5ed', mid: '#1abc9c', dark: '#0d7a68' },
  coral: { light: '#ffc8aa', mid: '#e67e22', dark: '#a04a10' },
  violet: { light: '#d4c8ff', mid: '#6c5ce7', dark: '#3d28a8' },
};

const MYSTERY = { light: '#8a96a8', mid: '#5a6578', dark: '#3a4558' };

export function liquidColors(colorId: number): { light: string; mid: string; dark: string } {
  if (colorId <= 0) return MYSTERY;
  return PALETTE[gemIdFromIndex(colorId - 1)];
}

/** Merge consecutive same-color segments into continuous bodies. */
export function mergeTubeLayers(tube: number[]): FluidLayer[] {
  if (!tube.length) return [];
  const layers: FluidLayer[] = [];
  let cur = tube[0];
  let count = 1;
  for (let i = 1; i < tube.length; i++) {
    if (tube[i] === cur) count++;
    else {
      layers.push({ colorId: cur, units: count });
      cur = tube[i];
      count = 1;
    }
  }
  layers.push({ colorId: cur, units: count });
  return layers;
}

/** Build visual layers with optional partial drain / pour-in for animation. */
export function visualLayers(
  tube: number[],
  hiddenBottom: number,
  opts?: { drainTop?: number; drainColor?: number; pourColor?: number; pourUnits?: number },
): FluidLayer[] {
  const hidden = Math.min(hiddenBottom, tube.length);
  const visible = tube.slice(hidden);
  let layers = mergeTubeLayers(visible);

  if (hidden > 0) {
    layers = [{ colorId: 0, units: hidden, mystery: true }, ...layers];
  }

  const drain = opts?.drainTop ?? 0;
  const drainColor = opts?.drainColor;
  if (drain > 0 && layers.length) {
    const top = layers[layers.length - 1];
    if (!top.mystery && (drainColor == null || top.colorId === drainColor)) {
      top.units = Math.max(0, top.units - drain);
      if (top.units < 0.001) layers.pop();
    }
  }

  const pourU = opts?.pourUnits ?? 0;
  const pourC = opts?.pourColor ?? 0;
  if (pourU > 0 && pourC > 0) {
    const top = layers[layers.length - 1];
    if (top && !top.mystery && top.colorId === pourC) {
      top.units += pourU;
    } else {
      layers.push({ colorId: pourC, units: pourU });
    }
  }

  return layers;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
}

export { easeInOutCubic };

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  rtl: number,
  rtr: number,
  rbr: number,
  rbl: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + rtl, y);
  ctx.lineTo(x + w - rtr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rtr);
  ctx.lineTo(x + w, y + h - rbr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rbr, y + h);
  ctx.lineTo(x + rbl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rbl);
  ctx.lineTo(x, y + rtl);
  ctx.quadraticCurveTo(x, y, x + rtl, y);
  ctx.closePath();
}

function bottleClip(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const padX = w * 0.06;
  const padTop = h * 0.04;
  const padBot = h * 0.03;
  const r = Math.min(w * 0.22, 14);
  roundRectPath(ctx, padX, padTop, w - padX * 2, h - padTop - padBot, 4, 4, r, r);
  ctx.clip();
}

function drawFluidBody(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  colors: { light: string; mid: string; dark: string },
  roundTop: boolean,
  roundBottom: boolean,
): void {
  if (h < 0.5) return;
  const rtl = roundTop ? Math.min(7, w * 0.2) : 0;
  const rtr = roundTop ? Math.min(7, w * 0.2) : 0;
  const rbl = roundBottom ? Math.min(10, w * 0.28) : 0;
  const rbr = roundBottom ? Math.min(10, w * 0.28) : 0;

  roundRectPath(ctx, x, y, w, h, rtl, rtr, rbr, rbl);
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, colors.light);
  grad.addColorStop(0.42, colors.mid);
  grad.addColorStop(1, colors.dark);
  ctx.fillStyle = grad;
  ctx.globalAlpha = 0.94;
  ctx.fill();
  ctx.globalAlpha = 1;

  if (roundTop) {
    ctx.save();
    roundRectPath(ctx, x, y, w, Math.min(h, 10), rtl, rtr, 0, 0);
    ctx.clip();
    const hl = ctx.createLinearGradient(x, y, x, y + 10);
    hl.addColorStop(0, 'rgba(255,255,255,0.45)');
    hl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hl;
    ctx.fillRect(x, y, w, Math.min(h, 12));
    ctx.restore();
  }
}

/** Draw all liquid inside a bottle canvas. */
export function drawBottleFluid(
  canvas: HTMLCanvasElement,
  layers: FluidLayer[],
  opts: BottleDrawOpts,
): void {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, rect.width);
  const h = Math.max(1, rect.height);
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  ctx.save();
  bottleClip(ctx, w, h);

  const padX = w * 0.08;
  const innerW = w - padX * 2;
  const padTop = h * 0.05;
  const padBot = h * 0.04;
  const innerH = h - padTop - padBot;
  const unitH = innerH / opts.capacity;

  let bottomY = h - padBot;
  const totalUnits = layers.reduce((s, l) => s + l.units, 0);

  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    const layerH = layer.units * unitH;
    const topY = bottomY - layerH;
    const isTop = i === layers.length - 1;
    const isBottom = i === 0;
    const colors = layer.mystery ? MYSTERY : liquidColors(layer.colorId);
    drawFluidBody(ctx, padX, topY, innerW, layerH, colors, isTop, isBottom && totalUnits >= opts.capacity - 0.01);

    if (layer.mystery && layerH > 8) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = `bold ${Math.min(16, innerW * 0.45)}px system-ui,sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', padX + innerW / 2, topY + layerH / 2);
    }

    if (opts.selected && isTop && !layer.mystery) {
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 2;
      roundRectPath(ctx, padX + 1, topY + 1, innerW - 2, Math.max(4, layerH - 2), 6, 6, 0, 0);
      ctx.stroke();
    }

    bottomY = topY;
  }

  ctx.restore();
}

export interface StreamPoint {
  x: number;
  y: number;
}

/** Draw curved liquid stream on overlay canvas (board coordinates). */
export function drawLiquidStream(
  ctx: CanvasRenderingContext2D,
  from: StreamPoint,
  to: StreamPoint,
  colorId: number,
  width: number,
  phase: number,
): void {
  const colors = liquidColors(colorId);
  const cx = (from.x + to.x) / 2;
  const cy = Math.max(from.y, to.y) + Math.abs(to.x - from.x) * 0.25 + 28;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const grad = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
  grad.addColorStop(0, colors.light);
  grad.addColorStop(0.5, colors.mid);
  grad.addColorStop(1, colors.dark);

  ctx.strokeStyle = grad;
  ctx.globalAlpha = 0.88;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.quadraticCurveTo(cx, cy, to.x, to.y);
  ctx.stroke();

  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = width * 0.35;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.quadraticCurveTo(cx, cy - 2, to.x, to.y);
  ctx.stroke();

  ctx.globalAlpha = 0.5 + 0.2 * Math.sin(phase * 8);
  ctx.fillStyle = colors.mid;
  for (let i = 0; i < 3; i++) {
    const t = ((phase * 2 + i * 0.33) % 1);
    const px = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * cx + t * t * to.x;
    const py = (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * cy + t * t * to.y;
    ctx.beginPath();
    ctx.arc(px, py, width * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export class WaterBottleManager {
  private canvases = new Map<number, HTMLCanvasElement>();
  private hiddenBottoms = new Map<number, number>();
  private capacities = new Map<number, number>();

  attach(idx: number, tubeEl: HTMLElement): HTMLCanvasElement {
    let canvas = tubeEl.querySelector('.ws-fluid-canvas') as HTMLCanvasElement | null;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'ws-fluid-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      tubeEl.insertBefore(canvas, tubeEl.firstChild);
    }
    this.canvases.set(idx, canvas);
    return canvas;
  }

  setMeta(idx: number, capacity: number, hiddenBottom: number): void {
    this.capacities.set(idx, capacity);
    this.hiddenBottoms.set(idx, hiddenBottom);
  }

  render(
    idx: number,
    tube: number[],
    opts?: Partial<BottleDrawOpts> & {
      drainTop?: number;
      drainColor?: number;
      pourColor?: number;
      pourUnits?: number;
    },
  ): void {
    const canvas = this.canvases.get(idx);
    if (!canvas) return;
    const capacity = opts?.capacity ?? this.capacities.get(idx) ?? 4;
    const hiddenBottom = opts?.hiddenBottom ?? this.hiddenBottoms.get(idx) ?? 0;
    const layers = visualLayers(tube, hiddenBottom, {
      drainTop: opts?.drainTop,
      drainColor: opts?.drainColor,
      pourColor: opts?.pourColor,
      pourUnits: opts?.pourUnits,
    });
    drawBottleFluid(canvas, layers, {
      capacity,
      hiddenBottom,
      selected: opts?.selected,
      highlightTop: opts?.highlightTop,
    });
  }

  renderAll(
    tubes: number[][],
    getOpts: (idx: number) => Partial<BottleDrawOpts> & {
      drainTop?: number;
      drainColor?: number;
      pourColor?: number;
      pourUnits?: number;
    },
  ): void {
    tubes.forEach((tube, idx) => {
      this.render(idx, tube, getOpts(idx));
    });
  }

  clear(): void {
    this.canvases.clear();
    this.hiddenBottoms.clear();
    this.capacities.clear();
  }
}

export function tubeMouthOnBoard(
  board: HTMLElement,
  tubeEl: HTMLElement,
): StreamPoint {
  const b = board.getBoundingClientRect();
  const r = tubeEl.getBoundingClientRect();
  return {
    x: r.left - b.left + r.width / 2,
    y: r.top - b.top + 8,
  };
}

export function ensureStreamCanvas(board: HTMLElement): HTMLCanvasElement {
  let canvas = board.querySelector('.ws-stream-canvas') as HTMLCanvasElement | null;
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.className = 'ws-stream-canvas';
    board.appendChild(canvas);
  }
  const dpr = window.devicePixelRatio || 1;
  const rect = board.getBoundingClientRect();
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  return canvas;
}

export function clearStreamCanvas(board: HTMLElement): void {
  const canvas = board.querySelector('.ws-stream-canvas') as HTMLCanvasElement | null;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
}

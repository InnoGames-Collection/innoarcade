// Premium isometric renderer — Phase 2+3: terrain, voxels, parallax, decorations.

import {
  cellDiamondScreen,
  gridToScreen,
  paintDepth,
  type IsoCamera,
  type ScreenOrigin,
} from '../iso';
import {
  CELL,
  COLS,
  H,
  hopProgress,
  playerGridPos,
  rowAt,
  SCREEN_ANCHOR_Y,
  W,
  type WorldSnapshot,
} from '../types';
import { hopArcHeight, hopSquash } from './animation';
import { drawBackground } from './background';
import { drawGrassDecor } from './decorations';
import { drawTerrainCell } from './terrain';
import { drawPremiumHud } from './ui';
import {
  drawDropShadow,
  drawVoxelChicken,
  drawVoxelLog,
  drawVoxelVehicle,
} from './voxel';

const ENTITY_UNIT = CELL * 0.55;

export function renderPremium(ctx: CanvasRenderingContext2D, s: WorldSnapshot): void {
  drawBackground(ctx, s);

  const camera: IsoCamera = { x: s.camIsoX, y: s.camIsoY };
  const origin: ScreenOrigin = { x: W / 2, y: H * SCREEN_ANCHOR_Y };
  const bob = s.camBob;
  const { gx: playerGx, gz: playerGz } = playerGridPos(s);
  const t = hopProgress(s.hopT);

  type DrawItem = { depth: number; draw: () => void };
  const queue: DrawItem[] = [];

  const zMin = s.pz - 12;
  const zMax = s.pz + 16;

  for (let z = zMin; z <= zMax; z++) {
    const row = rowAt(s.rows, z);
    const isStart = z <= 0;
    for (let col = 0; col < COLS; col++) {
      const corners = cellDiamondScreen(col, z, camera, origin, bob);
      const depth = paintDepth(z, col);
      const opts = { isStart, animT: s.animT, col, row: z };
      queue.push({
        depth,
        draw: () => drawTerrainCell(ctx, corners, row.kind, { ...opts, sidesOnly: true }),
      });
      queue.push({
        depth: depth + 0.02,
        draw: () => drawTerrainCell(ctx, corners, row.kind, { ...opts, topOnly: true }),
      });
      if (row.kind === 'grass') {
        queue.push({
          depth: depth + 0.03,
          draw: () => drawGrassDecor(ctx, col, z, camera, origin, bob, s.animT, isStart),
        });
      }
    }
  }

  for (const c of s.cars) {
    const gridCx = (c.x + c.w * 0.5) / CELL;
    const center = gridToScreen(gridCx, c.row + 0.5, camera, origin, bob);
    const depth = paintDepth(c.row, gridCx) + 0.2;
    const gridSpan = c.w / CELL;
    const facingRight = c.speed > 0;
    queue.push({
      depth,
      draw: () => {
        drawDropShadow(
          ctx,
          center.x,
          center.y + CELL * 0.14,
          gridSpan * ENTITY_UNIT * 0.42,
          CELL * 0.07,
        );
        drawVoxelVehicle(
          ctx,
          center.x,
          center.y,
          gridSpan,
          c.kind,
          facingRight,
          ENTITY_UNIT,
          s.animT,
        );
      },
    });
  }

  for (const l of s.logs) {
    const gridCx = (l.x + l.w * 0.5) / CELL;
    const center = gridToScreen(gridCx, l.row + 0.5, camera, origin, bob);
    const depth = paintDepth(l.row, gridCx) + 0.2;
    const gridSpan = l.w / CELL;
    queue.push({
      depth,
      draw: () => {
        drawDropShadow(ctx, center.x, center.y + CELL * 0.12, gridSpan * ENTITY_UNIT * 0.4, CELL * 0.06);
        drawVoxelLog(ctx, center.x, center.y, gridSpan, ENTITY_UNIT, s.animT, gridCx);
      },
    });
  }

  const playerCenter = gridToScreen(playerGx, playerGz, camera, origin, bob);
  const arcZ = hopArcHeight(t, CELL * 0.45);
  const squash = hopSquash(t);
  const shadowAlpha = s.hopT > 0 ? 0.1 + (1 - t) * 0.08 : 0.22;

  queue.push({
    depth: paintDepth(playerGz, playerGx) + 0.5,
    draw: () => drawDropShadow(
      ctx,
      playerCenter.x,
      playerCenter.y + CELL * 0.18,
      CELL * 0.2,
      CELL * 0.09,
      shadowAlpha,
    ),
  });
  queue.push({
    depth: paintDepth(playerGz, playerGx) + 0.55,
    draw: () => drawVoxelChicken(
      ctx,
      playerCenter.x,
      playerCenter.y - arcZ * 0.12,
      ENTITY_UNIT,
      arcZ,
      squash,
      s.animT,
    ),
  });

  queue.sort((a, b) => a.depth - b.depth);
  for (const item of queue) item.draw();

  drawPremiumHud(ctx, s);
}

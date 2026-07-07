// Path corridor collision helpers for runner games (ZigZag, etc.).

export interface PathPoint {
  x: number;
  y: number;
}

/** Shortest distance from point (px,py) to line segment (x1,y1)-(x2,y2). */
export function distToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/** True when (bx,by) is inside a thick polyline corridor. */
export function onPathCorridor(
  path: PathPoint[],
  bx: number,
  by: number,
  halfWidth: number,
  radius = 0,
): boolean {
  for (let i = 0; i < path.length - 1; i++) {
    const d = distToSegment(bx, by, path[i].x, path[i].y, path[i + 1].x, path[i + 1].y);
    if (d <= halfWidth + radius) return true;
  }
  return false;
}

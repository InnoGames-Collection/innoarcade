import { describe, expect, it } from 'vitest';
import { distToSegment, onPathCorridor } from './pathCollision';

describe('distToSegment', () => {
  it('returns distance to segment midpoint', () => {
    expect(distToSegment(5, 5, 0, 0, 10, 0)).toBeCloseTo(5);
  });

  it('returns endpoint distance for degenerate segment', () => {
    expect(distToSegment(3, 4, 0, 0, 0, 0)).toBe(5);
  });
});

describe('onPathCorridor', () => {
  const path = [{ x: 0, y: 0 }, { x: 100, y: 0 }];

  it('accepts points on the corridor centerline', () => {
    expect(onPathCorridor(path, 50, 0, 20)).toBe(true);
  });

  it('rejects points far from the corridor', () => {
    expect(onPathCorridor(path, 50, 80, 10)).toBe(false);
  });
});

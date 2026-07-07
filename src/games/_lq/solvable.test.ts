import { describe, expect, it } from 'vitest';
import {
  pipeGridConnected,
  slidePuzzleScramble,
  tileConnectCanConnect,
  tileConnectFindHint,
  tileConnectIsFullySolvable,
} from './solvable';
import { adjacentPairBoard, buildSolvableTileBoard } from './levelGen';

describe('tileConnectCanConnect', () => {
  it('connects adjacent matching tiles', () => {
    const board = [
      ['A', 'A', ''],
      ['', '', ''],
    ];
    expect(tileConnectCanConnect(board, 0, 0, 0, 1)).toBe(true);
  });

  it('rejects mismatched symbols', () => {
    const board = [
      ['A', 'B'],
      ['', ''],
    ];
    expect(tileConnectCanConnect(board, 0, 0, 0, 1)).toBe(false);
  });
});

describe('tileConnectIsFullySolvable', () => {
  it('solves adjacent-pair boards', () => {
    const board = adjacentPairBoard(4, 6, ['🍎', '🍊', '🍋', '🍇', '🍓'], 5);
    expect(tileConnectIsFullySolvable(board, 4, 6, tileConnectCanConnect)).toBe(true);
  });
});

describe('buildSolvableTileBoard', () => {
  it('returns a fully solvable random board', () => {
    const rnd = () => 0.42;
    const board = buildSolvableTileBoard(6, 8, ['🍎', '🍊', '🍋', '🍇', '🍓', '🌸'], 8, rnd);
    expect(tileConnectIsFullySolvable(board, 6, 8, tileConnectCanConnect)).toBe(true);
  });
});

describe('slidePuzzleScramble', () => {
  it('returns a solvable layout', () => {
    let n = 0;
    const rnd = () => (n++ % 3) / 3;
    const scrambled = slidePuzzleScramble(4, 30, rnd);
    expect(scrambled).toHaveLength(16);
    expect(scrambled.includes(0)).toBe(true);
  });
});

describe('tileConnectFindHint', () => {
  it('finds a clearable pair', () => {
    const board = [
      ['A', 'A', ''],
      ['', 'B', 'B'],
    ];
    expect(tileConnectFindHint(board)).toEqual([0, 0, 0, 1]);
  });
});

describe('pipeGridConnected', () => {
  it('detects a horizontal pipe run', () => {
    const grid: (0 | 1 | 2 | 3 | 4 | 5)[][] = [
      [1, 1, 1, 1],
      [1, 2, 4, 3],
      [1, 1, 1, 1],
    ];
    const rots = grid.map((row) => row.map(() => 0 as const));
    expect(pipeGridConnected(grid, rots)).toBe(true);
  });

  it('rejects disconnected layouts', () => {
    const grid: (0 | 1 | 2 | 3 | 4 | 5)[][] = [
      [1, 1, 1, 1],
      [1, 2, 0, 3],
      [1, 1, 1, 1],
    ];
    const rots = grid.map((row) => row.map(() => 0 as const));
    expect(pipeGridConnected(grid, rots)).toBe(false);
  });
});

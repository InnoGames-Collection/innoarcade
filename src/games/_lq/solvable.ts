// Solvability helpers for brain / puzzle games (new titles only).

export type ConnectFn = (
  board: (string | null)[][],
  r1: number,
  c1: number,
  r2: number,
  c2: number,
) => boolean;

function remainingCells(board: (string | null)[][]): number {
  let n = 0;
  for (const row of board) for (const v of row) if (v) n++;
  return n;
}

function cloneBoard<T>(board: T[][]): T[][] {
  return board.map((row) => row.slice());
}

/** Tile-connect pathfinder — at most `maxTurns` bends, can exit grid. */
export function tileConnectCanConnect(
  board: (string | null)[][],
  r1: number,
  c1: number,
  r2: number,
  c2: number,
  maxTurns = 2,
): boolean {
  if (board[r1][c1] !== board[r2][c2] || !board[r1][c1]) return false;
  const H = board.length;
  const W = board[0].length;

  type Node = { r: number; c: number; dir: number; turns: number };
  const dirs = [[-1, 0], [0, 1], [1, 0], [0, -1]];
  const seen = new Set<string>();
  const q: Node[] = [{ r: r1, c: c1, dir: -1, turns: 0 }];
  seen.add(`${r1},${c1},-1,0`);

  while (q.length) {
    const cur = q.shift()!;
    if (cur.r === r2 && cur.c === c2 && (cur.r !== r1 || cur.c !== c1)) return true;
    for (let d = 0; d < 4; d++) {
      const turns = cur.dir === -1 ? 0 : (d === cur.dir ? cur.turns : cur.turns + 1);
      if (turns > maxTurns) continue;
      let nr = cur.r + dirs[d][0];
      let nc = cur.c + dirs[d][1];
      while (nr >= -1 && nc >= -1 && nr <= H && nc <= W) {
        const inside = nr >= 0 && nc >= 0 && nr < H && nc < W;
        const empty = !inside || !board[nr][nc];
        const isEnd = nr === r2 && nc === c2;
        if (!empty && !isEnd) break;
        const key = `${nr},${nc},${d},${turns}`;
        if (!seen.has(key)) {
          seen.add(key);
          q.push({ r: nr, c: nc, dir: d, turns });
        }
        if (isEnd) return true;
        if (!empty) break;
        nr += dirs[d][0];
        nc += dirs[d][1];
      }
    }
  }
  return false;
}

/** Greedy solver — every pair clearable in some order. */
export function tileConnectIsFullySolvable(
  board: string[][],
  rows: number,
  cols: number,
  canConnect: ConnectFn = tileConnectCanConnect,
): boolean {
  const b = cloneBoard(board) as (string | null)[][];
  let guard = 0;
  while (remainingCells(b) > 0 && guard++ < 600) {
    let cleared = false;
    outer:
    for (let r1 = 0; r1 < rows; r1++) {
      for (let c1 = 0; c1 < cols; c1++) {
        if (!b[r1][c1]) continue;
        for (let r2 = 0; r2 < rows; r2++) {
          for (let c2 = 0; c2 < cols; c2++) {
            if (r1 === r2 && c1 === c2) continue;
            if (b[r2][c2] !== b[r1][c1]) continue;
            if (!canConnect(b, r1, c1, r2, c2)) continue;
            b[r1][c1] = null;
            b[r2][c2] = null;
            cleared = true;
            break outer;
          }
        }
      }
    }
    if (!cleared) return false;
  }
  return remainingCells(b) === 0;
}

/** 15-puzzle solved state for size N (blank = 0). */
export function slidePuzzleSolved(size: number): number[] {
  const arr: number[] = [];
  for (let i = 1; i < size * size; i++) arr.push(i);
  arr.push(0);
  return arr;
}

export function slidePuzzleInversions(arr: number[]): number {
  let inv = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === 0) continue;
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[j] !== 0 && arr[i] > arr[j]) inv++;
    }
  }
  return inv;
}

export function slidePuzzleIsSolvable(arr: number[], size: number): boolean {
  const inv = slidePuzzleInversions(arr);
  const blankRow = Math.floor(arr.indexOf(0) / size);
  if (size % 2 === 1) return inv % 2 === 0;
  return (inv + blankRow) % 2 === 1;
}

/** Scramble via valid random moves from solved — always solvable. */
export function slidePuzzleScramble(
  size: number,
  scrambleMoves: number,
  rnd: () => number,
): number[] {
  const tiles = slidePuzzleSolved(size).slice();
  for (let m = 0; m < scrambleMoves; m++) {
    const empty = tiles.indexOf(0);
    const er = Math.floor(empty / size);
    const ec = empty % size;
    const opts = [empty - 1, empty + 1, empty - size, empty + size].filter((i) => {
      if (i < 0 || i >= size * size) return false;
      const r = Math.floor(i / size);
      const c = i % size;
      return Math.abs(er - r) + Math.abs(ec - c) === 1;
    });
    const pick = opts[Math.floor(rnd() * opts.length)];
    [tiles[empty], tiles[pick]] = [tiles[pick], tiles[empty]];
  }
  return tiles;
}

// --- Pipe connect ---

export type PipeCell = 0 | 1 | 2 | 3 | 4 | 5;
export type PipeRot = 0 | 1 | 2 | 3;

const PIPE_DR = [-1, 0, 1, 0];
const PIPE_DC = [0, 1, 0, -1];

export function pipePorts(cell: PipeCell, rot: PipeRot): boolean[] {
  const open = [false, false, false, false];
  if (cell === 4) {
    if (rot % 2 === 0) { open[1] = open[3] = true; }
    else { open[0] = open[2] = true; }
  } else if (cell === 5) {
    const r = rot % 4;
    if (r === 0) { open[1] = open[2] = true; }
    if (r === 1) { open[2] = open[3] = true; }
    if (r === 2) { open[0] = open[3] = true; }
    if (r === 3) { open[0] = open[1] = true; }
  } else if (cell === 2) {
    open[1] = true;
  } else if (cell === 3) {
    open[3] = true;
  }
  return open;
}

export function pipeGridConnected(grid: PipeCell[][], rots: PipeRot[][]): boolean {
  let srcR = -1; let srcC = -1;
  let drainR = -1; let drainC = -1;
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      if (grid[r][c] === 2) { srcR = r; srcC = c; }
      if (grid[r][c] === 3) { drainR = r; drainC = c; }
    }
  }
  if (srcR < 0 || drainR < 0) return false;

  const seen = new Set<string>();
  const q: [number, number][] = [[srcR, srcC]];
  seen.add(`${srcR},${srcC}`);

  while (q.length) {
    const [r, c] = q.shift()!;
    if (r === drainR && c === drainC) return true;
    const p = pipePorts(grid[r][c], rots[r][c]);
    for (let d = 0; d < 4; d++) {
      if (!p[d]) continue;
      const nr = r + PIPE_DR[d];
      const nc = c + PIPE_DC[d];
      if (nr < 0 || nc < 0 || nr >= grid.length || nc >= grid[0].length) continue;
      const ncell = grid[nr][nc];
      if (ncell === 0 || ncell === 1) continue;
      const key = `${nr},${nc}`;
      if (seen.has(key)) continue;
      const np = pipePorts(ncell, rots[nr][nc]);
      if (np[(d + 2) % 4]) {
        seen.add(key);
        q.push([nr, nc]);
      }
    }
  }
  return false;
}

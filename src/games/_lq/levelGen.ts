// Level generators with guaranteed solvability for new brain games.

import { tileConnectIsFullySolvable, tileConnectCanConnect } from './solvable';

/** Shuffle array in place using rng in [0,1). */
export function shuffleInPlace<T>(arr: T[], rnd: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Build a shuffled deck with `pairs` duplicated symbols. */
export function buildPairDeck<T>(symbols: T[], pairs: number, rnd: () => number): T[] {
  const icons = symbols.slice(0, pairs);
  const deck: T[] = [];
  for (const ic of icons) { deck.push(ic, ic); }
  return shuffleInPlace(deck, rnd);
}

/** Place adjacent horizontal pairs — always tile-connect solvable. */
export function adjacentPairBoard(
  rows: number,
  cols: number,
  symbols: string[],
  pairs: number,
): string[][] {
  const board: string[][] = Array.from({ length: rows }, () => Array(cols).fill(''));
  let idx = 0;
  for (let p = 0; p < pairs; p++) {
    const r = Math.floor(idx / (cols / 2)) % rows;
    const c = (idx % (cols / 2)) * 2;
    board[r][c] = symbols[p];
    board[r][c + 1] = symbols[p];
    idx++;
  }
  return board;
}

/** Random fill + solvability check, with adjacent-pair fallback. */
export function buildSolvableTileBoard(
  rows: number,
  cols: number,
  symbols: string[],
  pairs: number,
  rnd: () => number,
  maxAttempts = 100,
): string[][] {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const deck = buildPairDeck(symbols, pairs, rnd);
    const board: string[][] = [];
    let i = 0;
    for (let r = 0; r < rows; r++) {
      board.push([]);
      for (let c = 0; c < cols; c++) board[r].push(deck[i++] ?? '');
    }
    if (tileConnectIsFullySolvable(board, rows, cols, tileConnectCanConnect)) return board;
  }
  return adjacentPairBoard(rows, cols, symbols.slice(0, pairs), pairs);
}

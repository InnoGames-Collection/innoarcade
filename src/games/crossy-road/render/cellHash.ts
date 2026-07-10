/** Deterministic per-cell hash for procedural decorations (no gameplay impact). */

export function cellHash(col: number, row: number, salt = 0): number {
  let h = (col * 374761393 + row * 668265263 + salt * 982451653) >>> 0;
  h = ((h ^ (h >>> 13)) * 1274126177) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

export function cellRand(col: number, row: number, salt = 0): number {
  return cellHash(col, row, salt) / 0xffffffff;
}

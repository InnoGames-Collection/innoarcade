// Temple Dash art — Kenney "Platformer Art Complete Pack" (https://kenney.nl),
// licensed CC0 / public domain (see ./kenney/CREDITS.md). The PNGs vendored under
// ./kenney are imported as hashed URLs by Vite and loaded as single-frame sheets
// by assets.ts, so each sprite is addressed by its file name (e.g. 'scout_walk1',
// 'coin', 'obs_block', 'bg_jungle'). This is the CC0 "backbone" of the hybrid art
// plan; particle/track effects remain procedural.

import type { SheetDef } from '../../engine/assets';

const urls = import.meta.glob('./kenney/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export const WALK_FRAMES = 6;

export interface Skin {
  id: string; // sprite-name prefix (scout|jade|royal)
  nameEn: string;
  nameAm: string;
  cost: number;
}

// Kenney's three player characters: p1 (green), p2 (blue), p3 (pink) — names
// chosen to match each sprite's colour.
export const SKINS: Skin[] = [
  { id: 'scout', nameEn: 'Fern', nameAm: 'ቅጠል', cost: 0 },
  { id: 'jade', nameEn: 'Sky', nameAm: 'ሰማይ', cost: 250 },
  { id: 'royal', nameEn: 'Rosa', nameAm: 'ሮዝ', cost: 600 },
];

// Map every vendored PNG to a single-frame sheet (whole image = frame 0).
export function sheetDefs(): Record<string, SheetDef> {
  const defs: Record<string, SheetDef> = {};
  for (const [path, url] of Object.entries(urls)) {
    const name = path.slice('./kenney/'.length, -'.png'.length);
    defs[name] = { src: url };
  }
  return defs;
}

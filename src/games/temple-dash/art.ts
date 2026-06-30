// Temple Dash runners — custom 3D-style skin PNGs. Animated skins ship one PNG per
// pose under skins/<id>/; others reuse a single thumb for every pose. Kenney CC0
// assets remain for obstacles/coins/backgrounds.

import type { SheetDef } from '../../engine/assets';

const urls = import.meta.glob(['./kenney/*.png', './skins/*.png', './skins/**/*.png'], {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export const WALK_FRAMES = 3;

export interface Skin {
  id: string;
  nameEn: string;
  nameAm: string;
  cost: number;
  /** Static skin image for shop thumbnail. */
  thumb: string;
}

export const SKINS: Skin[] = [
  { id: 'champion', nameEn: 'Champion', nameAm: 'ቻምፒዮን', cost: 0, thumb: './skins/champion.png' },
  { id: 'ethio_m', nameEn: 'Ethio Runner', nameAm: 'ኢትዮ ሯጭ', cost: 0, thumb: './skins/ethio_m.png' },
  { id: 'ethio_f', nameEn: 'Ethio Star', nameAm: 'ኢትዮ ኮከብ', cost: 0, thumb: './skins/ethio_f.png' },
];

const POSES = ['stand', 'walk1', 'walk2', 'walk3', 'jump', 'slide'] as const;

function assetUrl(relativePath: string): string {
  const suffix = relativePath.replace('./', '');
  const key = Object.keys(urls).find((k) => k.endsWith(suffix));
  return key ? urls[key] : '';
}

function skinThumbSrc(skin: Skin): string {
  return assetUrl(skin.thumb);
}

/** Per-pose PNG when present, otherwise the skin thumb (static skins). */
function skinPoseSrc(skinId: string, pose: string): string {
  const poseSrc = assetUrl(`./skins/${skinId}/${pose}.png`);
  if (poseSrc) return poseSrc;
  const skin = SKINS.find((s) => s.id === skinId);
  return skin ? skinThumbSrc(skin) : '';
}

export function skinThumbUrl(id: string): string {
  const skin = SKINS.find((s) => s.id === id);
  return skin ? skinThumbSrc(skin) : '';
}

/** Kenney environment sprites + per-pose aliases for each runner skin. */
export function sheetDefs(): Record<string, SheetDef> {
  const defs: Record<string, SheetDef> = {};
  for (const [path, url] of Object.entries(urls)) {
    if (!path.includes('/kenney/')) continue;
    const name = path.slice(path.indexOf('/kenney/') + '/kenney/'.length, -'.png'.length);
    defs[name] = { src: url };
  }
  for (const skin of SKINS) {
    for (const pose of POSES) {
      const src = skinPoseSrc(skin.id, pose);
      if (!src) continue;
      defs[`${skin.id}_${pose}`] = { src };
    }
  }
  return defs;
}

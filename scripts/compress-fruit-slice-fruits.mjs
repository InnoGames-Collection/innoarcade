#!/usr/bin/env node
/**
 * Compress fruit-slice photographic assets to WebP at game resolution.
 * Fruits render at ~40px (radius 18 × 2.2); 256px covers 2× retina with headroom.
 */

import { readdir, stat, unlink } from 'node:fs/promises';
import { join, dirname, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRUIT_DIR = join(__dirname, '../src/games/fruit-slice/fruits');
const MAX = 256;
const WEBP_OPTS = { quality: 85, alphaQuality: 90, effort: 4 };

async function compress(file) {
  const src = join(FRUIT_DIR, file);
  const name = basename(file, extname(file));
  const dst = join(FRUIT_DIR, `${name}.webp`);
  const before = (await stat(src)).size;

  let pipeline = sharp(src).resize(MAX, MAX, { fit: 'inside', withoutEnlargement: true });
  if (name === 'banana') pipeline = pipeline.ensureAlpha();
  await pipeline.webp(WEBP_OPTS).toFile(dst);

  const after = (await stat(dst)).size;
  await unlink(src);
  console.log(`${file} → ${name}.webp  ${(before / 1024).toFixed(0)} KB → ${(after / 1024).toFixed(0)} KB`);
  return { before, after };
}

async function main() {
  const files = (await readdir(FRUIT_DIR)).filter((f) => /\.(jpe?g|png)$/i.test(f));
  let totalBefore = 0;
  let totalAfter = 0;
  for (const file of files) {
    const { before, after } = await compress(file);
    totalBefore += before;
    totalAfter += after;
  }
  console.log(`Total: ${(totalBefore / 1024 / 1024).toFixed(2)} MB → ${(totalAfter / 1024).toFixed(0)} KB`);
}

main().catch((e) => { console.error(e); process.exit(1); });

#!/usr/bin/env node
/**
 * Validate Memory Match card icons against the export spec in assets/memory-match/STYLE.md.
 *
 * Usage:
 *   node scripts/validate-memory-match-icons.mjs [directory]
 *   npm run icons:validate
 *   npm run icons:validate -- assets/memory-match/final/
 *
 * Default directory: assets/memory-match/
 *
 * Exit code 0 = all checks passed (warnings allowed).
 * Exit code 1 = one or more errors.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const CANVAS = 1024;
const FILL_MIN = 0.8;
const FILL_MAX = 0.92;
const MAX_BYTES_WARN = 400 * 1024;
const WHITE_LUMINANCE = 245;
const WHITE_ALPHA_MIN = 200;
const CORNER_SAMPLE = 8;

const EXPECTED_FILES = [
  'telebirr.png',
  'ethio-telecom.png',
  'mesob.png',
  'jebena.png',
  'nexsus.png',
  'teleconnect.png',
];

const dirArg = process.argv[2];
const iconDir = path.resolve(dirArg ? path.resolve(dirArg) : path.join(root, 'assets/memory-match'));

function fail(results, file, message) {
  results.errors.push({ file, message });
}

function warn(results, file, message) {
  results.warnings.push({ file, message });
}

function pass(results, file, message) {
  results.passes.push({ file, message });
}

function isNearWhite(r, g, b, a) {
  return a >= WHITE_ALPHA_MIN && r >= WHITE_LUMINANCE && g >= WHITE_LUMINANCE && b >= WHITE_LUMINANCE;
}

async function readRaw(filePath) {
  const buf = fs.readFileSync(filePath);
  const { data, info } = await sharp(buf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { buf, data, info };
}

function detectJpegMasqueradingAsPng(buf) {
  return buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
}

function sampleCorners(data, width, height, channels) {
  const points = [
    [0, 0],
    [width - CORNER_SAMPLE, 0],
    [0, height - CORNER_SAMPLE],
    [width - CORNER_SAMPLE, height - CORNER_SAMPLE],
  ];
  let whiteHits = 0;
  let samples = 0;

  for (const [ox, oy] of points) {
    for (let y = oy; y < oy + CORNER_SAMPLE; y++) {
      for (let x = ox; x < ox + CORNER_SAMPLE; x++) {
        const i = (y * width + x) * channels;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        samples++;
        if (isNearWhite(r, g, b, a)) whiteHits++;
      }
    }
  }

  return { whiteHits, samples, ratio: whiteHits / samples };
}

async function measureFillRatio(filePath) {
  const trimmed = await sharp(filePath).trim().toBuffer({ resolveWithObject: true });
  const { width, height } = trimmed.info;
  const fill = (width * height) / (CANVAS * CANVAS);
  return { fill, trimmedWidth: width, trimmedHeight: height };
}

async function validateFile(filePath, results) {
  const file = path.basename(filePath);
  const stat = fs.statSync(filePath);
  const buf = fs.readFileSync(filePath);

  if (detectJpegMasqueradingAsPng(buf)) {
    fail(results, file, 'File is JPEG data with a .png extension — export as true PNG-24 with alpha.');
    return;
  }
  pass(results, file, 'Not a JPEG masquerading as PNG.');

  let meta;
  try {
    meta = await sharp(buf).metadata();
  } catch (err) {
    fail(results, file, `Cannot read image: ${err.message}`);
    return;
  }

  if (meta.format !== 'png') {
    fail(results, file, `Expected PNG format, got ${meta.format ?? 'unknown'}.`);
  } else {
    pass(results, file, 'PNG format confirmed.');
  }

  if (meta.width !== CANVAS || meta.height !== CANVAS) {
    fail(results, file, `Expected ${CANVAS}×${CANVAS}, got ${meta.width}×${meta.height}.`);
  } else {
    pass(results, file, `${CANVAS}×${CANVAS} canvas.`);
  }

  const hasAlpha = meta.hasAlpha === true || meta.channels === 4;
  if (!hasAlpha) {
    fail(results, file, 'Missing alpha channel — export PNG-24 with transparency.');
  } else {
    pass(results, file, 'Alpha channel present.');
  }

  if (stat.size > MAX_BYTES_WARN) {
    warn(results, file, `File size ${(stat.size / 1024).toFixed(0)} KB exceeds ${MAX_BYTES_WARN / 1024} KB — consider pngquant or sharp compression.`);
  } else {
    pass(results, file, `File size ${(stat.size / 1024).toFixed(0)} KB.`);
  }

  const { data, info } = await readRaw(filePath);
  const corners = sampleCorners(data, info.width, info.height, info.channels);
  if (corners.ratio > 0.5) {
    fail(results, file, `Corners look like a white matte (${(corners.ratio * 100).toFixed(0)}% near-white pixels) — remove badge/plate/background.`);
  } else if (corners.ratio > 0.15) {
    warn(results, file, `Some corner pixels are near-white (${(corners.ratio * 100).toFixed(0)}%) — verify no halo on card back.`);
  } else {
    pass(results, file, 'Corners are transparent (no white plate detected).');
  }

  try {
    const { fill, trimmedWidth, trimmedHeight } = await measureFillRatio(filePath);
    const pct = (fill * 100).toFixed(1);
    if (fill < FILL_MIN || fill > FILL_MAX) {
      warn(
        results,
        file,
        `Subject fill ${pct}% (trimmed ${trimmedWidth}×${trimmedHeight}) — target ${FILL_MIN * 100}–${FILL_MAX * 100}% for visual balance.`,
      );
    } else {
      pass(results, file, `Subject fill ${pct}% (trimmed ${trimmedWidth}×${trimmedHeight}).`);
    }
  } catch {
    warn(results, file, 'Could not measure fill ratio (image may be fully transparent).');
  }
}

function printSection(title, items, symbol) {
  if (!items.length) return;
  console.log(`\n${title}`);
  for (const { file, message } of items) {
    console.log(`  ${symbol} ${file}: ${message}`);
  }
}

async function main() {
  if (!fs.existsSync(iconDir)) {
    console.error(`Directory not found: ${iconDir}`);
    console.error('Create it and add icons, or pass a path: npm run icons:validate -- path/to/icons/');
    process.exit(1);
  }

  const results = { errors: [], warnings: [], passes: [] };
  const present = fs.readdirSync(iconDir).filter((f) => f.endsWith('.png'));

  console.log(`Validating Memory Match icons in:\n  ${iconDir}\n`);

  for (const expected of EXPECTED_FILES) {
    if (!present.includes(expected)) {
      warn(results, expected, 'Missing — not yet produced.');
    }
  }

  const toValidate = present.length ? present : EXPECTED_FILES;
  for (const name of toValidate) {
    const filePath = path.join(iconDir, name);
    if (!fs.existsSync(filePath)) continue;
    await validateFile(filePath, results);
  }

  printSection('Passed', results.passes, '✓');
  printSection('Warnings', results.warnings, '!');
  printSection('Errors', results.errors, '✗');

  const summary = [
    `${results.passes.length} passed`,
    `${results.warnings.length} warnings`,
    `${results.errors.length} errors`,
  ].join(', ');

  console.log(`\nSummary: ${summary}`);

  if (results.errors.length) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

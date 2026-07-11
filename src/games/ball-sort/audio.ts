/** Ball Sort — premium WebAudio synth (same timing as shared sounds). */

import { sfx } from '../../engine/audio';

type Note = [freq: number, at: number, dur: number, type?: OscillatorType, vol?: number];

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (sfx.muted) return null;
  try {
    const Ctor = window.AudioContext
      || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = audioCtx || new Ctor();
    return audioCtx;
  } catch {
    return null;
  }
}

function playNotes(notes: Note[]): void {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  for (const [freq, at, dur, type = 'sine', vol = 0.1] of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = Math.min(4000, freq * 3);
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + at);
    gain.gain.exponentialRampToValueAtTime(vol, now + at + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + at + dur);
    osc.connect(filter).connect(gain).connect(ctx.destination);
    osc.start(now + at);
    osc.stop(now + at + dur + 0.02);
  }
}

export type BallSortSound = 'click' | 'good' | 'bad' | 'win' | 'pourStart' | 'pourLand' | 'pourComplete';

const SOUNDS: Record<BallSortSound, Note[]> = {
  click: [[880, 0, 0.04, 'sine', 0.08]],
  good: [[660, 0, 0.08, 'sine', 0.1], [880, 0.08, 0.1, 'sine', 0.09]],
  bad: [[240, 0, 0.16, 'triangle', 0.09]],
  win: [
    [523, 0, 0.1, 'sine', 0.1],
    [659, 0.1, 0.1, 'sine', 0.1],
    [784, 0.2, 0.1, 'sine', 0.09],
    [1047, 0.3, 0.18, 'sine', 0.11],
  ],
  pourStart: [[520, 0, 0.06, 'sine', 0.08], [640, 0.04, 0.08, 'sine', 0.07]],
  pourLand: [[300, 0, 0.05, 'sine', 0.08], [380, 0.05, 0.1, 'triangle', 0.07]],
  pourComplete: [[660, 0, 0.08, 'sine', 0.09], [880, 0.08, 0.12, 'sine', 0.09], [1100, 0.16, 0.14, 'sine', 0.08]],
};

export function ballSortSound(name: BallSortSound): void {
  playNotes(SOUNDS[name]);
}

export function isBallSortPage(): boolean {
  return document.body.dataset.game === 'ball-sort';
}

/** Route shared sound names to premium ball-sort audio when on ball-sort page. */
export function installBallSortAudio(): void {
  if (!isBallSortPage()) return;
  // Sounds are invoked via ballSortSound from runGame hooks — no monkey-patching needed.
}

export function ballSortPourSound(kind: 'start' | 'land' | 'complete'): void {
  const map: Record<typeof kind, BallSortSound> = {
    start: 'pourStart',
    land: 'pourLand',
    complete: 'pourComplete',
  };
  ballSortSound(map[kind]);
}

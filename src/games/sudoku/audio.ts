/** Sudoku — premium soft WebAudio synth (Ethio Telecom polish). */

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
  for (const [freq, at, dur, type = 'sine', vol = 0.09] of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = Math.min(3600, freq * 2.8);
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + at);
    gain.gain.exponentialRampToValueAtTime(vol, now + at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + at + dur);
    osc.connect(filter).connect(gain).connect(ctx.destination);
    osc.start(now + at);
    osc.stop(now + at + dur + 0.02);
  }
}

export type SudokuSound =
  | 'click'
  | 'select'
  | 'place'
  | 'good'
  | 'bad'
  | 'hint'
  | 'win'
  | 'victory'
  | 'menu';

const SOUNDS: Record<SudokuSound, Note[]> = {
  click: [[620, 0, 0.035, 'sine', 0.07]],
  select: [[740, 0, 0.04, 'sine', 0.075]],
  place: [[520, 0, 0.05, 'sine', 0.08], [780, 0.04, 0.07, 'sine', 0.06]],
  good: [[660, 0, 0.07, 'sine', 0.085], [880, 0.07, 0.09, 'sine', 0.08]],
  bad: [[280, 0, 0.12, 'triangle', 0.07]],
  hint: [[440, 0, 0.06, 'sine', 0.07], [550, 0.06, 0.08, 'sine', 0.065]],
  win: [
    [523, 0, 0.09, 'sine', 0.09],
    [659, 0.09, 0.09, 'sine', 0.085],
    [784, 0.18, 0.1, 'sine', 0.08],
    [988, 0.28, 0.16, 'sine', 0.075],
  ],
  victory: [
    [392, 0, 0.1, 'sine', 0.08],
    [523, 0.1, 0.1, 'sine', 0.085],
    [659, 0.2, 0.1, 'sine', 0.085],
    [784, 0.3, 0.12, 'sine', 0.08],
    [1047, 0.42, 0.2, 'sine', 0.09],
  ],
  menu: [[480, 0, 0.05, 'sine', 0.06], [600, 0.05, 0.06, 'sine', 0.055]],
};

export function sudokuSound(name: SudokuSound): void {
  playNotes(SOUNDS[name]);
}

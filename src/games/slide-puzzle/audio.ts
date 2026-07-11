/** Slide Puzzle — premium soft WebAudio synth (Ethio Telecom polish). */

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

export type SlideSound =
  | 'slide'
  | 'click'
  | 'good'
  | 'win'
  | 'victory'
  | 'menu';

const SOUNDS: Record<SlideSound, Note[]> = {
  slide: [[480, 0, 0.045, 'sine', 0.075], [620, 0.02, 0.05, 'sine', 0.055]],
  click: [[640, 0, 0.035, 'sine', 0.065]],
  good: [[580, 0, 0.06, 'sine', 0.08], [780, 0.05, 0.08, 'sine', 0.07], [920, 0.1, 0.09, 'sine', 0.065]],
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
    [1047, 0.42, 0.22, 'sine', 0.09],
  ],
  menu: [[460, 0, 0.05, 'sine', 0.06], [580, 0.05, 0.06, 'sine', 0.055]],
};

export function slideSound(name: SlideSound): void {
  playNotes(SOUNDS[name]);
}

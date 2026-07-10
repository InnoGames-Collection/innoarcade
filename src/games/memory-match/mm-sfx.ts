// Memory Match — themed UI sounds (Web Audio, no asset files).

import { settings } from '../../engine/settings';
import { sfx } from '../../engine/audio';

function vol(v: number): number {
  return v * settings.data.master * settings.data.sfx;
}

function tone(freq: number, dur: number, type: OscillatorType, v: number, freqEnd = freq): void {
  if (sfx.muted) return;
  const ac = getCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  const t0 = ac.currentTime;
  const peak = Math.max(vol(v), 0.0001);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), t0 + dur);
  gain.gain.setValueAtTime(peak, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur);
}

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (sfx.muted) return null;
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') void audioCtx.resume();
  return audioCtx;
}

export const mmSfx = {
  click(): void {
    tone(520, 0.04, 'sine', 0.07, 680);
  },
  flip(): void {
    tone(320, 0.12, 'sine', 0.09, 620);
  },
  match(): void {
    tone(784, 0.1, 'sine', 0.11, 1175);
    window.setTimeout(() => tone(988, 0.14, 'sine', 0.09, 1318), 70);
  },
  nomatch(): void {
    tone(220, 0.18, 'sine', 0.08, 140);
  },
  win(): void {
    [523, 659, 784, 1046].forEach((f, i) => {
      window.setTimeout(() => tone(f, 0.22, 'sine', 0.1), i * 90);
    });
  },
  lose(): void {
    tone(180, 0.28, 'sine', 0.1, 90);
  },
  timeWarning(): void {
    tone(440, 0.06, 'square', 0.06);
  },
  toggleMute(): boolean {
    return sfx.toggleMute();
  },
  isMuted(): boolean {
    return sfx.muted;
  },
};

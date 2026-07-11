// Ethiopian Quiz — premium synthesized SFX (scoped to this game only).

import { settings } from '../../engine/settings';

const MUTE_KEY = 'innoarcade.muted';

class EqSounds {
  private ctx: AudioContext | null = null;
  muted = localStorage.getItem(MUTE_KEY) === '1';

  toggleMute(): boolean {
    this.muted = !this.muted;
    localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');
    return this.muted;
  }

  private ensureCtx(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private vol(v: number): number {
    return v * settings.data.master * settings.data.sfx;
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    vol: number,
    freqEnd = freq,
    attack = 0.01,
  ): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t0 = ctx.currentTime;
    const peak = Math.max(this.vol(vol), 0.0001);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), t0 + dur);
    }
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(peak, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private chord(notes: [number, number, OscillatorType, number][], stagger = 0.028): void {
    notes.forEach(([f, d, type, v], i) => {
      setTimeout(() => this.tone(f, d, type, v, f * 1.02), i * stagger * 1000);
    });
  }

  menuClick(): void {
    this.tone(680, 0.05, 'sine', 0.1, 920);
  }

  select(): void {
    this.tone(520, 0.06, 'sine', 0.11, 780);
  }

  correct(): void {
    this.chord([
      [523, 0.12, 'sine', 0.11],
      [659, 0.14, 'sine', 0.1],
      [784, 0.18, 'triangle', 0.09],
    ]);
  }

  wrong(): void {
    this.tone(220, 0.22, 'sine', 0.12, 160);
    setTimeout(() => this.tone(180, 0.15, 'triangle', 0.07, 140), 60);
  }

  tick(): void {
    this.tone(440, 0.05, 'sine', 0.08, 520);
  }

  timeUp(): void {
    this.tone(280, 0.28, 'sawtooth', 0.1, 120);
  }

  victory(): void {
    this.chord([
      [392, 0.18, 'sine', 0.1],
      [523, 0.18, 'sine', 0.1],
      [659, 0.22, 'sine', 0.11],
      [784, 0.28, 'triangle', 0.12],
    ], 0.12);
  }

  gameOver(): void {
    this.tone(330, 0.35, 'sine', 0.1, 220);
  }

  transition(): void {
    this.tone(400, 0.08, 'sine', 0.07, 600);
  }
}

export const eqSfx = new EqSounds();

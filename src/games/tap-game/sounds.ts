// Tap Game — premium synthesized SFX (scoped to this game only).

import { settings } from '../../engine/settings';

const MUTE_KEY = 'innoarcade.muted';

class TapSounds {
  private ctx: AudioContext | null = null;

  private ensureCtx(): AudioContext | null {
    if (localStorage.getItem(MUTE_KEY) === '1') return null;
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
    attack = 0.008,
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

  private chord(notes: [number, number, OscillatorType, number][], stagger = 0.025): void {
    notes.forEach(([f, d, type, v], i) => {
      setTimeout(() => this.tone(f, d, type, v, f * 1.02), i * stagger * 1000);
    });
  }

  tap(): void {
    this.tone(1040, 0.06, 'sine', 0.14, 1380);
  }

  golden(): void {
    this.chord([
      [880, 0.1, 'sine', 0.12],
      [1320, 0.12, 'sine', 0.1],
      [1760, 0.14, 'triangle', 0.08],
    ]);
  }

  poison(): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const dur = 0.28;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / data.length;
      data[i] = (Math.random() * 2 - 1) * (1 - t) * (1 - t);
    }
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600;
    src.buffer = buffer;
    gain.gain.value = this.vol(0.35);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start();
    this.tone(180, 0.2, 'sawtooth', 0.08, 90);
  }

  click(): void {
    this.tone(720, 0.04, 'sine', 0.1, 960);
  }

  countdown(): void {
    this.tone(520, 0.08, 'sine', 0.1, 680);
  }

  win(): void {
    this.chord([
      [523, 0.15, 'sine', 0.1],
      [659, 0.15, 'sine', 0.1],
      [784, 0.2, 'sine', 0.12],
      [1047, 0.3, 'triangle', 0.1],
    ], 0.06);
  }

  lose(): void {
    this.tone(440, 0.25, 'sine', 0.12, 220);
    setTimeout(() => this.tone(330, 0.35, 'sine', 0.1, 165), 120);
  }

  highScore(): void {
    this.chord([
      [784, 0.12, 'sine', 0.1],
      [988, 0.12, 'sine', 0.1],
      [1175, 0.15, 'sine', 0.1],
      [1568, 0.35, 'triangle', 0.12],
    ], 0.05);
  }
}

export const tapSfx = new TapSounds();

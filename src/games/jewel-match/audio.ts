// Premium crystal-themed audio for Jewel Match — presentation layer only.

import { settings } from '../../engine/settings';

const MUTE_KEY = 'innoarcade.muted';

class JewelMatchAudio {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private musicTimer = 0;
  muted = localStorage.getItem(MUTE_KEY) === '1';

  toggleMute(): boolean {
    this.muted = !this.muted;
    localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');
    if (this.muted) this.stopMusic();
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

  private chord(freqs: number[], dur: number, vol: number, type: OscillatorType = 'sine'): void {
    freqs.forEach((f, i) => {
      window.setTimeout(() => this.tone(f, dur, type, vol / freqs.length, f * 1.02), i * 18);
    });
  }

  swap(): void {
    this.tone(640, 0.08, 'sine', 0.1, 880, 0.005);
    this.tone(1200, 0.04, 'sine', 0.04, 1400, 0.003);
  }

  invalidSwap(): void {
    this.tone(360, 0.14, 'sine', 0.08, 200, 0.01);
  }

  match(size: number): void {
    const base = 520 + Math.min(size, 6) * 50;
    this.chord([base, base * 1.26, base * 1.5], 0.2, 0.14, 'triangle');
  }

  combo(level: number): void {
    const base = 600 + level * 70;
    this.chord([base, base * 1.22, base * 1.5, base * 2], 0.3, 0.16, 'triangle');
    this.tone(base * 2.5, 0.15, 'sine', 0.06, base * 3, 0.005);
  }

  crystalBreak(): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const dur = 0.18;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / data.length;
      data[i] = (Math.random() * 2 - 1) * (1 - t) ** 2;
    }
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2000;
    filter.Q.value = 0.6;
    src.buffer = buffer;
    gain.gain.value = this.vol(0.18);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start();
    this.tone(1040, 0.12, 'sine', 0.07, 1560, 0.003);
  }

  celebration(): void {
    const notes = [587, 740, 880, 1175];
    notes.forEach((n, i) => {
      window.setTimeout(() => this.tone(n, 0.22, 'triangle', 0.12, n * 1.05), i * 90);
    });
  }

  buttonClick(): void {
    this.tone(780, 0.05, 'sine', 0.07, 980, 0.003);
  }

  menuOpen(): void {
    this.tone(440, 0.14, 'sine', 0.06, 660, 0.01);
    window.setTimeout(() => this.tone(660, 0.1, 'sine', 0.05, 880, 0.005), 80);
  }

  reward(): void {
    this.chord([440, 554, 659, 880], 0.35, 0.13, 'triangle');
  }

  levelComplete(): void {
    const melody = [587, 740, 880, 1175, 1480];
    melody.forEach((n, i) => {
      window.setTimeout(() => this.tone(n, 0.3, 'triangle', 0.11, n * 1.02), i * 110);
    });
  }

  gameOver(): void {
    this.tone(370, 0.35, 'sine', 0.1, 260, 0.02);
    window.setTimeout(() => this.tone(280, 0.4, 'sine', 0.08, 200, 0.02), 200);
  }

  uiTick(): void {
    this.tone(960, 0.03, 'sine', 0.04, 1200, 0.002);
  }

  startMusic(): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    this.stopMusic();
    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = settings.data.master * settings.data.music * 0.15;
    this.musicGain.connect(ctx.destination);
    const pattern = [0, 440, 0, 554, 0, 659, 0, 554, 440, 0, 370, 0, 440, 0];
    const bpm = 82;
    const beat = 60 / bpm;
    let i = 0;
    const step = (): void => {
      if (!this.musicGain) return;
      const freq = pattern[i % pattern.length];
      i++;
      if (freq > 0) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        const t0 = ctx.currentTime;
        osc.type = 'sine';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(0.6, t0 + 0.03);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + beat * 0.85);
        osc.connect(g).connect(this.musicGain);
        osc.start(t0);
        osc.stop(t0 + beat);
      }
      this.musicTimer = window.setTimeout(step, beat * 1000);
    };
    step();
  }

  stopMusic(): void {
    if (this.musicTimer) { clearTimeout(this.musicTimer); this.musicTimer = 0; }
    if (this.musicGain) { this.musicGain.disconnect(); this.musicGain = null; }
  }
}

export const jmSfx = new JewelMatchAudio();

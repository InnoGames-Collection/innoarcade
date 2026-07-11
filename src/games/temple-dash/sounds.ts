// EthioRunner premium arcade SFX — synthesized Web Audio, no asset files.
// Visual/audio only; does not affect gameplay.

import { settings } from '../../engine/settings';

const MUTE_KEY = 'innoarcade.muted';

class TdSfx {
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
    freq: number, dur: number, type: OscillatorType, vol: number,
    freqEnd = freq, attack = 0.008,
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

  private noise(dur: number, vol: number, filterFreq = 800): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = 0.8;
    src.buffer = buffer;
    gain.gain.value = this.vol(vol);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start();
  }

  coin(): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const freqs = [1047, 1319, 1568];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      const peak = this.vol(0.09 - i * 0.02);
      gain.gain.setValueAtTime(0.0001, t0 + i * 0.025);
      gain.gain.linearRampToValueAtTime(peak, t0 + i * 0.025 + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + i * 0.025 + 0.14);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0 + i * 0.025);
      osc.stop(t0 + i * 0.025 + 0.16);
    });
  }

  jump(): void {
    this.tone(220, 0.22, 'sine', 0.18, 680, 0.012);
    this.tone(440, 0.12, 'triangle', 0.06, 880, 0.02);
  }

  slide(): void {
    this.tone(380, 0.2, 'sine', 0.14, 120, 0.015);
    this.noise(0.12, 0.06, 600);
  }

  click(): void {
    this.tone(720, 0.06, 'sine', 0.1, 960, 0.003);
  }

  crash(): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    this.noise(0.4, 0.35, 400);
    this.tone(180, 0.35, 'sawtooth', 0.12, 60, 0.01);
    this.tone(90, 0.5, 'square', 0.08, 40, 0.02);
  }

  footstep(): void {
    this.noise(0.04, 0.04, 500);
    this.tone(80, 0.05, 'sine', 0.03, 60, 0.005);
  }

  land(): void {
    this.noise(0.08, 0.08, 700);
    this.tone(120, 0.1, 'sine', 0.05, 80, 0.005);
  }

  victory(): void {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.25, 'sine', 0.12, f * 1.01, 0.01), i * 90);
    });
  }

  countdown(): void {
    this.tone(440, 0.12, 'sine', 0.1, 440, 0.005);
  }

  startMusic(): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    this.stopMusic();
    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = settings.data.master * settings.data.music * 0.22;
    this.musicGain.connect(ctx.destination);

    // Ethiopian-inspired pentatonic loop
    const pattern = [262, 294, 330, 392, 440, 392, 330, 294];
    const bpm = 108;
    const beat = 60 / bpm;
    let i = 0;
    const step = (): void => {
      if (!this.musicGain) return;
      const freq = pattern[i % pattern.length];
      i++;
      if (freq > 0) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1200;
        const t0 = ctx.currentTime;
        osc.type = 'triangle';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(1, t0 + 0.025);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + beat * 0.85);
        osc.connect(g).connect(filter).connect(this.musicGain!);
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

  syncMusicVolume(): void {
    if (this.musicGain) {
      this.musicGain.gain.value = settings.data.master * settings.data.music * 0.22;
    }
  }
}

export const tdSfx = new TdSfx();

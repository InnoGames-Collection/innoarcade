// Premium Sky Hopper SFX — crisp arcade-quality synthesized sounds (presentation only).

import { settings } from '../../engine/settings';

const MUTE_KEY = 'innoarcade.muted';

class SkyHopperAudio {
  private ctx: AudioContext | null = null;
  muted = localStorage.getItem(MUTE_KEY) === '1';

  syncMute(muted: boolean): void {
    this.muted = muted;
  }

  private ensureCtx(): AudioContext | null {
    this.muted = localStorage.getItem(MUTE_KEY) === '1';
    if (this.muted) return null;
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private vol(v: number): number {
    return v * settings.data.master * settings.data.sfx;
  }

  /** Crisp upward jump whoosh. */
  jump(): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const peak = Math.max(this.vol(0.22), 0.0001);

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, t0);
    osc.frequency.exponentialRampToValueAtTime(680, t0 + 0.14);
    g.gain.setValueAtTime(peak, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.16);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.16);

    const noise = ctx.createBufferSource();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    noise.buffer = buf;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(peak * 0.15, t0);
    ng.gain.exponentialRampToValueAtTime(0.001, t0 + 0.04);
    noise.connect(ng).connect(ctx.destination);
    noise.start(t0);
    noise.stop(t0 + 0.04);
  }

  /** Soft platform landing thud. */
  land(): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const peak = Math.max(this.vol(0.16), 0.0001);

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t0);
    osc.frequency.exponentialRampToValueAtTime(90, t0 + 0.08);
    g.gain.setValueAtTime(peak, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.1);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.1);
  }

  /** Perfect jump sparkle chime. */
  perfectJump(): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const peak = Math.max(this.vol(0.24), 0.0001);

    [784, 988, 1175].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      const start = t0 + i * 0.025;
      g.gain.setValueAtTime(peak * (1 - i * 0.15), start);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.14);
      osc.connect(g).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.14);
    });
  }

  /** Combo milestone reward. */
  comboReward(tier: number): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const freqs = [523, 659, 784, 1047];
    const f = freqs[Math.min(tier, freqs.length - 1)];
    const t0 = ctx.currentTime;
    const peak = Math.max(this.vol(0.18 + tier * 0.025), 0.0001);

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = f;
    g.gain.setValueAtTime(peak, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.2);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.2);
  }

  /** Coin / score pickup ping. */
  coin(): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const peak = Math.max(this.vol(0.14), 0.0001);

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, t0);
    osc.frequency.exponentialRampToValueAtTime(1320, t0 + 0.06);
    g.gain.setValueAtTime(peak, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.08);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.08);
  }

  /** UI button click. */
  click(): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const peak = Math.max(this.vol(0.1), 0.0001);

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, t0);
    osc.frequency.exponentialRampToValueAtTime(800, t0 + 0.04);
    g.gain.setValueAtTime(peak, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.05);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.05);
  }

  pause(): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const peak = Math.max(this.vol(0.12), 0.0001);

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, t0);
    osc.frequency.exponentialRampToValueAtTime(330, t0 + 0.1);
    g.gain.setValueAtTime(peak, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.12);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.12);
  }

  resume(): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const peak = Math.max(this.vol(0.12), 0.0001);

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(330, t0);
    osc.frequency.exponentialRampToValueAtTime(523, t0 + 0.1);
    g.gain.setValueAtTime(peak, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.12);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.12);
  }

  /** Game over descending sting. */
  gameOver(): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const peak = Math.max(this.vol(0.28), 0.0001);

    [440, 349, 262, 196].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = f;
      const start = t0 + i * 0.1;
      g.gain.setValueAtTime(peak, start);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
      osc.connect(g).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.22);
    });
  }

  /** New high score celebration fanfare. */
  newHighScore(): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const peak = Math.max(this.vol(0.26), 0.0001);

    [523, 659, 784, 1047, 1319].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      const start = t0 + i * 0.08;
      g.gain.setValueAtTime(peak * (1 - i * 0.08), start);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
      osc.connect(g).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.25);
    });
  }
}

export const skySfx = new SkyHopperAudio();

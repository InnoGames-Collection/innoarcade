// Rendering-engine types — read-only snapshots from the frozen game engine.

export const RW = 480;
export const RH = 720;

export type FruitType = 'apple' | 'banana' | 'cherry' | 'orange' | 'peach';

export type ParticleKind = 'juice' | 'pulp' | 'seed' | 'spark' | 'droplet' | 'glow' | 'mist';

export interface VfxParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  kind: ParticleKind;
  rotation: number;
  rotSpeed: number;
}

export interface RenderFruit {
  x: number;
  y: number;
  type: FruitType;
  sliced: boolean;
  sliceTime: number;
  rot: number;
}

export interface RenderBomb {
  x: number;
  y: number;
  hit: boolean;
}

export interface RenderSlice {
  points: Array<{ x: number; y: number }>;
  createdAt: number;
}

/** Floating score text — presentation only. */
export interface ScorePopup {
  x: number;
  y: number;
  text: string;
  life: number;
  maxLife: number;
  drift: number;
}

/** Immutable frame description produced by the game engine each render tick. */
export interface RenderSnapshot {
  time: number;
  combo: number;
  comboFlash: number;
  screenShake: number;
  screenPulse: number;
  fruits: RenderFruit[];
  bombs: RenderBomb[];
  particles: VfxParticle[];
  slices: RenderSlice[];
  currentSlice: Array<{ x: number; y: number }>;
  scorePopups: ScorePopup[];
  fruitRadius: number;
  bombRadius: number;
}

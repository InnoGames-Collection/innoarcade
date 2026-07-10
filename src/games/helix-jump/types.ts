export type GameState = 'menu' | 'playing' | 'paused' | 'over';

export interface Ring {
  id: number;
  y: number;
  gapStart: number;
  /** Per-ring gap size (rad) — enables narrow/large gap variety. */
  gapArc: number;
  colorIndex: number;
  dangerStart: number;
  dangerArc: number;
  /** Vertical oscillation amplitude (0 = static). */
  moveAmp: number;
  movePhase: number;
  /** Auto-rotation boost while ball is near this ring (rad/s). */
  spinVel: number;
  broken: boolean;
  breakAnim: number;
}

export interface BallState {
  y: number;
  vy: number;
  squash: number;
  squashVel: number;
  /** Visual roll from vertical travel (rad). */
  rollAngle: number;
  /** Velocity stretch 0–1 for fall/rise smear. */
  stretch: number;
  colorIndex: number;
}

export interface CollisionHit {
  ring: Ring;
  screenY: number;
  passedGap: boolean;
  bounced: boolean;
  smashed: boolean;
  died: boolean;
  perfect: boolean;
  impactSpeed: number;
}

export interface LandingFx {
  shake: number;
  particleCount: number;
  spread: number;
  squash: number;
  squashVel: number;
}

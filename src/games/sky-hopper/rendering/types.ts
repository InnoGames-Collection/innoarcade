export const RW = 480;
export const RH = 720;

export interface ScorePopup {
  x: number;
  y: number;
  text: string;
  life: number;
  maxLife: number;
  drift: number;
}

export interface PlatformVisual {
  squash: number;
}

export interface PlayerVisual {
  squashY: number;
  stretchX: number;
  breathPhase: number;
  landBounce: number;
  facing: number;
}

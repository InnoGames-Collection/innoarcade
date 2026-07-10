import { loadSave, type HelixSave } from './saveData';

export interface BallSkin {
  id: string;
  name: string;
  color: string;
  cost: number;
}

export const BALL_SKINS: BallSkin[] = [
  { id: 'classic', name: 'Violet', color: '#b24bf3', cost: 0 },
  { id: 'bubblegum', name: 'Bubblegum', color: '#ff5c8a', cost: 0 },
  { id: 'ocean', name: 'Ocean', color: '#00d4ff', cost: 150 },
  { id: 'sunburst', name: 'Sunburst', color: '#ffd93d', cost: 200 },
  { id: 'mint', name: 'Mint', color: '#4dffb8', cost: 250 },
  { id: 'gold', name: 'Gold', color: '#ffb347', cost: 400 },
  { id: 'coral', name: 'Coral', color: '#ff8c42', cost: 500 },
];

export function getBallSkin(save: HelixSave): BallSkin {
  const skin = BALL_SKINS.find((s) => s.id === save.selectedSkin);
  return skin ?? BALL_SKINS[0];
}

export function unlockableSkins(save: HelixSave): BallSkin[] {
  return BALL_SKINS.filter((s) => save.unlockedSkins.includes(s.id));
}

export function tryUnlockSkin(save: HelixSave, skinId: string): boolean {
  const skin = BALL_SKINS.find((s) => s.id === skinId);
  if (!skin || save.unlockedSkins.includes(skinId)) return false;
  if (save.coins < skin.cost) return false;
  save.coins -= skin.cost;
  save.unlockedSkins.push(skinId);
  return true;
}

export function ballColorForSave(): string {
  return getBallSkin(loadSave()).color;
}

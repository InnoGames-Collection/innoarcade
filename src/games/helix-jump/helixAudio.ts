/**
 * Helix Jump — event-driven audio using synthesized Web Audio (no cloned assets).
 */

import { sfx } from '../../engine/audio';
import { loadSave } from './saveData';

const FEVER_PATTERN = [196, 247, 294, 330, 294, 247];
const BASE_PATTERN = [165, 196, 220, 196];

let feverMusic = false;

function musicAllowed(): boolean {
  return loadSave().musicOn && !sfx.muted;
}

export const helixAudio = {
  startSession(): void {
    if (!musicAllowed()) return;
    feverMusic = false;
    sfx.startMusic(BASE_PATTERN, 108);
  },

  stopSession(): void {
    sfx.stopMusic();
    feverMusic = false;
  },

  land(impact: number): void {
    if (impact > 12) sfx.jump();
    else sfx.coin();
  },

  gapPass(combo: number): void {
    sfx.coin();
    if (combo >= 4) sfx.slide();
  },

  breakPlatform(): void {
    sfx.slide();
  },

  feverStart(): void {
    sfx.jump();
    if (musicAllowed() && !feverMusic) {
      feverMusic = true;
      sfx.startMusic(FEVER_PATTERN, 128);
    }
  },

  gameOver(): void {
    sfx.crash();
    feverMusic = false;
    sfx.stopMusic();
  },

  newBest(): void {
    for (let i = 0; i < 3; i++) {
      setTimeout(() => sfx.coin(), i * 90);
    }
  },

  click(): void {
    sfx.click();
  },

  syncMusic(): void {
    sfx.syncMusicVolume();
    if (!musicAllowed()) sfx.stopMusic();
    else if (!feverMusic) sfx.startMusic(BASE_PATTERN, 108);
  },
};

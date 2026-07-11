export { SkyBackground } from './drawBackground';
export { drawPlatforms } from './drawPlatforms';
export { drawPlayer, updatePlayerVisual, triggerLandSquash, triggerJumpStretch } from './drawPlayer';
export { drawEnemies } from './drawEnemies';
export {
  updateScorePopups, drawScorePopups, scorePopupText, spawnScorePopup,
} from './drawScoreFeedback';
export {
  drawAmbientGlow, drawColorGrade, drawVignette,
  drawSparkles, spawnSparkles, updateSparkles,
  type Sparkle,
} from './drawEffects';
export type { ScorePopup, PlayerVisual } from './types';

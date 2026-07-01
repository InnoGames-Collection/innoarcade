// Shared scoring for brain / puzzle games (time bonus + mistake penalty).

/** Single-puzzle completion: base + seconds remaining in budget − mistake penalty. */
export function puzzleCompletionScore(
  elapsedMs: number,
  mistakes = 0,
  opts?: { base?: number; budgetSec?: number; mistakePenalty?: number },
): number {
  const base = opts?.base ?? 100;
  const budget = opts?.budgetSec ?? 600;
  const penalty = opts?.mistakePenalty ?? 15;
  const elapsedSec = Math.floor(elapsedMs / 1000);
  const timeBonus = Math.max(0, budget - elapsedSec);
  return Math.max(1, base + timeBonus - mistakes * penalty);
}

/** Multi-puzzle session: solved × points + seconds remaining in session budget. */
export function multiPuzzleScore(
  solved: number,
  elapsedMs: number,
  opts?: { pointsPerPuzzle?: number; budgetSec?: number },
): number {
  const ppt = opts?.pointsPerPuzzle ?? 10;
  const budget = opts?.budgetSec ?? 180;
  const elapsedSec = Math.floor(elapsedMs / 1000);
  return solved * ppt + Math.max(0, budget - elapsedSec);
}

export function formatTimeMmSs(ms: number): string {
  const secs = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
}

export function puzzleScoreSummary(
  elapsedMs: number,
  score: number,
  mistakes = 0,
): string {
  return `Solved in ${formatTimeMmSs(elapsedMs)} · +${score} pts${mistakes ? ` · ${mistakes} mistakes` : ''}`;
}

export function multiScoreSummary(
  solved: number,
  total: number,
  elapsedMs: number,
  score: number,
  budgetSec = 180,
): string {
  const left = Math.max(0, Math.round(budgetSec - elapsedMs / 1000));
  return `${solved}/${total} solved · ${left}s left · ${score} pts`;
}

// Per-game high score — session-only, in-memory. The economy is server-only:
// the authoritative best/leaderboard lives in Supabase (submit-score → scores
// view, surfaced via platform/backend.ts). This just tracks the best score seen
// in the CURRENT session so a game can flash "new record" and show a live best;
// it intentionally does NOT persist (no localStorage, no local scoring).

const sessionBest: Record<string, number> = {};

export function getHighScore(game: string): number {
  return sessionBest[game] ?? 0;
}

// Returns true when the score beats this session's best.
export function setHighScore(game: string, score: number): boolean {
  if (score <= getHighScore(game)) return false;
  sessionBest[game] = score;
  return true;
}

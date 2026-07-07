// One-time first-run hints for new games (client-only, non-scoring).

const KEY = (gameId: string): string => `goplay.hint.${gameId}`;

export function isFirstRun(gameId: string): boolean {
  try {
    return !localStorage.getItem(KEY(gameId));
  } catch {
    return false;
  }
}

export function markFirstRunSeen(gameId: string): void {
  try {
    localStorage.setItem(KEY(gameId), '1');
  } catch { /* storage unavailable */ }
}

/** Show a toast once per device for this game. */
export function showFirstRunToast(
  gameId: string,
  message: string,
  toastFn: (msg: string, ms?: number) => void,
  ms = 5000,
): void {
  if (!isFirstRun(gameId)) return;
  markFirstRunSeen(gameId);
  toastFn(message, ms);
}

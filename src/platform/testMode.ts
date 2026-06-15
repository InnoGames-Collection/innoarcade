// Test mode — a local QA switch so the whole catalog can be played through end
// to end without real coins or losing streaks. When ON:
//   • chance games are forced to win (GameHost reports winRate = 100), and
//   • paid tournament entry is waived (GameHost.begin() passes for free),
// so every game is reachable and beatable for a demo/QA pass. It is purely
// client-side (localStorage) and never affects other players or the server.
//
// Enable via the hub Settings → "Test mode" toggle, or the `?test=1` URL param
// (handy for deep-linking straight into a game page in test mode).

const KEY = 'innoarcade.testMode.v1';

export function isTestMode(): boolean {
  try {
    if (new URLSearchParams(location.search).get('test') === '1') return true;
  } catch { /* no location (SSR/test) — fall through to storage */ }
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}

export function setTestMode(on: boolean): void {
  try {
    if (on) localStorage.setItem(KEY, '1');
    else localStorage.removeItem(KEY);
  } catch { /* storage unavailable — nothing to persist */ }
}

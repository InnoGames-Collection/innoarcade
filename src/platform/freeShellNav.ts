// In-shell close / back navigation for free games — one window back at a time.

import { t } from '../i18n';

export type FreeShellPhase = 'menu' | 'playing' | 'paused' | 'over';

const HUB_URL = '../../';

export interface FreeShellNavHandlers {
  getPhase: () => FreeShellPhase;
  /** Visible in-game overlay key (paused, levelClear, over, …). */
  getOverlay?: () => string | null;
  goMenu: () => void;
  /** Dismiss pause overlay and return to the round. */
  resumePlaying?: () => void;
  /** Called when leaving an active round; return false to cancel. */
  confirmAbandon?: () => boolean;
}

export function goHub(): void {
  location.href = HUB_URL;
}

/** Push a history entry so the hardware back button can step in-shell first. */
export function pushShellHistory(): void {
  history.pushState({ innoShell: 1 }, '', location.href);
}

function isShellRoot(handlers: FreeShellNavHandlers): boolean {
  if (handlers.getOverlay?.()) return false;
  return handlers.getPhase() === 'menu';
}

/** Go back exactly one shell window (overlay → playing → menu → hub). */
export function goBackOne(handlers: FreeShellNavHandlers): void {
  const overlay = handlers.getOverlay?.();

  if (overlay === 'paused') {
    handlers.resumePlaying?.();
    return;
  }
  if (overlay === 'levelClear' || overlay === 'over') {
    handlers.goMenu();
    return;
  }

  const phase = handlers.getPhase();
  if (phase === 'menu') {
    goHub();
  } else if (phase === 'over') {
    handlers.goMenu();
  } else if (phase === 'paused') {
    handlers.resumePlaying?.() ?? handlers.goMenu();
  } else if (phase === 'playing') {
    if (handlers.confirmAbandon?.() === false) return;
    handlers.goMenu();
  }
}

/** Mirror hardware / browser back to the same one-window stack as close buttons. */
export function wireFreeShellBackNavigation(handlers: FreeShellNavHandlers): void {
  pushShellHistory();
  window.addEventListener('popstate', () => {
    if (isShellRoot(handlers)) {
      goHub();
      return;
    }
    goBackOne(handlers);
    if (!isShellRoot(handlers)) {
      pushShellHistory();
    }
  });
}

/** Wire all close buttons inside a free-game stage. */
export function wireFreeShellCloseButtons(
  stage: HTMLElement,
  handlers: FreeShellNavHandlers,
): void {
  const onClose = (e: Event): void => {
    e.preventDefault();
    e.stopImmediatePropagation();
    goBackOne(handlers);
  };

  stage.querySelectorAll<HTMLElement>('.gp-close, .gp-close-corner').forEach((btn) => {
    btn.removeAttribute('onclick');
    btn.addEventListener('click', onClose);
  });
}

export function confirmAbandonRun(message?: string): boolean {
  return window.confirm(message ?? t('shell.abandonRun'));
}

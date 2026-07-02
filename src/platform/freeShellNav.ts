// In-shell close navigation for free games — return to menu/pause/hub instead of history.back().

import { t } from '../i18n';

export type FreeShellPhase = 'menu' | 'playing' | 'paused' | 'over';

const HUB_URL = '../../';

export interface FreeShellNavHandlers {
  getPhase: () => FreeShellPhase;
  goMenu: () => void;
  /** Called when closing while playing; return false to cancel. */
  confirmAbandon?: () => boolean;
}

function goHub(): void {
  if (history.length > 1) history.back();
  else location.href = HUB_URL;
}

/** Wire all close buttons inside a free-game stage. */
export function wireFreeShellCloseButtons(
  stage: HTMLElement,
  handlers: FreeShellNavHandlers,
): void {
  const playingClose = stage.querySelector('#closeBtn');
  playingClose?.removeAttribute('onclick');
  playingClose?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    if (handlers.getPhase() !== 'playing') return;
    if (handlers.confirmAbandon?.() === false) return;
    handlers.goMenu();
  });

  stage.querySelectorAll<HTMLElement>('.gp-close, .gp-close-corner').forEach((btn) => {
    if (btn.id === 'closeBtn') return;
    btn.removeAttribute('onclick');
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const phase = handlers.getPhase();
      if (phase === 'menu' || phase === 'over') goHub();
      else if (phase === 'paused') handlers.goMenu();
      else if (phase === 'playing') {
        if (handlers.confirmAbandon?.() === false) return;
        handlers.goMenu();
      }
    });
  });
}

export function confirmAbandonRun(message?: string): boolean {
  return window.confirm(message ?? t('shell.abandonRun'));
}

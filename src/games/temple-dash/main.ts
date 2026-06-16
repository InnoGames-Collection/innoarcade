import '../../styles/base.css';
import './style.css';
import { applyTranslations, getLang, t } from '../../i18n';
import { GameLoop } from '../../engine/loop';
import { Input } from '../../engine/input';
import { Viewport } from '../../engine/viewport';
import { AssetStore } from '../../engine/assets';
import { Preloader } from '../../ui/preloader';
import { SettingsPanel } from '../../ui/settingsPanel';
import { registerPwa } from '../../engine/pwa';
import { fetchSkins, setSkinRemote } from '../../platform/backend';
import { achievements } from '../../engine/achievements';
import { sfx } from '../../engine/audio';
import { TempleDash, W, H, GAME_ID, SKINS, TD_ACHIEVEMENTS, type GameState } from './game';
import { sheetDefs } from './art';

const $ = <T extends HTMLElement>(sel: string): T => document.querySelector<T>(sel)!;

registerPwa();
achievements.register(TD_ACHIEVEMENTS);

void boot();

async function boot(): Promise<void> {
  const pre = new Preloader('Temple Dash');
  const assets = new AssetStore();
  await assets.load(sheetDefs(), (p) => pre.set(p));
  pre.done();
  run(assets);
}

function run(assets: AssetStore): void {
  const canvas = $('#game') as unknown as HTMLCanvasElement;
  const vp = new Viewport(canvas, W, H);
  const ctx = vp.ctx;
  const game = new TempleDash(assets);

  const settingsPanel = new SettingsPanel();

  achievements.onUnlock = (def) => {
    const title = getLang() === 'am' ? def.titleAm : def.titleEn;
    showToast(`🏆 ${title}`);
  };

  // --- HUD ---
  const scoreVal = $('#scoreVal');
  const coinsVal = $('#coinsVal');
  const biomeVal = $('#biomeVal');
  const powerChips = $('#powerChips');
  let chipSig = '';

  const overlays: Record<string, HTMLElement> = {
    menu: $('#menuOverlay'),
    paused: $('#pauseOverlay'),
    over: $('#overOverlay'),
  };
  function showOverlay(state: GameState): void {
    for (const [k, el] of Object.entries(overlays)) el.classList.toggle('hidden', k !== state);
  }

  game.onStateChange = (s) => {
    showOverlay(s);
    if (s === 'over' || s === 'menu') buildShop();
  };
  game.onGameOver = (score, coins, record) => {
    $('#finalScore').textContent = String(score);
    $('#finalCoins').textContent = String(coins);
    $('#finalBest').textContent = String(game.best);
    $('#newBest').classList.toggle('hidden', !record);
  };

  // --- input ---
  const input = new Input(document.body);
  input.onAction((a) => {
    if (a === 'pause') {
      if (game.state === 'playing') game.pause();
      else if (game.state === 'paused') game.resume();
      return;
    }
    game.handleAction(a);
  });

  // --- buttons ---
  let ftueSeen = false; // session-only (no local storage)
  function beginPlay(): void {
    if (!ftueSeen) { $('#ftue').classList.remove('hidden'); return; }
    game.start();
  }
  $('#startBtn').addEventListener('click', beginPlay);
  $('#ftueBtn').addEventListener('click', () => {
    ftueSeen = true;
    $('#ftue').classList.add('hidden');
    game.start();
  });
  $('#againBtn').addEventListener('click', () => game.start());
  $('#restartBtn').addEventListener('click', () => game.start());
  $('#resumeBtn').addEventListener('click', () => game.resume());
  $('#pauseBtn').addEventListener('click', () => {
    if (game.state === 'playing') game.pause();
    else if (game.state === 'paused') game.resume();
  });
  $('#settingsBtn').addEventListener('click', () => settingsPanel.toggle());

  const muteBtn = $('#muteBtn');
  muteBtn.textContent = sfx.muted ? '🔇' : '🔊';
  muteBtn.addEventListener('click', () => { muteBtn.textContent = sfx.toggleMute() ? '🔇' : '🔊'; });

  document.addEventListener('visibilitychange', () => { if (document.hidden) game.pause(); });

  // --- skin shop ---
  function thumbFor(id: string): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = c.height = 72;
    const tctx = c.getContext('2d')!;
    // Kenney player ~66x92 — draw the stand pose centered, preserving aspect.
    const w = 72 * 0.72;
    assets.draw(tctx, `${id}_stand`, 0, (72 - w) / 2, 2, w, 68);
    return c;
  }
  // Runners are all free; the selection persists on the server profile (skins
  // column). No local coins/unlocks — the economy is server-only.
  let selectedSkin = 'boy';
  function buildShop(): void {
    const row = $('#skinRow');
    row.innerHTML = '';
    for (const skin of SKINS) {
      const isSel = selectedSkin === skin.id;
      const chip = document.createElement('div');
      chip.className = `skin-chip${isSel ? ' is-selected' : ''}`;
      chip.appendChild(thumbFor(skin.id));
      const name = document.createElement('div');
      name.className = 'skin-name';
      name.textContent = getLang() === 'am' ? skin.nameAm : skin.nameEn;
      chip.appendChild(name);
      const action = document.createElement('div');
      action.className = 'skin-action';
      action.textContent = isSel ? t('td.selected') : t('td.select');
      chip.appendChild(action);
      chip.addEventListener('click', () => {
        if (isSel) return;
        selectedSkin = skin.id;
        game.setSkin(skin.id);
        void setSkinRemote(GAME_ID, skin.id);
        sfx.click();
        buildShop();
      });
      row.appendChild(chip);
    }
  }
  // Apply the player's saved runner from their server profile.
  void fetchSkins().then((sk) => {
    selectedSkin = sk[GAME_ID] ?? 'boy';
    game.setSkin(selectedSkin);
    buildShop();
  });

  // --- toast ---
  let toastT = 0;
  function showToast(msg: string): void {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(toastT);
    toastT = window.setTimeout(() => el.classList.add('hidden'), 2600);
  }

  // --- HUD per-frame ---
  function updateHud(): void {
    scoreVal.textContent = String(game.score);
    coinsVal.textContent = String(game.coins);
    biomeVal.textContent = game.biomeName;

    const chips: string[] = [];
    if (game.magnetT > 0) chips.push(`<span class="chip magnet">🧲 ${game.magnetT.toFixed(0)}</span>`);
    if (game.shield) chips.push(`<span class="chip shield">🛡️</span>`);
    if (game.multT > 0) chips.push(`<span class="chip mult">2× ${game.multT.toFixed(0)}</span>`);
    const sig = chips.join('');
    if (sig !== chipSig) { powerChips.innerHTML = sig; chipSig = sig; }
  }

  applyTranslations();
  buildShop();
  showOverlay('menu');

  const loop = new GameLoop(
    (dt) => game.update(dt),
    () => { vp.beginFrame(); game.render(ctx); updateHud(); },
  );
  loop.start();

  // QA hook: ?auto starts a run immediately (used for headless screenshots).
  if (location.search.includes('auto')) {
    ftueSeen = true;
    game.start();
  }
}

// Ethiopian Quiz — free game with hub shell (menu / pause / game-over).

import '../../styles/base.css';
import '../../styles/game-shell.css';
import './style.css';
import { applyTranslations, getLang, t } from '../../i18n';
import { sfx } from '../../engine/audio';
import { createHost } from '../../platform/gameHost';
import {
  ensureToast,
  renderFreeMenuHtml,
  renderRunRewardHtml,
  startFreeRound,
  submitFreeRun,
} from '../../platform/freeGameShell';
import { promptIfSessionExpired } from '../../platform/sessionAuth';
import { isConfigured } from '../../platform/supabase';
import { freeGameBestRemote } from '../../platform/backend';
import { QUIZ_BANK, type QuizQuestion } from './bank';

const GAME_ID = 'ethiopian-quiz';
const host = createHost(GAME_ID);
const $ = <T extends HTMLElement>(sel: string): T => document.querySelector<T>(sel)!;

type Phase = 'menu' | 'playing' | 'paused' | 'over';

const ROUND = 5;
const PER_Q_SECONDS = 10;
const WIN_CORRECT = 3;

let phase: Phase = 'menu';
let starting = false;
let serverBest = 0;
let toastT = 0;

let round: QuizQuestion[] = [];
let idx = 0;
let correct = 0;
let locked = false;
let roundStart = 0;
let qTimer: ReturnType<typeof setInterval> | undefined;
let qLeft = 0;
let timerPaused = false;

const toast = ensureToast('ethiopian-quiz-toast');
const elQ = $('#eq-question');
const elOpts = $('#eq-options');
const elMsg = $('#eq-message');

function refreshMenu(): void {
  $('#freeMenu').innerHTML = renderFreeMenuHtml(host, serverBest);
}

function showToast(msg: string): void {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toastT);
  toastT = window.setTimeout(() => el.classList.add('hidden'), 2800);
}

function showMenu(): void {
  $('#menuOverlay').classList.remove('hidden');
  $('#eqPlayFrame').classList.add('hidden');
  $('#eqBackdrop').classList.remove('hidden');
  hideOverOverlay();
}

function showGame(): void {
  $('#menuOverlay').classList.add('hidden');
  $('#eqPlayFrame').classList.remove('hidden');
  $('#eqBackdrop').classList.add('hidden');
}

function correctSummary(correctCount: number): string {
  return t('eq.correctSummary')
    .replace('{correct}', String(correctCount))
    .replace('{total}', String(ROUND));
}

function setPhase(next: Phase): void {
  phase = next;
  if (next === 'menu') showMenu();
  else showGame();
  $('#closeBtn').classList.toggle('hidden', next === 'menu' || next === 'over');
  $('#pauseOverlay').classList.toggle('hidden', next !== 'paused');
}

function showOverOverlay(score: number, correctCount: number, isRecord: boolean): void {
  const overlay = $('#overOverlay');
  $('#finalScore').textContent = score.toLocaleString();
  $('#finalBest').textContent = serverBest > 0 ? serverBest.toLocaleString() : '—';
  $('#eqOverSummary').textContent = correctSummary(correctCount);
  $('#newBest').classList.toggle('hidden', !isRecord);
  $('#runReward').innerHTML = '<span class="shell-rr-pending">…</span>';
  $('#closeBtn').classList.add('hidden');
  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden', 'false');
}

function hideOverOverlay(): void {
  const overlay = $('#overOverlay');
  overlay.classList.add('hidden');
  overlay.setAttribute('aria-hidden', 'true');
}

function updateStats(): void {
  const score = correct * 20;
  $('#eqStatQ').textContent = round.length ? `${idx + 1}/${round.length}` : '—';
  $('#eqStatTime').textContent = phase === 'playing' && !locked ? `${Math.max(0, qLeft)}s` : '—';
  $('#eqStatScore').textContent = String(score);
}

function pickRound(): QuizQuestion[] {
  const byTier = (d: 1 | 2 | 3): QuizQuestion[] => shuffle(QUIZ_BANK.filter((q) => q.d === d));
  const want: (1 | 2 | 3)[] = [1, 1, 2, 2, 3];
  const pool = { 1: byTier(1), 2: byTier(2), 3: byTier(3) };
  const picked: QuizQuestion[] = [];
  for (const d of want) {
    const q = pool[d].pop() ?? pool[3].pop() ?? pool[2].pop() ?? pool[1].pop();
    if (q && !picked.includes(q)) picked.push(q);
  }
  for (const q of shuffle(QUIZ_BANK)) {
    if (picked.length >= ROUND) break;
    if (!picked.includes(q)) picked.push(q);
  }
  return picked.slice(0, ROUND).sort((a, b) => a.d - b.d);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function clearQTimer(): void {
  if (qTimer) {
    clearInterval(qTimer);
    qTimer = undefined;
  }
  timerPaused = false;
}

function startQTimer(): void {
  clearQTimer();
  timerPaused = false;
  qTimer = setInterval(() => {
    if (phase !== 'playing' || locked) return;
    qLeft--;
    updateStats();
    if (qLeft <= 0) timeUp();
  }, 1000);
}

function beginQuiz(): void {
  round = pickRound();
  idx = 0;
  correct = 0;
  locked = false;
  roundStart = Date.now();
  elMsg.textContent = '';
  setPhase('playing');
  showQuestion();
}

function showQuestion(): void {
  if (phase !== 'playing') return;
  locked = false;
  elMsg.textContent = '';
  const q = round[idx];
  elQ.textContent = q.question;
  const order = shuffle([0, 1, 2, 3]);
  elOpts.innerHTML = order.map((oi) =>
    `<button type="button" class="eq-opt" data-i="${oi}">${q.opts[oi]}</button>`,
  ).join('');
  elOpts.querySelectorAll<HTMLButtonElement>('.eq-opt').forEach((b) => {
    b.addEventListener('click', () => answer(Number(b.dataset.i), b));
  });
  qLeft = PER_Q_SECONDS;
  updateStats();
  startQTimer();
}

function timeUp(): void {
  if (locked || phase !== 'playing') return;
  locked = true;
  clearQTimer();
  elMsg.textContent = t('eq.timeup');
  updateStats();
  setTimeout(() => advanceQuestion(), 900);
}

function answer(choice: number, btn: HTMLButtonElement): void {
  if (locked || phase !== 'playing') return;
  locked = true;
  clearQTimer();
  const q = round[idx];
  const right = choice === q.answer;
  if (right) {
    correct++;
    btn.classList.add('ok');
    sfx.coin();
    elMsg.textContent = t('eq.correct');
  } else {
    btn.classList.add('bad');
    sfx.click();
    elMsg.textContent = t('eq.wrong');
  }
  updateStats();
  setTimeout(() => advanceQuestion(), 1100);
}

function advanceQuestion(): void {
  if (phase !== 'playing') return;
  idx++;
  if (idx < round.length) showQuestion();
  else finishRound();
}

function finishRound(): void {
  clearQTimer();
  const score = correct * 20;
  const isWin = correct >= WIN_CORRECT;
  const isRecord = score > serverBest;
  if (isRecord) serverBest = score;
  refreshMenu();
  const timeMs = Date.now() - roundStart;
  elQ.textContent = '';
  elOpts.innerHTML = '';
  elMsg.textContent = '';
  updateStats();
  setPhase('over');
  showOverOverlay(score, correct, isRecord);
  void submitRun(score, isWin, timeMs, isRecord);
}

async function submitRun(
  score: number,
  isWin: boolean,
  durationMs: number,
  isRecord: boolean,
): Promise<void> {
  const reward = $('#runReward');
  if (!isConfigured()) {
    reward.innerHTML = '';
    $('#finalBest').textContent = serverBest.toLocaleString();
    return;
  }
  reward.innerHTML = '<span class="shell-rr-pending">…</span>';
  const res = await submitFreeRun(host, score, isWin, durationMs);
  if (!res) {
    $('#finalBest').textContent = serverBest.toLocaleString();
    $('#newBest').classList.toggle('hidden', !isRecord);
    if (await promptIfSessionExpired(showToast)) {
      reward.innerHTML = `<span class="shell-rr-note">${t('td.sessionExpired')}</span>`;
    } else {
      reward.innerHTML = `<span class="shell-rr-note">${t('td.submitFailed')}</span>`;
    }
    return;
  }
  if (typeof res.best === 'number') serverBest = Math.max(serverBest, res.best);
  $('#finalBest').textContent = serverBest.toLocaleString();
  $('#newBest').classList.toggle('hidden', !isRecord && !res.isRecord);
  reward.innerHTML = renderRunRewardHtml(res);
  refreshMenu();
}

async function beginFreeRound(): Promise<void> {
  if (starting) return;
  starting = true;
  try {
    clearQTimer();
    if (!(await startFreeRound(host, toast))) return;
    hideOverOverlay();
    beginQuiz();
  } finally {
    starting = false;
  }
}

async function onPlayOrEnter(): Promise<void> {
  if (starting || phase === 'playing' || phase === 'paused') return;
  await beginFreeRound();
}

function pauseQuiz(): void {
  if (phase !== 'playing' || locked) return;
  clearQTimer();
  timerPaused = true;
  setPhase('paused');
}

function resumeQuiz(): void {
  if (phase !== 'paused') return;
  setPhase('playing');
  if (timerPaused && !locked && idx < round.length) {
    timerPaused = false;
    startQTimer();
  }
}

async function restartFromPause(): Promise<void> {
  if (phase !== 'paused') return;
  hideOverOverlay();
  await beginFreeRound();
}

$('#startBtn').addEventListener('click', () => void onPlayOrEnter());
$('#againBtn').addEventListener('click', () => void onPlayOrEnter());
$('#restartBtn').addEventListener('click', () => void restartFromPause());
$('#resumeBtn').addEventListener('click', () => resumeQuiz());
$('#pauseBtn').addEventListener('click', () => pauseQuiz());

document.addEventListener('visibilitychange', () => {
  if (document.hidden && phase === 'playing') pauseQuiz();
});

document.documentElement.lang = getLang();
applyTranslations();
refreshMenu();
setPhase('menu');

void freeGameBestRemote(GAME_ID).then((best) => {
  serverBest = best;
  refreshMenu();
});

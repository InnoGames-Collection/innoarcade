// Make 24 — combine four numbers with + − × ÷ to reach exactly 24. Native GoPlay game.
import '../../styles/base.css';
import '../_lq/lq.css';
import { el, toast, modal, finishLQRound, mulberry32, randInt, sound, mountLQ } from '../_lq/lq';
import { multiPuzzleScore } from '../_lq/scoring';
import { lqHelp } from '../_lq/help';
import { createHost } from '../../platform/gameHost';
import { t } from '../../i18n';

const TARGET = 24, ROUNDS = 5, EPS = 1e-9;
const host = createHost('target24');

function solve(nums: number[], exprs?: string[]): string | null {
  exprs = exprs || nums.map(String);
  if (nums.length === 1) return Math.abs(nums[0] - TARGET) < EPS ? exprs[0] : null;
  for (let i = 0; i < nums.length; i++) {
    for (let j = 0; j < nums.length; j++) {
      if (i === j) continue;
      const rest = nums.filter((_, k) => k !== i && k !== j);
      const restE = exprs.filter((_, k) => k !== i && k !== j);
      const a = nums[i], b = nums[j], ea = exprs[i], eb = exprs[j];
      const ops: Array<[number, string]> = [
        [a + b, `(${ea}+${eb})`], [a - b, `(${ea}-${eb})`], [a * b, `(${ea}×${eb})`],
      ];
      if (Math.abs(b) > EPS) ops.push([a / b, `(${ea}÷${eb})`]);
      for (const [v, e] of ops) { const r = solve(rest.concat([v]), restE.concat([e])); if (r) return r; }
    }
  }
  return null;
}

function generate(rnd: () => number): number[] {
  for (;;) { const nums = [0, 0, 0, 0].map(() => randInt(1, 9, rnd)); if (solve(nums)) return nums; }
}

interface Num { val: number; label: string; used: boolean; }

function render(mount: HTMLElement): void {
  let cleanup: (() => void) | null = null;

  function newRound(seed: number): void {
    if (cleanup) cleanup();
    mount.innerHTML = '';
    cleanup = startRound(seed);
  }

  function startRound(seed: number): () => void {
    const rnd = mulberry32(seed);
    let round = 0, solvedCount = 0;
    const t0 = Date.now();
    let nums: Num[] = [];
    let history: Num[][] = [];
    let selIdx = -1;
    let selOp: string | null = null;

    const sub = el('p', { class: 'sub center' });
    const chips = el('div', { class: 'chips' });
    const fb = el('div', { class: 'quiz-feedback center' });
    const ops = el('div', { class: 'op-row' });
    const opEls: Record<string, { btn: HTMLElement; fn: (a: number, b: number) => number | null }> = {};
    const opDefs: Array<[string, (a: number, b: number) => number | null]> = [
      ['+', (a, b) => a + b], ['−', (a, b) => a - b], ['×', (a, b) => a * b], ['÷', (a, b) => (b === 0 ? null : a / b)],
    ];
    for (const [sym, fn] of opDefs) {
      const b = el('button', { class: 'op-btn', text: sym, 'aria-label': sym, onclick: () => pickOp(sym) });
      opEls[sym] = { btn: b, fn };
      ops.appendChild(b);
    }

    mount.appendChild(el('div', { class: 'game-toolbar' },
      el('button', { class: 'btn', text: t('hub.howToPlay'), onclick: showHelp }),
      el('button', { class: 'btn', text: 'Undo', onclick: undo }),
      el('button', { class: 'btn', text: 'Show solution', onclick: revealSolution }),
      el('button', { class: 'btn', text: 'New game', onclick: () => newRound(Math.floor(Math.random() * 1e9)) })));
    mount.appendChild(el('div', { class: 'quiz-wrap' }, el('div', { class: 'quiz-q' }, sub, chips, ops, fb)));
    nextRound();

    function showHelp(): void {
      modal({ title: t('hub.howToPlay'), body: lqHelp('target24') });
    }

    function nextRound(): void {
      if (round >= ROUNDS) { finish(); return; }
      const vals = generate(rnd);
      nums = vals.map((v) => ({ val: v, label: String(v), used: false }));
      history = []; selIdx = -1; selOp = null;
      sub.textContent = `Puzzle ${round + 1} of ${ROUNDS} — make ${TARGET}`;
      fb.textContent = 'Tap number · operation · number';
      fb.className = 'quiz-feedback center dim';
      paint();
    }

    function paint(): void {
      chips.innerHTML = '';
      nums.forEach((n, i) => {
        if (n.used) return;
        chips.appendChild(el('button', { class: 'num-chip' + (i === selIdx ? ' sel' : ''), text: n.label, onclick: () => pickNum(i) }));
      });
      for (const k of Object.keys(opEls)) opEls[k].btn.classList.toggle('sel', selOp === k);
    }

    function pickNum(i: number): void {
      if (selIdx === -1 || selOp === null) { selIdx = i; selOp = null; paint(); return; }
      if (i === selIdx) { selIdx = -1; selOp = null; paint(); return; }
      const a = nums[selIdx], b = nums[i];
      const v = opEls[selOp].fn(a.val, b.val);
      if (v === null) { sound('bad'); toast("Can't divide by zero"); return; }
      history.push(nums.map((n) => ({ ...n })));
      a.used = true; b.used = true;
      const pretty = Number.isInteger(v) ? String(v) : (Math.round(v * 100) / 100).toString();
      nums.push({ val: v, label: pretty, used: false });
      selIdx = -1; selOp = null;
      paint();
      const left = nums.filter((n) => !n.used);
      if (left.length === 1) {
        if (Math.abs(left[0].val - TARGET) < EPS) {
          sound('win'); solvedCount++; round++;
          fb.textContent = `🎯 ${TARGET}! Nailed it.`;
          fb.className = 'quiz-feedback good center';
          setTimeout(nextRound, 1100);
        } else {
          sound('bad');
          fb.textContent = `That's ${left[0].label}, not ${TARGET} — undo and retry.`;
          fb.className = 'quiz-feedback bad center';
        }
      }
    }

    function pickOp(sym: string): void {
      if (selIdx === -1) { toast('Pick a number first'); return; }
      selOp = sym; paint();
    }

    function undo(): void {
      if (!history.length) { toast('Nothing to undo'); return; }
      nums = history.pop()!;
      selIdx = -1; selOp = null;
      fb.textContent = 'Tap number · operation · number';
      fb.className = 'quiz-feedback center dim';
      paint();
    }

    function revealSolution(): void {
      const base = (history.length ? history[0] : nums).filter((n) => !n.used).map((n) => n.val);
      const sol = solve(base);
      modal({
        title: 'One solution',
        body: `<b>${sol ? sol.replace(/^\((.*)\)$/, '$1') + ' = ' + TARGET : '—'}</b><br><br>This puzzle counts as skipped.`,
        actions: [{ label: 'Next puzzle', primary: true, onClick: () => { round++; nextRound(); } }],
      });
    }

    function finish(): void {
      const elapsedMs = Date.now() - t0;
      const score = multiPuzzleScore(solvedCount, elapsedMs, { budgetSec: 180 });
      const won = score >= host.winScore;
      sound(won ? 'win' : 'bad');
      finishLQRound(score, won, '', elapsedMs);
    }

    return () => {};
  }

  newRound(Math.floor(Math.random() * 1e9));
}

mountLQ('target24', render);

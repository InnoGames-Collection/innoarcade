// Number Sequence — find the hidden rule, type the next number. Native GoPlay game.
import '../../styles/base.css';
import '../_lq/lq.css';
import { el, finishLQRound, mulberry32, randInt, sound, mountLQ, setLQHeader } from '../_lq/lq';
import { multiPuzzleScore } from '../_lq/scoring';
import { escalateTier } from '../../platform/freeDifficulty';
import { createHost } from '../../platform/gameHost';

const ROUNDS = 8;
const POINTS_PER_CORRECT = 25;
const host = createHost('sequence');

interface Term { terms: number[]; next: number; }
function fromFn(f: (i: number) => number): Term {
  const terms = [0, 1, 2, 3].map(f);
  return { terms, next: f(4) };
}
function lin(a: number, d: number): Term { return fromFn((i) => a + i * d); }
function geo(a: number, q: number): Term { return fromFn((i) => a * Math.pow(q, i)); }
function fib(a: number, b: number): Term {
  const t = [a, b];
  while (t.length < 5) t.push(t[t.length - 1] + t[t.length - 2]);
  return { terms: t.slice(0, 4), next: t[4] };
}
function alt(a: number, p: number, q: number): Term {
  const t = [a];
  for (let i = 0; i < 4; i++) t.push(t[t.length - 1] + (i % 2 === 0 ? p : q));
  return { terms: t.slice(0, 4), next: t[4] };
}
function acc(a: number, d: number): Term {
  const t = [a]; let step = d;
  for (let i = 0; i < 4; i++) { t.push(t[t.length - 1] + step); step += d; }
  return { terms: t.slice(0, 4), next: t[4] };
}

const GENERATORS: Array<{ d: number; make: (r: () => number) => Term }> = [
  { d: 1, make: (r) => { const a = randInt(1, 20, r), d = randInt(2, 9, r); return lin(a, d); } },
  { d: 1, make: (r) => { const a = randInt(40, 90, r), d = randInt(2, 9, r); return lin(a, -d); } },
  { d: 2, make: (r) => { const a = randInt(1, 4, r), q = randInt(2, 3, r); return geo(a, q); } },
  { d: 2, make: (r) => { const s = randInt(1, 6, r); return fromFn((i) => (s + i) * (s + i)); } },
  { d: 3, make: (r) => { const a = randInt(1, 5, r), b = randInt(2, 6, r); return fib(a, b); } },
  { d: 3, make: (r) => { const a = randInt(2, 8, r), p = randInt(2, 5, r), q = randInt(6, 9, r); return alt(a, p, q); } },
  { d: 4, make: (r) => { const s = randInt(1, 4, r); return fromFn((i) => (s + i) ** 3); } },
  { d: 4, make: (r) => { const a = randInt(2, 6, r), d = randInt(1, 4, r); return acc(a, d); } },
];

function answerDigitCount(n: number): number {
  return String(Math.abs(n)).length;
}

function sequenceKeypad(onKey: (k: string) => void): HTMLElement {
  return el('div', { class: 'kbd sequence-kbd', role: 'group', 'aria-label': 'Number pad' },
    el('div', { class: 'kbd-row' },
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-'].map((k) =>
        el('button', { class: 'key num', text: k, onclick: () => onKey(k) })),
      el('button', { class: 'key wide', text: '⌫', 'aria-label': 'Backspace', onclick: () => onKey('Backspace') })));
}

function render(mount: HTMLElement): void {
  let cleanup: (() => void) | null = null;

  function newRound(seed: number): void {
    if (cleanup) cleanup();
    mount.innerHTML = '';
    cleanup = startRound(seed);
  }

  function startRound(seed: number): () => void {
    const rnd = mulberry32(seed);
    let round = 0;
    let correct = 0;
    let typed = '';
    let locked = false;
    let autoTimer: ReturnType<typeof setTimeout> | undefined;
    const t0 = Date.now();
    let item: Term = GENERATORS[0].make(rnd);

    const q = el('div', { class: 'big-q' });
    const a = el('div', { class: 'big-a' });
    const fb = el('div', { class: 'quiz-feedback center' });
    const card = el('div', { class: 'quiz-q sequence-card' }, q, a, fb);
    const pad = sequenceKeypad(onKey);

    mount.appendChild(el('div', { class: 'quiz-wrap sequence-wrap' }, card));
    mount.appendChild(pad);
    nextRound();

    function liveScore(): number {
      return correct * POINTS_PER_CORRECT;
    }

    function updateHeader(): void {
      setLQHeader({
        round: `${Math.min(round + 1, ROUNDS)}/${ROUNDS}`,
        score: String(liveScore()),
      });
    }

    function nextRound(): void {
      if (round >= ROUNDS) { finish(); return; }
      const level = Math.min(4, 1 + escalateTier(round, 3, 2));
      const pool = GENERATORS.filter((g) => g.d === level);
      item = pool[Math.floor(rnd() * pool.length)].make(rnd);
      typed = ''; locked = false;
      q.textContent = item.terms.join(',  ') + ',  ?';
      a.textContent = '';
      fb.textContent = '';
      fb.className = 'quiz-feedback center';
      updateHeader();
    }

    function scheduleAutoSubmit(): void {
      clearTimeout(autoTimer);
      if (locked || typed === '' || typed === '-') return;
      const digits = typed.replace('-', '').length;
      if (digits < answerDigitCount(item.next)) return;
      autoTimer = setTimeout(() => {
        if (!locked && typed !== '' && typed !== '-') submit();
      }, 280);
    }

    function onKey(key: string): void {
      if (locked) return;
      if (key === 'Backspace') typed = typed.slice(0, -1);
      else if (key === '-' && typed === '') typed = '-';
      else if (/^\d$/.test(key) && typed.replace('-', '').length < 7) typed += key;
      a.textContent = typed;
      scheduleAutoSubmit();
    }

    function submit(): void {
      clearTimeout(autoTimer);
      if (typed === '' || typed === '-') return;
      locked = true;
      round++;
      if (Number(typed) === item.next) {
        correct++;
        sound('good');
        fb.textContent = 'Correct!';
        fb.className = 'quiz-feedback good center';
        updateHeader();
        setTimeout(nextRound, 900);
      } else {
        sound('bad');
        fb.textContent = `Not quite — it was ${item.next}.`;
        fb.className = 'quiz-feedback bad center';
        updateHeader();
        setTimeout(nextRound, 900);
      }
    }

    function finish(): void {
      const elapsedMs = Date.now() - t0;
      const finalScore = multiPuzzleScore(correct, elapsedMs, {
        pointsPerPuzzle: POINTS_PER_CORRECT,
        budgetSec: 240,
      });
      const won = finalScore >= host.winScore;
      sound(won ? 'win' : 'bad');
      finishLQRound(finalScore, won, `${correct}/${ROUNDS} correct`, elapsedMs);
    }

    function physicalKey(e: KeyboardEvent): void {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Backspace' || e.key === '-' || /^\d$/.test(e.key)) {
        e.preventDefault();
        onKey(e.key);
      }
    }
    document.addEventListener('keydown', physicalKey);
    return () => {
      clearTimeout(autoTimer);
      document.removeEventListener('keydown', physicalKey);
    };
  }

  newRound(Math.floor(Math.random() * 1e9));
}

mountLQ('sequence', render, {
  headerSlots: [
    { id: 'round', labelKey: 'shell.puzzle', icon: 'round' },
    { id: 'score', labelKey: 'td.score', icon: 'score', score: true },
  ],
});

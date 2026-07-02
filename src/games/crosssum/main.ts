// Nine Sums — place 1-9 once each so every row and column hits its sum. Native GoPlay game.
import '../../styles/base.css';
import '../_lq/lq.css';
import { el, toast, finishLQRound, mulberry32, shuffled, sound, mountLQ, setLQHeader } from '../_lq/lq';
import { puzzleCompletionScore } from '../_lq/scoring';
import { escalateTier } from '../../platform/freeDifficulty';
import { createHost } from '../../platform/gameHost';

const PUZZLES = 3;
const host = createHost('crosssum');

function render(mount: HTMLElement): void {
  function startSession(seed: number): void {
    const rnd = mulberry32(seed);
    let puzzleIdx = 0;
    let totalScore = 0;
    const sessionStart = Date.now();
    let puzzleCleanup: (() => void) | null = null;

    function loadPuzzle(): void {
      if (puzzleCleanup) puzzleCleanup();
      mount.innerHTML = '';

      const tier = escalateTier(puzzleIdx, 2, 1);
      const mistakePenalty = 12 + tier * 4;

      const digits = shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9], rnd);
      const target: number[][] = [];
      for (let r = 0; r < 3; r++) target.push(digits.slice(r * 3, r * 3 + 3));
      const rowSums = target.map((row) => row.reduce((a, b) => a + b, 0));
      const colSums = [0, 1, 2].map((c) => target[0][c] + target[1][c] + target[2][c]);

      const board = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
      let sel: [number, number] | null = null;
      let over = false;
      let mistakes = 0;
      const puzzleStart = Date.now();

      const sub = el('p', { class: 'sub center', text: `Puzzle ${puzzleIdx + 1} of ${PUZZLES}` });
      const gridEl = el('div', { class: 'sudoku', role: 'grid', style: 'grid-template-columns: repeat(4, auto);' });
      const cellEls: HTMLElement[][] = [];
      for (let r = 0; r < 3; r++) {
        cellEls.push([]);
        for (let c = 0; c < 3; c++) {
          const cell = el('div', { class: 'cell', role: 'gridcell', onclick: () => { if (!over) { sel = [r, c]; paint(); } } });
          cellEls[r].push(cell);
          gridEl.appendChild(cell);
        }
        gridEl.appendChild(el('div', { class: 'cell sum-lbl', text: '→' + rowSums[r] }));
      }
      for (let c = 0; c < 3; c++) gridEl.appendChild(el('div', { class: 'cell sum-lbl', text: '↓' + colSums[c] }));
      gridEl.appendChild(el('div', { class: 'cell sum-lbl', text: '' }));

      const fb = el('div', { class: 'quiz-feedback center' });
      const mkKey = (v: number): HTMLElement => el('button', { class: 'key num', text: String(v), onclick: () => place(v) });
      const padWrap = el('div', { class: 'kbd' },
        el('div', { class: 'kbd-row' }, [1, 2, 3, 4, 5].map(mkKey)),
        el('div', { class: 'kbd-row' }, [6, 7, 8, 9].map(mkKey), el('button', { class: 'key wide', text: '⌫', onclick: () => place(0) })));

      mount.appendChild(sub);
      mount.appendChild(gridEl);
      mount.appendChild(fb);
      mount.appendChild(padWrap);
      setLQHeader({ round: `${puzzleIdx + 1}/${PUZZLES}`, score: String(totalScore) });
      paint();

      function paint(): void {
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
          const cell = cellEls[r][c];
          cell.textContent = board[r][c] ? String(board[r][c]) : '';
          cell.classList.toggle('sel', !!sel && sel[0] === r && sel[1] === c);
        }
      }

      function place(v: number): void {
        if (over) return;
        if (!sel) { toast('Tap a cell first'); return; }
        if (v) {
          for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (board[r][c] === v) board[r][c] = 0;
          sound('click');
        }
        board[sel[0]][sel[1]] = v;
        paint();
        check();
      }

      function check(): void {
        const flat = board.flat();
        if (flat.includes(0)) return;
        const ok = board.every((row, r) => row.reduce((a, b) => a + b, 0) === rowSums[r]) &&
          [0, 1, 2].every((c) => board[0][c] + board[1][c] + board[2][c] === colSums[c]);
        if (ok) {
          over = true;
          sound('win');
          const elapsedMs = Date.now() - puzzleStart;
          const score = puzzleCompletionScore(elapsedMs, mistakes, { budgetSec: 360, mistakePenalty });
          totalScore += score;
          puzzleIdx++;
          setLQHeader({ round: `${Math.min(puzzleIdx + 1, PUZZLES)}/${PUZZLES}`, score: String(totalScore) });
          if (puzzleIdx >= PUZZLES) {
            finishLQRound(
              totalScore,
              totalScore >= host.winScore,
              `${PUZZLES}/${PUZZLES} puzzles`,
              Date.now() - sessionStart,
            );
          } else {
            setTimeout(loadPuzzle, 600);
          }
        } else {
          mistakes++;
          sound('bad');
          fb.textContent = "All cells filled, but the sums don't match yet.";
          fb.className = 'quiz-feedback bad center';
          setTimeout(() => { fb.textContent = ''; }, 2000);
        }
      }

      function physicalKey(e: KeyboardEvent): void {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        if (/^[1-9]$/.test(e.key)) { e.preventDefault(); place(Number(e.key)); }
        if (e.key === 'Backspace' || e.key === '0') { e.preventDefault(); place(0); }
      }
      document.addEventListener('keydown', physicalKey);
      puzzleCleanup = () => document.removeEventListener('keydown', physicalKey);
    }

    loadPuzzle();
  }

  startSession(Math.floor(Math.random() * 1e9));
}

mountLQ('crosssum', render);

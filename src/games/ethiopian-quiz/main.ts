// Ethiopian Quiz — 10-question batch free quiz.

import '../../styles/base.css';
import '../../styles/game-shell.css';
import '../_quiz/style.css';
import './polish.css';
import { wireFreeQuizShell } from '../../platform/freeQuizShell';
import { QUIZ_BANK } from './bank';
import { ethiopianQuizSfx, initEthiopianQuizPolish } from './polish';

/** Strip internal difficulty/category prefixes from bank text (not shown to players). */
function publicPrompt(question: string): string {
  return question
    .replace(/^(?:Easy|Hard|Medium|Simple)\s+Ethiopian\s+[^:]+:\s*/i, '')
    .trim();
}

const QUESTION_SECONDS = 10;

const presentation = initEthiopianQuizPolish(QUESTION_SECONDS);

wireFreeQuizShell({
  gameId: 'ethiopian-quiz',
  pointsPerCorrect: 20,
  winScore: 100,
  questionSeconds: QUESTION_SECONDS,
  bank: () => QUIZ_BANK.map((q) => ({
    id: String(q.id),
    prompt: publicPrompt(q.question),
    choices: q.opts,
    answer: q.answer,
  })),
  presentation,
  sfx: ethiopianQuizSfx(),
});

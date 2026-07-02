// Spell Trivia — continuous timed spelling quiz.

import '../../styles/base.css';
import '../../styles/game-shell.css';
import '../_quiz/style.css';
import { wireFreeQuizShell } from '../../platform/freeQuizShell';
import { spellBank } from '../_quiz/adapters';

wireFreeQuizShell({
  gameId: 'spell',
  pointsPerCorrect: 10,
  winScore: 70,
  twoColOptions: true,
  bank: spellBank,
});

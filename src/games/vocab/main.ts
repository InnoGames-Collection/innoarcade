// Vocabulary — continuous timed definition quiz.

import '../../styles/base.css';
import '../../styles/game-shell.css';
import '../_quiz/style.css';
import { wireFreeQuizShell } from '../../platform/freeQuizShell';
import { vocabBank } from '../_quiz/adapters';

wireFreeQuizShell({
  gameId: 'vocab',
  pointsPerCorrect: 10,
  winScore: 70,
  bank: vocabBank,
});

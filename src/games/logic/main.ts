// Logic Grid — continuous timed deduction quiz.

import '../../styles/base.css';
import '../../styles/game-shell.css';
import '../_quiz/style.css';
import { wireFreeQuizShell } from '../../platform/freeQuizShell';
import { logicBank } from '../_quiz/adapters';

wireFreeQuizShell({
  gameId: 'logic',
  pointsPerCorrect: 10,
  winScore: 70,
  bank: logicBank,
});

import { t } from '../../i18n';

export function lqHelp(game: 'sudoku' | 'crosssum' | 'target24' | 'sequence'): string {
  return t(`lq.help.${game}`);
}

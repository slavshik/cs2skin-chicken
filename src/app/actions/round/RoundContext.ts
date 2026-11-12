import type { GameModel } from '../../../game/GameModel.ts';
import type { BoardView } from '../../game/BoardView.ts';

/** What every round action works on: the state and the board that shows it. */
export interface RoundContext {
    model: GameModel;
    board: BoardView;
}

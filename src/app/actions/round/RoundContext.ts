import type { GameServer } from '../../../contract/ServerApi.ts';
import type { GameModel } from '../../../game/GameModel.ts';
import type { BoardView } from '../../game/BoardView.ts';

/** What every round action works on: the server, the client state, and the board. */
export interface RoundContext {
    server: GameServer;
    model: GameModel;
    board: BoardView;
}

/** A refusal or a failed request, as the player should read it. */
export const errorText = (error: unknown): string =>
    error instanceof Error && error.message ? error.message : 'Connection problem. Try again.';

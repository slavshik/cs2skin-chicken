import { Action } from '@dp-instant/core/Action.ts';
import { injectable } from '@dp-instant/core/injectable.ts';
import { AppEvents } from '../../events.ts';
import { errorText, type RoundContext } from './RoundContext.ts';

/** Asks the server to open a round with the chosen bet; on success arms the first lane. */
@injectable()
export class PlaceBetAction extends Action<RoundContext, void> {
    async execute({ server, model, board }: RoundContext): Promise<void> {
        if (!model.canBet) return;
        model.phase = 'busy';
        model.error = undefined;
        this.dispatch(AppEvents.MODEL_CHANGED);
        try {
            model.opened(await server.openRound({ bet: model.bet, difficulty: model.difficulty }));
            board.startRound();
            model.phase = 'live';
        } catch (error) {
            model.error = errorText(error);
            model.phase = 'idle';
        }
        this.dispatch(AppEvents.MODEL_CHANGED);
    }
}

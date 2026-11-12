import { Action } from '@dp-instant/core/Action.ts';
import { injectable } from '@dp-instant/core/injectable.ts';
import { AppEvents } from '../../events.ts';
import { errorText, type RoundContext } from './RoundContext.ts';

/**
 * Back to betting before the first step: the server calls the round off and refunds the stake,
 * the board resets, and the bet popup reopens.
 */
@injectable()
export class CancelRoundAction extends Action<RoundContext, void> {
    async execute({ server, model, board }: RoundContext): Promise<void> {
        if (!model.canChangeBet || !model.roundId) return;
        model.phase = 'busy';
        model.error = undefined;
        this.dispatch(AppEvents.MODEL_CHANGED);
        try {
            model.cancelled((await server.cancelRound(model.roundId)).balance);
            board.resetRound();
            model.phase = 'idle';
        } catch (error) {
            model.error = errorText(error);
            model.phase = 'live';
        }
        this.dispatch(AppEvents.MODEL_CHANGED);
    }
}

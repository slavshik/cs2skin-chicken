import { Action } from '@dp-instant/core/Action.ts';
import { injectable } from '@dp-instant/core/injectable.ts';
import { secureRandom } from '../../../game/rules.ts';
import { AppEvents } from '../../events.ts';
import type { RoundContext } from './RoundContext.ts';

/** Takes the stake, draws the outcome, arms the first lane. */
@injectable()
export class PlaceBetAction extends Action<RoundContext, void> {
    async execute({ model, board }: RoundContext): Promise<void> {
        if (!model.canBet) return;
        model.startRound(secureRandom);
        board.startRound();
        this.dispatch(AppEvents.MODEL_CHANGED);
    }
}

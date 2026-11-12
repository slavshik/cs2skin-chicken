import { Action } from '@dp-instant/core/Action.ts';
import { injectable } from '@dp-instant/core/injectable.ts';
import { AppEvents } from '../../events.ts';
import type { RoundContext } from './RoundContext.ts';

/** Back to betting: the board resets and the panel unlocks. */
@injectable()
export class EndRoundAction extends Action<RoundContext, void> {
    async execute({ model, board }: RoundContext): Promise<void> {
        model.phase = 'idle';
        board.resetRound();
        this.dispatch(AppEvents.MODEL_CHANGED);
    }
}

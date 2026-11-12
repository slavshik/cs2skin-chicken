import { Action } from '@dp-instant/core/Action.ts';
import { injectable } from '@dp-instant/core/injectable.ts';
import { AppEvents } from '../../events.ts';
import { EndRoundAction } from './EndRoundAction.ts';
import type { RoundContext } from './RoundContext.ts';

/** Pays out the current multiplier; the chicken celebrates. */
@injectable()
export class CashOutAction extends Action<RoundContext, void> {
    async execute(context: RoundContext): Promise<void> {
        const { model, board } = context;
        if (model.phase === 'idle' || model.step === 0) return;

        model.phase = 'busy';
        model.settle(true);
        this.dispatch(AppEvents.MODEL_CHANGED);
        await board.celebrate();
        await new EndRoundAction().run(context);
    }
}

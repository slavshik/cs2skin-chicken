import { Action } from '@dp-instant/core/Action.ts';
import { injectable } from '@dp-instant/core/injectable.ts';
import { AppEvents } from '../../events.ts';
import { EndRoundAction } from './EndRoundAction.ts';
import type { RoundContext } from './RoundContext.ts';

/** Pays out the current multiplier and shows the win card. */
@injectable()
export class CashOutAction extends Action<RoundContext, void> {
    async execute(context: RoundContext): Promise<void> {
        const { model, board } = context;
        if (model.phase === 'idle' || model.step === 0) return;

        model.phase = 'busy';
        const result = model.settle(true);
        this.dispatch(AppEvents.MODEL_CHANGED);
        await board.showResult(true, result.mult, result.paid);
        await new EndRoundAction().run(context);
    }
}

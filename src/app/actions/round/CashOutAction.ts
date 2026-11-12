import { Action } from '@dp-instant/core/Action.ts';
import { injectable } from '@dp-instant/core/injectable.ts';
import type { Settlement } from '../../../contract/ServerApi.ts';
import { AppEvents } from '../../events.ts';
import { EndRoundAction } from './EndRoundAction.ts';
import { errorText, type RoundContext } from './RoundContext.ts';
import { SettleAction } from './SettleAction.ts';

/** Asks the server to pay out the current multiplier; the chicken celebrates. */
@injectable()
export class CashOutAction extends Action<RoundContext, void> {
    async execute(context: RoundContext): Promise<void> {
        const { server, model, board } = context;
        if (!model.canCashOut || !model.roundId) return;

        model.phase = 'busy';
        this.dispatch(AppEvents.MODEL_CHANGED);
        let settlement: Settlement;
        try {
            settlement = await server.cashOut(model.roundId);
        } catch (error) {
            model.error = errorText(error);
            model.phase = 'live';
            this.dispatch(AppEvents.MODEL_CHANGED);
            return;
        }
        await new SettleAction().run({ ...context, settlement });
        await board.celebrate();
        await new EndRoundAction().run(context);
    }
}

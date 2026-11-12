import { Action } from '@dp-instant/core/Action.ts';
import { injectable } from '@dp-instant/core/injectable.ts';
import { AppEvents } from '../../events.ts';
import { CashOutAction } from './CashOutAction.ts';
import { EndRoundAction } from './EndRoundAction.ts';
import type { RoundContext } from './RoundContext.ts';

/**
 * One hop into the next lane. The lane either closes (barrier, coin, multiplier up) or a car
 * hits and the stake is lost. Clearing the last lane cashes out automatically.
 */
@injectable()
export class StepAction extends Action<RoundContext, void> {
    async execute(context: RoundContext): Promise<void> {
        const { model, board } = context;
        if (model.phase !== 'live') return;

        model.phase = 'busy';
        this.dispatch(AppEvents.MODEL_CHANGED);
        const lane = model.step + 1;
        const hit = model.nextIsHit();
        await board.hopTo(lane);

        if (hit) {
            model.settle(false);
            this.dispatch(AppEvents.MODEL_CHANGED);
            await board.crash(lane);
            await new EndRoundAction().run(context);
            return;
        }

        model.clearLane();
        this.dispatch(AppEvents.MODEL_CHANGED);
        await board.clearLane(lane);
        if (model.step >= model.lanes) {
            await new CashOutAction().run(context);
            return;
        }
        model.phase = 'live';
        this.dispatch(AppEvents.MODEL_CHANGED);
    }
}

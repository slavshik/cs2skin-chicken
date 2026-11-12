import { Action } from '@dp-instant/core/Action.ts';
import { injectable } from '@dp-instant/core/injectable.ts';
import type { StepResult } from '../../../contract/ServerApi.ts';
import { AppEvents } from '../../events.ts';
import { EndRoundAction } from './EndRoundAction.ts';
import { errorText, type RoundContext } from './RoundContext.ts';
import { SettleAction } from './SettleAction.ts';

/**
 * One hop. The server decides the lane first; the board then plays what it said: the lane
 * closes (barrier, coin, multiplier up) or a car hits. The last lane cashes out on the server.
 */
@injectable()
export class StepAction extends Action<RoundContext, void> {
    private readonly demoWin: boolean;

    constructor(demoWin = false) {
        super();
        this.demoWin = demoWin;
    }

    async execute(context: RoundContext): Promise<void> {
        const { server, model, board } = context;
        if (model.phase !== 'live' || !model.roundId) return;

        model.phase = 'busy';
        this.dispatch(AppEvents.MODEL_CHANGED);
        let result: StepResult;
        try {
            result = await server.step(model.roundId, { demoWin: this.demoWin });
        } catch (error) {
            model.error = errorText(error);
            model.phase = 'live';
            this.dispatch(AppEvents.MODEL_CHANGED);
            return;
        }

        const lane = model.step + 1;
        await board.hopTo(lane);

        if (result.outcome === 'hit') {
            await new SettleAction().run({ ...context, settlement: result.settlement });
            await board.crash(lane);
            await new EndRoundAction().run(context);
            return;
        }

        model.cleared(result.step);
        this.dispatch(AppEvents.MODEL_CHANGED);
        await board.clearLane(lane);
        if (result.settlement) {
            await new SettleAction().run({ ...context, settlement: result.settlement });
            await board.celebrate();
            await new EndRoundAction().run(context);
            return;
        }
        model.phase = 'live';
        this.dispatch(AppEvents.MODEL_CHANGED);
    }
}

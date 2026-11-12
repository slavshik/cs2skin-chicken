import { Action } from '@dp-instant/core/Action.ts';
import { injectable } from '@dp-instant/core/injectable.ts';
import type { Settlement } from '../../../contract/ServerApi.ts';
import { verifyRound } from '../../../game/fairness.ts';
import { AppEvents } from '../../events.ts';
import type { RoundContext } from './RoundContext.ts';

/** Records a finished round after checking the revealed seed against the server's commitment. */
@injectable()
export class SettleAction extends Action<RoundContext & { settlement: Settlement }, void> {
    async execute({ model, settlement }: RoundContext & { settlement: Settlement }): Promise<void> {
        const { seed, hitLane } = settlement.reveal;
        const verified =
            !settlement.assisted &&
            !!model.seedHash &&
            (await verifyRound(model.difficulty, model.seedHash, seed, hitLane));
        if (!verified && !settlement.assisted)
            console.warn('[fairness] the server revealed a seed that does not match', settlement);
        model.settled(settlement, verified);
        this.dispatch(AppEvents.MODEL_CHANGED);
    }
}

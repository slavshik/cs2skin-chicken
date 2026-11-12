import { Action } from '@dp-instant/core/Action.ts';
import { injectable } from '@dp-instant/core/injectable.ts';
import { DelayAction } from '../AnimationAction.ts';
import { AppEvents } from '../../events.ts';
import type { RoundContext } from './RoundContext.ts';

/** Seconds the ended scene stays visible before the bet popup returns. */
const LINGER = 0.5;

/** Freezes the scene as it ended and, after a beat, reopens betting (the popup shows the result). */
@injectable()
export class EndRoundAction extends Action<RoundContext, void> {
    async execute({ model, board }: RoundContext): Promise<void> {
        board.freeze();
        await new DelayAction().run(LINGER);
        model.phase = 'idle';
        this.dispatch(AppEvents.MODEL_CHANGED);
    }
}

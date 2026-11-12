import { gsap } from 'gsap';
import { Action } from '@dp-instant/core/Action.ts';

/**
 * An action that is one GSAP timeline: subclasses add tweens in `build`, `run` resolves when
 * the timeline completes, and `terminate` kills it. GSAP runs on the Pixi ticker, so pausing
 * the game freezes every AnimationAction too.
 */
export abstract class AnimationAction<T = void> extends Action<T, void> {
    private timeline?: gsap.core.Timeline;

    protected abstract build(timeline: gsap.core.Timeline, data: T): void;

    async execute(data: T): Promise<void> {
        const timeline = (this.timeline = gsap.timeline({ paused: true }));
        this.build(timeline, data);
        await new Promise<void>((resolve) => {
            timeline.eventCallback('onComplete', () => resolve());
            timeline.play();
        });
    }

    override terminate(reason?: unknown): void {
        this.timeline?.kill();
        super.terminate(reason);
    }
}

/** Pause as an action, so waits compose with (and freeze like) animations. */
export class DelayAction extends AnimationAction<number> {
    protected build(timeline: gsap.core.Timeline, seconds: number): void {
        timeline.to({}, { duration: seconds });
    }
}

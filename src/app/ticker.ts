import { gsap } from 'gsap';
import type { Ticker } from 'pixi.js';

/**
 * Drive GSAP from a Pixi ticker instead of its own requestAnimationFrame loop, so stopping
 * that ticker (the game pausing, e.g. on a hidden tab) freezes every tween and delayed call with it.
 */
export function bindGsapToTicker(ticker: Ticker): void {
    let seconds = 0;
    gsap.ticker.remove(gsap.updateRoot);
    ticker.add((t) => {
        seconds += t.deltaMS / 1000;
        gsap.updateRoot(seconds);
    });
}

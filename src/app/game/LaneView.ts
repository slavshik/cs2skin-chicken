import { gsap } from 'gsap';
import { type BitmapText, Container, Graphics } from 'pixi.js';
import { formatMultShort } from '../../game/format.ts';
import { Frame } from '../assets.ts';
import { art } from '../ui/art.ts';
import { label } from '../ui/text.ts';
import { COLOR } from '../ui/tokens.ts';

/** docs/design/components/Lane.md: only the `next` lane takes taps. */
export type LaneState = 'locked' | 'next' | 'cleared' | 'crashed';

/** Height of a lane's manhole centre, as a share of the board height. */
export const laneCenterY = (height: number): number => Math.round(height * 0.56);
/** Barrier legs sit this far above the manhole centre. */
const BARRIER_OFFSET = 70;

/** One vertical road lane: asphalt, a manhole with its multiplier, then a barrier and a coin. */
export class LaneView extends Container {
    static readonly TAP = 'laneTap';

    state: LaneState = 'locked';
    readonly hole = new Container();
    readonly coin = art(Frame.coin);
    readonly barrier = art(Frame.barrier);

    private readonly bg = new Graphics();
    private readonly ring = new Graphics();
    private readonly text: BitmapText;
    private pulse?: gsap.core.Tween;
    private w = 0;
    private h = 0;

    constructor(mult: number) {
        super();
        this.text = label(formatMultShort(mult), 13, 'text-subtle', true);
        this.text.anchor.set(0.5);
        const plate = new Graphics()
            .roundRect(-this.text.width / 2 - 5, -9, this.text.width + 10, 18, 4)
            .fill(COLOR.manhole);
        this.hole.addChild(this.ring, art(Frame.manhole), plate, this.text);
        this.hole.on('pointertap', () => {
            if (this.state === 'next') this.emit(LaneView.TAP);
        });
        this.coin.visible = false;
        this.barrier.visible = false;
        this.addChild(this.bg, this.hole, this.coin, this.barrier);
        this.setState('locked');
    }

    get centerY(): number {
        return laneCenterY(this.h);
    }

    get barrierY(): number {
        return this.centerY - BARRIER_OFFSET;
    }

    layout(width: number, height: number): void {
        this.w = width;
        this.h = height;
        this.hole.position.set(width / 2, this.centerY);
        this.coin.position.set(width / 2, this.centerY);
        this.barrier.position.set(width / 2, this.barrierY);
        this.redrawBg();
    }

    setState(state: LaneState): void {
        this.state = state;
        this.pulse?.kill();
        const crashed = state === 'crashed';
        this.ring
            .clear()
            .circle(0, 0, 40)
            .stroke({ width: 3, ...COLOR[crashed ? 'blood-500' : 'primary-400'] })
            .circle(0, 0, 46)
            .stroke({
                width: 6,
                color: COLOR[crashed ? 'blood-500' : 'primary-500'].color,
                alpha: 0.25,
            });
        this.ring.visible = state === 'next' || crashed;
        this.ring.alpha = 1;
        this.ring.scale.set(1);
        this.hole.visible = state !== 'cleared';
        this.hole.alpha = state === 'locked' ? 0.5 : 1;
        this.hole.scale.set(1);
        this.hole.eventMode = state === 'next' ? 'static' : 'none';
        this.hole.cursor = 'pointer';
        this.coin.visible = state === 'cleared';
        this.coin.scale.set(1);
        this.barrier.visible = state === 'cleared';
        this.barrier.alpha = 1;
        this.barrier.y = this.barrierY;
        this.text.tint = COLOR[state === 'locked' ? 'text-subtle' : 'text-title'].color;
        if (state === 'next') {
            this.pulse = gsap.to(this.ring, {
                alpha: 0.35,
                duration: 0.6,
                yoyo: true,
                repeat: -1,
                ease: 'sine.inOut',
            });
        }
        this.redrawBg();
    }

    /** Barrier drops in and the manhole flips into a coin. */
    animateClear(timeline: gsap.core.Timeline, at: number): void {
        this.setState('cleared');
        this.hole.visible = true;
        this.coin.scale.x = 0;
        timeline
            .fromTo(
                this.barrier,
                { y: this.barrierY - 60, alpha: 0 },
                { y: this.barrierY, alpha: 1, duration: 0.22, ease: 'back.out(2)' },
                at,
            )
            .to(this.hole.scale, { x: 0, duration: 0.09, ease: 'power1.in' }, at + 0.05)
            .set(this.hole, { visible: false }, at + 0.14)
            .to(this.coin.scale, { x: 1, duration: 0.12, ease: 'back.out(3)' }, at + 0.14);
    }

    override destroy(): void {
        this.pulse?.kill();
        super.destroy({ children: true });
    }

    /** Only the lane's state shows here; asphalt and markings belong to the board. */
    private redrawBg(): void {
        this.bg.clear();
        if (this.state === 'next') this.bg.rect(0, 0, this.w, this.h).fill(COLOR['primary-tint']);
        if (this.state === 'crashed') {
            this.bg
                .rect(0, 0, this.w, this.h)
                .fill({ color: COLOR['blood-800'].color, alpha: 0.45 });
        }
    }
}

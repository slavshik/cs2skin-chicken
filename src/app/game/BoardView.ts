import { gsap } from 'gsap';
import { Container, Graphics } from 'pixi.js';
import { View } from '@dp-instant/2d/View.ts';
import { type Difficulty, multiplier } from '../../game/rules.ts';
import { CAR_COLORS, drawCar, drawChicken, drawCoin } from '../ui/art.ts';
import { COLOR, SIZE } from '../ui/tokens.ts';
import { laneCenterY, LaneView } from './LaneView.ts';

/** Grass verge widths before the first lane and after the last. */
const CURB = 96;
const FINISH = 120;
/** Seconds a car takes to cross a 500 px tall board, by difficulty. */
const CAR_SPEED: Record<Difficulty, number> = { easy: 1.7, medium: 1.4, hard: 1.1, hardcore: 0.85 };
/** The next lane is kept at this share of the board width. */
const FOCUS = 0.35;
const REDUCED_MOTION = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

interface Car {
    sprite: Graphics;
    lane: number;
    tween: gsap.core.Tween;
}

const play = (timeline: gsap.core.Timeline): Promise<void> =>
    new Promise((resolve) => timeline.eventCallback('onComplete', () => resolve()));

/**
 * The game world (design/components/Lane.md): a grass curb, one lane per step, a finish verge,
 * the chicken and the traffic. No UI: bet, multiplier and cash-out live in the React layer.
 * `BoardView.LANE_TAP` reports a tap on the next manhole.
 */
export class BoardView extends View {
    static readonly LANE_TAP = 'laneTap';

    private readonly track = new Container();
    private readonly ground = new Graphics();
    private readonly lanesLayer = new Container();
    private readonly traffic = new Container();
    private readonly fx = new Container();
    private readonly chicken = drawChicken();
    private readonly flash = new Graphics();

    private lanes: LaneView[] = [];
    private cars: Car[] = [];
    private difficulty: Difficulty = 'easy';
    private step = 0;
    private live = false;
    private w = 0;
    private h = 0;
    private laneW: number = SIZE['lane-width'];
    private spawner?: gsap.core.Tween;

    constructor() {
        super();
        this.track.addChild(this.ground, this.lanesLayer, this.chicken, this.traffic, this.fx);
        this.addChild(this.track, this.flash);
        this.flash.alpha = 0;
    }

    override onAdded(): void {
        super.onAdded();
        this.scheduleTraffic();
    }

    override onRemoved(): void {
        this.spawner?.kill();
        super.onRemoved();
    }

    /** Builds the lanes for a difficulty and puts the chicken on the curb. */
    setup(difficulty: Difficulty, lanes: number): void {
        this.difficulty = difficulty;
        for (const lane of this.lanes) lane.destroy();
        this.lanes = Array.from({ length: lanes }, (_, i) => {
            const lane = new LaneView(i + 1, multiplier(difficulty, i + 1));
            lane.on(LaneView.TAP, () => this.emit(BoardView.LANE_TAP));
            this.lanesLayer.addChild(lane);
            return lane;
        });
        this.resetRound();
        this.layout();
    }

    resize(width: number, height: number): void {
        this.w = width;
        this.h = height;
        this.laneW = width < 520 ? 88 : SIZE['lane-width'];
        this.layout();
    }

    /** A new round from a clean board: the first lane is armed. */
    startRound(): void {
        this.resetRound();
        this.live = true;
        this.refreshStates();
        this.scrollToNext();
    }

    /** Back to the start: chicken on the curb, every lane locked. */
    resetRound(): void {
        this.live = false;
        this.step = 0;
        this.clearTraffic();
        gsap.killTweensOf([this.chicken, this.chicken.scale]);
        this.chicken.scale.set(1);
        this.chicken.alpha = 1;
        this.placeChicken(0);
        this.refreshStates();
        this.scrollToNext(false);
    }

    /** The round is over but the scene stays as it ended, behind the bet popup. */
    freeze(): void {
        this.live = false;
        this.refreshStates();
    }

    /** The chicken hops onto a lane's manhole. */
    hopTo(lane: number): Promise<void> {
        const target = this.laneCenterX(lane);
        const feet = this.chickenY();
        const tl = gsap.timeline();
        tl.to(this.chicken, { x: target, duration: 0.3, ease: 'power1.inOut' }, 0)
            .to(this.chicken, { y: feet - 36, duration: 0.15, ease: 'power2.out' }, 0)
            .to(this.chicken, { y: feet, duration: 0.15, ease: 'power2.in' }, 0.15)
            .fromTo(
                this.chicken.scale,
                { y: 0.85 },
                { y: 1, duration: 0.18, ease: 'back.out(3)' },
                0.3,
            );
        this.scrollTo(lane + 1);
        return play(tl);
    }

    /** The lane closes: barrier drops in, the manhole turns into a coin, the next lane is armed. */
    clearLane(lane: number): Promise<void> {
        this.step = lane;
        this.retireCarsIn(lane);
        // The newly armed lane must stay readable: its manhole is the tap target.
        this.retireCarsIn(lane + 1, true);
        const tl = gsap.timeline();
        this.lanes[lane - 1]?.animateClear(tl, 0);
        tl.call(() => this.refreshStates(), [], 0.2).to({}, { duration: 0.1 });
        return play(tl);
    }

    /** A car drives through the lane and over the chicken. */
    crash(lane: number): Promise<void> {
        this.lanes[lane - 1]?.setState('crashed');
        const car = drawCar(CAR_COLORS[lane % CAR_COLORS.length]!);
        car.position.set(this.laneCenterX(lane), -60);
        this.traffic.addChild(car);

        const tl = gsap.timeline();
        tl.to(car, { y: this.chickenY() - 30, duration: 0.32, ease: 'power2.in' })
            .addLabel('hit')
            .call(() => this.impact(), [], 'hit')
            .to(this.chicken.scale, { x: 1.35, y: 0.22, duration: 0.08 }, 'hit')
            .to(this.chicken, { alpha: 0.6, duration: 0.2 }, 'hit')
            .to(car, { y: this.h + 80, duration: 0.4, ease: 'power1.out' }, 'hit')
            .call(() => car.destroy())
            .to({}, { duration: 0.2 });
        return play(tl);
    }

    /** Cash-out: the chicken jumps for joy under a burst of coins. */
    celebrate(): Promise<void> {
        const { x, y } = this.chicken.position;
        const tl = gsap.timeline();
        tl.to(
            this.chicken,
            { y: y - 30, duration: 0.18, ease: 'power2.out', yoyo: true, repeat: 3 },
            0,
        );
        for (let i = 0; i < 10; i++) {
            const coin = drawCoin();
            coin.scale.set(0.35);
            coin.position.set(x, y - 30);
            this.fx.addChild(coin);
            const angle = -Math.PI / 2 + gsap.utils.random(-1.1, 1.1);
            const dist = gsap.utils.random(60, 120);
            tl.to(
                coin,
                {
                    x: x + Math.cos(angle) * dist,
                    y: y - 30 + Math.sin(angle) * dist,
                    alpha: 0,
                    duration: 0.7,
                    ease: 'power2.out',
                    onComplete: () => coin.destroy(),
                },
                0.05 + i * 0.02,
            );
        }
        return play(tl);
    }

    private impact(): void {
        this.flash.alpha = 0.55;
        gsap.to(this.flash, { alpha: 0, duration: 0.25 });
        if (REDUCED_MOTION) return;
        gsap.fromTo(this.track, { y: 5 }, { y: 0, duration: 0.3, ease: 'elastic.out(1, 0.3)' });
    }

    private refreshStates(): void {
        this.lanes.forEach((lane, i) => {
            const n = i + 1;
            if (lane.state === 'crashed' && !this.live && n === this.step + 1) return;
            lane.setState(
                n <= this.step ? 'cleared' : this.live && n === this.step + 1 ? 'next' : 'locked',
            );
        });
    }

    private layout(): void {
        if (!this.w || !this.h) return;
        const { w, h, laneW } = this;
        this.flash.clear().rect(0, 0, w, h).fill(COLOR['text-title']);

        const end = CURB + this.lanes.length * laneW;
        const g = this.ground.clear();
        g.rect(-w, 0, w + CURB, h).fill(COLOR['grass-800']);
        g.rect(end, 0, FINISH + w, h).fill(COLOR['grass-800']);
        g.rect(CURB - 10, 0, 10, h).fill(COLOR['road-curb']);
        g.rect(end, 0, 10, h).fill(COLOR['road-curb']);
        const tuft = { color: COLOR['grass-600'].color, alpha: 0.45 };
        for (let y = 24; y < h; y += 72) {
            g.circle(22 + ((y * 7) % 40), y, 7).fill(tuft);
            g.circle(end + 40 + ((y * 5) % 50), y + 30, 8).fill(tuft);
        }

        this.lanes.forEach((lane, i) => {
            lane.x = CURB + i * laneW;
            lane.layout(laneW, h);
        });
        gsap.killTweensOf(this.chicken);
        this.placeChicken(this.step);
        this.scrollToNext(false);
    }

    private laneCenterX(lane: number): number {
        return lane <= 0 ? CURB / 2 - 6 : CURB + (lane - 1) * this.laneW + this.laneW / 2;
    }

    private chickenY(): number {
        return laneCenterY(this.h) + 22;
    }

    private placeChicken(lane: number): void {
        this.chicken.position.set(this.laneCenterX(lane), this.chickenY());
    }

    private scrollToNext(animate = true): void {
        this.scrollTo(this.step + 1, animate);
    }

    private scrollTo(lane: number, animate = true): void {
        const trackW = CURB + this.lanes.length * this.laneW + FINISH;
        const min = Math.min(0, this.w - trackW);
        const x = Math.max(min, Math.min(0, this.w * FOCUS - this.laneCenterX(lane)));
        gsap.killTweensOf(this.track, 'x');
        if (animate) gsap.to(this.track, { x, duration: 0.35, ease: 'power2.out' });
        else this.track.x = x;
    }

    // ---- traffic: decoration in lanes past the next one; a cleared lane's barrier stops it

    private scheduleTraffic(): void {
        this.spawner = gsap.delayedCall(gsap.utils.random(0.25, 0.8), () => {
            this.spawnCar();
            this.scheduleTraffic();
        });
    }

    private spawnCar(): void {
        const from = this.step + 2;
        if (!this.h || from > this.lanes.length) return;
        const lane = gsap.utils.random(from, this.lanes.length, 1);
        const screenX = this.track.x + this.laneCenterX(lane);
        if (screenX < -this.laneW || screenX > this.w + this.laneW) return;
        if (this.cars.some((c) => c.lane === lane && c.sprite.y < 160)) return;

        const sprite = drawCar(gsap.utils.random(CAR_COLORS));
        sprite.position.set(this.laneCenterX(lane), -60);
        this.traffic.addChild(sprite);
        const duration = CAR_SPEED[this.difficulty] * Math.max(0.6, this.h / 500);
        const car: Car = {
            sprite,
            lane,
            tween: gsap.to(sprite, {
                y: this.h + 80,
                duration,
                ease: 'none',
                onComplete: () => this.removeCar(car),
            }),
        };
        this.cars.push(car);
    }

    /** Cars still above the chicken in a lane that just closed fade out at the barrier. */
    private retireCarsIn(lane: number, all = false): void {
        for (const car of this.cars) {
            if (car.lane !== lane || (!all && car.sprite.y > this.chickenY() + 60)) continue;
            car.tween.kill();
            car.tween = gsap.to(car.sprite, {
                alpha: 0,
                duration: 0.15,
                onComplete: () => this.removeCar(car),
            });
        }
    }

    private removeCar(car: Car): void {
        car.tween.kill();
        car.sprite.destroy();
        this.cars = this.cars.filter((c) => c !== car);
    }

    private clearTraffic(): void {
        for (const car of [...this.cars]) this.removeCar(car);
    }
}

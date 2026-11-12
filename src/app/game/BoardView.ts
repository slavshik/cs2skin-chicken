import { gsap } from 'gsap';
import { Container, Graphics } from 'pixi.js';
import { View } from '@dp-instant/2d/View.ts';
import { formatMult } from '../../game/format.ts';
import { type Difficulty, multiplier } from '../../game/rules.ts';
import { CAR_COLORS, drawCar, drawChicken } from '../ui/art.ts';
import { label } from '../ui/text.ts';
import { COLOR, RADIUS, SIZE } from '../ui/tokens.ts';
import { laneCenterY, LaneView } from './LaneView.ts';
import { ResultCard } from './ResultCard.ts';

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
 * The road (design/components/Lane.md): a grass curb, one lane per step, a finish verge.
 * Renders and animates only; `BoardView.LANE_TAP` reports a tap on the next manhole.
 */
export class BoardView extends View {
    static readonly LANE_TAP = 'laneTap';

    private readonly frame = new Graphics();
    private readonly track = new Container();
    private readonly ground = new Graphics();
    private readonly lanesLayer = new Container();
    private readonly traffic = new Container();
    private readonly chicken = drawChicken();
    private readonly flash = new Graphics();
    private readonly liveChip = new Container();
    private readonly liveBg = new Graphics();
    private readonly liveText = label('x1.00', 26, 'text-title', true);
    private readonly badge = new Container();
    private readonly badgeBg = new Graphics();
    private readonly badgeText = label('', 12, 'text-on-bright', true);
    private readonly result = new ResultCard();

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
        this.liveText.anchor.set(0.5);
        this.liveChip.addChild(this.liveBg, this.liveText);
        this.badgeText.anchor.set(0.5);
        this.badge.addChild(this.badgeBg, this.badgeText);
        this.track.addChild(this.ground, this.lanesLayer, this.chicken, this.traffic);
        this.addChild(this.track, this.flash, this.liveChip, this.badge, this.result, this.frame);
        this.mask = this.frame;
        this.flash.alpha = 0;
        this.liveChip.visible = false;
        this.badge.visible = false;
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

    /** A new round: the first lane is armed. */
    startRound(): void {
        this.live = true;
        this.step = 0;
        this.refreshStates();
        this.setLive(100);
        this.liveChip.visible = true;
        this.badge.visible = true;
        this.scrollToNext();
    }

    /** Back to betting: chicken on the curb, every lane locked. */
    resetRound(): void {
        this.live = false;
        this.step = 0;
        this.clearTraffic();
        gsap.killTweensOf([this.chicken, this.chicken.scale, this.chicken.position]);
        this.chicken.scale.set(1);
        this.chicken.rotation = 0;
        this.chicken.alpha = 1;
        this.placeChicken(0);
        this.refreshStates();
        this.liveChip.visible = false;
        this.badge.visible = false;
        this.scrollToNext(false);
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

    /** The lane closes: barrier, coin, multiplier up, next lane armed. */
    clearLane(lane: number, mult: number): Promise<void> {
        this.step = lane;
        this.retireCarsIn(lane);
        const tl = gsap.timeline();
        this.lanes[lane - 1]?.animateClear(tl, 0);
        tl.call(
            () => {
                this.refreshStates();
                this.setLive(mult);
            },
            [],
            0.2,
        );
        tl.fromTo(
            this.liveChip.scale,
            { x: 1.15, y: 1.15 },
            { x: 1, y: 1, duration: 0.25, ease: 'back.out(3)' },
            0.2,
        );
        return play(tl);
    }

    /** A car drives through the lane and over the chicken. */
    crash(lane: number): Promise<void> {
        const view = this.lanes[lane - 1];
        view?.setState('crashed');
        const impactY = this.chickenY() - 30;
        const car = drawCar(CAR_COLORS[lane % CAR_COLORS.length]!);
        car.position.set(this.laneCenterX(lane), -60);
        this.traffic.addChild(car);

        const tl = gsap.timeline();
        tl.to(car, { y: impactY, duration: 0.32, ease: 'power2.in' })
            .addLabel('hit')
            .call(() => this.impact(), [], 'hit')
            .to(this.chicken.scale, { x: 1.35, y: 0.22, duration: 0.08 }, 'hit')
            .to(this.chicken, { alpha: 0.6, duration: 0.2 }, 'hit')
            .to(car, { y: this.h + 80, duration: 0.4, ease: 'power1.out' }, 'hit')
            .call(() => car.destroy())
            .to({}, { duration: 0.15 });
        return play(tl);
    }

    showResult(won: boolean, mult: number, amount: number): Promise<void> {
        this.liveChip.visible = false;
        this.badge.visible = false;
        return this.result.show(won, mult, amount);
    }

    private impact(): void {
        this.flash.alpha = 0.55;
        gsap.to(this.flash, { alpha: 0, duration: 0.25 });
        if (REDUCED_MOTION) return;
        gsap.fromTo(this.track, { y: 5 }, { y: 0, duration: 0.3, ease: 'elastic.out(1, 0.3)' });
    }

    private setLive(mult: number): void {
        this.liveText.text = formatMult(mult);
        const w = this.liveText.width + 32;
        this.liveBg
            .clear()
            .roundRect(-w / 2, -22, w, 44, 22)
            .fill(COLOR['primary-500']);
        this.badgeText.text = `Lane ${this.step}/${this.lanes.length}`;
        const bw = this.badgeText.width + 24;
        this.badgeBg
            .clear()
            .roundRect(-bw / 2, -14, bw, 28, 14)
            .fill(COLOR['grass-400']);
        this.layoutHud();
    }

    private refreshStates(): void {
        this.lanes.forEach((lane, i) => {
            const n = i + 1;
            lane.setState(
                n <= this.step ? 'cleared' : this.live && n === this.step + 1 ? 'next' : 'locked',
            );
        });
    }

    private layout(): void {
        if (!this.w || !this.h) return;
        const { w, h, laneW } = this;
        this.frame.clear().roundRect(0, 0, w, h, RADIUS['radius-lg']).fill(COLOR['bg-900']);
        this.flash.clear().rect(0, 0, w, h).fill(COLOR['text-title']);

        const end = CURB + this.lanes.length * laneW;
        const g = this.ground.clear();
        g.rect(0, 0, CURB, h).fill(COLOR['grass-800']);
        g.rect(end, 0, FINISH, h).fill(COLOR['grass-800']);
        g.rect(CURB - 10, 0, 10, h).fill(COLOR['road-curb']);
        g.rect(end, 0, 10, h).fill(COLOR['road-curb']);
        for (let y = 24; y < h; y += 72) {
            const tuft = { color: COLOR['grass-600'].color, alpha: 0.45 };
            g.circle(22 + ((y * 7) % 40), y, 7).fill(tuft);
            g.circle(end + 40 + ((y * 5) % 50), y + 30, 8).fill(tuft);
        }

        this.lanes.forEach((lane, i) => {
            lane.x = CURB + i * laneW;
            lane.layout(laneW, h);
        });
        gsap.killTweensOf(this.chicken);
        this.placeChicken(this.step);
        this.result.layout(w, h);
        this.layoutHud();
        this.scrollToNext(false);
    }

    private layoutHud(): void {
        this.liveChip.position.set(this.w / 2, 34);
        this.badge.position.set(this.w - this.badgeBg.width / 2 - 12, 26);
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
    private retireCarsIn(lane: number): void {
        for (const car of this.cars) {
            if (car.lane !== lane || car.sprite.y > this.chickenY() + 60) continue;
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

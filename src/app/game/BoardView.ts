import { gsap } from 'gsap';
import { Container, Graphics, type Sprite, TilingSprite } from 'pixi.js';
import { di } from '@dp-instant/core/di.ts';
import { View } from '@dp-instant/2d/View.ts';
import { type Difficulty, multiplier } from '../../game/rules.ts';
import { Frame, Picture } from '../assets.ts';
import { anyOf, art, BLOOD_FRAMES, CAR_FRAMES } from '../ui/art.ts';
import { COLOR, SIZE } from '../ui/tokens.ts';
import { laneCenterY, LaneView } from './LaneView.ts';

/** Grass verge widths before the first lane and after the last. */
const CURB = 96;
const FINISH = 120;
/** Seconds a car takes to cross a 500 px tall board during a round, by difficulty. */
const CAR_SPEED: Record<Difficulty, number> = { easy: 0.9, medium: 0.8, hard: 0.7, hardcore: 0.6 };
/**
 * Traffic. `gap`: seconds between cars (live round, while betting). `idleSlow`: how much slower
 * cars drive while betting. `rushStep`: seconds between cars in the opening rush. `clearance`:
 * px past the chicken's feet a car must be before the chicken may hop into its lane.
 */
const TRAFFIC = {
    gap: { live: [0.08, 0.22], idle: [0.45, 1] },
    idleSlow: 1.8,
    rushStep: 0.06,
    clearance: 60,
} as const;
/** The next lane is kept at this share of the board width. */
const FOCUS = 0.35;
/**
 * Road markings, worn paint as on a real road: white dashed lines between lanes, solid yellow
 * lines along both edges, inset from the kerb. Each is a vertically tiling texture
 * (raw_assets/images/marking_*.png, 2×) as wide as the line; dashes line up across lanes.
 */
const MARKING = { width: 6, edgeInset: 8 } as const;
/** Road textures (raw_assets/images: asphalt, markings) are authored at 2×. */
const ASPHALT_RESOLUTION = 2;
/** The chicken's size against its art (raw_assets/game/chicken.png). */
const CHICKEN_SIZE = 1.35;
/** Art sizes the atlas frames were drawn at (raw_assets/game), to scale them from. */
const SUNBURST_RADIUS = 230;
const SPARKLE_SIZE = 16;
/** Crash shake: peak offset in px, a hair of roll in radians, and how long it rings out. */
const SHAKE = { offset: 9, roll: 0.008, duration: 0.45 };
/** Win sequence: rays radius, fountain coins, sparkles, and the zoom punch. */
const WIN = { rays: 230, coins: 26, sparkles: 14, zoom: 1.05, hold: 1.15 };
/** Chicken's body centre above its feet. */
const BODY = 28 * CHICKEN_SIZE;
const REDUCED_MOTION = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

interface Car {
    sprite: Container;
    lane: number;
    tween: gsap.core.Tween;
    /** px per second, so the board can tell when a car will have passed the chicken. */
    speed: number;
}

const play = (timeline: gsap.core.Timeline): Promise<void> =>
    new Promise((resolve) => timeline.eventCallback('onComplete', () => resolve()));

/**
 * The game world (docs/design/components/Lane.md): a grass curb, one lane per step, a finish verge,
 * the chicken and the traffic. No UI: bet, multiplier and cash-out live in the React layer.
 * `BoardView.LANE_TAP` reports a tap on the next manhole.
 */
export class BoardView extends View {
    static readonly LANE_TAP = 'laneTap';

    /** Everything that moves as one when the world shakes or zooms; pivots on the board centre. */
    private readonly camera = new Container();
    private readonly track = new Container();
    private readonly ground = new Graphics();
    /** Rough asphalt under every lane, one grey throughout. */
    private readonly asphalt = new TilingSprite({
        texture: di.get<Sprite>(Picture.asphalt).texture,
    });
    private readonly markings = new Container();
    private readonly lanesLayer = new Container();
    private readonly traffic = new Container();
    private readonly splat = new Container();
    private readonly halo = new Container();
    private readonly fx = new Container();
    /** Screen-space effects (coin rain) over the world. */
    private readonly rain = new Container();
    private readonly chicken = art(Frame.chicken, CHICKEN_SIZE);
    private readonly flash = new Graphics();

    private lanes: LaneView[] = [];
    private cars: Car[] = [];
    private difficulty: Difficulty = 'easy';
    private step = 0;
    /** Lane of the current round's crash splat, 0 when there is none. */
    private splatLane = 0;
    private live = false;
    private w = 0;
    private h = 0;
    private laneW: number = SIZE['lane-width'];
    private spawner?: gsap.core.Tween;
    private shakeTween?: gsap.core.Tween;
    private winTimeline?: gsap.core.Timeline;

    constructor() {
        super();
        this.track.addChild(
            this.ground,
            this.asphalt,
            this.markings,
            this.lanesLayer,
            this.splat,
            this.halo,
            this.chicken,
            this.traffic,
            this.fx,
        );
        this.asphalt.tileScale.set(1 / ASPHALT_RESOLUTION);
        this.camera.addChild(this.track);
        this.addChild(this.camera, this.rain, this.flash);
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
            const lane = new LaneView(multiplier(difficulty, i + 1));
            lane.on(LaneView.TAP, (demoWin: boolean) => this.emit(BoardView.LANE_TAP, demoWin));
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

    /** A new round from a clean board: the first lane is armed and traffic rushes in. */
    startRound(): void {
        this.resetRound();
        this.live = true;
        this.refreshStates();
        this.scrollToNext();
        this.rush();
    }

    /** Back to the start: chicken on the curb, every lane locked. */
    resetRound(): void {
        this.live = false;
        this.step = 0;
        this.clearTraffic();
        this.clearSplat();
        this.clearWin();
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

    /**
     * The chicken hops onto a lane's manhole, never into moving traffic: it first waits (rarely
     * more than a few tenths of a second) until every car already in that lane has passed.
     */
    async hopTo(lane: number): Promise<void> {
        await this.waitForClearLane(lane);
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
        const tl = gsap.timeline();
        this.lanes[lane - 1]?.animateClear(tl, 0);
        tl.call(() => this.refreshStates(), [], 0.2).to({}, { duration: 0.1 });
        return play(tl);
    }

    /** A car drives through the lane and over the chicken. */
    crash(lane: number): Promise<void> {
        this.lanes[lane - 1]?.setState('crashed');
        const car = art(CAR_FRAMES[lane % CAR_FRAMES.length]!);
        car.position.set(this.laneCenterX(lane), -60);
        this.traffic.addChild(car);

        const tl = gsap.timeline();
        tl.to(car, { y: this.chickenY() - 30, duration: 0.32, ease: 'power2.in' })
            .addLabel('hit')
            .call(() => this.impact(), [], 'hit')
            .call(() => this.spill(lane), [], 'hit')
            .to(this.chicken.scale, { x: 1.35, y: 0.22, duration: 0.08 }, 'hit')
            .to(this.chicken, { alpha: 0.6, duration: 0.2 }, 'hit')
            .to(car, { y: this.h + 80, duration: 0.4, ease: 'power1.out' }, 'hit')
            .call(() => car.destroy())
            .to({}, { duration: 0.2 });
        return play(tl);
    }

    /**
     * Cash-out: a golden flash and a zoom punch, rays spin up behind the chicken, a shockwave
     * rolls out, a coin fountain bursts from it, coins rain across the screen and sparkles
     * twinkle while the chicken hops for joy. Resolves once the hops land; the rest plays out
     * behind the bet popup.
     */
    celebrate(): Promise<void> {
        this.clearWin();
        const x = this.chicken.x;
        const y = this.chicken.y - BODY;
        const tl = (this.winTimeline = gsap.timeline());

        this.flashOnce(COLOR['sun-300'].color, 0.45, 0.5);

        // rays behind the chicken
        const rays = art(Frame.sunburst, WIN.rays / SUNBURST_RADIUS);
        rays.position.set(x, y);
        rays.scale.set(0);
        this.halo.addChild(rays);
        tl.to(rays.scale, { x: 1, y: 1, duration: 0.45, ease: 'back.out(1.6)' }, 0)
            .to(rays, { rotation: Math.PI * 0.6, duration: 2.2, ease: 'none' }, 0)
            .to(rays, { alpha: 0, duration: 0.5, ease: 'power1.in' }, 1.6);

        // shockwave
        const ring = art(Frame.ring);
        ring.tint = COLOR['grass-300'].color;
        ring.position.set(x, y);
        this.fx.addChild(ring);
        tl.fromTo(
            ring.scale,
            { x: 0.3, y: 0.3 },
            { x: 4.5, y: 4.5, duration: 0.6, ease: 'expo.out' },
            0,
        ).to(ring, { alpha: 0, duration: 0.6, ease: 'power2.in' }, 0);

        // the chicken hops three times with squash and stretch
        const feet = this.chicken.y;
        for (let i = 0; i < 3; i++) {
            const t = 0.05 + i * 0.36;
            const lift = 54 - i * 10;
            tl.to(this.chicken.scale, { x: 1.18, y: 0.8, duration: 0.06 }, t)
                .to(this.chicken.scale, { x: 0.9, y: 1.18, duration: 0.14 }, t + 0.06)
                .to(this.chicken, { y: feet - lift, duration: 0.15, ease: 'power2.out' }, t + 0.06)
                .to(this.chicken, { y: feet, duration: 0.13, ease: 'power2.in' }, t + 0.21)
                .to(
                    this.chicken.scale,
                    { x: 1, y: 1, duration: 0.12, ease: 'back.out(3)' },
                    t + 0.34,
                );
        }

        this.coinFountain(tl, x, y);
        this.coinRain(tl);
        this.sparkles(tl, x, y);

        if (!REDUCED_MOTION) {
            tl.to(
                this.camera.scale,
                { x: WIN.zoom, y: WIN.zoom, duration: 0.12, ease: 'power2.out' },
                0,
            ).to(
                this.camera.scale,
                { x: 1, y: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)' },
                0.12,
            );
        }
        tl.call(() => this.clearWin(), [], '+=0');
        return new Promise((resolve) => tl.call(resolve, [], WIN.hold));
    }

    /** Coins burst up from the chicken, spin, and fall away under gravity. */
    private coinFountain(tl: gsap.core.Timeline, x: number, y: number): void {
        for (let i = 0; i < WIN.coins; i++) {
            const coin = art(Frame.coin);
            const size = gsap.utils.random(0.3, 0.5);
            coin.scale.set(size);
            coin.position.set(x, y);
            this.fx.addChild(coin);
            const t = 0.03 + i * 0.018;
            const rise = gsap.utils.random(0.32, 0.5);
            const fall = gsap.utils.random(0.55, 0.8);
            const peak = y - gsap.utils.random(120, 260);
            const drift = gsap.utils.random(-220, 220);
            tl.to(coin, { x: x + drift, duration: rise + fall, ease: 'none' }, t)
                .to(coin, { y: peak, duration: rise, ease: 'power2.out' }, t)
                .to(coin, { y: this.h + 60, duration: fall, ease: 'power2.in' }, t + rise)
                .to(
                    coin.scale,
                    { x: -size, duration: 0.14, ease: 'sine.inOut', yoyo: true, repeat: 7 },
                    t,
                );
        }
    }

    /** Coins rain across the whole screen, from above the top edge to below the bottom one. */
    private coinRain(tl: gsap.core.Timeline): void {
        if (REDUCED_MOTION || !this.w) return;
        const count = Math.min(40, Math.round(this.w / 36));
        for (let i = 0; i < count; i++) {
            const coin = art(Frame.coin);
            const size = gsap.utils.random(0.25, 0.45);
            coin.scale.set(size);
            coin.position.set(gsap.utils.random(0, this.w), -40 - gsap.utils.random(0, 120));
            coin.rotation = gsap.utils.random(-0.4, 0.4);
            this.rain.addChild(coin);
            const t = 0.15 + gsap.utils.random(0, 0.6);
            const duration = gsap.utils.random(0.9, 1.4);
            tl.to(coin, { y: this.h + 60, duration, ease: 'power1.in' }, t).to(
                coin.scale,
                { x: -size, duration: 0.16, ease: 'sine.inOut', yoyo: true, repeat: 7 },
                t,
            );
        }
    }

    /** White and gold twinkles pop around the chicken. */
    private sparkles(tl: gsap.core.Timeline, x: number, y: number): void {
        for (let i = 0; i < WIN.sparkles; i++) {
            const star = art(Frame.sparkle, gsap.utils.random(8, 16) / SPARKLE_SIZE);
            if (i % 2) star.tint = COLOR['sun-300'].color;
            const a = gsap.utils.random(0, Math.PI * 2);
            const d = gsap.utils.random(50, 150);
            star.position.set(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8);
            star.scale.set(0);
            this.fx.addChild(star);
            const t = 0.1 + gsap.utils.random(0, 0.9);
            tl.to(star.scale, { x: 1, y: 1, duration: 0.16, ease: 'back.out(3)' }, t)
                .to(star, { rotation: Math.PI / 2, duration: 0.4, ease: 'none' }, t)
                .to(star.scale, { x: 0, y: 0, duration: 0.2, ease: 'power2.in' }, t + 0.22);
        }
    }

    private clearWin(): void {
        this.winTimeline?.kill();
        this.winTimeline = undefined;
        gsap.killTweensOf(this.camera.scale);
        if (!this.shakeTween?.isActive()) this.camera.scale.set(1);
        for (const layer of [this.halo, this.fx, this.rain]) {
            for (const child of layer.removeChildren()) child.destroy();
        }
    }

    private flashOnce(color: number, alpha: number, duration: number): void {
        gsap.killTweensOf(this.flash);
        this.flash.tint = color;
        this.flash.alpha = alpha;
        gsap.to(this.flash, { alpha: 0, duration });
    }

    /** The whole world jolts and rings out; scaled up just enough that no edge shows. */
    private shake(): void {
        if (REDUCED_MOTION || !this.w || !this.h) return;
        const { camera, w, h } = this;
        const cx = w / 2;
        const cy = h / 2;
        const reach = SHAKE.offset + SHAKE.roll * Math.hypot(w, h) * 0.5;
        const cover = (2 * reach) / Math.min(w, h);
        const state = { power: 1 };
        this.shakeTween?.kill();
        this.shakeTween = gsap.to(state, {
            power: 0,
            duration: SHAKE.duration,
            ease: 'power2.out',
            onUpdate: () => {
                const p = state.power;
                camera.position.set(
                    cx + gsap.utils.random(-1, 1) * SHAKE.offset * p,
                    cy + gsap.utils.random(-1, 1) * SHAKE.offset * p,
                );
                camera.rotation = gsap.utils.random(-1, 1) * SHAKE.roll * p;
                camera.scale.set(1 + cover * p);
            },
            onComplete: () => this.centerCamera(),
        });
    }

    private centerCamera(): void {
        this.camera.pivot.set(this.w / 2, this.h / 2);
        this.camera.position.set(this.w / 2, this.h / 2);
        this.camera.rotation = 0;
        this.camera.scale.set(1);
    }

    private impact(): void {
        this.flashOnce(COLOR['text-title'].color, 0.55, 0.25);
        this.shake();
    }

    /** Blood spreads under the chicken, one and a half nominal lanes wide (as drawn). */
    private spill(lane: number): void {
        this.clearSplat();
        this.splatLane = lane;
        const blood = art(anyOf(BLOOD_FRAMES));
        this.splat.addChild(blood);
        this.layoutSplat();
        if (REDUCED_MOTION) return;
        gsap.fromTo(
            blood.scale,
            { x: 0.3, y: 0.3 },
            { x: 1, y: 1, duration: 0.35, ease: 'expo.out' },
        );
    }

    private clearSplat(): void {
        this.splatLane = 0;
        for (const child of this.splat.removeChildren()) {
            gsap.killTweensOf(child.scale);
            child.destroy();
        }
    }

    /** The splat is drawn at the nominal lane width and scaled to the current one. */
    private layoutSplat(): void {
        if (!this.splatLane) return;
        this.splat.position.set(this.laneCenterX(this.splatLane), this.chickenY());
        this.splat.scale.set(this.laneW / SIZE['lane-width']);
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
        this.shakeTween?.kill();
        this.centerCamera();

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

        this.asphalt.position.set(CURB, 0);
        this.asphalt.setSize(end - CURB, h);
        this.drawMarkings(end);

        this.lanes.forEach((lane, i) => {
            lane.x = CURB + i * laneW;
            lane.layout(laneW, h);
        });
        gsap.killTweensOf(this.chicken);
        this.placeChicken(this.step);
        this.layoutSplat();
        this.scrollToNext(false);
    }

    private drawMarkings(end: number): void {
        const { width, edgeInset } = MARKING;
        for (const line of this.markings.removeChildren()) line.destroy();
        const line = (picture: string, x: number): void => {
            const sprite = new TilingSprite({
                texture: di.get<Sprite>(picture).texture,
                width,
                height: this.h,
            });
            sprite.tileScale.set(1 / ASPHALT_RESOLUTION);
            sprite.x = x;
            this.markings.addChild(sprite);
        };
        line(Picture.markingEdge, CURB + edgeInset);
        line(Picture.markingEdge, end - edgeInset - width);
        for (let i = 1; i < this.lanes.length; i++) {
            line(Picture.markingDash, CURB + i * this.laneW - width / 2);
        }
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

    // ---- traffic. Cars only use lanes past the next one: cleared lanes have a barrier, and the
    // next lane gets no new cars, so the chicken never hops in front of one (see `hopTo`).

    private scheduleTraffic(): void {
        const [min, max] = this.live ? TRAFFIC.gap.live : TRAFFIC.gap.idle;
        this.spawner = gsap.delayedCall(gsap.utils.random(min, max), () => {
            this.spawnCar(gsap.utils.random(this.step + 2, this.lanes.length, 1));
            this.scheduleTraffic();
        });
    }

    /** The opening rush: one car down every visible lane, in random order, in quick succession. */
    private rush(): void {
        const lanes = gsap.utils.shuffle(
            Array.from({ length: this.lanes.length }, (_, i) => i + 1).filter(
                (lane) => lane > this.step + 1 && this.isOnScreen(lane),
            ),
        );
        lanes.forEach((lane, i) => {
            const at = i * TRAFFIC.rushStep + gsap.utils.random(0, TRAFFIC.rushStep);
            gsap.delayedCall(at, () => {
                if (this.live && lane > this.step + 1) this.spawnCar(lane);
            });
        });
    }

    private spawnCar(lane: number): void {
        if (!this.h || lane <= this.step + 1 || lane > this.lanes.length) return;
        if (!this.isOnScreen(lane)) return;
        if (this.cars.some((c) => c.lane === lane && c.sprite.y < 200)) return;

        const sprite = art(anyOf(CAR_FRAMES));
        sprite.position.set(this.laneCenterX(lane), -60);
        this.traffic.addChild(sprite);
        const distance = this.h + 140;
        const duration =
            CAR_SPEED[this.difficulty] *
            Math.max(0.6, this.h / 500) *
            (this.live ? 1 : TRAFFIC.idleSlow) *
            gsap.utils.random(0.85, 1.15);
        const car: Car = {
            sprite,
            lane,
            speed: distance / duration,
            tween: gsap.to(sprite, {
                y: this.h + 80,
                duration,
                ease: 'none',
                onComplete: () => this.removeCar(car),
            }),
        };
        this.cars.push(car);
    }

    private isOnScreen(lane: number): boolean {
        const x = this.track.x + this.laneCenterX(lane);
        return x > -this.laneW && x < this.w + this.laneW;
    }

    /** Resolves once no car in `lane` is still above the chicken's feet plus the clearance. */
    private waitForClearLane(lane: number): Promise<void> {
        const line = this.chickenY() + TRAFFIC.clearance;
        const wait = Math.max(
            0,
            ...this.cars
                .filter((c) => c.lane === lane && c.sprite.y < line)
                .map((c) => (line - c.sprite.y) / c.speed),
        );
        return wait > 0
            ? new Promise((resolve) => gsap.delayedCall(wait, resolve))
            : Promise.resolve();
    }

    /** Cars still above the chicken in a lane that just closed fade out at the barrier. */
    private retireCarsIn(lane: number): void {
        for (const car of this.cars) {
            if (car.lane !== lane || car.sprite.y > this.chickenY() + TRAFFIC.clearance) continue;
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

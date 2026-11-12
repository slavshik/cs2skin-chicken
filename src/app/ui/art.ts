import { Container, Graphics } from 'pixi.js';
import { COLOR } from './tokens.ts';

/*
 * Placeholder art drawn from design tokens, until sprites ship through `make assets`.
 * Every piece has its origin where the board places it (see each function).
 */

/** Seven car colours: the host site's game-tile accents. */
export const CAR_COLORS = [
    COLOR['car-blue'].color,
    COLOR['car-orange'].color,
    COLOR['car-red'].color,
    COLOR['car-green'].color,
    COLOR['car-gold'].color,
    COLOR['car-magenta'].color,
    COLOR['car-violet'].color,
];

/** Chicken facing right; origin between its feet. About 56 px tall. */
export function drawChicken(): Container {
    const g = new Graphics();
    const beak = COLOR['chicken-beak'];
    const comb = COLOR['chicken-comb'];
    g.ellipse(0, 0, 18, 5).fill({ color: 0x000000, alpha: 0.3 });
    g.roundRect(-9, -10, 4, 10, 2).fill(beak);
    g.roundRect(4, -10, 4, 10, 2).fill(beak);
    g.ellipse(-14, -30, 9, 7).fill(COLOR['chicken-body']); // tail
    g.circle(0, -26, 19).fill(COLOR['chicken-body']);
    g.circle(8, -40, 12).fill(COLOR['chicken-body']); // head
    g.ellipse(-4, -22, 10, 7).fill(COLOR['text-body']); // wing
    g.circle(4, -54, 5).fill(comb);
    g.circle(11, -55, 5).fill(comb);
    g.circle(16, -52, 4).fill(comb);
    g.poly([18, -44, 29, -40, 18, -36]).fill(beak);
    g.ellipse(18, -32, 3, 4).fill(comb); // wattle
    g.circle(12, -44, 3.5).fill(COLOR['bg-950']);
    g.circle(13, -45, 1.2).fill(COLOR['text-title']);
    const c = new Container();
    c.addChild(g);
    return c;
}

/** Top-down car driving down the screen; origin at its centre. 52 × 88. */
export function drawCar(color: number): Graphics {
    const g = new Graphics();
    const glass = { color: COLOR['bg-950'].color, alpha: 0.6 };
    g.roundRect(-24, -40, 52, 88, 14).fill({ color: 0x000000, alpha: 0.28 }); // shadow
    g.roundRect(-26, -44, 52, 88, 14).fill(color);
    g.roundRect(-20, -32, 40, 12, 5).fill(glass); // rear window
    g.roundRect(-18, -16, 36, 18, 4).fill({ color: 0xffffff, alpha: 0.14 }); // roof
    g.roundRect(-20, 6, 40, 18, 6).fill(glass); // windshield
    g.roundRect(-20, 37, 10, 5, 2).fill(COLOR['sun-300']);
    g.roundRect(10, 37, 10, 5, 2).fill(COLOR['sun-300']);
    g.roundRect(-20, -42, 8, 4, 2).fill(COLOR['blood-500']);
    g.roundRect(12, -42, 8, 4, 2).fill(COLOR['blood-500']);
    return g;
}

/** Manhole cover; origin at its centre, radius 36. */
export function drawManhole(): Graphics {
    const g = new Graphics();
    g.circle(0, 2, 37).fill({ color: 0x000000, alpha: 0.3 });
    g.circle(0, 0, 36).fill(COLOR['manhole-rim']);
    g.circle(0, 0, 31).fill(COLOR.manhole);
    for (let y = -24; y <= 24; y += 8) {
        const half = Math.sqrt(28 * 28 - y * y) - 4;
        g.roundRect(-half, y - 1.5, half * 2, 3, 1.5).fill(COLOR['manhole-groove']);
    }
    return g;
}

/** Gold coin; origin at its centre, radius 30. */
export function drawCoin(): Graphics {
    const g = new Graphics();
    g.circle(0, 4, 30).fill({ color: 0x000000, alpha: 0.3 });
    g.circle(0, 0, 30).fill(COLOR['sun-700']);
    g.circle(0, -2, 28).fill(COLOR['sun-500']);
    g.circle(0, -2, 20).stroke({ width: 3, ...COLOR['sun-700'] });
    g.ellipse(-9, -13, 9, 5).fill({ color: COLOR['sun-300'].color, alpha: 0.9 });
    return g;
}

/** Road barrier; origin at the bottom centre of its legs. 84 × 44. */
export function drawBarrier(): Graphics {
    const g = new Graphics();
    g.ellipse(0, 0, 44, 6).fill({ color: 0x000000, alpha: 0.35 });
    g.rect(-30, -18, 6, 18).fill(COLOR['bg-700']);
    g.rect(24, -18, 6, 18).fill(COLOR['bg-700']);
    g.roundRect(-42, -44, 84, 28, 6).fill(COLOR.barrier);
    for (let x = -34; x < 40; x += 20) {
        g.poly([x, -44, x + 10, -44, x, -16, x - 10, -16]).fill(COLOR['bg-930']);
    }
    g.roundRect(-42, -44, 84, 28, 6).stroke({ width: 2, ...COLOR['sun-700'] });
    return g;
}

/**
 * Blood splat left where the chicken was hit; origin at its centre.
 * Irregular core, lobes and flung droplets reaching `width` edge to edge.
 */
export function drawBloodSplat(width: number): Graphics {
    const g = new Graphics();
    const r = width / 2;
    const squash = 0.8;
    const rand = (min: number, max: number): number => min + Math.random() * (max - min);
    const core = (scale: number): number[] => {
        const points: number[] = [];
        const n = 22;
        for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2;
            const d = r * scale * rand(0.75, 1.05);
            points.push(Math.cos(a) * d, Math.sin(a) * d * squash);
        }
        return points;
    };
    const lobes = Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 + rand(-0.3, 0.3);
        const d = r * rand(0.42, 0.6);
        return { x: Math.cos(a) * d, y: Math.sin(a) * d * squash, size: r * rand(0.12, 0.22) };
    });
    const drops = [
        { a: 0, d: 0.94 },
        { a: Math.PI, d: 0.94 },
        ...Array.from({ length: 10 }, () => ({ a: rand(0, Math.PI * 2), d: rand(0.68, 0.92) })),
    ].map(({ a, d }) => ({
        x: Math.cos(a) * r * d,
        y: Math.sin(a) * r * d * squash,
        size: r * rand(0.03, 0.06),
    }));

    // dark rim under everything, the wet body, then a lighter sheen
    g.poly(core(0.6)).fill(COLOR['blood-800']);
    for (const l of lobes) g.circle(l.x, l.y + 2, l.size * 1.1).fill(COLOR['blood-800']);
    g.poly(core(0.55)).fill(COLOR['blood-600']);
    for (const l of lobes) g.circle(l.x, l.y, l.size).fill(COLOR['blood-600']);
    for (const d of drops) g.circle(d.x, d.y, d.size).fill(COLOR['blood-600']);
    g.poly(core(0.3)).fill({ color: COLOR['blood-500'].color, alpha: 0.6 });
    return g;
}

/** Win sunburst: rotating rays around a warm core; origin at its centre, `radius` to the ray tips. */
export function drawSunburst(radius: number, rays = 14): Graphics {
    const g = new Graphics();
    const half = Math.PI / rays / 2;
    for (let i = 0; i < rays; i++) {
        const a = (i / rays) * Math.PI * 2;
        g.poly([
            0,
            0,
            Math.cos(a - half) * radius,
            Math.sin(a - half) * radius,
            Math.cos(a + half) * radius,
            Math.sin(a + half) * radius,
        ]).fill({ color: COLOR['sun-300'].color, alpha: 0.22 });
    }
    g.circle(0, 0, radius * 0.42).fill({ color: COLOR['sun-500'].color, alpha: 0.22 });
    g.circle(0, 0, radius * 0.24).fill({ color: COLOR['sun-300'].color, alpha: 0.35 });
    return g;
}

/** Four-point twinkle, white so it can be tinted; origin at its centre, `size` to each tip. */
export function drawSparkle(size: number): Graphics {
    const t = size * 0.22;
    const g = new Graphics();
    g.poly([0, -size, t, -t, size, 0, t, t, 0, size, -t, t, -size, 0, -t, -t]).fill(
        COLOR['text-title'],
    );
    return g;
}

/** Shockwave ring, white so it can be tinted; origin at its centre. */
export function drawRing(radius: number, width: number): Graphics {
    return new Graphics().circle(0, 0, radius).stroke({ width, ...COLOR['text-title'] });
}

/**
 * Enforces the split between the game and its UI (run by `make check`).
 *
 * - `src/game/`     pure rules and state: imports nothing but itself.
 * - `src/contract/` the game ↔ UI interface: types from `src/game/` only.
 * - `src/ui/`       React: may import react, fonts, `src/contract/` and pure `src/game/`;
 *                   never Pixi, GSAP, DI or anything under `src/app/`, `src/dp/`, `src/audio/`.
 * - `src/app/`, `src/dp/`, `src/audio/`: the Pixi game; never React or `src/ui/`.
 * - `src/main.ts` is the composition root and may import both sides.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

type Layer = 'game' | 'contract' | 'ui' | 'world' | 'assets' | 'root';

const SRC = resolve(import.meta.dirname, '../src');
const IMPORT = /(?:import|export)\s+(?:type\s+)?(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g;

/** Layers each layer may import, and the packages it may use (prefix match). */
const RULES: Record<Layer, { layers: Layer[]; packages: string[] }> = {
    game: { layers: ['game'], packages: [] },
    contract: { layers: ['contract', 'game'], packages: [] },
    ui: { layers: ['ui', 'contract', 'game'], packages: ['react', 'react-dom', '@fontsource/'] },
    world: {
        layers: ['world', 'game', 'contract', 'assets'],
        packages: [
            'pixi.js',
            'gsap',
            'inversify',
            'reflect-metadata',
            'eventemitter3',
            'howler',
            '@fontsource/',
        ],
    },
    assets: { layers: ['assets'], packages: [] },
    root: { layers: ['game', 'contract', 'ui', 'world', 'assets'], packages: ['pixi.js'] },
};

function layerOf(file: string): Layer {
    const top = relative(SRC, file).split(/[\\/]/)[0];
    if (top === 'game' || top === 'contract' || top === 'ui' || top === 'assets') return top;
    if (top === 'app' || top === 'dp' || top === 'audio') return 'world';
    return 'root';
}

function* sources(dir: string): Generator<string> {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) yield* sources(path);
        else if (/\.tsx?$/.test(entry.name)) yield path;
    }
}

const errors: string[] = [];
for (const file of sources(SRC)) {
    const from = layerOf(file);
    const rule = RULES[from];
    for (const [, spec] of readFileSync(file, 'utf8').matchAll(IMPORT)) {
        if (!spec) continue;
        let ok: boolean;
        let target: string;
        if (spec.startsWith('.') || spec.startsWith('@dp-instant/')) {
            const path = spec.startsWith('.')
                ? resolve(dirname(file), spec)
                : join(SRC, 'dp', spec.slice(12));
            const to = layerOf(path);
            ok = rule.layers.includes(to) || /\.css$/.test(spec);
            target = `${to} (${relative(SRC, path)})`;
        } else {
            ok = rule.packages.some(
                (p) => spec === p || spec.startsWith(p.endsWith('/') ? p : `${p}/`),
            );
            target = `package ${spec}`;
        }
        if (!ok) errors.push(`  src/${relative(SRC, file)}: ${from} must not import ${target}`);
    }
}

if (errors.length) {
    console.error(
        `[boundaries] ${errors.length} import(s) cross the game/UI split:\n${errors.join('\n')}`,
    );
    process.exit(1);
}
console.log('[boundaries] game, contract and UI layers are separate');

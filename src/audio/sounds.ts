import type manifest from '../assets/assets.json';
import type { SoundSprite } from './Sound.ts';

/*
 * The game's sounds: one sprite that `make assets` builds out of the recordings listed under
 * `sounds` in src/assets/assets.json. Globbed, so the game runs before any sound is built.
 */
const SRC = import.meta.glob<string>('../assets/sounds/sprite.mp3', {
    eager: true,
    query: '?url',
    import: 'default',
});
const MAP = import.meta.glob<{ sprite: Record<string, number[]> }>('../assets/sounds/sprite.json', {
    eager: true,
    import: 'default',
});

export const soundSprite = (): SoundSprite | undefined => {
    const src = Object.values(SRC)[0];
    const map = Object.values(MAP)[0];
    if (!src || !map) return undefined;
    return {
        src,
        sprite: Object.fromEntries(
            Object.entries(map.sprite).map(([name, [offset, duration]]) => [
                name,
                [offset!, duration!],
            ]),
        ),
    };
};

export type SoundName = keyof (typeof manifest)['sounds']['sprite'] & string;

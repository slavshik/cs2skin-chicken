import { Howl, Howler } from 'howler';

/** A Howler sound sprite: one file and `[offset ms, duration ms]` per sound. */
export interface SoundSprite {
    src: string;
    sprite: Record<string, [number, number]>;
}

/**
 * Howler wrapper:
 * - silent until the first real user gesture (`unlock()`), as browsers require;
 * - muted while the game is paused, e.g. on a hidden tab (`setPaused`).
 *
 * Plays sounds from one sprite by name. Without a sprite (no sounds built yet) it plays nothing.
 */
export class Sound<Name extends string> {
    private readonly howl?: Howl;
    private unlocked = false;
    private paused = false;

    constructor(sprite?: SoundSprite) {
        Howler.autoSuspend = false;
        this.apply();
        if (!sprite) return;
        this.howl = new Howl({
            src: [sprite.src],
            format: [formatOf(sprite.src)],
            sprite: sprite.sprite,
            preload: true,
        });
    }

    /** Call from inside a pointer/touch handler. */
    unlock(): void {
        if (this.unlocked) return;
        this.unlocked = true;
        this.apply();
    }

    setPaused(paused: boolean): void {
        this.paused = paused;
        this.apply();
    }

    play(name: Name, rate = 1): void {
        if (!this.howl || !this.unlocked || this.paused) return;
        const id = this.howl.play(name);
        this.howl.rate(rate, id);
    }

    stopAll(): void {
        Howler.stop();
    }

    private apply(): void {
        Howler.mute(!this.unlocked || this.paused);
    }
}

function formatOf(src: string): string {
    const match = /^data:audio\/([\w+-]+)/.exec(src) ?? /\.(\w+)$/.exec(src);
    const type = match?.[1] ?? 'mp3';
    return type === 'mpeg' ? 'mp3' : type === 'x-wav' ? 'wav' : type;
}

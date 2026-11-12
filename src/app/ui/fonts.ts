import lilitaOne from '@fontsource/lilita-one/files/lilita-one-latin-400-normal.woff2';
import { BitmapFont, type TextStyleOptions } from 'pixi.js';

/** Lilita One (OFL), a heavy rounded face. The Latin WOFF2 (~11 KB) ships with the bundle. */
export const FONT_FAMILY = 'Lilita One';
const FALLBACK = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/** Bitmap fonts baked from Lilita One at boot: use as `fontFamily` of a `BitmapText`. */
export const BITMAP = {
    /** Dark text on a light background. */
    dark: 'lilita-dark',
    /** White with a dark outline. Tint it for colour (gold, red). */
    outlined: 'lilita-outlined',
} as const;

const CHARS = [['A', 'Z'], ['a', 'z'], ['0', '9'], " !?.,'&:-_"];
/** Glyphs are baked at twice these sizes, the largest they appear on a retina screen. */
const RESOLUTION = 2;

/** Registers the embedded font with the document. Falls back to system fonts on failure. */
export async function loadFonts(): Promise<void> {
    try {
        const face = new FontFace(FONT_FAMILY, `url(${lilitaOne}) format('woff2')`);
        document.fonts.add(await face.load());
    } catch (error) {
        console.warn('[fonts] Lilita One failed to load; using system fonts.', error);
    }
}

/** Bakes the bitmap fonts. Call after `loadFonts()`, before any view renders text. */
export function installBitmapFonts(): void {
    const fontFamily = `"${FONT_FAMILY}", ${FALLBACK}`;
    BitmapFont.install({
        name: BITMAP.dark,
        style: { fontFamily, fontSize: 72, fill: 0x1a1a1a },
        chars: CHARS,
        resolution: RESOLUTION,
    });
    BitmapFont.install({
        name: BITMAP.outlined,
        style: {
            fontFamily,
            fontSize: 56,
            fill: 0xffffff,
            stroke: { color: 0x14142a, width: 9, join: 'round' },
        },
        chars: CHARS,
        resolution: RESOLUTION,
    });
}

/** Canvas `Text` style for the few labels a bitmap font can't serve. */
export const outlinedLabel: TextStyleOptions = {
    fill: 0xffffff,
    fontFamily: `"${FONT_FAMILY}", ${FALLBACK}`,
    fontSize: 40,
    stroke: { color: 0x14142a, width: 8, join: 'round' },
};

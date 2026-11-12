import chakra600 from '@fontsource/chakra-petch/files/chakra-petch-latin-600-normal.woff2';
import chakra700 from '@fontsource/chakra-petch/files/chakra-petch-latin-700-normal.woff2';
import lilitaOne from '@fontsource/lilita-one/files/lilita-one-latin-400-normal.woff2';
import { BitmapFont, type TextStyleOptions } from 'pixi.js';

/**
 * Two faces, both OFL, embedded as Latin WOFF2:
 * - Chakra Petch (design system `--font-ui`): numbers, labels, the bet panel.
 * - Lilita One, heavy and rounded: in-game callouts only ("Splat!", "Cashed out").
 */
export const FONT_FAMILY = 'Lilita One';
export const UI_FAMILY = 'Chakra Petch';
const FALLBACK = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/** Bitmap fonts baked at boot: use as `fontFamily` of a `BitmapText`. */
export const BITMAP = {
    /** Dark text on a light background. */
    dark: 'lilita-dark',
    /** White with a dark outline. Tint it for colour (gold, red). */
    outlined: 'lilita-outlined',
    /** Chakra Petch 600, white: labels and amounts. Tint it with a COLOR token. */
    ui: 'chakra-600',
    /** Chakra Petch 700, white: multipliers and buttons. Tint it with a COLOR token. */
    uiBold: 'chakra-700',
} as const;

const CHARS = [['A', 'Z'], ['a', 'z'], ['0', '9'], " !?.,'&:-_+$/%#()"];
/** Glyphs are baked at twice these sizes, the largest they appear on a retina screen. */
const RESOLUTION = 2;

/** Registers the embedded fonts with the document. Falls back to system fonts on failure. */
export async function loadFonts(): Promise<void> {
    const faces = [
        new FontFace(FONT_FAMILY, `url(${lilitaOne}) format('woff2')`),
        new FontFace(UI_FAMILY, `url(${chakra600}) format('woff2')`, { weight: '600' }),
        new FontFace(UI_FAMILY, `url(${chakra700}) format('woff2')`, { weight: '700' }),
    ];
    await Promise.all(
        faces.map(async (face) => {
            try {
                document.fonts.add(await face.load());
            } catch (error) {
                console.warn(`[fonts] ${face.family} failed to load; using system fonts.`, error);
            }
        }),
    );
}

/** Bakes the bitmap fonts. Call after `loadFonts()`, before any view renders text. */
export function installBitmapFonts(): void {
    const fontFamily = `"${FONT_FAMILY}", ${FALLBACK}`;
    const uiFamily = `"${UI_FAMILY}", ${FALLBACK}`;
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
    BitmapFont.install({
        name: BITMAP.ui,
        style: { fontFamily: uiFamily, fontSize: 32, fontWeight: '600', fill: 0xffffff },
        chars: CHARS,
        resolution: RESOLUTION,
    });
    BitmapFont.install({
        name: BITMAP.uiBold,
        style: { fontFamily: uiFamily, fontSize: 48, fontWeight: '700', fill: 0xffffff },
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

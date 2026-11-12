import { BitmapText } from 'pixi.js';
import { BITMAP } from './fonts.ts';
import { COLOR, type ColorToken } from './tokens.ts';

/** A design-system label: Chakra Petch bitmap text, tinted with a colour token. */
export function label(
    text: string,
    size: number,
    color: ColorToken = 'text-body',
    bold = false,
): BitmapText {
    const t = new BitmapText({
        text,
        style: { fontFamily: bold ? BITMAP.uiBold : BITMAP.ui, fontSize: size },
    });
    t.tint = COLOR[color].color;
    return t;
}

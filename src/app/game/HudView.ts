import { Container, Graphics } from 'pixi.js';
import { View } from '@dp-instant/2d/View.ts';
import { formatMoney, formatMultShort } from '../../game/format.ts';
import type { GameModel } from '../../game/GameModel.ts';
import { label } from '../ui/text.ts';
import { COLOR } from '../ui/tokens.ts';

export const HUD_HEIGHT = 28;

/** Balance on the left, the last round results as chips on the right (MultiplierChip.md). */
export class HudView extends View {
    private readonly coin = new Graphics()
        .circle(8, HUD_HEIGHT / 2, 8)
        .fill(COLOR['sun-500'])
        .circle(8, HUD_HEIGHT / 2, 5)
        .stroke({ width: 1.5, ...COLOR['sun-700'] });
    private readonly balance = label('', 16, 'text-title', true);
    private readonly caption = label('Balance', 12, 'text-subtle');
    private readonly history = new Container();
    private w = 0;

    constructor() {
        super();
        this.addChild(this.caption, this.coin, this.balance, this.history);
    }

    layout(width: number): void {
        this.w = width;
    }

    render(m: GameModel): void {
        this.caption.position.set(0, (HUD_HEIGHT - this.caption.height) / 2);
        this.coin.x = this.caption.width + 8;
        this.balance.text = formatMoney(m.balance);
        this.balance.position.set(this.coin.x + 22, (HUD_HEIGHT - this.balance.height) / 2);

        for (const child of this.history.removeChildren()) child.destroy({ children: true });
        let x = this.w;
        const minX = this.balance.x + this.balance.width + 16;
        for (const r of m.history) {
            const text = label(
                formatMultShort(r.mult),
                12,
                r.won ? 'grass-300' : 'blood-400',
                true,
            );
            const cw = text.width + 20;
            if (x - cw < minX) break;
            x -= cw;
            const chip = new Container();
            chip.addChild(
                new Graphics()
                    .roundRect(0, 0, cw, 24, 12)
                    .fill(COLOR[r.won ? 'grass-800' : 'blood-900']),
                text,
            );
            text.position.set(10, (24 - text.height) / 2);
            chip.position.set(x, (HUD_HEIGHT - 24) / 2);
            this.history.addChild(chip);
            x -= 6;
        }
    }
}

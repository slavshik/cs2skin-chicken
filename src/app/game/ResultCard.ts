import { gsap } from 'gsap';
import { BitmapText, Container, Graphics } from 'pixi.js';
import { formatMoney, formatMult } from '../../game/format.ts';
import { BITMAP } from '../ui/fonts.ts';
import { label } from '../ui/text.ts';
import { COLOR, RADIUS } from '../ui/tokens.ts';

const CARD_W = 260;
const CARD_H = 156;
const HOLD = 1.2;

/** design/components/ResultBanner.md: the end-of-round card over a scrim. Tap skips it. */
export class ResultCard extends Container {
    private readonly scrim = new Graphics();
    private readonly card = new Container();
    private readonly cardBg = new Graphics();
    private readonly title = new BitmapText({
        text: '',
        style: { fontFamily: BITMAP.outlined, fontSize: 30 },
    });
    private readonly value = label('', 40, 'text-title', true);
    private readonly sub = label('', 16, 'text-title');
    private timeline?: gsap.core.Timeline;

    constructor() {
        super();
        for (const t of [this.title, this.value, this.sub]) t.anchor.set(0.5);
        this.title.y = -42;
        this.value.y = 4;
        this.sub.y = 46;
        this.card.addChild(this.cardBg, this.title, this.value, this.sub);
        this.addChild(this.scrim, this.card);
        this.visible = false;
        this.eventMode = 'static';
        this.on('pointertap', () => this.timeline?.progress(1));
    }

    layout(width: number, height: number): void {
        this.scrim.clear().rect(0, 0, width, height).fill(COLOR.overlay);
        this.card.position.set(width / 2, height / 2);
    }

    /** Plays the card in, holds, fades out; resolves when it is gone. */
    show(won: boolean, mult: number, amount: number): Promise<void> {
        const fill = won ? COLOR['grass-800'] : COLOR['blood-900'];
        const edge = won ? COLOR['grass-600'] : COLOR['blood-800'];
        const accent = won ? COLOR['grass-300'] : COLOR['blood-400'];
        this.cardBg
            .clear()
            .roundRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, RADIUS['radius-xl'])
            .fill(fill)
            .stroke({ width: 1.5, ...edge });
        this.title.text = won ? 'CASHED OUT!' : 'SPLAT!';
        this.title.tint = accent.color;
        this.value.text = formatMult(mult);
        this.sub.text = won ? `+${formatMoney(amount)}` : `-${formatMoney(amount)}`;
        this.sub.tint = accent.color;

        this.visible = true;
        return new Promise((resolve) => {
            this.timeline = gsap
                .timeline({
                    onComplete: () => {
                        this.visible = false;
                        resolve();
                    },
                })
                .fromTo(this.scrim, { alpha: 0 }, { alpha: 1, duration: 0.15 })
                .fromTo(this.card, { alpha: 0 }, { alpha: 1, duration: 0.18 }, 0)
                .fromTo(
                    this.card.scale,
                    { x: 0.92, y: 0.92 },
                    { x: 1, y: 1, duration: 0.18, ease: 'back.out(2)' },
                    0,
                )
                .to([this.scrim, this.card], { alpha: 0, duration: 0.2 }, `+=${HOLD}`);
        });
    }
}

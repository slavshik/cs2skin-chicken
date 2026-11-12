import { Graphics } from 'pixi.js';
import { View } from '@dp-instant/2d/View.ts';
import { formatMoney, formatMult } from '../../game/format.ts';
import type { GameModel } from '../../game/GameModel.ts';
import {
    type BetOp,
    CARS,
    DIFFICULTIES,
    type Difficulty,
    multiplier,
    payout,
} from '../../game/rules.ts';
import { Button } from '../ui/Button.ts';
import { label } from '../ui/text.ts';
import { COLOR, RADIUS, SIZE, SPACE } from '../ui/tokens.ts';

const PAD = SPACE['space-400'];
const CONTROL = SIZE['control-height'];
const SEGMENT = SIZE['segment-height'];
const CHIP = SIZE['chip-height'];
/** Rows (y of each, then the total), from design/components/BetPanel.md. */
const Y = {
    betLabel: 16,
    field: 42,
    diffLabel: 106,
    segments: 132,
    stat: 186,
    slotA: 218,
    slotB: 278,
};
export const PANEL_HEIGHT = 342;

const BET_CHIPS: readonly [BetOp, string][] = [
    ['half', '1/2'],
    ['double', '2x'],
    ['min', 'Min'],
    ['max', 'Max'],
];
const TITLE: Record<Difficulty, string> = {
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    hardcore: 'Hardcore',
};

/**
 * Bet panel: stake, difficulty, round CTA. Emits `BET` (op), `DIFFICULTY` (d), `PRIMARY`,
 * `CASH_OUT`; the mediator decides what they mean in the current phase.
 */
export class PanelView extends View {
    static readonly BET = 'bet';
    static readonly DIFFICULTY = 'difficulty';
    static readonly PRIMARY = 'primary';
    static readonly CASH_OUT = 'cashOut';

    private readonly bg = new Graphics();
    private readonly field = new Graphics();
    private readonly betLabel = label('Bet Amount', 14, 'text-subtle');
    private readonly betInfo = label('', 14, 'text-muted');
    private readonly amount = label('', 16, 'text-title', true);
    private readonly diffLabel = label('Difficulty', 14, 'text-subtle');
    private readonly diffInfo = label('', 14, 'text-muted');
    private readonly statLabel = label('', 13, 'text-subtle');
    private readonly statValue = label('', 13, 'text-title', true);
    private readonly hint = label('Tap the next manhole, or press Space', 12, 'text-subtle');
    private readonly chips = BET_CHIPS.map(([op, text]) =>
        this.button('chip', text, 12, PanelView.BET, op),
    );
    private readonly segments = DIFFICULTIES.map((d) =>
        this.button('segment', TITLE[d], 12, PanelView.DIFFICULTY, d),
    );
    private readonly cashOut = this.button('cashout', 'Cash Out', 15, PanelView.CASH_OUT);
    private readonly primary = this.button('primary', 'Place Bet', 15, PanelView.PRIMARY);
    private w: number = SIZE['bet-panel-width'];

    constructor() {
        super();
        this.hint.anchor.set(0.5);
        this.addChildAt(this.bg, 0);
        this.addChildAt(this.field, 1);
        this.addChild(this.betLabel, this.betInfo, this.amount);
        this.addChild(this.diffLabel, this.diffInfo, this.statLabel, this.statValue, this.hint);
        this.layout(this.w);
    }

    layout(width: number): void {
        this.w = width;
        const inner = width - PAD * 2;
        this.bg
            .clear()
            .roundRect(0, 0, width, PANEL_HEIGHT, RADIUS['radius-lg'])
            .fill(COLOR['bg-900']);

        this.betLabel.position.set(PAD, Y.betLabel);
        this.field
            .clear()
            .roundRect(PAD, Y.field, inner, CONTROL, RADIUS['radius-md'])
            .fill(COLOR['bg-950'])
            .circle(PAD + 24, Y.field + CONTROL / 2, 9)
            .fill(COLOR['sun-500'])
            .circle(PAD + 24, Y.field + CONTROL / 2, 5.5)
            .stroke({ width: 1.5, ...COLOR['sun-700'] });
        this.amount.position.set(PAD + 42, Y.field + CONTROL / 2 - this.amount.height / 2);
        let x = PAD + inner - 6;
        for (const chip of [...this.chips].reverse()) {
            const cw = chip === this.chips[0] ? 34 : chip === this.chips[1] ? 30 : 38;
            x -= cw;
            chip.setBox(cw, CHIP).position.set(x, Y.field + (CONTROL - CHIP) / 2);
            x -= 4;
        }

        this.diffLabel.position.set(PAD, Y.diffLabel);
        const gap = SPACE['space-200'];
        const sw = (inner - gap * 3) / 4;
        this.segments.forEach((s, i) =>
            s.setBox(sw, SEGMENT).position.set(PAD + i * (sw + gap), Y.segments),
        );

        this.statLabel.position.set(PAD, Y.stat);
        this.cashOut.setBox(inner, CONTROL).position.set(PAD, Y.slotA);
        this.hint.position.set(width / 2, Y.slotA + CONTROL / 2);
        this.primary.setBox(inner, CONTROL).position.set(PAD, Y.slotB);
        this.alignRight();
    }

    render(m: GameModel): void {
        const idle = m.phase === 'idle';
        const live = m.phase === 'live';

        this.amount.text = formatMoney(m.bet);
        this.betInfo.text = m.bet > m.balance && idle ? 'Over balance' : '';
        this.betInfo.tint = COLOR['blood-400'].color;
        for (const chip of this.chips) chip.setEnabled(idle);

        const cars = CARS[m.difficulty];
        this.diffInfo.text = `${m.lanes} lanes, ${cars} car${cars > 1 ? 's' : ''}`;
        this.segments.forEach((s, i) =>
            s.setEnabled(idle).setSelected(DIFFICULTIES[i] === m.difficulty),
        );

        if (idle) {
            this.statLabel.text = 'Max multiplier';
            this.statValue.text = formatMult(multiplier(m.difficulty, m.lanes));
            this.statValue.tint = COLOR['sun-500'].color;
        } else if (m.step === 0) {
            this.statLabel.text = 'First lane';
            this.statValue.text = formatMult(m.nextMult);
            this.statValue.tint = COLOR['sun-500'].color;
        } else {
            this.statLabel.text = 'Profit on cash out';
            this.statValue.text = `+${formatMoney(payout(m.bet, m.currentMult) - m.bet)}`;
            this.statValue.tint = COLOR['grass-300'].color;
        }

        this.hint.visible = idle;
        this.cashOut.visible = !idle;
        this.cashOut
            .setText('Cash Out', m.step > 0 ? formatMult(m.currentMult) : '')
            .setEnabled(m.canCashOut);
        this.primary.setText(idle ? 'Place Bet' : 'Go').setEnabled(idle ? m.canBet : live);
        this.alignRight();
    }

    private alignRight(): void {
        const right = this.w - PAD;
        this.betInfo.position.set(right - this.betInfo.width, Y.betLabel);
        this.diffInfo.position.set(right - this.diffInfo.width, Y.diffLabel);
        this.statValue.position.set(right - this.statValue.width, Y.stat);
    }

    private button(
        variant: ConstructorParameters<typeof Button>[0],
        text: string,
        size: number,
        event: string,
        payload?: unknown,
    ): Button {
        const b = new Button(variant, text, size);
        b.on(Button.PRESS, () => this.emit(event, payload));
        this.addChild(b);
        return b;
    }
}

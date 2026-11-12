import { inject } from 'inversify';
import { injectable } from '@dp-instant/core/injectable.ts';
import { Mediator } from '@dp-instant/2d/Mediator.ts';
import type { GameServer } from '../../contract/ServerApi.ts';
import type { GameModel } from '../../game/GameModel.ts';
import {
    adjustBet,
    type BetOp,
    clampBet,
    DIFFICULTIES,
    type Difficulty,
} from '../../game/rules.ts';
import { CashOutAction } from '../actions/round/CashOutAction.ts';
import { PlaceBetAction } from '../actions/round/PlaceBetAction.ts';
import { errorText, type RoundContext } from '../actions/round/RoundContext.ts';
import { StepAction } from '../actions/round/StepAction.ts';
import { AppEvents, UiEvents } from '../events.ts';
import { TypesApp } from '../types.ts';
import { BoardView } from './BoardView.ts';
import type { GameScreen } from './GameScreen.ts';

/**
 * Turns input into round actions: `UiEvents` from the React layer, taps on the next manhole,
 * and keys (Space = Go / next lane, Enter = Cash Out, 1–4 = difficulty while betting).
 */
@injectable()
export class GameMediator extends Mediator<GameScreen> {
    @inject(TypesApp.model) declare readonly model: GameModel;
    @inject(TypesApp.server) declare readonly server: GameServer;

    private running = false;
    private readonly onKey = (e: KeyboardEvent): void => this.handleKey(e);

    protected initialize(): void {
        this.view!.board.on(BoardView.LANE_TAP, this.onStep, this);
        this.addListener(UiEvents.PLACE_BET, this.onPlaceBet);
        this.addListener(UiEvents.STEP, this.onStep);
        this.addListener(UiEvents.CASH_OUT, this.onCashOut);
        this.addListener(UiEvents.SET_BET, this.onSetBet);
        this.addListener(UiEvents.BET_OP, this.onBetOp);
        this.addListener(UiEvents.SET_DIFFICULTY, this.onDifficulty);
        this.addListener(UiEvents.RESET_BALANCE, this.onResetBalance);
        window.addEventListener('keydown', this.onKey);

        this.view!.board.setup(this.model.difficulty, this.model.lanes);
        this.changed();
    }

    override destroy(): void {
        window.removeEventListener('keydown', this.onKey);
        this.view?.board.off(BoardView.LANE_TAP, this.onStep, this);
        super.destroy();
    }

    private get context(): RoundContext {
        return { server: this.server, model: this.model, board: this.view!.board };
    }

    private onPlaceBet(): void {
        if (this.model.phase === 'idle') void this.run(new PlaceBetAction());
    }

    private onStep(): void {
        if (this.model.phase === 'live') void this.run(new StepAction());
    }

    private onCashOut(): void {
        if (this.model.canCashOut) void this.run(new CashOutAction());
    }

    private onSetBet(cents: number): void {
        if (this.model.phase !== 'idle' || !Number.isFinite(cents)) return;
        this.model.bet = clampBet(cents, this.model.balance);
        this.changed();
    }

    private onBetOp(op: BetOp): void {
        if (this.model.phase !== 'idle') return;
        this.model.bet = adjustBet(this.model.bet, op, this.model.balance);
        this.changed();
    }

    private onDifficulty(difficulty: Difficulty): void {
        if (this.model.phase !== 'idle' || difficulty === this.model.difficulty) return;
        this.model.difficulty = difficulty;
        this.view!.board.setup(difficulty, this.model.lanes);
        this.changed();
    }

    private async onResetBalance(): Promise<void> {
        if (this.model.phase !== 'idle' || !this.model.isBroke) return;
        try {
            this.model.balance = (await this.server.refill()).balance;
            this.model.bet = Math.min(this.model.bet, this.model.balance);
        } catch (error) {
            this.model.error = errorText(error);
        }
        this.changed();
    }

    /** One round action at a time; input during an animation is dropped. */
    private async run(action: PlaceBetAction | StepAction | CashOutAction): Promise<void> {
        if (this.running) return;
        this.running = true;
        try {
            await action.run(this.context);
        } finally {
            this.running = false;
            action.destroy();
        }
    }

    private changed(): void {
        this.dispatch(AppEvents.MODEL_CHANGED);
    }

    private handleKey(e: KeyboardEvent): void {
        const target = e.target as HTMLElement | null;
        if (e.repeat || target?.closest('input, textarea, button, select')) return;
        if (e.code === 'Space') {
            e.preventDefault();
            if (this.model.phase === 'idle') this.onPlaceBet();
            else this.onStep();
        } else if (e.code === 'Enter') {
            this.onCashOut();
        } else if (this.model.phase === 'idle' && /^Digit[1-4]$/.test(e.code)) {
            const d = DIFFICULTIES[Number(e.code.slice(5)) - 1];
            if (d) this.onDifficulty(d);
        }
    }
}

import { inject } from 'inversify';
import { injectable } from '@dp-instant/core/injectable.ts';
import { Mediator } from '@dp-instant/2d/Mediator.ts';
import type { GameModel } from '../../game/GameModel.ts';
import { adjustBet, type BetOp, DIFFICULTIES, type Difficulty } from '../../game/rules.ts';
import { CashOutAction } from '../actions/round/CashOutAction.ts';
import { PlaceBetAction } from '../actions/round/PlaceBetAction.ts';
import type { RoundContext } from '../actions/round/RoundContext.ts';
import { StepAction } from '../actions/round/StepAction.ts';
import { AppEvents } from '../events.ts';
import { TypesApp } from '../types.ts';
import { BoardView } from './BoardView.ts';
import { GameScreen } from './GameScreen.ts';
import { PanelView } from './PanelView.ts';

/**
 * Turns input (panel, manhole taps, keyboard) into round actions and keeps the panel and HUD
 * in step with the model. Keys: Space = Place Bet / Go, Enter = Cash Out, 1–4 = difficulty.
 */
@injectable()
export class GameMediator extends Mediator<GameScreen> {
    @inject(TypesApp.model) declare readonly model: GameModel;

    private running = false;
    private readonly onKey = (e: KeyboardEvent): void => this.handleKey(e);

    protected initialize(): void {
        const { panel, board } = this.view!;
        panel.on(PanelView.PRIMARY, this.onPrimary, this);
        panel.on(PanelView.CASH_OUT, this.onCashOut, this);
        panel.on(PanelView.BET, this.onBet, this);
        panel.on(PanelView.DIFFICULTY, this.onDifficulty, this);
        board.on(BoardView.LANE_TAP, this.onPrimary, this);
        this.addViewListener(GameScreen.RESIZED, this.render);
        this.addListener(AppEvents.MODEL_CHANGED, this.render);
        window.addEventListener('keydown', this.onKey);

        board.setup(this.model.difficulty, this.model.lanes);
        this.render();
    }

    override destroy(): void {
        window.removeEventListener('keydown', this.onKey);
        const view = this.view;
        view?.panel.removeAllListeners();
        view?.board.off(BoardView.LANE_TAP, this.onPrimary, this);
        super.destroy();
    }

    private get context(): RoundContext {
        return { model: this.model, board: this.view!.board };
    }

    private onPrimary(): void {
        if (this.model.phase === 'idle') void this.run(new PlaceBetAction());
        else if (this.model.phase === 'live') void this.run(new StepAction());
    }

    private onCashOut(): void {
        if (this.model.canCashOut) void this.run(new CashOutAction());
    }

    private onBet(op: BetOp): void {
        if (this.model.phase !== 'idle') return;
        this.model.bet = adjustBet(this.model.bet, op, this.model.balance);
        this.render();
    }

    private onDifficulty(difficulty: Difficulty): void {
        if (this.model.phase !== 'idle' || difficulty === this.model.difficulty) return;
        this.model.difficulty = difficulty;
        this.view!.board.setup(difficulty, this.model.lanes);
        this.render();
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
            this.render();
        }
    }

    private render(): void {
        if (!this.view) return;
        this.view.panel.render(this.model);
        this.view.hud.render(this.model);
    }

    private handleKey(e: KeyboardEvent): void {
        if (e.repeat || e.target instanceof HTMLInputElement) return;
        if (e.code === 'Space') {
            e.preventDefault();
            this.onPrimary();
        } else if (e.code === 'Enter') {
            this.onCashOut();
        } else if (/^Digit[1-4]$/.test(e.code)) {
            const d = DIFFICULTIES[Number(e.code.slice(5)) - 1];
            if (d) this.onDifficulty(d);
        }
    }
}

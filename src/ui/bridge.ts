import { GlobalEventProvider } from '@dp-instant/core/GlobalEventProvider.ts';
import { AppEvents, UiEvents } from '../app/events.ts';
import type { GameModel, Phase, RoundResult } from '../game/GameModel.ts';
import type { BetOp, Difficulty } from '../game/rules.ts';

/** What the React layer renders: an immutable copy of the model, replaced on every change. */
export interface GameSnapshot {
    phase: Phase;
    balance: number;
    bet: number;
    difficulty: Difficulty;
    step: number;
    lanes: number;
    currentMult: number;
    nextMult: number;
    canBet: boolean;
    canCashOut: boolean;
    isBroke: boolean;
    lastResult?: RoundResult;
}

/**
 * The only link between React (`src/ui/`) and the game: commands go out as `UiEvents`, the
 * model comes back as snapshots for `useSyncExternalStore`. React never touches Pixi or the
 * model directly.
 */
export class UiBridge extends GlobalEventProvider {
    private readonly model: GameModel;
    private readonly subscribers = new Set<() => void>();
    private snapshot: GameSnapshot;

    constructor(model: GameModel) {
        super();
        this.model = model;
        this.snapshot = this.read();
        this.addListener(AppEvents.MODEL_CHANGED, this.sync);
    }

    readonly subscribe = (fn: () => void): (() => void) => {
        this.subscribers.add(fn);
        return () => this.subscribers.delete(fn);
    };

    readonly getSnapshot = (): GameSnapshot => this.snapshot;

    placeBet(): void {
        this.dispatch(UiEvents.PLACE_BET);
    }

    step(): void {
        this.dispatch(UiEvents.STEP);
    }

    cashOut(): void {
        this.dispatch(UiEvents.CASH_OUT);
    }

    setBet(cents: number): void {
        this.dispatch(UiEvents.SET_BET, cents);
    }

    betOp(op: BetOp): void {
        this.dispatch(UiEvents.BET_OP, op);
    }

    setDifficulty(difficulty: Difficulty): void {
        this.dispatch(UiEvents.SET_DIFFICULTY, difficulty);
    }

    resetBalance(): void {
        this.dispatch(UiEvents.RESET_BALANCE);
    }

    private sync(): void {
        this.snapshot = this.read();
        for (const fn of this.subscribers) fn();
    }

    private read(): GameSnapshot {
        const m = this.model;
        return {
            phase: m.phase,
            balance: m.balance,
            bet: m.bet,
            difficulty: m.difficulty,
            step: m.step,
            lanes: m.lanes,
            currentMult: m.currentMult,
            nextMult: m.nextMult,
            canBet: m.canBet,
            canCashOut: m.canCashOut,
            isBroke: m.isBroke,
            lastResult: m.lastResult && { ...m.lastResult },
        };
    }
}

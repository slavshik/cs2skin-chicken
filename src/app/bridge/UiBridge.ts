import { GlobalEventProvider } from '@dp-instant/core/GlobalEventProvider.ts';
import type { BetOp, Difficulty, GameApi, GameSnapshot } from '../../contract/GameApi.ts';
import type { GameModel } from '../../game/GameModel.ts';
import { AppEvents, UiEvents } from '../events.ts';

/**
 * The game's side of `GameApi`: UI commands become `UiEvents` for `GameMediator`, and every
 * `MODEL_CHANGED` publishes a fresh snapshot. The only object the React layer is handed.
 */
export class UiBridge extends GlobalEventProvider implements GameApi {
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

    changeBet(): void {
        this.dispatch(UiEvents.CHANGE_BET);
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
            canChangeBet: m.canChangeBet,
            isBroke: m.isBroke,
            lastResult: m.lastResult && { ...m.lastResult },
            error: m.error,
        };
    }
}

/*
 * The contract between the game and its UI. React (`src/ui/`) sees the game only through this
 * interface; the game implements it in `src/app/bridge/UiBridge.ts`. Types only: nothing here
 * runs, so neither side can reach into the other through it.
 */
import type { Phase, RoundResult } from '../game/GameModel.ts';
import type { BetOp, Difficulty } from '../game/rules.ts';

/** `Phase` — `idle`: betting (popup open); `live`: waiting for a step or Cash Out; `busy`: animating. */
export type { BetOp, Difficulty, Phase, RoundResult };

/** An immutable copy of the game state, replaced on every change. */
export interface GameSnapshot {
    readonly phase: Phase;
    /** Cents. */
    readonly balance: number;
    /** Cents. */
    readonly bet: number;
    readonly difficulty: Difficulty;
    /** Lanes cleared this round. */
    readonly step: number;
    readonly lanes: number;
    /** Multipliers in hundredths (x1.01 → 101). */
    readonly currentMult: number;
    readonly nextMult: number;
    readonly canBet: boolean;
    readonly canCashOut: boolean;
    readonly isBroke: boolean;
    readonly lastResult?: Readonly<RoundResult>;
    /** The last request the server refused or that failed. */
    readonly error?: string;
}

/** Commands the UI may send, and the store it renders from (`useSyncExternalStore`). */
export interface GameApi {
    subscribe(onChange: () => void): () => void;
    getSnapshot(): GameSnapshot;

    placeBet(): void;
    step(): void;
    cashOut(): void;
    /** A typed stake in cents; the game clamps it. */
    setBet(cents: number): void;
    betOp(op: BetOp): void;
    setDifficulty(difficulty: Difficulty): void;
    /** Demo wallet refill, when it can't cover the minimum bet. */
    resetBalance(): void;
}

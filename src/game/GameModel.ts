import type { RoundOpened, Settlement } from '../contract/ServerApi.ts';
import { DEFAULT_BET, type Difficulty, laneCount, MIN_BET, multiplier } from './rules.ts';

/** `idle`: betting; `live`: a round waits for a step or Cash Out; `busy`: a request or animation. */
export type Phase = 'idle' | 'live' | 'busy';

export interface RoundResult {
    won: boolean;
    /** Multiplier in hundredths: the cash-out value, or the lane value that was lost. */
    mult: number;
    /** Cents paid out (0 on a loss). */
    paid: number;
    /** Cents staked. */
    bet: number;
    /** The lane the round ended on: the last cleared one, or the one with the car. */
    lane: number;
    /** The revealed seed matched the hash the server committed to when the round opened. */
    verified: boolean;
}

/**
 * The client's view of the game. The server owns the wallet and decides every outcome; this
 * mirrors its replies, plus the bet and difficulty the player is choosing.
 */
export class GameModel {
    balance = 0;
    bet = DEFAULT_BET;
    difficulty: Difficulty = 'easy';
    phase: Phase = 'idle';
    /** Lanes cleared this round. */
    step = 0;
    /** The open round, as the server knows it. */
    roundId?: string;
    /** The server's commitment for the open round, checked when it ends. */
    seedHash?: string;
    readonly history: RoundResult[] = [];
    /** The round that just ended, shown when the bet popup reopens. */
    lastResult?: RoundResult;
    /** The last request the server refused or that failed, for the UI. */
    error?: string;

    get lanes(): number {
        return laneCount(this.difficulty);
    }

    get currentMult(): number {
        return multiplier(this.difficulty, this.step);
    }

    get nextMult(): number {
        return multiplier(this.difficulty, this.step + 1);
    }

    get canCashOut(): boolean {
        return this.phase === 'live' && this.step > 0;
    }

    get canBet(): boolean {
        return this.phase === 'idle' && this.bet >= MIN_BET && this.bet <= this.balance;
    }

    /** The demo wallet cannot cover the minimum stake. */
    get isBroke(): boolean {
        return this.balance < MIN_BET;
    }

    opened(round: RoundOpened): void {
        this.roundId = round.roundId;
        this.seedHash = round.seedHash;
        this.balance = round.balance;
        this.step = 0;
        this.error = undefined;
    }

    cleared(step: number): void {
        this.step = step;
    }

    settled(s: Settlement, verified: boolean): RoundResult {
        this.balance = s.balance;
        this.roundId = undefined;
        this.seedHash = undefined;
        const result: RoundResult = {
            won: s.won,
            mult: s.mult,
            paid: s.paid,
            bet: s.bet,
            lane: s.lane,
            verified,
        };
        this.lastResult = result;
        this.history.unshift(result);
        this.history.length = Math.min(this.history.length, 12);
        return result;
    }
}

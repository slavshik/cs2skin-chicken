import {
    DEFAULT_BET,
    MIN_BET,
    type Difficulty,
    laneCount,
    multiplier,
    payout,
    planRound,
    START_BALANCE,
} from './rules.ts';

/** `idle`: betting; `live`: a round waits for Go or Cash Out; `busy`: an animation is playing. */
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
}

/** Wallet and round state. Plain data plus transitions; the rules live in `rules.ts`. */
export class GameModel {
    balance = START_BALANCE;
    bet = DEFAULT_BET;
    difficulty: Difficulty = 'easy';
    phase: Phase = 'idle';
    /** Lanes cleared this round. */
    step = 0;
    readonly history: RoundResult[] = [];
    /** The round that just ended, shown when the bet popup reopens. */
    lastResult?: RoundResult;
    /** Lane of the round's first car. Only `isHit` reads it. */
    private hitLane = 0;

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
        return this.phase === 'idle' && this.bet <= this.balance;
    }

    /** The demo wallet cannot cover the minimum stake. */
    get isBroke(): boolean {
        return this.balance < MIN_BET;
    }

    /** Demo only: refills the wallet. */
    resetBalance(): void {
        this.balance = START_BALANCE;
        this.bet = Math.min(this.bet, this.balance);
    }

    /** Takes the stake and draws the round's outcome. */
    startRound(random: () => number): void {
        if (!this.canBet) throw new Error('[model] cannot start a round now');
        this.balance -= this.bet;
        this.step = 0;
        this.hitLane = planRound(this.difficulty, random);
        this.phase = 'live';
    }

    /** Whether stepping into the next lane meets a car. */
    nextIsHit(): boolean {
        return this.step + 1 === this.hitLane;
    }

    clearLane(): void {
        this.step++;
    }

    /** Ends the round: pays out the current multiplier on a win, keeps the stake on a loss. */
    settle(won: boolean): RoundResult {
        const mult = won ? this.currentMult : this.nextMult;
        const paid = won ? payout(this.bet, mult) : 0;
        this.balance += paid;
        const result: RoundResult = {
            won,
            mult,
            paid,
            bet: this.bet,
            lane: won ? this.step : this.step + 1,
        };
        this.lastResult = result;
        this.history.unshift(result);
        this.history.length = Math.min(this.history.length, 12);
        return result;
    }
}

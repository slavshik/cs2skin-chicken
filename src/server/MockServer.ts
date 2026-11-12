import type {
    GameServer,
    RoundOpened,
    ServerErrorCode,
    Session,
    Settlement,
    StepResult,
} from '../contract/ServerApi.ts';
import { hitLaneFor, sha256Hex } from '../game/fairness.ts';
import {
    DIFFICULTIES,
    type Difficulty,
    laneCount,
    MAX_BET,
    MIN_BET,
    multiplier,
    payout,
    START_BALANCE,
} from '../game/rules.ts';

/*
 * A stand-in for the game backend, running in the page. It owns the wallet and every round,
 * validates each request, and decides outcomes from a secret seed the client only sees once
 * the round is over. Replies arrive after a simulated network delay and as JSON copies, so the
 * client can't hold a reference into server state. Swap it for an HTTP client of the same
 * `GameServer` contract to go live.
 */

const LATENCY_MS = [60, 160] as const;

interface Round {
    id: string;
    difficulty: Difficulty;
    bet: number;
    seed: string;
    hitLane: number;
    step: number;
}

export class ServerError extends Error {
    readonly code: ServerErrorCode;

    constructor(code: ServerErrorCode, message: string) {
        super(message);
        this.name = 'ServerError';
        this.code = code;
    }
}

export class MockServer implements GameServer {
    private balance = START_BALANCE;
    private round?: Round;
    private pending: Promise<unknown> = Promise.resolve();

    session(): Promise<Session> {
        return this.reply(() => ({ balance: this.balance }));
    }

    openRound(request: { bet: number; difficulty: Difficulty }): Promise<RoundOpened> {
        const { bet, difficulty } = request;
        return this.reply(async () => {
            if (this.round) fail('round_open', 'Finish the current round first.');
            if (!DIFFICULTIES.includes(difficulty)) fail('bad_request', 'Unknown difficulty.');
            if (!Number.isInteger(bet) || bet < MIN_BET || bet > MAX_BET) {
                fail('bad_request', 'Bet is outside the limits.');
            }
            if (bet > this.balance) fail('insufficient_funds', 'Not enough balance.');

            const seed = randomHex(32);
            this.balance -= bet;
            this.round = {
                id: randomHex(8),
                difficulty,
                bet,
                seed,
                hitLane: hitLaneFor(difficulty, seed),
                step: 0,
            };
            return {
                roundId: this.round.id,
                balance: this.balance,
                lanes: laneCount(difficulty),
                seedHash: await sha256Hex(seed),
            };
        });
    }

    step(roundId: string): Promise<StepResult> {
        return this.reply((): StepResult => {
            const round = this.openRoundById(roundId);
            const lane = round.step + 1;
            if (lane === round.hitLane)
                return { outcome: 'hit', lane, settlement: this.settle(round, false) };
            round.step = lane;
            const mult = multiplier(round.difficulty, lane);
            const last = lane === laneCount(round.difficulty);
            return {
                outcome: 'safe',
                step: lane,
                mult,
                settlement: last ? this.settle(round, true) : undefined,
            };
        });
    }

    cashOut(roundId: string): Promise<Settlement> {
        return this.reply(() => {
            const round = this.openRoundById(roundId);
            if (round.step === 0) fail('nothing_to_cash', 'Cross at least one lane first.');
            return this.settle(round, true);
        });
    }

    refill(): Promise<Session> {
        return this.reply(() => {
            if (this.balance < MIN_BET && !this.round) this.balance = START_BALANCE;
            return { balance: this.balance };
        });
    }

    private openRoundById(roundId: string): Round {
        if (!this.round || this.round.id !== roundId) fail('no_round', 'No such round.');
        return this.round;
    }

    private settle(round: Round, won: boolean): Settlement {
        const mult = multiplier(round.difficulty, won ? round.step : round.step + 1);
        const paid = won ? payout(round.bet, mult) : 0;
        this.balance += paid;
        this.round = undefined;
        return {
            won,
            mult,
            paid,
            bet: round.bet,
            lane: won ? round.step : round.step + 1,
            balance: this.balance,
            reveal: { seed: round.seed, hitLane: round.hitLane },
        };
    }

    /** Runs a handler after a network-like delay and returns a wire copy of its result. */
    private reply<T>(handler: () => T | Promise<T>): Promise<T> {
        const response = this.pending.then(async () => {
            const [min, max] = LATENCY_MS;
            await new Promise((resolve) => setTimeout(resolve, min + Math.random() * (max - min)));
            return JSON.parse(JSON.stringify(await handler())) as T;
        });
        // A failed request must not block later requests. Serialize through async commits too.
        this.pending = response.catch(() => undefined);
        return response;
    }
}

function fail(code: ServerErrorCode, message: string): never {
    throw new ServerError(code, message);
}

function randomHex(bytes: number): string {
    return [...crypto.getRandomValues(new Uint8Array(bytes))]
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

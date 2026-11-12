/*
 * The contract between the game client and the game server. Types only: the client holds a
 * `GameServer` and never imports the server's code (`make check` enforces it). Today it is
 * `src/server/MockServer.ts` in the same page; a real backend implements the same calls over
 * HTTP. Money in cents, multipliers in hundredths.
 *
 * The server decides every outcome. The client never learns where the car is until it hits or
 * the round ends, so normal replies do not expose future outcomes. The in-page mock is not a security boundary.
 */
import type { Difficulty } from '../game/rules.ts';

export interface Session {
    balance: number;
}

export interface RoundOpened {
    roundId: string;
    /** Balance after the stake was taken. */
    balance: number;
    lanes: number;
    /** `sha256(seed)`: the server's commitment, revealed by `Settlement.reveal`. */
    seedHash: string;
}

export interface Reveal {
    seed: string;
    /** The car's lane; `lanes + 1` when every lane was clear. */
    hitLane: number;
}

/** A finished round. */
export interface Settlement {
    won: boolean;
    /** Demo override was used; this outcome is not covered by the seed commitment. */
    assisted: boolean;
    /** The multiplier paid, or the one lost on the hit lane. */
    mult: number;
    paid: number;
    bet: number;
    /** The last cleared lane on a win, the car's lane on a loss. */
    lane: number;
    balance: number;
    reveal: Reveal;
}

export type StepResult =
    /** The lane closed. `settlement` is set when it was the last lane (auto cash-out). */
    | { outcome: 'safe'; step: number; mult: number; settlement?: Settlement }
    | { outcome: 'hit'; lane: number; settlement: Settlement };

/** Rejections carry a `code` so the client can explain them. */
export type ServerErrorCode =
    | 'bad_request'
    | 'insufficient_funds'
    | 'round_open'
    | 'no_round'
    | 'nothing_to_cash'
    | 'round_started';

export interface GameServer {
    session(): Promise<Session>;
    openRound(request: { bet: number; difficulty: Difficulty }): Promise<RoundOpened>;
    step(roundId: string, request?: { demoWin?: boolean }): Promise<StepResult>;
    cashOut(roundId: string): Promise<Settlement>;
    /**
     * Calls off a round before its first step and refunds the stake. The seed stays secret:
     * nothing was played on it, so there is nothing to verify.
     */
    cancelRound(roundId: string): Promise<Session>;
    /** Demo only: refills a wallet that can't cover the minimum bet. */
    refill(): Promise<Session>;
}

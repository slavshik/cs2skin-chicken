/*
 * Pure game rules: no rendering, no state, no randomness of their own.
 *
 * A round deals `CARS[d]` cars over `SPOTS` positions, like Mines. The chicken can clear
 * `SPOTS - CARS[d]` lanes; the first car decides where it gets hit. The payout multiplier after
 * `k` cleared lanes is `RTP / P(clearing k lanes)`, floored to hundredths, so every cash-out
 * point has the same expected return.
 */

export type Difficulty = 'easy' | 'medium' | 'hard' | 'hardcore';
export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard', 'hardcore'];

/** Return to player. */
export const RTP = 0.97;
const SPOTS = 25;
export const CARS: Readonly<Record<Difficulty, number>> = {
    easy: 1,
    medium: 3,
    hard: 5,
    hardcore: 10,
};

/** Money is in cents everywhere: no float drift. */
export const START_BALANCE = 100_000;
export const MIN_BET = 10;
export const MAX_BET = 10_000;
export const DEFAULT_BET = 100;

export const laneCount = (d: Difficulty): number => SPOTS - CARS[d];

/** Probability of clearing the first `step` lanes. */
export function survival(d: Difficulty, step: number): number {
    const safe = laneCount(d);
    let p = 1;
    for (let i = 0; i < step; i++) p *= (safe - i) / (SPOTS - i);
    return p;
}

/** Multiplier after `step` cleared lanes, in hundredths (x1.01 → 101); 100 before the first lane. */
export function multiplier(d: Difficulty, step: number): number {
    if (step <= 0) return 100;
    return Math.floor((RTP / survival(d, step)) * 100 + 1e-6);
}

/** Cents paid for `betCents` at a multiplier in hundredths. */
export const payout = (betCents: number, mult: number): number =>
    Math.floor((betCents * mult) / 100);

/**
 * The 1-based lane of the round's first car. `laneCount(d) + 1` means every lane is clear.
 * Drawn once when the round starts, so the outcome never depends on how the player plays.
 */
export function planRound(d: Difficulty, random: () => number): number {
    const cars = new Set<number>();
    while (cars.size < CARS[d]) cars.add(1 + Math.floor(random() * SPOTS));
    return Math.min(...cars);
}

export type BetOp = 'half' | 'double' | 'min' | 'max';

/** Largest stake allowed right now. */
export const maxBet = (balance: number): number => Math.max(MIN_BET, Math.min(MAX_BET, balance));

/** A typed stake (cents) clamped to the limits and the balance. */
export const clampBet = (cents: number, balance: number): number =>
    Math.min(maxBet(balance), Math.max(MIN_BET, Math.round(cents)));

/** The bet after a quick-change chip, clamped to the limits and the balance. */
export function adjustBet(bet: number, op: BetOp, balance: number): number {
    const max = maxBet(balance);
    const next =
        op === 'half' ? Math.floor(bet / 2) : op === 'double' ? bet * 2 : op === 'min' ? 0 : max;
    return Math.min(max, Math.max(MIN_BET, next));
}

/** Uniform [0, 1) from the platform CSPRNG. */
export function secureRandom(): number {
    return crypto.getRandomValues(new Uint32Array(1))[0]! / 2 ** 32;
}

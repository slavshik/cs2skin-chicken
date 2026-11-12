import { type Difficulty, planRound } from './rules.ts';

/*
 * Provably fair rounds, shared by the server (to draw) and the client (to verify).
 * The server commits to `sha256(seed)` when a round opens and reveals `seed` when it ends; the
 * car's lane is `planRound(difficulty, seededRandom(seed))`, so the client can check both.
 */

/** Deterministic [0, 1) stream from a seed string (FNV-1a hash into mulberry32). */
export function seededRandom(seed: string): () => number {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) {
        h ^= seed.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    let a = h >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** The lane of the round's first car for a seed (`laneCount + 1`: every lane is clear). */
export const hitLaneFor = (difficulty: Difficulty, seed: string): number =>
    planRound(difficulty, seededRandom(seed));

export async function sha256Hex(text: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** True when the revealed seed matches the hash committed at the start and yields that lane. */
export async function verifyRound(
    difficulty: Difficulty,
    committedHash: string,
    seed: string,
    hitLane: number,
): Promise<boolean> {
    return (await sha256Hex(seed)) === committedHash && hitLaneFor(difficulty, seed) === hitLane;
}

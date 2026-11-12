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

const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

/**
 * SHA-256 of a UTF-8 string, as hex. Plain JS on purpose: `crypto.subtle` exists only in secure
 * contexts (HTTPS or localhost), and the game must also run when served over plain HTTP.
 */
export async function sha256Hex(text: string): Promise<string> {
    const bytes = new TextEncoder().encode(text);
    const blocks = Math.ceil((bytes.length + 9) / 64);
    const words = new Uint32Array(blocks * 16);
    for (let i = 0; i < bytes.length; i++) words[i >> 2]! |= bytes[i]! << (24 - (i % 4) * 8);
    words[bytes.length >> 2]! |= 0x80 << (24 - (bytes.length % 4) * 8);
    words[words.length - 1] = bytes.length * 8; // message length in bits (inputs here are short)

    const h = new Uint32Array([
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab,
        0x5be0cd19,
    ]);
    const w = new Uint32Array(64);
    const rotr = (x: number, n: number): number => (x >>> n) | (x << (32 - n));
    for (let b = 0; b < blocks; b++) {
        for (let t = 0; t < 64; t++) {
            if (t < 16) w[t] = words[b * 16 + t]!;
            else {
                const x = w[t - 15]!;
                const y = w[t - 2]!;
                const s0 = rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3);
                const s1 = rotr(y, 17) ^ rotr(y, 19) ^ (y >>> 10);
                w[t] = w[t - 16]! + s0 + w[t - 7]! + s1;
            }
        }
        let [a, bb, c, d, e, f, g, hh] = h as unknown as number[];
        for (let t = 0; t < 64; t++) {
            const t1 =
                (hh! +
                    (rotr(e!, 6) ^ rotr(e!, 11) ^ rotr(e!, 25)) +
                    ((e! & f!) ^ (~e! & g!)) +
                    K[t]! +
                    w[t]!) |
                0;
            const t2 =
                ((rotr(a!, 2) ^ rotr(a!, 13) ^ rotr(a!, 22)) +
                    ((a! & bb!) ^ (a! & c!) ^ (bb! & c!))) |
                0;
            hh = g;
            g = f;
            f = e;
            e = (d! + t1) | 0;
            d = c;
            c = bb;
            bb = a;
            a = (t1 + t2) | 0;
        }
        h[0]! += a!;
        h[1]! += bb!;
        h[2]! += c!;
        h[3]! += d!;
        h[4]! += e!;
        h[5]! += f!;
        h[6]! += g!;
        h[7]! += hh!;
    }
    return [...h].map((x) => x.toString(16).padStart(8, '0')).join('');
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

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { sha256Hex } from '../src/game/fairness.ts';

// The game hashes in plain JS so it also works over plain HTTP, where crypto.subtle is missing.
test('sha256Hex matches node:crypto, including block boundaries and UTF-8', async () => {
    const inputs = [
        '',
        'abc',
        'a'.repeat(55),
        'a'.repeat(56),
        'a'.repeat(64),
        'a'.repeat(200),
        'ąćę 🐔',
    ];
    for (const input of inputs) {
        assert.equal(
            await sha256Hex(input),
            createHash('sha256').update(input).digest('hex'),
            input,
        );
    }
});

test('sha256Hex does not depend on crypto.subtle', async () => {
    const subtle = Object.getOwnPropertyDescriptor(globalThis.crypto, 'subtle');
    Object.defineProperty(globalThis.crypto, 'subtle', { value: undefined, configurable: true });
    try {
        assert.equal(
            await sha256Hex('abc'),
            'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
        );
    } finally {
        if (subtle) Object.defineProperty(globalThis.crypto, 'subtle', subtle);
    }
});

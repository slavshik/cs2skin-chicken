import assert from 'node:assert/strict';
import test from 'node:test';
import { MockServer } from '../src/server/MockServer.ts';
import { hitLaneFor, verifyRound } from '../src/game/fairness.ts';
import { START_BALANCE } from '../src/game/rules.ts';

test('requests are serialized, copied on entry, and recover after rejection', async () => {
    const server = new MockServer();
    const request = { bet: 100, difficulty: 'easy' as const };
    const opening = server.openRound(request);
    request.bet = 10_000;
    const duplicate = server.openRound({ bet: 100, difficulty: 'easy' });
    const results = await Promise.allSettled([opening, duplicate]);
    assert.equal(results[0].status, 'fulfilled');
    assert.equal(results[1].status, 'rejected');
    assert.equal((await server.session()).balance, START_BALANCE - 100);
});

test('normal steps follow the committed seed; Shift-click steps are safe and marked assisted', async () => {
    for (const assisted of [false, true]) {
        const server = new MockServer();
        const opened = await server.openRound({ bet: 100, difficulty: 'hardcore' });
        let settlement;
        for (let lane = 1; lane <= opened.lanes; lane++) {
            const result = await server.step(opened.roundId, { demoWin: assisted });
            if (assisted) assert.equal(result.outcome, 'safe');
            if (result.settlement) {
                settlement = result.settlement;
                break;
            }
        }
        assert.ok(settlement);
        assert.equal(settlement.assisted, assisted);
        assert.equal(
            await verifyRound(
                'hardcore',
                opened.seedHash,
                settlement.reveal.seed,
                settlement.reveal.hitLane,
            ),
            true,
        );
        if (assisted) assert.equal(settlement.won, true);
        else {
            const hitLane = hitLaneFor('hardcore', settlement.reveal.seed);
            assert.equal(settlement.won, hitLane > opened.lanes);
            assert.equal(settlement.lane, Math.min(hitLane, opened.lanes));
        }
        const balance: number = (await server.session()).balance;
        await assert.rejects(server.cashOut(opened.roundId));
        assert.equal((await server.session()).balance, balance);
    }
});

test('a round can be called off and refunded only before its first step', async () => {
    const server = new MockServer();
    const opened = await server.openRound({ bet: 100, difficulty: 'easy' });
    assert.equal((await server.cancelRound(opened.roundId)).balance, START_BALANCE);
    await assert.rejects(server.cancelRound(opened.roundId), { code: 'no_round' });

    // Hardcore and 'demoWin' make the first step safe, so the round is still open after it.
    const started = await server.openRound({ bet: 100, difficulty: 'hardcore' });
    await server.step(started.roundId, { demoWin: true });
    await assert.rejects(server.cancelRound(started.roundId), { code: 'round_started' });
    assert.equal((await server.session()).balance, START_BALANCE - 100);
});

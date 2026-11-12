import { type FormEvent, useEffect, useId, useRef, useState } from 'react';
import type { BetOp, RoundResult } from '../contract/GameApi.ts';
import { formatMoney, formatMult, formatMultShort } from '../game/format.ts';
import { CARS, DIFFICULTIES, multiplier, payout } from '../game/rules.ts';
import { DIFFICULTY_TITLE, fromInput, toInput } from './labels.ts';
import { useGame, useGameApi } from './useGame.ts';

const CHIPS: readonly [BetOp, string][] = [
    ['half', '1/2'],
    ['double', '2x'],
    ['max', 'Max'],
];

/**
 * The pre-round popup (design/components/BetPanel.md): stake, difficulty, Go. After a round
 * it leads with that round's result. Kept to what the decision needs.
 */
export function BetModal({ open }: { open: boolean }) {
    const api = useGameApi();
    const g = useGame();
    const id = useId();
    const goRef = useRef<HTMLButtonElement>(null);
    const [text, setText] = useState(toInput(g.bet));
    const [editing, setEditing] = useState(false);

    useEffect(() => {
        if (!editing) setText(toInput(g.bet));
    }, [g.bet, editing]);

    useEffect(() => {
        if (open) goRef.current?.focus({ preventScroll: true });
        // Leaving focus on a hidden control would swallow Space during the round.
        else (document.activeElement as HTMLElement | null)?.blur();
    }, [open]);

    const commit = () => {
        const cents = fromInput(text);
        if (Number.isFinite(cents)) api.setBet(cents);
        setEditing(false);
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        commit();
        api.placeBet();
    };

    const cars = CARS[g.difficulty];
    const maxWin = payout(g.bet, multiplier(g.difficulty, g.lanes));

    return (
        <div className="ui-modal" data-open={open} aria-hidden={!open}>
            <form
                className="ui-card"
                role="dialog"
                aria-modal="true"
                aria-label="Place a bet"
                onSubmit={submit}
            >
                {g.lastResult && <LastResult result={g.lastResult} />}

                <div className="ui-field">
                    <label className="ui-label" htmlFor={`${id}-bet`}>
                        <span>Bet</span>
                        <span className="ui-balance">
                            Balance <b>{formatMoney(g.balance)}</b>
                        </span>
                    </label>
                    <div className="ccr-input" data-error={g.bet > g.balance || undefined}>
                        <span className="ccr-coin" />
                        <input
                            id={`${id}-bet`}
                            inputMode="decimal"
                            autoComplete="off"
                            value={text}
                            onFocus={() => setEditing(true)}
                            onChange={(e) => setText(e.target.value)}
                            onBlur={commit}
                        />
                        {CHIPS.map(([op, label]) => (
                            <button
                                key={op}
                                type="button"
                                className="ccr-chip"
                                onClick={() => api.betOp(op)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="ui-field" role="radiogroup" aria-label="Difficulty">
                    <div className="ui-seg">
                        {DIFFICULTIES.map((d) => (
                            <button
                                key={d}
                                type="button"
                                role="radio"
                                aria-checked={d === g.difficulty}
                                className="ui-seg__opt"
                                onClick={() => api.setDifficulty(d)}
                            >
                                {DIFFICULTY_TITLE[d]}
                            </button>
                        ))}
                    </div>
                    <p className="ui-caption">
                        {g.lanes} lanes · {cars} car{cars > 1 ? 's' : ''} · win up to{' '}
                        <b>{formatMultShort(multiplier(g.difficulty, g.lanes))}</b>
                    </p>
                </div>

                {g.isBroke ? (
                    <button
                        type="button"
                        className="ccr-btn ccr-btn--cashout ccr-btn--block"
                        onClick={() => api.resetBalance()}
                    >
                        Refill demo balance
                    </button>
                ) : (
                    <button
                        ref={goRef}
                        type="submit"
                        className="ccr-btn ccr-btn--primary ccr-btn--block ui-go"
                        disabled={!g.canBet && !editing}
                        title={`Max win ${formatMoney(maxWin)} · Space`}
                    >
                        Go
                    </button>
                )}
            </form>
        </div>
    );
}

function LastResult({ result }: { result: Readonly<RoundResult> }) {
    return (
        <div className={`ui-result ui-result--${result.won ? 'win' : 'lose'}`} role="status">
            <span>
                {result.won ? `Cashed out · lane ${result.lane}` : `Splat · lane ${result.lane}`}
            </span>
            <b>
                {result.won
                    ? `${formatMult(result.mult)}  +${formatMoney(result.paid)}`
                    : `−${formatMoney(result.bet)}`}
            </b>
        </div>
    );
}

import { type FormEvent, useEffect, useId, useRef, useState } from 'react';
import { formatMoney, formatMult, formatMultShort } from '../game/format.ts';
import { type BetOp, CARS, DIFFICULTIES, laneCount, multiplier, payout } from '../game/rules.ts';
import type { RoundResult } from '../game/GameModel.ts';
import { DIFFICULTY_TITLE, fromInput, toInput } from './labels.ts';
import { useBridge, useGame } from './useGame.ts';

const CHIPS: readonly [BetOp, string][] = [
    ['half', '1/2'],
    ['double', '2x'],
    ['min', 'Min'],
    ['max', 'Max'],
];

/**
 * The pre-round popup (design/components/BetPanel.md): stake, difficulty, what's at stake,
 * and Go. Open while betting; after a round it leads with that round's result.
 */
export function BetModal({ open }: { open: boolean }) {
    const ui = useBridge();
    const g = useGame();
    const titleId = useId();
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
        if (Number.isFinite(cents)) ui.setBet(cents);
        setEditing(false);
        setText(toInput(g.bet));
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        commit();
        ui.placeBet();
    };

    const firstLane = multiplier(g.difficulty, 1);
    const maxMult = multiplier(g.difficulty, g.lanes);

    return (
        <div className="ui-modal" data-open={open} aria-hidden={!open}>
            <form
                className="ui-card"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                onSubmit={submit}
            >
                <header className="ui-card__head">
                    <h2 id={titleId}>Chicken Cross Road</h2>
                    <span className="ui-balance">
                        <span className="ccr-coin" /> {formatMoney(g.balance)}
                    </span>
                </header>

                {g.lastResult && <LastResult result={g.lastResult} />}

                <div className="ui-field">
                    <label className="ccr-label" htmlFor={`${titleId}-bet`}>
                        Bet Amount
                        {g.bet > g.balance && <b className="ui-error">Over balance</b>}
                    </label>
                    <div className="ccr-input">
                        <span className="ccr-coin" />
                        <input
                            id={`${titleId}-bet`}
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
                                onClick={() => ui.betOp(op)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                <fieldset className="ui-field ui-diffs">
                    <legend className="ccr-label">Difficulty</legend>
                    {DIFFICULTIES.map((d, i) => (
                        <button
                            key={d}
                            type="button"
                            className="ui-diff"
                            aria-pressed={d === g.difficulty}
                            onClick={() => ui.setDifficulty(d)}
                        >
                            <span className="ui-diff__name">
                                {DIFFICULTY_TITLE[d]} <kbd>{i + 1}</kbd>
                            </span>
                            <span className="ui-diff__meta">
                                {laneCount(d)} lanes · {CARS[d]} car{CARS[d] > 1 ? 's' : ''}
                            </span>
                            <span className="ui-diff__max">
                                up to {formatMultShort(multiplier(d, laneCount(d)))}
                            </span>
                        </button>
                    ))}
                </fieldset>

                <dl className="ui-summary">
                    <div>
                        <dt>First lane</dt>
                        <dd>{formatMult(firstLane)}</dd>
                    </div>
                    <div>
                        <dt>Max win</dt>
                        <dd>{formatMoney(payout(g.bet, maxMult))}</dd>
                    </div>
                </dl>

                {g.isBroke ? (
                    <button
                        type="button"
                        className="ccr-btn ccr-btn--cashout ccr-btn--block"
                        onClick={() => ui.resetBalance()}
                    >
                        Refill demo balance
                    </button>
                ) : (
                    <button
                        ref={goRef}
                        type="submit"
                        className="ccr-btn ccr-btn--primary ccr-btn--block ui-go"
                        disabled={!g.canBet && !editing}
                    >
                        Go <span className="ccr-btn__sub">{formatMoney(g.bet)}</span>
                    </button>
                )}
                <p className="ui-hint">
                    <kbd>Space</kbd> start / next lane · <kbd>Enter</kbd> cash out
                </p>
            </form>
        </div>
    );
}

function LastResult({ result }: { result: RoundResult }) {
    return result.won ? (
        <div className="ui-result ui-result--win" role="status">
            <span>Cashed out on lane {result.lane}</span>
            <b>
                {formatMult(result.mult)} · +{formatMoney(result.paid)}
            </b>
        </div>
    ) : (
        <div className="ui-result ui-result--lose" role="status">
            <span>Splat on lane {result.lane}</span>
            <b>−{formatMoney(result.bet)}</b>
        </div>
    );
}

import { formatMoney, formatMult } from '../game/format.ts';
import { payout } from '../game/rules.ts';
import { DIFFICULTY_TITLE } from './labels.ts';
import { useGame, useGameApi } from './useGame.ts';

/**
 * What's at stake during a round. Top: the live multiplier and lane. Bottom: the bet, and
 * Cash Out centred where the thumb is (full width on narrow stages).
 */
export function RoundHud({ visible }: { visible: boolean }) {
    const api = useGameApi();
    const g = useGame();

    return (
        <div className="ui-hud" data-visible={visible} aria-hidden={!visible}>
            <div className="ui-live" aria-live="polite">
                <span className="ui-live__mult">{formatMult(g.currentMult)}</span>
                <span className="ui-live__lane">
                    Lane {g.step}/{g.lanes}
                </span>
            </div>

            <div className="ui-pill ui-stake">
                <span className="ccr-coin" />
                <b>{formatMoney(g.bet)}</b>
                <span className="ui-pill__tag">{DIFFICULTY_TITLE[g.difficulty]}</span>
            </div>

            <button
                type="button"
                className="ccr-btn ccr-btn--cashout ui-cashout"
                disabled={!g.canCashOut}
                // Keep focus on the page so Space keeps stepping after a click.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => api.cashOut()}
            >
                Cash Out
                {g.step > 0 && (
                    <span className="ccr-btn__sub">
                        {formatMoney(payout(g.bet, g.currentMult))}
                    </span>
                )}
            </button>

            {visible && g.phase === 'live' && g.step === 0 && (
                <p className="ui-tip">Tap the glowing manhole to cross</p>
            )}
        </div>
    );
}

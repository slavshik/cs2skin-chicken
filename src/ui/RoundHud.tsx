import { formatMoney, formatMult } from '../game/format.ts';
import { payout } from '../game/rules.ts';
import { DIFFICULTY_TITLE } from './labels.ts';
import { useBridge, useGame } from './useGame.ts';

/**
 * What's at stake during a round: the bet and difficulty, the live multiplier and lane, and
 * Cash Out with the amount it pays. Lanes are tapped on the canvas itself.
 */
export function RoundHud({ visible }: { visible: boolean }) {
    const ui = useBridge();
    const g = useGame();
    const value = payout(g.bet, g.currentMult);

    return (
        <div className="ui-hud" data-visible={visible} aria-hidden={!visible}>
            <div className="ui-pill ui-stake">
                <span className="ui-pill__label">Bet</span>
                <span className="ccr-coin" />
                <b>{formatMoney(g.bet)}</b>
                <span className="ui-pill__tag">{DIFFICULTY_TITLE[g.difficulty]}</span>
            </div>

            <div className="ui-live" aria-live="polite">
                <span className="ui-live__mult">{formatMult(g.currentMult)}</span>
                <span className="ui-live__lane">
                    Lane {g.step}/{g.lanes}
                </span>
            </div>

            <button
                type="button"
                className="ccr-btn ccr-btn--cashout ui-cashout"
                disabled={!g.canCashOut}
                // Keep focus on the page so Space keeps stepping after a click.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => ui.cashOut()}
            >
                Cash Out{' '}
                <span className="ccr-btn__sub">{g.step > 0 ? formatMoney(value) : '—'}</span>
            </button>

            {visible && g.phase === 'live' && g.step === 0 && (
                <p className="ui-tip">Tap the glowing manhole to cross</p>
            )}
        </div>
    );
}

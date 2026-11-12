/** Global events, dispatched through `GlobalEventProvider.dispatch`. */
export const AppEvents = {
    /** The game model changed: balance, bet, difficulty, phase or step. No payload. */
    MODEL_CHANGED: 'app.modelChanged',
} as const;

/** Commands from the React UI (`src/ui/`) to the game, sent by `UiBridge`. */
export const UiEvents = {
    /** Start a round with the current bet and difficulty (the popup's Go). */
    PLACE_BET: 'ui.placeBet',
    /** Hop into the next lane. */
    STEP: 'ui.step',
    CASH_OUT: 'ui.cashOut',
    /** Payload: stake in cents, as typed. */
    SET_BET: 'ui.setBet',
    /** Payload: a `BetOp` quick-change chip. */
    BET_OP: 'ui.betOp',
    /** Payload: a `Difficulty`. */
    SET_DIFFICULTY: 'ui.setDifficulty',
    /** Demo wallet refill. */
    RESET_BALANCE: 'ui.resetBalance',
} as const;

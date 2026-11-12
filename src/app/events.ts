/** Global events, dispatched through `GlobalEventProvider.dispatch`. */
export const AppEvents = {
    /** The game model changed: balance, bet, difficulty, phase or step. No payload. */
    MODEL_CHANGED: 'app.modelChanged',
} as const;

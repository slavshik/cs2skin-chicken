import { createContext, useContext, useSyncExternalStore } from 'react';
import type { GameApi, GameSnapshot } from '../contract/GameApi.ts';

export const GameContext = createContext<GameApi | null>(null);

/** The game's command surface (`GameApi`). */
export function useGameApi(): GameApi {
    const api = useContext(GameContext);
    if (!api) throw new Error('[ui] useGameApi outside <GameContext>');
    return api;
}

/** The current game snapshot; re-renders on every change. */
export function useGame(): GameSnapshot {
    const api = useGameApi();
    return useSyncExternalStore(api.subscribe, api.getSnapshot);
}

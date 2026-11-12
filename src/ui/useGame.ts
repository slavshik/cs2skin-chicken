import { createContext, useContext, useSyncExternalStore } from 'react';
import type { GameSnapshot, UiBridge } from './bridge.ts';

export const BridgeContext = createContext<UiBridge | null>(null);

export function useBridge(): UiBridge {
    const bridge = useContext(BridgeContext);
    if (!bridge) throw new Error('[ui] useBridge outside <BridgeContext>');
    return bridge;
}

/** The current game snapshot; re-renders on every model change. */
export function useGame(): GameSnapshot {
    const bridge = useBridge();
    return useSyncExternalStore(bridge.subscribe, bridge.getSnapshot);
}

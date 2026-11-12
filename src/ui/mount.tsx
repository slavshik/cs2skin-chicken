import '@fontsource/chakra-petch/500.css';
import '@fontsource/chakra-petch/600.css';
import '@fontsource/chakra-petch/700.css';
import './ui.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { UiBridge } from './bridge.ts';
import { BetModal } from './BetModal.tsx';
import { RoundHud } from './RoundHud.tsx';
import { BridgeContext, useGame } from './useGame.ts';

function App() {
    const { phase } = useGame();
    return (
        <>
            <RoundHud visible={phase !== 'idle'} />
            <BetModal open={phase === 'idle'} />
        </>
    );
}

/** Renders the React layer (bet popup, round HUD) over the canvas. */
export function mountUi(element: HTMLElement, bridge: UiBridge): void {
    createRoot(element).render(
        <StrictMode>
            <BridgeContext.Provider value={bridge}>
                <App />
            </BridgeContext.Provider>
        </StrictMode>,
    );
}

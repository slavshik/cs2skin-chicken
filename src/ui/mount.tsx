import '@fontsource/chakra-petch/500.css';
import '@fontsource/chakra-petch/600.css';
import '@fontsource/chakra-petch/700.css';
import './ui.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { GameApi } from '../contract/GameApi.ts';
import { BetModal } from './BetModal.tsx';
import { RoundHud } from './RoundHud.tsx';
import { GameContext, useGame } from './useGame.ts';

function App() {
    const { phase } = useGame();
    return (
        <>
            <RoundHud visible={phase !== 'idle'} />
            <BetModal open={phase === 'idle'} />
        </>
    );
}

/** Renders the React layer (bet popup, round HUD) over the canvas. It knows the game only as `GameApi`. */
export function mountUi(element: HTMLElement, api: GameApi): void {
    createRoot(element).render(
        <StrictMode>
            <GameContext.Provider value={api}>
                <App />
            </GameContext.Provider>
        </StrictMode>,
    );
}

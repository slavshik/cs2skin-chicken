import { di } from '@dp-instant/core/di.ts';
import { injectable } from '@dp-instant/core/injectable.ts';
import { RootMediator } from '@dp-instant/2d/RootMediator.ts';
import type { GameScreen } from '../game/GameScreen.ts';
import { TypesApp } from '../types.ts';
import type { AppRootView } from './AppRootView.ts';

/** Top-level flow: puts screens and popups into the root's layers. */
@injectable()
export class AppRootMediator extends RootMediator {
    declare protected view?: AppRootView;

    override initialize(): void {
        super.initialize();
        this.view!.screens.addChild(di.get<GameScreen>(TypesApp.gameScreen));
        this.onResize();
    }
}

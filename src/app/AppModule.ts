import { ContainerModule } from 'inversify';
import { bindMediator } from '@dp-instant/2d/bindMediator.ts';
import { Types2D } from '@dp-instant/interfaces/Types2D.ts';
import { GameModel } from '../game/GameModel.ts';
import { GameMediator } from './game/GameMediator.ts';
import { GameScreen } from './game/GameScreen.ts';
import { AppRootMediator } from './root/AppRootMediator.ts';
import { AppRootView } from './root/AppRootView.ts';
import { TypesApp } from './types.ts';

/** Views of the game and their mediators. Load after CoreModule. */
export const AppModule = new ContainerModule(({ bind }) => {
    bind(Types2D.rootView)
        .to(AppRootView)
        .inSingletonScope()
        .onActivation(bindMediator(AppRootMediator));
    bind(TypesApp.model).toConstantValue(new GameModel());
    bind(TypesApp.gameScreen)
        .to(GameScreen)
        .inSingletonScope()
        .onActivation(bindMediator(GameMediator));
});

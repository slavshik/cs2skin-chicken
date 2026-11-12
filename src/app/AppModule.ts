import { ContainerModule } from 'inversify';
import { bindMediator } from '@dp-instant/2d/bindMediator.ts';
import { Types2D } from '@dp-instant/interfaces/Types2D.ts';
import { AppRootMediator } from './root/AppRootMediator.ts';
import { AppRootView } from './root/AppRootView.ts';

/** Views of the game and their mediators. Load after CoreModule. */
export const AppModule = new ContainerModule(({ bind }) => {
    bind(Types2D.rootView)
        .to(AppRootView)
        .inSingletonScope()
        .onActivation(bindMediator(AppRootMediator));
});

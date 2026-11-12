import { ContainerModule } from 'inversify';
import type { IEventEmitter } from '@dp-instant/interfaces/IEventEmitter.ts';
import { TypesCore } from '@dp-instant/interfaces/TypesCore.ts';
import { EventDispatcher } from './EventDispatcher.ts';

export const CoreModule = new ContainerModule(({ bind }) => {
    bind<IEventEmitter>(TypesCore.dispatcher).to(EventDispatcher).inSingletonScope();
});

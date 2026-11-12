import type { EventEmitter } from 'pixi.js';
import type { IMediator } from './IMediator.ts';

export interface IView extends EventEmitter {
    mediator?: IMediator;
    debugId?: string;
    onAdded(): void;
    onRemoved(): void;
}

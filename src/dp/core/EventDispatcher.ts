import { EventEmitter } from 'eventemitter3';
import type { IEventEmitter } from '@dp-instant/interfaces/IEventEmitter.ts';
import { injectable } from './injectable.ts';

@injectable()
export class EventDispatcher extends EventEmitter implements IEventEmitter {}

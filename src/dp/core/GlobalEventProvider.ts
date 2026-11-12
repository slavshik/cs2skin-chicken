import { inject } from 'inversify';
import type { IEventEmitter } from '@dp-instant/interfaces/IEventEmitter.ts';
import type { ListenerFn } from '@dp-instant/interfaces/ListenerFn.ts';
import { TypesCore } from '@dp-instant/interfaces/TypesCore.ts';
import { di } from './di.ts';
import { injectable } from './injectable.ts';

interface IAssociativeArray<T> {
    [key: string]: T;
}

@injectable()
export class GlobalEventProvider {
    private listenersMap: IAssociativeArray<ListenerFn[]> = {};
    @inject(TypesCore.dispatcher)
    declare private _dispatcher: IEventEmitter | undefined;

    /** Injected when resolved through `di`; looked up lazily for `new`-constructed instances. */
    private get dispatcher(): IEventEmitter {
        return (this._dispatcher ??= di.get<IEventEmitter>(TypesCore.dispatcher));
    }

    /**
     * Removes all listeners
     */
    destroy(): void {
        this.removeAllListeners();
    }

    /**
     * Dispatches event globally
     * @param eventName - string name of event
     * @param data - events payload
     */
    protected dispatch(eventName: string, data?: unknown): void {
        this.dispatcher.emit(eventName, data);
    }

    /**
     * Adds listener to the specified event
     * @param eventName - string name of event
     * @param fn - function, that is to be used as listener
     */
    protected addListener(eventName: string, fn: ListenerFn): void {
        if (this.mapListenerToEvent(eventName, fn, this.listenersMap)) {
            this.dispatcher.on(eventName, fn, this);
        } else {
            console.warn('Listener ' + fn + ' for event ' + eventName + ' is already exists');
        }
    }

    /**
     * Adds listener once to the specified event
     * @param eventName - string name of event
     * @param fn - function, that is to be used as listener
     */
    protected addListenerOnce(eventName: string, fn: ListenerFn): void {
        const onceCallback = (data?: unknown) => {
            fn.call(this, data);
            this.removeListener(eventName, onceCallback);
        };
        this.addListener(eventName, onceCallback);
    }

    /**
     * Removes specified listener for event
     * @param eventName - string name of event
     * @param fn - function, that is to be used as listener
     */
    protected removeListener(eventName: string, fn: ListenerFn): void {
        if (this.unMapListenerToEvent(eventName, fn, this.listenersMap)) {
            this.dispatcher.off(eventName, fn, this);
        } else {
            console.warn(fn + ' is not a listener for event ' + eventName);
        }
    }

    /**
     * Removes all listeners for specified event
     * @param eventName - string name of event
     */
    protected removeListeners(eventName: string): void {
        const listenersForEvent = this.listenersMap[eventName];
        if (listenersForEvent) {
            for (const fn of listenersForEvent) {
                this.dispatcher.off(eventName, fn, this);
            }
            delete this.listenersMap[eventName];
        } else {
            console.warn('There are no any listeners for event ' + eventName);
        }
    }

    /**
     * Removes all listeners for all events
     */
    protected removeAllListeners(): void {
        for (const key of Object.keys(this.listenersMap)) {
            this.removeListeners(key);
        }
        this.listenersMap = {};
    }

    /**
     * Checks if class listen for any global events
     * @returns {boolean}
     */
    protected hasListeners(): boolean {
        return Object.keys(this.listenersMap).length !== 0;
    }

    /**
     * Registers in map listener for specified event
     * @param eventName - string name of event
     * @param fn - function, that is to be used as listener
     * @param map - map, where all events are registered
     * @returns {boolean} - true if event was successfully registered, false - otherwise
     */
    protected mapListenerToEvent(
        eventName: string,
        fn: ListenerFn,
        map: IAssociativeArray<ListenerFn[]>,
    ): boolean {
        let listenersForEvent = map[eventName];
        if (!listenersForEvent) {
            listenersForEvent = [fn];
            map[eventName] = listenersForEvent;
        } else {
            if (listenersForEvent.indexOf(fn) > -1) {
                return false;
            } else {
                listenersForEvent.push(fn);
            }
        }
        return true;
    }

    /**
     * Removes dependency for listener and specified event from the map
     * @param eventName - string name of event
     * @param fn - function, that was used as listener
     * @param map - map, where all events are registered
     * @returns {boolean} - true if dependency was removed, false - otherwise
     */
    protected unMapListenerToEvent(
        eventName: string,
        fn: ListenerFn,
        map: IAssociativeArray<ListenerFn[]>,
    ): boolean {
        const listenersForEvent = map[eventName];
        if (listenersForEvent) {
            const listenerIndex: number = listenersForEvent.indexOf(fn);
            if (listenerIndex > -1) {
                listenersForEvent.splice(listenerIndex, 1);
                if (listenersForEvent.length === 0) {
                    delete map[eventName];
                }
                return true;
            }
        }
        return false;
    }
}

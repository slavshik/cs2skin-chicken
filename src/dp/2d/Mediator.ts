import { GlobalEventProvider } from '@dp-instant/core/GlobalEventProvider.ts';
import { injectable } from '@dp-instant/core/injectable.ts';
import type { ListenerFn } from '@dp-instant/interfaces/ListenerFn.ts';
import type { IMediator } from './IMediator.ts';
import type { IView } from './IView.ts';

@injectable()
export abstract class Mediator<V extends IView = IView>
    extends GlobalEventProvider
    implements IMediator
{
    protected view?: V;
    private viewListenersMap: { [key: string]: ListenerFn[] } = {};

    override destroy(): void {
        if (import.meta.env.DEV) {
            this.unbindDebug();
        }
        this.removeAllViewListeners();
        delete this.view;
        super.destroy();
    }

    /**
     * Sets view for mediator and calls method initialize.
     * @param view - instance of IView.
     */
    setView(view: IView): void {
        this.view = view as V;
        if (import.meta.env.DEV) {
            this.bindDebug();
        }
        this.initialize();
    }

    /**
     * Adds listener to the specified view event. The listener runs with the mediator as `this`.
     * @param eventName - string name of event
     * @param fn - function, that is to be used as listener
     */
    protected addViewListener(eventName: string, fn: ListenerFn): void {
        if (!this.view) {
            throw new Error("View listener can't be added when view not initialized!!!");
        }
        if (this.mapListenerToEvent(eventName, fn, this.viewListenersMap)) {
            this.view.on(eventName, fn, this);
        } else {
            console.error('View listener ' + fn + ' for event ' + eventName + ' is already exists');
        }
    }

    /**
     * Adds view listener once to the specified event
     * @param eventName - string name of event
     * @param fn - function, that is to be used as listener
     */
    protected addViewListenerOnce(eventName: string, fn: ListenerFn): void {
        const onceCallback = (...args: unknown[]) => {
            fn.apply(this, args);
            this.removeViewListener(eventName, onceCallback);
        };
        this.addViewListener(eventName, onceCallback);
    }

    /**
     * Removes specified listener for view event
     * @param eventName - string name of event
     * @param fn - function, that is to be used as listener
     */
    protected removeViewListener(eventName: string, fn: ListenerFn): void {
        if (this.unMapListenerToEvent(eventName, fn, this.viewListenersMap)) {
            this.view?.off(eventName, fn, this);
        } else {
            console.error(fn + ' is not a listener for event ' + eventName);
        }
    }

    /**
     * Removes all listeners for specified view event
     * @param eventName - string name of event
     */
    protected removeViewListeners(eventName: string): void {
        const listenersForEvent = this.viewListenersMap[eventName];
        if (listenersForEvent) {
            for (const fn of listenersForEvent) {
                this.view?.off(eventName, fn, this);
            }
            delete this.viewListenersMap[eventName];
        } else {
            console.error('There are no any listeners for event ' + eventName);
        }
    }

    /**
     * Removes all view listeners for all view events
     */
    protected removeAllViewListeners(): void {
        for (const key of Object.keys(this.viewListenersMap)) {
            this.removeViewListeners(key);
        }
        this.viewListenersMap = {};
    }

    /**
     * Initialize all mediator's stuff, when view is already set.
     */
    protected abstract initialize(): void;

    private bindDebug(): void {
        const did = this.view?.debugId;
        if (did !== undefined) {
            (window as any)[did] = this.view;
        }
    }

    private unbindDebug(): void {
        const did = this.view?.debugId;
        if (did !== undefined) {
            delete (window as any)[did];
        }
    }
}

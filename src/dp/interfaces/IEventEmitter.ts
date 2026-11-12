export interface IEventEmitter<
    EventTypes extends ValidEventTypes = string | symbol,
    Context extends any = any,
> {
    /**
     * Return an array listing the events for which the emitter has registered
     * listeners.
     */
    eventNames(): Array<EventNames<EventTypes>>;

    /**
     * Return the listeners registered for a given event.
     */
    listeners<T extends EventNames<EventTypes>>(event: T): Array<EventListener<EventTypes, T>>;

    /**
     * Return the number of listeners listening to a given event.
     */
    listenerCount(event: EventNames<EventTypes>): number;

    /**
     * Calls each of the listeners registered for a given event.
     */
    emit<T extends EventNames<EventTypes>>(event: T, ...args: EventArgs<EventTypes, T>): boolean;

    /**
     * Add a listener for a given event.
     */
    on<T extends EventNames<EventTypes>>(
        event: T,
        fn: EventListener<EventTypes, T>,
        context?: Context,
    ): this;
    addListener<T extends EventNames<EventTypes>>(
        event: T,
        fn: EventListener<EventTypes, T>,
        context?: Context,
    ): this;

    /**
     * Add a one-time listener for a given event.
     */
    once<T extends EventNames<EventTypes>>(
        event: T,
        fn: EventListener<EventTypes, T>,
        context?: Context,
    ): this;

    /**
     * Remove the listeners of a given event.
     */
    removeListener<T extends EventNames<EventTypes>>(
        event: T,
        fn?: EventListener<EventTypes, T>,
        context?: Context,
        once?: boolean,
    ): this;
    off<T extends EventNames<EventTypes>>(
        event: T,
        fn?: EventListener<EventTypes, T>,
        context?: Context,
        once?: boolean,
    ): this;

    /**
     * Remove all listeners, or those of the specified event.
     */
    removeAllListeners(event?: EventNames<EventTypes>): this;
}
type ValidEventTypes = string | symbol | any;

type EventNames<T extends ValidEventTypes> = T extends string | symbol ? T : keyof T;

type ArgumentMap<T extends any> = {
    [K in keyof T]: T[K] extends (...args: any[]) => void
        ? Parameters<T[K]>
        : T[K] extends any[]
          ? T[K]
          : any[];
};

type EventListener<T extends ValidEventTypes, K extends EventNames<T>> = T extends string | symbol
    ? (...args: any[]) => void
    : (...args: ArgumentMap<Exclude<T, string | symbol>>[Extract<K, keyof T>]) => void;

type EventArgs<T extends ValidEventTypes, K extends EventNames<T>> = Parameters<
    EventListener<T, K>
>;

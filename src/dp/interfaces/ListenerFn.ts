export interface ListenerFn<T extends any[] = any[]> {
    (...args: T): void;
}

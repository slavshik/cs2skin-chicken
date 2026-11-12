import { GlobalEventProvider } from './GlobalEventProvider.ts';
import { injectable } from './injectable.ts';

@injectable()
export abstract class Action<T = never, U = any | null> extends GlobalEventProvider {
    onFinish?: () => void;
    onFailed?: () => void;

    protected data?: T;
    private _resolve?: () => void;
    private _reject?: (reason?: any) => void;
    abstract execute(commandData?: T): Promise<U>;

    async run(data?: T): Promise<U> {
        this.data = data;
        let results = undefined;
        const execution = this.execute(this.data);
        const termination = new Promise<void>((resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;
        });
        try {
            results = await Promise.race([execution, termination]);
        } catch (e) {
            if (this.onFailed) {
                this.onFailed?.call(null);
            } else {
                throw e;
            }
        }
        this.onFinish?.call(null);
        return results as U;
    }

    terminate(reason?: any): void {
        this._reject?.call(null, reason);
    }

    override destroy(): void {
        delete this.data;
        delete this._resolve;
        delete this._reject;
        delete this.onFinish;
        delete this.onFailed;
        super.destroy();
    }
}

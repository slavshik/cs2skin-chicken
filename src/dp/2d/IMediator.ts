import type { IView } from './IView.ts';

export interface IMediator {
    setView(view: IView): void;
    destroy(): void;
}

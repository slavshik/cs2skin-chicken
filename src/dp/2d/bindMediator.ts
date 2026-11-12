import type { Newable, ResolutionContext } from 'inversify';
import type { IMediator } from './IMediator.ts';
import type { IView } from './IView.ts';

/**
 * `onActivation` handler giving each resolved view its own mediator instance:
 * `bind(id).to(SomeView).onActivation(bindMediator(SomeMediator))`.
 * The mediator class needs no binding of its own.
 */
export function bindMediator(MediatorConstructor: Newable<IMediator>) {
    return <T>(context: ResolutionContext, item: T): T => {
        (item as IView).mediator = context.get(MediatorConstructor, { autobind: true });
        return item;
    };
}

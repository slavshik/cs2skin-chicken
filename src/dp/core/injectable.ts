// Decorator metadata polyfill; every decorated class imports this module, so it loads first.
import 'reflect-metadata';
import { injectable as inversifyInjectable, injectFromHierarchy } from 'inversify';

/**
 * `@injectable()` with inversify 5 semantics: property injections declared on base classes
 * (`GlobalEventProvider`'s dispatcher, a `Mediator`'s services…) are inherited by subclasses.
 * Inversify 7+ only does that with `@injectFromHierarchy`, so dp classes use this decorator.
 */
export function injectable(): ClassDecorator {
    return (target) => {
        inversifyInjectable()(target);
        injectFromHierarchy({ extendProperties: true, extendConstructorArguments: false })(target);
    };
}

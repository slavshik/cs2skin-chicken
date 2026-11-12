import { injectable } from '@dp-instant/core/injectable.ts';
import { RootMediator } from '@dp-instant/2d/RootMediator.ts';
import type { AppRootView } from './AppRootView.ts';

/** Top-level flow: puts screens and popups into the root's layers. */
@injectable()
export class AppRootMediator extends RootMediator {
    declare protected view?: AppRootView;
}

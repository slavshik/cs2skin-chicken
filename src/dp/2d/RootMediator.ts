import type { Application } from 'pixi.js';
import { inject } from 'inversify';
import { injectable } from '@dp-instant/core/injectable.ts';
import { Types2D } from '@dp-instant/interfaces/Types2D.ts';
import { Mediator } from './Mediator.ts';
import type { RootView } from './RootView.ts';

/**
 * Puts the root view on the stage and keeps it sized to the renderer.
 * Pixi 8 initialises `Application` asynchronously, so the app is created (and sized, e.g.
 * `resizeTo: window`) before boot and bound as `Types2D.application`, instead of here.
 */
@injectable()
export class RootMediator extends Mediator<RootView> {
    @inject(Types2D.application)
    declare protected app: Application;

    initialize(): void {
        this.view!.app = this.app;
        this.app.renderer.on('resize', this.onResize, this);
        this.app.stage.addChild(this.view!);
        this.onResize();
    }

    override destroy(): void {
        this.app.renderer.off('resize', this.onResize, this);
        super.destroy();
    }

    protected onResize() {
        const { width, height } = this.app.screen;
        this.view?.resize(width, height);
    }
}

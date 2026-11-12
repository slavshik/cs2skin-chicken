import type { Application } from 'pixi.js';
import { injectable } from '@dp-instant/core/injectable.ts';
import { View } from './View.ts';

@injectable()
export class RootView extends View {
    static BACKGROUND_COLOR: number | undefined;
    /** Set by RootMediator from the `Types2D.application` binding. */
    public app!: Application;
    public size: { width: number; height: number } = { width: 0, height: 0 };

    public resize(width: number, height: number, _forced = false): void {
        this.size.width = width;
        this.size.height = height;

        this.onResize();
    }

    protected onResize() {
        //
    }
}

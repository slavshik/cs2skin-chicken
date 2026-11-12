import { injectable } from '@dp-instant/core/injectable.ts';
import { RootView } from '@dp-instant/2d/RootView.ts';
import { View } from '@dp-instant/2d/View.ts';
import { MIN_SIZE } from '../layout.ts';
import { COLOR } from '../ui/tokens.ts';

/** A view that lays itself out in the stage (width × height in layout units, see `MIN_SIZE`). */
export interface Resizable {
    resize?(width: number, height: number): void;
}

/** Two layers filling the stage from its top-left: `screens` and `popups` above it. */
@injectable()
export class AppRootView extends RootView {
    static override BACKGROUND_COLOR = COLOR['bg-950'].color;

    readonly screens = new View();
    readonly popups = new View();

    override onAdded(): void {
        this.addChild(this.screens, this.popups);
        super.onAdded();
    }

    protected override onResize(): void {
        const { width, height } = this.size;
        const scale = Math.min(1, width / MIN_SIZE.width, height / MIN_SIZE.height);
        for (const layer of [this.screens, this.popups]) {
            layer.position.set(0, 0);
            layer.scale.set(scale);
            for (const child of layer.children as Resizable[]) {
                child.resize?.(width / scale, height / scale);
            }
        }
    }
}

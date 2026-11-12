import { injectable } from '@dp-instant/core/injectable.ts';
import { RootView } from '@dp-instant/2d/RootView.ts';
import { View } from '@dp-instant/2d/View.ts';
import { DESIGN_SIZE } from '../layout.ts';

/** A view that lays itself out in the design box (width × height in design units). */
export interface Resizable {
    resize?(width: number, height: number): void;
}

/** Two layers laid out in the design box: `screens` and `popups` above it. */
@injectable()
export class AppRootView extends RootView {
    static override BACKGROUND_COLOR = 0x101418;

    readonly screens = new View();
    readonly popups = new View();

    override onAdded(): void {
        this.addChild(this.screens, this.popups);
        super.onAdded();
    }

    protected override onResize(): void {
        const { width, height } = this.size;
        const scale = Math.min(width, height) / DESIGN_SIZE;
        for (const layer of [this.screens, this.popups]) {
            layer.position.set(width / 2, height / 2);
            layer.scale.set(scale);
            for (const child of layer.children as Resizable[]) {
                child.resize?.(width / scale, height / scale);
            }
        }
    }
}

import { Container, type ContainerChild, type DestroyOptions } from 'pixi.js';
import { injectable } from '@dp-instant/core/injectable.ts';
import type { IMediator } from './IMediator.ts';
import type { IView } from './IView.ts';

/**
 * Container whose mediator lives while the view is on the scene. `ADDED_TO_SCENE` travels down
 * the tree when a view joins a scene (the root is started by emitting it once); the mediator
 * receives `setView` then, and `destroy` on `REMOVED_FROM_SCENE`.
 */
@injectable()
export class View extends Container implements IView {
    static ADDED_TO_SCENE = 'onAddedToScene';
    static REMOVED_FROM_SCENE = 'onRemovedFromScene';

    private _mediator?: IMediator;
    protected _addedToScene = false;

    // No constructor parameters: inversify builds views, and it rejects unannotated arguments.
    constructor() {
        super();
        this.on(View.ADDED_TO_SCENE, this.onAdded, this).on(
            View.REMOVED_FROM_SCENE,
            this.onRemoved,
            this,
        );
    }

    set mediator(value: IMediator) {
        this._mediator = value;
    }

    get addedToScene(): boolean {
        return this._addedToScene;
    }

    override addChild<U extends ContainerChild[]>(...children: U): U[0] {
        if (children.length > 1) {
            // Pixi adds several children one by one; route each through the override once.
            for (const child of children) this.addChild(child);
            return children[0] as U[0];
        }
        return this.postAddChild(super.addChild(...children));
    }

    override addChildAt<U extends ContainerChild>(child: U, index: number): U {
        return this.postAddChild(super.addChildAt(child, index));
    }

    override removeChild<U extends ContainerChild[]>(...children: U): U[0] {
        if (children.length > 1) {
            for (const child of children) this.removeChild(child);
            return children[0] as U[0];
        }
        return this.postRemoveChild(super.removeChild(...children));
    }

    override removeChildAt<U extends ContainerChild>(index: number): U {
        return this.postRemoveChild(super.removeChildAt<U>(index));
    }

    onAdded(): void {
        if (!this._addedToScene) {
            this._addedToScene = true;
            for (const child of this.children) {
                child.emit(View.ADDED_TO_SCENE);
            }
            this._mediator?.setView(this);
        }
    }

    onRemoved(): void {
        if (this._addedToScene) {
            this._addedToScene = false;
            this._mediator?.destroy();
            for (const child of this.children) {
                child.emit(View.REMOVED_FROM_SCENE);
            }
        }
    }

    override destroy(options?: DestroyOptions): void {
        this.off(View.ADDED_TO_SCENE, this.onAdded, this).off(
            View.REMOVED_FROM_SCENE,
            this.onRemoved,
            this,
        );
        super.destroy(options);
    }

    protected postAddChild<T extends ContainerChild>(child: T): T {
        if (this._addedToScene && child) {
            child.emit(View.ADDED_TO_SCENE);
        }
        return child;
    }

    protected postRemoveChild<T extends ContainerChild>(child: T): T {
        if (this._addedToScene && child) {
            child.emit(View.REMOVED_FROM_SCENE);
        }
        return child;
    }

    /**
     * used for debug purposes
     */
    get debugId(): string {
        return `v_${this.constructor.name}`;
    }
}

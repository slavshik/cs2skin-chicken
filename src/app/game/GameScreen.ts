import { injectable } from '@dp-instant/core/injectable.ts';
import { View } from '@dp-instant/2d/View.ts';
import { BoardView } from './BoardView.ts';

/**
 * The game world, filling the stage the host page leaves it. The bet popup and the round HUD
 * are React, layered over the canvas (src/ui/).
 */
@injectable()
export class GameScreen extends View {
    readonly board = new BoardView();

    constructor() {
        super();
        this.addChild(this.board);
    }

    resize(width: number, height: number): void {
        this.board.resize(width, height);
    }
}

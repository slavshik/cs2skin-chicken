import { injectable } from '@dp-instant/core/injectable.ts';
import { View } from '@dp-instant/2d/View.ts';
import { SIZE, SPACE } from '../ui/tokens.ts';
import { BoardView } from './BoardView.ts';
import { HUD_HEIGHT, HudView } from './HudView.ts';
import { PANEL_HEIGHT, PanelView } from './PanelView.ts';

const PAD = SPACE['space-400'];
const GAP = SPACE['space-400'];
/** At this width the panel moves from the left column to under the board. */
const WIDE = 760;

/**
 * The game's stage inside the host shell (design/components/AppShell.md): bet panel on the
 * left and the board on the right; on narrow screens the board on top and the panel below.
 */
@injectable()
export class GameScreen extends View {
    readonly hud = new HudView();
    readonly board = new BoardView();
    readonly panel = new PanelView();

    static readonly RESIZED = 'resized';

    constructor() {
        super();
        this.addChild(this.board, this.hud, this.panel);
    }

    resize(width: number, height: number): void {
        const top = PAD + HUD_HEIGHT + SPACE['space-300'];
        if (width >= WIDE) {
            const panelW = SIZE['bet-panel-width'];
            const x = PAD + panelW + GAP;
            this.panel.position.set(PAD, PAD);
            this.panel.layout(panelW);
            this.hud.position.set(x, PAD);
            this.hud.layout(width - x - PAD);
            this.board.position.set(x, top);
            this.board.resize(width - x - PAD, height - top - PAD);
        } else {
            const inner = width - PAD * 2;
            this.hud.position.set(PAD, PAD);
            this.hud.layout(inner);
            this.board.position.set(PAD, top);
            const boardH = Math.max(160, height - top - GAP - PANEL_HEIGHT - PAD);
            this.board.resize(inner, boardH);
            this.panel.position.set(PAD, top + boardH + GAP);
            this.panel.layout(inner);
        }
        this.emit(GameScreen.RESIZED);
    }
}

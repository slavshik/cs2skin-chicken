import { type BitmapText, Container, Graphics } from 'pixi.js';
import { label } from './text.ts';
import { COLOR, RADIUS, type ColorToken } from './tokens.ts';

/** Design-system button looks (design/components/Button.md, DifficultySelector.md). */
export type ButtonVariant = 'primary' | 'cashout' | 'chip' | 'segment';

interface Look {
    fill: ColorToken;
    hover: ColorToken;
    text: ColorToken;
    radius: number;
}

const LOOKS: Record<ButtonVariant, Look> = {
    primary: { fill: 'primary-500', hover: 'primary-400', text: 'text-title', radius: 999 },
    cashout: { fill: 'grass-400', hover: 'grass-300', text: 'text-on-bright', radius: 999 },
    chip: { fill: 'bg-930', hover: 'bg-800', text: 'text-muted', radius: RADIUS['radius-sm'] },
    segment: { fill: 'bg-930', hover: 'bg-850', text: 'text-muted', radius: RADIUS['radius-md'] },
};

/** Emits `press` on tap while enabled. Not a View: it has no logic to mediate. */
export class Button extends Container {
    static readonly PRESS = 'press';

    private readonly bg = new Graphics();
    private readonly text: BitmapText;
    private readonly sub: BitmapText;
    private w = 100;
    private h = 48;
    private hovered = false;
    private enabled = true;
    private selected = false;
    private variant: ButtonVariant;

    constructor(variant: ButtonVariant, text: string, fontSize = 14) {
        super();
        this.variant = variant;
        this.text = label(text, fontSize, 'text-title', true);
        this.text.anchor.set(0.5);
        this.sub = label('', fontSize - 2, 'text-title');
        this.sub.anchor.set(0, 0.5);
        this.addChild(this.bg, this.text, this.sub);
        this.eventMode = 'static';
        this.cursor = 'pointer';
        this.on('pointerover', () => this.setHover(true));
        this.on('pointerout', () => this.setHover(false));
        this.on('pointertap', () => {
            if (this.enabled) this.emit(Button.PRESS);
        });
        this.redraw();
    }

    setBox(width: number, height: number): this {
        this.w = width;
        this.h = height;
        this.redraw();
        return this;
    }

    setText(text: string, sub = ''): this {
        this.text.text = text;
        this.sub.text = sub;
        this.redraw();
        return this;
    }

    setVariant(variant: ButtonVariant): this {
        this.variant = variant;
        this.redraw();
        return this;
    }

    setEnabled(enabled: boolean): this {
        this.enabled = enabled;
        this.cursor = enabled ? 'pointer' : 'not-allowed';
        this.redraw();
        return this;
    }

    /** Segmented options: a primary border marks the chosen one. */
    setSelected(selected: boolean): this {
        this.selected = selected;
        this.redraw();
        return this;
    }

    private setHover(hovered: boolean): void {
        this.hovered = hovered;
        this.redraw();
    }

    private redraw(): void {
        const look = LOOKS[this.variant];
        const r = Math.min(look.radius, this.h / 2);
        const filled = this.variant === 'primary' || this.variant === 'cashout';
        const fill =
            !this.enabled && filled
                ? 'glass-10'
                : this.hovered && this.enabled
                  ? look.hover
                  : look.fill;
        const textColor: ColorToken = !this.enabled
            ? this.selected
                ? 'text-muted'
                : 'text-subtle'
            : this.selected
              ? 'text-title'
              : look.text;

        this.bg.clear().roundRect(0, 0, this.w, this.h, r).fill(COLOR[fill]);
        if (filled && this.enabled) {
            // Top sheen, as the host site's pill buttons have.
            this.bg
                .roundRect(1, 1, this.w - 2, this.h / 2, r)
                .fill({ color: 0xffffff, alpha: 0.12 });
        }
        if (this.selected) {
            this.bg
                .roundRect(0.75, 0.75, this.w - 1.5, this.h - 1.5, r)
                .stroke({ width: 1.5, ...COLOR['primary-500'] });
        }

        this.text.tint = COLOR[textColor].color;
        this.sub.tint = this.text.tint;
        this.sub.alpha = 0.8;
        const gap = this.sub.text ? 8 : 0;
        const total = this.text.width + gap + this.sub.width;
        this.text.position.set(this.w / 2 - total / 2 + this.text.width / 2, this.h / 2);
        this.sub.position.set(this.text.x + this.text.width / 2 + gap, this.h / 2);
    }
}

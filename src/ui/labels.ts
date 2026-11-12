import type { Difficulty } from '../game/rules.ts';

export const DIFFICULTY_TITLE: Record<Difficulty, string> = {
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    hardcore: 'Hardcore',
};

/** Cents as the bet input shows them: `1.00`. */
export const toInput = (cents: number): string => (cents / 100).toFixed(2);

/** The bet input's text in cents, or NaN. Accepts `1,5` as well as `1.5`. */
export const fromInput = (text: string): number =>
    Math.round(parseFloat(text.replace(',', '.')) * 100);

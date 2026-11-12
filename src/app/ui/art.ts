import { Container, type Sprite } from 'pixi.js';
import { di } from '@dp-instant/core/di.ts';
import { Frame } from '../assets.ts';

/*
 * The world's art comes from the `game` atlas. The originals are separate PNGs in
 * raw_assets/game/, drawn at 2× and centred on their origin, so every frame is anchored at its
 * middle. Replace a PNG and run `make assets` to change a piece; no code changes needed.
 */

/** raw_assets/game PNGs are authored at this many pixels per layout unit. */
const ART_RESOLUTION = 2;

export type FrameName = (typeof Frame)[keyof typeof Frame];

export const CAR_FRAMES: readonly FrameName[] = [
    Frame.car_blue,
    Frame.car_orange,
    Frame.car_red,
    Frame.car_green,
    Frame.car_gold,
    Frame.car_magenta,
    Frame.car_violet,
];
export const BLOOD_FRAMES: readonly FrameName[] = [Frame.blood_1, Frame.blood_2, Frame.blood_3];

/**
 * A fresh piece of art at its layout size, wrapped in a container whose origin is the art's
 * origin. Callers move, scale, tint and fade the container; `size` scales the art inside it.
 */
export function art(frame: FrameName, size = 1): Container {
    const sprite = di.get<Sprite>(frame);
    sprite.anchor.set(0.5);
    sprite.scale.set(size / ART_RESOLUTION);
    const container = new Container();
    container.addChild(sprite);
    return container;
}

/** One of a set of frames, at random (decoration only: cars, splats). */
export const anyOf = (frames: readonly FrameName[]): FrameName =>
    frames[Math.floor(Math.random() * frames.length)]!;

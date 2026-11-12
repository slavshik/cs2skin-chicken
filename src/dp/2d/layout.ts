type Pos = { x: number; y: number };
type Size = { width: number; height: number };

export function centerSize(o1: Size, o2?: Size & { x?: number; y?: number }): Pos {
    return {
        x: centerWidth(o1, o2),
        y: centerHeight(o1, o2),
    };
}

export function centerWidth(
    large: Size | number,
    small?: (Size & { x?: number }) | number,
): number {
    const w1 = typeof large === 'number' ? large : large.width;
    if (typeof small === 'undefined') {
        return w1 * 0.5;
    }
    const w2 = typeof small === 'number' ? small : small.width;
    const resultX = (w1 - w2) * 0.5;

    // @ts-ignore
    return (small.x = resultX);
}

export function centerHeight(
    large: Size | number,
    small?: (Size & { y?: number }) | number,
): number {
    const h1 = typeof large === 'number' ? large : large.height;
    if (typeof small === 'undefined') {
        return h1 * 0.5;
    }
    const h2 = typeof small === 'number' ? small : small.height;
    const resultY = (h1 - h2) * 0.5;

    // @ts-ignore
    return (small.y = resultY);
}

export function aspectFit(aspectRatio: Size, boundingSize: Size): Size {
    const mW = boundingSize.width / aspectRatio.width;
    const mH = boundingSize.height / aspectRatio.height;

    if (mH < mW) {
        boundingSize.width = (boundingSize.height / aspectRatio.height) * aspectRatio.width;
    } else if (mW < mH) {
        boundingSize.height = (boundingSize.width / aspectRatio.width) * aspectRatio.height;
    }
    return boundingSize;
}

export function aspectFill(what: Size & { scale: Pos }, where: Size): Size {
    const origWidth = what.width / what.scale.x;
    const origHeight = what.height / what.scale.y;
    const mW = where.width / origWidth;
    const mH = where.height / origHeight;

    if (mH > mW) {
        what.width = (where.height / origHeight) * origWidth;
        what.scale.y = what.scale.x;
    } else if (mW > mH) {
        what.height = (where.width / origWidth) * origHeight;
        what.scale.x = what.scale.y;
    }
    return what;
}

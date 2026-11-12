import manifest from '../assets/assets.json';

/*
 * Names of the art the game draws, from src/assets/assets.json: the one list both the code
 * and `make assets` read, so only these assets are built. To draw a new one, add it there,
 * run `make assets`, and refer to it through these constants. When the first atlas appears,
 * export its frames here too: `export const Frame = manifest.atlases.<atlas>.frames;`.
 */

/** Standalone images (src/assets/images); each is bound in `di` by its file name. */
export const Picture: Record<string, string> = manifest.images.files;

/** Frames of the `game` atlas (raw_assets/game/*.png, packed by `make assets`). */
export const Frame = manifest.atlases.game.frames;

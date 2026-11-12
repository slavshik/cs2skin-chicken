import { Assets, Sprite, Spritesheet, type SpritesheetData, type Texture } from 'pixi.js';
import { Action } from '@dp-instant/core/Action.ts';
import { di } from '@dp-instant/core/di.ts';
import { injectable } from '@dp-instant/core/injectable.ts';
import { Picture } from '../assets.ts';
import { TypesApp } from '../types.ts';
import { installBitmapFonts, loadFonts } from '../ui/fonts.ts';

/** Built by `make assets`; globbed so boot works before any atlas or image exists. */
const ATLAS_DATA = import.meta.glob<SpritesheetData>('../../assets/atlases/*/atlas.json', {
    eager: true,
    import: 'default',
});
const ATLAS_IMAGES = import.meta.glob<string>('../../assets/atlases/*/atlas.png', {
    eager: true,
    query: '?url',
    import: 'default',
});
const IMAGES = import.meta.glob<string>('../../assets/images/*', {
    eager: true,
    query: '?url',
    import: 'default',
});

/**
 * Loads the embedded font and bakes the bitmap fonts from it, loads the atlases and images,
 * and binds every frame and image by name to a Sprite factory, so views can
 * `@inject(Frame.someFrame)` a fresh Sprite.
 */
@injectable()
export class BootAction extends Action {
    async execute(): Promise<void> {
        const [atlases] = await Promise.all([
            loadAtlases(),
            loadFonts(),
            ...Object.values(Picture).map((file: string) =>
                loadImage(file, IMAGES[`../../assets/images/${file}`]!),
            ),
        ]);
        installBitmapFonts();
        di.bind(TypesApp.atlases).toConstantValue(atlases);
    }
}

/** A single image, bound by `id` to a Sprite factory like the atlas frames. */
async function loadImage(id: string, src: string): Promise<void> {
    const texture = await Assets.load<Texture>(src);
    di.bind(id).toDynamicValue(() => new Sprite(texture));
}

/** Every built atlas, by folder name, with each frame bound by its name. */
async function loadAtlases(): Promise<Record<string, Spritesheet>> {
    const entries = await Promise.all(
        Object.entries(ATLAS_DATA).map(async ([path, data]) => {
            const name = path.split('/').at(-2)!;
            const image = ATLAS_IMAGES[path.replace(/\.json$/, '.png')]!;
            const sheet = new Spritesheet(await Assets.load<Texture>(image), data);
            await sheet.parse();
            for (const [frame, texture] of Object.entries(sheet.textures)) {
                di.bind(frame).toDynamicValue(() => new Sprite(texture));
            }
            return [name, sheet] as const;
        }),
    );
    return Object.fromEntries(entries);
}

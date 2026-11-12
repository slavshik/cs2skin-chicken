import { Application, Ticker } from 'pixi.js';
import { CoreModule } from '@dp-instant/core/CoreModule.ts';
import { di } from '@dp-instant/core/di.ts';
import type { RootView } from '@dp-instant/2d/RootView.ts';
import { View } from '@dp-instant/2d/View.ts';
import { Types2D } from '@dp-instant/interfaces/Types2D.ts';
import { BootAction } from './app/actions/BootAction.ts';
import { AppModule } from './app/AppModule.ts';
import { AppRootView } from './app/root/AppRootView.ts';
import { bindGsapToTicker } from './app/ticker.ts';
import { TypesApp } from './app/types.ts';
import { Sound } from './audio/Sound.ts';
import { type SoundName, soundSprite } from './audio/sounds.ts';

async function boot(): Promise<void> {
    const app = new Application();
    // One ticker drives rendering, GSAP and game updates, so stopping it freezes everything.
    Ticker.shared.autoStart = false;
    await app.init({
        resizeTo: window,
        background: AppRootView.BACKGROUND_COLOR,
        antialias: true,
        autoDensity: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        preference: 'webgl',
        sharedTicker: true,
        autoStart: false,
    });
    document.body.appendChild(app.canvas);
    bindGsapToTicker(Ticker.shared);

    const sound = new Sound<SoundName>(soundSprite());
    document.addEventListener('pointerdown', () => sound.unlock(), { capture: true, once: true });

    di.load(CoreModule, AppModule);
    di.bind(Types2D.application).toConstantValue(app);
    di.bind(TypesApp.sound).toConstantValue(sound);

    await new BootAction().run();
    // Starts the view tree: the root mediator puts the root on the stage.
    di.get<RootView>(Types2D.rootView).emit(View.ADDED_TO_SCENE);

    // A hidden tab pauses the whole game: rendering, tweens and sound.
    const setPaused = (paused: boolean): void => {
        if (paused) app.ticker.stop();
        else app.ticker.start();
        sound.setPaused(paused);
    };
    document.addEventListener('visibilitychange', () => setPaused(document.hidden));
    setPaused(document.hidden);
}

void boot();

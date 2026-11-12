import { Application, Ticker } from 'pixi.js';
import { CoreModule } from '@dp-instant/core/CoreModule.ts';
import { di } from '@dp-instant/core/di.ts';
import type { RootView } from '@dp-instant/2d/RootView.ts';
import { View } from '@dp-instant/2d/View.ts';
import { Types2D } from '@dp-instant/interfaces/Types2D.ts';
import { BootAction } from './app/actions/BootAction.ts';
import { SessionAction } from './app/actions/SessionAction.ts';
import { AppModule } from './app/AppModule.ts';
import { AppRootView } from './app/root/AppRootView.ts';
import { bindGsapToTicker } from './app/ticker.ts';
import { TypesApp } from './app/types.ts';
import { Sound } from './audio/Sound.ts';
import type { GameModel } from './game/GameModel.ts';
import { type SoundName, soundSprite } from './audio/sounds.ts';
import { UiBridge } from './app/bridge/UiBridge.ts';
import { MockServer } from './server/MockServer.ts';
import { mountUi } from './ui/mount.tsx';

async function boot(): Promise<void> {
    const app = new Application();
    // One ticker drives rendering, GSAP and game updates, so stopping it freezes everything.
    Ticker.shared.autoStart = false;
    // The host page (index.html) leaves the game a stage between its header and chat.
    const stage = document.getElementById('game') ?? document.body;
    await app.init({
        resizeTo: stage,
        background: AppRootView.BACKGROUND_COLOR,
        antialias: true,
        autoDensity: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        preference: 'webgl',
        sharedTicker: true,
        autoStart: false,
    });
    stage.appendChild(app.canvas);
    bindGsapToTicker(Ticker.shared);

    const sound = new Sound<SoundName>(soundSprite());
    document.addEventListener('pointerdown', () => sound.unlock(), { capture: true, once: true });

    di.load(CoreModule, AppModule);
    di.bind(Types2D.application).toConstantValue(app);
    di.bind(TypesApp.sound).toConstantValue(sound);
    // The game server. The client knows it only as GameServer; swap in an HTTP client to go live.
    di.bind(TypesApp.server).toConstantValue(new MockServer());

    await Promise.all([new BootAction().run(), new SessionAction().run()]);
    // Composition root: the React layer gets the game only as GameApi (src/contract/).
    const ui = document.getElementById('ui');
    if (ui) mountUi(ui, new UiBridge(di.get<GameModel>(TypesApp.model)));
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

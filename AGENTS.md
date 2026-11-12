# AGENTS.md

**cs2skin-chicken**: a browser game built on Pixi.js, written as a test assignment.
`make` lists every target; it is the entry point for builds and checks.

## Done means

A change is done when `make build` exits 0 with no new warnings. That target runs the typecheck and the build. For any change to input, lifecycle or layout, also play it through with `make dev` in the browser and check the console for errors.

## Architecture rules

- **dp-instant port (`src/dp/`), kept minimal.** A trimmed port of dp-instant's `core` and `2d` on Pixi 8 and inversify 8: `Action`, `EventDispatcher`, `GlobalEventProvider`, `di`, `View`/`Mediator`, `RootView`/`RootMediator`, `layout`. Import by file (`@dp-instant/core/Action.ts`); there are no barrel `index.ts` files. Add to it only what the game uses.
- **View / Mediator.** Views only render, animate and emit view events. Their `Mediator` holds the logic: it listens to its view and to global events (`dispatch`/`addListener`), and runs actions. Register each view in `src/app/AppModule.ts` with `.onActivation(bindMediator(SomeMediator))` and resolve it with `di.get`. Decorate DI classes with `injectable()` from `@dp-instant/core/injectable.ts`, not inversify's, so subclasses inherit `@inject` properties.
- **Flow is actions.** Game flow (rounds, steps, results) is built from `Action` subclasses. Game rules live in pure functions, separate from views, so they can be tested without rendering.
- **One ticker.** `Ticker.shared` drives rendering and GSAP (`bindGsapToTicker`, `src/app/ticker.ts`). Animate and delay with GSAP (`gsap.to`, `gsap.delayedCall`), never `setTimeout` or `requestAnimationFrame`, so pausing the game (e.g. a hidden tab) freezes everything.

## Design system

`design/` holds the game's design system (a copy of the published one, adapted to this repo). Read `design/README.md` before any visual or UI work.

- **Tokens are the source of truth.** Edit `design/tokens.json`, then run `make tokens`. That regenerates `src/app/ui/tokens.ts` (typed `COLOR`, `SPACE`, `RADIUS`, `SIZE`, `TYPE`) and `design/tokens.css`. Never edit either output, and never hardcode a colour hex or a magic px in a view: use `COLOR['bg-900']` (a Pixi fill) or `COLOR['sun-500'].color` (a tint).
- **Colours mean game state.** `grass-*` = safe / win / cash out, `blood-*` = hit / loss, `sun-*` = coins and multipliers, `primary-*` = the CTA and the next tappable lane. Don't use them as decoration.
- **Components.** The rules for each piece (lane states, bet panel states, result banner, etc.) are in `design/components/*.md`. `design/reference/*.html` render them in a browser. `AppShell.html` shows the host site's header and chat around the game; the game owns only the stage.
- **Core loop.** Tap the next manhole: the lane either closes (barrier, coin, hop, multiplier up) or a car hits (round lost). Cash out between taps.

## Gotchas

- **Assets go through the manifest.** `src/assets/assets.json` lists every asset the game uses, and `make assets` (`scripts/assets.py`: Pillow, ffmpeg, optional pngquant) builds exactly those from `raw_assets/` into atlases, images and one sound sprite. `BootAction` loads whatever was built and binds every atlas frame and image by name to a Sprite factory, so views `@inject(...)` a fresh Sprite. Name art through the constants in `src/app/assets.ts`, never as a string.
- **Inject with `declare`.** Write injected fields as `@inject(id) declare readonly x: T`, so a class field never shadows the injected value. DI-built views take no constructor arguments.
- **Text is bitmap text.** Draw labels with `BitmapText` and a font from `BITMAP` in `src/app/ui/fonts.ts`; colour outlined text with `tint`. Keep canvas `Text` only for what a bitmap font can't serve. New characters must be added to `CHARS` there.
- **Audio is gesture-gated.** Play through `Sound` (`src/audio/Sound.ts`) by a typed `SoundName`. It stays muted until the first pointer gesture, as browsers require.
- **Responsive layout.** Recompute positions in `layout()` on every resize. Never assume a fixed aspect ratio or orientation.
- **Code style.** Node runs build scripts and configs by stripping types, so use erasable TypeScript only (no enums or parameter properties; decorators are fine) and `.ts` import extensions. Format with Prettier (4 spaces): `make format`.

## Committing

Read `docs/commit-conventions.md` before writing a commit message: gitmoji + Conventional Commits, one logical change per commit, chosen from the diff.

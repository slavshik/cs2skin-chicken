# AGENTS.md

**cs2skin-chicken**: a browser game built on Pixi.js, written as a test assignment.
`make` lists every target; it is the entry point for builds and checks.

## Done means

A change is done when `make check` and `make build` exit 0 with no new warnings: typecheck, the game/UI import boundaries, formatting, then the build. For any change to input, lifecycle or layout, also play it through with `make dev` in the browser and check the console for errors.

## Architecture rules

- **dp-instant port (`src/dp/`), kept minimal.** A trimmed port of dp-instant's `core` and `2d` on Pixi 8 and inversify 8: `Action`, `EventDispatcher`, `GlobalEventProvider`, `di`, `View`/`Mediator`, `RootView`/`RootMediator`, `layout`. Import by file (`@dp-instant/core/Action.ts`); there are no barrel `index.ts` files. Add to it only what the game uses.
- **View / Mediator.** Views only render, animate and emit view events. Their `Mediator` holds the logic: it listens to its view and to global events (`dispatch`/`addListener`), and runs actions. Register each view in `src/app/AppModule.ts` with `.onActivation(bindMediator(SomeMediator))` and resolve it with `di.get`. Decorate DI classes with `injectable()` from `@dp-instant/core/injectable.ts`, not inversify's, so subclasses inherit `@inject` properties.
- **Flow is actions.** Game flow (rounds, steps, results) is built from `Action` subclasses. Game rules live in pure functions, separate from views, so they can be tested without rendering.
- **Pixi draws the world, React draws the UI, and they never import each other.** The canvas (`src/app/`, `src/dp/`, `src/audio/`) renders only the game world: road, lanes, manholes, chicken, cars. Every control is React (`src/ui/`), layered over the canvas inside `#game`. React knows the game only as `GameApi` (`src/contract/GameApi.ts`, types only). The game implements it in `src/app/bridge/UiBridge.ts`, turning commands into `UiEvents` and publishing model snapshots. `src/main.ts` is the only place that wires the two. `make check` enforces this with `scripts/boundaries.ts`: UI may import react, fonts, `src/contract/` and pure `src/game/`; the game may not import React or `src/ui/`; `src/game/` imports nothing.
- **The server decides, the client plays it back.** Outcomes, the wallet and every validation live on the game server, behind `GameServer` (`src/contract/ServerApi.ts`). Today that's `src/server/MockServer.ts`, running in the page with simulated latency and JSON-copied replies; a real backend implements the same calls. The client asks before it animates (open round, step, cash out) and never knows the car's lane until it hits. Rounds are provably fair: the server commits to `sha256(seed)` when a round opens and reveals the seed at the end, and `SettleAction` checks it with `src/game/fairness.ts`. Nothing in `src/app/` or `src/ui/` may import `src/server/` (`make check`).
- **One ticker.** `Ticker.shared` drives rendering and GSAP (`bindGsapToTicker`, `src/app/ticker.ts`). Animate and delay with GSAP (`gsap.to`, `gsap.delayedCall`), never `setTimeout` or `requestAnimationFrame`, so pausing the game (e.g. a hidden tab) freezes everything.

## Design system

`docs/design/` holds the game's design system (a copy of the published one, adapted to this repo). Read `docs/design/README.md` before any visual or UI work.

- **Tokens are the source of truth.** Edit `docs/design/tokens.json`, then run `make tokens`. That regenerates `src/app/ui/tokens.ts` (typed `COLOR`, `SPACE`, `RADIUS`, `SIZE`, `TYPE`) and `docs/design/tokens.css`. Never edit either output, and never hardcode a colour hex or a magic px in a view: use `COLOR['bg-900']` (a Pixi fill) or `COLOR['sun-500'].color` (a tint).
- **Colours mean game state.** `grass-*` = safe / win / cash out, `blood-*` = hit / loss, `sun-*` = coins and multipliers, `primary-*` = the CTA and the next tappable lane. Don't use them as decoration.
- **Components.** The rules for each piece (lane states, bet panel states, result banner, etc.) are in `docs/design/components/*.md`. `docs/design/reference/*.html` render them in a browser. `AppShell.html` shows the host site's header and chat around the game; the game owns only the stage.
- **Core loop.** Tap the next manhole: the lane either closes (barrier, coin, hop, multiplier up) or a car hits (round lost). Cash out between taps.

## Game map

- `src/game/`: pure, shared by client and server. `rules.ts` (difficulties, `multiplier`, `planRound`, bet limits; money in cents, multipliers in hundredths), `fairness.ts` (seeded draw, commit/verify), `GameModel.ts` (the client's mirror of server state plus the bet being chosen), `format.ts`.
- `src/server/MockServer.ts`: the mock game server (wallet, rounds, outcomes, validation).
- `src/app/actions/`: `SessionAction` loads the wallet at boot. Round flow in `round/`: `PlaceBetAction` (server opens a round) → `StepAction` (server decides, then hop and clear or crash) → `CashOutAction` → `SettleAction` (verifies fairness, records the result) → `EndRoundAction` (freezes the scene, then reopens betting). Before the first step, `CancelRoundAction` (tap the bet pill) refunds the round and reopens betting. Each dispatches `AppEvents.MODEL_CHANGED`.
- `src/app/game/`: `GameScreen` holds `BoardView` (`LaneView`); `GameMediator` turns `UiEvents`, manhole taps and keys into actions. All world art comes from the `game` atlas: separate PNGs in `raw_assets/game/` (2×, centred on their origin) listed in `src/assets/assets.json`, packed by `make assets` into `src/assets/atlases/game/`. Views take it with `art(Frame.x)` (`src/app/ui/art.ts`); only flat geometry (lane fills, dashes, grass, the next-lane ring) is drawn with `Graphics`.
- `src/contract/GameApi.ts`: the game ↔ UI interface (snapshot + commands). `src/app/bridge/UiBridge.ts` implements it.
- `src/ui/`: React. `BetModal` (popup: last result, bet, difficulty, Go), `RoundHud` (multiplier and lane on top; bet and Cash Out at the bottom), `useGame.ts`, `ui.css` (design tokens only; layout by container queries on the stage).
- `index.html` is the host site's placeholder shell (header and chat). `#game` holds the canvas and the React root; `MIN_SIZE` in `src/app/layout.ts` is the size below which the canvas scales down.

## Gotchas

- **Assets go through the manifest.** `src/assets/assets.json` lists every asset the game uses, and `make assets` (`scripts/assets.py`: Pillow, ffmpeg, optional pngquant) builds exactly those from `raw_assets/` into atlases, images and one sound sprite. `BootAction` loads whatever was built and binds every atlas frame and image by name to a Sprite factory, so views `@inject(...)` a fresh Sprite. Name art through the constants in `src/app/assets.ts`, never as a string.
- **Inject with `declare`.** Write injected fields as `@inject(id) declare readonly x: T`, so a class field never shadows the injected value. DI-built views take no constructor arguments.
- **Text is bitmap text.** Draw labels with `BitmapText` and a font from `BITMAP` in `src/app/ui/fonts.ts`; colour outlined text with `tint`. Keep canvas `Text` only for what a bitmap font can't serve. New characters must be added to `CHARS` there.
- **Audio is gesture-gated.** Play through `Sound` (`src/audio/Sound.ts`) by a typed `SoundName`. It stays muted until the first pointer gesture, as browsers require.
- **Responsive layout.** Recompute positions in `layout()` on every resize. Never assume a fixed aspect ratio or orientation.
- **Code style.** Node runs build scripts and configs by stripping types, so use erasable TypeScript only (no enums or parameter properties; decorators are fine) and `.ts` import extensions. Format with Prettier (4 spaces): `make format`.

## Committing

Read `docs/commit-conventions.md` before writing a commit message: gitmoji + Conventional Commits, one logical change per commit, chosen from the diff.

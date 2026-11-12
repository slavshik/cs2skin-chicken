# Chicken Cross Road

A crash-style browser game, written as a test assignment: tap the next manhole to move the
chicken one lane forward and raise the multiplier, or cash out before a car hits.

**▶ [Play it in the browser](https://slavshik.github.io/cs2skin-chicken/)**

Every push to `main` is checked, built and deployed to GitHub Pages by
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

## Run it locally

```sh
make install   # dependencies (Node 22.18+, see .nvmrc)
make dev       # dev server
make check     # typecheck, import boundaries, formatting, tests
make build     # production build into dist/
```

`make` with no target lists every target.

## Tech stack

- **Pixi.js 8** draws the game world, with **GSAP** for animation and **Howler** for sound.
- **React 19** draws the UI (bet popup, HUD) over the canvas, and talks to the game only
  through the `GameApi` contract (`src/contract/GameApi.ts`).
- **View / Mediator / Action** architecture from a trimmed port of dp-instant (`src/dp/`),
  wired with inversify.
- **Mock game server** (`src/server/MockServer.ts`) decides every outcome. Rounds are provably
  fair: the server commits to a seed hash when a round opens and reveals the seed at the end.
- **Vite**, **TypeScript**, **Prettier**, and **Make** as the entry point.

## Docs

- [`AGENTS.md`](AGENTS.md): architecture rules and a map of the code.
- [`docs/design/`](docs/design/README.md): the design system and its tokens.
- [`docs/commit-conventions.md`](docs/commit-conventions.md): commit message format.

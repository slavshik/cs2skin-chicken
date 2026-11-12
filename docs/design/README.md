# Chicken Cross Road

A design system for a _Chicken Cross Road_ game. The chicken starts on the grass verge. Each vertical lane has a manhole cover showing that lane's multiplier. Tap the next manhole and either the lane closes (a roadblock drops in, the cover turns into a coin, the chicken hops forward and the multiplier rises) or a car hits and the stake is lost. Cash out at any point between taps.

## Game states → visual rules

| Moment          | What changes                                                                                                                             |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Idle            | Bet panel enabled, board dimmed, _Place Bet_                                                                                             |
| Next lane armed | That lane gets `primary-tint` and its manhole glows (`glow-primary`). It's the only tap target.                                          |
| Lane cleared    | `barrier` drops in (180ms), the manhole flips to a gold coin, the chicken hops, the multiplier counts up, _Cash Out_ shows the new value |
| Hit             | Car enters the lane, white flash → `blood-900` lane + `glow-crash`, lose banner                                                          |
| Cashed out      | Win banner (`grass-*`), board resets                                                                                                     |

The visual language is **taken from cs2skin.com**. Its colour scales, type, spacing, radii, shadows and component geometry were read from the live site's CSS custom properties and computed styles on 2026-11-12, then extended with game-specific tokens: road, cars, chicken, win/crash glows. The site's name, logo and artwork aren't used here, only its design language.

## Feel

Night arcade. The page is a near-black navy (`bg-950`). Surfaces step up in small, cool, neutral increments. Violet (`primary-500`) is the only brand colour. Green, red and gold are earned: they appear only when something happens (a win, a crash, a payout).

## Voice

- Short and punchy, like the site's taglines ("for players, by players"). Buttons are Title Case verbs: _Place Bet_, _Go_, _Cash Out_.
- Playful about the chicken, never about money. _Splat_ is fine on a loss. Mocking the player ("Rekt", "Unlucky noob") isn't.
- Numbers are exact and always tabular: `x2.47`, `+30.88`. Multipliers start with `x`, profits carry a sign, and there are no emoji in UI copy.
- Never say "guaranteed", "easy money" or anything that implies a likely win.

## Colour

- **Surfaces**: `bg-950` page → `bg-930` panels/chips → `bg-900` cards/road → `bg-850` hover/alternate lane → `bg-800` raised/dividers. Depth comes from tint steps, not shadows.
- **Text**: `text-title` for headings and numbers, `text-body` by default, `text-muted` for secondary text, `text-subtle` for tertiary. `text-label` is the site's field-label grey and **fails 4.5:1** (3.4:1 on `bg-900`). It's kept for fidelity; prefer `text-subtle` in new UI.
- **Violet** (`primary-*`): the CTA, the selection border, the current lane. As text, use `primary-300`/`primary-400`; `primary-500` text fails at small sizes.
- **Game semantics**, never decoration:
    - `grass-*` = safe / win / cash out. Text on `grass-400` is `text-on-bright`.
    - `blood-*` = crash / loss / error. Fills with white text use `blood-600`.
    - `sun-*` = money: coins, upcoming multipliers. Text on `sun-500` is `text-on-bright`.
- **Cars**: `car-*` are the site's seven game-tile accents. Random per car, never `car-red` on the next lane.
- Tinted cards (ticker, active lane) use the accent at 32% alpha over the dark ground, plus a faint white radial glow at the top. This pattern is lifted from the site.

## Typography

One family: **Chakra Petch** (Google Fonts, OFL), weights 400/500/600/700. Its squared terminals give the arcade/tech tone. Load it with:

```html
<link
    href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&display=swap"
    rel="stylesheet"
/>
```

The scale is `hero` 44 → `multiplier-xl` 40 → `heading` 22 → `subtitle` 18 → `body` 16 → `button`/`body-sm` 14 → `tile-title` 13 → `caption` 12 → `micro` 10. Set `font-variant-numeric: tabular-nums` (`.ccr-num`) on every number. Bitmap-font text in Pixi must use the same family and weights.

## Space, shape, depth

- Spacing follows the site's `sds` scale: 2 / 4 / 6 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96. Panel padding is `space-400`; rows are `space-400` apart.
- Radii: all buttons are pills (`radius-pill`). Inputs and options use `radius-md` (8), tiles and panels `radius-lg` (10), modals `radius-xl` (16).
- Shadows are rare. Use `shadow-cta` under primary buttons and `shadow-float` for floating layers. The `glow-*` tokens are reserved for game state: current lane, live cash-out, crash.

## Layout

The game lives inside the host site's shell: header, chat sidebar (`chat-width` 320) and support bubble. The **AppShell** component shows them as placeholders, with the full game screen fitted in. The host's chrome is not ours to build; the game owns only the stage.

Inside the stage on desktop: header (`header-height` 80) → bet panel (`bet-panel-width` 335) on the left, board on the right, live-winners ticker under the board. On mobile, the board comes first, then the panel at full width with a sticky CTA above `bottom-nav-height`. The board scrolls horizontally and keeps the current lane at about 35% from the left.

## Motion (guidance, not tokens)

| Event               | Duration                                                    | Easing             |
| ------------------- | ----------------------------------------------------------- | ------------------ |
| Chicken hop         | 180ms                                                       | ease-out, 12px arc |
| Car pass            | 350–700ms (faster on harder difficulty)                     | linear             |
| Multiplier count-up | 250ms                                                       | ease-out, up only  |
| Crash               | 80ms white flash → `glow-crash`, 2px screen shake for 200ms | —                  |
| Result banner       | 180ms scale from 0.92, hold 1.2s                            | ease-out           |

Respect `prefers-reduced-motion`: no shake, no flash, and cross-fades instead of hops.

## Iconography & art

The site's game art is chunky, glossy 3D-style illustration with a strong rim light (grenade, gems, trophy) on dark gradients. For this game:

- Draw the **chicken** and **cars** in that style: thick shapes, soft top light, a dark rim. Chicken colours are `chicken-body`, `chicken-comb` and `chicken-beak`.
- UI icons are 20px line icons in `text-muted` (sound, fairness shield, share), as in the site header.
- The CSS chicken and car shapes in the component previews are **layout placeholders**. This system ships no final art yet (see the Assets view).

## Using in this repo

`docs/design/tokens.json` is the single source of truth. `make tokens` generates:

- `src/app/ui/tokens.ts`: typed `COLOR`, `SPACE`, `RADIUS`, `SIZE`, `TYPE` for Pixi
- `docs/design/tokens.css`: CSS variables for DOM overlays and the `docs/design/reference/` pages

```ts
import { COLOR, RADIUS, SIZE, TYPE } from '../ui/tokens.ts';

lane.rect(0, 0, SIZE['lane-width'], h).fill(COLOR['road-asphalt']);
hole.circle(0, 0, 36)
    .fill(COLOR.manhole)
    .stroke({ width: 3, ...COLOR['manhole-rim'] });
label.tint = COLOR['sun-500'].color;
```

`shadow-*`/`glow-*` are CSS-only. In Pixi, build glows with a blurred copy or a `GlowFilter` using the matching colour.

Open `docs/design/reference/*.html` in a browser to see each component (and `AppShell.html` for the full screen inside the host shell). The component guidelines are in `docs/design/components/*.md`.

## Accessibility

- All text pairs meet 4.5:1 except `text-label` (3.4:1, from the source) and `text-disabled` (disabled only).
- Win and loss always carry text and differ in lightness (`grass-300` vs `blood-400`), so colour is never the only signal.
- Focus: on inputs, a `primary-500` border plus `shadow-focus`; on buttons, a 2px `primary-300` outline with a 2px offset.
- Keyboard: Space = open the next manhole (same as _Go_), Enter = Cash Out, 1–4 = difficulty. Show these in a tooltip.

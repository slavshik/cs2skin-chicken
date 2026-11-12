# AppShell

The host site's frame, used as a placeholder: the header, the chat sidebar and the floating support button, with the Chicken Cross Road screen fitted into the content area.

The **header** and **chat** are placeholders that mirror the host's layout so the game can be sized against real constraints. Don't build them out. The logo slot is intentionally blank (dashed box).

## Grid

```
┌──────────────────────── header-height 80 ────────────────────────┐
├─ chat-width 320 ─┬──────────────── stage (ours) ──────────────────┤
│  messages        │  history chips ················ Sound Fairness  │
│                  │  ┌ bet-panel 335 ┐ ┌ board: curb + lanes ─────┐ │
│                  │  │ tabs/stake/   │ │  live x  ·  Lane N badge │ │
│  Login to chat   │  │ difficulty/CTA│ │                          │ │
│  lang · online   │  └───────────────┘ └──────────────────────────┘ │
│                  │  winners ticker                           (●)  │
└──────────────────┴─────────────────────────────────────────────────┘
```

- Stage padding is `space-600` (left `space-1200`, to clear the chat collapse tab). Gaps are `space-400`.
- The board takes the remaining width: at 1440px that's a curb plus about 5 lanes at `lane-width`. It scrolls horizontally to keep the **next** lane at about 35% from the left.
- The live multiplier (`ccr-mult--xl`) sits centred at the top of the board, and the `Lane N` badge at top right.
- The support bubble floats over the stage, bottom right. Keep the board's lower-right corner free of controls.

## Breakpoints

| Width     | Behaviour                                                                                                                                      |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| ≥ 1280    | As shown                                                                                                                                       |
| 1024–1279 | Chat collapsed to its tab; the stage gains 320px                                                                                               |
| < 1024    | No chat. The board goes on top at full width (`lane-width` 80), the bet panel below it at full width, the CTA sticky above `bottom-nav-height` |

If the game is embedded as an iframe or canvas, it owns only `.ccr-stage`. The host renders everything else.

# Button

Pill-shaped actions in four variants: primary (violet), cashout (green), ghost and idle.

- **Primary** (`primary-500`, text `text-title`): the one action that starts or continues a round — _Place Bet_, _Go_ (next lane). One per view.
- **Cashout** (`grass-400`, text `text-on-bright`, `glow-win`): shown only while a round is live and the multiplier is above x1.00. It swaps in where Primary was. Always show the live multiplier inside it (`.ccr-btn__sub`) so the player sees what they're cashing.
- **Ghost**: secondary header actions (_Login_, _Share_, _Fairness_).
- **Idle** (`glass-10`): the logged-out or insufficient-balance state, copied from the site's _Start Game_. Use `disabled` on the element as well.

Sizes: `control-height` (48px) in the bet panel; `--sm` = `button-height` (44px) in the header. Radius is always `radius-pill`.
Labels are Title Case verbs, 1–2 words. No icons in the main CTA except the coin.
The consumer provides the click handler and the disabled logic. Never show Cashout and Primary side by side.

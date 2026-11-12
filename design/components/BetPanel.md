# BetPanel

The left-hand control column. It holds the Manual/Auto tabs, the stake, the difficulty and the round CTA, in that order.

Layout follows the site's Mines page: `bet-panel-width` (335px), a `bg-900` body, `radius-lg`, `space-400` padding and `space-400` between rows. Tabs sit on `bg-930`; the active tab gets a 2px `primary-500` underline.

The panel has three states:

1. **Idle**: inputs enabled, one Primary _Place Bet_.
2. **Live**: inputs locked. _Cash Out_ (with the live multiplier) above Primary _Go_, which hops one lane. The profit line shows in `grass-300`.
3. **Settled**: the ResultBanner shows on the board, and the panel returns to Idle after about 1.2s.

On mobile (<768px) the panel sits below the board at full width. The CTA becomes sticky above `bottom-nav-height`.

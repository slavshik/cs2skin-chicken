# WinnerTicker

A horizontally scrolling strip of recent wins, copied from the site's Live Winners row.

Each card is 140×54, `radius-md`, `space-200` padding. The fill is a 32% tint of one of four accents (violet `primary-tint`, blue, magenta, orange) plus a faint white radial glow at the top. The name is `caption`/600 and the amount is coin + `caption` in `text-title`.

The tint means win size, not who the player is: violet below x2, blue x2–x10, magenta x10–x100, orange above x100. New items slide in from the left over 300ms. Pause scrolling on hover.

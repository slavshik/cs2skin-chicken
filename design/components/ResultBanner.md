# ResultBanner

The end-of-round card, centred over the board on an `overlay` scrim.

- **Win**: `grass-800` fill, `grass-600` border, `glow-win`. The title reads _Cashed Out_. Show the multiplier in `multiplier-xl` and the payout as coin + amount in `grass-300`.
- **Lose**: `blood-900` fill, `blood-800` border, no glow. Use a short, playful title (_Splat_, _Roadkill_ is too much), the lane reached and the loss in `blood-400`.

Win and lose differ in lightness as well as hue (grass-300 vs blood-400), and the title text carries the meaning on its own, so colour isn't the only signal.

Timing: scale in from 0.92 over 180ms ease-out, hold for 1.2s, then fade out. A click anywhere dismisses it early. The consumer provides the amounts and the dismiss callback.

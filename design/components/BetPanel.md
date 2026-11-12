# BetPanel

The bet popup shown before every round: stake, difficulty, what's at stake, and Go. In code it's `BetModal` (React, `src/ui/BetModal.tsx`).

- **Open while betting.** It covers the game stage only (host header and chat stay usable) on an `overlay` scrim, with the board visible behind it. Card: `bg-900`, `radius-xl`, `shadow-float`, max 420px wide.
- **Order:** title + balance → last round's result (win `grass-*` / loss `blood-*`, only after a round) → Bet Amount (editable, chips 1/2 · 2x · Min · Max) → Difficulty (2×2 cards: name, lanes and cars, max multiplier) → summary (first lane, max win) → **Go** (primary, shows the stake).
- **Go** starts the round and the popup fades out (180ms). Focus returns to the page so Space keeps stepping.
- **During the round** the RoundHud shows what's at stake: the bet and difficulty pill, the live multiplier with `Lane n/N`, and Cash Out with the amount it pays. On a narrow stage, the stake and Cash Out move to the bottom.
- **After the round** the scene freezes for 0.5s, then the popup returns, leading with the result.
- When the demo balance can't cover the minimum bet, Go becomes _Refill demo balance_.

Keys: Space = Go / next lane, Enter = Cash Out, 1–4 = difficulty (while betting).

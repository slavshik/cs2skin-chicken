# BetPanel

The bet popup shown before every round. In code it's `BetModal` (React, `src/ui/BetModal.tsx`). It holds only what the decision needs.

- **Open while betting**, over the game stage only (host header and chat stay usable), on an `overlay` scrim with the board visible behind it. Card: `bg-900`, `radius-xl`, `shadow-float`, max 360px wide.
- **Contents, top to bottom:**
    1. Last round's result, as one compact strip (win `grass-*` / loss `blood-*`); only after a round.
    2. Bet: the label row carries the balance, then the editable amount with chips 1/2 · 2x · Max.
    3. Difficulty: one segmented row (Easy · Medium · Hard · Hardcore), and one caption line under it: lanes · cars · win up to xN.
    4. **Go**: 56px, primary.
- **No** title, summary cards or key hints: keys work (Space = Go / next lane, Enter = Cash Out, 1–4 = difficulty) but aren't advertised in the popup.
- **Go** starts the round and the popup fades out (180ms). Focus returns to the page so Space keeps stepping.
- **During the round** (`RoundHud`): the live multiplier and `Lane n/N` at the top centre. At the bottom, the bet pill and **Cash Out** centred with the amount it pays. Centred because the host's support bubble owns the bottom-right corner. On a narrow stage Cash Out spans the width with the bet above it.
- **After the round** the scene freezes for 0.5s, then the popup returns with the result strip.
- When the demo balance can't cover the minimum bet, Go becomes _Refill demo balance_.

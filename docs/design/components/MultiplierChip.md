# MultiplierChip

A pill showing a payout multiplier, used in four tones: upcoming, live, won and lost.

- **Upcoming** (`sun-900` / `sun-500`): a lane's potential payout.
- **Live** (`primary-500` / `text-title`): the current multiplier. The `--xl` size uses the `multiplier-xl` type style above the board.
- **Won** (`grass-800` / `grass-300`) and **Lost** (`blood-900` / `blood-400`): the history strip of past rounds.

Always format as `x` plus two decimals (`x1.04`, `x12.40`, `x1,024.00`) with `tabular-nums`. When the live value increases, count it up over 250ms; never animate it downward.

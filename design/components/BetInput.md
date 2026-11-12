# BetInput

The stake field: a coin icon, the numeric value and modifier chips inside a `bg-950` well.

- Well: `bg-950`, `radius-md`, `control-height`, 1.5px transparent border. Focus = `primary-500` border + `shadow-focus` (taken from the site). Error (over balance) = `blood-500` border plus a `blood-400` helper line under it.
- Chips (`chip-height`, `radius-sm`, `bg-930`, `caption` type): `1/2`, `2x`, `Max`. The site uses `+1 / +100`; for Chicken Cross Road, halve/double is the standard pattern.
- Label row: `text-label` on the left. The fiat equivalent goes on the right in `text-muted`.
- Values use `tabular-nums` so digits don't shift while typing.
- Lock the whole field (with `disabled` on the input) while a round is live.

The consumer provides parsing, min/max clamping and the currency icon if it isn't the generic coin.

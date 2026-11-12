# DifficultySelector

A four-option segmented control for risk level: Easy, Medium, Hard, Hardcore.

Its styling comes from the site's Mines grid-size picker. Options are `segment-height`, `radius-md` and `bg-930`. The selected option gets a 1.5px `primary-500` border and `text-title`; the rest stay `text-muted`. Use `aria-pressed` for state.

The label's right side shows what the choice means in plain numbers (lanes, hit chance), not a colour scale. Don't colour the options green to red: difficulty isn't a win/lose state, and the semantic colours are reserved for those.

Disable it during a live round. The consumer provides the lane count and odds for each level.

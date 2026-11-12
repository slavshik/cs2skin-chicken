# GameTile

The lobby card for a game: an illustration, a title and a one-line hook, on an accent gradient.

The geometry is the site's: 120×128, `radius-lg`, and a vertical gradient from `#0c1117` to the game's accent at 64% alpha. Six accents are available (green, violet, gold, blue, orange, red). Chicken Cross Road uses **green**, because the chicken's goal is the grass on the far side.

The illustration sits in the top two-thirds and may overflow the top edge. The title is `tile-title`; the hook is 9px/500, at most four words. On hover the tile lifts 3px. The consumer provides the art.

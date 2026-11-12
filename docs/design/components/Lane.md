# Lane

One vertical road lane. Cars drive top to bottom, and a manhole cover sits mid-lane with that lane's multiplier on it. The board runs left to right: a grass curb, then N lanes.

**Core loop:** the player taps the next manhole. Either the lane closes (a barrier drops in, the manhole turns into a coin, the chicken hops onto it and the multiplier rises), or a car hits and the round is lost. _Cash Out_ is available between taps.

| State           | Lane fill           | Content                                                                             |
| --------------- | ------------------- | ----------------------------------------------------------------------------------- |
| cleared         | asphalt             | `barrier` roadblock + gold coin (`.ccr-coin-lg`)                                    |
| current         | asphalt             | barrier + chicken, live multiplier chip under it                                    |
| next (tappable) | `primary-tint`      | manhole at full opacity, `primary-400` rim, `glow-primary`; scales to 1.06 on hover |
| locked          | alternating asphalt | manhole at 45% opacity, multiplier in `text-subtle`                                 |
| crashed         | `blood-900`         | manhole rim `blood-500` + `glow-crash`; the car stays on screen                     |

- Only the **next** lane is interactive. Tapping further ahead does nothing (optionally a small shake).
- Cars use the `car-*` palette and only appear in locked lanes. A cleared lane never shows a car, because the barrier visually stops it.
- `road-dash` dividers are dashed 18/18px and purely decorative.
- The lane-counter badge (`.ccr-badge-lane`, top right, `grass-400`) shows progress: _Lane 5_.
- `lane-width` is 120px (80px on mobile). The board scrolls horizontally so the next lane stays at about 35% from the left.
- The CSS chicken, car, coin and barrier shapes are layout placeholders. Ship sprite or Spine art in the README's art style.

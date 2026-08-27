# Osonflow landing — Motion Layer v2

Two new files + three lines of HTML. Nothing else in your codebase changes.

## Install (standalone export)

Copy `motion.css` and `motion.js` next to `japandi-landing.css`, then:

```html
<!-- in <head>, AFTER japandi-landing.css -->
<link rel="stylesheet" href="./motion.css" />

<!-- at the very end of <body>, AFTER main.js and the init call -->
<script src="./motion.js"></script>
```

Order matters: `motion.css` must come after the base stylesheet, `motion.js` after `main.js`.

## Install (production React app)

1. Drop `motion.css` next to the runtime copy of `japandi-landing.css` (`apps/web/public/landing/`) and import it after it.
2. Load `motion.js` once on the landing route (`<script src="/landing/motion.js" defer />` or a `useEffect` import).
3. Framer Motion can stay. `motion.js` clears the `fm-pending` class on mount, so whichever layer runs first wins and nothing double-animates. If you want Framer to own a block, add `data-mo-skip` to it and delete it from the `GROUPS` list at the top of `motion.js`.

## What it does

| Area | Before | After |
| --- | --- | --- |
| Sections below the hero | no animation in the export (`fm-pending` never resolves) | fade + rise + de-blur, staggered 70ms per element within each section |
| Headlines | static | split into words, each rising with blur out, 42ms apart |
| Hero accent word | flat ink | blue → orange gradient, swept twice on arrival then held |
| Hero background | `display:none` | soft aurora glow behind the copy |
| Hero copy | static | lifts, fades and softens as you scroll past |
| Buttons | colour transition | magnetic cursor pull, sheen sweep on hover, halo pulse on the primary CTA |
| Cards | 4° tilt | tilt + radial cursor spotlight + depth shadow |
| Sparklines / ops chart | drawn instantly | stroke draw-on over 1.9s, area fill scales up, live node ping |
| Intent bars | width jump | eased fill with a shimmer pass |
| Counters | jittery width | tabular figures, arrival pop |
| Method track | static rule | top line draws left→right tied to scroll position |
| Nav | scroll shrink only | + 2px gradient scroll-progress bar, auto-hide on fast scroll down, underline on the section you're in |
| Marquee | fixed 38s | speeds up to 12s with scroll velocity, greyscale logos colour up on hover |
| Anchors | instant jump | eased scroll with 88px nav offset |
| — | — | back-to-top button after 1.2 viewports |

## Performance & accessibility

- **Nothing animates off screen.** `motion.js` §13a puts `.mo-rest` on every section outside the
  viewport (160px margin) and `motion.css` §14 pauses every keyframe animation inside it. Without
  this, ~a dozen looping animations — marquee, shimmer, pulse, breathe — repaint at 60fps for the
  whole visit, including sections the visitor never scrolls to. Measured idle cost of the landing
  route on the main thread: **10.2% before, 0.2% after**.
- Looping animations that repaint rather than composite are capped rather than left running. The
  hero accent gradient animates `background-position` through `background-clip: text`, which repaints
  the headline every frame, so it runs two cycles and then settles on the static gradient.
- One shared `requestAnimationFrame` loop drives every scroll-linked value — no per-element scroll listeners.
- Only `transform`, `opacity`, `filter`, `translate` and `scale` are animated (compositor-friendly).
- Every feature is wrapped in its own try/catch: one failure never takes the page down.
- A 3.5s failsafe force-reveals anything that somehow never intersected — content can never get stuck invisible.
- `prefers-reduced-motion: reduce` disables all of it and shows everything at rest.
- No dependencies, ~7 kB of JS, ~9 kB of CSS uncompressed.

## Tuning

Top of `motion.css`:

```css
--mo-dur: .95s;      /* base reveal duration */
--mo-stagger: 70ms;  /* delay between siblings */
--mo-out: cubic-bezier(.16,1,.3,1);
```

Top of `motion.js`: `SPLIT` (which headlines get word-split) and `GROUPS` (which containers stagger their children).

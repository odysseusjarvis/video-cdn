# Scroll Effects Library

Copy-paste scroll animation recipes for luxury-grade promotional sites. Native CSS + Web APIs only.
**Zero libraries. Zero cost. Zero build step.** Every block below is production code, not pseudocode.

---

## 0. Read this before you use anything else

### 0.1 Browser reality, verified 2026-08-02

Do not trust 2024 blog posts that call scroll-driven animations "widely supported". Verified today:

| Feature | Chrome/Edge | Safari | Firefox | Baseline |
|---|---|---|---|---|
| `animation-timeline: scroll()` / `view()` | 115+ (Jul 2023) | **26+ (Sep 2025)** — 18.x and earlier: no | **stable: NO** — behind `layout.css.scroll-driven-animations.enabled`, on in Nightly, Interop 2026 priority, 156 is the first supporting version | **Limited availability** — global support ~84% |
| `ScrollTimeline` / `ViewTimeline` JS constructors | Chromium only | no | no | Limited |
| `IntersectionObserver` | yes | yes | yes | **Widely available** |
| `position: sticky` | yes | yes | yes | **Widely available** |
| `clip-path` (inset/circle/polygon) | yes | yes | yes | **Widely available** |
| `ResizeObserver` | yes | yes | yes | **Widely available** |
| Web Animations API (`el.animate()`) | yes | yes | yes | **Widely available** |
| `transform-style: preserve-3d`, `perspective` | yes | yes | yes | **Widely available** |

**Consequences you must design around:**

1. Roughly **1 in 6 visitors** gets **no** CSS scroll-driven animation (global support ~84%). **Do not think of that cohort as "Firefox".** Firefox is only ~2–3% of global usage; the overwhelming majority of the unsupported group is **Safari older than 26** — iPhones and iPads that have not taken the 26 update. That inverts the naive reading of this table: your un-enhanced tier is served mostly to *mobile Safari*, on exactly the phones that a roofer's or plumber's customers are holding. So: **the un-enhanced page must be complete, legible and beautiful on its own — and you must check it at 390px, not just in desktop Firefox.**
2. Never use the JS `ScrollTimeline`/`ViewTimeline` constructors. They are worse-supported than the CSS. Use CSS + `@supports`, and `IntersectionObserver` for the fallback tier.
3. Never reach for the `scroll-timeline` polyfill on a client site — it re-introduces main-thread scroll work, which is the exact thing we're avoiding.

### 0.2 The three-tier architecture — every effect in this file follows it

```
TIER 1  Base CSS       Final resting state. No transform, full opacity. Works everywhere,
                       including no-JS, no-CSS-animation, print, and crawlers.
TIER 2  @supports      Scroll-driven enhancement for Chrome/Edge/Safari. Sets the "before"
                       state and hands it to the compositor.
TIER 3  IntersectionObserver  Optional one-shot entrance for Tier-1 browsers (pre-26 Safari,
                       Firefox stable). Cheap, universal, no scrubbing.
```

The critical rule: **the "hidden" starting state is only ever applied inside `@supports` or by JS after it has confirmed it can also un-hide.** If you write `opacity: 0` in the base layer, every pre-26 Safari and Firefox visitor gets a blank page. This is the single most common way agencies ship a broken site.

```css
/* CORRECT — hidden state is scoped to browsers that can un-hide it */
@supports (animation-timeline: view()) {
  .reveal { opacity: 0; }
  .reveal { animation: rise-in linear both; animation-timeline: view(); animation-range: entry 15% cover 40%; }
}
```

```css
/* WRONG — non-supporting browsers show a permanently empty section */
.reveal { opacity: 0; }
@supports (animation-timeline: view()) { .reveal { animation: … } }
```

### 0.3 Gotchas that will cost you an hour each

- **The `animation` shorthand resets `animation-timeline` and `animation-range` to their initial values.** They are "reset-only" longhands. Always declare them *after* the shorthand.
  ```css
  animation: rise-in linear both;   /* first */
  animation-timeline: view();       /* then */
  animation-range: entry 20% cover 50%;
  ```
- **`animation-delay` is ignored on scroll-driven timelines.** Delay is time-based; these timelines are progress-based. To stagger, vary `animation-range-start` per item (§11) — not `animation-delay`.
- **Always add `both`** (`animation-fill-mode: both`), or the element snaps back outside the range.
- **Always use `linear`** timing for scrubbed animations. An `ease` curve on a scroll timeline feels like the page is fighting the user's finger. Use easing only for one-shot entrances (§1, §11).
- **View ranges are computed from the *untransformed* box.** Your `scale()`/`translate()` will not feed back into the range. This is a feature — it prevents layout loops.
- **A named timeline is visible to the declaring element and its descendants.** Only reach for `timeline-scope` when the animated element is a *sibling or ancestor* of the scroller.
- **Dividing by a `var()` inside `calc()`** — `calc(var(--i) / (var(--n) - 1) * 100%)` — is CSS Values 4 and
  works in all three engines today. It is what makes the `--i` / `--n` index pattern in §4, §6, §9 and §11
  possible without JS. Just never let the divisor reach zero: guard single-item cases (`--n: 1`) in markup.
- **`clip-path` on a target makes `IntersectionObserver` blind to it — this deadlocks the Tier-3 pattern.**
  IO computes the intersection rect *after* clipping, so an element hidden with
  `clip-path: inset(0 0 100% 0)` reports `intersectionRatio: 0` and `isIntersecting: false` **no matter
  where it is on screen**. The observer that was supposed to un-hide it therefore never fires, and the
  element stays invisible forever. Measured: three `.unmask` tiles sitting at `top: 255px` in a 720px
  viewport, all reporting ratio `0`. `opacity: 0` and `transform` do **not** have this problem — only
  clipping does. **Never observe the element you clipped.** Put the clip on an inner element and observe
  the unclipped wrapper (§10).
- `will-change` is a last resort, not a default. Scroll-driven animations are already composited off the main thread; adding `will-change: transform` to 40 cards costs you memory and can *reduce* framerate.
- **Percentage-sized flex/grid children need `box-sizing: border-box` before any `calc()` travel formula
  is trustworthy.** With the CSS default (`content-box`), `flex: 0 0 74vw` plus `padding: 1.5rem` gives a
  995px panel, not a 947px one — and a five-panel track then overshoots your arithmetic by 240px (§7).

### 0.4 Reduced motion — non-negotiable

Ship this global block once, then let individual effects opt into a calmer variant.

```css
/* motion-base.css — include on every project, before the effect CSS */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
  /* Kill scroll-linked scrubbing outright — it is motion the user did not ask for. */
  * { animation-timeline: auto !important; animation-range: normal !important; }
  /* Anything that was going to be revealed must be visible instead. */
  .reveal, .reveal > *, [data-reveal] { opacity: 1 !important; transform: none !important; clip-path: none !important; }
}
```

#### The invariant that block imposes — read it, it has bitten every effect below

That block does **not** delete your animations. It converts each one into a **0.001 ms time-based
animation with `both` fill**, which means every scroll-driven animation **snaps instantly to its `to`
keyframe and stays there.** (Verified in Chromium: a `view()`-timeline animation under
`prefers-reduced-motion: reduce` computes `animation-timeline: auto`, `animation-duration: 1e-06s`,
and lands exactly on its final keyframe.)

> **Rule: a scrubbed keyframe whose `to` state is not the desired resting state MUST be gated by
> `@media (prefers-reduced-motion: no-preference)` — the §0.4 block alone will not save it.**

This is not theoretical. Take §4's `step-through`, which ends at `opacity: 0`:

```css
/* BROKEN under reduced motion: snaps to `to`, i.e. opacity 0 — a blank pinned section. */
.steps__item { opacity: 0; animation: step-through linear both; animation-timeline: --stage; }
@keyframes step-through { 0% { opacity: 0 } 25%,75% { opacity: 1 } 100% { opacity: 0 } }
```

Measured with reduced motion forced on, all four steps sit at `opacity: 0` — the user scrolls through
a pinned, empty viewport. §4 below is correct only because it wraps the whole Tier-2 block in
`no-preference`. The keyframes in this file that end in a non-resting state, and therefore *must* stay
gated or explicitly overridden, are: **`step-through` (ends transparent), `ba-wipe` (ends fully clipped
away), `spin` (ends rotated), `seq-step` (ends on the last frame), `plx-drift` (ends displaced),
`spiral-turn` (ends translated)**. Everything else (`zoom-settle`, `tilt`, `rt-rise`, `cascade-in`,
`split-assemble`, `wipe-mask`, `wipe-inner`, `unmask-up`, `step-bar`) ends in its resting state and is
safe under the global block alone.

Reduced motion does **not** mean "no design". It means: no travel, no parallax, no scrub. Cross-fades under ~150 ms and colour changes are still acceptable and keep the page feeling alive. Several effects below define a reduced-motion *substitute* rather than nothing.

### 0.5 Shared JS helper — the only JS most pages need

```js
/* motion.js — ~40 lines, no dependencies. Import once. */
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)');

/** Adds `.is-in` the first time each element enters view. Idempotent, self-cleaning. */
export function revealOnce(selector, { threshold = 0.15, rootMargin = '0px 0px -8% 0px', root = null } = {}) {
  const items = [...document.querySelectorAll(selector)];
  if (!items.length) return () => {};

  // No IO, or user wants stillness -> show everything immediately, animate nothing.
  if (REDUCED.matches || !('IntersectionObserver' in window)) {
    items.forEach(el => el.classList.add('is-in'));
    return () => {};
  }
  const io = new IntersectionObserver((entries, obs) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('is-in');
      obs.unobserve(e.target);              // one-shot: never re-animate on scroll-up
    }
  }, { threshold, rootMargin, root });

  items.forEach(el => io.observe(el));
  return () => io.disconnect();
}

/** True when the browser can run CSS scroll-driven animations.
 *  Prefer the CSS `@supports` gate for styling — reach for this only when JS must branch
 *  (e.g. skipping a canvas preload). Don't use it to duplicate a gate CSS already handles. */
export const HAS_SDA = CSS.supports('animation-timeline: view()');

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp  = (a, b, t) => a + (b - a) * t;
```

### 0.6 The `.stage` primitive — powers effects 3, 4, 6, 7, 9

A tall element that pins a viewport-sized child. The `contain` view-range of the tall element is
*exactly* the period during which the child is pinned, which gives you a 1:1 scroll mapping for free.

```css
/* Reusable pinned stage. Height controls how long the effect lasts. */
.stage {
  position: relative;
  height: var(--stage-h, 300vh);   /* 300vh = 2 viewports of scrubbing */
  view-timeline-name: --stage;     /* ignored where unsupported; harmless */
  view-timeline-axis: block;
}
.stage__pin {
  position: sticky;
  top: 0;
  height: 100svh;                  /* svh: no jump when mobile URL bar collapses */
  display: grid;
  place-items: center;
  overflow: clip;                  /* clip, not hidden: no accidental scroll container */
}
/* Children reference --stage directly; they are descendants, so no timeline-scope needed. */
```

```html
<section class="stage" style="--stage-h: 300vh">
  <div class="stage__pin">
    <!-- animated content -->
  </div>
</section>
```

`animation-range: contain 0% contain 100%` on any descendant = "from the moment the pin locks to the moment it releases".

### 0.7 Taste budget

- **Two, maybe three** scroll effects on a whole page. A trades business with eleven effects looks like a template; the same business with one perfect sticky sequence looks expensive.
- Never stack effects on one element (no parallax + rotate + zoom together).
- Effects belong to **sections**, not to every card, heading and icon.
- Effect selection by business type:
  - **Trades (roofer, plumber, electrician, joiner):** §1 text reveal, §11 cascade, §10 clip-path unmask on before/after work. Nothing 3D. Their audience is on mid-range Android on 4G.
  - **Restaurant / hotel / spa:** §2 zoom, §8 parallax (one layer), §4 sticky sequence.
  - **Architect / interior design / photographer / gallery:** §7 horizontal, §9 3D split, §10 unmask.
  - **Manufacturer / engineering / automotive / product:** §3 canvas sequence, §5 rotation, §4 sticky.
  - **Law / accountancy / medical / financial:** §1 and §11 only. Motion here signals frivolity; restraint signals competence.

---

## 1. Text reveal on scroll — masked rise

**(a)** Words or lines rise from behind an invisible horizontal mask, as if set into the page.

**(b) When to use.** The one effect that belongs on almost every site. Hero headline, section openers, a
pull-quote, the founder's line on an About page. Universally flattering: it makes ordinary copy feel typeset
rather than pasted. Works for a law firm as well as a nightclub — only the duration and easing change
(slower + softer for professional services, snappier for hospitality).

**(c) When NOT to use.** Never on body paragraphs — reading text that assembles itself is hostile.
Never on more than 2–3 elements per viewport. Never word-by-word on a headline longer than ~10 words
(it turns into a slot machine). Never on prices, phone numbers, opening hours or addresses — information
a visitor may be scanning for in a hurry must be there instantly.

**(d) Code.**

HTML — semantic, real heading, no wrapper soup:

```html
<h2 class="reveal-text" data-split="words">Craft that outlives the contract</h2>
<p  class="reveal-text" data-split="lines">We have re-roofed 1,400 homes across the county since 1978.</p>
```

CSS:

```css
/* ---- TIER 1: base. Fully visible, fully legible, no JS required. ---- */
.reveal-text { --rt-dur: 640ms; --rt-stagger: 55ms; --rt-rise: 0.9em; }

/* JS wraps each word/line: <span class="rt-mask"><span class="rt-i">word</span></span> */
.rt-mask {
  display: inline-block;
  overflow: hidden;            /* the mask: crops the child's travel */
  vertical-align: bottom;      /* stops descenders being clipped */
  padding-bottom: 0.08em;      /* breathing room for g, y, p */
}
.rt-i { display: inline-block; }

/* ---- TIER 3: one-shot entrance, works in every non-supporting browser ---- */
/* The delay is computed IN CSS from --i and --rt-stagger. Do not let JS write a
   resolved millisecond value: that is what silently breaks the mobile override below,
   because a hardcoded JS delay ignores any media query you write for --rt-stagger. */
.reveal-text[data-ready] .rt-i {
  --rt-delay: calc(var(--i, 0) * var(--rt-stagger));
  transform: translateY(var(--rt-rise));
  opacity: 0;
  transition:
    transform var(--rt-dur) cubic-bezier(.22,.61,.36,1) var(--rt-delay),
    opacity   calc(var(--rt-dur) * .6) linear var(--rt-delay);
}
.reveal-text[data-ready].is-in .rt-i { transform: translateY(0); opacity: 1; }

/* ---- TIER 2 (optional): scrub the reveal to scroll instead of firing once. ----
   Use only for a hero line you want tied to the scrollbar. For everything else the
   one-shot above reads better and costs nothing. Stagger via animation-range,
   NOT animation-delay (delay is ignored on scroll timelines). */
@supports (animation-timeline: view()) {
  .reveal-text[data-scrub] .rt-i {
    animation: rt-rise linear both;
    animation-timeline: view();
    animation-range: entry calc(12% + var(--i) * 3%) entry calc(62% + var(--i) * 3%);
  }
}
@keyframes rt-rise {
  from { transform: translateY(0.9em); opacity: 0; }
  to   { transform: translateY(0);     opacity: 1; }
}
```

JS splitter — the only part CSS cannot do:

```js
/* split.js — wraps words, then optionally regroups them into real line boxes. */
export function splitText(el) {
  // NB: `el.dataset.ready` is the EMPTY STRING once armed, which is falsy — a plain
  // truthiness check here is not a guard at all and will happily re-split. Compare to undefined.
  if (el.dataset.ready !== undefined) return;         // idempotent
  const mode = el.dataset.split || 'words';
  const source = el.textContent.trim();
  el.setAttribute('aria-label', source);              // screen readers read the whole string…
  el.textContent = '';

  // 1. Always split to words first.
  const words = source.split(/\s+/).map((w, i) => {
    const mask = document.createElement('span');
    mask.className = 'rt-mask';
    mask.setAttribute('aria-hidden', 'true');         // …not 47 fragments
    const inner = document.createElement('span');
    inner.className = 'rt-i';
    inner.textContent = w;
    mask.append(inner);
    el.append(mask, document.createTextNode(' '));
    return mask;
  });

  // 2. Line mode: measure where the browser actually broke the text, then regroup.
  //    CSS has no selector for a line box, so this measurement step is unavoidable.
  if (mode === 'lines') {
    const lines = [];
    let top = null, bucket = null;
    for (const w of words) {
      const y = Math.round(w.offsetTop);
      if (y !== top) { top = y; bucket = []; lines.push(bucket); }
      bucket.push(w);
    }
    el.textContent = '';
    lines.forEach((bucket, i) => {
      const mask = document.createElement('span');
      mask.className = 'rt-mask';
      mask.style.display = 'block';                   // line masks are block-level
      mask.setAttribute('aria-hidden', 'true');
      const inner = document.createElement('span');
      inner.className = 'rt-i';
      inner.style.setProperty('--i', i);
      inner.textContent = bucket.map(m => m.textContent).join(' ');
      mask.append(inner);
      el.append(mask);
    });
  }

  // 3. Index each unit. Set ONLY --i; the delay is derived in CSS from --rt-stagger so that
  //    the mobile media query in (e) actually has something to override.
  [...el.querySelectorAll('.rt-i')].forEach((n, i) => n.style.setProperty('--i', i));
  el.dataset.ready = '';                              // only now is the hidden state allowed
}

/* Wire-up */
import { revealOnce } from './motion.js';
const targets = document.querySelectorAll('.reveal-text');
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  // Wait for webfonts, or lines are measured against the fallback face and regroup wrongly.
  document.fonts.ready.then(() => {
    targets.forEach(splitText);
    revealOnce('.reveal-text');
  });
}
/* Re-split lines on resize (line breaks move). Debounced, width-only. */
let lastW = innerWidth;
addEventListener('resize', () => {
  if (Math.abs(innerWidth - lastW) < 40) return;
  lastW = innerWidth;
  targets.forEach(el => {
    if (el.dataset.split !== 'lines') return;
    el.textContent = el.getAttribute('aria-label');
    delete el.dataset.ready;
    el.classList.remove('is-in');
    splitText(el); el.classList.add('is-in');
  });
}, { passive: true });
```

**(e) Mobile fallback.** Reduce `--rt-rise` to `0.5em` and `--rt-stagger` to `30ms` below 640px — a large rise
on a narrow column reads as a glitch. Cap the stagger total: with 20 words at 55 ms the last word lands 1.1 s
late, which feels broken on a small screen.

```css
@media (max-width: 640px) { .reveal-text { --rt-rise: .5em; --rt-stagger: 30ms; } }
```

This override **only works because the delay is `calc(var(--i) * var(--rt-stagger))` in CSS.** If you let
the splitter write `--rt-delay: 55ms` per element (the obvious implementation, and the one to avoid), the
inline style wins and this media query is dead code that looks like a fallback but changes nothing.

**(f) Reduced motion.** The global block in §0.4 handles it, and the JS above never even splits the text —
so the DOM stays a plain heading. That is the correct outcome: nothing to un-hide, nothing to break.

**(g) Native CSS enough?** **Almost.** The *animation* is pure CSS. Word wrapping could be authored by hand in
HTML with zero JS. **Line-by-line genuinely requires JS**, because line boxes are generated by layout and CSS
exposes no selector or unit for them (`::first-line` styles one line and cannot transform it). No library
needed — 40 lines of DOM code, versus ~25 KB for SplitType/GSAP SplitText.

---

## 2. Zoom scroll

**(a)** An element scales up (or settles down) as it crosses the viewport.

**(b) When to use.** A single hero image that grows to fill the frame as you scroll into it — the classic
"the room opens up" move for restaurants, hotels, spas, and interiors. Also excellent as a *settle*: the
image starts at 1.12 and relaxes to 1.0, which reads as the page coming to rest and is far more tasteful
than a grow. Use the settle for professional services if you use this at all.

**(c) When NOT to use.** Never zoom text — subpixel rescaling makes type look blurry and cheap. Never zoom
past ~1.15 on a photo unless it is deliberately over-sized in the source, or you will show interpolation
mush. Never on logos, headshots or product shots where the client cares about exact framing. Avoid entirely
on pages with more than one large image per viewport — competing zooms feel seasick.

**(d) Code.**

```html
<figure class="zoom">
  <img class="zoom__img" src="/img/dining-room.avif" alt="The main dining room at dusk" width="1600" height="1000" loading="lazy" decoding="async">
</figure>
```

```css
.zoom {
  --zoom-from: 1.14;
  --zoom-to: 1;
  overflow: clip;               /* crop the overscale */
  border-radius: var(--radius, 4px);
  margin: 0;
}
/* TIER 1: a perfectly good static figure. */
.zoom__img { display: block; width: 100%; height: auto; transform-origin: 50% 55%; }

/* TIER 2: scrub the scale to scroll. transform only -> compositor only. */
@supports (animation-timeline: view()) {
  .zoom__img {
    animation: zoom-settle linear both;
    animation-timeline: view();
    /* Finish while the image is still comfortably on screen, so the user SEES it land. */
    animation-range: entry 10% cover 55%;
  }
}
@keyframes zoom-settle {
  from { transform: scale(var(--zoom-from)); }
  to   { transform: scale(var(--zoom-to)); }
}

/* Variant: grow on exit (use sparingly, and never together with the settle). */
.zoom--exit .zoom__img { --zoom-from: 1; --zoom-to: 1.1; }
@supports (animation-timeline: view()) {
  .zoom--exit .zoom__img { animation-range: cover 45% exit 90%; }
}
```

**(e) Mobile fallback.** Halve the travel — a 14% scale on a 390px-wide viewport is a much larger absolute
movement relative to the frame and reads as wobble. Also: an overscaled image on mobile crops the subject,
so pair with `object-position`.

```css
@media (max-width: 640px) { .zoom { --zoom-from: 1.06; } }
```

Tier-1 browsers (pre-26 Safari, Firefox) simply get the image at `scale(1)`. Nothing is missing — this is the ideal case
for skipping the Tier-3 IO fallback entirely.

**(f) Reduced motion.**

```css
@media (prefers-reduced-motion: reduce) {
  .zoom__img { animation: none !important; transform: none !important; }
}
```
Global §0.4 already covers it; this is the explicit belt-and-braces version for a shared component.

**(g) Native CSS enough?** **Yes, entirely.** No JS, no observer, no library. If someone reaches for GSAP
ScrollTrigger for this, they are shipping 40 KB to do what six lines of CSS do on the compositor.

---

## 3. Image sequence / frame-by-frame canvas scrubber

**(a)** A pre-rendered image sequence scrubbed frame-by-frame by scroll position — the Apple product page pattern.

**(b) When to use.** When the *object itself* is the pitch and rotating/opening/assembling it is the story:
a machined component, a piece of furniture unfolding, a watch, a car, a modular kitchen, a stone worktop
under changing light. Also strong for a joiner or fabricator showing a build sequence, or a construction firm
showing a site across a year — the "frames" don't have to be a 3D render, they can be 60 site photos from a
fixed tripod. It is the single most expensive-looking effect in this file and the only one worth its cost.

**(c) When NOT to use.** If you don't have (or can't generate) a real sequence, do not fake it — a 12-frame
sequence stutters and looks cheaper than a still. Do not use on any site whose audience is bandwidth-
constrained: 90 frames at 30 KB is 2.7 MB, which is indefensible for a local trades business. Do not use
above the fold (it delays LCP). Do not use two on one page. If the client's imagery is phone snapshots from
different angles, this effect is not available to you — use §9 or §10 instead.

**(d) Code.**

First, the **native-first alternative you should try before writing any JS**: for sequences up to ~60 frames,
a single sprite strip translated with `steps()` needs zero JavaScript.

```css
/* Sprite strip: one image, N frames stacked vertically, each frame 100% of the box. */
.seq-sprite { position: relative; overflow: clip; aspect-ratio: 16 / 10; }
.seq-sprite__strip {
  --frames: 48;
  display: block;
  width: 100%;
  height: calc(100% * var(--frames));
  background: url('/img/seq-strip.avif') 0 0 / 100% 100% no-repeat;
}
@supports (animation-timeline: scroll()) {
  .seq-sprite__strip {
    animation: seq-step steps(var(--frames)) both;   /* steps() = true frame snapping */
    animation-timeline: --stage;                     /* the §0.6 stage this lives inside */
    animation-range: contain 0% contain 100%;
  }
}
@keyframes seq-step {
  from { transform: translateY(0); }
  to   { transform: translateY(calc(-100% + 100% / var(--frames))); }
}
@media (prefers-reduced-motion: reduce) {
  .seq-sprite__strip { animation: none !important;
    transform: translateY(calc(-100% / var(--frames) * 24)) !important; }  /* park on frame 24 */
}
```
Limits of the sprite approach: one image file, so a 48-frame strip at 1600px wide is ~7000px tall — beyond
Safari's texture limits past ~16384px, and it decodes as one huge bitmap. **Over ~60 frames, or when you need
smoothing/lerp between frames, use the canvas scrubber below.**

The canvas scrubber (JS required):

> **If React is already on the page, do not hand-roll this.** `assets/ScrollScrubber.jsx` is
> the same pattern with the poster ladder, the sliding decoded-frame window, the device
> tiers, the reduced-motion branch and the LCP-safe poster already solved — see
> `references/scrubber-component.md`. The vanilla class below is for pages with no React.

```html
<section class="stage seq" style="--stage-h: 400vh" aria-label="Product assembly sequence">
  <div class="stage__pin">
    <div class="seq__fit">
      <canvas class="seq__canvas" role="img"
              aria-label="The frame is assembled from six machined parts and finished in oil"></canvas>
    </div>
    <noscript><img src="/img/seq/0024.avif" alt="The assembled frame" width="1600" height="1000"></noscript>
  </div>
</section>
```

```css
.seq__fit { width: min(92vw, 1200px); aspect-ratio: 16 / 10; }  /* cover-fit container */
.seq__canvas { display: block; width: 100%; height: 100%; }
```

```js
/* seq.js — lerped canvas image-sequence scrubber. No dependencies. */
import { clamp } from './motion.js';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)');

export class ScrollSequence {
  /**
   * @param {HTMLElement} stage  tall .stage element (defines scroll length)
   * @param {HTMLCanvasElement} canvas
   * @param {{count:number, src:(i:number)=>string, ease?:number, still?:number}} opts
   */
  constructor(stage, canvas, { count, src, ease = 0.14, still = null }) {
    this.stage = stage;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.count = count;
    this.src = src;
    this.ease = ease;
    this.frames = new Array(count);
    this.cur = 0; this.target = 0; this.drawn = -1;
    this.raf = 0; this.visible = false;
    this.dpr = Math.min(devicePixelRatio || 1, 2);   // cap: 3x on a phone triples fill cost for nothing

    // Mobile / save-data: drop to every 2nd frame. Halves bytes, still reads as smooth after lerp.
    const saveData = navigator.connection?.saveData === true;
    this.step = (innerWidth < 700 || saveData) ? 2 : 1;

    this.stillIndex = still ?? Math.floor(count / 2);
    this.tick = this.tick.bind(this);

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);

    if (REDUCED.matches) { this.staticMode(); return; }   // never preload 90 images for a user who wants stillness
    this.io = new IntersectionObserver(
      ([e]) => { this.visible = e.isIntersecting; if (this.visible) this.kick(); },
      { rootMargin: '25% 0px' }                            // start the loop just before it matters
    );
    this.io.observe(stage);
    this.preload();
    addEventListener('scroll', () => this.kick(), { passive: true });
  }

  /* Reduced motion: load exactly one frame and leave it there. */
  async staticMode() {
    const img = await this.load(this.stillIndex);
    this.resize();
    if (img) this.paint(img);
  }

  load(i) {
    if (this.frames[i]) return Promise.resolve(this.frames[i]);
    return new Promise(res => {
      const img = new Image();
      img.decoding = 'async';
      img.src = this.src(i);
      img.decode()                                  // decode off the main thread before first paint
        .then(() => { this.frames[i] = img; res(img); })
        .catch(() => res(null));                    // a missing frame must never break the scrubber
    });
  }

  async preload() {
    // First frame immediately so the canvas is never blank…
    const first = await this.load(0);
    this.resize();
    if (first) this.paint(first);
    // …then the rest sequentially, so we never saturate the connection and stall other assets.
    for (let i = this.step; i < this.count; i += this.step) {
      await this.load(i);
      if (this.drawn === -1) this.kick();
    }
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const w = Math.round(r.width * this.dpr), h = Math.round(r.height * this.dpr);
    if (this.canvas.width === w && this.canvas.height === h) return;
    this.canvas.width = w; this.canvas.height = h;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);   // draw in CSS px
    this.drawn = -1;                                          // force a repaint at the new size
    this.paintIndex(this.nearest(this.cur));
  }

  /** progress 0..1 across the stage's pinned range */
  progress() {
    const r = this.stage.getBoundingClientRect();
    const total = r.height - innerHeight;
    return total > 0 ? clamp(-r.top / total) : 0;
  }

  kick() { if (!this.raf) this.raf = requestAnimationFrame(this.tick); }

  tick() {
    this.raf = 0;
    this.target = this.progress();
    // Exponential smoothing: the scrubber lags the finger slightly, which is what makes it feel heavy
    // and expensive rather than twitchy. ease 0.10–0.18 is the tasteful band.
    this.cur += (this.target - this.cur) * this.ease;
    if (Math.abs(this.target - this.cur) < 0.0006) this.cur = this.target;

    this.paintIndex(this.nearest(this.cur));

    // Keep looping only while catching up AND on screen. Otherwise stop dead — zero idle cost.
    if (this.cur !== this.target && this.visible) this.kick();
  }

  nearest(p) {
    const raw = Math.round(p * (this.count - 1));
    const snapped = Math.round(raw / this.step) * this.step;      // honour the mobile frame skip
    return clamp(snapped, 0, this.count - 1);
  }

  paintIndex(i) {
    if (i === this.drawn) return;
    let img = this.frames[i];
    if (!img) {                                   // not decoded yet: hold the closest frame we do have
      for (let d = 1; d < this.count; d++) {
        img = this.frames[i - d] || this.frames[i + d];
        if (img) break;
      }
      if (!img) return;
    } else {
      this.drawn = i;
    }
    this.paint(img);
  }

  /** cover-fit: fill the box, crop the overflow, never distort */
  paint(img) {
    const cw = this.canvas.width / this.dpr, ch = this.canvas.height / this.dpr;
    const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
    this.ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
  }

  destroy() { this.ro.disconnect(); this.io?.disconnect(); cancelAnimationFrame(this.raf); }
}

/* Wire-up */
new ScrollSequence(
  document.querySelector('.seq'),
  document.querySelector('.seq__canvas'),
  { count: 90, src: i => `/img/seq/${String(i).padStart(4, '0')}.avif`, ease: 0.14 }
);
```

Asset rules: **AVIF first, WebP fallback**, 1600px wide max, quality ~55 (sequences hide artefacts because no
frame is on screen long). Budget: **≤ 1.5 MB total** for the whole sequence. If you can't hit that, reduce
frame count before you reduce quality — 60 smooth frames beat 120 ugly ones.

**(e) Mobile fallback.** Built in above: `this.step = 2` halves the frames fetched under 700px or on Save-Data,
and DPR is capped at 2. For very constrained cases, skip the canvas altogether:

```js
if (innerWidth < 480 || navigator.connection?.effectiveType === '2g') {
  stage.style.setProperty('--stage-h', '100svh');     // collapse the scroll runway
  canvas.replaceWith(Object.assign(new Image(), {
    src: '/img/seq/0045.avif', alt: 'The assembled frame', className: 'seq__still'
  }));
}
```

**(f) Reduced motion.** `staticMode()` runs instead of the scrubber: one frame loaded, one frame drawn, no rAF
loop, no scroll listener, no preloading. This is the correct treatment — a reduced-motion user should not pay
2 MB for motion they've disabled. Additionally collapse the runway so they don't scroll through 400vh of nothing:

```css
@media (prefers-reduced-motion: reduce) { .seq { height: 100svh !important; } }
```

**(g) Native CSS enough?** **No — JS is required, and this is the one place in this file where that's true**
for a genuine reason: CSS has no way to swap the *source* of an image on a timeline, and no way to decode and
retain 90 bitmaps. The sprite-strip variant above *is* pure CSS and should be your first choice under 60 frames.
Beyond that, canvas + `rAF` + `ResizeObserver` is the native answer. **Still no library** — GSAP ScrollTrigger
contributes nothing here; the 60 lines of scrubber logic above are the whole job.

---

## 4. Sticky centred section with animation inside it

**(a)** A section pins to the centre of the viewport while its contents animate through a sequence, then releases.

**(b) When to use.** The workhorse of premium sites and the highest-value effect per unit of effort. Use it
to walk through a process: "1. Survey → 2. Design → 3. Install → 4. Aftercare" for a kitchen fitter;
"Consultation → Treatment → Follow-up" for a clinic; three product claims for a manufacturer. It converts a
boring list into a paced narrative and holds attention for 3–4 viewports of scrolling without a single new page.

**(c) When NOT to use.** Never for content the user might want to skim or search (pricing tables, FAQ, service
lists) — pinning removes their ability to scan. Never pin for more than ~4 viewport-heights; past that it
feels like the scrollbar is broken. Never nest two stages. Never pin on very short viewports (landscape phones)
— check `100svh` fits the content first.

**(d) Code.** Uses the `.stage` primitive from §0.6.

```html
<section class="stage steps" style="--stage-h: 360vh" aria-label="How we work">
  <div class="stage__pin">
    <h2 class="steps__title">How we work</h2>
    <ol class="steps__list">
      <li class="steps__item" style="--i:0"><span class="steps__n">01</span> We survey the roof and photograph every elevation.</li>
      <li class="steps__item" style="--i:1"><span class="steps__n">02</span> You get a fixed written quote within 48 hours.</li>
      <li class="steps__item" style="--i:2"><span class="steps__n">03</span> We strip, felt, batten and re-tile — usually in four days.</li>
      <li class="steps__item" style="--i:3"><span class="steps__n">04</span> Ten-year workmanship guarantee, in writing.</li>
    </ol>
  </div>
</section>
```

```css
.steps { --n: 4; }
/* Scope pin tweaks to THIS effect. A bare `.stage__pin { gap: 2rem }` leaks onto every other
   stage on the page (§3, §6, §7, §9) and quietly shifts their pinned layouts. */
.steps .stage__pin { gap: 2rem; }
.steps__list {
  display: grid;
  list-style: none; margin: 0; padding: 0;
  max-width: 46ch;
}
/* TIER 1: all four steps are simply a readable numbered list. Complete, accessible, done. */
.steps__item { padding: 1rem 0; border-top: 1px solid var(--rule, #0002); }
.steps__n { font-variant-numeric: tabular-nums; opacity: .5; margin-right: 1ch; }

/* TIER 2: stack them and cross-fade through the pinned range. */
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .steps__list { grid-template-areas: "s"; }      /* all items share one cell -> no absolute positioning */
    .steps__item {
      grid-area: s;
      border-top: 0;
      opacity: 0;
      animation: step-through linear both;
      animation-timeline: --stage;                  /* declared by .stage, inherited by descendants */
      /* Ranges must OVERLAP, or the cross-fade is not a cross-fade.
         With naive non-overlapping 1/n slices, at every boundary the outgoing item sits at
         100% of its range (opacity 0) and the incoming item at 0% of its range (also opacity 0)
         — measured total opacity across all four items at `contain 75%` was exactly 0.00,
         i.e. a pinned viewport with nothing in it. Each item instead spans 1.5 slices, and the
         sequence is scaled by (n + 0.5) so item 0 still starts at 0% and item n-1 ends at 100%.
         Overlap is then exactly 0.5 slices — the fade-out of N and the fade-in of N+1 coincide. */
      animation-range:
        contain calc(var(--i) / (var(--n) + 0.5) * 100%)
        contain calc((var(--i) + 1.5) / (var(--n) + 0.5) * 100%);
    }
    /* Progress rule that fills as you scroll — pure transform, no width animation. */
    .steps__list::after {
      content: ""; grid-area: s; align-self: end;
      height: 2px; background: var(--accent, #b4884a);
      transform: scaleX(0); transform-origin: left;
      animation: step-bar linear both;
      animation-timeline: --stage;
      animation-range: contain 0% contain 100%;
    }
  }
}
/* 33.34 / 66.66 are not arbitrary: with a 1.5-slice range, one third of it is exactly the
   0.5-slice overlap, so the fade-out of item N lines up frame-for-frame with the fade-in of
   item N+1. Measured total opacity is 1.00 at every seam. Changing the range multiplier
   without changing these two stops reintroduces the blank frame. */
@keyframes step-through {
  0%     { opacity: 0; transform: translateY(1.25rem); }
  33.34% { opacity: 1; transform: translateY(0); }
  66.66% { opacity: 1; transform: translateY(0); }
  100%   { opacity: 0; transform: translateY(-1.25rem); }
}
@keyframes step-bar { to { transform: scaleX(1); } }
```

**(e) Mobile fallback.** `position: sticky` is universal, so the pin itself works everywhere. But **shorten
the runway on phones** — 360vh of pinned scrolling is a long thumb journey on a small screen — and check the
content fits `100svh`.

```css
@media (max-width: 640px) { .steps { --stage-h: 260vh; } }
@media (max-height: 520px) { .steps { --stage-h: auto; }      /* landscape phone: unpin entirely */
  .steps .stage__pin { position: static; height: auto; }
  .steps__list { grid-template-areas: none; }
  .steps__item { grid-area: auto; opacity: 1; animation: none; border-top: 1px solid var(--rule,#0002); } }
```

**(f) Reduced motion.** The `@media (prefers-reduced-motion: no-preference)` wrapper means the stacking
never happens — reduced-motion users get the Tier-1 numbered list, still inside a pinned section but with
no cross-fading. Collapse the runway too:

```css
@media (prefers-reduced-motion: reduce) {
  .steps { height: auto !important; }
  .steps .stage__pin { position: static; height: auto; padding-block: 4rem; }
}
```

**(g) Native CSS enough?** **Yes, completely.** `position: sticky` + `animation-timeline` + `animation-range`
covers what people install GSAP ScrollTrigger's `pin: true` for. Note the two things ScrollTrigger does that
CSS doesn't: it creates the spacer element for you (here you set `--stage-h` by hand) and it can pin an element
of unknown height. Neither justifies 40 KB.

---

## 5. Scroll-driven rotation

**(a)** An element rotates continuously in proportion to scroll position.

**(b) When to use.** Sparingly and structurally. Three legitimate uses: (1) a **circular badge or seal**
("Est. 1978 · Family run · Est. 1978") rotating slowly behind or beside a heading — instantly premium for
a bakery, brewery, barber, distillery; (2) a **product turntable** — rotate a symmetrical object 90–360°
as its section passes, for a manufacturer or furniture maker; (3) a **reading-progress indicator** drawn
as a rotating arc. Also: a *tiny* rotation (2–4°) on a card as it enters gives a hand-placed, editorial feel.

**(c) When NOT to use.** Never rotate text you expect people to read. Never rotate a logo — clients hate it
and it reads as amateur. Never rotate a photo of a person or a building past a few degrees. Never a full
360° on a rectangular object; it exposes empty corners and looks like a loading spinner.

**(d) Code.**

```html
<div class="seal" aria-hidden="true">
  <svg viewBox="0 0 200 200" class="seal__svg">
    <defs><path id="ring" d="M100,100 m-72,0 a72,72 0 1,1 144,0 a72,72 0 1,1 -144,0"/></defs>
    <text class="seal__text"><textPath href="#ring" startOffset="0">
      Est. 1978 · Family run · Fully insured · Est. 1978 · Family run · Fully insured ·
    </textPath></text>
  </svg>
</div>
```

```css
.seal { --seal-turn: 90deg; width: clamp(88px, 12vw, 160px); aspect-ratio: 1; }
.seal__svg { display: block; width: 100%; height: 100%; }
.seal__text { font-size: 13px; letter-spacing: .14em; text-transform: uppercase; fill: currentColor; }

/* TIER 1: a static seal. Perfectly good. */
/* TIER 2: rotate across the whole document scroll (scroll(root)) for a slow ambient turn… */
@supports (animation-timeline: scroll()) {
  .seal__svg {
    animation: spin linear both;
    animation-timeline: scroll(root block);
  }
  /* …or across its own section only, for a controlled quarter-turn. */
  .seal--local .seal__svg {
    animation-timeline: view();
    animation-range: cover 0% cover 100%;
  }
}
@keyframes spin { to { rotate: var(--seal-turn); } }   /* `rotate` property: independent of transform */

/* Editorial micro-tilt on entering cards — the restrained version of this effect. */
@supports (animation-timeline: view()) {
  .tilt-in { animation: tilt linear both; animation-timeline: view(); animation-range: entry 0% entry 80%; }
}
@keyframes tilt {
  from { rotate: -3deg; translate: 0 1.5rem; opacity: 0; }
  to   { rotate: 0deg;  translate: 0 0;      opacity: 1; }
}
```

Note the use of the independent `rotate:` / `translate:` / `scale:` properties rather than `transform:` —
they compose without you having to restate the whole transform list, and they are GPU-composited identically.

**Note on `scroll(root)`:** an element animated on the root timeline animates for the *entire page*.
That's what you want for an ambient seal, but it means the element is doing compositor work at every scroll
position. One such element per page, maximum. Note also that `spin` ends on a *rotated* state, so it is one
of the keyframes that must keep its explicit reduced-motion override in (f) — see §0.4.

**(e) Mobile fallback.** Reduce the turn — a full rotation on a small screen is distracting next to text.
Tier-1 browsers get a static seal, which loses nothing.

```css
@media (max-width: 640px) { .seal { --seal-turn: 45deg; } }
```

**(f) Reduced motion.** Rotation is one of the highest-nausea effects for vestibular disorders. Kill it flat:

```css
@media (prefers-reduced-motion: reduce) {
  .seal__svg, .tilt-in { animation: none !important; rotate: 0deg !important; translate: none !important; }
}
```

**(g) Native CSS enough?** **Yes.** Pure CSS, one keyframe, on the compositor.

---

## 6. Spiral 3D

**(a)** Cards arranged on a helix in 3D space; the helix turns and advances as you scroll, bringing each card to the front.

**(b) When to use.** Rarely, and only where visual bravado is the brand: a photographer's portfolio, a design
studio, an events company, a nightclub, a fashion label, a high-end car dealer. It suits a gallery of 6–10
images where none needs to be read, only felt. It is the most memorable effect here and also the most
dangerous.

**(c) When NOT to use.** Anywhere trust matters more than flair — never for a solicitor, accountant, clinic,
builder, or anyone whose customer is comparing three quotes. Never with text-bearing cards (rotated type in
perspective is unreadable and fails WCAG). Never with more than ~10 items (GPU layer count explodes). Never
on a page that also has §7 or §9. If the client's photography is weak, this effect magnifies the weakness.

**(d) Code.**

```html
<section class="stage spiral" style="--stage-h: 420vh; --n: 8" aria-label="Selected work">
  <div class="stage__pin">
    <ul class="spiral__ring">
      <li class="spiral__card" style="--i:0"><img src="/img/w1.avif" alt="Riverside house, Kent" width="800" height="1000"></li>
      <li class="spiral__card" style="--i:1"><img src="/img/w2.avif" alt="Barn conversion, Suffolk" width="800" height="1000"></li>
      <li class="spiral__card" style="--i:2"><img src="/img/w3.avif" alt="Studio extension, Bristol" width="800" height="1000"></li>
      <li class="spiral__card" style="--i:3"><img src="/img/w4.avif" alt="Loft, Manchester" width="800" height="1000"></li>
      <li class="spiral__card" style="--i:4"><img src="/img/w5.avif" alt="Coastal retreat, Devon" width="800" height="1000"></li>
      <li class="spiral__card" style="--i:5"><img src="/img/w6.avif" alt="Mews house, London" width="800" height="1000"></li>
      <li class="spiral__card" style="--i:6"><img src="/img/w7.avif" alt="Farmhouse, Yorkshire" width="800" height="1000"></li>
      <li class="spiral__card" style="--i:7"><img src="/img/w8.avif" alt="Garden room, Surrey" width="800" height="1000"></li>
    </ul>
  </div>
</section>
```

```css
.spiral {
  --n: 8;
  --radius: 34vmin;      /* helix radius */
  --pitch: 7vmin;        /* vertical rise per card — this is what makes it a spiral, not a carousel */
  --step: 45deg;         /* angular gap; 360deg / --n for one full turn */
  --turn: 360deg;        /* how far the whole helix rotates across the stage */
}

/* TIER 1: a plain responsive grid of the work. Genuinely good on its own. */
.spiral__ring {
  list-style: none; margin: 0; padding: 0;
  display: grid; gap: 1.5rem;
  grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr));
  width: min(92vw, 1100px);
}
.spiral__card img { display: block; width: 100%; height: auto; border-radius: 3px; }

/* TIER 2: only in browsers that can drive it, only on pointers that can afford it,
   and only when the viewport is big enough for perspective to read. */
@supports (animation-timeline: --stage) {
  @media (prefers-reduced-motion: no-preference) and (min-width: 900px) {
    .spiral__ring {
      display: grid;
      grid-template-areas: "hub";                /* every card shares one grid cell — this is the
                                                    legitimate use of stacking: they occupy the same
                                                    3D origin. No absolute positioning needed. */
      place-items: center;
      width: 100%; height: 100%;
      perspective: 1400px;
      perspective-origin: 50% 45%;
      transform-style: preserve-3d;
      animation: spiral-turn linear both;
      animation-timeline: --stage;
      animation-range: contain 0% contain 100%;
    }
    .spiral__card {
      grid-area: hub;
      width: clamp(180px, 17vw, 260px);
      transform-style: preserve-3d;
      /* Static placement on the helix. Composed once; the parent does all the moving. */
      transform:
        rotateY(calc(var(--i) * var(--step)))
        translateZ(var(--radius))
        translateY(calc((var(--i) - (var(--n) - 1) / 2) * var(--pitch)));
      backface-visibility: hidden;               /* hide the reversed far side */
    }
    .spiral__card img { box-shadow: 0 24px 60px -24px #0009; }
  }
}
@keyframes spiral-turn {
  from { transform: rotateY(0deg)        translateY(calc(var(--pitch) *  1.6)); }
  to   { transform: rotateY(var(--turn)) translateY(calc(var(--pitch) * -1.6)); }
}
```

**Counter-rotation ("billboarding") — optional, and mutually exclusive with the code above.** CSS cannot
express "always face the camera" declaratively; the workaround is an equal and opposite rotation on the
card's inner element, on the same timeline:

```css
@supports (animation-timeline: --stage) {
  @media (prefers-reduced-motion: no-preference) and (min-width: 900px) {
    .spiral__card { backface-visibility: visible; }   /* REQUIRED — see warning below */
    .spiral__card img {
      animation: spiral-face linear both;
      animation-timeline: --stage;
      animation-range: contain 0% contain 100%;
    }
  }
}
@keyframes spiral-face {   /* exact inverse of spiral-turn's rotateY */
  from { transform: rotateY(0deg); }
  to   { transform: rotateY(calc(-1 * var(--turn))); }
}
```

> **Warning — pick one, never both.** `backface-visibility: hidden` is evaluated against the *card's own*
> accumulated transform. Once the ring rotation carries a card past 90°, the card is back-facing and
> disappears — taking its counter-rotated child with it, so billboarded cards blink out at the rear of the
> helix. Either keep `backface-visibility: hidden` and let cards face outward (the default above — this is
> what looks right on a helix), or billboard them and set `backface-visibility: visible`, accepting that you
> now see the far side of the ring through the near side.

**(e) Mobile fallback.** The `min-width: 900px` gate means **phones and tablets never enter 3D at all** —
they get the Tier-1 grid. This is deliberate, not lazy: a 3D helix at 390px wide has cards ~60px across
after perspective, GPU layer counts hurt mid-range Android, and it destroys the images the client paid for.
The grid on mobile is the better design.

**(f) Reduced motion.** Gated out by `prefers-reduced-motion: no-preference`, so it degrades to the grid.
Also collapse the runway:

```css
@media (prefers-reduced-motion: reduce) {
  .spiral { height: auto !important; }
  .spiral .stage__pin { position: static; height: auto; padding-block: 4rem; }
}
```

**(g) Native CSS enough?** **Yes** — placement is `calc()` on `--i`, motion is one keyframe on the parent.
JS only if the card count is dynamic (then set `--i` and `--n` in a loop). This is the effect people most
often import Three.js for; a real 3D engine is warranted only if you need lighting, depth-of-field or
per-object physics. For a card helix, CSS 3D is the correct tool and runs on the compositor.

---

## 7. Horizontal scrolling section driven by vertical scroll

**(a)** A pinned section whose panels translate sideways as the user scrolls down.

**(b) When to use.** For genuinely sequential, image-led content of 4–7 panels: an architect's project
gallery, a restaurant's menu courses, a manufacturer's timeline (1978 → today), a wedding venue's spaces,
a portfolio of case studies. It works because it changes the *axis* of attention, which resets a scrolling
reader's fatigue.

**(c) When NOT to use.** Never for anything users need to compare or find (services, prices, team, FAQ).
Never with more than ~7 panels — the scroll cost becomes punishing. Never as the first section (a visitor
who lands and immediately loses vertical control will bounce). Never if panels contain long text or forms.
And be honest: this effect has an accessibility cost — keyboard users tabbing into panel 5 will cause a jump.
Always keep panels reachable and the section skippable.

**(d) Code.**

```html
<section class="stage hscroll" aria-label="Recent projects">
  <div class="stage__pin">
    <ul class="hscroll__track">
      <li class="hscroll__panel"><h3>Riverside House</h3><p>Kent · 2024</p></li>
      <li class="hscroll__panel"><h3>Barn Conversion</h3><p>Suffolk · 2024</p></li>
      <li class="hscroll__panel"><h3>Studio Extension</h3><p>Bristol · 2023</p></li>
      <li class="hscroll__panel"><h3>Coastal Retreat</h3><p>Devon · 2023</p></li>
      <li class="hscroll__panel"><h3>Mews House</h3><p>London · 2022</p></li>
    </ul>
  </div>
</section>
```

```css
/* REQUIRED. The travel arithmetic below is only correct in border-box.
   Under the CSS default (content-box), `flex: 0 0 74vw` + `padding: 1.5rem` measures 995px,
   not 947px — five of those overshoot --track by 240px, --travel undershoots by the same
   amount, and the last panel is left hanging off the right edge at the end of the pin.
   Measured: track 5206px vs the formula's 4966px; panel 5 finished at x=1469 in a 1280 viewport. */
.hscroll, .hscroll * { box-sizing: border-box; }

.hscroll {
  --n: 5;                                   /* panel count */
  /* Panel width. Keep the pin under ~4 viewport-heights (see §7c and §4c) — at 74vw with five
     panels the stage computes to 4406px on a 1280x720 screen, i.e. 6.1 viewports of pinned
     scrolling, which is past the point where the scrollbar feels broken. 44vw is the honest
     desktop default; give phones the wider panel, since they get the native scroller anyway. */
  --panel: 44vw;
  --gap: 2rem;
  --edge: 4vw;                              /* leading inset */
  /* Track and travel are pure arithmetic — no JS measurement needed. */
  --track: calc(var(--n) * var(--panel) + (var(--n) - 1) * var(--gap));
  --travel: calc(var(--track) + 2 * var(--edge) - 100vw);
  /* 1:1 mapping: pinned duration equals the distance travelled. Feels perfectly weighted. */
  --stage-h: calc(100svh + var(--travel));
}
@media (max-width: 899px), (pointer: coarse) { .hscroll { --panel: 76vw; } }

/* ---- TIER 1 / MOBILE: a real, native, snapping horizontal scroller. ----
   This is not a degraded experience — on touch it is the BETTER one. */
.hscroll__track {
  list-style: none; margin: 0;
  padding-inline: var(--edge);
  display: flex; gap: var(--gap);
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x mandatory;
  scrollbar-width: thin;
}
.hscroll__panel {
  flex: 0 0 var(--panel);
  scroll-snap-align: center;
  aspect-ratio: 4 / 5;
  display: grid; align-content: end; gap: .25rem;
  padding: 1.5rem;
  border-radius: 3px;
  background: var(--panel-bg, #1a1a1a);
  color: #fff;
}
.hscroll__panel h3 { margin: 0; font-size: clamp(1.1rem, 2.4vw, 1.6rem); }
.hscroll__panel p  { margin: 0; opacity: .7; font-size: .875rem; }

/* ---- TIER 2: scroll-driven horizontal translate, desktop + supporting browsers only ---- */
@supports (animation-timeline: --stage) {
  @media (prefers-reduced-motion: no-preference) and (min-width: 900px) and (pointer: fine) {
    /* Pin the track to the START edge. `place-items: center` on .stage__pin would centre a
       max-content track, so panel 1 would not begin at the left edge and the travel maths
       (which assumes a left-aligned origin) would be off by half the overflow. */
    .hscroll .stage__pin { place-items: center start; }
    .hscroll__track {
      overflow: visible;                    /* hand control to the scroll timeline */
      scroll-snap-type: none;
      will-change: transform;               /* justified here: one element, long-running, large */
      animation: hslide linear both;
      animation-timeline: --stage;
      animation-range: contain 0% contain 100%;
    }
  }
}
@keyframes hslide {
  from { transform: translate3d(0, 0, 0); }
  to   { transform: translate3d(calc(-1 * var(--travel)), 0, 0); }
}
```

Accessibility guard — keep keyboard focus from fighting the pin:

```js
/* If a panel receives focus while pinned, scroll the page to the position that shows it. */
const stage = document.querySelector('.hscroll');
const pin = stage?.querySelector('.stage__pin');
stage?.addEventListener('focusin', (e) => {
  const panel = e.target.closest('.hscroll__panel');
  if (!panel) return;
  // Only intervene when the section is ACTUALLY pinned. Do not test the stage's height for
  // 'auto': getComputedStyle always resolves height to a used pixel value, so that check can
  // never be true — it reads like a guard but is dead code, and the handler then fires on
  // mobile too (where the section is unpinned) and yanks the page for no reason.
  if (getComputedStyle(pin).position !== 'sticky') return;
  const kids = panel.parentElement.children;
  const total = stage.offsetHeight - innerHeight;
  if (total <= 0 || kids.length < 2) return;
  const idx = [...kids].indexOf(panel);
  const y = stage.offsetTop + (idx / (kids.length - 1)) * total;
  scrollTo({ top: y, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
});
```

**(e) Mobile fallback.** The Tier-1 layer *is* the mobile experience: native `overflow-x` with
`scroll-snap-type: x mandatory`. Touch users get momentum, snapping and full control — objectively better
than a hijacked pin. The `(pointer: fine)` query also keeps touch laptops and tablets on the native scroller.
Collapse the runway so mobile doesn't scroll through empty space:

```css
@media (max-width: 899px), (pointer: coarse) {
  .hscroll { height: auto; }
  .hscroll .stage__pin { position: static; height: auto; overflow: visible; }
}
```

**(f) Reduced motion.** Same as mobile — the native snapping scroller, unpinned. The user keeps their normal
vertical scroll and can pan the gallery deliberately. This is the ideal reduced-motion outcome: full content,
full control, zero imposed motion.

```css
@media (prefers-reduced-motion: reduce) {
  .hscroll { height: auto !important; }
  .hscroll .stage__pin { position: static; height: auto; }
  .hscroll__track { overflow-x: auto; scroll-snap-type: x mandatory; }
}
```

**(g) Native CSS enough?** **Yes.** Because panel widths are authored in `vw`, the travel distance is pure
`calc()` — no measurement, no `ResizeObserver`. This is precisely what GSAP ScrollTrigger horizontal demos do
with `pin` + `scrub`, in 15 lines of CSS instead of a library. JS appears only for the optional focus guard,
which GSAP wouldn't give you anyway.

---

## 8. Multi-layer parallax (restrained)

**(a)** Background layers move at different rates from the foreground, implying depth.

**(b) When to use.** One hero, once per site. Landscape/exterior backdrops suit it: a country hotel, a garden
designer, a wedding venue, a roofer photographed against a skyline, a vineyard. It is also the cheapest way
to give a *single* strong client photograph more presence than it deserves.

**(c) The tasteful limit — memorise this.**

| | Limit |
|---|---|
| Layers | **3 maximum** (far / mid / foreground). Most sites need 2. |
| Displacement | **≤ 12% of viewport height** for the far layer, ≤ 6% mid. Beyond that it reads as a bug. |
| Rate differential | Far layer moves at 0.85× page rate, mid at 0.94×. Never below 0.8×. |
| Text | **Never parallax text.** Text sits in the foreground at 1.0×, always. |
| Sections | One parallax section per page. |
| Mobile | Off, or one layer at half displacement. |

The failure mode is always the same: too many layers, too much travel, and text drifting away from the image
it labels. Restraint is what separates a £15k site from a template.

**(c cont.) When NOT to use.** Never behind body copy or a form. Never on a photo of a person (the face
drifting relative to the frame is unsettling). Never with `background-attachment: fixed` — it forces repaints
on scroll and is broken/janky on iOS. Never on a page that already uses §3, §6 or §7.

**(d) Code.**

```html
<section class="plx" aria-label="Our workshop">
  <div class="plx__layer plx__layer--far"  aria-hidden="true"></div>
  <div class="plx__layer plx__layer--mid"  aria-hidden="true"></div>
  <div class="plx__content">
    <h2>Made in the same workshop since 1978</h2>
    <p>Four benches, eleven hands, no subcontractors.</p>
  </div>
</section>
```

```css
.plx {
  position: relative;
  min-height: 78svh;
  display: grid;
  grid-template-areas: "plx";                /* layers share one cell — no absolute positioning */
  place-items: center;
  overflow: clip;                            /* contains the layer overshoot */
  isolation: isolate;
}
.plx__layer, .plx__content { grid-area: plx; }

.plx__layer {
  width: 100%;
  /* Oversize vertically so the translate never exposes an edge. 12% travel -> 124% height. */
  height: 124%;
  background-size: cover;
  background-position: center;
  z-index: 0;
}
.plx__layer--far { background-image: var(--plx-far); --plx-travel: 12%; }
.plx__layer--mid { background-image: var(--plx-mid); --plx-travel:  6%; opacity: .9; }

.plx__content {
  position: relative; z-index: 1;            /* foreground: rate 1.0, never animated */
  text-align: center; color: #fff;
  padding: 2rem; max-width: 40ch;
  text-shadow: 0 2px 20px #0008;
}

/* TIER 2: translate the layers against page scroll. transform only. */
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) and (min-width: 700px) {
    .plx__layer {
      animation: plx-drift linear both;
      animation-timeline: view();
      animation-range: cover 0% cover 100%;   /* full pass across the viewport */
    }
  }
}
@keyframes plx-drift {
  from { transform: translate3d(0, calc(var(--plx-travel) * -1), 0); }
  to   { transform: translate3d(0, var(--plx-travel), 0); }
}
```

**(e) Mobile fallback.** Gated off below 700px. On a phone the viewport is so tall relative to its width that
parallax mostly produces misregistration between the image and its caption, and mid-range Android pays real
GPU cost for it. If you want a hint of depth on mobile, keep **one** layer at half travel:

```css
@media (max-width: 699px) {
  .plx__layer--mid { display: none; }
  .plx__layer--far { --plx-travel: 5%; height: 112%; }
}
```

**(f) Reduced motion.** Parallax is the single worst effect for vestibular sensitivity — the differential
motion is exactly the trigger. Kill it entirely; the composed still image loses nothing.

```css
@media (prefers-reduced-motion: reduce) {
  .plx__layer { animation: none !important; transform: none !important; height: 100%; }
}
```

**(g) Native CSS enough?** **Yes.** This is the classic reason people install Lenis or Rellax; neither is
needed. Note specifically: **do not add Lenis "smooth scroll" to make parallax feel nicer.** It overrides the
OS scroll curve, breaks trackpad and screen-reader expectations, adds input latency, and on a business site
it is a net negative. Native scroll + a scroll timeline is already running off the main thread — smoother
than any JS smoothing can be.

---

## 9. 3D image split

**(a)** A single image is sliced into vertical panels that separate, tilt and drift apart in 3D as you scroll.

**(b) When to use.** As a *reveal* on one signature image: the finished kitchen, the restored façade, the
hero dish, the flagship product. Best used in reverse — panels start apart and **assemble** into the whole
image as it enters view, which reads as "we put this together" and is a perfect metaphor for builders,
fabricators, joiners, kitchen fitters and installers. Works with only one photograph, which makes it
invaluable when a small client has almost no usable imagery.

**(c) When NOT to use.** Never on a portrait of a person (slicing a face is grotesque). Never on a logo or
anything with fine text. Never with more than 6 panels — seams become visible and layer count rises. Never
where the image needs to be perceived accurately (before/after comparisons — use §10 instead).

**(d) Code.**

```html
<!-- --n lives on the SECTION, not on .split__fig. Putting it in an inline style on the figure
     makes the mobile media query below unable to override it (inline beats any stylesheet
     rule short of !important) — see (e). --img is fine inline; nothing overrides it. -->
<section class="stage split" style="--stage-h: 260vh; --n: 5">
  <div class="stage__pin">
    <figure class="split__fig" style="--img: url('/img/kitchen.avif')">
      <div class="split__panel" style="--i:0"></div>
      <div class="split__panel" style="--i:1"></div>
      <div class="split__panel" style="--i:2"></div>
      <div class="split__panel" style="--i:3"></div>
      <div class="split__panel" style="--i:4"></div>
      <!-- Real image for Tier 1, no-JS, print and assistive tech. -->
      <img class="split__fallback" src="/img/kitchen.avif" alt="Hand-built oak kitchen with brass fittings, Kent" width="1600" height="1000">
      <figcaption>Hand-built oak kitchen, Kent</figcaption>
    </figure>
  </div>
</section>
```

```css
.split__fig { margin: 0; width: min(92vw, 1100px); }
.split__fallback { display: block; width: 100%; height: auto; }
.split__panel { display: none; }             /* TIER 1: panels don't exist; the <img> is the design */
.split__fig figcaption { margin-top: .75rem; font-size: .875rem; opacity: .7; }

@supports (animation-timeline: --stage) {
  @media (prefers-reduced-motion: no-preference) {
    .split__fig {
      display: grid;
      grid-template-columns: repeat(var(--n), 1fr);   /* real grid: no absolute positioning */
      grid-template-rows: 1fr auto;                   /* row 1 FILLS; min-content would collapse
                                                         the panels to zero height (they have no
                                                         content — only a background). */
      aspect-ratio: 16 / 10;
      perspective: 1200px;
      perspective-origin: 50% 50%;
      gap: 0;
    }
    .split__fallback { display: none; }
    .split__panel {
      display: block;
      grid-row: 1;
      background-image: var(--img);
      /* Sprite maths: blow the background up to N panels wide, then step the position.
         Percentage background-position is relative to (image size − box size), so
         i/(n−1) × 100% lands each panel exactly on its own slice. */
      background-size: calc(var(--n) * 100%) 100%;
      background-position: calc(var(--i) / (var(--n) - 1) * 100%) center;
      transform-origin: 50% 50%;
      backface-visibility: hidden;
      animation: split-assemble linear both;
      animation-timeline: --stage;
      /* Slight per-panel offset so they don't land in unison — this is what sells it. */
      animation-range:
        contain calc(var(--i) * 6%)
        contain calc(72% + var(--i) * 6%);
    }
    .split__fig figcaption { grid-column: 1 / -1; grid-row: 2; }
  }
}
/* Panels start scattered in depth and converge to a seamless whole. */
@keyframes split-assemble {
  from {
    transform:
      translate3d(calc((var(--i) - (var(--n) - 1) / 2) * 14%), 0, -220px)
      rotateY(calc((var(--i) - (var(--n) - 1) / 2) * -9deg));
    opacity: 0;
  }
  60%  { opacity: 1; }
  to   { transform: translate3d(0, 0, 0) rotateY(0deg); opacity: 1; }
}
```

**Seam warning:** at rest the panels must be pixel-flush. Guarantee it with `gap: 0`, `1fr` columns, and
`background-size` in percentages (never `px`). If you still see hairlines on fractional-DPR displays, add
`outline: 1px solid transparent; margin-right: -0.5px` to the panels — but check on a real device first.

**(e) Mobile fallback.** Fewer panels; 3D depth costs more per pixel on mobile GPUs and narrow slices look
like a broken image.

```css
@media (max-width: 640px) {
  .split { --n: 3; }                                /* on the SECTION — see the HTML note above */
  .split__panel:nth-child(n+4) { display: none; }   /* hide the extra markup panels */
}
```
Set `--n: 3` and only three panels participate — the maths adapts because everything is expressed in
terms of `--n` and `--i`.

> **This is the fallback most likely to be silently dead in your build.** If `--n` is written as an
> inline `style="--n: 5"` on the figure (the natural place to put it), this media query loses on
> specificity and never applies. Measured at 375px with `--n` inline: the grid still laid out **five**
> 69px columns while only three panels were `display: block`, leaving 40% of the figure empty and the
> sprite maths showing only the left 60% of the photograph. It renders as a broken image, not as a
> degraded effect. Either declare `--n` on the section as above, or use `--n: 3 !important`, and
> **verify the computed value at 375px** rather than assuming.

**(f) Reduced motion.** Gated by `no-preference`, so the panels never activate and the plain `<img>` shows.
That is the whole point of putting the real image in Tier 1. Collapse the runway too:

```css
@media (prefers-reduced-motion: reduce) {
  .split { height: auto !important; }
  .split .stage__pin { position: static; height: auto; padding-block: 3rem; }
}
```

**(g) Native CSS enough?** **Yes.** Grid + `background-position` sprite maths + one keyframe. JS only if the
panel count must be generated dynamically. No canvas, no WebGL, no library.

---

## 10. Unmask / reveal via clip-path

**(a)** Content is uncovered by an animated clip shape rather than faded in.

**(b) When to use.** The most *expensive-feeling* entrance available, because it implies a physical wipe
rather than a digital fade. Perfect for: a hero image revealing on load or scroll; before/after work for a
roofer, decorator, restorer, cleaner, landscaper (a vertical wipe between two stacked images is genuinely
useful, not decorative); a diagonal wipe as a section transition for an architect; circular reveal on a
signature detail shot.

**(c) When NOT to use — and the GPU caveat.** `clip-path` animation is **paint-work, not pure compositing**.
Rect-ish `inset()` shapes are cheap and Chromium/WebKit handle them well, but polygons with many vertices,
or a clip-path on a large element with expensive contents, will show up in the paint budget. **Rule:**

> If the reveal is a straight-edged wipe, prefer the transform-mask technique (`overflow: clip` on a wrapper +
> `translate` on the child) — it is 100% compositor work. Use `clip-path` when the shape is genuinely not a
> rectangle: circle, diagonal, polygon.

Never animate `clip-path` on more than ~4 elements at once. Never use it on text you want crisply anti-aliased
mid-animation. Never with a shape whose vertex count changes between keyframes — it won't interpolate.

**(d) Code.**

Preferred, pure-compositor wipe (straight edges):

```html
<figure class="wipe">
  <span class="wipe__mask"><img src="/img/facade.avif" alt="Restored Georgian façade, Bath" width="1400" height="900"></span>
</figure>
```

```css
.wipe { margin: 0; }
.wipe__mask { display: block; overflow: clip; }        /* the mask */
.wipe__mask img { display: block; width: 100%; height: auto; }

@supports (animation-timeline: view()) {
  .wipe__mask   { animation: wipe-mask linear both; animation-timeline: view(); animation-range: entry 5% entry 85%; }
  .wipe__mask img { animation: wipe-inner linear both; animation-timeline: view(); animation-range: entry 5% entry 85%; }
}
/* Mask slides up; image slides down by the same amount -> the image appears to hold still
   while being uncovered. Two transforms, zero paint. */
@keyframes wipe-mask  { from { transform: translateY(100%); } to { transform: translateY(0); } }
@keyframes wipe-inner { from { transform: translateY(-100%); } to { transform: translateY(0); } }
```

`clip-path` version — for shapes a rectangle can't express:

> **The one thing you must get right here: the clipped element and the observed element cannot be the
> same element.** `IntersectionObserver` computes its rect after clipping, so an element carrying
> `clip-path: inset(0 0 100% 0)` reports `intersectionRatio: 0` wherever it sits — the observer never
> fires, `.is-in` is never added, and the tile is **invisible forever**. This was measured: three tiles
> at `top: 255px` in a 720px viewport, ratio `0` on all three, still clipped after a full-page scroll at
> both 1280px and 375px. So the markup needs two boxes: an outer one to observe, an inner one to clip.

```html
<!-- .unmask is the OBSERVED box and is never clipped. .unmask__inner carries the clip. -->
<div class="unmask">
  <div class="unmask__inner">
    <img src="/img/facade.avif" alt="Restored Georgian façade, Bath" width="1400" height="900">
  </div>
</div>
<div class="unmask unmask--diagonal"><div class="unmask__inner">…</div></div>
<div class="unmask unmask--iris"><div class="unmask__inner">…</div></div>
```

```css
.unmask { --unmask-ease: cubic-bezier(.65,0,.35,1); display: block; }
.unmask__inner { display: block; }
.unmask__inner img { display: block; width: 100%; height: auto; }
/* TIER 1 is the absence of a rule: no clip until JS arms `data-ready`. */

/* TIER 3: one-shot on enter, universal. */
.unmask[data-ready] .unmask__inner {
  clip-path: inset(0 0 100% 0);
  transition: clip-path 900ms var(--unmask-ease);
}
.unmask[data-ready].is-in .unmask__inner { clip-path: inset(0 0 0 0); }

/* Diagonal wipe — a polygon, so clip-path is genuinely required. */
.unmask--diagonal[data-ready] .unmask__inner       { clip-path: polygon(0 0, 0 0, 0 100%, 0 100%); }
.unmask--diagonal[data-ready].is-in .unmask__inner { clip-path: polygon(0 0, 130% 0, 100% 100%, 0 100%); }

/* Circular reveal from a focal point. */
.unmask--iris[data-ready] .unmask__inner       { clip-path: circle(0% at 50% 55%); }
.unmask--iris[data-ready].is-in .unmask__inner { clip-path: circle(85% at 50% 55%); }

/* TIER 2: scrub the clip to scroll instead. A scroll timeline needs no observer, so here the
   clip may sit on the element itself — the deadlock above is an IntersectionObserver problem only. */
@supports (animation-timeline: view()) {
  .unmask[data-scrub] .unmask__inner {
    clip-path: inset(0 0 100% 0);
    animation: unmask-up linear both;
    animation-timeline: view();
    animation-range: entry 10% cover 30%;
  }
}
@keyframes unmask-up { to { clip-path: inset(0 0 0% 0); } }
```

Wire-up — **required; without it nothing in the block above ever applies**, because `revealOnce()`
only adds `.is-in` and never sets `data-ready`:

```js
import { revealOnce } from './motion.js';

// Arm the hidden state only when we intend to animate. Under reduced motion we skip this
// entirely, so no clip is ever set and there is nothing to unwind.
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelectorAll('.unmask').forEach(el => { el.dataset.ready = ''; });
}
revealOnce('.unmask');   // observes .unmask — the unclipped outer box
```

Before/after wipe — a real utility, not decoration:

```html
<div class="ba" role="group" aria-label="Before and after: roof replacement">
  <img class="ba__after"  src="/img/after.avif"  alt="After: new slate roof" width="1400" height="900">
  <img class="ba__before" src="/img/before.avif" alt="Before: failed felt and missing tiles" width="1400" height="900">
</div>
```

```css
.ba { position: relative; display: grid; grid-template-areas: "ba"; }
.ba > img { grid-area: ba; display: block; width: 100%; height: auto; }
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .ba__before {                                  /* the "before" is progressively clipped away */
      animation: ba-wipe linear both;
      animation-timeline: view();
      animation-range: cover 25% cover 75%;
    }
  }
}
@keyframes ba-wipe { from { clip-path: inset(0 0 0 0); } to { clip-path: inset(0 0 0 100%); } }
```

**(e) Mobile fallback.** Shorten the duration (900ms → 600ms) and prefer vertical wipes over diagonal — a
diagonal across a narrow column exposes a lot of empty space mid-animation. Tier-1 browsers get the
`data-ready` transition path via `revealOnce()`, so it is fully covered here.

```css
@media (max-width: 640px) {
  .unmask { --unmask-ease: cubic-bezier(.33,1,.68,1); }
  .unmask[data-ready] .unmask__inner { transition-duration: 600ms; }
  /* downgrade diagonal to vertical */
  .unmask--diagonal[data-ready] .unmask__inner       { clip-path: inset(0 0 100% 0); }
  .unmask--diagonal[data-ready].is-in .unmask__inner { clip-path: inset(0 0 0 0); }
}
```

**(f) Reduced motion.** The wire-up above never sets `data-ready`, so no clip rule ever matches and the
content is simply present; `revealOnce()` short-circuits and adds `.is-in` immediately. Plus the global
override, which matters because `ba-wipe` ends at `inset(0 0 0 100%)` — fully clipped away — and would
otherwise snap to that final keyframe and erase the "before" image (see §0.4):

```css
@media (prefers-reduced-motion: reduce) {
  .unmask__inner, .wipe__mask, .wipe__mask img, .ba__before {
    clip-path: none !important; transform: none !important;
    animation: none !important; transition: none !important;
  }
}
```

**(g) Native CSS enough?** **Yes for the animation.** JS is only the two-line `revealOnce()` call that adds
`.is-in` for Tier-1 browsers. `clip-path` is Baseline widely available, so unlike the scroll timelines, the
*shape* half of this works everywhere — only the scroll-scrubbed variant needs the `@supports` gate.

---

## 11. Staggered cascade entrances

**(a)** A group of sibling elements enters in sequence rather than together.

**(b) When to use.** The most broadly applicable effect after §1, and the safest. Service cards, a team grid,
testimonial cards, logo strip, gallery thumbnails, a feature list, pricing tiers. It works because it directs
the eye through the group in reading order instead of dumping it all at once. Appropriate for **every**
business type in this skill's range, including the conservative ones — a law firm's three practice-area cards
cascading in over 400 ms reads as polish, not showmanship.

**(c) When NOT to use.** Never on more than ~9 items — cap the stagger index or the last item arrives
absurdly late. Never on anything above the fold that delays the LCP element. Never on nav items, buttons,
or anything interactive the user may want to click immediately. Never re-trigger on scroll-up (use a one-shot
observer) — repeated entrances make a page feel unstable.

**(d) Code.**

```html
<ul class="cascade">
  <li class="cascade__item"><h3>Re-roofing</h3><p>Full strip, felt, batten and re-tile.</p></li>
  <li class="cascade__item"><h3>Flat roofs</h3><p>EPDM and fibreglass, 20-year systems.</p></li>
  <li class="cascade__item"><h3>Leadwork</h3><p>Valleys, flashings, chimney trays.</p></li>
  <li class="cascade__item"><h3>Guttering</h3><p>Seamless aluminium and cast-iron effect.</p></li>
  <li class="cascade__item"><h3>Repairs</h3><p>Emergency call-out within 24 hours.</p></li>
  <li class="cascade__item"><h3>Inspections</h3><p>Drone survey with photo report.</p></li>
</ul>
```

```css
.cascade {
  --cascade-step: 70ms;
  --cascade-rise: 1.5rem;
  /* NB: there is deliberately no `--cascade-max` custom property here. The index cap has to be
     applied where --i is written (the JS below), and a CSS variable that nothing reads is worse
     than no variable — it looks like a knob, so a media query "overriding" it silently does
     nothing. Same trap as --rt-stagger in §1; cap it in JS, or hand-author --i in the markup. */
  list-style: none; margin: 0; padding: 0;
  display: grid; gap: 1.25rem;
  grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr));
}
/* TIER 1: a plain, complete card grid. */
.cascade__item {
  padding: 1.5rem; border: 1px solid var(--rule, #0002); border-radius: 3px;
}
.cascade__item h3 { margin: 0 0 .35rem; }
.cascade__item p  { margin: 0; opacity: .75; }

/* TIER 3 (universal): one-shot cascade driven by IntersectionObserver.
   --i is set by JS, or by hand in the HTML if you prefer zero JS on this component. */
.cascade[data-ready] .cascade__item {
  opacity: 0;
  transform: translateY(var(--cascade-rise));
  transition:
    opacity 500ms linear                      calc(var(--i, 0) * var(--cascade-step)),
    transform 620ms cubic-bezier(.22,.61,.36,1) calc(var(--i, 0) * var(--cascade-step));
}
.cascade[data-ready].is-in .cascade__item { opacity: 1; transform: translateY(0); }

/* TIER 2 (optional): per-item scroll-scrubbed version. Note the stagger comes from
   animation-range — animation-delay does nothing on a scroll timeline. */
@supports (animation-timeline: view()) {
  .cascade[data-scrub] .cascade__item {
    animation: cascade-in linear both;
    animation-timeline: view();
    animation-range: entry calc(10% + var(--i, 0) * 4%) entry calc(70% + var(--i, 0) * 4%);
  }
}
@keyframes cascade-in {
  from { opacity: 0; transform: translateY(1.5rem); }
  to   { opacity: 1; transform: translateY(0); }
}
```

```js
/* Index + arm the group. Observe the CONTAINER, not each item — one observer, one entrance,
   and the group reads as a single gesture instead of six unrelated ones. */
import { revealOnce } from './motion.js';

const MAX = matchMedia('(max-width: 640px)').matches ? 5 : 8;   // the cap lives here, not in CSS
document.querySelectorAll('.cascade').forEach(group => {
  [...group.children].forEach((el, i) => el.style.setProperty('--i', Math.min(i, MAX)));
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) group.dataset.ready = '';
});
revealOnce('.cascade');
```

**(e) Mobile fallback.** In a single column the items are stacked vertically, so a 70 ms step means item 6
lands 420 ms after item 1 — visible as a slow drip. Tighten it and shorten the rise:

```css
@media (max-width: 640px) {
  .cascade { --cascade-step: 40ms; --cascade-rise: .875rem; }
}
```

The step and the rise are genuine CSS knobs and this override works. The *index cap* is not a CSS knob —
to tighten it on mobile you must change the cap in the JS (read `matchMedia('(max-width: 640px)')` when
computing `MAX`), because `--i` is already a resolved number by the time CSS sees it.

**(f) Reduced motion.** The JS never sets `data-ready`, so the hidden state is never applied — items are
simply present. `revealOnce()` also short-circuits and adds `.is-in` immediately. Nothing to unwind.

```css
@media (prefers-reduced-motion: reduce) {
  .cascade__item { opacity: 1 !important; transform: none !important; transition: none !important; animation: none !important; }
}
```

**(g) Native CSS enough?** **CSS + one Web API.** The animation is CSS; `IntersectionObserver` supplies the
trigger, which is the correct native tool and is Baseline widely available. The `@supports` variant is pure
CSS with no JS at all if you hand-author `--i` in the markup — worth doing on a static site. This is what
AOS.js (14 KB) and half of GSAP's usage exist for; neither is warranted.

---

## 12. When a library IS justified

State the reason explicitly or don't add it.

| Situation | Native verdict |
|---|---|
| Any effect in this document | **Native. No library.** |
| Scrubbed scroll animation | `animation-timeline` + `@supports` + IO fallback. GSAP ScrollTrigger adds ~40 KB for pinning ergonomics you can express as `--stage-h`. |
| "Smooth scroll" / scroll inertia (Lenis, Locomotive) | **Reject on client sites.** It overrides the OS scroll curve, adds input latency, breaks trackpad feel, interferes with `scroll-behavior`, find-in-page and screen readers, and moves scroll work back onto the main thread — the opposite of what scroll timelines achieve. |
| Entrance animations (AOS) | `IntersectionObserver` + CSS transitions. 25 lines vs 14 KB. |
| Splitting text into words | 30 lines of DOM code (§1). SplitType/SplitText not needed. |
| Image sequence scrubbing | Sprite strip (pure CSS) or canvas + rAF (§3). |
| **SVG path morphing between arbitrary shapes with differing vertex counts** | Native CSS/SMIL cannot interpolate paths with different command structures. A morph library (or pre-computed equalised path data) is genuinely required. Prefer pre-computing equal-vertex paths and using CSS `d:` interpolation before adding a dependency. |
| **Physics-based motion — spring/inertia responding to velocity, drag with momentum, elastic collisions** | CSS has `linear()` easing which can approximate a spring curve precisely (generate the stops), so *static* springs are native. Genuine *velocity-reactive* physics needs JS. Use the Web Animations API first; reach for a library only if you need a solver. |
| **Real 3D — lighting, shadows, depth of field, model loading, per-object materials** | CSS 3D transforms have no lighting model and no z-sorting beyond `preserve-3d`. Three.js is warranted. But a card helix (§6) or a split image (§9) is *not* this — do those in CSS. |
| **Canvas/WebGL shaders, fluid or particle effects** | No native CSS equivalent. But question whether a local business site needs one at all; usually the answer is no. |

## 13. Pre-ship checklist

- [ ] Every "hidden" state lives inside `@supports` or behind a JS-set `data-ready` attribute.
- [ ] **No element is both clipped and observed.** If an `IntersectionObserver` target carries a
      `clip-path` hidden state, it will never fire and the element is invisible forever (§0.3, §10).
- [ ] **Every scrubbed keyframe's `to` state equals the desired resting state** — or the effect is
      wrapped in `@media (prefers-reduced-motion: no-preference)`. The §0.4 block snaps animations to
      their final keyframe; it does not reset them (§0.4).
- [ ] **Every custom property named in a mobile media query is actually read by CSS.** A `--foo` that
      only JS consumes makes the override dead code that looks like a fallback (§1e, §11e).
- [ ] **No `--n`-style geometry variable is set in an inline `style=` attribute** if a media query needs
      to override it — inline wins, and the responsive fallback silently does nothing (§9e).
- [ ] `box-sizing: border-box` is in force anywhere a `calc()` travel/track formula is used (§7).
- [ ] Cross-fading sequences checked at the *seams*, not just mid-slice: total opacity across the group
      never dips toward 0 between steps (§4).
- [ ] Tested with `CSS.supports` forced false (or Firefox stable, or Safari 18) — page is complete and beautiful.
- [ ] That same no-scroll-timeline test repeated **at 390px**, since most of that cohort is mobile Safari.
- [ ] Tested with JS disabled — all content present.
- [ ] Tested with `prefers-reduced-motion: reduce` forced on — no travel, no scrub, no parallax, all runways collapsed.
- [ ] `animation-timeline` / `animation-range` declared *after* every `animation` shorthand.
- [ ] `both` fill-mode on every scroll-driven animation; `linear` timing on every scrubbed one.
- [ ] Only `transform`, `opacity`, `rotate`, `scale`, `translate`, `clip-path` are animated. No `width`, `height`, `top`, `left`, `margin`, `background-position` (except as a *static* sprite offset), `filter` on large surfaces.
- [ ] ≤ 3 effects on the page; ≤ 1 per section; none stacked on one element.
- [ ] Pinned sections use `100svh`, not `100vh`.
- [ ] Landscape phone (max-height ~520px) checked — pinned content doesn't overflow.
- [ ] Keyboard tab order still traverses every pinned/horizontal section sensibly.
- [ ] No `will-change` except on the single large horizontal track (§7).
- [ ] Total added JS ≤ 3 KB gzipped, zero dependencies.

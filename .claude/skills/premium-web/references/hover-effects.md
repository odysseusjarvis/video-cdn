# Hover & Micro-Interaction Library

Twenty production-grade interactions for luxury-register promotional sites. Every one is
**native-first** (pure CSS + Web APIs), **GPU-safe** (transform/opacity only unless flagged),
**touch-degraded**, and ships a **`prefers-reduced-motion` branch**.

Copy the snippets verbatim. They are vanilla CSS + vanilla JS with CSS custom properties for
theming, so they drop into React / Astro / Svelte / plain HTML unchanged.

---

## 0. The three laws (read before using anything below)

### Law 1 — The touch rule

> **Hover is an enhancement, never a carrier of information or of a required action.**
> Everything a hover reveals must be reachable on touch by a different, explicit route.

Every effect is gated by:

```css
@media (hover: hover) and (pointer: fine) { /* mouse/trackpad enhancement */ }
```

and, in JS, by a **per-event** pointer-type check (media queries lie on hybrid devices —
a Surface or an iPad with a Magic Keyboard reports `hover: hover` and then gets a `touch`
pointer anyway):

```js
el.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse') return;  // hybrid-safe: a finger on a hover:hover device
  /* …enhancement… */
});
```

Each effect then picks exactly one of three documented degradation strategies. The strategy is
named in every section as **Touch strategy: A / B / C**.

| Strategy | Meaning | Used by |
|---|---|---|
| **A — Ship the end state** | The "after" look becomes the resting look on touch. Nothing animates, nothing is hidden. | text lift, mask reveal, gradient button, 3D letters, liquify |
| **B — Promote to an explicit gesture** | Hover becomes tap / press-and-drag / swipe, using the same Pointer Events code path. | tooltip, x-ray, scratch, swipe cards, depth globe, gooey dropdown |
| **C — Drop the effect and its DOM cost** | The enhancement is removed entirely; the base component is already complete. | magnetic, gooey filter, displacement |

Never use `:hover` as the only way to reach a link, a price, a phone number, or a CTA. On touch,
a first tap fires `:hover` and a second tap activates — the classic "double-tap trap". If a card
reveals its CTA on hover, the whole card must also be a link.

### Law 2 — The motion rule

Every effect ships an explicit `prefers-reduced-motion: reduce` branch. Reduced motion does
**not** mean "no feedback" — it means *no large translation, no rotation, no scale, no parallax,
no autoplay*. Opacity and colour changes are still allowed and still required, because the user
must know the element is interactive.

```css
/* Per-effect branches are what you ship. This global net is a LAST-RESORT audit backstop
   for third-party CSS you cannot edit — it destroys intent, so don't lean on it. */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
    scroll-behavior: auto !important;
  }
}
```

In JS, read the query live — users flip the OS setting mid-session:

```js
const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
mqReduce.addEventListener('change', rebuild); // re-init, don't cache the boolean
```

### Law 3 — The performance rule

Animate `transform` and `opacity`. Nothing else, with three flagged exceptions that are called
out where they occur:

1. **SVG filters** (gooey #7, gooey dropdown #10, liquify #20) rasterise every frame. They are
   hero-moment-only, hover-only, desktop-only, and `filter: none` at rest so idle cost is zero.
2. **`clip-path`** is compositor-accelerated for `inset()`/`circle()` in Chromium & WebKit, but
   not reliably in Gecko. Where it matters, the snippet uses the double-transform lens trick
   instead (#5).
3. **1px border-colour transitions** on form fields (#15). One element, sub-pixel repaint —
   acceptable, and there is no transform equivalent that reads as correct.

Never animate `width`, `height`, `top`, `left`, `margin`, `padding`, `box-shadow` spread, or
`background-position`. Never set `will-change` globally; set it on `:hover`/`:focus-within` of
the specific element, or via JS immediately before an animation and remove it after.

---

## Verified browser support — checked 2026-08-02

Do not trust older blog posts. Status as of today:

| Feature | Status today | Guard required? |
|---|---|---|
| `popover` attribute | Baseline (Jan 2025), ~91% traffic | No |
| `@starting-style`, `transition-behavior: allow-discrete` | Baseline newly available (Firefox 129) | No, degrades to no entry anim |
| `@property` | Baseline newly available (Jul 2024); Widely available Jan 2027 | No, but write a plain `--var` fallback |
| Same-document View Transitions (`document.startViewTransition`) | **Baseline newly available (Oct 2025)** — Chrome 111+, Firefox 133+, Safari 18+ | Feature-detect the function |
| Cross-document View Transitions | Chrome 126+, Safari 18.2+, **no Firefox** | Yes |
| CSS anchor positioning (`anchor-name`, `position-anchor`, `anchor()`) | Chrome 125+, Firefox 132+, Safari 18.2+ (`@position-try` needs 18.4+); ~85–91% | **Yes** — `@supports (anchor-name: --a)` |
| Scroll-driven animations (`animation-timeline: scroll()/view()`) | **Not Baseline.** Chrome 115+, Firefox 132+, Safari 18+; ~84% | **Yes, always** — `@supports (animation-timeline: scroll())` |
| `:user-valid` / `:user-invalid` | Baseline widely available | No |
| `:has()` | Baseline widely available | No |
| `interestfor` / `interesttarget` (hover-triggered popovers, no JS) | **Experimental.** Chrome Canary behind a flag. Not shippable. | Use the JS recipe in #4 |
| `::scroll-button()` / `::scroll-marker` CSS carousels | **Not Baseline.** Chrome 135+ only; Firefox & Safari in progress | Yes — progressive sugar on top of a scroll-snap base |
| Web Animations API (`el.animate`, `getAnimations`) | Baseline widely available | No |
| `linear()` easing (spring curves) | Baseline newly available | Falls back to `ease-out` |
| Pointer Events, `setPointerCapture`, `getCoalescedEvents` | Baseline widely available | No |
| SVG `feTurbulence` / `feDisplacementMap` / `feColorMatrix` | Universal since forever | No |

**No library is named anywhere in this file.** All twenty effects are achievable natively.
See §21 for the only two cases where reaching for one is defensible.

---

## 0.1 Shared foundation — paste once, per site

```css
/* ---- tokens.css : theme surface. Override these, never the effect internals. ---- */
:root {
  color-scheme: light dark;

  /* Motion vocabulary. Three durations, three curves. Consistency IS the luxury. */
  --dur-fast: 140ms;   /* state acknowledgement: press, icon swap        */
  --dur-base: 280ms;   /* the default. hover in/out, reveals             */
  --dur-slow: 620ms;   /* entrances, masks, view transitions             */

  --ease-out:  cubic-bezier(.16, 1, .3, 1);      /* expo-out: premium default */
  --ease-in:   cubic-bezier(.7, 0, .84, 0);
  --ease-soft: cubic-bezier(.4, 0, .2, 1);
  /* Spring, no JS, no library. Overshoots ~4% then settles. */
  --ease-spring: linear(
    0, 0.006, 0.025 2.8%, 0.101 6.1%, 0.539 18.9%, 0.721 25.3%, 0.849 31.5%,
    0.937 38.1%, 0.968 41.8%, 0.991 45.7%, 1.006 50.1%, 1.015 55%, 1.017 63.9%,
    1.001 100%
  );

  /* Surfaces & ink — light */
  --bg:      oklch(98.5% 0.004 250);
  --bg-2:    oklch(95%   0.006 250);
  --ink:     oklch(18%   0.02  250);
  --ink-2:   oklch(48%   0.02  250);
  --line:    oklch(88%   0.01  250);
  --accent:  oklch(62%   0.19  28);
  --accent-2:oklch(58%   0.17  292);
  --ok:      oklch(64%   0.16  152);
  --bad:     oklch(58%   0.20  27);
  --radius:  14px;
  --ring: 2px solid color-mix(in oklch, var(--accent) 80%, transparent);
}

:root[data-theme='dark'] {
  color-scheme: dark;
  --bg:      oklch(16%   0.015 260);
  --bg-2:    oklch(21%   0.02  260);
  --ink:     oklch(96%   0.01  260);
  --ink-2:   oklch(70%   0.02  260);
  --line:    oklch(30%   0.02  260);
  --accent:  oklch(72%   0.17  38);
  --accent-2:oklch(70%   0.15  292);
}

/* Focus is never decorative. outline follows border-radius and survives forced-colors. */
:where(a, button, input, select, textarea, [tabindex]):focus-visible {
  outline: var(--ring);
  outline-offset: 3px;
}

/* Reduced motion: kill the vocabulary at the source. Effects that need a different
   *look* (not just a shorter one) override individually below. */
@media (prefers-reduced-motion: reduce) {
  :root { --dur-fast: 1ms; --dur-base: 1ms; --dur-slow: 1ms; }
}

.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0;
}
```

```js
/* ---- fx-core.js : ~30 lines, shared by every JS effect. No dependencies. ---- */
export const mqHover  = matchMedia('(hover: hover) and (pointer: fine)');
export const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');

export const canHover = () => mqHover.matches;
export const reduced  = () => mqReduce.matches;
/** Per-event hybrid-device guard. A trackpad on an iPad still emits pointerType 'mouse'. */
export const isMouse  = (e) => e.pointerType === 'mouse';

export const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
export const lerp  = (a, b, t) => a + (b - a) * t;

/** rAF-coalesced writer: many events in a frame produce exactly one style write. */
export function rafWrite() {
  let queued = false, fn = null;
  return (job) => {
    fn = job;
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; fn(); });
  };
}

/** Re-run init when the user flips OS motion or swaps to a mouse mid-session. */
export function onEnvChange(cb) {
  mqHover.addEventListener('change', cb);
  mqReduce.addEventListener('change', cb);
}
```

---

# 1. Animated gradient / shader-style button

**What it is.** A CTA whose border (or fill) is a slowly rotating conic gradient, with a soft
light that tracks the cursor across the surface. Reads as "expensive software", not "clip art".

**When to use it.** The single primary CTA of a hero, or a pricing page's recommended plan.
Register: tech, studio, architecture, premium services, anything selling *modernity*. **One per
viewport, maximum.** A trades business (roofer, plumber) should get the same button with the
rotation off and only the cursor light — the shimmer reads as gimmicky in that register.

**Why native.** The naive approach animates a `@property --angle` inside `conic-gradient()`,
which repaints the element every frame. Instead we paint the conic gradient **once** onto an
oversized pseudo-element and rotate it with `transform` — identical visual, pure compositor work.
The cursor light is a separate pre-painted blurred blob moved with `translate3d`, not a
`background-position` animation.

```html
<a class="fx-btn" href="/contact">
  <span class="fx-btn__spin" aria-hidden="true"></span>
  <span class="fx-btn__light" aria-hidden="true"></span>
  <span class="fx-btn__label">Book a consultation</span>
</a>
```

```css
.fx-btn {
  --btn-bg: var(--bg);
  --btn-spin-dur: 6s;

  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 1rem 2rem;
  border-radius: 999px;
  isolation: isolate;          /* keeps the gradient out of the page stacking context */
  overflow: hidden;            /* clips the oversized spinner to the pill */
  color: var(--ink);
  font-weight: 600;
  text-decoration: none;
  background: var(--btn-bg);
  /* 1px conic ring: the padding-box holds the solid fill, the border-box shows the gradient */
  border: 1px solid transparent;
  background-clip: padding-box;
  transform: translateZ(0);    /* own layer, so the spinner never repaints the page */
  transition: transform var(--dur-fast) var(--ease-out);
}

/* The rotating gradient. Oversized square so its corners never enter the pill. */
.fx-btn__spin {
  position: absolute;
  inset: -150%;
  z-index: -2;
  background: conic-gradient(
    from 0deg,
    var(--accent) 0deg, var(--accent-2) 110deg,
    transparent 190deg, transparent 300deg, var(--accent) 360deg
  );
  animation: fx-btn-spin var(--btn-spin-dur) linear infinite;
}
@keyframes fx-btn-spin { to { transform: rotate(1turn); } }   /* transform only */

/* Solid inner plate that hides the gradient except at the 1px rim. */
.fx-btn::before {
  content: '';
  position: absolute;
  inset: 1px;
  z-index: -1;
  border-radius: inherit;
  background: var(--btn-bg);
}

/* Cursor light. Pre-painted, only ever translated. Opacity 0 until hover. */
.fx-btn__light {
  position: absolute;
  z-index: -1;
  top: 0; left: 0;
  width: 220px; aspect-ratio: 1;
  margin: -110px 0 0 -110px;               /* centre on the origin */
  border-radius: 50%;
  background: radial-gradient(circle, color-mix(in oklch, var(--accent) 55%, transparent), transparent 70%);
  opacity: 0;
  pointer-events: none;
  transform: translate3d(var(--lx, 0px), var(--ly, 0px), 0);
  transition: opacity var(--dur-base) var(--ease-out);
}

.fx-btn:active { transform: scale(.97); }

/* ---- Law 1: enhancement only where a real cursor exists ---- */
@media (hover: hover) and (pointer: fine) {
  .fx-btn:hover .fx-btn__light,
  .fx-btn:focus-visible .fx-btn__light { opacity: 1; }
  .fx-btn:hover { transform: translateY(-2px); }
}

/* ---- Touch strategy A: ship the end state ----
   No cursor light (there is no cursor), gradient keeps turning slowly so the button
   still reads as "alive", press feedback comes from :active scale. */
@media (hover: none) {
  .fx-btn { --btn-spin-dur: 9s; }
  .fx-btn__light { display: none; }        /* removes the node from paint entirely */
}

/* ---- Law 2 ---- */
@media (prefers-reduced-motion: reduce) {
  .fx-btn__spin { animation: none; transform: rotate(215deg); } /* a good static angle */
  .fx-btn__light { transition: none; }
  .fx-btn:hover { transform: none; }
  /* Feedback must survive: swap movement for contrast. */
  .fx-btn:hover, .fx-btn:focus-visible { --btn-bg: var(--bg-2); }
}
```

```js
import { canHover, isMouse, rafWrite } from './fx-core.js';

document.querySelectorAll('.fx-btn').forEach((btn) => {
  if (!canHover()) return;                    // never bind on touch-only
  const light = btn.querySelector('.fx-btn__light');
  const write = rafWrite();
  btn.addEventListener('pointermove', (e) => {
    if (!isMouse(e)) return;                  // hybrid guard
    const r = btn.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    write(() => light.style.setProperty('--lx', `${x}px`) ||
                light.style.setProperty('--ly', `${y}px`));
  });
});
```

**`@property` variant.** If you need the *hue* to shift rather than the gradient to rotate,
that genuinely requires an animatable custom property:

```css
@property --hue { syntax: '<number>'; inherits: false; initial-value: 28; }
.fx-btn--hue .fx-btn__spin {
  background: conic-gradient(oklch(62% .19 calc(var(--hue) * 1deg)), oklch(58% .17 calc((var(--hue) + 90) * 1deg)));
  animation: hue 8s linear infinite;
}
@keyframes hue { to { --hue: 388; } }
```
This one *does* repaint each frame. Confine it to one element under 400px and never inside a
scroll-driven section. Browsers without `@property` simply show the initial-value gradient —
static, still correct.

---

# 2. Text lift (letters rise individually)

**What it is.** On hover, each letter of a word slides up and out of a clipping box while a
duplicate rises from below — a staggered, per-character roll. Used on nav links and on the
"read more" affordance of an editorial grid.

**When to use it.** Nav bars, footer links, index-style project lists, oversized headline links.
Register: studio, gallery, architecture, fashion, restaurant. Avoid on body links inside
paragraphs — the clipping box breaks line-wrapping.

**Why native.** `transition-delay: calc(var(--i) * 18ms)` gives the stagger with zero JS
animation loop. JS is used once, at build/hydrate time, only to split the text.

```html
<a class="lift" href="/work"><span class="lift__txt">Our work</span></a>
```

```css
.lift {
  display: inline-block;
  overflow: hidden;                 /* the clipping box */
  line-height: 1.15;                /* tight, or descenders get shaved */
  color: var(--ink);
  text-decoration: none;
  vertical-align: bottom;
}
.lift__char {
  display: inline-block;
  white-space: pre;                 /* preserves the split spaces */
  transform: translateY(0);
  transition: transform var(--dur-base) var(--ease-out);
  transition-delay: calc(var(--i) * 18ms);
}
/* the incoming duplicate, stacked one line-height below */
.lift__char::after {
  content: attr(data-ch);
  position: absolute;
  left: 0;
  top: 100%;
}
.lift__char { position: relative; }

@media (hover: hover) and (pointer: fine) {
  .lift:hover .lift__char,
  .lift:focus-visible .lift__char { transform: translateY(-100%); }
}

/* ---- Touch strategy A: ship the end state (no per-letter theatre) ----
   Touch gets ONE whole-word nudge on press. It confirms the tap without a
   20-node stagger that a finger would never see anyway. */
@media (hover: none) {
  .lift__char { transition: none; transition-delay: 0s; }
  .lift:active .lift__txt { transform: translateY(-2px); transition: transform 120ms var(--ease-out); }
  .lift { text-decoration: underline; text-underline-offset: .22em; text-decoration-thickness: 1px; }
}

/* ---- Law 2: no travel. Keep the affordance via ink weight. ---- */
@media (prefers-reduced-motion: reduce) {
  .lift__char { transition: color var(--dur-fast) linear; transition-delay: 0s; transform: none !important; }
  .lift:hover .lift__char, .lift:focus-visible .lift__char { color: var(--accent); }
  .lift__char::after { display: none; }
}
```

```js
/* Split once. Accessibility: the wrapper carries the real string as aria-label and the
   split spans are hidden, otherwise some screen readers spell the word letter-by-letter. */
export function splitLift(root = document) {
  root.querySelectorAll('.lift__txt').forEach((el) => {
    if (el.dataset.split) return;
    const text = el.textContent.trim();
    el.closest('.lift').setAttribute('aria-label', text);
    el.setAttribute('aria-hidden', 'true');
    el.dataset.split = '1';
    el.textContent = '';
    [...text].forEach((ch, i) => {
      const s = document.createElement('span');
      s.className = 'lift__char';
      s.style.setProperty('--i', i);
      s.dataset.ch = ch;               // fed to ::after
      s.textContent = ch;
      el.append(s);
    });
  });
}
splitLift();
```

**Note.** For a *word-level* stagger on a long headline, split on spaces instead of characters —
40 character nodes in a headline is a layout cost you pay on every resize. Keep character
splitting to strings under ~24 characters.

---

# 3. Magnetic hover

**What it is.** The element drifts toward the cursor while the cursor is inside an invisible
radius around it, then springs home on exit. It makes a small target feel enormous.

**When to use it.** One or two elements per page: the hero CTA, a floating "get a quote" bubble,
a logo mark, a close button on a lightbox. Register: studio, agency, luxury product. **Never** on
a nav bar of six items (they all fight), never on anything inside a scrolling list.

**Why native.** Pointer Events + a single rAF lerp loop. There is no CSS mechanism for
"follow the pointer with easing", but this is ~25 lines and does not need a library. The loop
runs only while a pointer is inside the zone and stops itself, so idle cost is zero.

```html
<div class="mag" style="--mag-radius: 120px; --mag-pull: .35">
  <a class="mag__el fx-btn" href="/quote"><span class="fx-btn__label">Get a quote</span></a>
</div>
```

```css
.mag {
  display: inline-grid;
  place-items: center;
  /* The catchment area, larger than the button. Padding, not a positioned overlay. */
  padding: var(--mag-radius, 100px);
  margin: calc(-1 * var(--mag-radius, 100px));
}
.mag__el {
  will-change: auto;
  transform: translate3d(var(--mx, 0px), var(--my, 0px), 0);
  transition: transform var(--dur-base) var(--ease-spring); /* used only on release */
}
.mag.is-pulling .mag__el { transition: none; }              /* live tracking, no lag */

/* ---- Touch strategy C: drop it entirely ----
   There is no cursor to be magnetic toward. The button is already complete. */
@media (hover: none), (pointer: coarse) {
  .mag { padding: 0; margin: 0; }
  .mag__el { transform: none !important; }
}

/* ---- Law 2 ---- */
@media (prefers-reduced-motion: reduce) {
  .mag__el { transform: none !important; transition: none; }
}
```

```js
import { canHover, reduced, isMouse, clamp, lerp, onEnvChange } from './fx-core.js';

function initMagnetic() {
  document.querySelectorAll('.mag').forEach((zone) => {
    zone.replaceWith(zone.cloneNode(true));                   // clear old listeners on re-init
  });
  if (!canHover() || reduced()) return;                       // Law 1 + Law 2 short-circuit

  document.querySelectorAll('.mag').forEach((zone) => {
    const el = zone.querySelector('.mag__el');
    const pull = parseFloat(getComputedStyle(zone).getPropertyValue('--mag-pull')) || 0.35;
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;

    const loop = () => {
      cx = lerp(cx, tx, 0.18);                                // critically-damped-ish
      cy = lerp(cy, ty, 0.18);
      el.style.setProperty('--mx', `${cx.toFixed(2)}px`);
      el.style.setProperty('--my', `${cy.toFixed(2)}px`);
      raf = (Math.abs(tx - cx) > 0.1 || Math.abs(ty - cy) > 0.1) ? requestAnimationFrame(loop) : 0;
    };
    const start = () => { if (!raf) raf = requestAnimationFrame(loop); };

    zone.addEventListener('pointerenter', (e) => {
      if (!isMouse(e)) return;                                // hybrid guard
      zone.classList.add('is-pulling');
      el.style.willChange = 'transform';
    });
    zone.addEventListener('pointermove', (e) => {
      if (!isMouse(e)) return;
      const r = el.getBoundingClientRect();                   // read once per move, no thrash
      const maxX = r.width * 0.6, maxY = r.height * 0.9;
      tx = clamp((e.clientX - (r.left + r.width / 2)) * pull, -maxX, maxX);
      ty = clamp((e.clientY - (r.top + r.height / 2)) * pull, -maxY, maxY);
      start();
    });
    zone.addEventListener('pointerleave', () => {
      zone.classList.remove('is-pulling');                    // re-enables the spring transition
      tx = ty = 0;
      el.style.removeProperty('--mx');
      el.style.removeProperty('--my');
      cx = cy = 0;
      cancelAnimationFrame(raf); raf = 0;
      el.style.willChange = 'auto';
    });
  });
}
initMagnetic();
onEnvChange(initMagnetic);
```

**Trap to avoid.** Do not put the magnetic zone's padding where it can overlap another
interactive element — the invisible catchment will swallow clicks. Check with
`document.elementFromPoint` during QA, or give the zone `pointer-events: none` and the
button `pointer-events: auto` while listening on a parent section instead.

---

# 4. Apple-style tooltip

**What it is.** A small dark card that fades and scales up under a control after a short intent
delay, flips to stay on screen, and dismisses on blur, Escape, or an outside tap.

**When to use it.** Icon-only buttons, abbreviations, a spec table's asterisks, pricing caveats.
Register: universal. Mandatory on any icon-only control.

**Why native.** `popover` (Baseline) gives the top layer, light dismiss, and Escape handling for
free. CSS anchor positioning (Chrome 125+, FF 132+, Safari 18.2+ — **guard it**) gives the
placement and the flip. `@starting-style` + `transition-behavior: allow-discrete` give the entry
animation with no JS. JS is needed only for the *hover* trigger, because `interestfor` is still
Chrome-Canary-behind-a-flag as of today and cannot be shipped.

```html
<button class="tipbtn" popovertarget="tip-export" aria-describedby="tip-export">
  <svg aria-hidden="true" width="18" height="18"><use href="#i-export"/></svg>
  <span class="sr-only">Export</span>
</button>
<div class="tip" id="tip-export" popover role="tooltip">Export as PDF <kbd>⌘E</kbd></div>
```

```css
.tipbtn { anchor-name: --tip-export; }   /* one anchor-name per trigger; generate them */

.tip {
  margin: 0;
  padding: .5rem .7rem;
  max-width: 24ch;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--bg-2);
  color: var(--ink);
  font-size: .82rem;
  line-height: 1.35;
  box-shadow: 0 12px 30px -12px oklch(0% 0 0 / .45);

  opacity: 0;
  transform: translateY(4px) scale(.96);
  transform-origin: top center;
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-base) var(--ease-out),
    overlay var(--dur-base) allow-discrete,
    display var(--dur-base) allow-discrete;
}
.tip:popover-open { opacity: 1; transform: translateY(0) scale(1); }
@starting-style { .tip:popover-open { opacity: 0; transform: translateY(4px) scale(.96); } }

/* --- Placement: anchor positioning where supported --- */
@supports (anchor-name: --a) {
  .tip {
    position: absolute;
    position-anchor: --tip-export;
    position-area: block-end center;      /* below, centred */
    margin-block-start: 8px;
    position-try-fallbacks: flip-block, flip-inline;  /* stay on screen */
  }
}
/* --- Fallback: wrap trigger + tip in .tipwrap { position: relative } --- */
@supports not (anchor-name: --a) {
  .tipwrap { position: relative; display: inline-block; }
  .tip { position: absolute; inset: auto auto -8px 50%; translate: -50% 100%; }
}

/* ---- Touch strategy B: promote to an explicit gesture ----
   No hover exists, so the tooltip becomes tap-to-open. The popover attribute already
   does this natively — we simply don't attach the hover listeners (see JS).
   Enlarge the hit target and let light-dismiss close it. */
@media (hover: none) {
  .tipbtn { min-block-size: 44px; min-inline-size: 44px; }
  .tip { font-size: .9rem; max-width: 32ch; }
}

/* ---- Law 2 ---- */
@media (prefers-reduced-motion: reduce) {
  .tip { transform: none; transition: opacity 1ms linear, overlay 1ms allow-discrete, display 1ms allow-discrete; }
  .tip:popover-open { transform: none; }
  @starting-style { .tip:popover-open { opacity: 1; } }
}
```

```js
import { canHover, isMouse } from './fx-core.js';

/* Hover + keyboard-focus opening. Tap opening is already native via popovertarget. */
document.querySelectorAll('[popovertarget]').forEach((btn) => {
  const tip = document.getElementById(btn.getAttribute('popovertarget'));
  if (!tip?.matches('[role="tooltip"]')) return;

  let openT, closeT;
  const open  = () => { clearTimeout(closeT); openT  = setTimeout(() => tip.showPopover(), 140); };
  const close = () => { clearTimeout(openT);  closeT = setTimeout(() => tip.hidePopover(), 90);  };

  if (canHover()) {
    btn.addEventListener('pointerenter', (e) => isMouse(e) && open());
    btn.addEventListener('pointerleave', (e) => isMouse(e) && close());
    tip.addEventListener('pointerenter', () => clearTimeout(closeT));  // let users reach the tip
    tip.addEventListener('pointerleave', close);
    /* Hover-opened popovers must not also toggle on the click that follows. */
    btn.addEventListener('click', (e) => { if (tip.matches(':popover-open')) e.preventDefault(); });
  }
  /* Keyboard parity, always on. */
  btn.addEventListener('focus', () => tip.showPopover());
  btn.addEventListener('blur',  () => tip.hidePopover());
});
```

**A11y contract.** `aria-describedby` on the trigger, `role="tooltip"` on the panel, real text in
an `.sr-only` span inside icon-only buttons (a tooltip is *not* an accessible name). Never put a
link or a button inside a tooltip — if it needs interaction, it is a popover/menu, not a tooltip.

---

# 5. X-ray hover (reveals a second layer underneath)

**What it is.** A circular lens follows the cursor across an image or panel and shows a different
layer through it — before/after, plan/render, day/night, finished/exposed structure.

**When to use it.** Architecture and construction (render vs built), restoration trades
(before/after), automotive detailing, dentistry, print/packaging. Register: any business whose
value proposition is a *transformation*. This is the single most persuasive effect in the file
for trades.

**Why native, and the important trick.** Naively you animate `clip-path: circle(r at x y)`, which
repaints the whole element every frame in Gecko. Instead: the lens is a fixed-size clipped box
that is *translated*, and it contains a full-size copy of layer B that is *counter-translated* by
the same amount. Two transforms, zero repaint, perfect registration.

```html
<figure class="xray" aria-label="Kitchen, before and after refit">
  <div class="xray__base" aria-hidden="true"></div>          <!-- layer A: "before" -->
  <div class="xray__lens" aria-hidden="true">
    <div class="xray__inner"></div>                          <!-- layer B: "after"  -->
  </div>
  <figcaption class="xray__hint">Move across to reveal the finished room</figcaption>
</figure>
```

```css
.xray {
  --lens: 190px;
  position: relative;
  aspect-ratio: 16 / 10;
  margin: 0;
  overflow: hidden;
  border-radius: var(--radius);
  touch-action: none;              /* we own the drag gesture on touch */
  cursor: none;                    /* the lens IS the cursor (restore on touch below) */
}
.xray__base,
.xray__inner {
  position: absolute;
  inset: 0;
  background: var(--layer-a);      /* set per-instance: image, gradient, whatever */
}
.xray__inner { background: var(--layer-b); }

.xray__lens {
  position: absolute;
  top: 0; left: 0;
  width: var(--lens); aspect-ratio: 1;
  margin: calc(var(--lens) / -2) 0 0 calc(var(--lens) / -2);
  border-radius: 50%;
  overflow: hidden;
  box-shadow: 0 0 0 2px oklch(100% 0 0 / .7), 0 18px 40px -18px oklch(0% 0 0 / .6);
  opacity: 0;
  /* GPU: only the lens moves. */
  transform: translate3d(var(--x, 50%), var(--y, 50%), 0);
  transition: opacity var(--dur-base) var(--ease-out);
}
.xray__inner {
  /* Counter-translate so layer B stays pinned to the figure, not to the lens. */
  width: var(--w, 100%); height: var(--h, 100%);
  transform: translate3d(calc(var(--x, 0px) * -1 + var(--lens) / 2), calc(var(--y, 0px) * -1 + var(--lens) / 2), 0);
}
.xray.is-live .xray__lens { opacity: 1; }

.xray__hint {
  position: absolute; inset: auto 0 0 0;
  padding: .6rem .9rem;
  font-size: .8rem;
  color: oklch(100% 0 0);
  background: linear-gradient(transparent, oklch(0% 0 0 / .6));
  transition: opacity var(--dur-base) var(--ease-out);
}
.xray.is-live .xray__hint { opacity: 0; }

/* ---- Touch strategy B: press-and-drag, same code path ----
   pointerdown activates the lens, pointermove tracks it, pointerup fades it out.
   Restore the caret cursor and rewrite the hint copy. */
@media (hover: none) {
  .xray { cursor: auto; --lens: 150px; }
  .xray__hint::after { content: ' — press and drag'; }
}

/* ---- Law 2: no tracking lens at all. Show both layers as a static 50/50 split
   with a labelled divider — the information is preserved, the motion is not. ---- */
@media (prefers-reduced-motion: reduce) {
  .xray { cursor: auto; }
  .xray__lens {
    opacity: 1 !important;
    inset: 0; width: 50%; height: 100%; margin: 0;
    border-radius: 0;
    transform: none !important;
    box-shadow: 1px 0 0 oklch(100% 0 0 / .9);
  }
  .xray__inner { transform: none !important; width: 200%; }
  .xray__hint { opacity: 1 !important; }
}
```

```js
import { reduced, rafWrite, onEnvChange } from './fx-core.js';

function initXray() {
  document.querySelectorAll('.xray').forEach((fig) => {
    if (reduced()) { fig.classList.remove('is-live'); return; }   // Law 2: static split
    const lens = fig.querySelector('.xray__lens');
    const inner = fig.querySelector('.xray__inner');
    const write = rafWrite();
    let box = null;
    const measure = () => { box = fig.getBoundingClientRect(); };
    new ResizeObserver(measure).observe(fig);

    const move = (e) => {
      if (!box) measure();
      const x = e.clientX - box.left, y = e.clientY - box.top;
      write(() => {
        // one write, read by BOTH the lens and its counter-translated inner copy
        fig.style.setProperty('--x', `${x}px`);
        fig.style.setProperty('--y', `${y}px`);
        inner.style.setProperty('--w', `${box.width}px`);
        inner.style.setProperty('--h', `${box.height}px`);
      });
    };

    // Mouse: hover. Touch/pen: press-and-drag. One handler set, branched by pointerType.
    fig.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { measure(); fig.classList.add('is-live'); } });
    fig.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') fig.classList.remove('is-live'); });
    fig.addEventListener('pointerdown',  (e) => { measure(); fig.setPointerCapture(e.pointerId); fig.classList.add('is-live'); move(e); });
    fig.addEventListener('pointerup',    (e) => { if (e.pointerType !== 'mouse') fig.classList.remove('is-live'); });
    fig.addEventListener('pointercancel',()  => fig.classList.remove('is-live'));
    fig.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse' || e.buttons || fig.hasPointerCapture?.(e.pointerId)) move(e);
    });
  });
}
initXray();
onEnvChange(initXray);
```

**Note on `--x` inheritance.** `--x` / `--y` are set on the `<figure>` so both the lens and the
inner copy read the same value in one write — this is why the counter-translate stays in perfect
register with no second measurement.

---

# 6. Mask reveal on hover

**What it is.** A panel of content (caption, price, CTA) slides up from behind the bottom edge of
a card while the card's image drifts slightly — a "curtain" reveal.

**When to use it.** Project grids, menu items, team cards, portfolio tiles, product tiles.
Register: universal — this is the workhorse. A joinery firm and a Michelin restaurant both use it.

**Why native.** `overflow: hidden` on the wrapper plus `transform: translateY(100%) → 0` on the
inner panel. Pure compositor. No `mask-image` animation (that repaints), no `height` animation
(that reflows).

```html
<article class="reveal">
  <a class="reveal__link" href="/projects/oak-extension">
    <div class="reveal__media" aria-hidden="true"></div>
    <div class="reveal__panel">
      <h3 class="reveal__title">Oak-framed extension</h3>
      <p class="reveal__meta">Structural &amp; joinery — Ilkley, 2026</p>
    </div>
  </a>
</article>
```

```css
.reveal { position: relative; border-radius: var(--radius); overflow: hidden; background: var(--bg-2); }
.reveal__link { display: block; color: inherit; text-decoration: none; }

.reveal__media {
  aspect-ratio: 4 / 5;
  background: var(--tile, linear-gradient(140deg, var(--accent), var(--accent-2)));
  transform: scale(1);
  transition: transform var(--dur-slow) var(--ease-out);
}

.reveal__panel {
  position: absolute;
  inset: auto 0 0 0;
  padding: 1.1rem;
  background: linear-gradient(transparent, oklch(0% 0 0 / .82) 38%);
  color: oklch(100% 0 0);
  /* Everything below the title starts pushed down behind the edge. */
  transform: translateY(var(--hide, 0px));
  transition: transform var(--dur-slow) var(--ease-out);
}
.reveal__meta {
  margin: .35rem 0 0;
  opacity: 1;
  transform: translateY(0);
  transition: opacity var(--dur-base) var(--ease-out) 80ms,
              transform var(--dur-base) var(--ease-out) 80ms;
}

@media (hover: hover) and (pointer: fine) {
  /* Rest state: hide the meta line behind the edge. Its own height, measured in CSS. */
  .reveal__meta { opacity: 0; transform: translateY(120%); }
  .reveal__panel { --hide: 0px; }
  .reveal__link:hover .reveal__media,
  .reveal__link:focus-visible .reveal__media { transform: scale(1.045); }
  .reveal__link:hover .reveal__meta,
  .reveal__link:focus-visible .reveal__meta { opacity: 1; transform: translateY(0); }
}

/* ---- Touch strategy A: ship the end state ----
   Everything is already visible. No tap needed to read the meta line, no double-tap trap,
   and the whole card is the link. */
@media (hover: none) {
  .reveal__meta { opacity: 1; transform: none; }
  .reveal__link:active .reveal__media { transform: scale(.99); transition-duration: 120ms; }
}

/* ---- Law 2: content visible, no travel, no scale. ---- */
@media (prefers-reduced-motion: reduce) {
  .reveal__media { transform: none !important; transition: none; }
  .reveal__meta { opacity: 1 !important; transform: none !important; transition: none; }
  .reveal__link:hover .reveal__panel { background: linear-gradient(transparent, oklch(0% 0 0 / .92) 30%); }
}
```

**Scroll-triggered sibling.** If you want the same panel to reveal on scroll rather than hover
(which is what touch users get on a long page), use a `view()` timeline — always `@supports`-guarded,
because scroll-driven animations are **not Baseline** (Chrome 115+, FF 132+, Safari 18+, ~84%):

```css
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .reveal { animation: card-in linear both; animation-timeline: view(); animation-range: entry 10% cover 34%; }
    @keyframes card-in { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: none; } }
  }
}
```
Browsers without support get the card at its final state — which is exactly what the keyframe's
`to` block already is. No polyfill, no `IntersectionObserver` needed for this one.

---

# 7. Liquid / gooey effect (SVG filter)

**What it is.** Two or more blobs that merge and separate with surface tension, like mercury.
Achieved with `feGaussianBlur` → `feColorMatrix` alpha contrast (blur, then crush the alpha ramp
so overlapping soft edges snap into one hard silhouette).

**When to use it.** A single decorative hero accent, a loading indicator, a logo flourish, an
"add to basket" confirmation splash. Register: beauty, wellness, food, kids, creative studio.
**Wrong** for law, finance, engineering — it reads as unserious.

**Performance flag (Law 3, exception 1).** `filter: url()` rasterises the filtered subtree every
frame. Budget: one instance per page, container under ~420px, ≤ 5 blobs, filter removed on touch.
**Never put text inside a gooey container** — the blur pass destroys subpixel antialiasing.

```html
<div class="goo" aria-hidden="true">
  <span class="goo__b" style="--d:0s"></span>
  <span class="goo__b" style="--d:-1.6s"></span>
  <span class="goo__b" style="--d:-3.1s"></span>
</div>

<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
  <filter id="goo-filter">
    <feGaussianBlur in="SourceGraphic" stdDeviation="11" result="b"/>
    <!-- crush the alpha ramp: 19x alpha, -9 offset -> soft overlaps become one solid shape -->
    <feColorMatrix in="b" mode="matrix"
      values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" result="goo"/>
    <feBlend in="SourceGraphic" in2="goo"/>
  </filter>
</svg>
```

```css
.goo {
  position: relative;
  width: min(380px, 80vw);
  aspect-ratio: 1;
  filter: url(#goo-filter);
  /* Fallback if the filter fails to resolve: blobs are still pleasant circles. */
}
.goo__b {
  position: absolute;
  inset: 30%;
  border-radius: 50%;
  background: var(--accent);
  animation: goo-drift 7.5s var(--ease-soft) infinite;
  animation-delay: var(--d);
}
.goo__b:nth-child(2) { background: var(--accent-2); }
.goo__b:nth-child(3) { background: color-mix(in oklch, var(--accent) 50%, var(--accent-2)); }

/* transform-only orbit */
@keyframes goo-drift {
  0%   { transform: translate3d(0, 0, 0) scale(1); }
  25%  { transform: translate3d(58%, -34%, 0) scale(1.18); }
  50%  { transform: translate3d(20%, 52%, 0) scale(.82); }
  75%  { transform: translate3d(-52%, 12%, 0) scale(1.1); }
  100% { transform: translate3d(0, 0, 0) scale(1); }
}

@media (hover: hover) and (pointer: fine) {
  .goo:hover .goo__b { animation-duration: 3.4s; }   /* speeds up, stays in phase */
}

/* ---- Touch strategy C: drop the filter, keep the shapes ----
   Mobile GPUs pay the most for filter rasterisation and gain the least (small screen,
   short sessions). Plain overlapping translucent circles still look deliberate. */
@media (hover: none), (pointer: coarse) {
  .goo { filter: none; }
  .goo__b { mix-blend-mode: multiply; opacity: .85; animation-duration: 11s; }
}

/* ---- Law 2: freeze mid-merge. A static gooey shape is a *shape*, not motion,
   so we keep the filter and stop the drift. ---- */
@media (prefers-reduced-motion: reduce) {
  .goo__b { animation: none; }
  .goo__b:nth-child(1) { transform: translate3d(-14%, -8%, 0) scale(1.05); }
  .goo__b:nth-child(2) { transform: translate3d(22%, 6%, 0) scale(.95); }
  .goo__b:nth-child(3) { transform: translate3d(2%, 26%, 0) scale(.88); }
  .goo:hover .goo__b { animation: none; }
}
```

**Two gotchas.** (1) A `<base href>` in `<head>` breaks fragment-only filter URLs — write
`filter: url(#goo-filter)` and remove the `<base>`, or use an absolute URL. (2) Combining
`filter: url()` with `backdrop-filter` on the same subtree is unreliable in WebKit; pick one.

---

# 8. Image scratch (reveal by "scratching")

**What it is.** A `<canvas>` coating sits over the real content; dragging erases it with
`destination-out` compositing. Past a threshold the remaining coating fades away on its own.

**When to use it.** A single playful moment: a discount code, a "reveal your quote", a before/after
on a landing page, an easter egg in an About section. Register: retail, hospitality, fitness,
salon, seasonal campaign. One per site.

**Why native.** Canvas 2D + Pointer Events. `getCoalescedEvents()` gives sub-frame sample points
so fast drags draw a smooth stroke instead of a dotted line.

**Touch strategy B — and note this effect is *already* a gesture.** Scratching is press-and-drag
on both mouse and touch. Nothing degrades; the code path is identical. What changes: `touch-action:
none` on the canvas so the page does not scroll under the finger, and a larger brush radius
(a fingertip is coarser than a cursor).

```html
<div class="scratch">
  <div class="scratch__prize">
    <p class="scratch__eyebrow">Your code</p>
    <p class="scratch__code">FIRSTFIT-15</p>
  </div>
  <canvas class="scratch__coat" aria-hidden="true"></canvas>
  <button class="scratch__skip" type="button">Reveal without scratching</button>
  <p class="sr-only" role="status" data-scratch-status></p>
</div>
```

```css
.scratch {
  position: relative;
  display: grid;
  place-items: center;
  aspect-ratio: 5 / 2;
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--bg-2);
  border: 1px solid var(--line);
}
.scratch__prize { text-align: center; }
.scratch__code { font-size: clamp(1.4rem, 5vw, 2.2rem); font-weight: 700; letter-spacing: .04em; }

.scratch__coat {
  position: absolute;
  inset: 0;
  width: 100%; height: 100%;
  touch-action: none;                 /* we own the gesture */
  cursor: crosshair;
  opacity: 1;
  transition: opacity 420ms var(--ease-out);
}
.scratch.is-done .scratch__coat { opacity: 0; pointer-events: none; }

/* Keyboard / assistive escape hatch — always present, visually quiet until focused. */
.scratch__skip {
  position: absolute; inset: auto .5rem .5rem auto; z-index: 2;
  font-size: .72rem; padding: .3rem .55rem; border-radius: 8px;
  border: 1px solid var(--line); background: var(--bg); color: var(--ink-2);
  opacity: .0;
}
.scratch__skip:focus-visible, .scratch:hover .scratch__skip { opacity: 1; }
@media (hover: none) { .scratch__skip { opacity: 1; } }   /* always offered on touch */

/* ---- Law 2: no scratching at all. The coating is never drawn; the prize is just there. ---- */
@media (prefers-reduced-motion: reduce) {
  .scratch__coat { display: none; }
  .scratch__skip { display: none; }
}
```

```js
import { reduced } from './fx-core.js';

document.querySelectorAll('.scratch').forEach((root) => {
  const cv = root.querySelector('.scratch__coat');
  const skip = root.querySelector('.scratch__skip');
  const status = root.querySelector('[data-scratch-status]');
  const done = () => {
    if (root.classList.contains('is-done')) return;
    root.classList.add('is-done');
    status.textContent = 'Code revealed.';
  };

  skip.addEventListener('click', done);
  if (reduced()) { done(); return; }              // Law 2: nothing to scratch

  const ctx = cv.getContext('2d', { willReadFrequently: true });
  let dpr = 1, drawing = false, sinceCheck = 0;

  function paintCoat() {
    dpr = Math.min(devicePixelRatio || 1, 2);     // cap DPR: 3x on a phone is wasted fill-rate
    const r = cv.getBoundingClientRect();
    cv.width = Math.round(r.width * dpr);
    cv.height = Math.round(r.height * dpr);
    const g = ctx.createLinearGradient(0, 0, cv.width, cv.height);
    g.addColorStop(0, '#9aa3ad'); g.addColorStop(.5, '#c9d1d9'); g.addColorStop(1, '#8b949e');
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.font = `${14 * dpr}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Scratch here', cv.width / 2, cv.height / 2 + 5 * dpr);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = ctx.lineJoin = 'round';
  }
  paintCoat();
  new ResizeObserver(() => { if (!root.classList.contains('is-done')) paintCoat(); }).observe(cv);

  const pt = (e) => {
    const r = cv.getBoundingClientRect();
    return [(e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr];
  };
  const brush = (e) => (e.pointerType === 'mouse' ? 26 : 40) * dpr;  // fingers are coarser

  cv.addEventListener('pointerdown', (e) => {
    drawing = true;
    cv.setPointerCapture(e.pointerId);
    ctx.lineWidth = brush(e);
    ctx.beginPath();
    ctx.moveTo(...pt(e));
    ctx.lineTo(...pt(e));                          // a single tap still marks
    ctx.stroke();
  });
  cv.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    ctx.lineWidth = brush(e);
    // Sub-frame samples: smooth strokes on fast drags without any interpolation maths.
    for (const s of (e.getCoalescedEvents?.() ?? [e])) ctx.lineTo(...pt(s));
    ctx.stroke();
    if (++sinceCheck > 6) { sinceCheck = 0; if (cleared() > 0.5) done(); }
  });
  const stop = () => { drawing = false; if (cleared() > 0.5) done(); };
  cv.addEventListener('pointerup', stop);
  cv.addEventListener('pointercancel', stop);

  /** Sample every 16th pixel — 1/256 of the work, identical answer at this precision. */
  function cleared() {
    const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
    let clear = 0, total = 0;
    for (let i = 3; i < d.length; i += 4 * 16) { total++; if (d[i] < 24) clear++; }
    return clear / total;
  }
});
```

---

# 9. Pixel load-in

**What it is.** A grid of small squares dissolves away (or in) with randomised delays, revealing
the content behind. A digital-dither entrance.

**When to use it.** A hero image entrance, a section transition, a card that "materialises" on
first scroll into view. Register: tech, gaming, motorsport, print, music. Not for wellness or
heritage brands.

**Why native + IntersectionObserver.** This is a *scroll/enter* effect, not a hover effect — which
is precisely why it works identically on touch. JS builds the grid once; CSS runs the animation.

**Node budget.** Cap at **240 tiles** (e.g. 20×12). Each tile animates `transform` + `opacity`
only, they share one stacking context, and they are removed from the DOM after the animation ends
so there is no residual cost.

```html
<div class="pix" data-pix-cols="20" data-pix-rows="12">
  <div class="pix__content"><h2>Precision, on schedule.</h2></div>
  <!-- .pix__grid injected here -->
</div>
```

```css
.pix { position: relative; overflow: hidden; border-radius: var(--radius); }
.pix__grid {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(var(--cols), 1fr);
  grid-template-rows: repeat(var(--rows), 1fr);
  pointer-events: none;
}
.pix__t {
  background: var(--bg);
  transform: scale(1);
  opacity: 1;
  /* will-change deliberately omitted: 240 promoted layers would blow the layer budget. */
}
.pix.is-in .pix__t {
  animation: pix-out 480ms var(--ease-out) forwards;
  animation-delay: calc(var(--d) * 1ms);
}
@keyframes pix-out {
  to { transform: scale(.35); opacity: 0; }
}

/* ---- Touch strategy: none needed. It is IntersectionObserver-driven, identical everywhere.
   The only concession: fewer tiles on small screens (set in JS from the media query). ---- */

/* ---- Law 2: no dissolve. The grid is never built (see JS); if it was, kill it. ---- */
@media (prefers-reduced-motion: reduce) {
  .pix__grid { display: none; }
}
```

```js
import { reduced } from './fx-core.js';

const io = new IntersectionObserver((entries, obs) => {
  for (const en of entries) {
    if (!en.isIntersecting) continue;
    en.target.classList.add('is-in');
    obs.unobserve(en.target);
    // Tear the grid down once the last tile has finished — zero residual DOM cost.
    const grid = en.target.querySelector('.pix__grid');
    grid?.addEventListener('animationend', () => grid.remove(), { once: false });
    setTimeout(() => grid?.remove(), 1400);
  }
}, { threshold: 0.25 });

document.querySelectorAll('.pix').forEach((el) => {
  if (reduced()) return;                                     // Law 2: never build it
  const small = matchMedia('(max-width: 700px)').matches;
  const cols = small ? 10 : (+el.dataset.pixCols || 20);
  const rows = small ? 7  : (+el.dataset.pixRows || 12);
  if (cols * rows > 240) console.warn('pix: over tile budget', cols * rows);

  const grid = document.createElement('div');
  grid.className = 'pix__grid';
  grid.setAttribute('aria-hidden', 'true');
  grid.style.setProperty('--cols', cols);
  grid.style.setProperty('--rows', rows);

  const frag = document.createDocumentFragment();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const t = document.createElement('i');
      t.className = 'pix__t';
      // Diagonal sweep + jitter: reads as intentional, not as random noise.
      const wave = (c / cols + r / rows) * 340;
      t.style.setProperty('--d', Math.round(wave + Math.random() * 180));
      frag.append(t);
    }
  }
  grid.append(frag);
  el.append(grid);
  io.observe(el);
});
```

**Single-element alternative (no DOM cost).** A `repeating-conic-gradient` mask with an animated
`mask-size` gives a similar dither with one node — but `mask-size` animation repaints every frame,
which is worse than 240 composited tiles for anything above ~200px. Use the grid.

---

# 10. Gooey dropdown

**What it is.** Menu items that appear to *stretch out of* the trigger button and detach, using
the same `feGaussianBlur`/`feColorMatrix` filter as #7 while each item translates down with a
stagger.

**When to use it.** A single, short, playful menu — a share menu, a "book / call / directions"
trio, a language switcher of three. Register: same as #7 (beauty, food, wellness, creative).
Maximum 5 items; more and the goo turns to soup.

**Why native.** `popover` gives light dismiss, Escape, and top-layer stacking with no JS. The goo
is CSS + one SVG filter. The stagger is `transition-delay`, not a JS timeline.

**Text warning.** Because the filter destroys text antialiasing, the goo filter is applied to a
**background layer only** — an absolutely positioned set of blobs behind the labels. The labels
sit in an unfiltered sibling. This is the difference between a slick menu and a blurry one.

```html
<div class="gdrop">
  <button class="gdrop__btn" popovertarget="gdrop-1" aria-label="Contact options">+</button>
  <div class="gdrop__menu" id="gdrop-1" popover>
    <span class="gdrop__goo" aria-hidden="true">
      <i style="--i:0"></i><i style="--i:1"></i><i style="--i:2"></i>
    </span>
    <a href="tel:..."      style="--i:0">Call</a>
    <a href="/book"        style="--i:1">Book</a>
    <a href="/directions"  style="--i:2">Directions</a>
  </div>
</div>
```

```css
.gdrop { position: relative; display: inline-block; }
.gdrop__btn {
  anchor-name: --gdrop-1;
  width: 52px; aspect-ratio: 1; border-radius: 50%;
  border: 0; background: var(--accent); color: oklch(100% 0 0);
  font-size: 1.5rem; line-height: 1; cursor: pointer;
  transition: transform var(--dur-base) var(--ease-spring);
}
.gdrop__btn:has(+ .gdrop__menu:popover-open) { transform: rotate(135deg); }

.gdrop__menu {
  --gi-w: 100px; --gi-h: 40px; --gi-step: 48px;
  margin: 0; padding: 0; border: 0; background: none; overflow: visible;
  /* Explicit box: the children are absolutely positioned, so fit-content would collapse to 0. */
  width: var(--gi-w);
  height: calc(var(--gi-h) + var(--gi-step) * 2);
}
@supports (anchor-name: --a) {
  .gdrop__menu { position: absolute; position-anchor: --gdrop-1; position-area: block-end center;
                 margin-block-start: 10px; position-try-fallbacks: flip-block; }
}
@supports not (anchor-name: --a) {
  .gdrop__menu { position: absolute; inset: auto auto -10px 50%; translate: -50% 100%; }
}

/* Items and goo blobs share one geometry: stacked at the origin, pushed apart by transform. */
.gdrop__menu a,
.gdrop__goo i {
  position: absolute; left: 0; top: 0;
  width: var(--gi-w); height: var(--gi-h);
  border-radius: 999px;
  /* Collapsed: all three sit on the trigger, scaled down. */
  transform: translateY(calc(var(--i) * -12px - 12px)) scale(.6);
  transition: transform var(--dur-base) var(--ease-spring);
  transition-delay: calc(var(--i) * 45ms);
}
.gdrop__menu a {
  z-index: 1;                                  /* above the goo layer, and UNFILTERED */
  display: grid; place-items: center;
  color: oklch(100% 0 0); font-size: .85rem; font-weight: 600; text-decoration: none;
  opacity: 0;
  transition: transform var(--dur-base) var(--ease-spring), opacity 160ms linear;
  transition-delay: calc(var(--i) * 45ms);
}
/* The goo layer: identical geometry, filtered, no text inside it. */
.gdrop__goo { position: absolute; inset: 0; z-index: 0; filter: url(#goo-filter); }
.gdrop__goo i { background: var(--accent); }

.gdrop__menu:popover-open a,
.gdrop__menu:popover-open .gdrop__goo i {
  transform: translateY(calc(var(--i) * var(--gi-step))) scale(1);
  opacity: 1;
}
@starting-style {
  .gdrop__menu:popover-open a { opacity: 0; }
}

/* ---- Touch strategy B: it is already tap-driven (popovertarget). Drop the filter. ---- */
@media (hover: none), (pointer: coarse) {
  .gdrop__goo { filter: none; }
  .gdrop__menu { --gi-w: 108px; --gi-h: 46px; --gi-step: 54px; }   /* 44px minimum target */
}

/* ---- Law 2: instant, no stretch, no stagger, no rotation. ---- */
@media (prefers-reduced-motion: reduce) {
  .gdrop__btn { transition: none; }
  .gdrop__btn:has(+ .gdrop__menu:popover-open) { transform: none; background: var(--ink); }
  .gdrop__goo { filter: none; }
  .gdrop__menu a, .gdrop__goo i {
    transition: none; transition-delay: 0s;
    transform: translateY(calc(var(--i) * var(--gi-step))); opacity: 1;
  }
}
```

**A11y.** `popover` handles Escape and outside-click. Add roving arrow-key navigation if the menu
exceeds three items; below that, Tab order is sufficient and expected.

---

# 11. Animated nav selector (pill that slides between items)

**What it is.** A single rounded highlight that travels from the old active tab to the new one.

**When to use it.** Primary nav, filter tab rows, pricing period toggles (monthly/yearly),
segmented controls. Register: universal.

**Why native — and this is the flagship case for View Transitions.** Same-document View
Transitions went **Baseline newly available in October 2025** (Chrome 111+, Firefox 133+,
Safari 18+). Give the pill a `view-transition-name`, move it in the DOM, and the browser tweens
position and size for you — no `getBoundingClientRect`, no FLIP maths, no library.

```html
<nav class="pills" aria-label="Sections">
  <a href="#work"    class="pills__i is-on">Work<span class="pills__pill"></span></a>
  <a href="#studio"  class="pills__i">Studio</a>
  <a href="#contact" class="pills__i">Contact</a>
</nav>
```

```css
.pills { display: inline-flex; gap: 2px; padding: 4px; border-radius: 999px; background: var(--bg-2); }
.pills__i {
  position: relative;
  padding: .5rem 1rem;
  border-radius: 999px;
  color: var(--ink-2);
  text-decoration: none;
  font-size: .9rem; font-weight: 600;
  transition: color var(--dur-base) var(--ease-out);
}
.pills__i.is-on { color: var(--bg); }
.pills__pill {
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  background: var(--ink);
  view-transition-name: nav-pill;      /* the whole trick */
}

/* The browser's default group animation is already a transform+size tween. Tune it: */
::view-transition-group(nav-pill) {
  animation-duration: 380ms;
  animation-timing-function: var(--ease-spring);
}
::view-transition-old(nav-pill),
::view-transition-new(nav-pill) { animation: none; }   /* no crossfade, just the move */

@media (hover: hover) and (pointer: fine) {
  .pills__i:hover { color: var(--ink); }
  .pills__i.is-on:hover { color: var(--bg); }
}

/* ---- Touch strategy: none needed. The pill moves on *activation*, not on hover.
   Tap and click take identical paths. Only the hover tint is gated (above). ---- */

/* ---- Law 2 ---- */
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(nav-pill) { animation-duration: 1ms; }
  .pills__i { transition: none; }
}
```

```js
import { reduced } from './fx-core.js';

document.querySelectorAll('.pills').forEach((nav) => {
  const pill = nav.querySelector('.pills__pill');
  nav.addEventListener('click', (e) => {
    const item = e.target.closest('.pills__i');
    if (!item || item.classList.contains('is-on')) return;
    e.preventDefault();

    const apply = () => {
      nav.querySelector('.is-on')?.classList.remove('is-on');
      item.classList.add('is-on');
      item.append(pill);                     // DOM move — VT tweens it from A to B
    };

    // Feature-detect + Law 2. Both fall through to an instant, correct swap.
    if (reduced() || !document.startViewTransition) apply();
    else document.startViewTransition(apply);
  });
});
```

**Fallback for browsers without View Transitions.** Keep one absolutely-positioned pill and drive
it with `translateX` + `scaleX` from measured rects. Honest caveat: `scaleX` squashes a
`border-radius: 999px` during the 380ms transit (it lands correct). That elastic squash is what
most segmented controls ship and it reads as deliberate. If you cannot accept it, use option B:
crossfade the pill's `opacity` between two static positions instead of sliding.

```js
/* Fallback only. Runs when document.startViewTransition is undefined. */
function slideFallback(nav, item) {
  const pill = nav.querySelector('.pills__pill--fixed');
  const n = nav.getBoundingClientRect(), r = item.getBoundingClientRect();
  const base = +pill.dataset.baseW || (pill.dataset.baseW = pill.getBoundingClientRect().width);
  pill.style.transform = `translateX(${r.left - n.left}px) scaleX(${r.width / base})`;
}
```

**Zero-JS variant.** For *equal-width* tabs only, `:has()` positions the pill with no script:

```css
.pills:has(.pills__i:nth-child(1):hover) { --sel: 0; }
.pills:has(.pills__i:nth-child(2):hover) { --sel: 1; }
.pills:has(.pills__i:nth-child(3):hover) { --sel: 2; }
.pills__pill--fixed { transform: translateX(calc(var(--sel, 0) * 100%)); transition: transform var(--dur-base) var(--ease-spring); }
```

---

# 12. 3D letter testimonials

**What it is.** A quote card on a perspective stage. The card tilts toward the cursor, and the
individual words of the quote sit at different `translateZ` depths so they parallax against each
other as it turns.

**When to use it.** A testimonials section that has to carry real weight — one featured quote,
not a wall of twelve. Register: luxury service, consultancy, hospitality, high-ticket trades.

**Why native.** CSS 3D transforms plus a two-variable pointer read. No 3D library — the depth is
just `translateZ` on inline spans.

```html
<figure class="quote3d">
  <blockquote class="quote3d__card">
    <p class="quote3d__txt">They rebuilt the roof in four days and left the garden cleaner than they found it.</p>
    <footer class="quote3d__by">— H. Okonkwo, Leeds</footer>
  </blockquote>
</figure>
```

```css
.quote3d { perspective: 900px; margin: 0; }
.quote3d__card {
  --rx: 0deg; --ry: 0deg;
  transform-style: preserve-3d;
  padding: clamp(1.5rem, 4vw, 2.6rem);
  border-radius: var(--radius);
  background: linear-gradient(150deg, var(--bg-2), var(--bg));
  border: 1px solid var(--line);
  box-shadow: 0 30px 60px -30px oklch(0% 0 0 / .45);
  transform: rotateX(var(--rx)) rotateY(var(--ry));
  transition: transform 420ms var(--ease-out);
}
.quote3d.is-live .quote3d__card { transition: none; }   /* live tracking, spring on exit */

.quote3d__txt { font-size: clamp(1.1rem, 2.6vw, 1.7rem); line-height: 1.35; margin: 0; }
.quote3d__w {
  display: inline-block;
  white-space: pre;
  transform-style: preserve-3d;
  /* Whole-pixel Z values only: fractional translateZ blurs text in Chromium. */
  transform: translateZ(var(--z, 0px));
}
.quote3d__by { margin-top: 1.2rem; color: var(--ink-2); font-size: .85rem; transform: translateZ(6px); }

/* ---- Touch strategy A: ship the end state, flat ----
   No cursor to tilt toward, and deviceorientation is both permission-gated on iOS and
   itself a motion source. The card stays flat; depth survives as layered shadow. ---- */
@media (hover: none), (pointer: coarse) {
  .quote3d { perspective: none; }
  .quote3d__card { transform: none !important; transition: none; }
  .quote3d__w { transform: none !important; }
}

/* ---- Law 2 ---- */
@media (prefers-reduced-motion: reduce) {
  .quote3d { perspective: none; }
  .quote3d__card { transform: none !important; transition: none; }
  .quote3d__w { transform: none !important; }
}
```

```js
import { canHover, reduced, isMouse, rafWrite, clamp } from './fx-core.js';

/* Split into WORDS, not characters: a 90-character quote would be 90 layout nodes. */
document.querySelectorAll('.quote3d__txt').forEach((p) => {
  const words = p.textContent.trim().split(/(\s+)/);
  p.textContent = '';
  words.forEach((w, i) => {
    if (!w.trim()) { p.append(w); return; }
    const s = document.createElement('span');
    s.className = 'quote3d__w';
    s.style.setProperty('--z', `${[0, 14, 6, 22, 10][i % 5]}px`);  // whole px, repeating rhythm
    s.textContent = w;
    p.append(s);
  });
});

if (canHover() && !reduced()) {
  document.querySelectorAll('.quote3d').forEach((fig) => {
    const write = rafWrite();
    let box;
    fig.addEventListener('pointerenter', (e) => {
      if (!isMouse(e)) return;
      box = fig.getBoundingClientRect();
      fig.classList.add('is-live');
    });
    fig.addEventListener('pointermove', (e) => {
      if (!isMouse(e) || !box) return;
      const px = (e.clientX - box.left) / box.width - .5;
      const py = (e.clientY - box.top) / box.height - .5;
      write(() => {
        const card = fig.querySelector('.quote3d__card');
        card.style.setProperty('--ry', `${clamp(px * 14, -9, 9).toFixed(2)}deg`);
        card.style.setProperty('--rx', `${clamp(-py * 12, -8, 8).toFixed(2)}deg`);
      });
    });
    fig.addEventListener('pointerleave', () => {
      fig.classList.remove('is-live');                 // transition comes back, springs home
      const card = fig.querySelector('.quote3d__card');
      card.style.removeProperty('--rx');
      card.style.removeProperty('--ry');
    });
  });
}
```

**Cap the tilt at ±9°.** Beyond that the text edge-antialiasing degrades and the card reads as a
gimmick rather than as material.

---

# 13. Depth globe

**What it is.** Points (service areas, clients, offices, skills) distributed evenly on a sphere
that rotates slowly, with items behind the equator dimmed and scaled down.

**When to use it.** "Where we work" on a firm with multiple regions; a technology stack; a
client logo cloud. Register: consultancy, logistics, tech, export businesses. One per site,
usually in an About or Coverage section.

**Why native, and why not a 3D library.** A Fibonacci lattice of ≤ 60 points, each positioned
once with `translate3d`, inside a `preserve-3d` wrapper that a CSS keyframe rotates. Zero
per-frame JS, no WebGL context, no shader compile, ~4 KB of code. A 3D library here buys nothing
and costs 150 KB.

```html
<div class="globe" data-globe-points="Leeds,Manchester,Sheffield,York,Hull,Bradford,Newcastle,Liverpool">
  <div class="globe__stage"><div class="globe__sphere"></div></div>
  <ul class="sr-only" data-globe-list></ul>   <!-- the real, readable content -->
</div>
```

```css
.globe { --r: 150px; display: grid; place-items: center; perspective: 1100px; }
.globe__stage { width: calc(var(--r) * 2); aspect-ratio: 1; transform-style: preserve-3d; transform: rotateX(-16deg); }
.globe__sphere {
  position: relative;
  width: 100%; height: 100%;
  transform-style: preserve-3d;
  animation: globe-spin 34s linear infinite;
  cursor: grab;
  touch-action: none;
}
.globe__sphere:active { cursor: grabbing; }
.globe.is-dragging .globe__sphere { animation: none; transform: rotateY(var(--gy, 0deg)) rotateX(var(--gx, 0deg)); }

@keyframes globe-spin { to { transform: rotateY(360deg); } }

.globe__p {
  position: absolute;
  left: 50%; top: 50%;
  padding: .28rem .6rem;
  border-radius: 999px;
  font-size: .74rem; white-space: nowrap;
  background: var(--bg-2); color: var(--ink); border: 1px solid var(--line);
  /* Position set once by JS; billboard so labels always face the viewer. */
  transform: translate(-50%, -50%) translate3d(var(--px), var(--py), var(--pz));
  /* Depth cue without per-frame JS: the counter-rotating billboard wrapper handles facing. */
  backface-visibility: hidden;
  transition: background-color var(--dur-fast) linear, color var(--dur-fast) linear;
}
@media (hover: hover) and (pointer: fine) {
  .globe__p:hover { background: var(--accent); color: oklch(100% 0 0); }
  .globe:hover .globe__sphere { animation-play-state: paused; }
}

/* ---- Touch strategy B: promote to a gesture ----
   Drag to rotate (pointer capture). Auto-spin resumes 2s after release.
   Hover-highlight is gone; the sr-only list below is the accessible equivalent. ---- */
@media (hover: none) {
  .globe { --r: 118px; }         /* smaller footprint on a phone */
}

/* ---- Law 2: no auto-rotation. The globe holds a good static angle.
   User-initiated dragging is still permitted — it is direct manipulation, not autoplay. ---- */
@media (prefers-reduced-motion: reduce) {
  .globe__sphere { animation: none; transform: rotateY(-28deg); }
  .globe:hover .globe__sphere { animation: none; }
}
```

```js
import { clamp } from './fx-core.js';

document.querySelectorAll('.globe').forEach((root) => {
  const sphere = root.querySelector('.globe__sphere');
  const labels = (root.dataset.globePoints || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 60);
  const R = parseFloat(getComputedStyle(root).getPropertyValue('--r')) || 150;

  // Accessible equivalent of the visual: a plain list, always in the DOM.
  const list = root.querySelector('[data-globe-list]');
  labels.forEach(t => { const li = document.createElement('li'); li.textContent = t; list.append(li); });

  // Fibonacci lattice — even distribution, no clustering at the poles.
  const golden = Math.PI * (3 - Math.sqrt(5));
  labels.forEach((text, i) => {
    const y = 1 - (i / Math.max(labels.length - 1, 1)) * 2;
    const rad = Math.sqrt(1 - y * y);
    const th = golden * i;
    const el = document.createElement('span');
    el.className = 'globe__p';
    el.setAttribute('aria-hidden', 'true');            // the sr-only <ul> is the real content
    el.textContent = text;
    el.style.setProperty('--px', `${(Math.cos(th) * rad * R).toFixed(1)}px`);
    el.style.setProperty('--py', `${(y * R).toFixed(1)}px`);
    el.style.setProperty('--pz', `${(Math.sin(th) * rad * R).toFixed(1)}px`);
    sphere.append(el);
  });

  // Drag to rotate — works for mouse, touch and pen with one code path.
  let gx = -16, gy = 0, last = null, resume;
  sphere.addEventListener('pointerdown', (e) => {
    sphere.setPointerCapture(e.pointerId);
    clearTimeout(resume);
    root.classList.add('is-dragging');
    last = { x: e.clientX, y: e.clientY };
  });
  sphere.addEventListener('pointermove', (e) => {
    if (!last) return;
    gy += (e.clientX - last.x) * 0.4;
    gx = clamp(gx - (e.clientY - last.y) * 0.3, -60, 60);
    last = { x: e.clientX, y: e.clientY };
    sphere.style.setProperty('--gy', `${gy.toFixed(1)}deg`);
    sphere.style.setProperty('--gx', `${gx.toFixed(1)}deg`);
  });
  const release = () => {
    last = null;
    // Resume auto-spin unless the user asked for reduced motion.
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      resume = setTimeout(() => root.classList.remove('is-dragging'), 2000);
    }
  };
  sphere.addEventListener('pointerup', release);
  sphere.addEventListener('pointercancel', release);
});
```

**Label legibility.** Labels on the far side render mirrored unless you counter-rotate them.
`backface-visibility: hidden` is the cheap fix used above: back-facing labels simply disappear,
which also removes the visual noise. If you need them visible, wrap each label in a billboard
element counter-rotated by `rotateY(calc(var(--spin) * -1))` — that requires an animated
`@property`, so weigh the repaint cost.

---

# 14. Click-to-copy with confirmation state

**What it is.** A button that copies a phone number, an account reference, a discount code, or a
snippet, and confirms with an icon swap plus a live-region announcement.

**When to use it.** Every phone number, email address, IBAN, VAT number, booking reference, and
address on the site. Register: universal, and genuinely useful — this is the highest-utility item
in the file.

**Why native.** `navigator.clipboard.writeText` (secure contexts only). No hover dependency at
all — it is a click, so touch and mouse are identical.

```html
<button class="copy" type="button" data-copy="0113 496 0021">
  <span class="copy__val">0113 496 0021</span>
  <span class="copy__ico" aria-hidden="true">
    <svg class="copy__i copy__i--idle" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
    <svg class="copy__i copy__i--ok" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg>
  </span>
  <span class="sr-only">Copy phone number</span>
</button>
<p class="sr-only" role="status" data-copy-status></p>
```

```css
.copy {
  display: inline-flex; align-items: center; gap: .6rem;
  padding: .55rem .8rem;
  border: 1px solid var(--line); border-radius: 10px;
  background: var(--bg); color: var(--ink);
  font: inherit; cursor: pointer;
  transition: transform var(--dur-fast) var(--ease-out),
              border-color var(--dur-fast) linear;
}
.copy__val { font-variant-numeric: tabular-nums; }
.copy__ico { position: relative; display: grid; place-items: center; width: 16px; height: 16px; }
.copy__i {
  grid-area: 1 / 1;
  transition: opacity var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-spring);
}
.copy__i--ok   { opacity: 0; transform: scale(.4); color: var(--ok); }
.copy__i--idle { opacity: 1; transform: scale(1); }
.copy.is-ok .copy__i--ok   { opacity: 1; transform: scale(1); }
.copy.is-ok .copy__i--idle { opacity: 0; transform: scale(.4); }
.copy.is-ok { border-color: var(--ok); }

/* ---- Touch strategy: identical. It is a tap, not a hover. Only the lift is gated. ---- */
@media (hover: hover) and (pointer: fine) {
  .copy:hover { transform: translateY(-1px); border-color: var(--ink-2); }
}
.copy:active { transform: scale(.98); }

/* ---- Law 2: no bounce, no lift. The icon swaps instantly; the live region still fires. ---- */
@media (prefers-reduced-motion: reduce) {
  .copy, .copy__i { transition: none; }
  .copy:hover, .copy:active { transform: none; }
  .copy__i--ok, .copy.is-ok .copy__i--idle { transform: none; }
}
```

```js
document.querySelectorAll('.copy').forEach((btn) => {
  const status = document.querySelector('[data-copy-status]');
  let t;
  btn.addEventListener('click', async () => {
    const text = btn.dataset.copy ?? btn.querySelector('.copy__val')?.textContent ?? '';
    let ok = false;
    try {
      // Requires a secure context (https or localhost). Fails silently on file://.
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      // Honest fallback: select the text so ⌘C / long-press-Copy works. No execCommand.
      const r = document.createRange();
      r.selectNodeContents(btn.querySelector('.copy__val'));
      getSelection().removeAllRanges();
      getSelection().addRange(r);
    }
    btn.classList.toggle('is-ok', ok);
    // Live region: assistive tech gets the confirmation the icon gives everyone else.
    status.textContent = ok ? `Copied ${text}` : 'Selected — press Ctrl or Command + C to copy';
    clearTimeout(t);
    t = setTimeout(() => { btn.classList.remove('is-ok'); status.textContent = ''; }, 2200);
  });
});
```

**Do not** rely on the icon alone. The `role="status"` region is what makes this usable
non-visually, and it costs three lines.

---

# 15. Animated form states

**What it is.** A field that acknowledges focus, validity, invalidity, submission, and success —
each with a distinct, quiet motion.

**When to use it.** Every contact form, quote request, and booking form. Register: universal.
For a trades business this form *is* the conversion, so it deserves the most care in the file.

**Why native.** `:focus-visible`, `:user-valid` / `:user-invalid` (Baseline widely available —
they only fire *after* the user has interacted, unlike `:valid`/`:invalid` which shout at an empty
form on load), `:has()` for the floating label, `@starting-style` for the success panel.

```html
<form class="frm" novalidate>
  <div class="frm__f">
    <input class="frm__in" id="f-email" name="email" type="email" required placeholder=" " autocomplete="email"
           aria-describedby="f-email-err">
    <label class="frm__lb" for="f-email">Email address</label>
    <span class="frm__bar" aria-hidden="true"></span>
  </div>
  <p class="frm__err" id="f-email-err">Please enter a valid email address.</p>

  <button class="frm__go" type="submit">
    <span class="frm__go-t">Send enquiry</span>
    <span class="frm__spin" aria-hidden="true"></span>
  </button>
  <p class="frm__done" hidden>Thanks — we'll reply within one working day.</p>
  <p class="sr-only" role="status" data-frm-status></p>
</form>
```

```css
.frm__f { position: relative; }
.frm__in {
  width: 100%;
  padding: 1.4rem .9rem .55rem;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--bg);
  color: var(--ink);
  font: inherit;
  /* Law 3, exception 3: a 1px border colour transition. One element, sub-pixel repaint. */
  transition: border-color var(--dur-fast) linear, background-color var(--dur-fast) linear;
}
.frm__in:focus { outline: none; }               /* replaced by the ring on .frm__f below */
.frm__f:has(.frm__in:focus-visible) { outline: var(--ring); outline-offset: 2px; border-radius: 10px; }

/* Floating label — transform only, never font-size (which reflows). */
.frm__lb {
  position: absolute;
  left: .9rem; top: 50%;
  transform-origin: left center;
  transform: translateY(-50%);
  color: var(--ink-2);
  pointer-events: none;
  transition: transform var(--dur-base) var(--ease-out), color var(--dur-base) linear;
}
.frm__f:has(.frm__in:focus) .frm__lb,
.frm__f:has(.frm__in:not(:placeholder-shown)) .frm__lb {
  transform: translateY(-155%) scale(.78);
}
.frm__f:has(.frm__in:focus) .frm__lb { color: var(--accent); }

/* Focus underline: scaleX, not width. */
.frm__bar {
  position: absolute; inset: auto .55rem -1px .55rem; height: 2px;
  background: var(--accent); border-radius: 2px;
  transform: scaleX(0); transform-origin: left;
  transition: transform var(--dur-base) var(--ease-out);
}
.frm__f:has(.frm__in:focus) .frm__bar { transform: scaleX(1); }

/* Valid / invalid — :user-* only fires after interaction. */
.frm__in:user-valid   { border-color: var(--ok); }
.frm__in:user-invalid { border-color: var(--bad); }
.frm__f:has(.frm__in:user-invalid) .frm__bar { background: var(--bad); }

.frm__err {
  margin: .35rem 0 0; font-size: .82rem; color: var(--bad);
  opacity: 0; transform: translateY(-4px);
  transition: opacity var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out);
}
.frm:has(.frm__in:user-invalid) .frm__err { opacity: 1; transform: none; }

/* Shake, once, on invalid submit (class added by JS, removed on animationend). */
.frm__f.is-shake { animation: frm-shake 420ms var(--ease-soft); }
@keyframes frm-shake {
  10%, 90% { transform: translateX(-3px); }
  30%, 70% { transform: translateX(5px); }
  50%      { transform: translateX(-5px); }
  0%, 100% { transform: none; }
}

/* Submitting */
.frm__go { position: relative; display: inline-grid; place-items: center; padding: .8rem 1.6rem;
           border: 0; border-radius: 999px; background: var(--ink); color: var(--bg); font: inherit; cursor: pointer; }
.frm__go-t, .frm__spin { grid-area: 1 / 1; transition: opacity var(--dur-fast) linear; }
.frm__spin {
  width: 18px; height: 18px; border-radius: 50%;
  border: 2px solid currentColor; border-top-color: transparent;
  opacity: 0;
  animation: frm-spin .7s linear infinite;
}
@keyframes frm-spin { to { transform: rotate(1turn); } }
.frm__go[aria-busy='true'] .frm__go-t { opacity: 0; }
.frm__go[aria-busy='true'] .frm__spin { opacity: 1; }
.frm__go[aria-busy='true'] { pointer-events: none; }

/* Success panel — @starting-style entry, no JS timing. */
.frm__done {
  margin-top: 1rem; padding: .9rem 1rem;
  border-radius: 10px; background: color-mix(in oklch, var(--ok) 16%, var(--bg)); color: var(--ink);
  opacity: 1; transform: none;
  transition: opacity var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out),
              content-visibility var(--dur-base) allow-discrete;
}
@starting-style { .frm__done { opacity: 0; transform: translateY(8px); } }

/* ---- Touch strategy: identical. Focus fires on tap; nothing here depends on hover.
   Only the button's hover lift is gated, and targets are enlarged. ---- */
@media (hover: hover) and (pointer: fine) {
  .frm__go:hover { background: var(--accent); }
}
@media (hover: none) {
  .frm__in { padding-block: 1.5rem .7rem; font-size: 16px; }  /* 16px stops iOS zoom-on-focus */
  .frm__go { min-height: 48px; width: 100%; }
}

/* ---- Law 2: no shake, no float, no spin. Every state still readable. ---- */
@media (prefers-reduced-motion: reduce) {
  .frm__lb, .frm__bar, .frm__err, .frm__done, .frm__in { transition: none; }
  .frm__f.is-shake { animation: none; }
  .frm__f:has(.frm__in:user-invalid) { outline: 2px solid var(--bad); outline-offset: 3px; }
  .frm__spin { animation: none; border-top-color: currentColor; opacity: .5; }
  .frm__go[aria-busy='true'] .frm__go-t { opacity: 1; }
  .frm__go[aria-busy='true'] .frm__go-t::after { content: '…'; }
  @starting-style { .frm__done { opacity: 1; transform: none; } }
}
```

```js
document.querySelectorAll('.frm').forEach((form) => {
  const btn = form.querySelector('.frm__go');
  const done = form.querySelector('.frm__done');
  const status = form.querySelector('[data-frm-status]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      const bad = form.querySelector(':invalid');
      bad?.focus();
      const field = bad?.closest('.frm__f');
      if (field && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        field.classList.add('is-shake');
        field.addEventListener('animationend', () => field.classList.remove('is-shake'), { once: true });
      }
      status.textContent = 'Please correct the highlighted field.';
      return;
    }
    btn.setAttribute('aria-busy', 'true');
    status.textContent = 'Sending…';
    try {
      await fetch(form.action || '#', { method: 'POST', body: new FormData(form) });
      done.hidden = false;              // hidden -> visible triggers @starting-style
      status.textContent = 'Sent. We will reply within one working day.';
      form.reset();
    } catch {
      status.textContent = 'Could not send. Please call us instead.';
    } finally {
      btn.removeAttribute('aria-busy');
    }
  });
});
```

**Rules that are not negotiable.** `novalidate` + `checkValidity()` so *you* control the error UX;
`aria-describedby` linking the field to its message; `role="status"` announcing every state change;
`font-size: 16px` on mobile inputs so iOS does not zoom the viewport on focus.

---

# 16. Dark / light toggle with a satisfying transition

**What it is.** A theme switch where the new theme wipes in as an expanding circle originating at
the toggle button itself.

**When to use it.** Any site with a dark mode. Register: universal. The circular wipe in
particular suits tech, studio, and product registers; for a heritage or trades brand, use the
same code with a plain crossfade.

**Why native.** `document.startViewTransition()` — Baseline newly available since October 2025.
The wipe is a `clip-path` animation on `::view-transition-new(root)`, which the compositor runs
on a snapshot, so it does not repaint the live page.

```html
<button class="thm" type="button" aria-pressed="false">
  <span class="thm__ico" aria-hidden="true"></span>
  <span class="sr-only">Switch to dark theme</span>
</button>
```

```css
/* Head-inline script sets data-theme before first paint (see JS) — no flash of wrong theme. */
.thm {
  width: 44px; aspect-ratio: 1; border-radius: 50%;
  border: 1px solid var(--line); background: var(--bg-2); cursor: pointer;
  display: grid; place-items: center;
}
.thm__ico {
  width: 18px; aspect-ratio: 1; border-radius: 50%;
  background: var(--ink);
  /* sun -> moon by sliding an inset shadow disc across, transform only */
  box-shadow: inset 0 0 0 0 var(--bg-2);
  transform: scale(1);
  transition: transform var(--dur-base) var(--ease-spring), box-shadow var(--dur-base) var(--ease-out);
}
:root[data-theme='dark'] .thm__ico { transform: scale(.82); box-shadow: inset -7px -3px 0 0 var(--bg-2); }

/* --- The wipe. Kill the default crossfade, keep old below, clip the new one open. --- */
::view-transition-old(root),
::view-transition-new(root) { animation: none; mix-blend-mode: normal; }
::view-transition-old(root) { z-index: 0; }
::view-transition-new(root) { z-index: 1; }

:root.thm-wipe::view-transition-new(root) {
  animation: thm-reveal 620ms var(--ease-out);
  /* --tx/--ty are the button's centre, written by JS just before the transition. */
  clip-path: circle(var(--thm-r, 150%) at var(--tx, 50%) var(--ty, 50%));
}
@keyframes thm-reveal {
  from { clip-path: circle(0 at var(--tx, 50%) var(--ty, 50%)); }
  to   { clip-path: circle(var(--thm-r, 150%) at var(--tx, 50%) var(--ty, 50%)); }
}

/* ---- Touch strategy: identical. It is a tap. Only enlarge the target. ---- */
@media (hover: none) { .thm { width: 48px; } }
@media (hover: hover) and (pointer: fine) { .thm:hover { border-color: var(--ink-2); } }

/* ---- Law 2: instant swap, no wipe, no icon spring. ---- */
@media (prefers-reduced-motion: reduce) {
  .thm__ico { transition: none; }
  :root.thm-wipe::view-transition-new(root) { animation: none; clip-path: none; }
}
```

```html
<!-- In <head>, BEFORE the stylesheet. Blocking on purpose: 6 lines, no flash. -->
<script>
  (() => {
    const s = localStorage.getItem('theme');
    const d = s ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = d;
  })();
</script>
```

```js
const root = document.documentElement;
document.querySelectorAll('.thm').forEach((btn) => {
  const sync = () => {
    const dark = root.dataset.theme === 'dark';
    btn.setAttribute('aria-pressed', String(dark));
    btn.querySelector('.sr-only').textContent = dark ? 'Switch to light theme' : 'Switch to dark theme';
    document.querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', getComputedStyle(root).getPropertyValue('--bg').trim());
  };
  sync();

  btn.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    const apply = () => { root.dataset.theme = next; localStorage.setItem('theme', next); sync(); };

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !document.startViewTransition) { apply(); return; }   // Law 2 + feature detect

    // Origin of the wipe = centre of the button. Radius = furthest viewport corner.
    const r = btn.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const far = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    root.style.setProperty('--tx', `${x}px`);
    root.style.setProperty('--ty', `${y}px`);
    root.style.setProperty('--thm-r', `${far}px`);

    root.classList.add('thm-wipe');
    const vt = document.startViewTransition(apply);
    vt.finished.finally(() => root.classList.remove('thm-wipe'));
  });
});

/* Follow the OS while the user has not made an explicit choice. */
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (localStorage.getItem('theme')) return;
  root.dataset.theme = e.matches ? 'dark' : 'light';
});
```

**Why `.thm-wipe` is a class and not always-on.** The `::view-transition-new(root)` rule would
otherwise hijack *every* view transition on the page (the nav pill, the filter grid). Scope it.

---

# 17. Dynamic filters (grid re-flows with FLIP)

**What it is.** Filter buttons that hide and show grid items, with the surviving items gliding to
their new positions rather than snapping.

**When to use it.** Portfolio / project grids, service catalogues, menus with dietary filters,
case studies by sector. Register: universal.

**Why native, two ways.** Primary: `document.startViewTransition()` — give each visible card a
`view-transition-name` and the browser performs FLIP for you. Fallback: manual FLIP with
`getBoundingClientRect()` + the Web Animations API, twelve lines, transform-only.

```html
<div class="filt">
  <div class="filt__bar" role="group" aria-label="Filter projects">
    <button type="button" data-f="all"  aria-pressed="true">All</button>
    <button type="button" data-f="roof" aria-pressed="false">Roofing</button>
    <button type="button" data-f="ext"  aria-pressed="false">Extensions</button>
  </div>
  <p class="sr-only" role="status" data-filt-status></p>
  <ul class="filt__grid">
    <li class="filt__c" data-tags="roof">Slate re-roof, Headingley</li>
    <li class="filt__c" data-tags="ext">Rear extension, Chapel Allerton</li>
    <li class="filt__c" data-tags="roof ext">Dormer + re-roof, Meanwood</li>
  </ul>
</div>
```

```css
.filt__grid {
  list-style: none; margin: 0; padding: 0;
  display: grid; gap: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(min(240px, 100%), 1fr));
}
.filt__c {
  padding: 1.2rem; min-height: 130px;
  border-radius: var(--radius);
  background: var(--bg-2); border: 1px solid var(--line);
}
.filt__c[hidden] { display: none; }
.filt__bar button {
  padding: .45rem .9rem; border-radius: 999px; border: 1px solid var(--line);
  background: transparent; color: var(--ink-2); font: inherit; cursor: pointer;
  transition: color var(--dur-fast) linear, border-color var(--dur-fast) linear;
}
.filt__bar button[aria-pressed='true'] { color: var(--bg); background: var(--ink); border-color: var(--ink); }

/* View Transitions path: fade cards in/out, glide the survivors. */
::view-transition-group(.filt-card) { animation-duration: 380ms; animation-timing-function: var(--ease-out); }

/* ---- Touch strategy: identical. Filters are buttons — tap and click are the same event.
   Only the hover tint on the buttons is gated. ---- */
@media (hover: hover) and (pointer: fine) {
  .filt__bar button:hover { color: var(--ink); border-color: var(--ink-2); }
}

/* ---- Law 2: no glide, no fade. Cards simply appear and disappear. ---- */
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*) { animation: none !important; }
}
```

```js
import { reduced } from './fx-core.js';

document.querySelectorAll('.filt').forEach((root) => {
  const cards = [...root.querySelectorAll('.filt__c')];
  const status = root.querySelector('[data-filt-status]');

  const applyFilter = (f) => {
    cards.forEach(c => { c.hidden = f !== 'all' && !c.dataset.tags.split(' ').includes(f); });
    status.textContent = `${cards.filter(c => !c.hidden).length} projects shown.`;
  };

  root.querySelector('.filt__bar').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-f]');
    if (!b) return;
    root.querySelectorAll('.filt__bar button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    const f = b.dataset.f;

    if (reduced()) { applyFilter(f); return; }                       // Law 2

    if (document.startViewTransition) {
      // Name only the cards that are currently visible — unbounded names make VT slow.
      const named = cards.filter(c => !c.hidden).slice(0, 30);
      named.forEach((c, i) => { c.style.viewTransitionName = `card-${i}`; c.style.viewTransitionClass = 'filt-card'; });
      const vt = document.startViewTransition(() => applyFilter(f));
      vt.finished.finally(() => named.forEach(c => { c.style.viewTransitionName = ''; c.style.viewTransitionClass = ''; }));
      return;
    }

    // ---- Manual FLIP fallback. transform + opacity only. ----
    const first = new Map(cards.map(c => [c, c.getBoundingClientRect()]));  // F: measure
    applyFilter(f);                                                          // L: mutate
    cards.forEach((c) => {
      if (c.hidden) return;
      const a = first.get(c), b2 = c.getBoundingClientRect();
      const dx = a.left - b2.left, dy = a.top - b2.top;
      if (!a.width) {                                    // was hidden -> fade+rise in
        c.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }],
                  { duration: 320, easing: 'cubic-bezier(.16,1,.3,1)' });
      } else if (dx || dy) {                             // I + P: invert, then play to identity
        c.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
                  { duration: 380, easing: 'cubic-bezier(.16,1,.3,1)' });
      }
    });
  });
});
```

**Two traps.** (1) `view-transition-name` must be unique per transition — reusing one throws and
aborts the whole transition. (2) Naming 200 cards makes the snapshot phase visibly janky; cap at
~30 and let the rest cut. Both are handled above.

---

# 18. Swipe cards

**What it is.** A stack of cards that can be flung left or right, rotating slightly as they follow
the pointer and flying off past a threshold.

**When to use it.** A testimonial stack, a "pick your service" triage, a before/after gallery on
mobile, a shortlist. Register: consumer-facing — salon, gym, restaurant, estate agent. Not for
professional-services registers, where it reads as a dating app.

**Why native.** Pointer Events + `setPointerCapture` + the Web Animations API.

**Touch strategy B, inverted.** This is the one interaction in the file where touch is the
*primary* modality and mouse is the fallback, so the degradation runs the other way: the swipe is
built for the finger and the mouse borrows the same Pointer Events path. What is gated is only the
hover shadow lift. `touch-action: pan-y` (not `none`) keeps vertical page scrolling alive under
the card.

**Keyboard parity is mandatory.** A swipe-only interface is inaccessible. The arrow buttons below
are not optional garnish; they are the accessible interface, and the swipe is the enhancement.

```html
<div class="swipe">
  <ul class="swipe__stack">
    <li class="swipe__c" style="--k:0" tabindex="0">"Turned up when they said they would."</li>
    <li class="swipe__c" style="--k:1" tabindex="0">"Quote was the quote. No surprises."</li>
    <li class="swipe__c" style="--k:2" tabindex="0">"Third job they've done for us."</li>
  </ul>
  <div class="swipe__ctl">
    <button type="button" data-dir="-1" aria-label="Previous testimonial">←</button>
    <button type="button" data-dir="1"  aria-label="Next testimonial">→</button>
  </div>
  <p class="sr-only" role="status" data-swipe-status></p>
</div>
```

```css
.swipe { display: grid; justify-items: center; gap: 1rem; }
.swipe__stack { list-style: none; margin: 0; padding: 0; position: relative; width: min(330px, 86vw); aspect-ratio: 4/5; }
.swipe__c {
  position: absolute; inset: 0;
  display: grid; place-items: center;
  padding: 2rem; text-align: center;
  border-radius: 18px;
  background: var(--bg-2); border: 1px solid var(--line);
  box-shadow: 0 24px 48px -28px oklch(0% 0 0 / .5);
  /* pan-y keeps vertical page scrolling alive under the card while we own horizontal drags. */
  touch-action: pan-y;
  cursor: grab;
  transform: translate3d(var(--dx, 0px), calc(var(--k) * 10px), 0) rotate(var(--rot, 0deg)) scale(calc(1 - var(--k) * .04));
  transition: transform 420ms var(--ease-spring);
  user-select: none;
}
.swipe__c.is-drag { transition: none; cursor: grabbing; }
.swipe__c.is-gone { pointer-events: none; }

@media (hover: hover) and (pointer: fine) {
  .swipe__c[style*='--k:0']:hover { box-shadow: 0 30px 60px -28px oklch(0% 0 0 / .6); }
}

/* ---- Touch: this IS the native modality. Mouse drag uses the same code path.
   Buttons are always present for keyboard and for anyone who does not discover the gesture. ---- */
.swipe__ctl { display: flex; gap: .6rem; }
.swipe__ctl button { min-width: 48px; min-height: 44px; border-radius: 999px; border: 1px solid var(--line); background: var(--bg); color: var(--ink); font: inherit; cursor: pointer; }

/* ---- Law 2: no fling, no rotation, no spring. Cards cut instantly; buttons still work. ---- */
@media (prefers-reduced-motion: reduce) {
  .swipe__c { transition: none; transform: translate3d(0, calc(var(--k) * 10px), 0) scale(calc(1 - var(--k) * .04)); }
  .swipe__c.is-gone { display: none; }
}
```

```js
import { reduced } from './fx-core.js';

document.querySelectorAll('.swipe').forEach((root) => {
  const stack = root.querySelector('.swipe__stack');
  const status = root.querySelector('[data-swipe-status]');
  let cards = [...root.querySelectorAll('.swipe__c')];

  const restack = () => {
    cards.forEach((c, i) => { c.style.setProperty('--k', i); c.style.zIndex = cards.length - i; });
    status.textContent = cards[0] ? `Showing testimonial 1 of ${cards.length}.` : 'End of testimonials.';
  };
  restack();

  const dismiss = (dir) => {
    const c = cards.shift();
    if (!c) return;
    c.classList.add('is-gone');
    const finish = () => { stack.append(c); c.classList.remove('is-gone'); c.style.removeProperty('--dx'); c.style.removeProperty('--rot'); cards.push(c); restack(); };
    if (reduced()) { finish(); return; }                       // Law 2: instant
    c.animate(
      [{ transform: getComputedStyle(c).transform },
       { transform: `translate3d(${dir * 130}%, -6%, 0) rotate(${dir * 22}deg)`, opacity: 0 }],
      { duration: 340, easing: 'cubic-bezier(.7,0,.84,0)' }
    ).finished.then(finish);
  };

  root.querySelector('.swipe__ctl').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-dir]');
    if (b) dismiss(+b.dataset.dir);
  });
  // Keyboard: arrows on a focused card do what a swipe does.
  stack.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft')  { e.preventDefault(); dismiss(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); dismiss(1);  }
  });

  if (reduced()) return;                                       // no drag when motion is reduced

  let sx = 0, id = null;
  stack.addEventListener('pointerdown', (e) => {
    const c = cards[0];
    if (!c || !e.target.closest('.swipe__c')) return;
    id = e.pointerId; sx = e.clientX;
    c.setPointerCapture(id);
    c.classList.add('is-drag');
  });
  stack.addEventListener('pointermove', (e) => {
    if (e.pointerId !== id) return;
    const c = cards[0]; if (!c) return;
    const dx = e.clientX - sx;
    c.style.setProperty('--dx', `${dx}px`);
    c.style.setProperty('--rot', `${(dx / 18).toFixed(2)}deg`);
  });
  const end = (e) => {
    if (e.pointerId !== id) return;
    const c = cards[0]; if (!c) return;
    c.classList.remove('is-drag');
    const dx = parseFloat(c.style.getPropertyValue('--dx')) || 0;
    id = null;
    if (Math.abs(dx) > 90) dismiss(Math.sign(dx));
    else { c.style.removeProperty('--dx'); c.style.removeProperty('--rot'); }  // springs home
  };
  stack.addEventListener('pointerup', end);
  stack.addEventListener('pointercancel', end);
});
```

**Note on `touch-action`.** `pan-y` (not `none`) is deliberate: the user must still be able to
scroll the page vertically with a finger that happens to land on the card. `none` would trap them.

---

# 19. Elements animating around a circle

**What it is.** Items — client logos, service icons, credentials, review stars — orbiting a
central point, staying upright as they travel.

**When to use it.** A "who we work with" ring, an accreditation carousel, a process-cycle diagram,
a hero flourish around a headline. Register: universal, and unusually good for trades
(accreditations: Gas Safe, NICEIC, TrustMark orbiting a logo).

**Why native.** The `rotate → translate → counter-rotate` triple is pure CSS, positions every item
with one transform, and keeps labels upright with no per-frame JS. `offset-path` is the elegant
alternative but `offset-distance` is not reliably composited, so the triple wins.

```html
<div class="orbit" style="--n: 7">
  <div class="orbit__hub">Certified</div>
  <ul class="orbit__ring">
    <li style="--i:0">Gas Safe</li><li style="--i:1">NICEIC</li><li style="--i:2">TrustMark</li>
    <li style="--i:3">CHAS</li><li style="--i:4">FMB</li><li style="--i:5">Which?</li><li style="--i:6">SafeContractor</li>
  </ul>
</div>
```

```css
.orbit {
  --r: clamp(110px, 26vw, 190px);
  --spin: 40s;
  position: relative;
  display: grid; place-items: center;
  width: calc(var(--r) * 2 + 120px);
  aspect-ratio: 1;
  margin-inline: auto;
}
.orbit__hub { font-weight: 700; letter-spacing: .02em; }

.orbit__ring {
  list-style: none; margin: 0; padding: 0;
  position: absolute; inset: 0;
  animation: orbit-spin var(--spin) linear infinite;
}
@keyframes orbit-spin { to { transform: rotate(1turn); } }

.orbit__ring li {
  position: absolute;
  left: 50%; top: 50%;
  padding: .3rem .65rem;
  border-radius: 999px;
  background: var(--bg-2); border: 1px solid var(--line);
  font-size: .74rem; white-space: nowrap;
  /* rotate to the slot -> push out by the radius -> counter-rotate so the label stays upright */
  transform:
    translate(-50%, -50%)
    rotate(calc(var(--i) * (360deg / var(--n))))
    translate(var(--r))
    rotate(calc(var(--i) * (-360deg / var(--n))));
  /* the ring's own rotation would tilt the labels, so counter-spin each one */
  animation: orbit-spin var(--spin) linear infinite reverse;
}

@media (hover: hover) and (pointer: fine) {
  .orbit:hover .orbit__ring,
  .orbit:hover .orbit__ring li { animation-play-state: paused; }   /* read the labels */
  .orbit__ring li:hover { background: var(--accent); color: oklch(100% 0 0); border-color: transparent; }
}

/* ---- Touch strategy B: tap the ring to pause/resume (JS toggles .is-held).
   Autonomous motion needs a stop control on touch — there is no "move away to resume". ---- */
@media (hover: none) {
  .orbit { --r: clamp(96px, 34vw, 150px); --spin: 52s; }
}
.orbit.is-held .orbit__ring,
.orbit.is-held .orbit__ring li { animation-play-state: paused; }

/* ---- Law 2: no orbit. The ring holds its static arrangement — the information
   (all seven accreditations, in a circle) is completely intact. ---- */
@media (prefers-reduced-motion: reduce) {
  .orbit__ring, .orbit__ring li { animation: none; }
}
```

```js
/* Touch pause toggle + a visible control for anyone who cannot hover. */
document.querySelectorAll('.orbit').forEach((o) => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'orbit__hold';
  btn.textContent = 'Pause';
  btn.addEventListener('click', () => {
    const held = o.classList.toggle('is-held');
    btn.textContent = held ? 'Resume' : 'Pause';
  });
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) o.append(btn);
  o.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') o.classList.add('is-held');    // finger down = hold
  });
});
```

**WCAG note.** Any motion that runs longer than five seconds and starts automatically needs a
pause control (SC 2.2.2). On desktop, hover-to-pause satisfies it; on touch it does not, which is
exactly why the button above exists.

---

# 20. Liquify / displacement on hover

**What it is.** The surface warps like heat haze or water under the cursor, using
`feTurbulence` → `feDisplacementMap`. The single most expensive effect in this file, and the most
striking when used once.

**When to use it.** *One* hero panel, or a single feature image. Register: creative studio,
photography, spa, fine dining, luxury retail. Never in a grid, never on more than one element,
never on text.

**Performance flag (Law 3, exception 1).** `filter: url()` rasterises the filtered region on every
frame. Mitigations, all applied below: `filter: none` when idle (so the cost at rest is literally
zero); hover-only; `(hover: hover) and (pointer: fine)` only; element capped at 640px; the JS
animation loop self-terminates when the displacement reaches zero.

**Read this first — the cheap alternative is usually better.** A springy `scale` + `skew` wobble
on a `linear()` easing gives ~70% of the perceived "liquid" quality with zero filter cost and no
JS. Ship that by default; reserve the real displacement for a single hero moment.

```css
/* --- The cheap, GPU-only "liquid feel". Use this unless you truly need the warp. --- */
.liq-lite { transform: none; transition: transform 700ms var(--ease-spring); }
@media (hover: hover) and (pointer: fine) {
  .liq-lite:hover { transform: scale(1.03) skewX(-1.2deg) skewY(.6deg); }
}
@media (prefers-reduced-motion: reduce) { .liq-lite, .liq-lite:hover { transform: none; transition: none; } }
```

```html
<!-- The real thing, for one hero panel. -->
<div class="liq"><div class="liq__inner"></div></div>

<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
  <filter id="liquify" x="-12%" y="-12%" width="124%" height="124%">
    <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="2" seed="7" result="noise"/>
    <feDisplacementMap id="liquify-map" in="SourceGraphic" in2="noise"
                       scale="0" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
</svg>
```

```css
.liq {
  max-width: 640px;                 /* hard cap: filter cost scales with area */
  aspect-ratio: 16 / 10;
  border-radius: var(--radius);
  overflow: hidden;
  filter: none;                     /* ZERO cost at rest — JS adds the filter on enter */
}
.liq.is-warp { filter: url(#liquify); }
.liq__inner {
  width: 100%; height: 100%;
  background: conic-gradient(from 210deg, var(--accent), var(--accent-2), var(--accent));
}

/* ---- Touch strategy C: never applied. There is no hover, mobile GPUs pay the most
   for filter rasterisation, and the panel is complete without it. ---- */
@media (hover: none), (pointer: coarse) {
  .liq.is-warp { filter: none !important; }
}

/* ---- Law 2: never applied (also enforced in JS, which never binds). ---- */
@media (prefers-reduced-motion: reduce) {
  .liq.is-warp { filter: none !important; }
}
```

```js
import { canHover, reduced, isMouse, onEnvChange } from './fx-core.js';

/* SVG filter primitive attributes are not CSS properties, so neither CSS transitions nor
   WAAPI can touch them. A ~15-line rAF ramp is the whole cost of doing this natively —
   SMIL <animate> would also work but cannot be gated on prefers-reduced-motion from CSS. */
function initLiquify() {
  const map = document.getElementById('liquify-map');
  if (!map) return;
  document.querySelectorAll('.liq').forEach((el) => {
    if (!canHover() || reduced()) { el.classList.remove('is-warp'); return; }
    let cur = 0, target = 0, raf = 0;
    const tick = () => {
      cur += (target - cur) * 0.14;
      map.setAttribute('scale', cur.toFixed(2));
      if (Math.abs(target - cur) > 0.15) { raf = requestAnimationFrame(tick); }
      else {
        map.setAttribute('scale', target.toFixed(2));
        raf = 0;
        if (target === 0) el.classList.remove('is-warp');   // back to zero cost
      }
    };
    const run = () => { if (!raf) raf = requestAnimationFrame(tick); };
    el.addEventListener('pointerenter', (e) => { if (!isMouse(e)) return; el.classList.add('is-warp'); target = 34; run(); });
    el.addEventListener('pointerleave', (e) => { if (!isMouse(e)) return; target = 0; run(); });
  });
}
initLiquify();
onEnvChange(initLiquify);
```

**Shared-filter caveat.** The snippet above drives one `<feDisplacementMap>` shared by all `.liq`
elements — fine because you should only ever have one. If you genuinely need two, clone the
`<filter>` with a unique `id` per element; a shared map means both warp together.

---

# 21. When a library is actually justified

Every effect above is native. Two honest exceptions, neither of which appears in this file:

1. **Physics-accurate multi-body simulation** (cloth, ropes, collision between many draggable
   elements). A rAF lerp is not a solver. If a brief genuinely requires it — rare on a
   promotional site — that is the one case for a physics library.
2. **Real GPU shaders** (fluid simulation, ray-marched backgrounds, mesh gradients that respond to
   audio). `feTurbulence` is a fixed function; a fragment shader is not. That needs WebGL/WebGPU,
   and it needs a static-image fallback plus a `prefers-reduced-motion` bail-out.

Explicitly **not** justified: smooth-scroll libraries (they hijack the scroll thread, break
`scroll-behavior: smooth`, break find-in-page, break keyboard paging, and fight
`prefers-reduced-motion`), tween libraries for anything in this file, and tooltip/positioning
libraries — CSS anchor positioning plus the documented `@supports` fallback covers it.

---

# 22. Ship checklist

Run this before handing a site over. Every box is a real failure mode seen in the wild.

**Touch**
- [ ] Every hover-revealed piece of information is visible or reachable on a touch device.
- [ ] No card requires hover to expose its link — the whole card is the link.
- [ ] All tap targets ≥ 44×44 CSS px.
- [ ] Tested with DevTools device emulation **and** with `hover: none` forced in the Rendering panel.
- [ ] Hybrid device sanity check: every JS handler tests `e.pointerType`, not just a media query.
- [ ] Any element that owns a drag gesture sets an explicit `touch-action`.

**Motion**
- [ ] Every effect tested with `prefers-reduced-motion: reduce` forced on.
- [ ] With motion reduced, no information is lost and every interactive element still gives feedback.
- [ ] Nothing autoplays for over 5s without a pause control (SC 2.2.2).
- [ ] `matchMedia` listeners re-init on change; the boolean is never cached at load.

**Performance**
- [ ] Only `transform` and `opacity` animate — verified in the Performance panel's Layers view.
- [ ] SVG filters: at most one per page, hover-only, `filter: none` at rest.
- [ ] `will-change` applied per-interaction and removed, never blanket.
- [ ] Tile/point/node budgets respected (≤ 240 pixels, ≤ 60 globe points, ≤ 30 VT names).
- [ ] Every `getBoundingClientRect()` inside a pointer handler is either cached or rAF-batched.
- [ ] Tested on a mid-range Android at 4× CPU throttle, not just a laptop.

**Accessibility**
- [ ] Every hover state has a matching `:focus-visible` state.
- [ ] Split text carries `aria-label` on the parent + `aria-hidden` on the fragments.
- [ ] Every state change a sighted user sees is announced via `role="status"` or `aria-live`.
- [ ] Icon-only controls carry a real accessible name — a tooltip is not a name.
- [ ] Swipe, drag, and scratch interactions all have a keyboard/button equivalent.

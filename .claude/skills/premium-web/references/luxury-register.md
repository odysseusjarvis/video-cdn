# The Luxury Register

What concretely makes a website read as **expensive**, expressed as numbers you can check — not adjectives.
Companion to `scroll-effects.md` (motion recipes) and `hover-effects.md` (micro-interaction recipes).
**Verified 2026-08-02.** Every measurement below is either extracted from a live premium site's shipped CSS (sources in §7) or checkable with a ruler on a rendered page.

---

## 0. How to use this file

Read §1 and §2 **before writing any markup**. They decide the page.
Read §4 **before you pick a font or a colour**, because that is where AI-generated design gives itself away.
Read §5 to pick the register for the client's actual trade.
Run §6 before you tell the user the page is done. It is pass/fail, not vibes.

### 0.1 The one-sentence thesis

> Cheap sites are made of **more**. Expensive sites are made of **less, held to a tighter tolerance.**

A cheap site has 6 fonts, 9 colours, 14 animations, 40 rounded cards and a gradient. An expensive site has 2 fonts, 3 colours, 6 animated moments, one repeated crop ratio and a lot of empty paper. The expensive one is *harder*, because with nothing to hide behind, every measurement shows.

### 0.2 Browser facts this file depends on (checked today, not from a 2024 post)

| Feature used below | Status 2026-08-02 |
|---|---|
| `text-wrap: balance` | **Widely available** — Chrome 130+, Safari 17.5+, Firefox 121+, ~89.9% global (caniuse) |
| `text-wrap: pretty` (`text-wrap-style`) | **Baseline newly available** since Oct 2024 (MDN). Safe with graceful degradation — unsupported browsers just wrap normally |
| `animation-timeline: scroll()` / `view()` | **Limited availability, NOT Baseline** (MDN). Firefox stable does not ship it. Always `@supports`-guarded, always with a complete un-enhanced base layer |
| View Transitions API (same-document) | Chrome 111+, Safari 18+, Firefox 144+, ~88.5% global (caniuse) — enhancement only |
| `aspect-ratio`, `clip-path`, `position: sticky`, `IntersectionObserver`, `prefers-reduced-motion`, `object-fit`/`object-position`, `font-variation-settings`, `@font-face` `size-adjust` | **Widely available** — use freely |
| `letter-spacing`, `font-feature-settings` (`ss01`, `pnum`, `tnum`, `case`) | **Widely available** |

Sources: MDN `animation-timeline` (Limited availability, explicitly "not Baseline"), MDN `text-wrap-style` (Baseline newly available Oct 2024), caniuse `css-text-wrap-balance` (89.86%), caniuse `view-transitions` (88.46%).

---

## 1. The measurable signals

Nine axes. Each has a **cheap value**, an **expensive value**, and a **way to measure it**.

### 1.1 Whitespace ratio — the single loudest signal

Whitespace is the most expensive thing on a page because it is literally unsold space. Cheap sites fear it; premium sites buy it by the acre.

| Measurement | Cheap | Expensive | How to check |
|---|---|---|---|
| Section vertical padding (desktop) | 40–64px | **112–208px** (`clamp(5rem, 11vw, 13rem)`) | Measure gap between last baseline of section A and first of section B |
| Section padding : body font-size ratio | 3–4× | **7–12×** | padding ÷ 17px |
| Hero: % of viewport covered by ink (text + UI, not photo) | 45–70% | **12–25%** | Screenshot, eyeball the text block bounding box |
| Page gutter (desktop) | 16–24px | **48–96px**, and *asymmetric* is fine | Left edge of content to viewport edge |
| Space above a heading : space below it | 1:1 | **2.5:1 to 3:1** — headings belong to what follows | `margin-block: 3em 1.1em` on the h2 |
| Gap between grid items | 16px | **24–48px column, 64–96px row** — row gap always > column gap | Inspect `gap` |
| Distinct spacing values on the whole page | 11+ ad-hoc | **6, from one scale** | Count unique padding/margin values |

**The rule:** vertical rhythm comes from **one** scale, and the biggest step is at least 8× the smallest. Anything not on the scale is a bug.

```css
:root {
  /* One spacing scale. 6 steps. Nothing off-scale is allowed anywhere on the page. */
  --space-3xs: 0.5rem;    /*  8px — inside chips, icon gaps                */
  --space-2xs: 0.75rem;   /* 12px — label to value                         */
  --space-xs:  1.25rem;   /* 20px — paragraph rhythm                       */
  --space-s:   2rem;      /* 32px — card padding, list rhythm              */
  --space-m:   4rem;      /* 64px — block to block inside a section        */
  --space-l:   clamp(5rem, 11vw, 13rem);   /* 80→208px — section padding   */
  --space-xl:  clamp(8rem, 18vw, 20rem);   /* the one hero-scale breath    */

  /* Gutter is generous and scales; it is NOT the same as grid gap. */
  --gutter: clamp(1.25rem, 5vw, 6rem);
}

.section {
  padding-block: var(--space-l);
  padding-inline: var(--gutter);
}

/* Headings own the space BELOW them, not above. This one ratio does a lot of work. */
.section h2 { margin-block: 0 var(--space-xs); }
.section > * + h2 { margin-block-start: var(--space-m); }
```

### 1.2 Type scale ratio — and the sizes actually shipped

Cheap: a linear-ish ramp (16 / 18 / 20 / 24 / 32 / 40) so nothing dominates and everything competes.
Expensive: a **big gap between body and display**, with almost nothing in between.

Real, shipped numbers from **A. Lange & Söhne** (`alange-soehne.com`, `main-DtD9QVKf.css`, read 2026-08-02):

```
--font-size-4xs .625rem   (10px)   --font-size-xl  1.5rem    (24px)
--font-size-3xs .6875rem  (11px)   --font-size-2xl 1.6875rem (27px)
--font-size-2xs .75rem    (12px)   --font-size-3xl 1.75rem   (28px)
--font-size-xs  .875rem   (14px)   --font-size-4xl 2.125rem  (34px)
--font-size-sm  .9375rem  (15px)   --font-size-5xl 2.375rem  (38px)
--font-size-base 1.0625rem(17px)   --font-size-6xl 2.5rem    (40px)
--font-size-md  1.1875rem (19px)   --font-size-7xl 3.4375rem (55px)
--font-size-lg  1.3125rem (21px)   --font-size-8xl 6.5625rem (105px)
```

Read what that actually says:

- **Body is 17px, not 16px.** Premium sites nudge body copy up. 17–19px is the band.
- **Display is 105px — a 6.2× jump over body.** That ratio is the signal. Cheap sites top out at 2.5–3×.
- **The big gap is between 55px and 105px.** Nothing lives there. Hierarchy is created by *absence of middle terms*.
- The bottom of the scale goes down to **10–12px** — used only for caps-tracked labels (§2.3), never for prose.

Lusion ships `clamp(7em, 8vw, 20em)` on its display type — an em-relative giant. By-Kin's display line-heights are `100%` / `115%`.

```css
:root {
  /* Fluid type. Ratio between adjacent steps ~1.25 at the bottom, then a deliberate
     jump to display. Never interpolate more steps in — the gap IS the design. */
  --step--1: clamp(0.8125rem, 0.79rem + 0.12vw, 0.875rem);  /* 13→14  micro labels  */
  --step-0:  clamp(1.0625rem, 1.03rem + 0.17vw, 1.1875rem); /* 17→19  body          */
  --step-1:  clamp(1.25rem, 1.19rem + 0.3vw, 1.4375rem);    /* 20→23  lede          */
  --step-2:  clamp(1.5rem, 1.35rem + 0.75vw, 2.125rem);     /* 24→34  h3            */
  --step-3:  clamp(2rem, 1.6rem + 2vw, 3.4375rem);          /* 32→55  h2            */
  --step-4:  clamp(2.75rem, 1.4rem + 6.8vw, 6.5625rem);     /* 44→105 display / h1  */
}
```

**The measurable test:** `--step-4 ÷ --step-0` at desktop must be **≥ 4.5**. Under 3.5 and the page reads as a template.

### 1.3 Grid discipline

| | Cheap | Expensive |
|---|---|---|
| Column system | none, or a new one per section | **one 12-col grid, declared once, used everywhere** |
| Distinct content spans used on the page | 8+ improvised | **3–4, repeated** (e.g. `2/12`, `2/8`, `7/12`) |
| Alignment | everything centred | **one strong left edge** that holds down the whole page |
| Symmetry | every section symmetric | **asymmetry that repeats** — same offset each time |
| Full-bleed vs contained | random | **alternates on a rule** (imagery bleeds, prose never does) |

The tell is not "does it have a grid" — it is **does the same left edge recur down the page**. Put a straightedge on a screenshot: on an expensive site, headings, body, eyebrows and captions all snap to 2–3 x-positions. On a cheap one they snap to none.

```css
/* ONE grid. Declared once. Every section is a child of it or re-declares it identically. */
.grid {
  display: grid;
  grid-template-columns:
    var(--gutter)
    repeat(12, minmax(0, 1fr))
    var(--gutter);
  column-gap: clamp(1rem, 2vw, 2rem);
}
.grid > * { grid-column: 2 / -2; }               /* default: full content width */

/* The ONLY three spans allowed on this page. Adding a fourth requires a reason. */
.span-prose  { grid-column: 2 / span 6; }        /* measure-limited text        */
.span-offset { grid-column: 5 / -2; }            /* the repeating indent        */
.span-bleed  { grid-column: 1 / -1; }            /* imagery only                */

@media (max-width: 48rem) {
  /* Mobile-first truth: the grid collapses, the rhythm does not. */
  .span-prose, .span-offset { grid-column: 2 / -2; }
}
```

### 1.4 Image treatment and crop discipline

This is where a real business's own photos either sell them or sink them. The client's photos are usually mediocre. **Crop discipline is what rescues them.**

| | Cheap | Expensive |
|---|---|---|
| Aspect ratios on the page | 6+ arbitrary | **2, maybe 3, from a declared set** (e.g. `4/5` portrait, `16/9` landscape, `1/1` detail) |
| Crop | whatever the camera gave | **deliberately tight** — cut the subject, cut the ceiling, cut the sky |
| Corners | `border-radius: 12px` on everything | **0px on editorial imagery.** Radius only on functional UI |
| Shadow | `box-shadow` on photos | **none.** Photos sit on the page, they do not float |
| Colour grade | mixed white balance | **one grade** — see the filter recipe below |
| Overlay text | text dumped on a busy photo | text on a **crop that has empty space in it**, or on a controlled scrim |
| Count | 20 photos, all equal | **1 hero image at 2× the size of the rest** — hierarchy in imagery too |

```css
/* Declare the crop set. Two ratios. Nothing else ships. */
:root { --ratio-portrait: 4 / 5; --ratio-wide: 16 / 9; }

.figure {
  margin: 0;                       /* semantic <figure>, no absolute positioning needed */
  aspect-ratio: var(--ratio-portrait);
  overflow: hidden;                /* the crop happens here, not in Photoshop */
  background: var(--paper-2);      /* prevents white flash before decode */
}
.figure--wide { aspect-ratio: var(--ratio-wide); }

.figure > img {
  width: 100%; height: 100%;
  object-fit: cover;
  /* Art-direct the crop per image with a utility or inline style — this is the
     single highest-leverage thing you can do to a client's amateur photo. */
  object-position: var(--focal, 50% 40%);
  display: block;

  /* ONE grade across every photo on the site. Unifies mixed-quality client material.
     Keep it subtle: if you can see the filter, it is too strong. */
  filter: saturate(0.92) contrast(1.04);
}

/* Scrim only where text sits over image — a gradient, never a flat 50% black box. */
.figure--overlay::after {
  content: "";
  position: absolute; inset: 0;
  background: linear-gradient(to top, rgb(0 0 0 / 0.55), rgb(0 0 0 / 0) 55%);
}
.figure--overlay { position: relative; }
```

**Measurable test:** count distinct `aspect-ratio` values in the stylesheet. More than 3 → fail.

### 1.5 Motion timing — real numbers from shipped premium sites

Extracted from live CSS on 2026-08-02:

| Site | Easing actually used | Where |
|---|---|---|
| **Locomotive** (`locomotive.ca`) | `cubic-bezier(0.215, 0.61, 0.355, 1)` — used **43×**, i.e. it is *the* house curve; plus `cubic-bezier(0.23, 1, 0.32, 1)` ×9 | everything |
| **Lusion** (`lusion.co`) | `cubic-bezier(.4, 0, .1, 1)` ×32 and `cubic-bezier(.35, 0, 0, 1)` ×32; `cubic-bezier(.16, 1, .3, 1)` for reveals | two curves carry the whole site |
| **By-Kin** (`by-kin.com`) | `cubic-bezier(.76, 0, .24, 1)` (symmetric, in-out) and `cubic-bezier(.165, .84, .44, 1)` (out-quart) | transitions and reveals |
| **Aman** (`aman.com`) | `cubic-bezier(0.19, 1, 0.22, 1)` — out-expo | hero/nav |
| **A. Lange & Söhne** | `cubic-bezier(.17, .67, .24, 1)` ×9; durations overwhelmingly `.2s` (25×) and `.3s` (20×) | UI states |

The pattern is unmissable: **each site uses one or two curves, thousands of times.** Not a curve per component.

**Duration bands, from By-Kin's shipped values (`.2s`, `.4s`, `.6s`, `.8s`, `1s`, `1.2s`) and ALS's (`.2s`, `.3s`):**

| Moment | Duration | Curve |
|---|---|---|
| Hover / focus state change | **120–200ms** | `cubic-bezier(0.4, 0, 0.2, 1)` |
| Button press feedback | **90–140ms** | ease-out |
| Small element entrance (card, line of text) | **400–600ms** | `cubic-bezier(0.215, 0.61, 0.355, 1)` |
| Section entrance / large reveal | **700–1100ms** | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Page / route transition | **600–900ms** | `cubic-bezier(0.76, 0, 0.24, 1)` (symmetric — it goes out and comes in) |
| Stagger between siblings | **60–90ms** | — |
| Parallax / scroll-scrubbed | duration is the scroll | **`linear` only** — the scroll is the easing |

**Two things that instantly read cheap:** `transition: all 0.3s ease` (the default-y default), and durations under 100ms on anything that moves distance (reads as a glitch, not a movement).

```css
:root {
  /* TWO curves for the whole site. Pick from the shipped set above; do not invent. */
  --ease-out: cubic-bezier(0.215, 0.61, 0.355, 1);  /* Locomotive's house curve */
  --ease-soft: cubic-bezier(0.16, 1, 0.3, 1);       /* long, luxurious reveals   */
  --ease-inout: cubic-bezier(0.76, 0, 0.24, 1);     /* only for out-and-back     */

  --dur-tap: 140ms;
  --dur-ui: 200ms;
  --dur-enter: 560ms;
  --dur-reveal: 900ms;
  --stagger: 70ms;
}

/* Never `transition: all`. Name the properties — it documents intent and stays on the GPU. */
.link {
  transition:
    color var(--dur-ui) var(--ease-out),
    opacity var(--dur-ui) var(--ease-out),
    transform var(--dur-ui) var(--ease-out);
}
```

### 1.6 Colour restraint — count them

| | Cheap | Expensive |
|---|---|---|
| Distinct hues on the page | 4–7 | **1–2** |
| Total colour tokens (incl. neutrals) | 15+ | **5–7** |
| % of pixels that are the accent colour | 10–25% | **under 3%** |
| Where the accent appears | buttons, headings, icons, borders, badges | **one class of element only** — usually the link/CTA |
| Neutrals | pure `#000` / `#fff` | **tinted** — near-black with a hue, paper with warmth |
| Gradients | hero background gradient | **none, or a scrim only** |

By-Kin's shipped palette is exactly this: `--black`, `--white`, `--dark #111214`, `--silver #f4f2ed`, `--gray #999896` — a neutral ramp — plus **one** chromatic accent `--red #ff6542`. A. Lange & Söhne runs an 9-step grey ramp (`#fafafa` → `#1b1b1b`) with a single corporate blue `#003478` and one heritage `--color-ruby #91004b`.

```css
:root {
  /* 2 neutrals + 3 derived steps + 1 accent. That is the whole palette.
     Note: no pure #000 and no pure #fff — both read as "unconsidered". */
  --ink:      #14150f;   /* near-black, warm-shifted                         */
  --ink-2:    #55564f;   /* body copy on paper — NOT a lighter tint of --ink */
  --ink-3:    #9a9a93;   /* captions, meta, rules                            */
  --paper:    #f6f4ef;   /* warm paper                                        */
  --paper-2:  #e9e6de;   /* alternating section / image placeholder           */
  --accent:   #7a2c1f;   /* ONE. Appears on links and the primary CTA only.  */

  color-scheme: light dark;   /* respect the OS; see the dark block below */
}

/* Dark register — same 6 tokens, re-pointed. Do not add colours here. */
@media (prefers-color-scheme: dark) {
  :root {
    --ink: #f2efe8; --ink-2: #b5b2aa; --ink-3: #7b7871;
    --paper: #141412; --paper-2: #1e1e1b;
    --accent: #d98a6a;   /* lifted for contrast on dark; still the same hue  */
  }
}
```

**Measurable test:** screenshot the page, posterise it, count hues. More than 2 chromatic hues → fail. Accent covering more than ~3% of the pixels → fail.

### 1.7 Density of "moments" per scroll length

A "moment" = anything that animates, reveals, pins, scrubs, or otherwise asks for attention.

| Page length | Cheap | Expensive |
|---|---|---|
| 6 viewport-heights | 18–25 moments (everything fades up) | **4–6** |
| Rule of thumb | — | **1 moment per 1.2–1.8 viewport heights** |
| Hard cap per page | — | **9**, regardless of length |
| Of those, "big" moments (pin/scrub/horizontal) | 5+ | **exactly 1, maybe 2** |

The reason is attention economics: if everything moves, nothing is emphasised, and the visitor learns to ignore movement. One pinned sequence in the middle of an otherwise still page is a *statement*. Six of them is a slideshow.

**Corollary — the still page must already be good.** Turn off all JS and all `@supports` enhancement. If the page is not beautiful in that state, motion is being used to cover a design failure. (This is also the accessibility fallback, so it is not optional work.)

### 1.8 Detail resolution — the small things that cost time

These take minutes and are almost never present on template sites:

- **Optical alignment of quotes and punctuation** — hanging punctuation: `hanging-punctuation: first last;` (Safari; harmless elsewhere).
- **Tabular figures in prices/specs**: `font-variant-numeric: tabular-nums;` so columns line up.
- **Real typographic characters**: `—` `–` `’` `“ ”` `×` `№` — never `-`, `'`, `"`.
- **Non-breaking spaces** before units and after short prepositions: `24 kg`, `Est. 1974`.
- **`::selection`** styled to the palette. One line. Nobody cheap does it.
- **Focus rings** designed, not defaulted: `outline: 2px solid var(--accent); outline-offset: 3px;`
- **Scroll padding for anchors**: `scroll-padding-block-start: 6rem;` so sticky headers don't eat headings.
- **A real favicon set and OG image** built from the client's own material.

```css
::selection { background: var(--ink); color: var(--paper); }
:where(a, button, [tabindex]):focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
  border-radius: 1px;
}
html { scroll-padding-block-start: 6rem; -webkit-text-size-adjust: 100%; }
.price, .spec td { font-variant-numeric: tabular-nums; }
blockquote { hanging-punctuation: first last; }
```

### 1.9 Summary scorecard

| Axis | Fail | Pass |
|---|---|---|
| Section padding ÷ body size | < 5 | **≥ 7** |
| Display ÷ body size | < 3.5 | **≥ 4.5** |
| Distinct spacing values | > 8 | **≤ 6** |
| Distinct aspect ratios | > 3 | **≤ 3** |
| Chromatic hues | > 2 | **≤ 2** |
| Easing curves in stylesheet | > 3 | **≤ 3** |
| Animated moments per page | > 9 | **≤ 9** |
| Fonts (families, not weights) | > 2 | **≤ 2** |

---

## 2. Typography — the primary lever

If you only get one thing right, get this. **Typography is 70% of perceived spend.** A page with plain black text on white, set impeccably, reads more expensive than a page with a hundred effects and sloppy type.

### 2.1 What premium sites do that templates do not

1. **They pay for, or carefully choose, a display face with character** — and then use it at sizes where that character is visible (55px+). A template uses one neutral sans at 32px and the character never shows.
2. **They set a huge size gap between display and body** (§1.2) and refuse to fill it in.
3. **They put negative tracking on large type and positive tracking on small caps.** Templates leave `letter-spacing` at 0 everywhere. Lusion ships exactly this: `letter-spacing: -.02em` on display, `.125em` on caps labels.
4. **They control measure.** Body copy never exceeds ~70 characters. Templates let it run 120ch on a wide monitor.
5. **They vary line-height by role, aggressively.** ALS ships `1.47` for body but `1.0` for display; By-Kin ships `100%` / `115%` / `130%`; Locomotive uses `1.2` on 51 rules. Templates use `1.5` for everything.
6. **They avoid orphans and ragged headline breaks** with `text-wrap: balance` / `pretty`.
7. **They align to a shared left edge** so type creates architecture, not just content.
8. **They use one weight per role and hold it** — not `font-weight: 600` sprinkled ad hoc.

### 2.2 Numbers

| Role | Size | Line-height | Tracking | Measure | Weight |
|---|---|---|---|---|---|
| Display / h1 | 44→105px (`--step-4`) | **0.95–1.05** | **−0.02em to −0.035em** | ≤ 18 words | 400–500 (a *light* giant reads richer than a bold one) |
| h2 | 32→55px (`--step-3`) | **1.05–1.15** | **−0.015em** | ≤ 12 words | 400–500 |
| h3 | 24→34px (`--step-2`) | **1.2** | −0.01em | — | 500 |
| Lede / intro | 20→23px (`--step-1`) | **1.4** | 0 | **50–62ch** | 400 |
| Body | 17→19px (`--step-0`) | **1.5–1.6** | 0 | **60–70ch** | 400 |
| Caption / meta | 13→14px (`--step--1`) | 1.4 | **+0.01em** | ≤ 50ch | 400 |
| Eyebrow / label (CAPS) | 11→13px | 1.2 | **+0.12em to +0.18em** | ≤ 4 words | 500–600 |
| Button label | 14→15px | 1 | **+0.04em** if caps, 0 if sentence case | — | 500 |

**The tracking rule in one line:** *tracking is inversely proportional to size.* Big type tightens, small caps open up. This single relationship is the difference between "typeset" and "typed".

**The measure rule:** `max-width: 65ch` on prose. Not `max-width: 800px` — `ch` scales with the font.

### 2.3 Copy-paste type system

```css
/* ── Fonts ───────────────────────────────────────────────────────────────────
   TWO families maximum. One display, one text. If budget is zero, a single
   well-chosen variable face at two optical sizes beats two mediocre free ones.
   size-adjust normalises the fallback so there is no layout shift on swap. */
@font-face {
  font-family: "Display";
  src: url("/fonts/display.woff2") format("woff2");
  font-weight: 300 600;              /* variable range */
  font-display: swap;
  size-adjust: 100%;
}

:root {
  --font-display: "Display", "Iowan Old Style", "Palatino Linotype", Georgia, serif;
  --font-text: "Text", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;

  /* Tracking tokens — see §2.2. Tracking is a design decision, not a default. */
  --track-display: -0.028em;
  --track-heading: -0.015em;
  --track-body: 0;
  --track-caps: 0.14em;
}

/* ── Base ────────────────────────────────────────────────────────────────── */
body {
  font-family: var(--font-text);
  font-size: var(--step-0);
  line-height: 1.55;
  letter-spacing: var(--track-body);
  color: var(--ink-2);
  background: var(--paper);
  font-synthesis-weight: none;        /* never fake-bold a variable font */
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

/* ── Roles ───────────────────────────────────────────────────────────────── */
.display {
  font-family: var(--font-display);
  font-size: var(--step-4);
  font-weight: 400;                   /* light giants read expensive */
  line-height: 0.98;                  /* < 1 is normal at this size  */
  letter-spacing: var(--track-display);
  color: var(--ink);
  text-wrap: balance;                 /* Widely available; even rag on ≤6 lines */
  max-width: 16ch;                    /* forces a strong, deliberate rag        */
  margin: 0;
}

h2 {
  font-family: var(--font-display);
  font-size: var(--step-3);
  font-weight: 400;
  line-height: 1.08;
  letter-spacing: var(--track-heading);
  color: var(--ink);
  text-wrap: balance;
  max-width: 20ch;
  margin: 0;
}

.lede {
  font-size: var(--step-1);
  line-height: 1.4;
  max-width: 56ch;
  color: var(--ink-2);
  text-wrap: pretty;                  /* Baseline since Oct 2024; kills orphans */
}

.prose p {
  max-width: 66ch;                    /* ch, not px — scales with the face */
  line-height: 1.6;
  text-wrap: pretty;
  margin-block: 0 var(--space-xs);
}

/* The eyebrow. The most-abused element in AI design — see §4.6 for how NOT to do it.
   Correct version: small, tracked open, low contrast, no bar, no emoji, no accent fill. */
.eyebrow {
  font-family: var(--font-text);
  font-size: var(--step--1);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: var(--track-caps);  /* the whole effect lives here */
  color: var(--ink-3);
  margin: 0 0 var(--space-2xs);
  font-feature-settings: "case" 1;    /* correct caps-height punctuation */
}

/* Numbers in prices, specs, phone numbers. */
.tabular { font-variant-numeric: tabular-nums lining-nums; }
```

### 2.4 Balance and wrap — set these explicitly

```css
/* Headings: equalise line lengths, ≤6 lines (Chromium) / ≤10 (Firefox). */
h1, h2, h3, .display, blockquote, figcaption { text-wrap: balance; }

/* Body: slower algorithm, minimises orphans. Baseline newly available Oct 2024. */
p, li, dd, .lede { text-wrap: pretty; }

/* Keep two-word phrases together where a break would read badly. */
.nowrap { white-space: nowrap; }   /* e.g. <span class="nowrap">£1 200</span> */
```

Note the practical limit: `balance` is capped at 6 lines in Chromium, 10 in Firefox, so it works on headings and fails silently on paragraphs — which is exactly why `pretty` is the body-copy answer.

### 2.5 Type-driven hierarchy without decoration

The premium move is to build hierarchy from **size, weight, colour and space** — and stop. No underlines-as-decoration, no coloured heading text, no icon before every heading, no left border bar.

```css
/* A section header, complete. Three elements, no ornament. */
.section-head { display: grid; gap: var(--space-2xs); max-width: 44ch; }
.section-head .eyebrow { /* handled above */ }
.section-head h2       { /* handled above */ }
.section-head p        { color: var(--ink-3); max-width: 46ch; text-wrap: pretty; }
```

---

## 3. Motion as a luxury signal

### 3.1 Restraint vs busy-ness

| Expensive restraint | Cheap busy-ness |
|---|---|
| Motion **reveals content that was going to be there anyway** | Motion **is** the content |
| Few, long, slow, unanimous | Many, short, fast, uncoordinated |
| One shared easing vocabulary | A different animation per component |
| Movement distance **8–40px** | Movement distance 80–200px |
| Opacity ramps `0 → 1` over a long distance | Opacity flickers |
| Nothing bounces | Everything bounces / `ease-in-out` overshoot |
| Motion happens **once**, on first view | Motion re-triggers every time you scroll past |
| The still page is complete | The still page is empty until JS runs |

**The single strongest indicator of an expensive site: the movement distances are small.** Amateur reveals translate 100px. Premium reveals translate 16–24px and take twice as long. The eye reads the slowness as weight, and weight as quality.

```css
:root { --rise: 20px; }   /* NOT 80px. This one value separates the tiers. */

@keyframes rise-in {
  from { opacity: 0; transform: translate3d(0, var(--rise), 0); }
  to   { opacity: 1; transform: none; }
}
```

### 3.2 The vocabulary (use these, do not invent more)

```css
:root {
  --ease-out:   cubic-bezier(0.215, 0.61, 0.355, 1); /* Locomotive house curve  */
  --ease-soft:  cubic-bezier(0.16, 1, 0.3, 1);       /* long reveals            */
  --ease-inout: cubic-bezier(0.76, 0, 0.24, 1);      /* out-and-back only       */
  /* Scroll-scrubbed animations use `linear`. Always. The scroll is the easing. */
}
```

| Moment type | Duration | Easing | Distance |
|---|---|---|---|
| Hover colour/opacity | 140–200ms | `--ease-out` | — |
| Hover lift | 200ms | `--ease-out` | `translateY(-2px)` max |
| Underline draw | 240–320ms | `--ease-out` | `scaleX` from `transform-origin` |
| Element entrance | 500–600ms | `--ease-out` | 16–24px |
| Section reveal | 800–1000ms | `--ease-soft` | 24–40px |
| Image mask wipe | 900–1200ms | `--ease-soft` | `clip-path` inset 100%→0 |
| Menu open/close | 500–700ms | `--ease-inout` | — |
| Stagger step | 60–90ms | — | — |
| Scroll-scrubbed | n/a | `linear` | ≤ 15% of viewport |

### 3.3 The moment budget

Write it down before you build:

```
1  Hero — one gesture only (mask wipe OR slow scale OR line-by-line rise). Not all three.
2  First content section — staggered entrance.
3  The one BIG moment — pinned sequence / horizontal run / scrubbed sequence. ONE per page.
4  Gallery or proof section — staggered entrance.
5  A quiet moment — a rule drawing, a number counting, a caption fading.
6  CTA — a single considered hover state, nothing on entrance.
────
6 moments. Cap 9. Anything beyond that is deleted, not "toned down".
```

Everything else on the page is **still**. Stillness is what makes the six read as intentional.

### 3.4 Reduced motion — non-negotiable, and it must be *good*

The reduced-motion page is not a degraded page. It is the same page with the movement removed and the content intact.

```css
/* Global brake. Put this LAST in the stylesheet so it wins. */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
    animation-timeline: auto !important;   /* detach from scroll timelines */
  }
}

/* But brakes alone leave elements stuck at their "from" state if you were sloppy.
   The correct pattern: only ever apply the hidden state INSIDE a no-preference query. */
@media (prefers-reduced-motion: no-preference) {
  @supports (animation-timeline: view()) {
    .reveal {
      opacity: 0;                       /* safe: only browsers that will un-hide it */
      animation: rise-in linear both;
      animation-timeline: view();
      animation-range: entry 15% cover 38%;
    }
  }
}

/* Reduced-motion users still get feedback — just instantaneous, non-vestibular. */
@media (prefers-reduced-motion: reduce) {
  .card:hover { background: var(--paper-2); }   /* colour change, no transform */
}
```

Matching JS guard (pairs with the IntersectionObserver tier in `scroll-effects.md`):

```js
// Single source of truth for motion permission. Reacts to live OS changes.
const motionOK = window.matchMedia('(prefers-reduced-motion: no-preference)');

function enhance() {
  if (!motionOK.matches) return;                 // do nothing; base page is complete
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('is-in');           // one-shot: never re-trigger
      io.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });

  document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));
}
enhance();
motionOK.addEventListener('change', enhance);
```

### 3.5 When a library is justified

Only two honest cases, and neither is common on a promotional site:

1. **Timeline choreography with interdependent, interruptible sequences** — e.g. a product configurator where a user action mid-animation must retarget six elements from their current values. CSS keyframes cannot retarget from a live in-flight value; the Web Animations API can partially (`getComputedTiming`, `commitStyles`), but past ~3 interdependent tracks the bookkeeping exceeds the library's cost. → **Motion (motion.dev)**, ~5kb for the mini animate function.
2. **Physics-based drag/inertia** — a draggable carousel with real momentum and rubber-banding. Native has no spring solver. → **Motion**'s spring, or hand-rolled ~40 lines.

Not justified: scroll reveals, parallax, pinning, sticky sections, counters, marquees, image masks, staggering, hover states, page-fade transitions. All native. See `scroll-effects.md`.

**Smooth-scroll libraries (Lenis, Locomotive Scroll) are a net negative on a client promotional site.** They hijack native scroll, break `scroll-padding`, break find-in-page position, add jank on trackpads, and fight `prefers-reduced-motion`. `scroll-behavior: smooth` covers the legitimate 5% (anchor jumps).

---

## 4. Anti-patterns — what instantly reads cheap or AI-generated

These are the current (2026) tells. An agent that avoids all of §4 is already above most of the market.

### 4.1 The AI colour clichés

| Cliché | Why it fails | Do instead |
|---|---|---|
| **Warm cream `#FAF7F2` + serif + terracotta `#C4643F`** | The single most over-produced palette of 2025–26. Reads "AI wellness brand" instantly | Derive from the client's own material: sample 2 colours from their best photograph, their signage, their product, their van. A butcher's palette should come from meat, tile and steel — not from a moodboard |
| **Near-black `#0A0A0A` + one acid green/lime pop** | The "AI SaaS dark" default | If dark, tint the black toward the brand hue (`#14150f`, `#0f1214`) and make the accent a *material* colour — brass, oxblood, verdigris |
| **Purple→blue gradient hero (`#6366F1 → #A855F7`)** | Was already dead in 2023; still the most common generated hero | No gradient. Flat paper, or a photograph. If you must have a gradient, make it a scrim over a real image, black→transparent |
| **Glassmorphism cards over a blurred blob background** | 2021 dribbble, aged badly, costs paint performance | Solid surfaces, hairline rules |
| **Full-page pastel "mesh gradient"** | Generated-looking, and it fights every photograph on the page | Paper |

### 4.2 The AI typography clichés

| Cliché | Do instead |
|---|---|
| **Inter / Space Grotesk / Poppins as the "safe pick"** | These are now signatures of generated design. Pick a face with an actual voice appropriate to the trade: a transitional serif (Source Serif, EB Garamond, Newsreader), a grotesque with quirks (Archivo, Public Sans, Instrument Sans), a mono for technical trades (Martian Mono, JetBrains Mono) — or the client's existing brand face if they have one |
| **Everything at `font-weight: 600–700`** | One weight per role. Display at 400. Bold is for emphasis inside prose, not for hierarchy |
| **Letter-spacing left at 0 everywhere** | §2.2. Negative on display, positive on caps |
| **Gradient text (`background-clip: text`) on the headline** | Solid `--ink`. If the headline needs a gradient, the headline is weak |
| **Emoji as section markers (🚀 ✨ 💡)** | Nothing, or a number (`01 —`), or a hairline rule. Emoji in a section heading is the loudest AI tell that exists |
| **Sentence-case everything with no caps labels** | Use the tracked caps eyebrow (§2.3) sparingly — it is a genuine premium signal when it is the *only* caps on the page |

### 4.3 The AI layout clichés

| Cliché | Do instead |
|---|---|
| **Everything centred, whole page** | One dominant left edge. Centre only the hero, or only one pull-quote — as a deliberate contrast |
| **`border-radius: 0.5rem` (rounded-lg) on every single element** | Radius `0` on editorial imagery and section surfaces; `2–4px` on inputs/buttons if anything. Consistency matters more than the value |
| **A 4px accent-coloured bar on the left of every card** | Delete it. Hierarchy comes from type and space |
| **Three equal cards with an icon, a bold heading and two lines of grey text — three times down the page** | Break the symmetry: one wide + two narrow; or a numbered editorial list; or one card at 2× the size |
| **Icon in a rounded square with a tinted background, above every feature** | No icons, or one consistent line-icon set at one stroke width, no container |
| **Alternating image-left / image-right forever** | Vary the *ratio* not just the side: full-bleed, then offset small, then paired |
| **A "stats bar" of four big numbers with `+` suffixes** | One number, big, with real provenance ("Fitting kitchens in Leeds since 1974") |
| **Testimonial carousel with 5-star SVGs and circular avatars** | Two testimonials, set as pull-quotes, with the person's real name, role and town. No stars, no avatars, no carousel |
| **A "trusted by" logo strip of grey logos** | Only if the logos are real and recognisable to *that* client's customers. Otherwise it is filler |
| **Sticky header that is 80px tall with a blur backdrop** | Slim (56–64px), transparent over the hero, solid after; or no sticky header at all on a short page |

### 4.4 The motion clichés

- Every element fading up on scroll, 60px, 300ms, all identical. → §3.3 budget.
- Re-triggering reveals when scrolling back up. → one-shot, `unobserve`.
- A counter animating to "500+" on a site with no 500 of anything.
- Marquee of client logos at 20s linear infinite.
- A cursor follower / custom cursor dot. It breaks touch, breaks accessibility, and is an agency-portfolio move, not a client-site move.
- A full-screen preloader with a percentage. Unless the site genuinely loads heavy WebGL, this is theatre that costs conversions.
- Text scrambling / typewriter effects on the headline.
- `transition: all 0.3s ease`.

### 4.5 The content clichés

- "Elevate your…", "Crafted with passion", "Where tradition meets innovation", "We don't just X, we Y".
- Lorem-ipsum-shaped real copy: three balanced sentences per card, all the same length.
- A hero headline that says nothing specific ("Excellence in every detail") where it could say something checkable ("Structural steel fabrication, Sheffield, since 1978").
- Stock photography mixed with the client's real photos. **Never.** If there aren't enough real photos, use fewer photos and more space.

### 4.6 The eyebrow, specifically

The uppercase eyebrow label is genuinely premium **and** is the most-mangled element in generated design. The cheap version has: an accent-coloured background pill, an emoji, a dot separator, a bar, and `font-weight: 700`. The expensive version is `--ink-3`, 11–13px, `letter-spacing: 0.14em`, weight 500, no container, no colour. One per section, maximum.

### 4.7 The meta-tell

If a page could be swapped onto a different business in a different industry by changing only the logo and the photos, **it has no register**. That is the deepest cheapness. §5 exists to prevent it.

---

## 5. The register changes by industry

"Premium" is not one look. A premium butcher and a premium law firm share only the *discipline* — never the vocabulary. Below: what "expensive" means, concretely, per trade.

For each: palette source, type register, imagery, motion, and the specific trap.

### 5.1 Butcher / baker / artisan food producer

- **Register:** material, tactile, unpolished-on-purpose. The premium signal is *provenance*, not gloss.
- **Palette:** from the product and the shop — bone white, butcher-block, dried-blood oxblood, steel grey, waxed paper. `--paper: #f2eee6; --ink: #17130f; --accent: #6b1f1a`.
- **Type:** a condensed grotesque or a woodblock/slab display (butcher's-window register) + a clean text face. Numbers matter: prices set in tabular figures, per-kg, with real precision.
- **Imagery:** extreme close crops. Marbling, crumb, grain, hands. `4/5` portrait. Warm, slightly under-exposed. Never a smiling stock chef.
- **Motion:** almost none. One slow image reveal. The register is "we've been here 40 years", not "we're a startup".
- **Trap:** the terracotta+cream+serif AI-artisan palette (§4.1). Avoid it explicitly here, because this industry is where it gets applied most.
- **Content that reads expensive:** breed, farm name, dry-age days, cut diagram, the name of the person who does it.

### 5.2 Law firm / accountancy / professional services

- **Register:** authority, restraint, discretion. Nothing may look "designed". Confidence = absence.
- **Palette:** near-monochrome. Ink, paper, one deep institutional colour (navy `#12233f`, forest `#16302a`, or oxblood). Accent **only** on links.
- **Type:** transitional or old-style serif for headings (Source Serif, Newsreader, Spectral), highly legible sans for body. Body 18–19px, measure 62ch, line-height 1.6. This is a reading site.
- **Layout:** strict single left edge. Generous margins. Documents, not cards.
- **Imagery:** architecture, materials, the building, the city — *not* people in suits shaking hands, *not* a gavel, *not* a stock library. If you have real partner portraits, use them large, one per page, in `4/5`, desaturated slightly.
- **Motion:** ≤3 moments. Fades only. Zero parallax. Zero scrubbing.
- **Trap:** blue gradients, shield icons, "Trusted. Proven. Experienced." triads.
- **What signals spend:** named partners with real credentials, jurisdictions, case types, a genuinely useful FAQ set in long form.

### 5.3 Architecture / interior design studio

- **Register:** the work is the site. The site is a portfolio monograph.
- **Palette:** true minimal — paper, ink, and *nothing else*. Colour comes exclusively from the photographs.
- **Type:** one neutral grotesque, two sizes, tiny caps metadata. Project name, year, location, status — set as a data table.
- **Layout:** the most grid-disciplined register there is. Full-bleed images alternating with tiny left-aligned captions in the margin. Whitespace ratio at the extreme end (§1.1 upper bound).
- **Imagery:** the largest images on any of these registers. Full-bleed, `16/9` and `4/5` only, no crops that cut the building awkwardly.
- **Motion:** one scrubbed or masked reveal per project. Slow (1000ms+). This is the one register where a big scroll moment is expected.
- **Trap:** captions styled as body copy. In this register the caption *is* the typography.

### 5.4 Watchmaker / jeweller / high-craft retail

- **Register:** precision and detail resolution. Everything is measured.
- **Palette:** from A. Lange & Söhne's shipped tokens — a long neutral grey ramp (`#fafafa` → `#1b1b1b`) plus a single heritage colour. Metallics are *photographed*, never CSS gradients.
- **Type:** small sizes done perfectly. ALS ships body at 17px/1.47 with letter-spacing tokens from 0.2px to 2px. Specification tables in tabular figures. This register lives at 12–17px.
- **Imagery:** macro. Detail at a scale the eye cannot achieve unaided. One hero object, many detail crops, all the same ratio.
- **Motion:** micro. `.2s`/`.3s` UI transitions (ALS's dominant durations). One slow rotate or scrub on the hero object.
- **Trap:** gold gradient text, sparkle animations, "luxury" in the copy. Luxury is never announced.

### 5.5 Hospitality — hotel, restaurant, spa, private villa

- **Register:** atmosphere and anticipation. The site sells a feeling of arrival.
- **Palette:** drawn from the property's actual materials — limewash, stone, timber, linen. Warm neutrals plus one deep shade from the interior.
- **Type:** a display serif with real character, set very large and very light, over image. Body copy short — this register is not read, it is browsed.
- **Imagery:** the dominant element. Wide, calm, few people, golden-hour. Aman's site is the reference. Big empty compositions with the text placed in the empty part.
- **Motion:** slow. Aman ships `cubic-bezier(0.19, 1, 0.22, 1)` — out-expo, the slowest-settling common curve. Long cross-fades, 1000ms+ image reveals.
- **Trap:** a booking widget dumped in the hero as a coloured box. Book flows are a separate, quiet, secondary surface.

### 5.6 Automotive — dealer, restorer, detailer, performance shop

- **Register:** engineering and control. Dark is legitimate here (one of the few registers where it is).
- **Palette:** true dark with a tint (`#101214`), a metallic neutral, and one signal colour used at ≤1% coverage.
- **Type:** a technical grotesque, tight tracking, numerals everywhere — bhp, torque, 0–60, chassis numbers — in tabular figures.
- **Imagery:** three-quarter and detail crops on seamless or dark backgrounds; consistent horizon line across shots.
- **Motion:** the register that most tolerates a scrubbed sequence (a car rotating, a spec pinning). Budget the ONE big moment here.
- **Trap:** speed-lines, tyre-smoke video loops, red-and-black "performance" styling. Restraint is what separates a restorer from a used-car lot.

### 5.7 Construction, joinery, structural trades

- **Register:** competence, scale, and evidence. Premium here means "you can trust us with a £400k job".
- **Palette:** site materials — concrete grey, weathered timber, hi-vis used *once* as the accent (this is the one place hi-vis yellow is correct rather than cheap).
- **Type:** sturdy grotesque, larger-than-usual body (19px), strong numerals. Project data sets: value, duration, structural detail.
- **Imagery:** in-progress shots as well as finished. Process photography reads as competence; only-finished reads as a stock library.
- **Motion:** minimal. Two moments. A before/after is better done as a static pair than a slider.
- **Trap:** clip-art icons of hard hats; a "Get a Free Quote!" button in a bright colour on every section.
- **Content that signals spend:** accreditations with numbers, insured-to values, named project references, a real address.

### 5.8 Medical, dental, aesthetics, private clinic

- **Register:** calm, clinical, human. Premium is "unhurried", the opposite of a walk-in.
- **Palette:** cool near-white, one soft tint (never mint or lilac — both read as cheap medical template), ink at high contrast for legibility. Accessibility contrast is non-negotiable here; an older audience is likely.
- **Type:** highly legible sans, body at 19px, line-height 1.65, measure 60ch. Larger tap targets (min 48px).
- **Imagery:** the real practice, real staff, real equipment, lit softly. Never a stock stethoscope or a smiling model.
- **Motion:** ≤3 moments, fades only. Vestibular-safe by default.
- **Trap:** before/after galleries styled like an e-commerce grid; sans-serif + rounded cards + light blue = every clinic template on earth.

### 5.9 Fashion / beauty / independent retail

- **Register:** editorial. The site is a magazine, not a shop.
- **Palette:** paper and ink, with colour entering only through product photography.
- **Type:** the boldest register for type — the display face can be genuinely expressive here, at `--step-4` and above, with tight negative tracking.
- **Layout:** editorial asymmetry, overlapping text and image, deliberate rag. This is where you break the grid *once*, visibly, on purpose.
- **Imagery:** high volume, one consistent grade, `4/5` throughout.
- **Motion:** a masked wipe reveal per image, staggered. Horizontal scroll section is defensible here.
- **Trap:** it drifts into "AI fashion moodboard" fast — cream, serif, huge tracking, nothing to say. Anchor it with real product, real prices, real stock.

### 5.10 Financial advisory / wealth management / insurance broker

- **Register:** sobriety and clarity. Trust is built by legibility and specificity.
- **Palette:** near-monochrome plus one institutional deep tone. No charts-as-decoration.
- **Type:** serif headings, sans body, tabular figures for every number. Long-form content set properly.
- **Imagery:** the least imagery of any register. Consider almost none — architecture, texture, or nothing. An empty, well-typeset page reads more expensive here than any photograph.
- **Motion:** two moments, fades.
- **Trap:** stock imagery of graphs going up; a purple-blue fintech gradient; "Your future, secured."

### 5.11 Photographer / creative freelancer / studio

- **Register:** the work at full bleed, and the interface disappearing.
- **Palette:** neutral to invisible. Ink and paper. Everything else is the work.
- **Type:** small, quiet, tracked. The name and the caption, and nothing else.
- **Motion:** this is the register where a big scroll moment (Lusion/By-Kin style easings, `cubic-bezier(.16,1,.3,1)`) is expected and rewarded — but still ONE.
- **Trap:** a grid of thumbnails with hover-zoom, which is every portfolio template. Curate 12 images instead of showing 80.

### 5.12 Wedding / event venue

- **Register:** atmosphere plus practicality. Two audiences: the dreamer and the person checking capacity.
- **Palette:** the venue's own materials — stone, garden green, candlelight warm.
- **Type:** display serif for the emotional layer, clean sans for the factual layer (capacity, dates, pricing). The *separation* of those two layers is the premium move.
- **Imagery:** wide establishing shots + detail. Real weddings held there, credited to the photographer.
- **Trap:** script fonts, floral SVG dividers, blush-and-gold, everything centred (§4.3).

### 5.13 Quick register-picker

| If the business sells… | Lead with | Motion budget | Dark mode legit? |
|---|---|---|---|
| a material product they make | imagery + provenance copy | 2–3 | rarely |
| expertise / advice | typography + long-form | 2–3 | no |
| a place you go to | atmosphere imagery | 3–5 | sometimes |
| engineered precision | numerals + detail crops | 4–6 (1 big) | yes |
| their own creative work | full-bleed work | 4–6 (1 big) | yes |
| care / treatment | clarity + real people | 2–3 | no |

---

## 6. Pre-flight checklist

Run every item. Each is objectively pass/fail. **Do not tell the user the page is finished with any FAIL outstanding.**

### A. Measurable design

- [ ] Section vertical padding ÷ body font-size **≥ 7**
- [ ] Display size ÷ body size at desktop **≥ 4.5**
- [ ] **≤ 6** distinct spacing values in the stylesheet, all from one scale
- [ ] **≤ 3** distinct `aspect-ratio` values across all imagery
- [ ] **≤ 2** chromatic hues; accent covers **< 3%** of pixels
- [ ] **≤ 2** font families (weights don't count)
- [ ] **≤ 3** easing curves defined; `transition: all` appears **zero** times
- [ ] Headings, body and captions snap to **≤ 3 x-positions** (straightedge test on a screenshot)

### B. Typography

- [ ] Prose has `max-width` in `ch`, **60–70ch**
- [ ] Display line-height **< 1.05**; body line-height **1.5–1.6**
- [ ] Negative tracking on display (**−0.02em or tighter**); positive on caps labels (**+0.12em or more**)
- [ ] `text-wrap: balance` on headings, `text-wrap: pretty` on prose
- [ ] Real typographic characters throughout (— – ’ “ ” ×), no straight quotes, no hyphen-as-dash
- [ ] `font-variant-numeric: tabular-nums` on every price, spec and phone number
- [ ] No orphan (single word alone on the last line) in any heading at 1440px, 1024px, 768px and 390px

### C. Motion

- [ ] Total animated moments **≤ 9**; big moments (pin/scrub/horizontal) **≤ 2**
- [ ] Entrance translate distances **≤ 40px** everywhere
- [ ] Only `transform` and `opacity` animate — grep for animated `width`, `height`, `top`, `left`, `margin`, `padding`, `box-shadow`, `filter`: **zero hits**
- [ ] Every reveal is **one-shot** (`unobserve` called) — nothing re-triggers on scroll-up
- [ ] Every scroll-driven rule is inside `@supports (animation-timeline: view())`
- [ ] **With JS disabled**, every section is visible, legible and correctly laid out
- [ ] **With `prefers-reduced-motion: reduce`**, all content visible, nothing stuck at `opacity: 0`, no vestibular motion, hover feedback still exists
- [ ] Scroll-scrubbed animations use `linear` easing

### D. Content and authenticity

- [ ] **Zero** stock photography. Every image is the client's own
- [ ] Every image has a meaningful `alt`; decorative ones have `alt=""`
- [ ] The headline states something specific and checkable about *this* business
- [ ] No phrase from §4.5 appears anywhere
- [ ] No emoji in any heading, label or button
- [ ] Real address, real phone (`tel:` linked), real hours, real names

### E. Craft and integrity

- [ ] Semantic HTML: `<header> <nav> <main> <section> <article> <figure> <figcaption> <footer>`; headings in order with exactly one `<h1>`
- [ ] No `position: absolute` except for scrims, decorative overlays, and visually-hidden text
- [ ] `:focus-visible` styled and visible on every interactive element; full keyboard traverse works
- [ ] Body text contrast **≥ 4.5:1**; large text **≥ 3:1** — in **both** colour schemes if dark mode ships
- [ ] Images have explicit `width`/`height` or `aspect-ratio` — **CLS = 0**
- [ ] Fonts: `font-display: swap`, subset, preloaded, `size-adjust` set on fallbacks
- [ ] Checked at **390px, 768px, 1024px, 1440px, 1920px** — no horizontal scroll at any width
- [ ] Tap targets **≥ 44×44px**
- [ ] `<title>`, meta description, OG image (built from the client's material), favicon set, `LocalBusiness` JSON-LD
- [ ] Zero external libraries loaded unless §3.5 justifies one, and the justification is written in a comment

### F. The final two tests

- [ ] **The swap test:** could this page be moved to a different business in a different industry by changing only the logo and photos? If yes → it has no register → go back to §5.
- [ ] **The still test:** screenshot the page with all animation off. Is it beautiful? If not, motion is hiding a design failure.

---

## 7. Reference sites — what to take from each

All verified reachable 2026-08-02. Where CSS numbers are quoted, they were read from the site's shipped stylesheet on that date.

| # | Site | Take exactly this |
|---|---|---|
| 1 | **A. Lange & Söhne** — https://www.alange-soehne.com/en | The type scale (§1.2): body at **17px**, display at **105px**, a 6.2× ratio with a deliberate empty band between 55px and 105px. Also the letter-spacing token set (0.2px → 2px) and UI durations locked at `.2s`/`.3s`. The reference for *precision* registers. |
| 2 | **Aman** — https://www.aman.com | Hospitality atmosphere: the slowest common easing, `cubic-bezier(0.19, 1, 0.22, 1)` (out-expo), and compositions where the text sits in the empty part of a wide, calm photograph. Take the image-to-ink ratio. |
| 3 | **Locomotive** — https://locomotive.ca | Easing discipline: **one curve, `cubic-bezier(0.215, 0.61, 0.355, 1)`, used 43 times** across the whole stylesheet, plus `cubic-bezier(0.23, 1, 0.32, 1)` for reveals. Also `line-height: 1.2` on 51 rules — a house value, not a per-component decision. Copy the *discipline*, not the curve. |
| 4 | **Lusion** — https://lusion.co | Two curves (`cubic-bezier(.4,0,.1,1)`, `cubic-bezier(.35,0,0,1)`) carrying an entire site, plus the tracking relationship: **`-0.02em` on display, `+0.125em` on caps labels** — §2.2 in shipped form. Also em-relative giant display via `clamp(7em, 8vw, 20em)`. |
| 5 | **By-Kin** — https://www.by-kin.com | The palette discipline of §1.6, shipped: `--black`, `--white`, `--dark #111214`, `--silver #f4f2ed`, `--gray #999896` + **one** accent `--red #ff6542`. And the duration ladder `.2 / .4 / .6 / .8 / 1 / 1.2s` with display line-heights of `100%` / `115%` / `130%`. |
| 6 | **Awwwards — Sites of the Year** — https://www.awwwards.com/websites/sites_of_the_year/ | The current top of the field (Lando Norris by OFF+BRAND, Messenger by abeto, Igloo Inc, Lusion v3, Pangram Pangram). Study these for **moment budgeting** — note how few discrete moments even the maximalist winners actually have. |
| 7 | **Awwwards — Luxury collection** — https://www.awwwards.com/websites/luxury/ | The live corpus for this register. Recent entries worth opening: **Brunello Cucinelli AI e-com** (`shop.brunellocucinelli.com/en-gb/ai`), **Tengile Malamala** (`tengilemalamala.com`), **ERA Residence** (`era-residence.com`), **Heritage Saunas** (`heritagesaunas.co.nz`), **Aerodynamics Private Jets** (`aerodynamics.nl`). Sample five, count their hues and their moments — the numbers will match §1.9. |
| 8 | **Brunello Cucinelli** — https://shop.brunellocucinelli.com/en-gb/ai | Awwwards SOTD, Jul 2026. How a heritage fashion house handles imagery-led commerce without cards, badges, or a carousel. Take the crop consistency. |
| 9 | **Heritage Saunas** — https://heritagesaunas.co.nz | The closest reference to a *small trade with a premium tier* — a physical, material product sold by a small firm. This is the register most of your clients need. Take the material-derived palette and the restraint in moment count. |
| 10 | **Tengile Malamala** — https://tengilemalamala.com | Hospitality/lodge: how to make a small set of good-but-not-world-class photographs carry a whole site through crop discipline and space. |
| 11 | **ERA Residence** — https://era-residence.com | Property/architecture register: grid discipline, marginal captions, full-bleed alternation (§5.3). |
| 12 | **The Watch** — https://thewatch.60fps.fr | A single-object detail register — macro imagery and micro-motion, the §5.4 pattern executed by a studio rather than a maison. |
| 13 | **MDN — scroll-driven animations** — https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations | The authority on what you may actually ship. Confirms `animation-timeline` is **Limited availability, not Baseline** as of 2026-08-02 — which is why §3.4's `@supports` guard is mandatory, not stylistic. |
| 14 | **MDN — `text-wrap-style`** — https://developer.mozilla.org/en-US/docs/Web/CSS/text-wrap-style | Confirms `pretty` is **Baseline (newly available, Oct 2024)** and documents the 6-line (Chromium) / 10-line (Firefox) cap on `balance` — the reason §2.4 splits them by role. |
| 15 | **caniuse — `text-wrap: balance`** — https://caniuse.com/css-text-wrap-balance | 89.86% global, Chrome 130+, Safari 17.5+, Firefox 121+. Use this to justify shipping it unguarded. |

**How to use the corpus:** open five of them, and for each write down the six numbers from §1.9 (spacing values, aspect ratios, hues, curves, fonts, moments). They will cluster. That cluster is the luxury register, and it is the target your page has to hit.

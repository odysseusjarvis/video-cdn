# ScrollScrubber — props, modes, and the defects it fixes

`assets/ScrollScrubber.jsx` is the React drop-in that carries the **hero** on a premium-web
build. `assets/scroll-reveal.css` carries **everything else**. Those two files are the whole
motion layer of a typical site.

**Plain React. No framer-motion, no GSAP, no Tailwind, no CSS file.** It computes its own
scroll progress from `getBoundingClientRect()`, so it drops into Astro (`client:visible`),
Vite, Next (add `"use client"`) or CRA unchanged. framer-motion and GSAP are *optional*
choreography on top, never a requirement — which matters because a single landing page
should not be shipping 45 KB of animation library to draw one canvas.

**Where the other implementations live, so you do not duplicate work:**

| You need | Use |
|---|---|
| A React hero canvas scrub | **This file** |
| A vanilla-JS hero canvas scrub (no React on the page) | `references/scroll-effects.md` §3, class `ScrollSequence` |
| Reveals, staggers, pins, wipes, line-draws on ordinary sections | `assets/scroll-reveal.css` |
| Which recipe (R1–R10) a client's assets can support | `references/animation-recipes.md` |
| Whether a trade should have a canvas hero at all | `references/industry-playbooks.md` |

> **A lawyer's site should not have a frame-scrubbed hero.** Motion here signals frivolity;
> restraint signals competence. Check the industry playbook before reaching for this component.
> Roughly half the matrix rows are better served by `scroll-reveal.css` alone.

---

## 1. Props

`poster` is the only required prop. Everything else has a working default.

### Frames

| Prop | Type | Default | Notes |
|---|---|---|---|
| `frames` | `string[]` | — | Explicit URLs, in order. For `wipe` this is the **pair** `[before, after]`; for `parallax` it is the **layers**, back to front. |
| `srcPattern` | `string` | — | `'/anim/hero/frame-{i}.webp'`. `{i}` is 0-based, `{n}` is 1-based, both zero-padded to `pad`. |
| `count` | `number` | `0` | Frame count when using `srcPattern`. |
| `pad` | `number` | `4` | Padding width. **4, not 2.** The repo's original `padStart(2,'0')` overflows past 99 frames, and the Apple reference this skill benchmarks against is 147 frames — the naming convention broke its own benchmark. `scripts/frames.mjs` emits 4-digit names. |
| `formats` | `{webp?, jpeg?, avif?}` | — | One pattern per format. WebP is chosen when the browser supports it, JPEG otherwise. See §5 D6. |
| `mobileFrames` / `mobileSrcPattern` / `mobileCount` | | — | The lighter ladder used on the `light` device tier. If omitted, the component halves the full ladder automatically. |

### Motion

| Prop | Type | Default | Notes |
|---|---|---|---|
| `mode` | `'scrub' \| 'crossfade' \| 'wipe' \| 'parallax'` | `'scrub'` | See §2. |
| `scrollRange` | `[number, number]` | `[0.10, 0.65]` | Section progress mapped onto frame 0…N−1. The default leaves room at the top for the headline to hold and at the bottom for hotspots/CTA to arrive. |
| `lerp` | `number` | `0.08` | Smoothing. `0` = hard 1:1 snap. Keep 0.08 for `crossfade`: it hides the boundary between two unrelated photos. |
| `sectionHeight` | `string` | `'500vh'` | Height of the tall outer section. |
| `wipeDirection` | `'ltr' \| 'rtl' \| 'ttb' \| 'btt'` | `'ltr'` | `wipe` only. |
| `parallaxRates` | `number[]` | `[1, 0.6, 0.3]` | `parallax` only, one rate per layer, back to front. |
| `parallaxAmplitude` | `number` | `120` | `parallax` only, px of drift at rate 1. |

### Rendering and budget

| Prop | Type | Default | Notes |
|---|---|---|---|
| `poster` | `string` | **required** | The LCP element and the CLS guard. Rendered as a real `<img fetchpriority="high" loading="eager" decoding="async">` with explicit `width`/`height`. It is **never faded out** — it stays painted underneath and the canvas fades in on top. See §3 D7 for why that is not cosmetic. |
| `reducedMotionFrame` | `string` | `poster` | The still shown under `prefers-reduced-motion` / save-data. Usually the **last** frame — the most informative end state. |
| `posterWidth` / `posterHeight` | `number` | `1280` / `720` | Intrinsic frame size. Used for the `<img>` attributes, for the decoded-memory arithmetic **and** for the portrait-crop warning, so pass the real numbers. |
| `fit` | `'cover' \| 'contain'` | `'cover'` | Canvas-side fit; no CSS `object-fit` is involved. |
| `mobileFit` | `'cover' \| 'contain'` | `fit` | Fit on the `light` tier. **Read §8 "The portrait crop" before leaving this unset.** |
| `pinHeight` / `mobilePinHeight` | `string` | `'100svh'` / `pinHeight` | Height of the sticky pin. Shortening it on phones is the other half of the portrait-crop fix. |
| `cropWarnFraction` | `number` | `0.45` | Console-warn when cover-fit shows less than this fraction of the source frame's width. `0` silences it. |
| `dprCap` | `number` | tier value (2 / 1.5) | Overrides the tier default. |
| `keyframeEvery` | `number` | `4` | Every Nth frame is a pinned keyframe: loaded first, never evicted. |
| `memoryBudgetMB` | `number` | `250` | Above this the sliding decoded-frame window turns on automatically. |
| `className`, `style` | | | Applied to the outer `<section>`. |
| `ariaLabel` | `string` | `''` | Text equivalent of what the canvas shows. Also becomes the poster's `alt` and a visually-hidden paragraph. The canvas itself is `aria-hidden`. |
| `onProgress` | `(p:number)=>void` | — | Raw section progress 0…1, rAF-throttled, fired only on change. |
| `children` | `ReactNode` | — | Overlay content inside the sticky pin. |

### Exports

```js
import ScrollScrubber, {
  usePrefersReducedMotion, useDeviceTier, FrameStore, fitRect, supportsWebP, clamp,
} from './ScrollScrubber.jsx';
```

---

## 2. Modes

| Mode | Recipe | What it draws | Assets |
|---|---|---|---|
| `scrub` | **R2** assembly / **R7** video-extracted sequence | Nearest loaded frame, hard cut, LERP-smoothed | 12+ registered frames |
| `crossfade` | **R4** gallery scrub — the universal workhorse | Frame N at α 1, frame N+1 at the fraction | 6–20 unrelated photos |
| `wipe` | **R3** before → after | `frames[0]` full, `frames[N-1]` clipped by progress | one pair |
| `parallax` | **R1** 2.5D depth push | Each frame is a layer, drifting and scaling at its own rate | 1 photo → 2–3 rembg layers |

**R5 (hotspot reveal) is not a mode.** It composes on top of any of them: pass hotspot buttons
as `children` and drive their opacity from `--pw-progress` (§4). That keeps hotspots as real
focusable `<button>`s in the DOM rather than canvas pixels — which is the only version that
is accessible.

### Worked configs

**R2 — auto servis / građevina assembly (the repo's existing hero, generalised)**

```jsx
<ScrollScrubber
  mode="scrub"
  formats={{ webp: '/anim/hero/w/frame-{i}.webp', jpeg: '/anim/hero/j/frame-{i}.jpg' }}
  count={60}
  mobileSrcPattern="/anim/hero/m/frame-{i}.webp"
  mobileCount={30}
  poster="/anim/hero/poster.jpg"
  reducedMotionFrame="/anim/hero/j/frame-0059.jpg"
  posterWidth={1280} posterHeight={720}
  scrollRange={[0.10, 0.65]}
  sectionHeight="500vh"
  ariaLabel="Vozilo se rastavlja u slojeve: karoserija, instalacija, ECU, senzori"
  onProgress={setHeroProgress}
>
  <HeroHeadline />
  <Hotspots />   {/* R5, real <button>s, opacity from --pw-progress */}
</ScrollScrubber>
```

**R3 — salon / detailing / renovacija before→after**

```jsx
<ScrollScrubber
  mode="wipe"
  frames={['/anim/ba/before.webp', '/anim/ba/after.webp']}
  wipeDirection="ltr"
  poster="/anim/ba/before.jpg"
  reducedMotionFrame="/anim/ba/after.jpg"
  scrollRange={[0.15, 0.75]}
  sectionHeight="300vh"
  lerp={0.12}
  ariaLabel="Prije i poslije: farbanje i poliranje"
/>
```
Normalise the pair to identical crop, dimensions and exposure with sharp first — mismatched
framing destroys the illusion, and no amount of scroll polish recovers it. Chain 3–4 pairs as
consecutive `ScrollScrubber` sections rather than one giant one.

**R4 — nekretnine walkthrough vs teretana rep-cycle vs foto studio contact sheet**

The recipe is the same; the **parameters** are what make the trades feel different. Do not
ship the same numbers to two clients:

```jsx
/* nekretnine: 6–8 photos, long slow travel, ordered exterior→entry→living→kitchen→view */
<ScrollScrubber mode="crossfade" frames={walkthrough} sectionHeight="400vh"
                scrollRange={[0.05, 0.9]} lerp={0.06} poster={walkthrough[0]} … />

/* teretana: 16 photos, short section, near-linear — reads as effort, not a slideshow */
<ScrollScrubber mode="crossfade" frames={training} sectionHeight="250vh"
                scrollRange={[0.05, 0.95]} lerp={0.10} poster={training[0]} … />

/* foto studio: 10 photos, editorial rhythm — lerp 0 gives hard cuts, no dissolve */
<ScrollScrubber mode="crossfade" frames={portfolio} sectionHeight="300vh"
                scrollRange={[0.10, 0.90]} lerp={0} poster={portfolio[0]} … />
```

**R1 — restoran / radnja / hotel single-photo depth push**

```jsx
<ScrollScrubber
  mode="parallax"
  frames={['/anim/hero/plate-blur.webp',   /* background: blurred, scaled copy */
           '/anim/hero/subject.webp',      /* rembg u2netp cutout — NEVER bria-rmbg */
           '/anim/hero/scrim.webp']}       /* foreground vignette */
  parallaxRates={[1, 0.6, 0.3]}
  parallaxAmplitude={120}
  poster="/anim/hero/composite.jpg"
  sectionHeight="250vh"
/>
```

---

## 3. The defects it fixes

The reference implementation is `src/components/home/HeroCarVideo.jsx`. It gets the hard parts
right — sticky tall section, LERP at 0.08, redraw only when the integer frame index changes,
DPR-aware `ResizeObserver`, cover-fit source-rect maths for `drawImage` — and all of that is
kept. **D1–D6** are what it gets wrong, and every one of them is reproduced by anybody writing
this pattern from memory. **D7–D8** were found later, in this component, by running
`scripts/verify.mjs` against it — which is the argument for running the gate on your own
work rather than only on the client's.

### D1 — `ResizeObserver` resized the backing store but never redrew

```js
// reference implementation — the whole callback
const ro = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const { width, height } = entry.contentRect;
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = width * dpr;      // <-- assigning canvas.width CLEARS the canvas
    canvas.height = height * dpr;
    canvas.style.width  = `${width}px`;
    canvas.style.height = `${height}px`;
  }
});                                    // <-- and then it returns
```

Assigning `canvas.width` or `canvas.height` resets the entire drawing context and blanks the
bitmap. The reference never redraws, so the frame reappears only on the next scroll event that
crosses an integer frame boundary. Rotate a phone and the hero goes **white until you scroll**.
Resize a desktop window while parked at the top and it stays blank.

**Fix.** `draw()` is a stable `useCallback` that reads refs, so `sizeCanvas()` can call it
synchronously as its last statement. `drawnRef` is reset to `-1` first, forcing a repaint even
though the frame index has not changed. A `matchMedia('(resolution: Xdppx)')` listener catches
DPR changes that arrive without a resize (dragging a window between a laptop and an external
monitor).

*Measured* (Chromium 141, built probe page, parked at 28 % scroll): 1440×900 → 900×1200, **no
scroll**, 120 ms wait — backing store 1440×900 → 900×1200, canvas repainted, 32×32 grid hash
changed, mean luminance 199.0 → 208.1. Before the fix this is a blank frame. The luminance
pair is whatever your frames happen to be; what is being asserted is *not blank* and *hash
changed*, which is what a re-run should check.

### D2 — Preload was all-or-nothing: 60 images before anything rendered

```js
// reference implementation
img.onload = () => {
  loadedCount++;
  if (loadedCount === TOTAL_FRAMES && !cancelled) { frames.current = images; setLoaded(true); }
};
```

Sixty `new Image()` objects are fired simultaneously in a `useEffect`, and `loaded` — which
gates the canvas opacity — flips only when the **last** one resolves. One stalled request holds
the hero at the poster indefinitely. On Fast 3G nothing scrubs for several seconds.

Worse, and this is the non-obvious part: **images created via `new Image()` are never inserted
into the document, never participate in layout, and therefore never receive Chrome's
in-viewport priority boost.** They sit at Low priority forever. Sixty of them at Low, launched
at once, are competing with the poster and the fonts and can never win. This is the real
mechanism behind "the hero takes ages", not a vague bandwidth story — and it means sequencing
the requests yourself is the only lever you have.

**Fix — a three-tier ladder, plus nearest-loaded snapping.**

1. **Poster.** A real `<img>` in the document. Paints immediately, is LCP-eligible, gets the
   priority boost precisely because it *is* in the document.
2. **Keyframe subset.** Every `keyframeEvery`-th frame (default 4th) at `fetchPriority="high"`.
   With 60 frames that is 15 images — roughly 200 KB at 13 KB/frame — after which the whole
   scrub is usable, because `nearestLoaded()` searches outward from the requested index and
   draws the closest frame that exists.
3. **Remainder.** `fetchPriority="low"`, one batch per `requestIdleCallback`, and only after
   the window `load` event. It can never compete with the poster.

`FrameStore.nearestLoaded()` is what makes the ladder invisible: at no point does the component
wait, and at no point does it draw nothing.

### D3 — The rAF loop ran forever, even idle and offscreen

```js
// reference implementation
const animate = () => {
  const diff = targetFrame.current - currentFrame.current;
  if (Math.abs(diff) > 0.1) { … drawFrame(clamped); }
  rafId.current = requestAnimationFrame(animate);   // <-- unconditional, forever
};
```

The loop starts on mount and is cancelled only on unmount. It runs while the user reads the
contact section 4000 px below, while the hero is nowhere near the viewport, and on every route
that mounts the component. It is a permanent 60 Hz wake-up for a canvas nobody is looking at —
a real battery cost on a phone, and it keeps the whole component tree hot.

**Fix — parked on `IntersectionObserver`, stopped on settle.**

- An IO with `rootMargin: '50% 0px 50% 0px'` sets `activeRef`. Leaving the region cancels the
  rAF; entering restarts it, slightly early so the first visible pixel is already correct.
- The tick stops itself once `|target − current| < 0.05` and nothing is dirty. A passive
  `scroll` listener (plus `resize` and `visibilitychange`) restarts it. A passive listener that
  only calls `requestAnimationFrame` when needed costs nothing measurable; a rAF loop that
  never stops costs continuously.
- Newly-decoded frames set `dirtyRef` and wake the loop for exactly one repaint.

*Measured:* 0 rAF calls in 1 s while settled in view; 0 rAF calls in 1 s while scrolled past.
The reference implementation would report ~60 in each.

### D4 — No `prefers-reduced-motion` path at all

The reference has none. Not in the scrubber, not on the infinitely pulsing hotspot
`boxShadow`, not on the infinitely bouncing chevron. Those two decorative loops are exactly
the vestibular triggers WCAG 2.3.3 targets, and they run unconditionally because nobody thinks
of them as "the animation".

**Fix.** `usePrefersReducedMotion()` is a live media-query hook — flip the OS setting and the
component swaps without a reload. Under reduce, the component renders a **completely different
tree**: no canvas, no `FrameStore`, no `IntersectionObserver`, no rAF, no scroll listener. Just
`<img src={reducedMotionFrame}>` in a section collapsed from 500vh to `100svh`, so there is no
tall empty region to fall through.

The rule this encodes: **reduced motion means show the END STATE instantly, never show
nothing.** `reducedMotionFrame` should normally be the last frame — the assembled product, the
"after" photo, the fully-revealed diagram — because that is the frame carrying the information.

The static branch is also what `saveData` and "no frames supplied" resolve to, so there is one
code path to get right instead of three. Inspect `data-pw-reason` on the section to see which
of `reduced-motion` / `save-data` / `no-frames` triggered it.

### D5 — No decoded-memory ceiling, no mobile frame budget

The reference loads all 60 frames at 1280×720 unconditionally, on every device.

```
decoded bytes = W × H × 4 × frames
              = 1280 × 720 × 4 × 60
              = 221 MB live bitmap
```

…from **3.9 MB on disk.** That ratio is the whole problem: it is invisible in the Network
panel, invisible in a bundle report, and it is the classic iOS Safari tab kill. Budgeting by
file size is budgeting the wrong number.

The reference also uses `window.devicePixelRatio || 1` uncapped. On a 390×844 phone the
cover-fit container resolves to about 1500×844 CSS px, so DPR 3 gives a **≈4501×2532 backing
store, ~46 MB**, and a brutal per-frame `drawImage` cost — for a screen that cannot resolve it.

**Fix — three interlocking limits.**

1. **DPR clamp.** `Math.min(devicePixelRatio, dprCap)`; `dprCap` is 2 on desktop, 1.5 on the
   light tier. *Measured on a 375×812 viewport at `deviceScaleFactor: 3`: backing store
   **563×1218**, not 1125×2436 — 375 × 1.5, not 375 × 3. The width is the number to check;
   the height follows your viewport.*
2. **Device tier** (`useDeviceTier`), re-evaluated on resize, orientation change and Network
   Information change, so it auto-reverts when a query stops matching:

   | Tier | Trigger | Behaviour |
   |---|---|---|
   | `full` | default | every frame, DPR ≤ 2 |
   | `light` | ≤768 px, or `deviceMemory < 4`, or coarse pointer on 3G | `mobileFrames` if supplied, else every 2nd frame; DPR ≤ 1.5 |
   | `poster` | `saveData === true`, or `effectiveType` 2g/slow-2g | **no sequence fetched at all** — poster only, static branch |

   The `poster` tier is the terminal state the blueprint lists as an input but never resolves:
   when the user has explicitly asked the OS to save data, the correct number of sequence
   frames to download is zero. *Measured: 0 sequence requests under emulated `saveData`.*
3. **Sliding decoded-frame window.** Computed at mount from `posterWidth × posterHeight × 4 ×
   frameCount`; above `memoryBudgetMB` (default 250) it turns on automatically and logs which
   way it went. Then:
   - load current ± 12, evict beyond current ± 20;
   - **pinned keyframes are never evicted**, so a fast backward scrub past the evicted edge
     always finds a frame within `keyframeEvery` and `nearestLoaded()` always returns
     something. This is the specific failure the naive window has: scrub forward to the end,
     flick back to the start, blank canvas;
   - eviction calls `ImageBitmap.close()` and `img.removeAttribute('src')`. Use
     `removeAttribute`, **not `img.src = ''`** — assigning the empty string resolves against
     the document URL and fires a real network request;
   - `createImageBitmap` is wrapped in `try`/`catch` **and** a promise rejection handler, both
     falling back to the plain `HTMLImageElement` and disabling bitmaps for the rest of the
     session. Safari has historically thrown on certain sources; a throw must not blank the hero.

   *Measured with the window forced on (`memoryBudgetMB=20`, 60 frames): the path
   0.12 → 0.3 → 0.5 → 0.64 → 0.2 → 0.12 → 0.55 produced **zero blank draws**.*

### D6 — Frames were JPEG only, no WebP path

```js
img.src = `/images/car/frames/frame-${String(i).padStart(2, '0')}.jpg`;
```

Hard-coded extension, hard-coded 2-digit padding, one format for every device.

**Fix.** `formats={{ webp, jpeg }}` with a cached synchronous capability probe
(`canvas.toDataURL('image/webp')`). WebP where supported, JPEG otherwise, decided before a
single request goes out — no `<picture>`, no double-fetch, no server negotiation.

Which format to actually ship is a real decision, not a default:

- **Bandwidth-bound** (mobile, long sequence, slow link) → WebP q72, or AVIF q50 which is
  roughly JPEG q75 at half the bytes.
- **Decode-bound** (very long sequences, low-end Android) → JPEG. AVIF's per-frame decode cost
  is materially higher, and in a scrubber you pay it 60 times, not once.
- **Never PNG for a sequence.** WebP/AVIF are mandatory only when you need alpha.

Measured on this box by `scripts/frames.mjs`, reproducible verbatim:

```
node scripts/frames.mjs from-video public/videos/car-disassembly.mp4 \
     --out /tmp/seq --fps 8 --max-frames 24 --widths 960,480
  OK   desktop  24 frames    342 KB (14.3 KB/frame, 960x540)  decoded 50 MB
  OK   mobile   24 frames    165 KB (6.9 KB/frame, 480x270)   decoded 12 MB
  PNG intermediates 6,335,107 B -> emitted 577,148 B (9.1%)
```

So ~14 KB/frame at 960 px and ~7 KB/frame at 480 px, from lossless PNG at ~264 KB/frame.
Per-frame cost scales with area, not with frame count — quote the width alongside the
KB/frame or the number means nothing.

### D7 — The poster cross-faded to `opacity: 0`, and lost LCP with it

This one was not in the reference implementation. It was in **this component**, and
`scripts/verify.mjs` found it when the component was run through its own gate:

```
FAIL  HERO-LCP-CANDIDATE     the hero <img> starts at opacity:0, so it is not an LCP candidate
        poster.jpg — animation-name: none, computed opacity now: 0
        LCP went to h1.hero-headline "Auto Servis Tuzla" instead.
```

The poster was styled `opacity: firstFrameReady ? 0 : 1` with a 320 ms transition, so the
moment the canvas painted its first frame the poster faded away. It looks identical — the
opaque canvas is covering it either way — and it costs you the measurement: **an element
that reaches `opacity: 0` is not a largest-contentful-paint candidate.** On a fast
connection the canvas wins that race, LCP silently hands off to whatever text is on screen,
and the poster you spent the byte budget on is never the thing being timed. The failure is
invisible in the design and visible only in the LCP element name.

**Fix.** The poster is never faded. It stays at `opacity: 1` for the life of the page,
underneath the canvas, and only the canvas fades in. Three things improve at once: the
poster stays an LCP candidate, there is one fewer animated layer (and one fewer
`will-change: opacity`), and `parallax` (alpha canvas) plus `fit="contain"` (letterbox
bars) get a real backdrop instead of the page background showing through.

*Measured, same build, before and after the change:*

```
before   FAIL  HERO-LCP-CANDIDATE   ... not an LCP candidate      HERO-PAYLOAD 364.9KB
after    WARN  HERO-LCP-CANDIDATE   valid candidate, lost to text HERO-PAYLOAD 262.3KB
```

### D8 — cover-fit showed a quarter of the frame on a portrait phone

See §8, "The portrait crop". It is a mobile-layout defect, not a loading one, and it is the
only defect in this list that passes every numeric assertion in §7 while being obvious the
instant you look at a screenshot.

---

## 4. Choreographing overlays without a second scroll listener

Every tick writes `--pw-progress` (0…1) onto the sticky pin element and calls `onProgress`.
Prefer the CSS custom property: it drives overlays with **zero React re-renders**, on
transform and opacity only.

```css
.hero-headline {
  opacity: calc(1 - var(--pw-progress, 0) * 6);          /* gone by ~17% */
  transform: translate3d(0, calc(var(--pw-progress, 0) * -50px), 0);
}
.hero-hotspots { opacity: calc((var(--pw-progress, 0) - 0.68) * 7); }
```

Use `onProgress` only when JS genuinely needs the number (switching a caption, firing an
analytics beacon). Calling `setState` at 60 Hz re-renders the whole subtree every frame and
will undo the work D3 just did.

### The fade-OUT trap — read this before shipping any overlay

Under reduced motion the pin renders with `--pw-progress: 1`, so every expression above
lands on its **end state**. For an overlay that fades *in* (`.hero-hotspots`) that is
exactly right: it ends visible. For an overlay that fades *out* — like `.hero-headline`
above — the end state is `opacity: 0`, and a reduced-motion visitor therefore gets **no
headline at all**. Not a still version of the animation: the text is simply gone.

This is not theoretical. Rendering the component with a fade-out caption and running
`verify.mjs` reports it as a hard failure at both widths:

```
FAIL  REDUCED-MOTION         prefers-reduced-motion does not present a complete end state
- 375px: CONTENT INVISIBLE under reduce — p "Od sirovog čelika do gotovog komada"
- 375px: reduce build shows 95 chars vs 126 normally — content is missing, not merely still
```

The static branch tags the section, so restoring the resting state is one rule. Key off the
attribute rather than the media query and save-data / no-frames tiers are covered too — they
pin `--pw-progress: 1` for the same reason and have the same problem:

```css
/* Anything that fades OUT across the scrub must be put back when there is no scrub. */
[data-pw-scrubber='static'] .hero-headline {
  opacity: 1;
  transform: none;
}
```

The rule of thumb: **an overlay may end hidden only if it also starts hidden.** If it
carries text the visitor would otherwise never read, it must be legible at
`--pw-progress: 1`.

---

## 5. Do NOT reflexively shorten the scroll section

The instinct on seeing a steppy scrub is to shorten the section. Do the arithmetic first.

With `sectionHeight: '500vh'`, a `100svh` sticky child and `scrollRange: [0.10, 0.65]`:

```
scrollable travel      = 500vh − 100vh          = 400vh
range actually mapped  = (0.65 − 0.10) × 400vh  = 220vh
cadence                = 60 frames / 2.2 viewports ≈ 27.3 frames per 100vh
```

That is a good cadence. **Shortening the section makes it worse** — the same 60 frames over
less travel is a faster, steppier scrub, not a smoother one. If it looks steppy you need more
frames, not less scroll.

Treat the "20–40 frames per 100vh" and "60–180 frames" figures as uncited heuristics, because
they are. Validate against the one measured reference instead: **Apple, 147 frames at
1158×770, ~42.5 KB average, ~6.2 MB total.** Note what that says — restrained in *resolution*,
not in payload. And note 147, not 148: `0148` returns 404.

---

## 6. Integration checklist

- [ ] **`<link rel="preload" as="image" href="<poster>" fetchpriority="high">` in `index.html`.**
      In a client-rendered SPA the HTML is `<div id="root">` and a module script; the poster
      `<img>` cannot paint until the bundle downloads, parses and mounts. **Editing the React
      component alone does nothing for LCP.** This is the single most-missed line in the build.
- [ ] Canvas is never an LCP candidate (the spec list is `<img>`, `<image>` in SVG, `<video>`,
      `url()` background-image, and block-level elements containing text). The poster is your
      LCP element — give it real `width`/`height` so it is also your CLS guard.
- [ ] **Nothing fades the poster out.** Not this component (fixed, §3 D7) and not your own
      CSS: an entrance animation on the hero `<img>` that passes through `opacity: 0`
      disqualifies it from LCP. Animate a wrapper, or transform only.
- [ ] **`mobileFit` / `mobilePinHeight` decided, not defaulted.** Check the console for the
      portrait-crop warning at 375 px before you call the hero done (§8).
- [ ] `posterWidth`/`posterHeight` are the **real** frame dimensions — the memory budget is
      computed from them.
- [ ] `ariaLabel` describes what the animation *shows*, in the site's language. The canvas is
      `aria-hidden`; the same information exists as visible text elsewhere on the page.
- [ ] A skip link precedes the hero, and every hero CTA is duplicated in the static contact
      block. Tabbing to a control inside a 500vh sticky section makes the browser scroll to it,
      which drives the scrubber to an arbitrary frame. `scroll-reveal.css` §4 sets
      `scroll-margin` on focusables inside `.pw-stage` for the same reason.
- [ ] Hotspots are real `<button>`s with accessible names, ≥44 px at 375 px, with the
      two-column grid fallback below the image on mobile.
- [ ] Frame sequence ≤4 MB desktop / ≤1.5 MB mobile on disk, **and** the decoded figure
      `W × H × 4 × frames` written down in a comment. Split the mobile budget by what must
      land first: poster ≤80 KB, keyframe subset ≤250 KB, remainder up to the cap. At
      1.6 Mbps, 1.5 MB is 7.5 seconds.
- [ ] Frame files are 4-digit padded and served from hashed immutable paths
      (`/anim/* → Cache-Control: public, max-age=31536000, immutable` in `public/_headers`).
- [ ] Cloudflare Pages caps: <20,000 files per site, <25 MiB per file. Two ladders of a
      300-frame sequence is 600 files — count them.

---

## 7. Verifying it — what to actually measure

Chromium is available in this container at
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome` with `playwright@1.62.1`. Launch with
`{ executablePath, args: ['--no-sandbox'] }`. **Do not run `playwright install`.**

A green Lighthouse score proves nothing here: **Lighthouse never scrolls**, and scroll is not
an excluding input in the Layout Instability spec, so scroll-triggered CLS gets no 500 ms grace
period *and* is invisible in every lab score. Drive it yourself.

The assertions that actually catch the six defects — read the numbers, not the screenshots:

| Check | Method | Pass |
|---|---|---|
| Frames really change | Hash a coarse pixel grid off the canvas at several scroll positions | ≥6 distinct hashes over 7 positions |
| D1 resize redraw | Change viewport, wait ~120 ms, **do not scroll**, re-hash | Non-blank, and the hash changed with the new aspect |
| D2 ladder | Watch request order and `fetchPriority` | Poster first; keyframes high; remainder low, after `load` |
| D3 parking | Monkey-patch `requestAnimationFrame` and count for 1 s, settled and offscreen | 0 and 0 |
| D4 reduced motion | `newContext({ reducedMotion: 'reduce' })` | `data-pw-scrubber="static"`, 0 canvases, section = 1 viewport, 0 rAF, still renders |
| D5 DPR clamp | 375 px viewport at `deviceScaleFactor: 3` | Backing store ≈563 px wide, not 1125 |
| D5 window | `memoryBudgetMB=20`, scrub forward then far backward | 0 blank draws (mean luminance never collapses) |
| D5 save-data | `addInitScript` overriding `navigator.connection.saveData` | 0 sequence frame requests |
| Scroll CLS | `PerformanceObserver({type:'layout-shift'})` during a scripted scroll | 0 entries with `hadRecentInput === false` |
| Mobile layout | 375 px viewport | `scrollWidth <= innerWidth` |
| D7 poster LCP | `verify.mjs` HERO-LCP-CANDIDATE | not FAIL — the poster must never reach `opacity: 0` |
| D8 portrait crop | `min(srcAspect,dstAspect)/max(...)` at 375 px | ≥ 0.45 of the frame visible, or a documented `mobileFit` / `mobilePinHeight` |

Re-measured on this box, Chromium 141, against a built probe page. **Half of these numbers
are a function of the props you pass**, so the configuration is stated with them — quoting a
pin-height-dependent figure without the pin height is how a later re-run "disproves" a
correct measurement.

Measured with **1280×720 frames, `fit="cover"`, `pinHeight="100svh"`, `mobilePinHeight`
UNSET** — i.e. the component's defaults, which is also the configuration that produces the
D8 defect:

```
D1  resize 1440x900 -> 900x1200, no scroll   backing store 900x1200, hash changed, lum 199.0 -> 208.1
D3  rAF calls in 1s, settled in view                                                              0
D3  rAF calls in 1s, scrolled past                                                                0
D4  reduce: data-pw-scrubber="static", reason="reduced-motion", canvases 0, rAF 0,
    section height 812px == viewport 812px, still = reducedMotionFrame, --pw-progress: 1
D5  375x812 @ deviceScaleFactor 3            backing store 563x1218   (375 x 1.5 wide;
                                             the HEIGHT is 1.5 x the pin, so it moves
                                             with mobilePinHeight — only 563 is the assertion)
D5  saveData: true                           data-pw-scrubber="static", reason="save-data",
                                             0 FrameStore requests
D8  fraction of frame visible, cover          1440x900: 90%      375x812: 26%
```

Apply the §8 fix `mobilePinHeight="55svh"` to the same page and the phone column moves,
exactly as the arithmetic in §8 says it must — this is the same component behaving correctly,
not a contradiction:

```
D4  section height                            812 -> 447   (812 x 0.55)
D5  backing store @ dSF 3                     563x1218 -> 563x671   (width unchanged)
D8  fraction visible at 375x812               26% -> 47.2%          (clears the 0.45 gate)
```

**Frames really change** is a shape assertion, not a fixed count: sample the scrub at 7 evenly
spaced positions and require the grid hash to take **at least 3 distinct values**, with repeats
at the tail being normal — once the scrub reaches the last frame every later sample is
identical by design. Measured 4 distinct / 7 at 1440 and 3 distinct / 7 at 375 on the 55svh
build. A run that returns **1** distinct value is the real failure: the canvas is painting one
frame forever.

Then **look at the screenshots**. It is the only distinctiveness check that exists, and a
scrubber can pass every numeric assertion while drawing a mis-cropped, upside-down or
duplicated sequence.

---

## 8. Known limits — say these out loud rather than discovering them

### The portrait crop — the one defect every numeric gate misses

`fit: 'cover'` crops the source to the destination aspect ratio. A landscape frame sequence
in a full-height sticky pin on a portrait phone is the worst case in this component, and it
is invisible to every check in §7: no horizontal overflow, no CLS, no budget breach, six
distinct frame hashes, mean luminance healthy. The hero is simply unrecognisable.

Measured on the built probe page, 1280×720 frames, `fit="cover"`, `pinHeight="100svh"`:

| Viewport | Pin box aspect | Fraction of each frame visible |
|---|---|---|
| 1440 × 900 | 1.600 | **90 %** |
| 375 × 812 | 0.462 | **26 %** |

At 375 px you are showing roughly a quarter of the picture — for a car sequence, one door
panel. The arithmetic is `min(srcAspect, dstAspect) / max(srcAspect, dstAspect)`.

Three fixes, in order of how good they look:

1. **Ship a portrait-cropped mobile ladder.** Re-run `scripts/frames.mjs` with a mobile
   width and a portrait crop, point `mobileSrcPattern` at it. Best result, most work.
2. **`mobilePinHeight`.** Measured at 375×812 with 1280×720 frames: `62svh` gives a
   375×503 pin and **42 %** visible — better, and still under the default 0.45 threshold, so
   the warning correctly keeps firing. `55svh` gives a 375×447 pin and **47 %**, which clears
   it. The pin is shorter, so the overlay needs less room; budget for that.
3. **`mobileFit="contain"`.** Nothing is cropped — the prop is applied to the canvas painter
   *and* to the poster's `object-fit`, so the two never disagree. But a 16:9 frame in a
   100svh portrait pin letterboxes to about a third of the height. Acceptable when the frame
   is a diagram or a product on a plain ground; poor when it is an interior.

The component warns once in the console when cover-fit drops below `cropWarnFraction`
(default 0.45), naming the measured percentage and both pin dimensions. Do not silence it
without doing one of the three.

### Everything else

- **Under ~12 real frames a `scrub` reads as steppy.** Use `crossfade` instead; the dissolve
  hides the gaps. Do not pad a thin sequence.
- **`crossfade` decodes two frames per tick** near a boundary. That is the intended cost, but
  it means the effective memory budget is tighter than `scrub` — lower `memoryBudgetMB` if
  you are near the edge.
- **`wipe` clips on the canvas**, not with CSS `clip-path`, so Safari's compositor allowlist
  is irrelevant here — but it also means the divider cannot be dragged. If the client wants a
  draggable handle, that is a separate CSS/pointer component layered over two `<img>`s;
  `scroll-reveal.css`'s `.pw-wipe` is the CSS route.
- **`parallax` loads every layer at high priority** — there are only 2–3, and a partial
  composite looks broken. Keep the layer count at 3 or fewer.
- **Firefox stable has not shipped CSS scroll-driven animations** (`animation-timeline` is
  ~84% global, not Baseline). This component does not depend on it at all — it is
  IntersectionObserver + rAF, which is Widely Available. Only `scroll-reveal.css` needs the
  `@supports` guard.
- **The component never animates a layout property**, and neither should your overlay. Scroll
  gets no CLS grace period: `translateY` not `top`, `scaleY` not `height`, `opacity` not
  `visibility` + `height`.

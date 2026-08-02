# Animation Recipes — R1…R10

Ten hero-motion recipes, **ordered cheapest-first**, each keyed to the assets it needs. Every one ships
complete code, the exact asset-prep commands that produce its inputs, a reduced-motion end state, a
touch/mobile fallback, and a payload budget in real numbers.

**This file is the routing layer.** It decides *which* motion a build gets and how to manufacture its
inputs. It deliberately does not repeat what is already written down:

| For… | Go to |
|---|---|
| The `.stage` / `.stage__pin` pinned-section primitive | `scroll-effects.md` §0.6 |
| `motion.js` (`revealOnce`, `HAS_SDA`, `clamp`, `lerp`) | `scroll-effects.md` §0.5 |
| The global `motion-base.css` reduced-motion block | `scroll-effects.md` §0.4 |
| A plain sequence scrubber with no loading ladder (`ScrollSequence`) | `scroll-effects.md` §3 |
| Text reveals, stacking cards, horizontal sections, 3D splits | `scroll-effects.md` §1–§12 |
| Hover, cursor, magnetic, tooltip, form micro-states | `hover-effects.md` |
| Deriving the palette / type / motion budget from the client's evidence | `brand-identity.md` |
| Whitespace, timing curves, "does this read expensive" | `luxury-register.md` |
| Alt text language, JSON-LD, OG cards, CWV targets | `i18n-seo.md` |
| Packaging, gates, handover | `delivery.md` |

Everything below assumes `scroll-effects.md` §0.4–§0.6 is already on the page.

---

## 0. Before any recipe

### 0.1 The routing algorithm — mechanical, not taste

Run `triage` first and count. Every variable below is a number you can read off the harvest manifest:

| Var | Definition |
|---|---|
| `V` | seconds of usable client video where the motion is legible at 1280px |
| `P` | before/after **pairs** of the same subject (same-ish framing, distinct states) |
| `S` | registered stills of **one** subject — different angles or successive stages |
| `G` | usable stills of any kind, ≥1200px long edge, not a logo, not a screenshot |
| `H` | hero-grade stills: ≥1600px long edge, subject occupies 30–70% of frame |
| `L` | 1 if a logo or any vector/high-contrast mark exists, else 0 |

Then execute in order. **The first rule that matches wins. Stop there.**

```
1.  V ≥ 2.0                        → SET-E → R7   (frame sequence from real video)
2.  P ≥ 1                          → SET-D → R3   (before→after wipe)      ← beats 3 and 4 always
3.  S ≥ 12                         → SET-C → R2   (assembly / orbit sequence)
4.  G ≥ 6                          → SET-B → R4   (cross-dissolve gallery scrub)
5.  H ≥ 1 and subject is cut-outable → SET-A → R1 (2.5D depth push)
6.  H ≥ 1 and subject is dense/labelled → SET-A → R5 (hotspot reveal)
7.  L = 1                          → SET-G → R6 on the traced logo + R9
8.  otherwise                      → SET-F → R6 on a trade path + R9
```

Notes that make this hold up:

- **Rule 2 outranks 3 and 4 deliberately.** A before/after pair converts harder than any amount of
  gallery motion. If you have both a pair and twenty gallery shots, the pair is the hero and the
  gallery becomes a static grid.
- **Rule 3's threshold of 12 is a hard floor, not a preference.** Under 12 registered stills a
  sequence reads steppy and looks *cheaper* than one still. 8 angles → drop to rule 4, where the
  crossfade hides the gaps.
- **Rules 5 and 6 differ on one question only:** does the photo have ≥3 nameable things in it that a
  customer would pay for? Engine bay, treatment room, tool wall, product shelf → R5. One dish, one
  facade, one cut product → R1.
- **R8 and R10 are unreachable from this algorithm.** They are opt-in extras, added only after the
  page already passes every gate without them. See their sections for why.

**Supporting recipes.** After the hero is fixed, add **at most two** from `{R5, R6, R9}` for lower
sections. Never add a second canvas. A page containing a sequence scrub *and* a WebGL scene *and* a
Lottie fails the ONE HARD IDEA gate — delete two.

Write the choice **and the rejected alternatives with reasons** into `work/concept.md`. The rejection
reasons are what stop a later agent from stacking effects back on.

### 0.2 Non-negotiables that apply to all ten

- **Credentials.** Never enumerate, probe, or test credentials from the environment. Do not read
  `process.env` looking for tokens. Do not fire ambient Google/AWS/Cloudflare/`gh` credentials at any
  endpoint to see whether they work. The only key any recipe may touch is one the **end user explicitly
  supplied for this job at run time**, and if they did not supply it, the recipe that needed it is
  simply unavailable — say so and route elsewhere.
- **Imagery that ships is the client's own.** Third-party or unlicensed imagery is style reference
  only, lives in `reference-only/`, and is excluded from the build (`brand-identity.md` §7).
- **Faces are a provenance gate, not a free asset.** R3 before/after is literally faces. Salon, gym,
  restaurant and clinic photos contain identifiable third parties; small-business photos are frequently
  the *photographer's* copyright, not the client's. Before any identifiable face reaches a hero, record
  in `work/concept.md` that the client confirms consent for each person and that they hold the rights —
  or crop. **For medical/dental the default is crop-to-detail** (teeth only, the treated area only),
  not a full face, and the reveal is click-gated rather than scroll-autoplayed.
- **Transform and opacity only for anything scroll-linked.** Scroll is not an excluding input in the
  Layout Instability spec, so scroll-driven shifts get **no 500 ms grace period** and count in full.
  `translateY` not `top`; `scaleY` not `height`; `opacity` not `visibility`+`height`.
  Two justified exceptions, both bounded: `stroke-dashoffset` in R6 (SVG paint, one element, capped at
  ~20 subpaths) and `clip-path: inset()` in R3 (one element — and R3 ships the pure-compositor
  transform-mask variant as its default anyway).
- **Native CSS scroll-driven animation is an enhancement, never load-bearing.** Firefox stable still
  has it behind `layout.css.scroll-driven-animations.enabled` as of Aug 2026 — roughly 1 in 8 visitors.
  The load-bearing path is IntersectionObserver + rAF (§0.7) or GSAP ScrollTrigger; `@supports
  (animation-timeline: view())` only ever *replaces* that path where it exists.
- **The order trap.** `animation-timeline` and `animation-range` are reset-only longhands: the
  `animation` shorthand silently resets them to `auto`/`normal`. Declare them **after** the shorthand,
  every time. This is the single most common "why isn't my scroll animation working".
- **Safari's compositor allowlist** for scroll-driven animations is `opacity, transform, translate,
  scale, rotate, filter, backdrop-filter` and Motion Path. `width`, `height`, `color`, `clip-path`,
  `stroke-dashoffset` silently fall back to the main thread there. That is acceptable at the volumes
  specified in each recipe and nowhere else.
- **GSAP is free of charge for this** (all plugins, since Apr 2025) but is **not MIT** — it is a
  Webflow "no charge" licence whose Prohibited Use bars building a no-code animation builder on top of
  it. Generating GSAP into a client's site is exactly the permitted case. Budget it honestly:
  `gsap` + `ScrollTrigger` = **45 KB gzip** (27 + 17). Most recipes here do not need it.

### 0.3 Payload budgets — the whole table, real numbers

Measured on this container's toolchain (sharp 0.35.x / libvips 8.18, WebP q72, AVIF q50).
Reference points: 24 frames @480px went 5,232 KB PNG → **314 KB** WebP (~13 KB/frame); Apple's own
sequence is 147 frames @1158×770, **~42.5 KB average**, ~6.2 MB total — restrained in *resolution*,
not in payload.

| Recipe | What ships | Desktop | Mobile ≤768px | Recipe JS (gzip) | Peak decoded bitmap |
|---|---|---|---|---|---|
| R1 | 1 background plate + 1 alpha cutout | **≤ 250 KB** | ≤ 110 KB | 1.4 KB | ~11 MB |
| R2 | 24–40 frame sequence, 2 ladders | **≤ 2.2 MB** | ≤ 1.0 MB | 4.6 KB | 118 MB @32×1280×720 |
| R3 | 2 images per pair × ≤4 pairs | **≤ 800 KB** | ≤ 340 KB | 2.1 KB | 13 MB per visible pair |
| R4 | 8–16 gallery frames, 2 ladders | **≤ 900 KB** | ≤ 420 KB | 4.6 KB | 44 MB @12×1280×720 |
| R5 | 1 still + hotspot data | **≤ 140 KB** | ≤ 80 KB | 2.4 KB | 6.4 MB |
| R6 | 1 SVG (0.7–1.9 KB) + CSS | **≤ 3 KB** | ≤ 3 KB | 0.9 KB | ~0 |
| R7 | 48–72 frames from video, 2 ladders | **≤ 3.6 MB** | ≤ 1.4 MB | 4.6 KB | 221 MB @60×1280×720 |
| R8 | 1 texture plate (optional) | ≤ 100 KB | ≤ 60 KB | 0 | 2.4 MB |
| R9 | nothing | **0 KB** | 0 KB | 1.1 KB | 0 |
| R10 | 24–40 rendered RGBA frames | **≤ 1.0 MB** | ≤ 500 KB | 4.6 KB | 66 MB @32×960×540 |

These sit inside the page-level budget, which is the one that actually decides whether you ship:

```
JS, whole page                    ≤ 120 KB gzip   (drop react-router entirely: one page, anchor nav)
First-viewport transfer           ≤ 400 KB        (HTML + critical CSS + JS + poster + 2 woff2)
  └─ poster alone                 ≤  80 KB
  └─ keyframe subset (first usable scrub) ≤ 250 KB
  └─ remainder                    up to the recipe cap, at Low priority, AFTER load
LCP ≤ 2.5 s and INP ≤ 200 ms at 1.6 Mbps / 150 ms RTT / 4× CPU throttle
Decoded-bitmap ceiling            ~250 MB → above this the sliding window (§0.8) is mandatory
Cloudflare Pages                  ≤ 20,000 files per site, ≤ 25 MiB per file
```

Two derived rules people get wrong:

- **`navigator.connection.saveData === true` → fetch no sequence at all.** Poster only, stage collapses.
  saveData is a *terminal* tier, not one input among several.
- **Budget by decoded size, not file size.** `W × H × 4 × frames`. 60 frames at 1280×720 is **221 MB of
  live bitmap** from 3.9 MB on disk. That is the iOS-Safari tab-kill risk and it is invisible in the
  Network panel. Write the arithmetic into a comment next to the frame count.

### 0.4 The reduced-motion contract

`prefers-reduced-motion: reduce` means **show the end state instantly**. It never means "show nothing",
and it never means "leave a 400vh empty runway the user has to scroll through".

| Recipe | Reduced-motion end state |
|---|---|
| R1 | Composite rendered at its mid-state, layers at rest, stage → `100svh` |
| R2 | Last frame (the assembled object), stage → `100svh`, no preload beyond that one frame |
| R3 | Before and after **side by side, both labelled**, no scroll coupling, divider removed |
| R4 | Static gallery grid of every photo — genuinely the more useful presentation |
| R5 | Image + all hotspots visible and static, no pulse, no fade-in |
| R6 | Path fully drawn, statically |
| R7 | Most informative frame (usually not the last), stage → `100svh` |
| R8 | Plate is static already; kill any drift |
| R9 | The headline, set. It was always the end state. |
| R10 | Final rendered frame, stage → `100svh` |

Also gate, because these are the ones everyone forgets:

- **Infinite decorative loops** — pulsing glows, bouncing chevrons, shimmer. These are exactly the
  vestibular triggers WCAG 2.3.3 targets and they typically run unconditionally because nobody
  files them under "the animation". Also: `box-shadow` is not compositor-accelerated — pulse
  `transform`/`opacity` instead, or not at all.
- **Lenis / smooth-scroll itself.** Hijacked scroll momentum is independently a motion-sickness
  trigger, not merely a carrier for the animations it drives.
- **Autoplaying video** used as a fallback tier. Under reduced motion it becomes a poster frame.

### 0.5 The touch / mobile ladder

Apply in this order — earliest wins, most benefit per line of code:

```
1. ≤768px               half-resolution ladder (960×540)          ← biggest win, no logic change
2. ≤768px               every 2nd frame                            ← halves bytes AND decode
3. ≤480px               autoplay muted playsinline loop, or static poster
4. saveData || 2g       static poster only. Never fetch the sequence.
5. deviceMemory < 4     force the sliding window on regardless of frame count
```

Express the queries through one `matchMedia` list so everything auto-reverts when a query stops
matching (rotating a tablet, resizing a desktop window). Never branch once on `innerWidth` at boot.

Two touch rules that are not about bytes:

- **Hover does not exist.** Anything revealed on `:hover` must also be reachable by tap or already
  visible. Gate hover-only affordances behind `@media (hover: hover) and (pointer: fine)`
  (`hover-effects.md` §0 Law 1).
- **A pinned hero costs thumb-scroll.** On ≤768px halve every `--stage-h` in this file. A 500vh stage
  is ~7 full swipes on a phone; 250vh is ~3.

### 0.6 Accessibility rules that are specific to animated heroes

- **Alt text is authored, never derived from a filename.** Write it from trade + subject in the site's
  language: `alt="Servisiranje kočnica u radionici u Gradačcu"`, not `alt="IMG_2841"`. Purely
  decorative gallery tiles take `alt=""`. See `i18n-seo.md` §5.5 for the per-language rules. Any
  `<img>` in the built output without an `alt` attribute is a build failure.
- **A `<canvas>` is not an image to a screen reader and is not an LCP candidate.** Give it
  `role="img"` + a real `aria-label` describing what the motion communicates, and ship frame 0 as a
  separate real `<img fetchpriority="high" loading="eager" decoding="async">` with explicit
  `width`/`height` — that image is both the LCP element and the CLS guard. In a client-rendered SPA
  it cannot paint before the bundle mounts, so `<link rel="preload" as="image" fetchpriority="high">`
  must **also** be in `index.html` `<head>`. Editing only the component does nothing.
- **Focus inside a pinned hero moves the scroll position**, which drives the scrubber to an arbitrary
  frame. Three fixes, all required together:
  ```html
  <a class="skip" href="#main">Preskoči na sadržaj</a>   <!-- first focusable on the page -->
  ```
  ```css
  .skip{position:absolute;left:-9999px}
  .skip:focus{position:fixed;left:1rem;top:1rem;z-index:99}
  .stage__pin :is(a,button,input,[tabindex]){ scroll-margin-top: 40vh; }
  ```
  …and every CTA inside the hero is **duplicated** in the static contact block, so keyboard users
  never have to enter the pinned section at all.
- **Target size.** WCAG 2.2 SC 2.5.8 floor is **24×24 CSS px**; ship **44×44** (Apple HIG / SC 2.5.5).
  R5 enforces this at runtime because percentage-positioned hotspots silently violate it on a phone.
- **Audio, if any hotspot or panel plays a clip** (WCAG 1.4.2): never autoplay; a visible pause control
  is mandatory for anything over 3 s; `preload="none"` so it never competes with the poster; and its
  bytes count against the page budget like everything else.
- **`forced-colors`.** In `@media (forced-colors: active)` a canvas and an SVG stroke both stop
  conveying anything. Provide the same information as text, and set `forced-color-adjust: none` only on
  elements where you have verified the result.

### 0.7 `progress.js` — the shared scrub driver

Load-bearing path for R1, R3, R6-scrub and R9. ~60 lines, no dependencies, works everywhere
IntersectionObserver works. It sets a single custom property `--p` (0→1) on the stage; all the motion
is expressed in CSS against that one number.

```js
/* progress.js — drives --p (0..1) on a stage from its own pinned scroll range.
   Complements scroll-effects.md §0.5 (motion.js); does not replace it. */
export const REDUCED = matchMedia('(prefers-reduced-motion: reduce)');
export const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;

/** Coarse device tier, re-evaluated live. Used by every recipe's mobile ladder. */
export function deviceTier() {
  const saveData = navigator.connection?.saveData === true;
  const slow = /^(slow-)?2g$/.test(navigator.connection?.effectiveType || '');
  if (saveData || slow) return 'poster';                       // terminal tier: no sequence at all
  if (matchMedia('(max-width: 480px)').matches) return 'small';
  if (matchMedia('(max-width: 768px)').matches || (navigator.deviceMemory ?? 8) < 4) return 'mobile';
  return 'full';
}

/**
 * @param {HTMLElement} stage  tall element; its height defines the scrub length
 * @param {{ease?:number, restAt?:number, onProgress?:(p:number)=>void}} opts
 * @returns {() => void} teardown
 */
export function scrubProgress(stage, { ease = 0.12, restAt = 1, onProgress } = {}) {
  const set = p => {
    stage.style.setProperty('--p', p.toFixed(4));
    onProgress?.(p);
  };

  // Reduced motion: publish the rest state once. No observer, no rAF, no listener.
  if (REDUCED.matches) { set(restAt); return () => {}; }

  let cur = 0, target = 0, raf = 0, visible = false;

  const measure = () => {
    const r = stage.getBoundingClientRect();
    const total = r.height - innerHeight;
    return total > 0 ? clamp01(-r.top / total) : 0;
  };

  const tick = () => {
    raf = 0;
    target = measure();
    cur += (target - cur) * ease;
    if (Math.abs(target - cur) < 0.0004) cur = target;
    set(cur);
    if (cur !== target && visible) kick();
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };

  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) kick();
  }, { rootMargin: '25% 0px' });
  io.observe(stage);

  const onScroll = () => { if (visible) kick(); };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });
  set(measure());

  return () => {
    io.disconnect();
    removeEventListener('scroll', onScroll);
    removeEventListener('resize', onScroll);
    cancelAnimationFrame(raf);
  };
}
```

Register `--p` once so CSS can also animate it natively where scroll-driven animations exist:

```css
@property --p { syntax: '<number>'; inherits: true; initial-value: 0; }
```

### 0.8 `seq-plus.js` — the sequence scrubber with a loading ladder and a memory window

Use `scroll-effects.md` §3 `ScrollSequence` when you have ≤60 frames and no memory pressure — it is
smaller and it is enough. Use **`SequencePlus`** below when any of these is true, which covers R2, R4,
R7 and R10:

- you need **crossfade** between visually unrelated frames (R4), which `ScrollSequence` cannot do;
- `W × H × 4 × frames` exceeds ~250 MB, so frames must be evicted;
- the hero must be scrubbable **before every frame has landed** — the three-tier ladder.

Why the ladder is not optional: images created with `new Image()` are never in the document, never
participate in layout, and therefore **never receive Chrome's in-viewport priority boost** — they are
pinned at Low priority forever. An all-or-nothing loader therefore starves its own hero, and one
stalled request blocks the reveal indefinitely.

```js
/* seq-plus.js — sequence + crossfade scrubber with a three-tier loader and a decoded-frame window. */
import { REDUCED, clamp01, deviceTier } from './progress.js';

const KEY_EVERY   = 5;   // every Nth frame is a pinned keyframe: loaded first, NEVER evicted
const WINDOW_KEEP = 12;  // decode and hold current ± this
const WINDOW_EVICT= 20;  // evict beyond current ± this
const MEM_LIMIT   = 250e6; // bytes of decoded bitmap before the window switches on

export class SequencePlus {
  /**
   * @param {HTMLElement} stage   tall .stage element
   * @param {HTMLCanvasElement} canvas
   * @param {{
   *   mode?: 'sequence'|'crossfade',
   *   count: number,
   *   src: (i:number, tier:string) => string,
   *   width: number, height: number,   // intrinsic pixel size of ONE frame, for the memory sum
   *   ease?: number,
   *   restFrame?: number,              // frame shown under reduced motion
   *   onProgress?: (p:number)=>void
   * }} opts
   */
  constructor(stage, canvas, opts) {
    const o = this.o = Object.assign({ mode: 'sequence', ease: 0.12 }, opts);
    this.stage = stage;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.tier = deviceTier();

    // Frame skip: ≤768px takes every 2nd frame. Halves both bytes and decode work.
    this.step = (this.tier === 'mobile' || this.tier === 'small') ? 2 : 1;
    this.dpr = Math.min(devicePixelRatio || 1, this.step === 2 ? 1.5 : 2);

    this.frames = new Map();     // index -> HTMLImageElement | ImageBitmap
    this.pinned = new Set();     // keyframe indices, never evicted
    this.inflight = new Set();
    this.cur = 0; this.target = 0; this.drawnA = -1; this.drawnB = -1;
    this.raf = 0; this.visible = false; this.dead = false;

    // Decoded-memory arithmetic, written down as the gate requires.
    // e.g. 60 frames * 1280 * 720 * 4 = 221 MB live. Above MEM_LIMIT the window is mandatory.
    this.bytesPerFrame = o.width * o.height * 4;
    this.windowed = (this.bytesPerFrame * Math.ceil(o.count / this.step)) > MEM_LIMIT
                 || (navigator.deviceMemory ?? 8) < 4;

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);

    this.restFrame = o.restFrame ?? o.count - 1;

    // Terminal tiers: one frame, no loop, no sequence fetch, runway collapsed.
    // 'small' (<=480px) and 'poster' (saveData/2g) both mean static — §0.5 ladder rules 3 and 4.
    this.static = REDUCED.matches || this.tier === 'poster' || this.tier === 'small';
    if (this.static) { this.staticOnly(); return; }

    this.io = new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting;
      if (this.visible) this.kick();
    }, { rootMargin: '25% 0px' });
    this.io.observe(stage);

    this.onScroll = () => { if (this.visible) this.kick(); };
    addEventListener('scroll', this.onScroll, { passive: true });

    this.ladder();
  }

  /* ---------- loading: poster → keyframes → remainder ---------- */

  async ladder() {
    // Tier 1 — frame 0. The <img> poster in the DOM has already painted; this just seeds the canvas.
    await this.load(0, 'high');
    if (this.dead) return;
    this.resize();
    this.kick();

    // Tier 2 — every Nth frame, so the scrub is usable immediately with nearest-loaded snapping.
    const keys = [];
    for (let i = 0; i < this.o.count; i += KEY_EVERY * this.step) keys.push(i);
    if (keys[keys.length - 1] !== this.o.count - 1) keys.push(this.o.count - 1);
    keys.forEach(i => this.pinned.add(i));
    for (const i of keys) { if (this.dead) return; await this.load(i, 'high'); this.kick(); }

    // Tier 3 — the remainder, at Low priority, on idle, after load. Never competes with the poster.
    const rest = [];
    for (let i = 0; i < this.o.count; i += this.step) if (!this.pinned.has(i)) rest.push(i);
    const idle = window.requestIdleCallback || (cb => setTimeout(() => cb({ timeRemaining: () => 8 }), 60));
    const pump = deadline => {
      while (rest.length && deadline.timeRemaining() > 4) {
        const i = rest.shift();
        if (this.windowed && Math.abs(i - this.frameIndex(this.cur)) > WINDOW_KEEP) continue;
        this.load(i, 'low');
      }
      if (rest.length && !this.dead) idle(pump);
    };
    if (document.readyState === 'complete') idle(pump);
    else addEventListener('load', () => idle(pump), { once: true });
  }

  load(i, priority) {
    if (this.frames.has(i) || this.inflight.has(i)) return Promise.resolve();
    this.inflight.add(i);
    return new Promise(resolve => {
      const img = new Image();
      img.decoding = 'async';
      if ('fetchPriority' in img) img.fetchPriority = priority;
      img.src = this.o.src(i, this.tier);
      img.decode().then(async () => {
        this.inflight.delete(i);
        if (this.dead) return resolve();
        // ImageBitmap gives us an explicit close() so eviction actually frees memory.
        // Safari has historically thrown on some sources — fall back to the <img> itself.
        let asset = img;
        if (this.windowed && 'createImageBitmap' in window) {
          try { asset = await createImageBitmap(img); }
          catch (err) { console.warn('[SequencePlus] createImageBitmap failed, using HTMLImageElement', err); }
        }
        this.frames.set(i, asset);
        this.evict();
        resolve();
      }).catch(() => { this.inflight.delete(i); resolve(); }); // a missing frame must never break the scrub
    });
  }

  /** Window = current ± WINDOW_KEEP; evict beyond ± WINDOW_EVICT; pinned keyframes are never evicted,
   *  so every scrub position always has a frame within KEY_EVERY to draw. */
  evict() {
    if (!this.windowed) return;
    const here = this.frameIndex(this.cur);
    for (const [i, asset] of this.frames) {
      if (this.pinned.has(i)) continue;
      if (Math.abs(i - here) <= WINDOW_EVICT) continue;
      if (typeof asset.close === 'function') asset.close();
      this.frames.delete(i);
    }
  }

  /* ---------- rendering ---------- */

  async staticOnly() {
    await this.load(this.restFrame, 'high');
    this.resize();
    const a = this.frames.get(this.restFrame);
    if (a) this.blit(a, 1);
    this.stage.style.setProperty('--stage-h', '100svh');
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const w = Math.round(r.width * this.dpr), h = Math.round(r.height * this.dpr);
    if (this.canvas.width === w && this.canvas.height === h) return;
    this.canvas.width = w; this.canvas.height = h;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.drawnA = this.drawnB = -1;
    this.paint();
  }

  progress() {
    const r = this.stage.getBoundingClientRect();
    const total = r.height - innerHeight;
    return total > 0 ? clamp01(-r.top / total) : 0;
  }

  frameIndex(p) { return Math.min(this.o.count - 1, Math.max(0, Math.round(p * (this.o.count - 1)))); }

  kick() { if (!this.raf && !this.dead) this.raf = requestAnimationFrame(() => this.tick()); }

  tick() {
    this.raf = 0;
    this.target = this.progress();
    this.cur += (this.target - this.cur) * this.o.ease;
    if (Math.abs(this.target - this.cur) < 0.0004) this.cur = this.target;
    this.o.onProgress?.(this.cur);
    this.paint();
    this.evict();
    if (this.cur !== this.target && this.visible) this.kick();
  }

  /** Nearest loaded frame at or around i. Pinned keyframes guarantee this always returns something. */
  nearest(i) {
    if (this.frames.has(i)) return i;
    for (let d = 1; d <= this.o.count; d++) {
      if (this.frames.has(i - d)) return i - d;
      if (this.frames.has(i + d)) return i + d;
    }
    return -1;
  }

  paint() {
    const raw = this.cur * (this.o.count - 1);
    const i = Math.floor(raw);
    const a = this.nearest(Math.min(i, this.o.count - 1));
    if (a < 0) return;

    if (this.o.mode === 'crossfade') {
      const b = this.nearest(Math.min(i + 1, this.o.count - 1));
      const t = raw - i;
      if (a === this.drawnA && b === this.drawnB && Math.abs(t - this._t) < 0.004) return;
      this.drawnA = a; this.drawnB = b; this._t = t;
      this.ctx.globalAlpha = 1;
      this.blit(this.frames.get(a), 1);
      if (b !== a && t > 0.001) this.blit(this.frames.get(b), t);
      this.ctx.globalAlpha = 1;
    } else {
      const idx = this.nearest(this.frameIndex(this.cur));
      if (idx === this.drawnA) return;
      this.drawnA = idx;
      this.blit(this.frames.get(idx), 1);
    }
  }

  /** cover-fit: fill the box, crop the overflow, never distort */
  blit(asset, alpha) {
    if (!asset) return;
    const iw = asset.naturalWidth ?? asset.width;
    const ih = asset.naturalHeight ?? asset.height;
    if (!iw || !ih) return;
    const cw = this.canvas.width / this.dpr, ch = this.canvas.height / this.dpr;
    const s = Math.max(cw / iw, ch / ih);
    const w = iw * s, h = ih * s;
    this.ctx.globalAlpha = alpha;
    this.ctx.drawImage(asset, (cw - w) / 2, (ch - h) / 2, w, h);
    this.ctx.globalAlpha = 1;
  }

  destroy() {
    this.dead = true;
    this.ro.disconnect();
    this.io?.disconnect();
    removeEventListener('scroll', this.onScroll);
    cancelAnimationFrame(this.raf);
    for (const a of this.frames.values()) if (typeof a.close === 'function') a.close();
    this.frames.clear();
  }
}
```

**Do not shorten the stage reflexively when the scrub feels steppy.** Do the arithmetic first. With
`--stage-h: 500vh` and a `100svh` pin, the scrub range is 400vh; 40 frames over 400vh is 10 frames per
100vh, which is genuinely too few — add frames or shorten. But 60 frames over 220vh (the case where
frames are mapped to progress 0.10–0.65) is 27.3 frames/100vh and is fine; shortening it makes it
worse. The widely repeated "20–40 frames per 100vh" figure has no citation behind it — validate
against the measured Apple reference instead.

### 0.9 The shared asset toolchain

Install build-time tools **into `work/tools/`**, never into the client's `package.json` — otherwise
`sharp` and `ffmpeg-static` ship in their dependency list forever.

```bash
mkdir -p work/tools work/<client-slug>/{raw,frames,out}
npm --prefix work/tools i --silent sharp ffmpeg-static
printf 'work/\n' >> .gitignore     # raw originals + PNG intermediates are easily 200 MB+
```

```bash
# The three facts about this container that break naive pipelines:
ffmpeg -version                      # FAILS: libcaca.so.0: cannot open shared object file
node -p "require('./work/tools/node_modules/ffmpeg-static')"   # <- use this binary instead
# @squoosh/cli installs cleanly and --help works, then throws ERR_INVALID_URL in createWasm
# on any real encode under Node 22. Upstream is archived. It passes smoke tests and fails in
# production. Never install it. sharp does webp, avif and mozjpeg in one prebuilt dependency.
```

Namespace every run by client slug (`work/<slug>/…`) so a second client or a re-run does not silently
destroy the first.

**`work/tools/compress.mjs` — the shared two-ladder compressor used by R2, R4, R7 and R10:**

```js
/* Usage: node work/tools/compress.mjs <inDir> <outDir> [--format webp|avif|jpeg] [--alpha]
   Emits desktop 1280x720 + mobile 960x540 with FOUR-DIGIT padding, and prints the budget report. */
import { readdirSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import sharp from './node_modules/sharp/lib/index.js';

const [inDir, outDir] = process.argv.slice(2);
const fmt   = (process.argv.find(a => a.startsWith('--format=')) || '--format=webp').split('=')[1];
const alpha = process.argv.includes('--alpha');
if (!inDir || !outDir) { console.error('usage: compress.mjs <inDir> <outDir>'); process.exit(1); }

const LADDERS = [
  { name: 'desktop', w: 1280, h: 720, cap: 4_000_000 },
  { name: 'mobile',  w:  960, h: 540, cap: 1_500_000 },
];
// AVIF q50 ≈ JPEG q75 at about half the bytes, but materially higher per-frame DECODE cost.
// Bandwidth-bound (mobile, few frames) -> avif/webp. Decode-bound (long sequence, low-end Android) -> jpeg.
const ENC = {
  webp: s => s.webp({ quality: 72, effort: 4, alphaQuality: alpha ? 90 : 0 }),
  avif: s => s.avif({ quality: 50, effort: 4 }),
  jpeg: s => s.jpeg({ quality: 78, mozjpeg: true }),
};

const files = readdirSync(inDir).filter(f => /\.(png|jpe?g|webp|tiff?)$/i.test(f)).sort();
if (!files.length) { console.error(`no frames in ${inDir}`); process.exit(1); }

for (const L of LADDERS) {
  const dir = join(outDir, L.name);
  mkdirSync(dir, { recursive: true });
  let bytes = 0;
  for (let i = 0; i < files.length; i++) {
    const out = join(dir, `frame-${String(i).padStart(4, '0')}.${fmt}`);  // 4 digits: 147+ frames is normal
    await ENC[fmt](
      sharp(join(inDir, files[i]))
        .resize(L.w, L.h, { fit: alpha ? 'contain' : 'cover', background: { r:0,g:0,b:0,alpha:0 } })
    ).toFile(out);
    bytes += statSync(out).size;
  }
  const decoded = L.w * L.h * 4 * files.length;
  const ok = bytes <= L.cap ? 'OK ' : 'OVER';
  console.log(
    `${ok} ${L.name.padEnd(7)} ${files.length} frames  ${(bytes/1e3).toFixed(0)} KB ` +
    `(${(bytes/files.length/1e3).toFixed(1)} KB/frame, cap ${(L.cap/1e6).toFixed(1)} MB)  ` +
    `decoded ${(decoded/1e6).toFixed(0)} MB${decoded > 250e6 ? '  <-- SLIDING WINDOW MANDATORY' : ''}`
  );
}
```

Measured on this box: 24 frames at 480 px went **5,232 KB PNG → 314 KB WebP q72** (6%, ~13 KB/frame).

---

# R1 — 2.5D parallax depth push

**Cheapest recipe that uses a photograph. One still in, a hero out.**

**Routes in when:** rules 1–4 all failed and `H ≥ 1` and the subject can be cleanly cut out
(a distinct object against a separable background: a dish, a car, a product, a facade).
**SET class: SET-A.**

Primary for restoran, radnja/butik. Default fallback for hotel/vikendica and nekretnine.

### When NOT to use

- The subject is a person's face. The face drifting relative to its frame is genuinely unsettling.
- The photo is a wide scene with no single subject — nothing to separate, so nothing to parallax.
  Route to R5 instead.
- The page already runs R2, R4 or R7. One depth idea per page.
- Behind body copy or a form. Ever.
- The cutout has hair, glass, chain-link or foliage edges and you only have `u2netp`. Check the alpha
  before committing; a bad matte is worse than no parallax.

### Asset prep

```bash
# 1. Cut the subject out.  u2netp is Apache-2.0 and 4.57 MB; birefnet-general-lite (MIT) is the
#    quality step up for hair/glass. NEVER bria-rmbg — BRIA's own model card restricts it to
#    NON-COMMERCIAL use and this is a paying client's site.
pip install "rembg[cpu,cli]"                     # needs Python >= 3.11
rembg i -m u2netp work/<slug>/raw/hero.jpg work/<slug>/out/subject.png
# quality step up:  rembg i -m birefnet-general-lite work/<slug>/raw/hero.jpg work/<slug>/out/subject.png

# 2. Background plate: the same photo, blurred and slightly enlarged so its edges never show
#    when it translates. Blur also buys a much cheaper encode.
node --input-type=module -e "
import sharp from './work/tools/node_modules/sharp/lib/index.js';
await sharp('work/<slug>/raw/hero.jpg')
  .resize(1760, 990, { fit: 'cover' })   // 1600x900 * 1.10 headroom for the drift
  .blur(14)
  .avif({ quality: 45, effort: 4 })
  .toFile('work/<slug>/out/plate.avif');
"

# 3. Subject at two sizes, alpha preserved (WebP: alpha at a fraction of PNG's bytes)
node --input-type=module -e "
import sharp from './work/tools/node_modules/sharp/lib/index.js';
for (const [w, tag] of [[1200,'desktop'],[820,'mobile']])
  await sharp('work/<slug>/out/subject.png')
    .resize({ width: w })
    .webp({ quality: 78, alphaQuality: 90, effort: 4 })
    .toFile(\`work/<slug>/out/subject-\${tag}.webp\`);
"

# 4. Poster for LCP + the 1200x630 social card, from the same pass
node --input-type=module -e "
import sharp from './work/tools/node_modules/sharp/lib/index.js';
const s = sharp('work/<slug>/raw/hero.jpg');
await s.clone().resize(1600, 900, { fit:'cover' }).jpeg({ quality: 74, mozjpeg: true }).toFile('public/hero/poster.jpg');
await s.clone().resize(1200, 630, { fit:'cover' }).jpeg({ quality: 80, mozjpeg: true }).toFile('public/og-1200x630.jpg');
"
```

### Code

```html
<!-- index.html <head> — REQUIRED in a client-rendered SPA; the component alone cannot do this -->
<link rel="preload" as="image" href="/hero/poster.jpg" fetchpriority="high">
```

```html
<section class="stage plx" style="--stage-h: 260vh" aria-labelledby="plx-h">
  <div class="stage__pin">
    <!-- LCP element + CLS guard. A canvas would be neither. -->
    <img class="plx__plate" src="/hero/plate.avif" alt=""
         width="1760" height="990" fetchpriority="high" loading="eager" decoding="async">
    <img class="plx__subject" src="/hero/subject-desktop.webp" alt=""
         width="1200" height="1200" loading="eager" decoding="async"
         srcset="/hero/subject-mobile.webp 820w, /hero/subject-desktop.webp 1200w"
         sizes="(max-width: 768px) 82vw, 1200px">
    <div class="plx__scrim" aria-hidden="true"></div>
    <div class="plx__copy">
      <h1 id="plx-h">Pekara Zrno<br><span>svježe od 5:00</span></h1>
      <a class="btn" href="tel:+38761234567">Nazovi — 061 234 567</a>
    </div>
  </div>
</section>
```

```css
@property --p { syntax: '<number>'; inherits: true; initial-value: 0; }

.plx .stage__pin { position: relative; }
.plx__plate, .plx__subject {
  position: absolute; inset: 0; margin: auto;
  width: 100%; height: 100%; object-fit: cover;
  /* transform + opacity ONLY. Nothing here can shift layout. */
  will-change: transform;
}
.plx__subject { object-fit: contain; }
.plx__scrim {
  position: absolute; inset: 0;
  background: linear-gradient(to top, rgb(12 10 9 / .82) 0%, rgb(12 10 9 / .40) 45%, transparent 78%);
}
.plx__copy { position: relative; z-index: 2; align-self: end; padding: clamp(1.5rem, 5vw, 4rem); }

/* The whole effect. Three rates, capped travel, transform only.
   Far plate 1.00x, subject 0.62x, copy 0.30x — differential is what reads as depth. */
.plx__plate   { transform: translate3d(0, calc(var(--p) * -6%),  0) scale(calc(1.06 - var(--p) * .04)); }
.plx__subject { transform: translate3d(0, calc(var(--p) * -14%), 0) scale(calc(1.00 + var(--p) * .07)); }
.plx__copy    { transform: translate3d(0, calc(var(--p) * -4%),  0); }

/* Progressive enhancement only. The JS path above is load-bearing; this replaces it where it exists. */
@supports (animation-timeline: view()) {
  @media not (prefers-reduced-motion: reduce) {
    .plx {
      animation: plx-p linear both;   /* shorthand FIRST … */
      animation-timeline: view();     /* … then the reset-only longhands */
      animation-range: contain 0% contain 100%;
    }
    @keyframes plx-p { from { --p: 0 } to { --p: 1 } }
  }
}

/* Touch: halve the runway and the travel. Under 480px the parallax is off entirely. */
@media (max-width: 768px) {
  .plx { --stage-h: 150vh; }
  .plx__subject { transform: translate3d(0, calc(var(--p) * -7%), 0) scale(calc(1 + var(--p) * .03)); }
}
@media (max-width: 480px), (prefers-reduced-motion: reduce) {
  .plx { --stage-h: 100svh !important; }
  .plx__plate, .plx__subject, .plx__copy { transform: none !important; }
  .plx__plate { transform: scale(1.04) !important; }   /* mid-state, so the crop still reads as composed */
}
```

```js
import { scrubProgress } from './progress.js';
const plx = document.querySelector('.plx');
if (plx) scrubProgress(plx, { ease: 0.12, restAt: 0.5 });   // restAt 0.5 = the mid-state composite
```

### Reduced-motion end state

`scrubProgress` publishes `--p: 0.5` once and returns without creating an observer or a rAF loop; the
media query above then hard-resets every transform anyway and collapses the stage to `100svh`. The
result is the composed hero image with its headline and CTA — a complete, good page section.

### Mobile fallback

`≤768px` halves both `--stage-h` and the subject's travel. `≤480px` disables the parallax outright and
serves `subject-mobile.webp` (820 w) via `srcset`. No JS branch is needed; `scrubProgress` keeps
running harmlessly because every transform has been overridden.

### Payload

| | bytes |
|---|---|
| `plate.avif` 1760×990 q45 blurred | ~72 KB |
| `subject-desktop.webp` 1200 w, alpha q78 | ~118 KB |
| `subject-mobile.webp` 820 w | ~62 KB |
| CSS + JS (`progress.js`) gzip | 1.4 KB |
| **Desktop total** | **~192 KB** (cap 250 KB) |
| **Mobile total** | **~96 KB** (cap 110 KB) |
| Peak decoded | 1760·990·4 + 1200·1200·4 ≈ **12.7 MB** |

---

# R2 — Cutout orbit / assembly frame sequence

**Routes in when:** rules 1 and 2 failed and `S ≥ 12` — twelve or more registered stills of one
subject, from different angles or at successive stages. **SET class: SET-C.**

Primary for auto servis (a component revealing its layers) and građevina (a job assembling stage by
stage — tradespeople photograph progress for invoicing, so these sets exist far more often than you
expect). Secondary for radnja with multi-angle product shots.

### When NOT to use

- `S < 12`. Under twelve real angles the sequence reads steppy and looks *cheaper* than one good
  still. Drop to R4, where the crossfade hides the gaps.
- The stills are not registered — the subject jumps around the frame between shots. Fix it in prep
  (below) or drop to R4.
- Above the fold on a bandwidth-constrained audience. The poster is above the fold; the sequence is not.
- On a law/accountancy/medical page. A frame-scrubbed hero actively damages credibility there.

### Asset prep

```bash
# 1. Register the framing: compute one common bounding box from the rembg alpha masks, then crop
#    every still to it, so the subject does not jump between frames.
pip install "rembg[cpu,cli]"
mkdir -p work/<slug>/mask work/<slug>/reg
for f in work/<slug>/raw/*.jpg; do rembg i -m u2netp "$f" "work/<slug>/mask/$(basename "${f%.*}").png"; done

node --input-type=module -e "
import sharp from './work/tools/node_modules/sharp/lib/index.js';
import { readdirSync } from 'node:fs';
const masks = readdirSync('work/<slug>/mask').sort();
let L=1e9, T=1e9, R=0, B=0;
for (const m of masks) {
  const img = sharp('work/<slug>/mask/'+m);
  const { width, height } = await img.metadata();
  // trim() reports where the opaque content starts; that is the subject box for this frame
  const { info } = await img.trim({ threshold: 8 }).toBuffer({ resolveWithObject: true });
  const l = -info.trimOffsetLeft, t = -info.trimOffsetTop;
  L = Math.min(L, l); T = Math.min(T, t);
  R = Math.max(R, l + info.width); B = Math.max(B, t + info.height);
}
const pad = Math.round((R-L) * 0.10);                      // 10% breathing room
const box = { left: Math.max(0, L-pad), top: Math.max(0, T-pad), width: (R-L)+pad*2, height: (B-T)+pad*2 };
console.log('common subject box', box);
const src = readdirSync('work/<slug>/raw').filter(f=>/\.(jpe?g|png)$/i.test(f)).sort();
for (let i = 0; i < src.length; i++)
  await sharp('work/<slug>/raw/'+src[i]).extract(box)
    .toFile('work/<slug>/reg/'+String(i).padStart(4,'0')+'.png');
"

# 2. Two ladders + budget report
node work/tools/compress.mjs work/<slug>/reg public/hero/seq --format=webp
# OK  desktop 32 frames  1760 KB (55.0 KB/frame, cap 4.0 MB)  decoded 118 MB
# OK  mobile  32 frames   992 KB (31.0 KB/frame, cap 1.5 MB)  decoded  66 MB

# 3. Poster = frame 0 as a real JPEG, plus the social card
node --input-type=module -e "
import sharp from './work/tools/node_modules/sharp/lib/index.js';
const s = sharp('work/<slug>/reg/0000.png');
await s.clone().resize(1280,720,{fit:'cover'}).jpeg({quality:74,mozjpeg:true}).toFile('public/hero/poster.jpg');
await s.clone().resize(1200,630,{fit:'cover'}).jpeg({quality:80,mozjpeg:true}).toFile('public/og-1200x630.jpg');
"
```

Open three frames with Read afterwards and confirm they are not black, duplicated or mis-cropped.
`du -sh` both ladders and write the numbers into `work/concept.md`.

### Code

```html
<link rel="preload" as="image" href="/hero/poster.jpg" fetchpriority="high">
```

```html
<section class="stage seq" style="--stage-h: 420vh" aria-labelledby="seq-h">
  <div class="stage__pin">
    <div class="seq__fit">
      <img class="seq__poster" src="/hero/poster.jpg"
           alt="Alternator rastavljen na radnom stolu, prije servisa"
           width="1280" height="720" fetchpriority="high" loading="eager" decoding="async">
      <canvas class="seq__canvas" role="img"
              aria-label="Alternator se rastavlja sloj po sloj: poklopac, stator, rotor, regulator napona."></canvas>
    </div>
    <h1 id="seq-h" class="seq__copy">Autoelektrika Hadžić<br><span>Gradačac</span></h1>
    <noscript><img src="/hero/seq/desktop/frame-0031.webp" alt="Rastavljen alternator" width="1280" height="720"></noscript>
  </div>
</section>
```

```css
.seq .stage__pin { position: relative; }
.seq__fit { position: relative; width: min(94vw, 1280px); aspect-ratio: 16 / 9; }
.seq__poster, .seq__canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
.seq__poster { object-fit: cover; transition: opacity .32s ease; }
.seq__canvas { display: block; opacity: 0; transition: opacity .32s ease; }
.seq.is-ready .seq__poster { opacity: 0; }
.seq.is-ready .seq__canvas { opacity: 1; }
.seq__copy { position: relative; z-index: 2; }

@media (max-width: 768px) { .seq { --stage-h: 240vh; } }
@media (prefers-reduced-motion: reduce) { .seq { --stage-h: 100svh !important; } }
```

```js
import { SequencePlus } from './seq-plus.js';

const stage  = document.querySelector('.seq');
const canvas = document.querySelector('.seq__canvas');
const COUNT  = 32;

// Decoded memory: 32 * 1280 * 720 * 4 = 118 MB desktop / 66 MB mobile. Under the 250 MB
// threshold, so SequencePlus leaves the window off; it turns itself on if deviceMemory < 4.
const seq = new SequencePlus(stage, canvas, {
  mode: 'sequence',
  count: COUNT,
  width: 1280, height: 720,
  ease: 0.12,
  restFrame: COUNT - 1,                       // reduced motion shows the assembled object
  src: (i, tier) => `/hero/seq/${tier === 'full' ? 'desktop' : 'mobile'}/frame-${String(i).padStart(4, '0')}.webp`,
  onProgress: () => stage.classList.add('is-ready'),
});
```

### Reduced-motion end state

`SequencePlus.staticOnly()` loads exactly frame 31 — the assembled object — draws it once, sets
`--stage-h: 100svh`, and never creates the IntersectionObserver, the scroll listener, the rAF loop or
the ladder. A reduced-motion visitor pays **55 KB**, not 1.76 MB, for motion they turned off.

### Mobile fallback

`deviceTier()` returns `mobile` at ≤768px → `step = 2` (every 2nd frame: 16 frames, ~496 KB) and
`dpr` clamped to **1.5** instead of 2. At ≤480px the tier is `small`, and on `saveData`/2g it is
`poster`; **both are terminal** — `staticOnly()` runs, only `restFrame` is fetched, and the poster
`<img>` stays on screen. Stage height halves via CSS.

### Payload

| | bytes |
|---|---|
| Poster JPEG 1280×720 q74 | ~78 KB |
| Desktop ladder, 32 frames @55 KB | **1.76 MB** |
| Mobile ladder, 32 frames @31 KB | 992 KB → **496 KB** at step 2 |
| First usable scrub (poster + 7 pinned keyframes) | ~463 KB |
| `seq-plus.js` + `progress.js` gzip | 4.6 KB |
| Peak decoded | **118 MB** desktop, 66 MB mobile |

---

# R3 — Before → after clip-path wipe scrub

**The highest-converting recipe in this file.** The scroll gesture *is* the transformation.

**Routes in when:** rule 1 failed and `P ≥ 1`. It outranks R2 and R4 whenever a pair exists.
**SET class: SET-D.**

Primary for frizerski salon / barber, auto-detailing, građevina/renovacija, stomatologija.
Strong secondary almost everywhere else.

### When NOT to use

- The pair is not really a pair — different angle, different lens, different light. A mismatched pair
  destroys the illusion and reads as a lie. Fix framing in prep or do not ship it.
- Identifiable faces without recorded consent (§0.2). For medical/dental, crop to the treated detail
  and click-gate the reveal instead of scrubbing it.
- More than four pairs. Chain three or four; beyond that it is a gallery, and R4 is the gallery recipe.
- As a hover effect on mobile. The divider must be draggable *and* keyboard-operable — see below.

### Asset prep

```bash
# Normalise the pair: identical crop box, identical output dimensions, matched exposure.
# Mismatched framing is the only way this recipe fails.
node --input-type=module -e "
import sharp from './work/tools/node_modules/sharp/lib/index.js';
const BOX = { left: 120, top: 60, width: 1600, height: 1000 };   // tune per pair by eye
for (const [src, out, gamma] of [
  ['work/<slug>/raw/prije.jpg', 'public/hero/pair1-before', 1.0],
  ['work/<slug>/raw/poslije.jpg','public/hero/pair1-after',  1.0],   // nudge to match exposure if needed
]) {
  const base = sharp(src).extract(BOX).gamma(gamma);
  await base.clone().resize(1600, 1000).avif({ quality: 50, effort: 4 }).toFile(out + '.avif');
  await base.clone().resize(1600, 1000).jpeg({ quality: 76, mozjpeg: true }).toFile(out + '.jpg');
  await base.clone().resize( 900,  563).avif({ quality: 48, effort: 4 }).toFile(out + '-m.avif');
}
"
# Sanity check: both files must report identical dimensions, or the wipe will shear.
node -e "
const sharp=require('./work/tools/node_modules/sharp');
Promise.all(['public/hero/pair1-before.avif','public/hero/pair1-after.avif'].map(f=>sharp(f).metadata()))
 .then(([a,b])=>console.log(a.width===b.width&&a.height===b.height ? 'OK identical' : 'MISMATCH', a.width+'x'+a.height, b.width+'x'+b.height));
"
```

### Code

The default is the **transform-mask** variant: `overflow: clip` on a wrapper plus `translateX` on the
child. That is 100% compositor work. `clip-path` is offered as the fallback for non-rectangular
reveals only — it is not on Safari's compositor allowlist for scroll-driven animations.

```html
<section class="stage wipe" style="--stage-h: 300vh" aria-labelledby="wipe-h">
  <div class="stage__pin">
    <h2 id="wipe-h" class="wipe__h">Prije i poslije</h2>

    <figure class="wipe__fig">
      <img class="wipe__img wipe__img--after" src="/hero/pair1-after.avif"
           alt="Kosa nakon šišanja i feniranja, bob frizura"
           width="1600" height="1000" fetchpriority="high" loading="eager" decoding="async">

      <!-- the moving mask: clipped wrapper + counter-translated child = zero paint -->
      <span class="wipe__mask" aria-hidden="true">
        <img class="wipe__img wipe__img--before" src="/hero/pair1-before.avif" alt=""
             width="1600" height="1000" loading="eager" decoding="async">
      </span>

      <span class="wipe__seam" aria-hidden="true"></span>

      <!-- a real range input: pointer drag, keyboard arrows and screen-reader support for free -->
      <label class="wipe__ctl">
        <span class="sr-only">Pomjeri granicu između slike prije i poslije</span>
        <input class="wipe__range" type="range" min="0" max="100" value="0" step="1"
               aria-valuetext="0 posto — prikazana slika prije">
      </label>

      <figcaption class="wipe__cap"><b>Prije</b><b>Poslije</b></figcaption>
    </figure>
  </div>
</section>
```

```css
@property --w { syntax: '<percentage>'; inherits: true; initial-value: 0%; }

.wipe__fig { position: relative; margin: 0; width: min(94vw, 1100px); aspect-ratio: 8 / 5; overflow: clip; }
.wipe__img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }

/* --w = 0%  -> the BEFORE image fully covers the AFTER
   --w = 100% -> the mask has slid entirely off, revealing AFTER */
.wipe__mask {
  position: absolute; inset: 0; display: block; overflow: clip;
  transform: translate3d(calc(var(--w) * -1), 0, 0);
}
/* counter-translate so the before image appears to hold perfectly still while being uncovered */
.wipe__mask .wipe__img--before { transform: translate3d(var(--w), 0, 0); }

.wipe__seam {
  position: absolute; top: 0; bottom: 0; left: 0; width: 2px;
  background: #fff; box-shadow: 0 0 0 1px rgb(0 0 0 / .25);
  transform: translate3d(calc(var(--w) * 0 + var(--seam, 0px)), 0, 0);
}

/* the range input IS the handle */
.wipe__ctl { position: absolute; inset: 0; display: grid; align-items: center; }
.wipe__range { width: 100%; height: 100%; margin: 0; opacity: 0; cursor: ew-resize; }
.wipe__range:focus-visible { opacity: 1; outline: 3px solid #fff; outline-offset: -6px; }

.wipe__cap { position: absolute; inset: auto 0 0; display: flex; justify-content: space-between;
             padding: .75rem 1rem; color: #fff; text-shadow: 0 1px 6px rgb(0 0 0 / .8); }
.sr-only { position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0 }

@supports (animation-timeline: view()) {
  @media not (prefers-reduced-motion: reduce) {
    .wipe__fig { animation: wipe-w linear both; animation-timeline: view(); animation-range: contain 5% contain 90%; }
    @keyframes wipe-w { from { --w: 0% } to { --w: 100% } }
  }
}

@media (max-width: 768px) { .wipe { --stage-h: 180vh; } }

/* Reduced motion: side by side, both labelled, no scroll coupling, no handle. */
@media (prefers-reduced-motion: reduce) {
  .wipe { --stage-h: auto !important; }
  .wipe .stage__pin { position: static; height: auto; }
  .wipe__fig { display: grid; grid-template-columns: 1fr 1fr; gap: .5rem; aspect-ratio: auto; overflow: visible; }
  .wipe__img { position: static; height: auto; }
  .wipe__mask { position: static; transform: none !important; overflow: visible; }
  .wipe__mask .wipe__img--before { transform: none !important; }
  .wipe__seam, .wipe__ctl { display: none; }
  .wipe__cap { position: static; }
}
```

```js
import { scrubProgress, REDUCED } from './progress.js';

document.querySelectorAll('.wipe').forEach(wipe => {
  const fig   = wipe.querySelector('.wipe__fig');
  const range = wipe.querySelector('.wipe__range');
  const seam  = wipe.querySelector('.wipe__seam');
  let manual = false;                       // once the user drags, scroll stops fighting them

  const apply = pct => {
    fig.style.setProperty('--w', pct + '%');
    fig.style.setProperty('--seam', (fig.clientWidth * pct / 100) + 'px');
    range.value = String(Math.round(pct));
    range.setAttribute('aria-valuetext',
      `${Math.round(pct)} posto — ${pct < 50 ? 'prikazana slika prije' : 'prikazana slika poslije'}`);
  };

  if (REDUCED.matches) { apply(100); return; }   // both images visible via CSS; nothing to drive

  scrubProgress(wipe, { ease: 0.14, onProgress: p => { if (!manual) apply(p * 100); } });

  range.addEventListener('pointerdown', () => { manual = true; });
  range.addEventListener('input',  () => { manual = true; apply(Number(range.value)); });
  range.addEventListener('keydown', () => { manual = true; });
  // Leaving the section hands control back to scroll.
  new IntersectionObserver(([e]) => { if (!e.isIntersecting) manual = false; }).observe(wipe);
});
```

**Chaining 3–4 pairs:** repeat the `<section class="stage wipe">` block. `position: sticky` handles the
pinning with zero CLS risk and no library. Only reach for GSAP ScrollTrigger `pin` if you need
scroll *snapping* between panels — that is the one thing sticky cannot do, and it costs 45 KB gzip.

### Reduced-motion end state

The figure becomes a two-column grid: before and after side by side, both captioned, both at natural
height, stage un-pinned entirely (`--stage-h: auto`, `position: static`). The handle and seam are
removed. This is arguably the clearer presentation, which is the standard the contract sets.

### Mobile fallback

Stage halves to 180vh. The `<input type="range">` covers the whole figure, so the drag target is the
entire image — far larger than the 44 px floor — and arrow keys work on a Bluetooth keyboard. Serve
`pair1-before-m.avif` / `-after-m.avif` (900 w) via `srcset` on both `<img>` elements.
Off-screen pairs beyond the first get `loading="lazy"` so only the visible pair is decoded.

### Payload

| | bytes |
|---|---|
| Pair 1, 2 × AVIF q50 @1600×1000 | ~192 KB |
| Pair 1, 2 × AVIF q48 @900×563 (mobile) | ~78 KB |
| 4 chained pairs, desktop | ~768 KB (cap 800 KB) |
| 4 chained pairs, mobile (lazy: 1 eager + 3 lazy) | ~78 KB eager, 312 KB total |
| CSS + JS gzip | 2.1 KB |
| Peak decoded | 2 × 1600·1000·4 ≈ **12.8 MB** per visible pair |

---

# R4 — Cross-dissolve gallery scrub

**The universal workhorse.** Every small business has a photo gallery; almost none have a frame
sequence. This is the recipe that makes the skill work for real clients.

**Routes in when:** rules 1–3 failed and `G ≥ 6`. **SET class: SET-B.**

Primary for nekretnine, hotel/vikendica, teretana, foto studio. Fallback for salon when no pair exists.

### When NOT to use

- `G < 6`. Under six photos the dissolve reads as a slideshow. Drop to R1 or R5 on the best single shot.
- The photos are a registered sequence of one subject — that is R2, and R2 looks better.
- The photos have wildly different aspect ratios and you have not normalised them. Cover-crop first;
  never squash.
- On an advokat/računovođa page.

### Per-industry parameters — this is where differentiation actually lives

"Fast cadence" and "editorial rhythm" are adjectives; two agents will produce the same page from them.
Use the numbers:

| Industry | Frames | `--stage-h` | frames/100vh | `ease` | Ordering rule |
|---|---|---|---|---|---|
| Nekretnine | 6–8 | 400vh | ~2.3 | 0.16 (slow) | Walkthrough: exterior → entry → living → kitchen → bedroom → view |
| Hotel / vikendica | 6–8 | 380vh | ~2.4 | 0.16 | **Matched framing**, same view: morning → afternoon → golden hour → night |
| Teretana | 16 | 250vh | ~10.7 | 0.08 (linear-ish) | Energy, not narrative: alternate wide/tight, no two similar shots adjacent |
| Foto studio | 10 | 300vh | ~5.0 | 0.10 | Editorial: **hard cut every 3rd frame** (see below), no crossfade on those |
| Salon (no pair) | 10 | 280vh | ~5.6 | 0.12 | Crop all to a consistent portrait frame so it reads as one continuous person |
| Restoran | 8 | 300vh | ~4.0 | 0.14 | Dish → dish, never dish → interior → dish |

frames/100vh = `frames ÷ ((stage-h − 100vh) ÷ 100vh)`.

Hard cut every Nth (foto studio): pass `hardCutEvery: 3`; the crossfade is skipped at those
boundaries so the transition snaps, which is what reads as editorial.

### Asset prep

```bash
# Normalise to a common aspect with cover-crop (never squash), in the narrative order you chose.
# Rename first so lexical sort == narrative order.
mkdir -p work/<slug>/ordered
i=0; for f in eksterijer ulaz dnevni kuhinja spavaca pogled; do
  cp "work/<slug>/raw/$f.jpg" "work/<slug>/ordered/$(printf '%04d' $i).jpg"; i=$((i+1));
done

node work/tools/compress.mjs work/<slug>/ordered public/hero/gal --format=webp
# OK  desktop 6 frames  330 KB (55.0 KB/frame, cap 4.0 MB)  decoded 22 MB
# OK  mobile  6 frames  186 KB (31.0 KB/frame, cap 1.5 MB)  decoded 12 MB

node --input-type=module -e "
import sharp from './work/tools/node_modules/sharp/lib/index.js';
const s = sharp('work/<slug>/ordered/0000.jpg');
await s.clone().resize(1280,720,{fit:'cover'}).jpeg({quality:74,mozjpeg:true}).toFile('public/hero/poster.jpg');
await s.clone().resize(1200,630,{fit:'cover'}).jpeg({quality:80,mozjpeg:true}).toFile('public/og-1200x630.jpg');
"
```

### Code

Same markup as R2 (`.stage` → `.stage__pin` → `.seq__fit` → poster `<img>` + `<canvas>`), with
`mode: 'crossfade'`. The only additions are the hard-cut option and the reduced-motion gallery grid,
which must exist in the DOM rather than being conjured by JS.

```html
<link rel="preload" as="image" href="/hero/poster.jpg" fetchpriority="high">
```

```html
<section class="stage gal" style="--stage-h: 400vh" aria-labelledby="gal-h">
  <div class="stage__pin">
    <div class="seq__fit">
      <img class="seq__poster" src="/hero/poster.jpg"
           alt="Vanjski pogled na kuću u Vogošći, dvorište i prilaz"
           width="1280" height="720" fetchpriority="high" loading="eager" decoding="async">
      <canvas class="seq__canvas" role="img"
              aria-label="Obilazak kuće: eksterijer, ulaz, dnevni boravak, kuhinja, spavaća soba, pogled."></canvas>
    </div>
    <h1 id="gal-h" class="seq__copy">Kuća u Vogošći<br><span>142 m² · 4 sobe</span></h1>
  </div>

  <!-- The reduced-motion end state lives in the DOM. It is real content, not a stub. -->
  <ul class="gal__grid">
    <li><img src="/hero/gal/desktop/frame-0000.webp" alt="Vanjski pogled na kuću"        width="1280" height="720" loading="lazy" decoding="async"></li>
    <li><img src="/hero/gal/desktop/frame-0001.webp" alt="Ulaz i hodnik"                  width="1280" height="720" loading="lazy" decoding="async"></li>
    <li><img src="/hero/gal/desktop/frame-0002.webp" alt="Dnevni boravak s velikim prozorom" width="1280" height="720" loading="lazy" decoding="async"></li>
    <li><img src="/hero/gal/desktop/frame-0003.webp" alt="Kuhinja s trpezarijom"          width="1280" height="720" loading="lazy" decoding="async"></li>
    <li><img src="/hero/gal/desktop/frame-0004.webp" alt="Spavaća soba na spratu"         width="1280" height="720" loading="lazy" decoding="async"></li>
    <li><img src="/hero/gal/desktop/frame-0005.webp" alt="Pogled s terase prema gradu"    width="1280" height="720" loading="lazy" decoding="async"></li>
  </ul>
</section>
```

```css
.gal__grid { display: none; list-style: none; margin: 0; padding: clamp(1rem,4vw,3rem);
             gap: clamp(.5rem,2vw,1rem); grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
.gal__grid img { width: 100%; height: auto; display: block; border-radius: 4px; }

@media (max-width: 768px) { .gal { --stage-h: 220vh; } }

@media (prefers-reduced-motion: reduce) {
  .gal { --stage-h: auto !important; }
  .gal .stage__pin { display: none; }
  .gal__grid { display: grid; }
}
```

```js
import { SequencePlus } from './seq-plus.js';
import { REDUCED } from './progress.js';

const stage = document.querySelector('.gal');
if (stage && !REDUCED.matches) {
  const COUNT = 6;
  // Decoded: 6 * 1280 * 720 * 4 = 22 MB. Nowhere near the 250 MB window threshold.
  new SequencePlus(stage, stage.querySelector('.seq__canvas'), {
    mode: 'crossfade',
    count: COUNT,
    width: 1280, height: 720,
    ease: 0.16,                                   // nekretnine: slow. teretana would be 0.08.
    restFrame: 0,
    src: (i, tier) => `/hero/gal/${tier === 'full' ? 'desktop' : 'mobile'}/frame-${String(i).padStart(4, '0')}.webp`,
    onProgress: () => stage.classList.add('is-ready'),
  });
}
```

**Hard cut every Nth** (foto studio): add this one method override rather than a new class.

```js
const seq = new SequencePlus(/* … as above, ease: 0.10, count: 10 … */);
const HARD_CUT_EVERY = 3;
const basePaint = seq.paint.bind(seq);
seq.paint = function () {
  const raw = this.cur * (this.o.count - 1);
  const i = Math.floor(raw);
  if ((i + 1) % HARD_CUT_EVERY === 0) {          // snap this boundary: draw one frame, no blend
    const idx = this.nearest(this.frameIndex(this.cur));
    if (idx !== this.drawnA) { this.drawnA = idx; this.drawnB = -1; this.blit(this.frames.get(idx), 1); }
    return;
  }
  basePaint();
};
```

### Reduced-motion end state

The pinned section is `display: none`; the `.gal__grid` is `display: grid`. Every photo is visible at
full size with real alt text — for a property listing or a portfolio this is the *more* useful page,
which is exactly what the contract demands. `SequencePlus` is never constructed, so no frame beyond
the poster is fetched.

### Mobile fallback

≤768px: `--stage-h: 220vh`, tier `mobile` → `step = 2` (3 of 6 frames, 93 KB) and DPR 1.5. At ≤480px
(tier `small`) or on `saveData`/2g (tier `poster`) the ladder never runs — one frame is fetched and the
poster `<img>` remains the hero; users still get the full `.gal__grid` further down the page.

### Payload

| | bytes |
|---|---|
| Poster JPEG | ~78 KB |
| Desktop ladder, 6 frames @55 KB | 330 KB |
| Mobile ladder, 6 frames @31 KB | 186 KB → **93 KB** at step 2 |
| Grid (lazy, below the fold) | reuses the desktop ladder — **0 extra bytes** |
| `seq-plus.js` + `progress.js` gzip | 4.6 KB |
| **Desktop total** | **~412 KB** (cap 900 KB) |
| Peak decoded | 6 · 1280 · 720 · 4 = **22 MB** |

At 16 frames (teretana) the desktop ladder is 880 KB and decoded is 59 MB — still inside budget.

---

# R5 — Hotspot reveal over one still

**Routes in when:** rules 1–5 failed, `H ≥ 1`, and the photo contains **≥3 nameable things a customer
would pay for**. **SET class: SET-A, information-dense variant.**

Primary supporting layer for auto servis; pairs naturally with R1 or R6. Also good for a workshop
wall, a treatment room, a product shelf, a machine.

### When NOT to use

- Fewer than 3 or more than 8 hotspots. Under 3 it is not a system; over 8 it is a mess.
- The photo is dark or busy where the labels sit, and you cannot get 4.5:1 even with a scrim.
  Measure against the actual photo, not against an assumed dark.
- As the only motion on the page. It is a supporting layer, not a hero on its own.

### Asset prep

```bash
node --input-type=module -e "
import sharp from './work/tools/node_modules/sharp/lib/index.js';
const s = sharp('work/<slug>/raw/radionica.jpg');
await s.clone().resize(1600,1000,{fit:'cover'}).avif({quality:50,effort:4}).toFile('public/hero/shop.avif');
await s.clone().resize(1600,1000,{fit:'cover'}).jpeg({quality:76,mozjpeg:true}).toFile('public/hero/shop.jpg');
await s.clone().resize( 900, 563,{fit:'cover'}).avif({quality:48,effort:4}).toFile('public/hero/shop-m.avif');
// dominant colour for the accent, from the client's own workshop rather than a stock hex
const { dominant } = await sharp('work/<slug>/raw/radionica.jpg').stats();
console.log('accent candidate', '#' + [dominant.r,dominant.g,dominant.b].map(v=>v.toString(16).padStart(2,'0')).join(''));
"
```

### Code

```html
<section class="hs" aria-labelledby="hs-h">
  <h2 id="hs-h">Šta radimo</h2>

  <figure class="hs__fig">
    <img class="hs__img" src="/hero/shop.avif"
         srcset="/hero/shop-m.avif 900w, /hero/shop.avif 1600w"
         sizes="(max-width: 768px) 100vw, 1100px"
         alt="Radionica: dizalica, dijagnostički uređaj i radni sto s alatom"
         width="1600" height="1000" loading="lazy" decoding="async">
    <div class="hs__scrim" aria-hidden="true"></div>
    <div class="hs__layer"><!-- buttons injected here, or authored inline --></div>
  </figure>

  <!-- Always in the DOM. Becomes the primary UI on phones and under reduced motion. -->
  <ul class="hs__list"></ul>

  <p class="hs__desc" id="hs-desc" role="status" aria-live="polite"></p>
</section>
```

```css
.hs__fig { position: relative; margin: 0; overflow: clip; }
.hs__img { display: block; width: 100%; height: auto; }
.hs__scrim { position: absolute; inset: 0; background: rgb(10 9 8 / .38); opacity: 0;
             transition: opacity .4s ease; pointer-events: none; }
.hs.is-in .hs__scrim { opacity: 1; }

.hs__layer { position: absolute; inset: 0; }
.hs__dot {
  position: absolute; display: grid; place-items: center;
  border: 2px solid var(--accent, #f2a900); border-radius: 999px;
  background: radial-gradient(circle at 50% 50%, rgb(242 169 0 / .30), rgb(242 169 0 / 0) 68%);
  color: #fff; font: 600 .8rem/1 system-ui, sans-serif; text-align: center;
  opacity: 0; transform: scale(.86);
  transition: opacity .35s ease var(--d, 0s), transform .35s cubic-bezier(.2,.7,.3,1) var(--d, 0s);
}
.hs.is-in .hs__dot { opacity: 1; transform: scale(1); }
.hs__dot:hover, .hs__dot:focus-visible { transform: scale(1.06); }
.hs__dot:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }

.hs__list { display: none; list-style: none; margin: 1rem 0 0; padding: 0;
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: .5rem; }
.hs__list button { width: 100%; min-height: 44px; text-align: left; padding: .7rem .9rem; }
.hs.is-fallback .hs__layer { display: none; }
.hs.is-fallback .hs__list { display: grid; }

/* NO infinite pulse. The reference implementation this generalises ran a pulsing box-shadow
   unconditionally: a vestibular trigger, and box-shadow is not compositor-accelerated anyway. */
@media (prefers-reduced-motion: reduce) {
  .hs__scrim { opacity: 1; transition: none; }
  .hs__dot { opacity: 1; transform: none; transition: none; }
}
```

```js
import { REDUCED } from './progress.js';

/* Percentages over the cover-fit figure. Authored per photo — measure, do not guess. */
const HOTSPOTS = [
  { id: 'dijagnostika', label: 'Dijagnostika', x: 18, y: 34, w: 16, h: 22,
    desc: 'Čitanje grešaka na svim markama, uključujući ADAS kalibraciju.' },
  { id: 'kocnice',      label: 'Kočnice',      x: 46, y: 58, w: 14, h: 20,
    desc: 'Pločice, diskovi, ABS senzori — isti dan.' },
  { id: 'elektrika',    label: 'Autoelektrika', x: 72, y: 30, w: 15, h: 21,
    desc: 'Alternatori, anlaseri, kablovski snopovi, ugradnja senzora.' },
];

const MIN_TARGET = 44;   // ship 44 (SC 2.5.5); WCAG 2.2 SC 2.5.8 hard floor is 24

document.querySelectorAll('.hs').forEach(root => {
  const fig   = root.querySelector('.hs__fig');
  const layer = root.querySelector('.hs__layer');
  const list  = root.querySelector('.hs__list');
  const desc  = root.querySelector('.hs__desc');

  const say = h => { desc.textContent = `${h.label} — ${h.desc}`; };

  // Positioned buttons over the photo
  layer.replaceChildren(...HOTSPOTS.map((h, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'hs__dot';
    b.style.cssText = `left:${h.x}%;top:${h.y}%;width:${h.w}%;height:${h.h}%;--d:${i * 90}ms`;
    b.setAttribute('aria-label', `${h.label}: ${h.desc}`);
    b.textContent = h.label;
    b.addEventListener('click', () => say(h));
    b.addEventListener('focus', () => say(h));
    return b;
  }));

  // The same content as a real list. Always present; becomes primary when targets are too small.
  list.replaceChildren(...HOTSPOTS.map(h => {
    const li = document.createElement('li');
    const b  = document.createElement('button');
    b.type = 'button';
    b.textContent = h.label;
    b.setAttribute('aria-label', `${h.label}: ${h.desc}`);
    b.addEventListener('click', () => say(h));
    li.append(b);
    return li;
  }));

  /* THE RULE, not a judgement call: if the smallest hotspot edge falls under MIN_TARGET at the
     current container size, the positioned layer is unusable and the list takes over. On a 375px
     viewport a {w:16,h:22} hotspot over a 16:10 figure is 55px x 51px (passes); {w:11,h:14} is
     38px x 32px (fails) — and percentage hotspots fail silently, which is why this is measured. */
  const audit = () => {
    const bw = fig.clientWidth, bh = fig.clientHeight;
    const worst = Math.min(...HOTSPOTS.map(h => Math.min(h.w / 100 * bw, h.h / 100 * bh)));
    root.classList.toggle('is-fallback', !(worst >= MIN_TARGET));
  };
  new ResizeObserver(audit).observe(fig);
  audit();

  if (REDUCED.matches) { root.classList.add('is-in'); say(HOTSPOTS[0]); return; }
  new IntersectionObserver(([e], obs) => {
    if (!e.isIntersecting) return;
    root.classList.add('is-in');
    obs.unobserve(root);              // one-shot; never re-animate on scroll-up
  }, { threshold: 0.25 }).observe(root);
});
```

**If a hotspot plays audio** (WCAG 1.4.2): `preload="none"`, never `autoplay`, a visible pause control
for anything over 3 s, and the file counts against the page budget. Eight 190 KB MP3s is 1.5 MB you
did not budget for.

### Reduced-motion end state

`is-in` is applied immediately, so the scrim and every hotspot are visible and static; no fade, no
stagger, no observer, and no pulse anywhere. The first hotspot's description is announced into the
live region so the section is informative without interaction.

### Mobile fallback

The `ResizeObserver` audit runs continuously, so rotating a phone or resizing a window flips between
the positioned layer and the list automatically. At 375 px the figure is ~343×214 CSS px, so any
hotspot under ~13% width or ~21% height fails and the list takes over — a two-column grid of 44 px-tall
labelled buttons carrying exactly the same content.

### Payload

| | bytes |
|---|---|
| `shop.avif` 1600×1000 q50 | ~104 KB |
| `shop-m.avif` 900×563 q48 | ~38 KB |
| CSS + JS + hotspot data gzip | 2.4 KB |
| **Desktop total** | **~106 KB** (cap 140 KB) |
| Peak decoded | 1600 · 1000 · 4 = **6.4 MB** |

---

# R6 — SVG stroke-dashoffset line draw

**The best effort-to-impact ratio in the whole skill, and the only recipe that needs no photograph
at all.** A few hundred bytes of authored geometry, no browser caveats worth the name.

**Routes in when:** it is the hero for rule 7 (SET-G, logo only) and rule 8 (SET-F, nothing usable),
and it is the correct **supporting** layer in almost every other build.

Primary hero for transport/špedicija (the route draws itself). Signature layer for auto servis
(wiring), građevina (blueprint), advokat (a single hairline rule and nothing else).

### When NOT to use

- As the *only* thing on a page that has good photographs. It is a garnish there, not the meal.
- With more than ~20 subpaths animating at once. `stroke-dashoffset` is paint work, not compositing,
  and it is off Safari's scroll-driven compositor allowlist. Twenty short paths is free; two hundred is
  a jank source. Every shipped path in `assets/trade-paths/` is 2–17 elements.
- Over a busy photo without a scrim. A hairline stroke over foliage is invisible.
- On text you want crisply anti-aliased mid-draw.

### Assets — 12 pre-authored trade paths, shipped with this skill

`assets/trade-paths/` contains twelve hand-authored SVGs, each rendered in Chromium and visually
verified. This is what makes SET-F a real recipe rather than an apology.

| File | Industry row | Elements | Bytes |
|---|---|---|---|
| `wiring-loom.svg` | Auto servis / autoelektrika | 12 | 1,453 |
| `blueprint-elevation.svg` | Građevina / stolarija / bravarija | 11 | 1,306 |
| `route-line.svg` | Transport / špedicija / dostava | 7 | 1,076 |
| `scissors-comb.svg` | Frizerski salon / barber | 7 | 1,085 |
| `plate-cutlery.svg` | Restoran / kafić / pekara | 7 | 1,029 |
| `barbell-arc.svg` | Teretana / fitness | 9 | 1,136 |
| `tooth-outline.svg` | Stomatološka ordinacija | 2 | 687 |
| `floorplan.svg` | Nekretnine | 17 | 1,832 |
| `hairline-scales.svg` | Advokat / računovođa | 11 | 1,273 |
| `roofline.svg` | Hotel / apartman / vikendica | 10 | 1,249 |
| `shopping-bag.svg` | Radnja / butik / maloprodaja | 4 | 724 |
| `camera-aperture.svg` | Foto studio / video produkcija | 8 | 1,045 |

Every file shares one contract, which is what lets a single CSS block animate any of them:

- `viewBox="0 0 240 160"` (3:2 — matches photo aspect, so overlay use needs no fitting maths)
- `fill="none" stroke="currentColor"` — the stroke colour comes from the page's `color`, so the path
  inherits the palette derived in `brand-identity.md` §2 with no edit to the file
- a `<title>` and `<desc>`, referenced by `aria-labelledby`
- every drawable element carries `class="tp-ln" pathLength="1" style="--i:N"`
- the wrapping `<g class="tp">` carries `style="--n:COUNT"`

`pathLength="1"` is the load-bearing trick: it normalises every path's length to 1 regardless of its
real geometry, so `stroke-dasharray: 1; stroke-dashoffset: 1` hides any of them and one CSS rule
staggers all twelve files identically. **No JS measurement of `getTotalLength()` is needed anywhere.**

**Inline the SVG.** An `<img src="…svg">` cannot be animated by page CSS and cannot inherit
`currentColor`. Paste the file contents into the markup, or inline it at build time.

### Asset prep

Three paths, cheapest first:

```bash
# A. SET-F — use a shipped trade path as-is. Zero prep.
cp .claude/skills/premium-web/assets/trade-paths/route-line.svg src/partials/hero-path.svg

# B. SET-G — logo only. Vectorise the client's own mark, then draw its outline.
#    The full method (logo-palette.mjs, vectorize.mjs, knockout.mjs, the reveal and its
#    mobile trap) is industry-playbooks.md §14.2-14.5 and is NOT repeated here. Two
#    things that block are worth stating at the point of use:
#      - There is NO `potrace` / `mkbitmap` CLI in this container and none is needed.
#        The npm package `potrace` (2.1.8) is pure JS. Do not reach for apt-get or sudo.
#      - Do NOT seed the palette from sharp.stats().dominant. On a logo on a white card
#        it returns { r:248, g:248, b:248 } — the card, not the brand. Measured, verbatim.
#        Use logo-palette.mjs (industry-playbooks.md §14.2), which rejects the card.
npm --prefix work/tools i --silent potrace           # 2.1.8, no system binary, no sudo
node work/tools/logo-palette.mjs work/<slug>/raw/logo.png > work/<slug>/logo-palette.json
node work/tools/vectorize.mjs   work/<slug>/raw/logo.png   work/<slug>/out/logo-traced.svg
# traced -> work/<slug>/out/logo-traced.svg  paths:1  bytes:20752   (6-25 KB is the normal range)
# potrace emits ONE filled path holding many M…Z subpaths. Normalise it to this file's
# contract with the same one-liner as C below — fill:none + stroke:currentColor is applied
# by the R6 CSS, and --i gives you the stagger the shipped trade paths get for free.

# C. Author a new path over the client's own photo (wiring run, cut line, roof pitch).
#    Trace it in any editor at 240x160, then run the same normalisation:
node --input-type=module -e "
import { readFileSync, writeFileSync } from 'node:fs';
const f = process.argv[1] ?? 'work/<slug>/out/custom.svg';
let n = 0;
const out = readFileSync(f,'utf8').replace(/<(path|circle|line|polyline|polygon)\b/g,
  (m, tag) => \`<\${tag} class=\"tp-ln\" pathLength=\"1\" style=\"--i:\${n++}\"\`);
writeFileSync(f, out.replace('<g', \`<g class=\"tp\" style=\"--n:\${n}\" data-x=\`).replace('data-x=',''));
console.log('normalised', n, 'elements');
" work/<slug>/out/custom.svg
```

### Code

```html
<section class="draw" aria-labelledby="draw-h">
  <div class="draw__inner">
    <h2 id="draw-h">Od Tuzle do Beča — svake srijede</h2>

    <!-- inlined from assets/trade-paths/route-line.svg -->
    <svg class="draw__svg" viewBox="0 0 240 160" role="img" aria-labelledby="tp-title tp-desc"
         fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <title id="tp-title">Route line</title>
      <desc id="tp-desc">A delivery route: an origin map pin, a curved road with a waypoint, and a destination map pin.</desc>
      <g class="tp" style="--n:7">
        <path class="tp-ln" pathLength="1" style="--i:0" d="M12 140h216"/>
        <path class="tp-ln" pathLength="1" style="--i:1" d="M48 94C48 94 33 73 33 58a15 15 0 1 1 30 0c0 15-15 36-15 36z"/>
        <circle class="tp-ln" pathLength="1" style="--i:2" cx="48" cy="57" r="5.5"/>
        <path class="tp-ln" pathLength="1" style="--i:3" d="M196 78C196 78 181 57 181 42a15 15 0 1 1 30 0c0 15-15 36-15 36z"/>
        <circle class="tp-ln" pathLength="1" style="--i:4" cx="196" cy="41" r="5.5"/>
        <path class="tp-ln" pathLength="1" style="--i:5" d="M48 96c26 30 58 32 82 12s34-42 62-40"/>
        <circle class="tp-ln" pathLength="1" style="--i:6" cx="90" cy="119" r="3.5"/>
      </g>
    </svg>
  </div>
</section>
```

```css
@property --p { syntax: '<number>'; inherits: true; initial-value: 0; }

.draw__svg { display: block; width: min(90vw, 720px); height: auto; color: var(--accent, #c9a227); }

/* THE MECHANISM. pathLength="1" means dasharray:1 covers any path exactly once,
   so one rule staggers every element in every one of the twelve files. */
.tp-ln {
  --spread: .55;                                        /* last element starts at 55% of --p */
  --step:  calc(var(--spread) / max(1, var(--n) - 1));
  --start: calc(var(--i) * var(--step));
  --local: clamp(0, calc((var(--p) - var(--start)) / calc(1 - var(--spread))), 1);
  stroke-dasharray: 1;
  stroke-dashoffset: calc(1.0001 - var(--local));       /* 1.0001 avoids a round-cap dot at rest */
}

/* TIER 1 — the resting/base state is FULLY DRAWN. If --p is never set (no JS, crawler, print),
   the graphic is complete. Never put the hidden state in the base layer. */
.draw { --p: 1; }

/* TIER 3 — load-bearing path. JS adds .js-draw and then animates --p 0 -> 1 itself. */
.draw.js-draw { --p: 0; }

/* TIER 2 — progressive enhancement, where scroll-driven animation exists.
   NOTE the two class names are DIFFERENT on purpose. The hidden state and the thing that
   un-hides it must live in the same rule block, so that deleting or forgetting this block can
   only cost you the animation — never leave a permanently invisible graphic. */
@supports (animation-timeline: view()) {
  @media not (prefers-reduced-motion: reduce) {
    .draw.sda-draw {
      --p: 0;
      animation: draw-p linear both;    /* shorthand FIRST … */
      animation-timeline: view();       /* … then the reset-only longhands, or they silently reset to auto */
      animation-range: entry 20% cover 55%;
    }
    @keyframes draw-p { from { --p: 0 } to { --p: 1 } }
  }
}

/* Reduced motion: the to-state applies statically because the base layer IS the to-state. */
@media (prefers-reduced-motion: reduce) {
  .draw, .draw.js-draw, .draw.sda-draw { --p: 1 !important; animation: none !important; }
}

@media (forced-colors: active) { .draw__svg { color: CanvasText; } }
```

```js
/* draw.js — 25 lines. Arms the effect only if it can also finish it. */
import { REDUCED } from './progress.js';

const HAS_SDA = CSS.supports('animation-timeline: view()');

document.querySelectorAll('.draw').forEach(root => {
  if (REDUCED.matches) return;                 // base layer is already the drawn state

  if (HAS_SDA) { root.classList.add('sda-draw'); return; }  // CSS hides AND un-hides, in one block
  root.classList.add('js-draw');               // only NOW is --p allowed to be 0 — we drive it below

  const DUR = 1400;
  const io = new IntersectionObserver(([e], obs) => {
    if (!e.isIntersecting) return;
    obs.unobserve(root);
    const t0 = performance.now();
    const step = now => {
      const p = Math.min(1, (now - t0) / DUR);
      root.style.setProperty('--p', p.toFixed(4));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, { threshold: 0.3, rootMargin: '0px 0px -8% 0px' });
  io.observe(root);
});
```

For a **scrubbed** variant (the route draws as you scroll rather than on entry), drop `draw.js` and use
`scrubProgress` from §0.7 on a `.stage` wrapper instead — the CSS above needs no change:

```js
import { scrubProgress, REDUCED } from './progress.js';
const s = document.querySelector('.stage.draw');
if (s && !REDUCED.matches) { s.classList.add('js-draw'); scrubProgress(s, { ease: 0.10 }); }
```

### Reduced-motion end state

The base layer is the fully-drawn graphic (`--p: 1`), and neither `js-draw` nor `sda-draw` — the only
classes that set `--p: 0` — is ever applied. No observer, no rAF, no keyframes. This is also the
no-JS state, the crawler state and the print state, which is why the hidden state must never live in
the base layer.

### Mobile fallback

Nothing to degrade. The SVG is resolution-independent, the whole payload is under 2 KB, and the effect
is compositor-irrelevant at these element counts. On very narrow screens raise `stroke-width` to 2.5 so
the hairline does not disappear:

```css
@media (max-width: 480px) { .draw__svg { stroke-width: 2.5; } }
```

### Payload

| | bytes |
|---|---|
| Largest shipped path (`floorplan.svg`, 17 elements) | 1,832 |
| Smallest (`tooth-outline.svg`, 2 elements) | 687 |
| Median across the twelve | ~1,150 |
| CSS block | ~420 |
| `draw.js` gzip | ~480 |
| **Total, worst case** | **≈ 2.7 KB** |
| Peak decoded | ~0 |

For comparison: this is **0.15%** of R7's desktop ladder and it is the only recipe with no asset
dependency at all.

---

# R7 — Frame sequence from real client video

**Routes in when:** rule 1 — `V ≥ 2.0` seconds of usable client video where the motion is legible.
**SET class: SET-E.** Highest fidelity available, because it is genuinely what happened.

Common for teretana (phone clip of a session), restoran (a pour, a plating), gradilište (progress
clips). Ask before assuming there is none — clients rarely think of their phone videos as assets.

### When NOT to use

- The clip is handheld and shaky. A scrub magnifies camera shake into nausea. Either stabilise or
  extract 12 stills and route to R4.
- The interesting motion lasts under a second. There is nothing to scrub.
- You are tempted to ship the video itself and scrub `currentTime`. Don't — see below.

**Why not just scrub the video?** `video.currentTime` seeking must find the preceding keyframe, and the
real cross-browser fix is not a denser GOP: Firefox needs a **WebM** (mp4 is choppy there regardless of
keyframe density) and iOS Safari handles WebM poorly, so shipping video scrub means shipping **both**
containers — which usually erases the size advantage over an image sequence. WebCodecs `VideoDecoder`
is the genuine upgrade, but `VideoFrame` objects hold real GPU memory and must be `.close()`d; treat it
as a v2 optimisation, never a first build.

### Asset prep

```bash
FFMPEG=$(node -p "require('./work/tools/node_modules/ffmpeg-static')")

# 0. Find the 2-4 most legible seconds. A 60-frame arc beats a 300-frame one nobody scrolls through.
"$FFMPEG" -i work/<slug>/raw/trening.mp4 -hide_banner 2>&1 | grep -E 'Duration|Stream'

# 1. Extract to PNG. NEVER straight to .webp — ffmpeg writes ONE animated webp, not N stills,
#    and the failure is silent.  24 fps is right for scroll; a shipped build measured 60 fps as
#    "horrendous" and 30 as the practical ceiling.
mkdir -p work/<slug>/frames
"$FFMPEG" -ss 00:00:04.0 -t 2.5 -i work/<slug>/raw/trening.mp4 \
  -vf "fps=24,scale=1280:-2" -start_number 0 \
  work/<slug>/frames/frame_%04d.png            # 4 digits: 147+ frames is normal, 2 digits overflows

ls work/<slug>/frames | wc -l                   # -> 60

# 2. Two ladders + budget report
node work/tools/compress.mjs work/<slug>/frames public/hero/seq --format=webp
# OK   desktop 60 frames  3300 KB (55.0 KB/frame, cap 4.0 MB)  decoded 221 MB  <-- SLIDING WINDOW MANDATORY
# OVER mobile  60 frames  1860 KB (31.0 KB/frame, cap 1.5 MB)  decoded 124 MB
#   -> mobile is over: SequencePlus's step=2 fetches 30 frames = 930 KB at run time. Under cap. Ship.

# 3. Poster: pick the most informative frame, not necessarily the first or last.
node --input-type=module -e "
import sharp from './work/tools/node_modules/sharp/lib/index.js';
const s = sharp('work/<slug>/frames/frame_0018.png');
await s.clone().resize(1280,720,{fit:'cover'}).jpeg({quality:74,mozjpeg:true}).toFile('public/hero/poster.jpg');
await s.clone().resize(1200,630,{fit:'cover'}).jpeg({quality:80,mozjpeg:true}).toFile('public/og-1200x630.jpg');
"
```

Open frames 0, 30 and 59 with Read and confirm they are not black, duplicated or mis-cropped.

### Code

Identical markup and CSS to R2. Only the config differs — and this is the case where the sliding window
is mandatory rather than optional.

```js
import { SequencePlus } from './seq-plus.js';

const stage = document.querySelector('.seq');
const COUNT = 60;

// Decoded-memory arithmetic (the gate requires this written down):
//   desktop  60 * 1280 * 720 * 4 = 221,184,000 B = 221 MB  -> above the 250 MB soft ceiling once
//                                                             the browser's own buffers are added,
//                                                             so SequencePlus turns the window ON.
//   mobile   30 *  960 * 540 * 4 =  62,208,000 B =  62 MB  -> window off, step=2 handles it.
// Window = current +/-12 decoded, evict beyond +/-20, and the 13 pinned keyframes are NEVER evicted,
// so a backward scrub past the evicted edge always finds a frame within 5 to draw. That is the
// specific failure this recipe would otherwise have: a blank canvas on reverse scroll.
new SequencePlus(stage, stage.querySelector('.seq__canvas'), {
  mode: 'sequence',
  count: COUNT,
  width: 1280, height: 720,
  ease: 0.12,
  restFrame: 18,                                  // the most informative frame, not the last
  src: (i, tier) => `/hero/seq/${tier === 'full' ? 'desktop' : 'mobile'}/frame-${String(i).padStart(4, '0')}.webp`,
  onProgress: () => stage.classList.add('is-ready'),
});
```

```css
/* 60 frames over a 400vh scrub range = 15 frames/100vh. Comfortable.
   Do the arithmetic before changing this; shortening the stage makes steppiness WORSE. */
.seq { --stage-h: 500vh; }
@media (max-width: 768px) { .seq { --stage-h: 260vh; } }
@media (prefers-reduced-motion: reduce) { .seq { --stage-h: 100svh !important; } }
```

### Reduced-motion end state

Frame 18 only — the most informative frame, chosen deliberately rather than defaulting to the last.
One 55 KB fetch, one draw, stage collapsed to `100svh`, no ladder, no observer, no loop.

### Mobile fallback

Tier `mobile` → `step = 2`: 30 of 60 frames at 960×540 = **930 KB**, DPR clamped to 1.5, decoded 62 MB.
Tier `small` (≤480px) and tier `poster` (`saveData`, 2g) are both terminal → one frame, never the ladder.
If the client insists on motion on the smallest tier, the correct substitution is the source clip
itself as `<video autoplay muted playsinline loop>` at 640×360 — one file, hardware-decoded, and it
is still gated off under `prefers-reduced-motion`.

### Payload

| | bytes |
|---|---|
| Poster JPEG | ~78 KB |
| Desktop ladder, 60 frames @55 KB | **3.30 MB** (cap 4.0 MB) |
| Mobile ladder as fetched, 30 frames @31 KB | **930 KB** (cap 1.5 MB) |
| First usable scrub (poster + 13 pinned keyframes) | ~793 KB — over the 250 KB target |
| ↳ fix: raise `KEY_EVERY` to 8 → 8 keyframes = ~518 KB, or 480×270 keyframes = ~180 KB | |
| `seq-plus.js` + `progress.js` gzip | 4.6 KB |
| Peak decoded | **221 MB** desktop (window ON), 62 MB mobile |

---

# R8 — AI-generated frames — **EXPLICITLY NOT LOAD-BEARING**

**This recipe is unreachable from the routing algorithm and that is deliberate.** Free anonymous
generation has collapsed to the point where it cannot carry a client deliverable. At most it is a
texture plate: an abstract, out-of-focus backdrop behind type, added *after* the page already passes
every gate without it, and removable in one line.

**Routes in when:** never automatically. Only when a human explicitly asks for it, and only for
atmosphere.

### The evidence, so nobody re-litigates this

- **ZeroGPU (HuggingFace Spaces), anonymous:** hard-blocked after **one 10.6 s call** from this
  container — *"You have exceeded your ZeroGPU runs limit."* The quota is **IP-keyed** and pooled
  across **all** Spaces, so a shared egress IP means effectively zero. A free HF account buys 5
  GPU-minutes per day, total.
- **HF Inference Providers free credit:** **$0.10/month** ≈ 3–5 FLUX images.
- **Pollinations:** still works with no auth, but `/models` now returns exactly `["sana"]`, the
  `model=` parameter is **silently ignored**, prompt adherence is weak (a request for an ECU circuit
  board returned a car), and the anonymous tier **queues rather than 429s** — measured 2 s, 2 s, then
  **43.7 s**.
- **Image-to-video models drift temporally.** They suit atmosphere; they cannot hold a product
  dimensionally consistent across 150 frames, which is the only thing a scrub needs.
- **Credit-gated video APIs** (Wan 2.2 and friends) are signup-credits-then-subscription and are
  disqualified under the zero-**recurring**-cost rule, alongside Rive.

### When NOT to use — which is nearly always

- As the hero. The skill's core promise is the client's own imagery; a generated hero breaks it.
- For anything specific: their product, their premises, their tools, a technical subject.
- For a frame sequence. Temporal drift makes it unusable.
- As a fallback when the harvest failed. The honest answer there is *"nema upotrebljivih fotografija —
  ovo je tipografski sajt"* plus R6/R9, not a synthetic substitute.
- Anywhere a human might mistake it for a photograph of the business.

### Asset prep

Pollinations needs **no credential**, which is the only reason it appears here. Nothing in this recipe
may read `process.env` looking for keys. If a user explicitly hands you a key for a paid provider at
run time, use exactly that key and nothing else; if they did not, this recipe is simply unavailable.

```bash
node --input-type=module -e "
import { writeFileSync } from 'node:fs';
import sharp from './work/tools/node_modules/sharp/lib/index.js';

// Abstract only. Never a subject, never a place, never a product.
const PROMPT = 'abstract soft-focus warm amber bokeh texture, very shallow depth of field, no objects, no text';
const url = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(PROMPT)
          + '?width=1024&height=576&nologo=true&seed=7';

const ctrl = new AbortController();
const t = setTimeout(() => ctrl.abort(), 60000);   // it queues; measured up to 43.7 s
let buf;
try {
  const r = await fetch(url, { signal: ctrl.signal });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  buf = Buffer.from(await r.arrayBuffer());
} catch (e) {
  console.error('generation unavailable:', e.message, '-> ship without the plate, the page must already work');
  process.exit(0);                                  // exit 0: this is optional by definition
} finally { clearTimeout(t); }

await sharp(buf).resize(1024, 576, { fit: 'cover' }).blur(3)
  .avif({ quality: 42, effort: 4 }).toFile('public/hero/plate.avif');
console.log('texture plate written');
"
```

### Code

```html
<section class="plate">
  <img class="plate__img" src="/hero/plate.avif" alt="" aria-hidden="true"
       width="1024" height="576" loading="lazy" decoding="async">
  <div class="plate__copy"><h2>Radimo od 1998.</h2></div>
</section>
```

```css
.plate { position: relative; isolation: isolate; overflow: clip; }
.plate__img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;
              z-index: -1; opacity: .5; }
.plate__copy { position: relative; padding: clamp(3rem, 10vh, 8rem) clamp(1.5rem, 5vw, 4rem); }

/* Any drift on the plate is a nice-to-have and dies under reduced motion. */
@media not (prefers-reduced-motion: reduce) {
  @supports (animation-timeline: view()) {
    .plate__img { animation: plate-drift linear both; animation-timeline: view(); animation-range: cover; }
    @keyframes plate-drift { from { transform: scale(1.06) translateY(-1.5%) } to { transform: scale(1.06) translateY(1.5%) } }
  }
}
```

`alt=""` + `aria-hidden="true"` is correct and required: it carries no information, so it must not be
announced. It is also the one image in this file that **may not** be the LCP element.

### Reduced-motion end state

Static. The drift is inside `@media not (prefers-reduced-motion: reduce)`, so the `to`-state simply
never applies and the plate sits still.

### Mobile fallback

`loading="lazy"` plus a 640-wide variant via `srcset`; on `saveData` drop the `<img>` entirely and let
the section's background colour show — nothing is lost, which is the whole point of a texture plate.

### Payload

| | bytes |
|---|---|
| `plate.avif` 1024×576 q42 blurred | ~62 KB |
| 640-wide mobile variant | ~28 KB |
| CSS | ~260 |
| Peak decoded | 1024 · 576 · 4 = **2.4 MB** |

If removing this file changes nothing about whether the page works, it was used correctly.

---

# R9 — Kinetic type

**Zero assets, a few KB, and the highest impact-per-byte technique available.** `matvoyce.tv` took
Awwwards Site of the Day with no 3D and no image sequence — pure timeline work on type.

**Routes in when:** rules 7 and 8, alongside R6. Also the correct **only** motion for
advokat/računovođa/konsultant, where a frame-scrubbed hero actively damages credibility.

### When NOT to use

- On more than **one** headline per page. Kinetic type on every heading reads as a template, which is
  the exact opposite of the intended signal.
- On body copy, ever. Splitting a paragraph breaks selection, find-in-page and screen readers.
- Character-level on a long headline. Word-level is the default; character-level only for a single
  short word (SNAGA, PRECIZNOST).
- Across a `lang` boundary. Split within one language span, or the pieces inherit the wrong hyphenation
  and font features.

### Asset prep

None. That is the recipe.

The only preparation is typographic: pick the family in `brand-identity.md` §3, self-host it, and
**include `latin-ext`** — č, ć, ž, š and đ live there, and omitting the subset renders the client's own
business name as tofu. This is a hard gate for bs/hr/sr builds.

```bash
# gwfh, one curl, no key. Verified: Inter latin+latin-ext regular/700 = 103,513 bytes.
curl -sL "https://gwfh.mranftl.com/api/fonts/inter?download=zip&subsets=latin,latin-ext&variants=regular,700&formats=woff2" \
  -o work/<slug>/inter.zip && unzip -o work/<slug>/inter.zip -d public/fonts/
# NEVER a fonts.googleapis.com <link> — a render-blocking stylesheet on two external hosts,
# ahead of everything else in the critical path.
```

### Code

```html
<h1 class="kt" data-split="word">Mirno. Precizno. Do kraja.</h1>
<hr class="kt-rule" aria-hidden="true">
```

```css
.kt { text-wrap: balance; }
.kt__w {
  display: inline-block;
  /* the base state IS the resting state — visible, in place */
  will-change: transform;
}
.kt.js-armed .kt__w {
  opacity: 0;
  transform: translateY(0.6em) rotate(1.5deg);
}
.kt.js-armed.is-in .kt__w {
  opacity: 1;
  transform: none;
  transition:
    opacity .55s cubic-bezier(.22,.61,.36,1) calc(var(--i) * 55ms),
    transform .70s cubic-bezier(.22,.61,.36,1) calc(var(--i) * 55ms);
}

/* the single hairline that draws across — the whole motion budget for a law firm */
.kt-rule {
  border: 0; height: 1px; background: currentColor; opacity: .28;
  transform-origin: left center; transform: scaleX(1);
}
.kt-rule.js-armed { transform: scaleX(0); }
.kt-rule.js-armed.is-in { transform: scaleX(1); transition: transform 1.1s cubic-bezier(.22,.61,.36,1) .25s; }

/* Deliberately NO @supports (animation-timeline: view()) block here.
   A one-shot entrance gains nothing from a scroll timeline — IntersectionObserver is already the
   right primitive, it is universally supported, and it fires once. Adding a view() animation on
   top would run redundantly in Chromium/Safari and fight `.is-in` in the cascade for no benefit.
   If you want the headline genuinely SCRUBBED by scroll rather than entering once,
   that is a different effect: use scroll-effects.md §1 (masked rise), not this recipe. */

@media (prefers-reduced-motion: reduce) {
  .kt.js-armed .kt__w { opacity: 1 !important; transform: none !important; transition: none !important; animation: none !important; }
  .kt-rule.js-armed { transform: scaleX(1) !important; transition: none !important; }
}
```

```js
/* kinetic.js — hand-rolled split. ~1.1 KB gzip, versus 45 KB for gsap+ScrollTrigger
   plus SplitText. Use GSAP only if the page already loads it for something else. */
import { REDUCED } from './progress.js';

function split(el, unit) {
  const source = el.textContent;
  el.setAttribute('aria-label', source);     // AT reads the whole line, not 47 fragments
  const pieces = unit === 'char' ? [...source] : source.split(/(\s+)/);
  const frag = document.createDocumentFragment();
  let i = 0;
  for (const piece of pieces) {
    if (/^\s+$/.test(piece)) { frag.append(piece); continue; }   // keep real spaces as text nodes
    const s = document.createElement('span');
    s.className = 'kt__w';
    s.style.setProperty('--i', i++);
    s.textContent = piece;
    frag.append(s);
  }
  el.replaceChildren(frag);
  el.setAttribute('aria-hidden', 'false');
  [...el.querySelectorAll('.kt__w')].forEach(s => s.setAttribute('aria-hidden', 'true'));
  return i;
}

const armed = [...document.querySelectorAll('.kt, .kt-rule')];
if (!REDUCED.matches && armed.length) {
  armed.forEach(el => {
    if (el.classList.contains('kt')) split(el, el.dataset.split === 'char' ? 'char' : 'word');
    el.classList.add('js-armed');            // only NOW may the hidden state apply
  });
  const io = new IntersectionObserver((entries, obs) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('is-in');
      obs.unobserve(e.target);               // one-shot; never re-animate on scroll-up
    }
  }, { threshold: 0.25, rootMargin: '0px 0px -8% 0px' });
  armed.forEach(el => io.observe(el));
}
```

Note the structure, which is the same three-tier discipline as R6: **the base CSS is the finished
state**, `js-armed` is added by JS only after it has confirmed it can also finish the animation, and
the reduced-motion branch never adds it. Firefox, no-JS, print and crawlers all get the headline.

### Reduced-motion end state

`js-armed` is never applied, so the headline is never split and never hidden — it is simply the
headline, correctly set, with the hairline rule at full width. There is no observer and no transition.
This was always the end state; that is why R9 is the safest recipe in the file.

### Mobile fallback

Nothing to degrade — no assets, no canvas, no scroll coupling. Two typography rules matter more than
any fallback here: keep `text-wrap: balance` on the headline so the split does not produce a one-word
last line, and cap the stagger at ~55 ms per word so a nine-word headline does not take 500 ms to
finish on a phone where it is already fully in view.

### Payload

| | bytes |
|---|---|
| Assets | **0** |
| CSS | ~640 |
| `kinetic.js` gzip | ~1.1 KB |
| GSAP alternative, for comparison | 45 KB gzip (gsap 27 + ScrollTrigger 17) + SplitText |
| Peak decoded | 0 |

---

# R10 — Blender-rendered prop

**Last resort.** Free in money, expensive in wall-clock time.

**Routes in when:** never automatically. Only when the trade genuinely needs an *accurate* object —
a specific part, a machine, a product — no photo of it exists, and the schedule can absorb the render.

### When NOT to use

- On a deadline. See the timing below; this is measured, not estimated.
- When a photograph exists. A real photo of the client's own part beats a render every time, on trust
  as well as on cost.
- For anything organic, textured or human. Free CC0 assets will not get you there.
- At 1080p, or at 60+ frames. Both are hours.

### The honest budget

**EEVEE_NEXT needs a GL context that a headless container does not have, so the engine silently falls
back to CYCLES CPU.** Measured here: a **640×360 frame took 26.2 s**. Scaling by pixel count, 960×540
is ≈2.25× the work ≈ **59 s/frame**, so:

| Render | Frames | Wall clock |
|---|---|---|
| 640×360 turntable | 24 | ~10 min |
| 960×540 turntable | 24 | ~24 min |
| 960×540 turntable | 40 | ~39 min |
| 1280×720 turntable | 60 | **~2.6 hours** |

Render **small** and **few**. Set `render.film_transparent = True` for free alpha — compositing the
prop over a CSS gradient is what makes a 960×540 render look like a 4K one.

### Asset prep

```bash
# Blender 5.2 LTS: 367 MB tarball, extracts and runs headless with NO system deps and NO sudo.
curl -L -o /tmp/blender.tar.xz \
  https://download.blender.org/release/Blender5.2/blender-5.2.0-linux-x64.tar.xz
tar -xf /tmp/blender.tar.xz -C /opt
BLENDER=/opt/blender-5.2.0-linux-x64/blender

# Poly Haven's public API is key-free, no auth, no rate-limit headers, everything CC0:
curl -s "https://api.polyhaven.com/assets?t=models" | head -c 400
curl -s "https://api.polyhaven.com/files/brake_disc" -o work/<slug>/ph.json
```

```python
# work/<slug>/turntable.py  —  $BLENDER -b -P work/<slug>/turntable.py
import bpy, math, os

OUT    = os.path.abspath("work/<slug>/render/")
FRAMES = 32
W, H   = 960, 540

os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)

# --- import the CC0 model -------------------------------------------------
bpy.ops.import_scene.gltf(filepath=os.path.abspath("work/<slug>/model.gltf"))
obj = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
obj.location = (0, 0, 0)

# --- world: CC0 HDRI, and a transparent film so the web page supplies the background
world = bpy.data.worlds.new("W")
bpy.context.scene.world = world
world.use_nodes = True
nt = world.node_tree
env = nt.nodes.new("ShaderNodeTexEnvironment")
env.image = bpy.data.images.load(os.path.abspath("work/<slug>/studio_small_08_2k.hdr"))
nt.links.new(env.outputs["Color"], nt.nodes["Background"].inputs["Color"])

# --- camera on a parented empty: rotate the EMPTY, never the object -------
pivot = bpy.data.objects.new("Pivot", None)
bpy.context.collection.objects.link(pivot)
cam_data = bpy.data.cameras.new("Cam")
cam = bpy.data.objects.new("Cam", cam_data)
bpy.context.collection.objects.link(cam)
cam.location = (0, -3.2, 1.1)
cam.rotation_euler = (math.radians(74), 0, 0)
cam.parent = pivot
bpy.context.scene.camera = cam

# --- render settings ------------------------------------------------------
sc = bpy.context.scene
sc.render.engine = 'CYCLES'        # EEVEE_NEXT silently falls back to this headless anyway
sc.cycles.samples = 48             # 48 is plenty with a denoiser; 512 is 10x the time for no gain
sc.cycles.use_denoising = True
sc.render.resolution_x, sc.render.resolution_y = W, H
sc.render.film_transparent = True  # free alpha
sc.render.image_settings.file_format = 'PNG'
sc.render.image_settings.color_mode = 'RGBA'
sc.frame_start, sc.frame_end = 0, FRAMES - 1

# one full revolution over the frame range
pivot.rotation_euler = (0, 0, 0)
pivot.keyframe_insert("rotation_euler", frame=0)
pivot.rotation_euler = (0, 0, math.radians(360))
pivot.keyframe_insert("rotation_euler", frame=FRAMES - 1)
for fc in pivot.animation_data.action.fcurves:
    for kp in fc.keyframe_points:
        kp.interpolation = 'LINEAR'          # a scrub must be linear or it fights the finger

# Render to a numbered PNG sequence, never straight to a movie file, so a crashed render resumes.
sc.render.filepath = os.path.join(OUT, "frame_")
bpy.ops.render.render(animation=True)
print("done ->", OUT)
```

```bash
$BLENDER -b -P work/<slug>/turntable.py
# 32 frames at 960x540 on Cycles CPU: expect ~30 minutes.

# Alpha must survive compression, so WebP with alphaQuality — never JPEG here.
node work/tools/compress.mjs work/<slug>/render public/hero/seq --format=webp --alpha
```

`Material.use_nodes` now emits a DeprecationWarning (removal in Blender 6.0) — the script above avoids
it by building the world node tree directly.

### Code

Identical to R2, with `mode: 'sequence'`. Two differences that matter:

```js
new SequencePlus(stage, canvas, {
  mode: 'sequence',
  count: 32,
  width: 960, height: 540,
  ease: 0.12,
  restFrame: 0,                     // a turntable has no "assembled" state; frame 0 is the hero angle
  src: (i, tier) => `/hero/seq/${tier === 'full' ? 'desktop' : 'mobile'}/frame-${String(i).padStart(4,'0')}.webp`,
});
```

```css
/* Alpha means the canvas must NOT be opaque, so the CSS background shows through. */
.seq__canvas { background: radial-gradient(120% 90% at 50% 20%, #1d1a17 0%, #0b0a09 70%); }
```

```js
// and in seq-plus.js, for this recipe only:
//   this.ctx = canvas.getContext('2d', { alpha: true });
//   plus this.ctx.clearRect(0, 0, cw, ch) at the top of blit() — otherwise frames smear.
```

### Reduced-motion end state

Frame 0 — the chosen hero angle — drawn once over the CSS gradient, stage collapsed to `100svh`. The
result is indistinguishable from a well-lit product photograph, which is the point.

### Mobile fallback

Render once at 960×540 and let `compress.mjs` produce the 960/720-wide ladders from it; there is no
reason to render twice. Tier `mobile` → step 2 (16 frames, ~448 KB). Tier `poster` → frame 0 only.

### Payload

| | bytes |
|---|---|
| Desktop ladder, 32 RGBA frames @28 KB (WebP q72, alphaQuality 90) | **896 KB** |
| Mobile ladder as fetched, 16 frames @18 KB | 288 KB |
| `seq-plus.js` + `progress.js` gzip | 4.6 KB |
| Peak decoded | 32 · 960 · 540 · 4 = **66 MB** |
| Render cost | ~30 min wall clock, CPU-bound, one time |

---

## 11. Pre-ship checklist for whichever recipe you picked

Run this before `delivery.md`'s gate, not instead of it.

**Routing**
- [ ] `work/concept.md` names **exactly one** hero recipe and **≤2** supporting recipes, with the
      rejected alternatives and the reason each was rejected.
- [ ] The routing rule that fired is written down with the number that triggered it
      (`P = 2 → rule 2 → R3`), not as a preference.
- [ ] No page contains a canvas scrub **and** a WebGL scene **and** a Lottie.

**Assets**
- [ ] Every image that ships is the client's own, or a Pexels fill with a visible
      "Photo by X on Pexels" link in the footer. Reference-only imagery is excluded from the build.
- [ ] Consent and copyright for every identifiable face is recorded in `work/concept.md`, or the
      shot is cropped. Medical/dental before-after is crop-to-detail and click-gated.
- [ ] No `bria-rmbg` output anywhere (non-commercial licence). `u2netp` or `birefnet-general-lite` only.
- [ ] Frame filenames are **4-digit** padded.
- [ ] `work/` is in `.gitignore`; `sharp` and `ffmpeg-static` are in `work/tools/`, not the client's
      `package.json`.
- [ ] Three frames opened and eyeballed: not black, not duplicated, not mis-cropped.

**Budget**
- [ ] `du -sh` on both ladders recorded, both under the recipe cap.
- [ ] `W × H × 4 × frames` written in a comment. Above ~250 MB the sliding window is on.
- [ ] Poster ≤80 KB; first usable scrub ≤250 KB; first-viewport transfer ≤400 KB; page JS ≤120 KB gzip.
- [ ] `og-1200x630.jpg` emitted from the same sharp pass. Without it every WhatsApp and Viber share
      renders blank — and that is the primary distribution channel for a local business.

**Motion correctness**
- [ ] Every `animation-timeline` / `animation-range` is declared **after** its `animation` shorthand.
- [ ] Every native scroll-driven effect is inside `@supports (animation-timeline: view())` and has an
      IntersectionObserver or GSAP path that carries it in Firefox.
- [ ] No hidden starting state (`opacity: 0`) in a base layer — only inside `@supports`, or applied by
      JS via a `js-armed`-style class after it has confirmed it can un-hide.
- [ ] Scroll-linked properties are `transform`/`opacity` only, with the two bounded exceptions
      (R6 `stroke-dashoffset`, R3 `clip-path`) and R3 defaults to the transform-mask variant.
- [ ] Scrub is smooth **forward and backward**. Scrub 0→1→0 and confirm no blank canvas at the
      evicted edge.
- [ ] DPR clamped: `Math.min(devicePixelRatio, 2)`, 1.5 on mobile.

**Degradation**
- [ ] OS-level `prefers-reduced-motion` on, page reloaded: complete end state, no tall empty runway,
      no infinite pulse or bouncing chevron, every CTA reachable. Lenis (if present) is gated too.
- [ ] 375 px viewport with `deviceMemory` spoofed low: the lighter tier engages.
- [ ] `saveData` on: **no sequence is fetched at all**.
- [ ] 320 / 768 / 1440 px: no horizontal body scroll, no overlapping text, no clipped CTA.

**Accessibility**
- [ ] Every `<img>` in the built output has an `alt`, authored from trade + subject in the site
      language; decorative tiles have `alt=""`.
- [ ] Every canvas is `role="img"` with a real `aria-label`, and the same information exists as text.
- [ ] Skip link is the first focusable element; `scroll-margin-top` is set on focusables inside sticky
      sections; hero CTAs are duplicated in the static contact block.
- [ ] Every hotspot/CTA is a real `<button>`/`<a>` with an accessible name and a visible focus ring.
- [ ] R5's target-size audit passes at 375 px, or the list fallback engages.
- [ ] Contrast ≥4.5:1 measured against the actual photo behind the scrim, not an assumed dark.
- [ ] Brand marks come from Simple Icons (CC0). Lucide v1.0 deleted every brand icon.

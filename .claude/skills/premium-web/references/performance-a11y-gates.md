# Performance & Accessibility Gates

The measurable checklist that decides whether the build ships. Every line here is a
number with a comparison operator, not an adjective. If you cannot produce the
number, the gate is **FAIL**, not "probably fine".

The executable form of this document is **`scripts/verify.mjs`**. It drives a real
Chromium over the built output and returns a non-zero exit code on any failure.
Nothing ships on a red gate.

```bash
npm run build
node .claude/skills/premium-web/scripts/verify.mjs --dir dist          # static site
node .claude/skills/premium-web/scripts/verify.mjs --dir dist --spa    # client-routed SPA
node .claude/skills/premium-web/scripts/verify.mjs --url https://preview.example.com --no-static
```

It writes `work/verify/report.md`, `work/verify/report.json`, and — the part that
matters most — `work/verify/shots/*.png`.

> **Read the screenshots.** Every other check in this file is a proxy. The
> screenshots are the only thing that can tell you the page looks broken, generic,
> half-rendered, or like a template with the client's name pasted on. A build can
> pass all 30 numeric gates and still be unshippable. Open
> `375-p000.png`, `375-p035.png`, `375-p070.png`, `375-p100.png` and the same four
> at 768 and 1440, plus the `reduced-*` set, and look at them.

Related, non-overlapping documents:
- `delivery.md` §7 — the **packaging** gate: zip round-trip, secret scan, external
  link HEAD checks, Lighthouse category scores. Run it after this one.
- `scroll-effects.md` / `hover-effects.md` — how to build the motion.
- This file — whether the motion you built is allowed to ship.

---

## 1. The contract

| Rule | Meaning |
|---|---|
| **Fail closed** | An error inside a check is a FAIL, never a PASS. A check that could not run reports SKIP and you must decide about it in words. |
| **Measured, not assumed** | "I added a media query" is not a reduced-motion check. "I used transform" is not a CLS check. |
| **Built output only** | Never gate on the dev server. Vite's dev server serves unminified, unhashed, uncompressed, differently-ordered assets. |
| **Lab is not enough** | Lighthouse never scrolls. A green Lighthouse run says nothing about the scroll-driven hero that is the entire point of this skill. |
| **Budgets are edited in the open** | If a number is wrong for a project, change it with `--budget key=value` and write down why in the build report. Never delete the check. |

---

## 2. The numbers

Every row is asserted by the check ID in the last column. Override with
`--budget <key>=<value>`.

### 2.1 Core Web Vitals

| Metric | Budget | Measured how | Check ID |
|---|---|---|---|
| **LCP** | **≤ 2500 ms** | 375px viewport, CDP throttling: 1.6 Mbps down / 150 ms RTT / 4× CPU. `PerformanceObserver({type:'largest-contentful-paint'})`, last entry. | `LCP` |
| **CLS, load phase** | **≤ 0.05** | Sum of `layout-shift` entries with `hadRecentInput === false` before the scripted scroll begins. | `CLS-LOAD` |
| **CLS, scroll phase** | **0** (any entry fails) | Same observer, entries recorded after the scroll phase marker, during a scripted sweep at 375/768/1440. | `CLS-SCROLL` |
| **INP** | **≤ 200 ms** | Not automated — see §3.2. Assert it by hand before deploy. | manual |

Why 0.05 for load CLS rather than the 0.1 "good" threshold: 0.1 is the field
threshold for a whole session on a real site with ads and third-party embeds. A
brochure page you built from scratch, with explicit dimensions on every image,
should be at 0.000. Anything above 0.05 means something genuinely reflows.

Why **0** for scroll CLS: scroll is **not** an excluding input in the Layout
Instability spec. There is no 500 ms grace period after a scroll the way there is
after a click or a keypress. Every shift that happens while the user scrolls counts
at full value, and a scroll-driven hero is scrolled by definition. If your build
produces sub-pixel shifts you have decided to accept, raise the bar explicitly and
record it: `--budget clsScroll=0.01`. Do not delete the check.

### 2.2 Payload

The critique's point stands: "1.5 MB mobile" is meaningless without knowing what
must land *first*. At 1.6 Mbps, 1.5 MB is 7.5 seconds. Split it.

| Thing | Budget | Notes | Check ID |
|---|---|---|---|
| **Everything transferred before LCP** | **≤ 400 KB** | HTML + critical CSS + JS + poster + 2 woff2. This is the number that decides whether the hero exists in under 2.5 s. | `HERO-PAYLOAD` |
| Poster image alone | ≤ 80 KB | The single LCP image. AVIF q50 or JPEG q75 at the real display width. | `POSTER-BYTES` |
| Keyframe subset (the 15–20 frames that make the scrub usable) | ≤ 250 KB | Loads after the poster, before the remainder. | manual, from the frames manifest |
| Frame sequence remainder, mobile | up to 1.5 MB total | `fetchpriority="low"` on `requestIdleCallback`, after `load`. | `PAGE-PAYLOAD` |
| Frame sequence, desktop | ≤ 4 MB | | `PAGE-PAYLOAD` with `--budget pageBytesDesktop` |
| **Whole page at 375px after a full scroll** | **≤ 1.5 MB** | Everything the phone actually downloads. | `PAGE-PAYLOAD` |
| **JS, gzipped, whole build** | **≤ 120 KB** | Measured with `zlib.gzipSync(level:9)` on the built `.js`, not from the bundler's own report. | `JS-BUDGET` |
| CSS, gzipped | ≤ 40 KB | | `CSS-BUDGET` |
| All self-hosted fonts | ≤ 200 KB | 2 families × 2 weights, woff2, subset `latin,latin-ext`. | `FONT-BUDGET` |
| Any single response | ≤ 500 KB | Flags an un-resized hero or an uncompressed video. | `PAGE-PAYLOAD` detail |
| `navigator.connection.saveData === true` | **fetch no sequence at all** | Terminal tier: poster only. Not a hint — a rule. | manual, in the scrubber |

**120 KB gzip for JS is the number a single promotional page should hit.** For
reference, a default React + react-router + framer-motion build lands around
**275 KB gzip / 1 MB raw**, which is where this repo currently sits. The route to
120 KB is: no router on a one-page site (anchors), native CSS scroll-driven reveals
instead of a motion library for every non-hero section, and the motion library
tree-shaken down to the scrubber only.

### 2.3 Memory

| Thing | Budget | Formula | Check ID |
|---|---|---|---|
| **Live decoded bitmap for a frame sequence** | **≤ 250 MB** | `width × height × 4 × frames` | `DECODED-MEMORY` |

This is the constraint that is invisible in every network panel. Measured on this
repo: 60 frames at 1280×720 is **3.7 MB on disk and 211 MB decoded**. At 1920×1080
the same 60 frames would be 475 MB and iOS Safari kills the tab.

Above budget, the sliding decoded-frame window is mandatory, not optional:
- window = current ± 12 frames, evict beyond ± 20, `ImageBitmap.close()` on eviction;
- **pin the every-Nth keyframe subset permanently and never evict it**, so a
  backward scrub past the evicted edge always has a frame within N to draw;
- wrap `createImageBitmap` in try/catch with a fallback to a plain
  `HTMLImageElement` and a console warning.

Also asserted: **4-digit frame numbering**. Two-digit padding (`frame-07.jpg`)
overflows and sorts wrong past 99, and the Apple reference this skill benchmarks
against is 147 frames.

### 2.4 Accessibility

| Thing | Budget | Check ID |
|---|---|---|
| Visible focus state on every keyboard-focusable element | 100% | `KEYBOARD-FOCUS` |
| Accessible name on every focusable element | 100% | `ACCESSIBLE-NAME` |
| Tap target, general | **≥ 24 × 24 CSS px** (WCAG 2.2 SC 2.5.8 AA) | `TAP-TARGETS` |
| Tap target, the primary conversion action | **≥ 44 × 44 CSS px** | `TAP-TARGETS` |
| Text contrast, body and UI | **≥ 4.5 : 1** | manual — §3.1 |
| Text contrast, ≥ 24 px or ≥ 19 px bold | ≥ 3.0 : 1 | manual — §3.1 |
| Non-text contrast (focus rings, input borders, icon-only buttons) | ≥ 3.0 : 1 | manual — §3.1 |
| `alt` on every `<img>`, meaningful | 100% | `ALT-TEXT` |
| Exactly one `<h1>` per page, no skipped levels | strict | `HEADING-ORDER` |
| Reduced motion presents a complete static end state | strict | `REDUCED-MOTION` |
| Horizontal body overflow at 320/375/768/1440 | 0 px | `OVERFLOW` |

The SC 2.5.8 **inline exception** is implemented: a link sitting inside a sentence
of prose is exempt, because you cannot enlarge it without wrecking the paragraph.
Without that exception the check fails on every page that has a link in a
paragraph, and a gate that can never pass gets ignored.

The 44 px rule is deliberately scoped **narrowly** to the real conversion action —
`tel:`, `mailto:`, `sms:`, `viber:`, `wa.me`, `api.whatsapp.com`, `m.me`, or a
`<button>` whose label is a booking/quote verb. A nav link whose label happens to
read "Kontakt" is navigation, and holding a 36 px header link to 44 px fails every
normal site.

### 2.5 Content integrity

| Thing | Rule | Check ID |
|---|---|---|
| Placeholder text in the rendered page | zero | `PLACEHOLDER-TEXT` |
| Placeholder text in the built files | zero | `PLACEHOLDER-FILES` |
| `tel:` href that is not a dialable number | zero | `PLACEHOLDER-TEXT` |
| Every internal link and in-page anchor resolves | 100% | `INTERNAL-LINKS` |
| Every route renders ≥ 400 chars of visible text | strict | `PAGE-RENDERED` |
| Every declared language is complete | ≥ 60% of the fullest language's text, no untranslated duplicates | `I18N-COMPLETE` |
| `<html lang>` present and a valid BCP 47 tag | strict | `LANG-ATTR` |
| No runtime errors, no 4xx/5xx, no failed requests | zero | `RUNTIME` |

The placeholder scan is split in two on purpose. Universal patterns (`lorem
ipsum`, `TODO`, `XXX`, `Vaš tekst`, `Ime firme`, `{{…}}`) run against every text
file. Prose-only patterns (`[bracketed slot]`, `${unrendered}`) run against **HTML
and rendered text only** — `[hidden]` is a real CSS selector and `arr[i]` is real
code, and scanning CSS/JS with a bracket pattern produces a wall of false positives
that trains everyone to ignore the check. `delivery.md` §7.2.5 makes the same point
about grep exit codes; the same discipline applies to pattern scope.

The `tel:` check exists because on a local-business site the phone number **is** the
product. A `tel:+387 XX XXX XXX` that survived into the build is not a typo, it is
a dead conversion funnel, and it looks identical to a working one in a screenshot.

### 2.6 Head, host and build hygiene

| Thing | Rule | Check ID |
|---|---|---|
| No render-blocking external stylesheet in `<head>` | zero | `FONT-HOST` |
| `<link rel="preload" as="image" fetchpriority="high">` in `index.html` when the build is a client-rendered shell | required | `LCP-PRELOAD` |
| `<link rel="canonical">`, `<meta name="description">`, `<meta property="og:image">` (1200×630), parseable `LocalBusiness` JSON-LD | required | `SEO-META` |
| `animation-timeline` declared **after** the `animation` shorthand | strict | `CSS-SCROLL-TRAPS` |
| `animation-timeline` guarded by `@supports (animation-timeline: view())` | strict | `CSS-SCROLL-TRAPS` |
| A `prefers-reduced-motion` branch exists in the shipped CSS or JS | required | `REDUCE-BRANCH` |
| File count ≤ 20 000, no file > 25 MiB | Cloudflare Pages limits | `HOST-LIMITS` |
| `public/_headers` with immutable caching on hashed asset paths | recommended | `CACHE-HEADERS` |

`LCP-PRELOAD` fires only when `index.html` is a shell — a `<div id="root">` and a
module script, with under 200 characters of markup outside `<head>`. In that build
shape a poster `<img>` inside a component **cannot paint until the bundle
downloads, parses and mounts**. Editing the component does nothing. The fix goes in
`index.html`.

`FONT-HOST` fires on any `<link rel="stylesheet" href="https://…">`. A
`fonts.googleapis.com` stylesheet costs DNS + TLS + request on two extra hosts
before the browser even discovers which font files it needs, all of it in the
critical path. Self-host:

```bash
curl -L -o fonts.zip \
 'https://gwfh.mranftl.com/api/fonts/inter?download=zip&subsets=latin,latin-ext&variants=regular,700&formats=woff2'
```

**`latin-ext` is mandatory for bs/hr/sr builds, not optional.** č ć ž š đ live in
latin-ext. Omit it and the client's own business name renders as tofu boxes.

---

## 3. The checks verify.mjs does not make

Be honest about these. Each has a procedure; run it before deploy and write the
result into the build report.

### 3.1 Contrast measured against the actual photo

A contrast checker fed two hex values proves nothing when the text sits over a
photograph. The scrim is what makes it pass, and the scrim's effective colour
varies across the frame. Measure the **rendered pixels**, using the screenshots the
gate already produced:

```js
// contrast.mjs — worst-case contrast of a text colour against a screenshot region.
//   node contrast.mjs work/verify/shots/1440-p000.png '#ffffff' 360 140 720 260
import sharp from 'sharp';

const [file, hex, x, y, w, h] = process.argv.slice(2);
const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (r, g, b) => 0.2126 * lin(r / 255) + 0.7152 * lin(g / 255) + 0.0722 * lin(b / 255);
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

const fg = lum(...[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)));
const { data, info } = await sharp(file)
  .extract({ left: +x, top: +y, width: +w, height: +h })
  .raw().toBuffer({ resolveWithObject: true });

let worst = Infinity, worstPx = null;
for (let i = 0; i < data.length; i += info.channels) {
  const r = ratio(fg, lum(data[i], data[i + 1], data[i + 2]));
  if (r < worst) { worst = r; worstPx = [data[i], data[i + 1], data[i + 2]]; }
}
console.log(`worst contrast ${worst.toFixed(2)}:1 against rgb(${worstPx}) — ` +
            (worst >= 4.5 ? 'PASS' : worst >= 3 ? 'PASS only for ≥24px text' : 'FAIL'));
```

Run it on the **brightest** frame of the sequence, not frame 0. A scrim tuned
against a dark opening frame fails four seconds into the scrub.

If it fails: deepen the scrim, add a `text-shadow` as a floor, or move the text off
the photo. Do not lower the text's opacity to "make it blend".

Also check `forced-colors: active` and `prefers-contrast: more` by hand — one
reload each in DevTools rendering emulation.

### 3.2 INP

INP needs a real interaction; it cannot be observed on a page nobody touched.
Procedure, throttled to 4× CPU:

1. Open the built site at 375px with CPU throttling on.
2. Tap the primary CTA, the mobile menu toggle, and one hotspot or gallery item.
3. In the Performance panel, read the longest **interaction** entry — presentation
   delay included, not just the handler.
4. **≤ 200 ms** passes. Above it, the usual culprit on this kind of page is a
   synchronous `drawImage` of a large frame or an un-debounced scroll handler doing
   layout reads.

### 3.3 Cross-engine behaviour

This container ships **Chromium only** (`ls /opt/pw-browsers` → `chromium*`,
`ffmpeg`; no firefox, no webkit). Do not write "tested in Chrome, Firefox and
Safari" anywhere in the handover. Two things are known and must be reasoned about
rather than measured:

- **Firefox stable has not shipped scroll-driven animations** (still behind
  `layout.css.scroll-driven-animations.enabled`). `animation-timeline` is ~84%
  global and **not Baseline**. Every native scroll-driven effect needs an
  IntersectionObserver or GSAP fallback as the *load-bearing* path; native CSS is
  progressive enhancement behind `@supports` only.
- **Safari's compositor-threaded scroll animations (26.4+) cover an allowlist
  only**: `opacity`, `transform`, `translate`, `scale`, `rotate`, `filter`,
  `backdrop-filter`, Motion Path. A scroll-driven animation on `width`, `height`,
  `color` or `clip-path` silently returns to the main thread.

If cross-engine evidence is worth the download:
`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers npx playwright install firefox webkit`,
then swap the launcher. If the install is blocked, that is a SKIP line in the
report — never a claimed pass.

### 3.4 Provenance

Not a performance gate, but it belongs in the same fail-closed pass: the hero must
be the client's **own** imagery. Third-party or unlicensed imagery is style
reference only and never ships. Identifiable third parties in salon / gym /
restaurant / before-after photos need recorded consent, or crop to the detail.

---

## 4. The smooth-scroll trap

**This already bit this project once. Read it.**

`scroll-behavior: smooth` in CSS makes *programmatic* scrolling animate. That single
line changes what every scroll-based measurement means:

| What you write | What actually happens |
|---|---|
| `window.scrollTo(0, y)` | returns immediately; the page is still gliding toward `y` |
| `await page.screenshot()` right after | captures a **mid-transition frame** — a half-faded overlay, a canvas between two frames, a sticky header caught mid-collapse. You look at it and conclude the design is broken. |
| `page.evaluate(() => scrollY)` right after | reads the **old** position |
| a `layout-shift` entry landing in that window | indistinguishable from a genuine shift, because the smooth animation is still moving things |
| an assertion on a sticky element's offset | reads the pre-scroll offset and passes when it should fail, or fails when it should pass |

`verify.mjs` defends three ways and **all three must stay**:

1. **An init script forces it off during measurement.** A stylesheet with
   `html,body,*{scroll-behavior:auto !important}` is injected at document start, and
   the fact that the page had `scroll-behavior: smooth` is reported as a `WARN` so
   you know the harness intervened. `--keep-smooth-scroll` disables the override for
   when you want to watch the real experience — but then the numbers are not
   trustworthy and the report says so.
2. **Every scroll is issued three ways**: `scrollTo({behavior:'instant'})`, a direct
   `scrollingElement.scrollTop =` write, and a legacy `scrollTo(x, y)`. The
   `scrollTop` write bypasses the CSS property entirely.
3. **Every scroll settles before anything is measured.** Poll `scrollTop` across
   animation frames until it has not changed for 250 ms, then `await
   document.fonts.ready`, then `await img.decode()` on every visible image. Only
   then screenshot or assert.

**JS smooth-scroll hijackers are a different problem and none of the three fix it.**
Lenis, Locomotive and GSAP ScrollSmoother animate a `transform` on a wrapper
instead of moving the scroller, so `scroll-behavior` is irrelevant to them and
`scrollTop` does not describe what the user sees. The gate detects them
(`SCROLL-HIJACK` warning) and tells you that scroll-position assertions are
advisory until they are gated. And they must be gated regardless: hijacked scroll
momentum is independently a motion-sickness trigger, so Lenis itself goes behind
`prefers-reduced-motion`, not just the animations it drives.

The same class of trap, worth knowing because it produces the same symptom —
a check that passes on a broken page:

- **`animation-timeline` before the `animation` shorthand.** The shorthand silently
  resets `animation-timeline` to `auto` and the effect simply does not run. Same for
  `animation-range`. This is the single most common "why isn't my scroll animation
  working" bug. Asserted by `CSS-SCROLL-TRAPS`.
- **Lighthouse never scrolls.** Every scroll-triggered layout shift on the page is
  invisible to it. A 100 Performance score is not evidence about a scroll-driven
  hero.
- **`serve -s` / a blind SPA rewrite.** It answers every missing file with
  `index.html` and a 200, so a broken stylesheet, a missing image and a dead
  internal link all look fine. The gate's own server marks fallback responses with
  an `x-verify-fallback` header so `INTERNAL-LINKS` can still tell a client route
  from a 404.
- **Images created with `new Image()`** are never in the document, never participate
  in layout, and therefore **never** receive Chrome's in-viewport priority boost.
  They sit at Low priority forever. This is why an all-at-once frame loader starves
  the poster, and why the loading ladder is three tiers.

---

## 5. Reduced motion: the end-state table

`prefers-reduced-motion: reduce` does **not** mean "turn the animation off". Turning
it off leaves a blank or half-built section — exactly for the users who asked for
less motion. It means **show the end state instantly**.

| Technique | Reduced-motion end state |
|---|---|
| Canvas frame scrub | Draw the final or most informative frame, **collapse the tall section to 100vh**, keep every hotspot and CTA reachable. |
| Native CSS scroll-driven | Wrap the `animation-timeline` declarations in `@media not (prefers-reduced-motion: reduce)` so the keyframes' to-state applies statically outside it. |
| GSAP | `gsap.matchMedia('(prefers-reduced-motion: reduce)')` branch that uses `.set()` and creates **zero** ScrollTriggers. |
| Lottie | `goToAndStop(total - 1)`. |
| WebGL | Render one frame, then stop the rAF loop. |
| Lenis / ScrollSmoother | Do not instantiate it at all. |
| Decorative loops (pulsing glow, bouncing chevron) | Stop them. These are precisely the WCAG 2.3.3 vestibular triggers, and they run unconditionally because nobody thinks of them as "the animation". Also: `box-shadow` is not compositor-accelerated — pulse `transform`/`opacity` instead. |

`REDUCED-MOTION` asserts, at 375px and 1440px, with the emulation confirmed active:

1. **No invisible content.** No element with >20 chars of text sitting at
   `opacity < 0.05` or `visibility: hidden`. This is the classic bug: the reduce
   branch removed the *animation* but not its `opacity: 0` start state.
2. **Nothing still animating** for more than 80 ms, and **no infinite iteration
   counts**.
3. **No scroll timeline still bound** — `animation-timeline` must be `auto`/`none`.
4. **No tall empty scroll track.** Any element ≥ 2 viewports tall whose actual
   content covers less than half its height. An uncollapsed 500vh pinned scrubber
   looks exactly like this: the user scrolls through five screens of the same static
   image to reach the next section.
5. **The end state is informative**: text length within 90% of the normal build,
   interactive element count within 90%, and the page is **not taller** under reduce
   than it is normally.

---

## 6. Tuning budgets honestly

Some projects legitimately need a different number. Change it in the open:

```bash
node scripts/verify.mjs --dir dist \
  --budget lcpMs=3000 \
  --budget clsScroll=0.01 \
  --budget pageBytesMobile=2097152
```

Then write one line per override into the build report saying what the number is
and why it moved. What is not acceptable: deleting the check, adding a
`|| true`, or reporting a SKIP as a pass.

Full override keys: `lcpMs`, `heroBytes`, `pageBytesMobile`, `pageBytesDesktop`,
`jsGzip`, `cssGzip`, `fontBytes`, `posterBytes`, `singleImageBytes`, `clsLoad`,
`clsScroll`, `decodedMemoryMB`, `minTapPx`, `minTapPxCTA`, `maxFiles`,
`maxFileBytes`, `minBodyText`, `langTextRatio`.

---

## 7. Copy-paste checklist

```
BUILD
[ ] npm run build succeeded; gating the BUILT output, never the dev server
[ ] node scripts/verify.mjs --dir dist  →  exit 0

SEEN WITH MY OWN EYES  (no substitute exists for this)
[ ] read shots/375-p000 / p035 / p070 / p100
[ ] read shots/768-* and shots/1440-*
[ ] read shots/reduced-375-* and shots/reduced-1440-*
[ ] the page does not look generic, broken, half-rendered, or like a template
[ ] the hero is the CLIENT'S OWN imagery

VITALS                                          gate
[ ] LCP ≤ 2500ms throttled                      LCP
[ ] load CLS ≤ 0.05                             CLS-LOAD
[ ] scroll CLS = 0                              CLS-SCROLL
[ ] INP ≤ 200ms  (manual, §3.2)                 —

PAYLOAD
[ ] ≤ 400KB before LCP                          HERO-PAYLOAD
[ ] ≤ 1.5MB whole page at 375px                 PAGE-PAYLOAD
[ ] ≤ 120KB gzip JS / ≤ 40KB gzip CSS           JS-BUDGET, CSS-BUDGET
[ ] ≤ 250MB decoded bitmap, 4-digit frames      DECODED-MEMORY
[ ] saveData → poster only                      manual

MOTION
[ ] reduced motion = complete static end state   REDUCED-MOTION
[ ] no tall empty scroll track under reduce      REDUCED-MOTION
[ ] no infinite decorative loops under reduce    REDUCED-MOTION
[ ] animation-timeline after the shorthand,
    inside @supports, with an IO/GSAP fallback   CSS-SCROLL-TRAPS
[ ] transform/opacity only for scroll-linked     CLS-SCROLL

ACCESSIBILITY
[ ] visible focus on every focusable element     KEYBOARD-FOCUS
[ ] accessible name on every focusable element   ACCESSIBLE-NAME
[ ] tap targets ≥24px, CTA ≥44px                 TAP-TARGETS
[ ] contrast ≥4.5:1 against the ACTUAL photo     manual, §3.1
[ ] meaningful alt on every image                ALT-TEXT
[ ] one h1, no skipped levels                    HEADING-ORDER
[ ] no horizontal overflow 320/375/768/1440      OVERFLOW

CONTENT
[ ] no lorem / TODO / "Vaš tekst" / {{…}}        PLACEHOLDER-TEXT, PLACEHOLDER-FILES
[ ] tel: is a real dialable number               PLACEHOLDER-TEXT
[ ] every internal link and anchor resolves      INTERNAL-LINKS
[ ] every declared language complete             I18N-COMPLETE
[ ] zero runtime errors / failed requests        RUNTIME

HEAD & HOST
[ ] no external font stylesheet in <head>        FONT-HOST
[ ] fonts self-hosted with latin-ext subset      FONT-BUDGET
[ ] poster preload in index.html (SPA shells)    LCP-PRELOAD
[ ] canonical + og:image 1200×630 + JSON-LD      SEO-META
[ ] ≤20,000 files, ≤25MiB per file               HOST-LIMITS
[ ] _headers with immutable caching              CACHE-HEADERS

THEN
[ ] run delivery.md §7 packaging gate (zip round-trip, secret scan, external links)
```

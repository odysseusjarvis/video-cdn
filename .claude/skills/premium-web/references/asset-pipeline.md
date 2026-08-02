# Asset Pipeline

**harvest → triage → cutout → frames → compress → budget.** Every command below was executed
in this container on 2026-08-02 and the outputs pasted are real, including the failures.

---

## Contents

- [§0 Scope — what lives here, what lives elsewhere](#0-scope--what-lives-here-what-lives-elsewhere)
- [§1 Preflight — three facts that break naive pipelines](#1-preflight--three-facts-that-break-naive-pipelines)
- [§2 Harvest — `scripts/harvest.mjs`](#2-harvest--scriptsharvestmjs)
- [§3 Triage — the SET class, with numbers](#3-triage--the-set-class-with-numbers)
- [§4 Cutout — rembg](#4-cutout--rembg)
- [§5 Frames — from video and from stills](#5-frames--from-video-and-from-stills)
- [§6 Compress — the two ladders, the poster, the social card](#6-compress--the-two-ladders-the-poster-the-social-card)
- [§7 Budgets — disk, decoded memory, first viewport](#7-budgets--disk-decoded-memory-first-viewport)
- [§8 The video-scrub alternative, and why it usually loses](#8-the-video-scrub-alternative-and-why-it-usually-loses)
- [§9 The whole chain in one block](#9-the-whole-chain-in-one-block)
- [§10 Failure playbook](#10-failure-playbook)
- [§11 Verified command index](#11-verified-command-index)

---

## §0 Scope — what lives here, what lives elsewhere

This file owns the **bytes**: getting the client's own pixels onto disk, deciding what motion
those pixels can support, and turning them into a budget-checked asset set.

| You want | Go to |
|---|---|
| Which recipe (R1…R10) to build | `animation-recipes.md` |
| The per-trade motion parameters — frame counts, section heights, easing | `industry-playbooks.md` §0.4 |
| Palette, type, mood, the *evidence* harvest (screenshots, computed CSS, brand colours) | `brand-identity.md` §1–2 |
| Vectorising a logo for SET-G | `industry-playbooks.md` §14.3 |
| Scroll wiring, reduced motion, compositor rules | `scroll-effects.md` |
| Structured data, `og:image` markup, hreflang | `i18n-seo.md` |
| Packaging and handing the result to the client | `delivery.md` |

**Two harvests exist and they are not the same thing.** `brand-identity.md` §1.1 ships
`harvest.cjs`, which renders the page in Chromium and captures *evidence you look at* —
full-page screenshots, computed colour tallies, font stacks, type scale. This file ships
`scripts/harvest.mjs`, which collects *the bytes that ship*. Run both. They answer different
questions and neither replaces the other.

### The one non-negotiable rule about imagery

**The client's own imagery ships. Everything else is style reference only.** A page you
found that looks great, a competitor's photography, a moodboard image, anything generated —
those inform the design and never enter `dist/`. If the harvest comes back empty, the honest
outcomes are: the client sends photos, someone shoots on a phone, or you build the asset-free
recipes (SET-F/SET-G) and **say so out loud**. Silently substituting stock breaks the single
promise this skill makes.

### Credentials

Nothing in this chain reads, probes or tests a credential. `harvest.mjs` touches no API key,
no token, no ambient cloud credential; the only environment variable it reads is
`HTTPS_PROXY`, and only to route Chromium's own requests through the proxy this container
already requires. If a later step needs a key, it must be one **the end user explicitly
supplied for their own task** — never one discovered by looking around the environment. Do
not write preflight code that enumerates what might be lying about.

---

## §1 Preflight — three facts that break naive pipelines

Run this once per project, before anything else.

```bash
mkdir -p work/tools
npm --prefix work/tools i --silent sharp ffmpeg-static
printf 'work/\n' >> .gitignore     # raw originals + PNG intermediates are easily 200 MB+
```

`work/tools/` is shared across every client in the project. Build-time tools **never** go into
the client's `package.json` — `sharp` and `ffmpeg-static` would ship in their dependency list
forever. Client work is namespaced `work/<slug>/…` so a second client, or a re-run, cannot
destroy the first.

### 1.1 The system `ffmpeg` is broken here

```console
$ ffmpeg -version
ffmpeg: error while loading shared libraries: libcaca.so.0: cannot open shared object file: No such file or directory
```

Every naive media pipeline dies on its first line. Use the npm binary:

```console
$ node -p "require('./work/tools/node_modules/ffmpeg-static')"
/…/work/tools/node_modules/ffmpeg-static/ffmpeg

$ "$(node -p "require('./work/tools/node_modules/ffmpeg-static')")" -version | head -1
ffmpeg version 7.0.2-static https://johnvansickle.com/ffmpeg/  Copyright (c) 2000-2024 the FFmpeg developers
```

Bind it to a shell variable once and use `$FF` everywhere after:

```bash
FF="$(node -p "require('$PWD/work/tools/node_modules/ffmpeg-static')")"
```

**`ffmpeg-static` ships `ffmpeg` only — there is no `ffprobe`.** Probe with `ffmpeg -i`, which
writes to stderr and still exits 0 when you pipe it:

```console
$ "$FF" -hide_banner -i work/<slug>/raw/clip.mp4 2>&1 | grep -E 'Duration|Stream'
  Duration: 00:00:04.00, start: 0.000000, bitrate: 6186 kb/s
  Stream #0:0[0x1](und): Video: h264 (High) (avc1 / 0x31637661), yuv420p(progressive), 1920x1080 [SAR 1:1 DAR 16:9], 6182 kb/s, 30 fps, 30 tbr, 15360 tbn (default)
```

### 1.2 sharp does everything; @squoosh/cli does nothing

```console
$ node -e "const s=require('./work/tools/node_modules/sharp'); console.log('libvips', s.versions.vips)"
libvips 8.18.3
```

One real encode round-trip, not just an import — 2560×1440 AVIF source, 556,997 bytes, resized
to 1280×720:

| Encoder | Options | Output bytes |
|---|---|---|
| `.webp()` | `{quality:72, effort:4}` | **117,420** |
| `.avif()` | `{quality:50}` | **70,467** |
| `.jpeg()` | `{quality:78, mozjpeg:true}` | **130,452** |

sharp limits worth remembering: **SVG is input-only**, there is no JXL, no jp2, and no
ImageMagick delegate in this build.

> **Never install `@squoosh/cli`.** It installs cleanly with zero vulnerabilities and `--help`
> prints fine — so it passes every smoke test — then throws `ERR_INVALID_URL` inside
> `createWasm` on any real encode under Node 22. Upstream is archived. sharp covers webp, avif
> and mozjpeg in one prebuilt dependency.

### 1.3 Chromium is already installed — never run `playwright install`

```bash
ls /opt/pw-browsers/chromium-1194/chrome-linux/chrome   # the binary
node -e 'console.log("playwright", require("playwright/package.json").version)'   # 1.62.1
```

Launch with:

```js
chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] })
```

In a proxied sandbox, Chromium's own network stack is often blocked even when `HTTPS_PROXY`
is set (symptom: `net::ERR_CONNECTION_RESET` on every navigation while `curl` to the same host
returns 200). The fix is **not** to disable TLS verification — route requests through
Playwright's Node-side fetcher, which honours the environment proxy. `harvest.mjs` does this
automatically; the pattern is documented in `brand-identity.md` §1.0.

### 1.4 Preflight checklist

```
[ ] work/tools/ exists, sharp + ffmpeg-static installed there, NOT in the client's package.json
[ ] work/ is in .gitignore
[ ] `ffmpeg -version` fails (expected) and $FF -version prints 7.0.2-static
[ ] sharp encodes both webp and avif from a real file
[ ] @squoosh/cli is not installed and will not be
[ ] work/<slug>/ namespaced for this client
```

---

## §2 Harvest — `scripts/harvest.mjs`

```
node .claude/skills/premium-web/scripts/harvest.mjs <url ...> [options]
```

Arguments are either **page URLs** (crawled) or **direct image/video URLs** (fetched first,
immediately — the path for pasted, signed, expiring social-CDN links).

| Option | Default | Notes |
|---|---|---|
| `--out <dir>` | `work/harvest` | output root |
| `--slug <slug>` | — | shorthand for `--out work/<slug>/harvest`; **use this**, it is what makes re-runs and second clients safe |
| `--tools-dir <dir>` | nearest `work/tools` | where sharp is resolved or installed |
| `--from-file <path>` | — | additional URLs, one per line, `#` comments allowed |
| `--browser` / `--no-browser` | auto | force / forbid the Chromium rendered harvest |
| `--max <n>` | `80` | cap on downloads |
| `--min-bytes <n>` | `3000` | reject below this |
| `--max-video-bytes <n>` | `26214400` | 25 MiB — Cloudflare Pages' per-file cap |
| `--concurrency <n>` | `4` | parallel downloads |
| `--timeout <ms>` | `25000` | per request |
| `--keep-small` | off | keep tiny images instead of rejecting |
| `--no-auto-install` | off | fail instead of installing sharp |
| `--quiet` | off | summary only |

**Exit codes:** `0` at least one asset downloaded · `3` pages read but **zero bytes obtained**
(SET class auto-downgraded, banner printed) · `1` usage or fatal error.

### 2.1 What it extracts

From every page, resolved against `<base href>` where present, HTML-entity-decoded:

- `og:image`, `og:image:url`, `og:image:secure_url`, `twitter:image`, `twitter:image:src`, `itemprop=image`, `msapplication-TileImage`
- every `<img>` `src`, plus `data-src` / `data-lazy-src` / `data-original` / `data-image` / `data-bg`, plus the **largest** `srcset` candidate (`w` descriptor first, then `x`, then last)
- `<picture><source srcset>`, `<video src>`, `<video poster>`, `<source src>`
- `url()` in `style=""` attributes, in `<style>` blocks, **and in every linked stylesheet** — resolved against the *stylesheet's* URL, not the document's, which is the usual place a hand-rolled extractor gets it wrong
- JSON-LD `image` / `logo` / `photo` / `thumbnailUrl` / `contentUrl` / `primaryImageOfPage`, walked recursively
- `<link rel=preload as=image>` (`href` **and** `imagesrcset`)
- `<link rel=icon|apple-touch-icon|mask-icon>` — the logo, which is what makes SET-G possible

It also lifts the client's real facts, because this is the only place they exist:

```
name · schema.org @type(s) · telephone (JSON-LD + every tel: link) · email · address ·
geo · openingHoursSpecification · sameAs (+ viber:/wa.me links) · priceRange ·
html lang · og:locale
```

Feed those into step 1 instead of asking the user for them.

### 2.2 Two extraction bugs that are not theoretical

Both were found by running against live sites, and both are fixed in the script. If you write
your own extractor, you will hit them.

**HTML entities in attribute values.** `srcset="/_next/image?url=…&amp;w=3840&amp;q=75"` fetched
literally becomes a query containing `&amp;w=3840`, the resizer never sees `w`, and it returns
**HTTP 400**. Measured on a live Next.js site: **14 of 16 assets failed for exactly this
reason** before entity decoding was added. After: 16/16.

**Image-resizing proxies.** `/_next/image?url=<encoded>`, `images.weserv.nl/?url=…`, and friends
wrap the real asset in a query parameter. Going to the **inner** URL is strictly better — it is
the untouched original, not the proxy's re-encode capped at whatever `w` the page requested.
Unwrapping turned a 3840px proxy output into a **6529×4353** original in the run below. Keep the
proxy URL as a fallback attempt in case the origin CDN is the one refusing you.

### 2.3 The fetch ladder — because binary fetch here is genuinely unreliable

*Pages* fetch fine from this container. *Image bytes from arbitrary CDNs frequently do not* —
403 and 503 are routine from hosts whose HTML returns 200. So every asset gets an attempt
ladder, not a single try:

| # | Attempt | Why it is different |
|---|---|---|
| 1 | `fetch()` + real browser `User-Agent` + `Referer` of the page it was found on + `Accept: image/*` | most CDN filters key on UA and Referer |
| 2 | retry after 1.2–2.0 s backoff, second UA, full `Sec-Fetch-*` set — **only** on `403/408/409/425/429/5xx` or a network error | rate limiters and edge caches recover |
| 3 | the live **Chromium** context via `ctx.request.get()` | carries the cookies the page handed out |
| 4 | `curl --http1.1 --compressed` | different TLS + HTTP stack; forced onto HTTP/1.1 |
| 5 | the resizing-proxy URL we unwrapped away from | in case the origin is the one blocking |
| — | give up → **`FAILED.md`** with a copy-paste curl block | the user can finish the job themselves |

Every attempt is recorded per asset in the manifest, so `fetchedVia` and `attempts[]` tell you
exactly which rung succeeded.

### 2.4 The accounting line is mandatory

Every run prints, and you must read:

```
requested N / downloaded M / failed K
```

**If M is 0, the SET class is automatically downgraded to SET-F** and the script says so in a
block you cannot miss. Pages parsing correctly is irrelevant; if not one byte of imagery
arrived, nothing can be classified and R1–R5 and R7 are off the table. The gate "manifest lists
an image ≥1200px" must never pass on metadata the script never actually obtained.

### 2.5 Instagram and Facebook

`harvest.mjs` **refuses** `instagram.com`, `facebook.com`, `threads.net` and `tiktok.com` page
URLs by design. This skill does not build scrapers against those platforms. Two supported
routes:

**A — pasted direct URLs.** The user opens each post, copies the image URL, and passes it as an
argument. Signed CDN hosts (`scontent*.cdninstagram.com`, `*.fbcdn.net`) are detected, **sorted
to the front of the queue and fetched first**, because their signature expires — often within
hours. The `oe=` parameter is a hex Unix timestamp and the script decodes it:

```
── 1 signed social-CDN URL(s) queued FIRST ────────────────────────
  These carry a short-lived signature. They are being fetched right now because
  in a few hours they will 403 for everyone, including the client.
  expires 2025-08-31T21:41:52.000Z  https://scontent-lhr8-1.cdninstagram.com/v/t51.2885-15/…
```

A URL pasted this morning is dead this afternoon. **Fetch immediately or not at all.**

**B — better: files.** Ask the client to download the photos and drop them into
`work/<slug>/harvest/raw/`. Originals off a phone beat anything a CDN re-encodes, and they never
expire. `harvest.mjs` scans `raw/` on every run and folds hand-dropped files into the manifest
with `foundVia: ["dropped-in-by-hand"]`, probed and classified identically.

### 2.6 The Chromium fallback

The rendered harvest engages automatically when the plain fetch failed **or** produced fewer
than 3 image candidates, and can be forced with `--browser`. It navigates on
`domcontentloaded`, waits 1.5 s, **scrolls the whole page in 0.8-viewport steps** so
IntersectionObserver lazy-loaders actually fire, waits again, and then collects:

- `img.currentSrc` — what `srcset` *actually* resolved to, not what you guessed
- computed `background-image` on every element, so CSS- and JS-injected art is caught
- `<video>` `currentSrc` / `poster` / `<source>`
- every response the network served with `Content-Type: image/*` or `video/*` — this catches assets that never appear in any readable DOM
- plus the static JSON-LD/NAP extraction, merged

### 2.7 Manifest schema

`work/<slug>/harvest/manifest.json`:

```jsonc
{
  "generatedAt": "2026-08-02T…", "generator": "premium-web/scripts/harvest.mjs",
  "out": "…", "slug": "kovgrad",
  "inputs": { "pages": [...], "directAssets": [...], "refused": [...] },
  "pages":  [ { "url": "…", "ok": true, "candidates": 12, "via": "fetch", "title": "…" } ],
  "accounting": { "requested": 21, "downloaded": 13, "failed": 4, "skipped": 4 },
  "thresholds": { /* the §3 numbers, so the manifest is self-describing */ },
  "setClass":  { "set": "B", "confidence": "high", "evidence": {...}, "reason": "…" },
  "heroShortlist": [ /* top 8, ranked */ ],
  "business": { "name": "…", "types": [...], "telephone": [...], "lang": "bs", … },
  "provenanceReminder": "…",
  "assets": [ {
    "file": "dc6f8091-5a1571ab76d9f2.76895138.jpg",
    "path": "…/raw/dc6f8091-….jpg",
    "sourceUrl":  "http://www.kovgrad.ba//files/news/5a1571ab76d9f2.76895138.jpg",
    "requestedUrl": "…", "proxyUrl": null, "sourcePage": "https://kovgrad.ba/",
    "foundVia": ["img:src"], "fetchedVia": "fetch",
    "attempts": [ { "via": "fetch", "status": 200, "reason": "ok" } ],
    "signed": false, "expiresAt": null,
    "sha256": "dc6f8091811a1d2f8dbb0ca3759d117bed143f8138dbfac0dcddded16db38d87",
    "kind": "image",
    "alt": "",                 // ← YOU author this. Never the filename. See below.
    "altSourceHint": "",       // the client's own alt, if they wrote one — a hint, not the answer
    "consent": "unknown",      // identifiable people? confirm or crop before any face reaches a hero
    "photographer": "unknown", // client | hired | unknown
    "probe": {
      "bytes": 170758, "format": "jpeg", "width": 1400, "height": 1050,
      "longEdge": 1400, "aspect": 1.333, "orientation": "landscape", "hasAlpha": false,
      "meanLuminance": 0.472,
      "edgeCentre": 25.97, "edgeBorder": 18.22, "subjectScore": 1.39,
      "dominant": "#383838", "probeError": null
    },
    "classification": { "role": "gallery", "flags": [], "score": 55.8, "heroGrade": false }
  } ],
  "failures": [ { "url": "…", "page": "…", "reason": "…", "expiresAt": null } ],
  "skipped":  [ { "url": "…", "reason": "below --min-bytes (1204 < 3000)" } ]
}
```

Filenames are **content-addressed** — `<sha256[0:8]>-<slug-of-basename>.<ext>` — so re-running
on the same client rewrites the same files instead of accumulating `001-`/`002-` copies of
identical bytes. De-duplication is by content hash, not URL, so the same photo served from four
paths lands once with the other three recorded as `aliasUrls`.

**Three fields the script deliberately leaves for you:**

- **`alt`** — authored from the trade and the subject, never from the filename, never "image1".
  Pattern: `<what is happening> — <where>, <grad>`. `alt="Zamjena alternatora na Golfu 7 u
  radionici — Gradačac"`. Decorative gallery tiles that repeat information already in text take
  `alt=""`. This is the only accessibility field the harvest can't guess and the one most often
  skipped.
- **`consent`** — `confirmed | cropped | unknown`. **"The client's own photos have no licence
  question" is false.** Salon, gym, restaurant and clinic photos contain identifiable third
  parties; R3 before/after is literally faces; dental and medical results are health data.
  `unknown` means crop to the detail — hair, teeth, nails, the work — never the face.
- **`photographer`** — `client | hired | unknown`. Small businesses routinely hand over photos a
  hired photographer owns, or images they lifted from the web. Ask. Do not assume.

### 2.8 Real run — a small Bosnian manufacturer, `kovgrad.ba`

Verbatim, 2026-08-02. This is the realistic case: an old template site, thin static HTML, dead
theme assets, photos that top out at 1400px.

```console
$ node .claude/skills/premium-web/scripts/harvest.mjs https://kovgrad.ba/ --slug kovgrad --max 25
harvest → /…/work/kovgrad/harvest
sharp not found — installing into /…/work/tools (build-time only, never a client dependency)
sharp ok (libvips 8.18.3)

page https://kovgrad.ba/
  html 14.8KB via fetch → 12 candidate(s)
  css bootstrap.min.css → +1
  css style.css → +1
  css jquery.fancybox.css → +6
  css owl.carousel.css → +1

downloading 21 asset(s)
  ok   40a48311-logo.png                                    223×26          3.5KB  logo
  ok   56208aa5-social_index.jpg                            1332×614       87.6KB  gallery
  ok   21310359-favicon_new1.ico                            64×64           3.2KB  reject
  ok   11b7df38-57e668375079a2.49581000.jpg                 1400×703      155.6KB  gallery
  ok   52e5346b-5e4e92c31c4444.09073961.jpg                 1400×851      104.4KB  gallery
  ok   09ead6c0-640f2cbbbb27f9.38072903.jpg                 1400×630      156.1KB  gallery
  ok   ae3f074e-57e66fba62a317.92484089.jpg                 1400×850      147.5KB  gallery
  ok   18422b17-5e4cebc13411f1.81519470.jpg                 1400×787      106.0KB  gallery
  ok   269a5596-57e81919da7174.50366175_image2.jpg          319×480        21.6KB  support
  ok   dc6f8091-5a1571ab76d9f2.76895138.jpg                 1400×1050     166.8KB  gallery
  ok   42f60659-glyphicons-halflings-regular.svg            unprobed      106.2KB  reject
  fail http://www.kovgrad.ba/images/fancybox_loading.gif
       fetch:HTTP 404 | curl --http1.1:HTTP 404 (curl --http1.1)
  fail http://www.kovgrad.ba/images/fancybox_loading@2x.gif
       fetch:HTTP 404 | curl --http1.1:HTTP 404 (curl --http1.1)
  fail http://www.kovgrad.ba/images/fancybox_sprite@2x.png
       fetch:HTTP 404 | curl --http1.1:HTTP 404 (curl --http1.1)
  ok   0b0d8869-5e4e9ed8915866.70120408_fb_img_1576789861639.jpg 1080×657       50.4KB  support via curl --http1.1
  ok   079085c3-581062ce9b9859.58437478.jpg                 1400×684       94.4KB  gallery via curl --http1.1
  fail http://www.kovgrad.ba/css/owl.video.play.png
       fetch:HTTP 404 | curl --http1.1:HTTP 404 (curl --http1.1)

══════════════════════════════════════════════════════════════════════════════
requested 21 / downloaded 13 / failed 4 (+4 skipped: too small or over the size cap)
══════════════════════════════════════════════════════════════════════════════
  raw/            13 file(s), 1.18 MB
  manifest.json   /…/work/kovgrad/harvest/manifest.json
  FAILED.md       /…/work/kovgrad/harvest/FAILED.md — 4 copy-paste curl block(s) for the user

suggested SET class: SET-B  (confidence: high)
  8 usable stills ≥1200px — R4 cross-dissolve scrub.
  hero-grade 0 · usable 8 · logo/vector 1 · video 0

hero shortlist (rank · file · dims · subjectScore · luma · dominant)
   1. dc6f8091-5a1571ab76d9f2.76895138.jpg           1400×1050   s=1.39  L=0.472 #383838 under threshold
   2. 52e5346b-5e4e92c31c4444.09073961.jpg           1400×851    s=1.38  L=0.208 #080808 under threshold
   3. ae3f074e-57e66fba62a317.92484089.jpg           1400×850    s=1.28  L=0.412 #080808 under threshold
   4. 18422b17-5e4cebc13411f1.81519470.jpg           1400×787    s=1.27  L=0.566 #d8d8d8 under threshold
   5. 0b0d8869-5e4e9ed8915866.70120408_fb_img_1576789861639.jpg 1080×657    s=1.41  L=0.209 #080808 under threshold
   6. 11b7df38-57e668375079a2.49581000.jpg           1400×703    s=1.03  L=0.484 #a89888 under threshold
   7. 079085c3-581062ce9b9859.58437478.jpg           1400×684    s=1.01  L=0.383 #a8a8a8 under threshold
   8. 09ead6c0-640f2cbbbb27f9.38072903.jpg           1400×630    s=1.67  L=0.509 #b8c8d8 under threshold

  3 image(s) are under 1200px on the long edge. They will NOT survive a
  full-bleed hero. Use them small or not at all — never upscale.

client facts lifted from the page (feed these into step 1 instead of asking)
  name       KOV-GRAD d.o.o.
  language   bs
```

Read that output the way you should read every harvest:

- **Two assets were recovered by rung 4 of the ladder** (`via curl --http1.1`) after plain
  `fetch` failed. Without the ladder this run is 11/21, not 13/21.
- **Four genuine failures**, all 404 — dead fancybox/owl-carousel theme assets referenced by a
  stylesheet the site no longer ships. `FAILED.md` exists and is correct, and the right response
  here is to ignore it: nothing of the client's is missing.
- **Zero hero-grade stills.** Every photo is 1400px, below the 1600px bar. That is not a bug in
  the threshold, it is the truth about this client. The build uses these as a gallery scrub (R4)
  and either crops to detail for the hero or asks for originals. **Do not upscale.**
- `logo.png` at 223×26 is classified `logo`, not `reject` — that is what keeps SET-G reachable
  if the photography turns out unusable.
- `glyphicons-halflings-regular.svg` is `reject`: an icon webfont, not content.
- `name` and `lang=bs` came free. Nobody had to ask the user.

### 2.9 Real run — a large modern site, `dishoom.com`

Same script, opposite end of the spectrum: a Next.js site behind an image proxy with a
Sanity CDN behind that.

```console
$ node .claude/skills/premium-web/scripts/harvest.mjs https://www.dishoom.com/ --slug dishoom --max 20
page https://www.dishoom.com/
  html 1025.6KB via fetch → 53 candidate(s)
  css b841b2e127fa040d.css → +49
  css 395b56ce00c0630d.css → +1
  css 702700120dcd45dc.css → +1
  css axn5fbj.css → +126
230 candidates found; downloading the first 20 (raise with --max)

downloading 20 asset(s) (of 230 found)
  ok   9b243d7b-53b1eaaf1ecdb2b5f2c68047ed6bf51e7d28cd60-120.avif 1200×627      111.3KB  gallery
  ok   1b3d7bae-cd69aa62d11d3e8bae5cf0fe422830403a5e2df8-223.avif 2238×1488      44.5KB  gallery
  ok   52e5c7ea-ae598090a635b979803cf2d8642675110b333672-256.avif 2560×1440     112.9KB  gallery
  ok   187f1427-76ee046c5646bade048fce8b89fd18714dc08a9e-120.avif 1200×840      139.0KB  gallery
  ok   ba018ba7-a203b86230a7be7e4ec896d428d1f41fbb6aa599-256.avif 2560×1440     205.4KB  hero-candidate
  ok   819aa46c-3c48c887b9566ede285b275ef220b5cc8d94e132-256.avif 2560×1440     543.9KB  hero-candidate
  ok   d994a47d-02890b29ee51048ce3cae85a683e1a0cfec2fb0f-256.avif 2560×1918     539.1KB  hero-candidate
  ok   ca738dec-5c5721369e9df1a31ee20ca4b364aaecc2075475-160.avif 1600×1600     171.0KB  hero-candidate
  ok   4f9d6e43-f6ec5aed6854d9380b8162ae68cf1f5f0ca314ce-204.avif 2048×1365     280.5KB  gallery
  ok   f5abf0c9-44d846b117b2828542395b0bcf57f4f46618fc19-256.avif 2560×1440     120.5KB  hero-candidate
  ok   0b2f1124-0526_bbq_box_kit_lamb_and_chicken_007.webp  1823×1823     665.8KB  gallery
  ok   3d096b4c-hero-all-welcome.svg                        110×20          6.1KB  logo
  ok   67075a22-0526_bbq_box_kit_paneer_tikka_and_soya_chaap.webp 1851×1851     523.9KB  hero-candidate
  ok   62677e86-166e84c9df8561f3fbdb238eff2d7213220baca8-120.avif 1200×1600      53.7KB  gallery
  ok   2333917a-42163a6aeb9af4ea764220d37b3fcf7a5f428eac-170.avif 1706×2560     194.8KB  gallery
  ok   3f01d1fe-5f162a99fb6196d65263d7f9460fa70096cab6b2-652.avif 6529×4353     673.0KB  hero-candidate

══════════════════════════════════════════════════════════════════════════════
requested 230 / downloaded 16 / failed 0 (+4 skipped: too small or over the size cap)
══════════════════════════════════════════════════════════════════════════════
  raw/            16 file(s), 4.28 MB

suggested SET class: SET-B  (confidence: high)
  15 usable stills ≥1200px — R4 cross-dissolve scrub.
  hero-grade 7 · usable 15 · logo/vector 1 · video 0

hero shortlist (rank · file · dims · subjectScore · luma · dominant)
   1. 819aa46c-…-256.avif  2560×1440   s=1.94  L=0.588 #e8d8d8 HERO-GRADE
   2. f5abf0c9-…-256.avif  2560×1440   s=1.57  L=0.44  #180808 HERO-GRADE
   3. d994a47d-…-256.avif  2560×1918   s=1.2   L=0.419 #181818 HERO-GRADE
   4. 3f01d1fe-…-652.avif  6529×4353   s=1.2   L=0.617 #e8e8e8 HERO-GRADE
   5. 1b3d7bae-…-223.avif  2238×1488   s=1.64  L=0.194 #081828 under threshold
   6. ba018ba7-…-256.avif  2560×1440   s=1.21  L=0.494 #f8e8e8 HERO-GRADE
   7. 52e5c7ea-…-256.avif  2560×1440   s=1.04  L=0.536 #181818 under threshold
   8. 2333917a-…-170.avif  1706×2560   s=1.06  L=0.485 #080808 under threshold

client facts lifted from the page (feed these into step 1 instead of asking)
  name       Dishoom Indian Restaurants
  schema     Organization, Restaurant, PostalAddress, GeoCoordinates, OpeningHoursSpecification, Menu
  telephone  020 7420 9325, 0113 517 1712, 0141 611 4411, … (12 numbers)
  language   en
  sameAs     https://www.instagram.com/dishoom/, https://uk.linkedin.com/company/dishoom, …
```

**0 failures out of 16, and the 6529×4353 original** — that image is served to browsers as a
3840px proxy render; the pipeline unwrapped `/_next/image?url=` and took the untouched source.
Before the entity-decode fix this same run was **2 downloaded / 14 failed**, all `HTTP 400`.

### 2.10 `FAILED.md`

Written whenever `failed > 0`, deleted when a re-run succeeds. Per dead URL: where it was found,
which extraction rule surfaced it, the last error from the full ladder, the signature expiry if
it is a signed social URL, and a ready-to-run block:

```bash
curl -L --http1.1 --compressed \
  -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36" \
  -e "https://kovgrad.ba/" \
  -H "Accept: image/avif,image/webp,image/apng,image/*,*/*;q=0.8" \
  -o "/…/work/kovgrad/harvest/raw/fancybox_loading.gif" \
  "http://www.kovgrad.ba/images/fancybox_loading.gif"
```

These frequently succeed from a machine with a normal browser session even when they fail from
here. Files land straight in `raw/`; re-run `harvest.mjs` with the same `--slug` and the manifest
and SET class are recomputed from what actually exists on disk.

### 2.11 Harvest gate

```
[ ] accounting line read out loud: requested N / downloaded M / failed K
[ ] M > 0, or the SET-F downgrade banner has been acted on — not ignored
[ ] FAILED.md triaged: is anything in it actually the client's, or is it all dead theme chrome?
[ ] at least one image ≥1200px long edge in the manifest, from a probe of real bytes on disk
[ ] any signed social URL was fetched in the same session it was pasted
[ ] work/ is gitignored; the raw originals are namespaced under work/<slug>/
```

---

## §3 Triage — the SET class, with numbers

The SET class decides the recipe. It is assigned from measurements, never from a glance.
`harvest.mjs` **suggests** a class and writes the evidence; step 4 confirms it by opening the
top shortlist files with `Read`. **Triage never silently upgrades a class.**

### 3.1 The thresholds

Every number below is in the script as the `T` table and is copied into `manifest.thresholds`,
so a manifest is self-describing.

| Constant | Value | Meaning |
|---|---|---|
| `HERO_LONG_EDGE` | **1600 px** | below this an image cannot carry a full-bleed hero |
| `USABLE_LONG_EDGE` | **1200 px** | below this it is a gallery tile or a support image, never full-bleed |
| `REJECT_LONG_EDGE` | **320 px** | below this it is chrome, not content |
| `HERO_MIN_BYTES` | **60 000 B** | a 2000px file at 12 KB has been through WhatsApp; it will band on a hero |
| `HERO_MIN_SUBJECT` | **1.15** | subject-isolation score — see §3.2 |
| `HERO_LUMA_MIN` / `MAX` | **0.06 / 0.94** | outside this it is a blown-out or crushed frame, or a solid colour |
| `HERO_ASPECT_MIN` / `MAX` | **0.55 / 2.80** | outside this no crop survives both 375px and 1440px |
| `LOGO_MAX_LONG_EDGE` | **900 px** | at or below this **with alpha**, treat as a mark, not a photo |
| `GALLERY_MIN` | **6** | usable stills needed for a cross-dissolve scrub to read as motion |
| `SEQUENCE_MIN` | **12** | numbered stills in one directory needed before it may be a registered sequence |
| sequence density | **≥ 0.60** | `count ÷ (max−min+1)` — guards against 12 files numbered 1, 40, 91… |

An asset is **hero-grade** only when *all* of these hold:

```
longEdge ≥ 1600  AND  bytes ≥ 60000  AND  subjectScore ≥ 1.15
AND 0.06 < meanLuminance < 0.94
AND 0.55 ≤ aspect ≤ 2.80
AND NOT flagged logo-hint  AND NOT flagged sprite-hint
```

### 3.2 `subjectScore` — the subject-isolation metric

Computed on a 128×128 greyscale downsample, alpha flattened onto white:

```
edge magnitude at (x,y) = ( |p[x+1,y] − p[x−1,y]| + |p[x,y+1] − p[x,y−1]| ) / 2

edgeCentre  = mean magnitude inside the central 60% of each axis (0.2 … 0.8)
edgeBorder  = mean magnitude in the outer 20% ring (the complement)
subjectScore = edgeCentre ÷ (edgeBorder + 0.5)
```

It is a cheap proxy for *"is there one clean subject here?"*, not an aesthetic judgement:

| `subjectScore` | Reading | Use |
|---|---|---|
| **≥ 1.60** | one isolated subject on a calm background | cutout (R1), hotspots (R5), hero |
| **1.15 – 1.59** | a real scene with a clear focal area | usable full-bleed |
| **0.80 – 1.14** | busy edge to edge | gallery tile, not a hero |
| **< 0.80** | detail lives at the edges | screenshot, collage, text block, pattern — reject |

Verified against the actual pixels: `kovgrad.ba` asset `dc6f8091…` scored **1.39**
(`edgeCentre 25.97`, `edgeBorder 18.22`) and is a single centred pallet of product on plain
concrete — exactly what the band predicts.

`meanLuminance` and `dominant` come from the same pass. `dominant` is what step 5 uses to derive
the palette from the client's real workshop rather than a stock hex; the full colour method is
`brand-identity.md` §2.

### 3.3 Roles

Each asset is assigned exactly one role:

| Role | Assigned when |
|---|---|
| `hero-candidate` | all hero-grade conditions hold |
| `gallery` | `longEdge ≥ 1200`, not a logo, not rejected |
| `support` | `320 ≤ longEdge < 1200` — usable small, never full-bleed |
| `logo` | vector, **or** filename/alt matches `logo\|lockup\|wordmark\|favicon\|apple-touch\|…`, **or** `longEdge ≤ 900` with alpha |
| `video` | `kind === 'video'` |
| `reject` | `longEdge < 320`, or a sprite/icon-font/loader/tracking-pixel name, or a screenshot/placeholder name |

Flags recorded alongside: `vector`, `logo-hint`, `sprite-hint`, `screenshot-hint`, `too-small`,
`small+alpha`, `under-1200`, `before`, `after`.

### 3.4 Decision order → SET class

Evaluated top to bottom; the first match wins.

| # | Test | SET | Route |
|---|---|---|---|
| 0 | **`downloaded == 0`** | **F (forced)** | banner, exit 3. Nothing may be classified from metadata never fetched. |
| 1 | any `role: video` | **E** | R7 frame extraction → then R2 or R4 |
| 2 | ≥1 matched before/after pair, **or** ≥1 `before` flag and ≥1 `after` flag | **D** | R3 clip-path / translate wipe — highest-converting recipe in the skill |
| 3 | ≥`SEQUENCE_MIN` numbered stills in one directory at density ≥0.60 | **C** | R2 assembly sequence |
| 4 | ≥`GALLERY_MIN` usable stills (≥1200px, not logos) | **B** | R4 cross-dissolve scrub |
| 5 | ≥1 hero-grade still | **A** | R1 parallax / R5 hotspots / R6 over the photo |
| 6 | ≥1 usable still but none hero-grade | **A (low confidence)** | R1/R5 at reduced scale, or crop to detail. **Never upscale.** |
| 7 | 0 usable stills, ≥1 logo or vector | **G** | `industry-playbooks.md` §14 — full path. **Do not route to F.** |
| 8 | otherwise | **F** | R9 kinetic type + R6 over `assets/trade-paths/<row>.svg` |

Pair matching: filenames are normalised by stripping the extension and replacing the
before/after token — `before|prije|pre|prie|ranije` and `after|poslije|posle|nakon` — with a
separator, then compared. `IMG_204-prije.jpg` ↔ `IMG_204-poslije.jpg` matches;
`premium-shot.jpg` does not, because the token must be delimited.

### 3.5 The four things triage must not do

1. **Never upgrade a class on hope.** A folder of screenshots and logos is **SET-G**, not SET-B.
   A 640×480 Facebook JPEG is not SET-A. If the numbers say the client has nothing hero-grade,
   the honest recipe is the one the numbers permit.
2. **Never upscale.** No amount of sharp/lanczos rescues a 640px source in a full-bleed hero;
   it just makes the softness expensive. Use it small, crop to detail, or leave it out.
3. **Never classify from the manifest alone.** Open the top three or four shortlist files with
   `Read` and look at them. `subjectScore` cannot tell you the photo is of the owner's dog.
4. **Never let SET-F be an apology.** SET-F has a real build: R9 kinetic type plus R6
   stroke-drawing a shipped trade path, palette from a user-named set. Say plainly *"ovo je
   tipografski sajt, bez fotografija"* rather than reaching for stock.

### 3.6 Write `triage.md`

```md
# Triage — <client>

SET class: **B** (confidence high)
Evidence: downloaded 13 / hero-grade 0 / usable 8 / logo 1 / video 0 / sequences 0 / pairs 0

Hero carried by: dc6f8091-… (1400×1050, s=1.39, L=0.472) — CROPPED TO DETAIL, source is
below the 1600px hero bar and will not survive full-bleed.

Recipe: R4 cross-dissolve scrub, 8 frames.
Rejected: R2 (no registered sequence), R3 (no pairs), R1 (no cutout-grade subject).

consent: unknown → no faces in the hero, product and workshop only
photographer: unknown → asked the client, awaiting answer

Assets excluded and why:
  42f60659-glyphicons-…svg   icon webfont, not content
  21310359-favicon_new1.ico  chrome
  269a5596-…_image2.jpg      319×480, support only
```

The **rejection reasons matter as much as the choice** — they are what stops a later agent from
stacking a second and third effect onto a page that only needed one.

---

## §4 Cutout — rembg

Needed by R1 (parallax subject), R2 (framing registration from alpha masks), and any product
that should float over a gradient instead of its original messy background.

### 4.1 Install and models

```bash
pip install "rembg[cpu,cli]"      # needs Python ≥3.11
```

Verified present here: **rembg 2.0.77**, Python **3.11.15**. The model auto-downloads once and
then runs fully offline with no quota:

```console
$ ls -la ~/.u2net/
-rw-------  1 root root 4574861 …  u2netp.onnx
```

| Model | Licence | Use |
|---|---|---|
| `u2netp` | **Apache-2.0** | the default. 4,574,861 bytes. Fast, good on solid subjects. |
| `birefnet-general-lite` | **MIT** | the quality step up — hair, glass, fine edges |
| `bria-rmbg` | **NON-COMMERCIAL** | **never.** BRIA's own model card restricts it, and this is a paying client's site. rembg bundles it; that is not permission. |

### 4.2 Measured

```console
$ time rembg i -m u2netp work/<slug>/cut-in.png work/<slug>/cut-out.png
real    0m4.8s     # first call, includes ONNX session init
real    0m4.3s     # steady state, 1280×720
```

```console
$ node -e "…sharp('cut-out.png').metadata()"
cutout png 1280x720 alpha: true
```

Alpha survives the compression step — WebP carries alpha at a fraction of PNG's bytes:

```console
png 320,741 → webp {quality:80, alphaQuality:90, effort:4} = 65,724 bytes (20%)
```

### 4.3 Batch

```bash
for f in work/<slug>/harvest/raw/*.jpg; do
  rembg i -m u2netp "$f" "work/<slug>/cut/$(basename "${f%.*}").png"
done
```

`rembg p <indir> <outdir>` also works and reuses one session, which is faster for large sets —
but it silently skips files it cannot decode, so count the outputs against the inputs.

### 4.4 Cutout gate

```
[ ] model is u2netp or birefnet-general-lite — bria-rmbg output is not in the build
[ ] the alpha edge was inspected with Read at full size, not judged from a thumbnail
[ ] cutouts are stored as WebP with alpha, not PNG, in the shipped tree
```

---

## §5 Frames — from video and from stills

### 5.1 From client video (R7)

```bash
FF="$(node -p "require('$PWD/work/tools/node_modules/ffmpeg-static')")"
mkdir -p work/<slug>/frames

"$FF" -y -i work/<slug>/raw/clip.mp4 \
      -vf "fps=24,scale=1280:-2" \
      work/<slug>/frames/frame_%04d.png
```

Measured on a 4 s 1920×1080 30 fps source:

```console
frame=   96 fps= 81 q=-0.0 Lsize=N/A time=00:00:04.00 bitrate=N/A speed=3.39x
$ ls work/<slug>/frames | wc -l
96
$ du -sh work/<slug>/frames
19M
```

**Four things that are not optional:**

- **`%04d`, not `%02d` or `%03d`.** The Apple reference this skill benchmarks against is 147
  frames; two-digit padding breaks its own example. Four digits costs nothing and never
  overflows.
- **Extract to PNG.** Never to `.webp` — see §5.2.
- **24 fps is right for scroll.** A shipped production build moved 60 → 30 because 60 fps
  performance was "horrendous"; scroll scrubbing does not need more than 24.
- **Trim first.** A 60-frame arc of the two most legible seconds beats a 300-frame one nobody
  scrolls through. Add `-ss 00:00:03 -t 00:00:04` before `-i`.

### 5.2 The `.webp` trap — verified

Writing a sequence straight to `.webp` produces **one animated file**, not N stills, and the
failure is silent:

```console
$ "$FF" -y -i vt/src.mp4 -vf "fps=24,scale=1280:-2" vt/webp/frame_%04d.webp
        encoder         : Lavc61.3.100 libwebp_anim
frame=    1 fps=0.1 q=-0.0 Lsize=N/A time=00:00:04.00 speed=0.497x

$ ls -la vt/webp
-rw-r--r-- 1 root root 2010500 …  frame_0001.webp        ← ONE file, 96 frames inside it
```

Compare with the PNG run above: **96 files**. The encoder line (`libwebp_anim`) is the only
warning you get. Extract to PNG, then batch-convert with sharp.

### 5.3 From stills (R2 / R4)

Rename first so lexical sort equals narrative order — `01-eksterijer.jpg`, `02-ulaz.jpg`,
`03-dnevni.jpg`. The narrative order is trade-specific and lives in `industry-playbooks.md`.

```js
// normalise.mjs — one common aspect, cover-crop, never squash.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const sharp = createRequire(process.cwd() + '/work/tools/x.cjs')('sharp');

const [SRC, OUT, W = 1280, H = 720] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const files = fs.readdirSync(SRC).filter(f => /\.(jpe?g|png|webp|avif)$/i.test(f)).sort();
for (const [i, f] of files.entries()) {
  await sharp(path.join(SRC, f))
    .resize(+W, +H, { fit: 'cover', position: 'attention' })   // 'attention' keeps the subject
    .toFile(path.join(OUT, `frame-${String(i).padStart(4, '0')}.png`));
}
console.log(`normalised ${files.length} stills → ${OUT}`);
```

For **R2** the frames must stay *registered* — the subject cannot jump between frames. Compute
one common bounding box from the rembg alpha masks and crop every still to it, rather than
letting `position: 'attention'` pick a different centre per image.

For **R3** the pair must be identical in crop box, output dimensions and exposure. Mismatched
framing is the only way that recipe fails. Assert it:

```bash
node -e "
const sharp=require('module').createRequire(process.cwd()+'/work/tools/x.cjs')('sharp');
Promise.all(['prije.jpg','poslije.jpg'].map(f=>sharp('work/<slug>/pair/'+f).metadata()))
 .then(([a,b])=>{
   const ok = a.width===b.width && a.height===b.height;
   console.log(a.width+'x'+a.height, b.width+'x'+b.height, ok?'OK':'MISMATCH — the wipe will shear');
   if(!ok) process.exit(1);
 });"
```

### 5.4 Frame count comes from the scroll distance

Never pick a frame count first.

```
frames per 100vh = frames ÷ (section_vh × scrub_range ÷ 100)
```

Under ~6 frames/100vh a sequence reads as stepping. Over ~35 you are paying for frames nobody
perceives. The per-row section heights and scrub ranges are in `industry-playbooks.md` §0.4 —
they are the row, not a default.

The commonly-quoted "20–40 frames per 100vh" and "60–180 frames" figures are **uncited
heuristics**. Validate against the measured Apple reference instead: **147 frames at 1158×770,
~42.5 KB average, ~6.2 MB total** — restrained in *resolution*, not in payload.

---

## §6 Compress — the two ladders, the poster, the social card

One pass produces everything: desktop ladder, mobile ladder, the LCP poster, and the 1200×630
social card. Build them together or the social card gets forgotten and every WhatsApp/Viber
share of the finished site renders blank.

```js
// compress.mjs — node compress.mjs work/<slug>/frames work/<slug>/public/anim
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const sharp = createRequire(process.cwd() + '/work/tools/x.cjs')('sharp');

const [SRC, OUT] = process.argv.slice(2);
const LADDERS = [
  { name: 'desktop', w: 1280, h: 720, cap: 4.0 * 1024 * 1024 },
  { name: 'mobile',  w:  960, h: 540, cap: 1.5 * 1024 * 1024 },
];
const files = fs.readdirSync(SRC).filter(f => /\.png$/i.test(f)).sort();
if (!files.length) { console.error(`no PNG frames in ${SRC}`); process.exit(1); }

for (const L of LADDERS) {
  const dir = path.join(OUT, L.name);
  fs.mkdirSync(dir, { recursive: true });
  let total = 0;
  for (const [i, f] of files.entries()) {
    const info = await sharp(path.join(SRC, f))
      .resize(L.w, L.h, { fit: 'cover' })
      .webp({ quality: 72, effort: 4 })
      .toFile(path.join(dir, `frame-${String(i).padStart(4, '0')}.webp`));
    total += info.size;
  }
  const decoded = L.w * L.h * 4 * files.length;
  const ok = total <= L.cap;
  console.log(
    `${ok ? 'OK ' : 'OVER'} ${L.name.padEnd(8)} ${String(files.length).padStart(3)} frames ` +
    `${(total / 1024).toFixed(0).padStart(6)} KB ` +
    `(${(total / files.length / 1024).toFixed(1)} KB/frame, cap ${(L.cap / 1048576).toFixed(1)} MB) ` +
    `decoded ${(decoded / 1048576).toFixed(0)} MB${decoded > 250 * 1048576 ? '  ← SLIDING WINDOW REQUIRED' : ''}`
  );
  if (!ok) process.exitCode = 1;
}

// Poster = frame 0 as a real JPEG (an LCP candidate; <canvas> is not), plus the social card.
const first = path.join(SRC, files[0]);
fs.mkdirSync(OUT, { recursive: true });
const poster = await sharp(first).resize(1280, 720, { fit: 'cover' })
  .jpeg({ quality: 74, mozjpeg: true, progressive: true }).toFile(path.join(OUT, 'poster.jpg'));
const og = await sharp(first).resize(1200, 630, { fit: 'cover', position: 'attention' })
  .jpeg({ quality: 80, mozjpeg: true }).toFile(path.join(OUT, 'og-1200x630.jpg'));
console.log(`poster.jpg      ${poster.width}x${poster.height}  ${poster.size} bytes`);
console.log(`og-1200x630.jpg ${og.width}x${og.height}  ${og.size} bytes`);
```

Measured, 96 frames from the §5.1 extraction:

```console
$ node compress.mjs work/<slug>/frames work/<slug>/public/anim
OK  desktop   96 frames   2053 KB (21.4 KB/frame, cap 4.0 MB) decoded 338 MB  ← SLIDING WINDOW REQUIRED
OK  mobile    96 frames   1194 KB (12.4 KB/frame, cap 1.5 MB) decoded 190 MB
poster.jpg      1280x720  29049 bytes
og-1200x630.jpg 1200x630  30507 bytes

$ du -sh work/<slug>/public/anim/desktop work/<slug>/public/anim/mobile
2.3M    .../desktop
1.4M    .../mobile
```

Source was 18,237 KB of PNG → 2,053 KB desktop WebP: **11% of the intermediate**.

### 6.1 Format decision rule

| Situation | Format |
|---|---|
| Bandwidth-bound (mobile ladder, long sequence over a slow link) | **AVIF** or **WebP** |
| Decode-bound (long sequences, low-end Android, many frames per second of scroll) | **JPEG** (mozjpeg) — AVIF q50 ≈ JPEG q75 at ~half the bytes but materially higher per-frame *decode* cost |
| Alpha required (cutouts, R1 subject layer) | **WebP** or **AVIF** — mandatory, JPEG has no alpha |
| A sequence | **never PNG** |
| The LCP poster | **JPEG**, progressive, mozjpeg — universally decodable and an LCP candidate |
| The social card | **JPEG** at 1200×630 — some scrapers still refuse WebP |

### 6.2 The poster is not optional and is not a canvas

`<canvas>` is **not** an LCP candidate. The spec list is exactly `<img>`, `<image>` in `<svg>`,
`<video>`, `url()` background-image, and block-level elements containing text. Ship frame 0 as a
real image:

```html
<img src="/anim/poster.jpg" width="1280" height="720"
     fetchpriority="high" loading="eager" decoding="async" alt="…">
```

And in a client-rendered SPA, that `<img>` cannot paint until the bundle downloads, parses and
mounts — so `index.html` **also** needs:

```html
<link rel="preload" as="image" href="/anim/poster.jpg" fetchpriority="high">
```

Editing only the React component does nothing. Full rationale and the CLS rules are in
`scroll-effects.md`; the markup for `og:image` is in `i18n-seo.md` §4.

---

## §7 Budgets — disk, decoded memory, first viewport

Three budgets, all of which must pass. Two of them are invisible in any network panel.

### 7.1 On disk

| Ladder | Cap |
|---|---|
| desktop sequence | **≤ 4 MB** |
| mobile sequence | **≤ 1.5 MB** |

```bash
du -sh work/<slug>/public/anim/desktop work/<slug>/public/anim/mobile
```

### 7.2 First viewport — what must land *first*

"1.5 MB mobile" is meaningless without knowing the order. At 1.6 Mbps, 1.5 MB is 7.5 seconds.
Split it:

| Tier | Cap | Notes |
|---|---|---|
| poster | **≤ 80 KB** | measured above: 29 KB. Preloaded, `fetchpriority=high`. |
| keyframe subset (every Nth, 15–20 frames — enough to make the scrub usable) | **≤ 250 KB** | in-betweens snap to the nearest loaded frame |
| remainder | up to the 1.5 MB cap | `fetchpriority="low"` on `requestIdleCallback`, **after** load |
| total first-viewport transfer (HTML + critical CSS + JS + poster + 2 woff2) | **≤ 400 KB** | |
| JS for a single-page build | **≤ 120 KB gzip** | |

`navigator.connection.saveData === true` → **fetch no sequence at all.** Poster only. That is the
terminal tier, not an input to a heuristic.

Images created via `new Image()` are never in the document, never participate in layout, and
therefore **never receive Chrome's in-viewport priority boost** — they sit at Low priority
forever. That, not a vague bandwidth story, is why an all-at-once loader starves the hero.

### 7.3 Decoded memory — the one that kills iOS Safari tabs

```
decoded bytes = width × height × 4 × frames
```

File size on disk tells you nothing about this. Worked from the run above:

| Ladder | On disk | Decoded |
|---|---|---|
| desktop 1280×720 × 96 | 2,053 KB | **338 MB** |
| mobile 960×540 × 96 | 1,194 KB | **190 MB** |

Reference point from the existing repo: 60 frames at 1280×720 is **221 MB live from 3.9 MB on
disk**.

**Above ~250 MB the sliding decoded-frame window is mandatory, not optional.** Specification —
window = current ±12 frames, evict beyond ±20, and **pin the every-Nth keyframe subset
permanently, never evict it**, so any scrub position always has something within N frames to
draw. Call `ImageBitmap.close()` on eviction. Wrap `createImageBitmap` in try/catch with a
fallback to a plain `HTMLImageElement` and a console warning — Safari has historically thrown on
certain sources. Backward scrub past the evicted edge must draw the nearest pinned keyframe,
never nothing.

Write the arithmetic into a comment in the component. If it is not written down it was not
computed.

### 7.4 Host limits

Cloudflare Pages: **20,000 files per site**, **25 MiB per file**, 500 builds/month, 1 concurrent
build. A 300-frame sequence at two resolutions is 600 files — fine; a 300-frame sequence at two
resolutions across four language variants is 2,400 — still fine, but start counting.

```bash
find dist -type f | wc -l                                  # < 20000
find dist -type f -size +25M -printf '%s\t%p\n' | sort -rn  # must be empty
```

### 7.5 Budget gate

```
[ ] du -sh recorded for both ladders, both under cap
[ ] poster ≤ 80 KB, keyframe subset ≤ 250 KB, both measured not estimated
[ ] W×H×4×frames written down for both ladders
[ ] > 250 MB ⇒ sliding window active with pinned keyframes and ImageBitmap.close()
[ ] og-1200x630.jpg exists and is referenced in <head>
[ ] poster preload present in index.html, not only in the component
[ ] dist file count < 20000, no file > 25 MiB
[ ] three frames opened with Read: not black, not duplicated, not mis-cropped
```

---

## §8 The video-scrub alternative, and why it usually loses

Scrubbing `video.currentTime` looks like it should save bytes. It rarely does.

- Seeking must find the preceding keyframe, so scrub granularity is GOP-bound.
- The real cross-browser fix is **not** a denser GOP. Firefox is choppy with mp4 regardless of
  keyframe density and wants **WebM**; iOS Safari handles WebM poorly and wants **mp4**. So
  shipping video scrub means shipping *both containers*, which usually erases the size advantage
  over an image sequence.
- WebCodecs `VideoDecoder` is the genuine upgrade, but `VideoFrame` objects hold real GPU memory
  and **must** be `.close()`d. Treat it as a v2 optimisation, never a first build.

If you ship it anyway:

```bash
# webm (Firefox) — dense keyframes for seekability
"$FF" -y -i src.mp4 -vf "fps=24,scale=1280:-2" -c:v libvpx-vp9 -crf 34 -b:v 0 -g 12 \
      -an work/<slug>/public/anim/scrub.webm
# mp4 (Safari/iOS) — same, H.264
"$FF" -y -i src.mp4 -vf "fps=24,scale=1280:-2" -c:v libx264 -crf 24 -g 12 -pix_fmt yuv420p \
      -movflags +faststart -an work/<slug>/public/anim/scrub.mp4
```

`-an` because there is no audio in a scrubbed hero. If the build genuinely needs audio anywhere,
it is `preload="none"`, never autoplaying, with a visible pause control, and it counts against
the page weight budget.

---

## §9 The whole chain in one block

```bash
SLUG=kovgrad
SKILL=.claude/skills/premium-web

# 0 — preflight, once per project
mkdir -p work/tools && npm --prefix work/tools i --silent sharp ffmpeg-static
printf 'work/\n' >> .gitignore
FF="$(node -p "require('$PWD/work/tools/node_modules/ffmpeg-static')")"

# 1 — harvest the client's own content
node $SKILL/scripts/harvest.mjs https://kovgrad.ba/ --slug $SLUG --max 60
#    read the accounting line. read FAILED.md. re-run after dropping files into
#    work/$SLUG/harvest/raw/ if anything of the client's is missing.

# 2 — triage: open the top shortlist files, then write work/$SLUG/triage.md
#    (SET class + hero file + recipe + rejected alternatives + consent/photographer)

# 3 — cutout, only for R1/R2
rembg i -m u2netp work/$SLUG/harvest/raw/<hero>.jpg work/$SLUG/cut/subject.png

# 4a — frames from client video (SET-E)
mkdir -p work/$SLUG/frames
"$FF" -y -i work/$SLUG/harvest/raw/clip.mp4 -vf "fps=24,scale=1280:-2" \
      work/$SLUG/frames/frame_%04d.png

# 4b — or frames from stills (SET-B/C), in narrative order
node work/tools/normalise.mjs work/$SLUG/ordered work/$SLUG/frames 1280 720

# 5 — compress: two ladders + poster + social card, with the budget report
node work/tools/compress.mjs work/$SLUG/frames work/$SLUG/public/anim

# 6 — verify the budget by hand as well as by script
du -sh work/$SLUG/public/anim/desktop work/$SLUG/public/anim/mobile
find dist -type f | wc -l
find dist -type f -size +25M -printf '%s\t%p\n' | sort -rn
```

---

## §10 Failure playbook

| Symptom | Cause | Fix |
|---|---|---|
| `ffmpeg: libcaca.so.0: cannot open shared object file` | the system binary is broken here | `$FF` from `ffmpeg-static` — §1.1 |
| `ffprobe: not found` | `ffmpeg-static` ships `ffmpeg` only | `"$FF" -hide_banner -i file 2>&1 \| grep -E 'Duration\|Stream'` |
| Frame extraction produced **one** file | wrote a sequence to `.webp` | extract to `.png`, convert with sharp — §5.2 |
| `ERR_INVALID_URL` in `createWasm` | `@squoosh/cli` under Node 22 | uninstall it; use sharp — §1.2 |
| Most image URLs return **HTTP 400** | `&amp;` in `srcset`/`src` was not entity-decoded | §2.2 — already fixed in `harvest.mjs` |
| Images download but are smaller than the page shows | you fetched the resizing proxy, not the original | unwrap the `url=` parameter — §2.2 |
| Assets 403/503 while the page returns 200 | CDN bot filter | the ladder in §2.3; then `FAILED.md` |
| `requested N / downloaded 0` | nothing was obtained at all | **stop.** SET-F banner. Do not proceed as if assets exist — §2.4 |
| Signed `scontent`/`fbcdn` URL 403s | the signature expired | it is dead permanently; ask for the file — §2.5 |
| Harvest found <3 images on a real site | client-rendered page | `--browser` — §2.6 |
| Rendered harvest returns `net::ERR_CONNECTION_RESET` on everything | Chromium's stack is blocked behind the proxy | route through `ctx.request.fetch` — §1.3. Never disable TLS verification. |
| `sharp` not found | not installed in `work/tools` | the script installs it; or `npm --prefix work/tools i sharp` |
| Wipe shears between before/after | mismatched crop box or dimensions | the assertion in §5.3 |
| Sequence reads as stepping | too few frames for the scroll distance | recompute frames/100vh — §5.4. **Do not reflexively shorten the section**; that makes it worse. |
| Hero looks soft at full bleed | source below 1600px, or upscaled | crop to detail or ask for originals — §3.5 |
| iOS Safari reloads the tab mid-scroll | decoded memory | §7.3 — sliding window with pinned keyframes |
| WhatsApp share preview is blank | no `og:image` | `og-1200x630.jpg` in the §6 pass, markup in `i18n-seo.md` §4 |
| Re-running the harvest duplicated everything | you are not on a build with content-addressed filenames | re-run current `harvest.mjs`; names are `<sha8>-<name>.<ext>` |
| Harvest printed a few lines then stopped, `raw/` half-empty | you piped it to `head`, which closed the pipe and SIGPIPE'd node mid-download | redirect to a file and `tail` that, or use `--quiet` |

---

## §11 Verified command index

Everything below ran in this container on **2026-08-02** and produced the stated output.

| Command | Result |
|---|---|
| `ffmpeg -version` | fails — `libcaca.so.0: cannot open shared object file` |
| `npm --prefix work/tools i sharp ffmpeg-static` | 20 packages, ~4 s |
| `node -p "require('…/ffmpeg-static')" ; $FF -version` | `ffmpeg version 7.0.2-static … 2000-2024` |
| `$FF -hide_banner -i clip.mp4 2>&1 \| grep -E 'Duration\|Stream'` | `Duration: 00:00:04.00 … 1920x1080 … 30 fps` |
| `sharp.versions.vips` | `8.18.3` |
| sharp 2560×1440 → 1280×720 `webp {q:72,effort:4}` | 117,420 bytes |
| sharp 2560×1440 → 1280×720 `avif {q:50}` | 70,467 bytes |
| sharp 2560×1440 → 1280×720 `jpeg {q:78,mozjpeg}` | 130,452 bytes |
| `$FF -i src.mp4 -vf "fps=24,scale=1280:-2" frame_%04d.png` | 96 files, 19 MB |
| `$FF -i src.mp4 -vf "fps=24,scale=1280:-2" frame_%04d.webp` | **1 file**, 2,010,500 B, `libwebp_anim` |
| compress → desktop 1280×720 WebP q72, 96 frames | 2,053 KB (21.4 KB/frame), decoded 338 MB |
| compress → mobile 960×540 WebP q72, 96 frames | 1,194 KB (12.4 KB/frame), decoded 190 MB |
| poster `jpeg {q:74,mozjpeg,progressive}` 1280×720 | 29,049 bytes |
| social card `jpeg {q:80,mozjpeg}` 1200×630 | 30,507 bytes |
| `python3 --version` | `3.11.15` |
| `rembg` version | `2.0.77`, `~/.u2net/u2netp.onnx` = 4,574,861 B |
| `rembg i -m u2netp` 1280×720 | 4.8 s first call, 4.3 s cached |
| cutout PNG 320,741 → `webp {q:80,alphaQuality:90}` | 65,724 B (20%) |
| `harvest.mjs https://www.dishoom.com/ --slug dishoom --max 20` | requested 230 / downloaded 16 / failed 0 → SET-B, 7 hero-grade |
| `harvest.mjs https://kovgrad.ba/ --slug kovgrad --max 25` | requested 21 / downloaded 13 / failed 4 → SET-B, 0 hero-grade, `FAILED.md` written |
| `normalise.mjs` (§5.3) on 10 harvested stills | `normalised 10 stills → work/kovgrad/frames` |
| `compress.mjs` (§6) on those 10 frames | desktop 567 KB / mobile 382 KB / poster 64,821 B / og 63,116 B |
| R3 pair assertion (§5.3), matched pair | `1280x720 1280x720 OK`, exit 0 |
| R3 pair assertion, mismatched pair | `1280x720 960x540 MISMATCH — the wipe will shear`, exit 1 |
| SET-class detection, all seven exercised | A (usable-not-hero) · B (both live sites) · C (14 numbered stills, density 1.0) · D (`IMG_204-prije`/`-poslije`, 1 matched pair) · E (a dropped `.mp4`) · F (forced, `downloaded 0`, banner + exit 3) · G (logo-only drop-in) |
| `find dist -type f \| wc -l` / `-size +25M` | 22 files, none oversized |
| `potrace` CLI | **not installed** — use the pure-JS `potrace` npm package, `industry-playbooks.md` §14.3 |
| `@squoosh/cli` | **never install** — `ERR_INVALID_URL` on any real encode under Node 22 |

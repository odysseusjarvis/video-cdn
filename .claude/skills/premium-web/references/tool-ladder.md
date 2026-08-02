# The Tool Ladder

Every tool this skill can reach for, **from free to paid, in the order you climb them**, across the 14 stages of a build. This is the file the user asked for: *"what do I actually need, and what does it cost, to get to a site like that?"*

The answer, stated once and honestly: **the entire ladder's Tier 0 rung ships a luxury-grade site.** The paid rungs buy you *time*, *edge quality on hard inputs*, and *someone else's SLA*. They do not buy you the result. The single largest quality variable in this skill is not a tool — it is whether the client's own photographs are good, and no amount of money fixes a 640px Facebook JPEG.

---

## Contents

- [§0 — The zero-budget column](#0--the-zero-budget-column-walk-this-if-you-have-no-money) — one screen, T0 end to end
- [§1 — Tier definitions and the law of the ladder](#1--tier-definitions-and-the-law-of-the-ladder)
- [§2 — Credentials: the only rule](#2--credentials-the-only-rule)
- [§3 — The 14 stages](#3--the-14-stages)
- [Appendix A — Dead, broken, or archived](#appendix-a--dead-broken-or-archived-in-2026)
- [Appendix B — Licence traps](#appendix-b--licence-traps)
- [Appendix C — Quota reality, with numbers](#appendix-c--quota-reality-with-numbers)
- [§4 — What you genuinely cannot get for free](#4--what-you-genuinely-cannot-get-for-free-and-what-the-cheapest-fix-costs)

**Sibling files — this one deliberately stops where they start.** Do not duplicate their content here; link to them.

| For | Read |
|---|---|
| How each scroll effect is implemented, with code | `scroll-effects.md` |
| Hover / micro-interaction implementations | `hover-effects.md` |
| Palette, type, mood derivation from the client's assets; the image-rights buckets | `brand-identity.md` |
| Whitespace, type-scale, motion-timing numbers that make it read "premium" | `luxury-register.md` |
| hreflang, JSON-LD, OG images, sitemap, Core Web Vitals targets | `i18n-seo.md` |
| Bundle assembly, zip, verify, export routes, client handover docs | `delivery.md` |
| Per-trade motion verb, section order, conversion action | `industry-playbooks.md` |
| **Every gate threshold and its justification, with the gate IDs `verify.mjs` implements** | **`performance-a11y-gates.md`** |
| Harvest → triage → cutout → frames → compress, step by step | `asset-pipeline.md` |
| R1–R10 recipe implementations, keyed to the asset class that triggers them | `animation-recipes.md` |
| Wiring `assets/ScrollScrubber.jsx` and `assets/scroll-reveal.css` into a build | `scrubber-component.md` |

**The runnable half.** Four stages of this ladder are not advice, they are a command. Reach for the script before you hand-roll the stage:

| Stage | Script | Verified run |
|---|---|---|
| 0 — prove the toolchain | `scripts/preflight.mjs` | 12 checks, exit 0 |
| 1 — harvest | `scripts/harvest.mjs <url> --slug <client>` | exit 0, or exit **3** on zero downloads |
| 5–6 — frames + compression ladder | `scripts/frames.mjs from-video\|from-stills\|from-pair` | exit 0, or exit **2** on a budget breach |
| 13 — visual verification | `scripts/verify.mjs --dir dist` | exit 0 / **1 = NO-SHIP** |

Run `preflight.mjs` first. Every later script assumes its `work/preflight.json` and re-probes nothing.

---

## §0 — The zero-budget column: walk this if you have no money

Fourteen stages, zero dollars, zero signups, no credit card, no account, nothing to cancel later. Everything below runs unattended in this container today. If you only read one screen of this file, read this one.

| # | Stage | The free move | Command / entry point |
|---|---|---|---|
| 0 | **Prove the toolchain** | Before any client asset is touched. Checks tools, never credentials. | **`node scripts/preflight.mjs`** |
| 1 | Harvest | Pull the client's own photos off their own site/profile | **`node scripts/harvest.mjs <url> --slug <client>`** |
| 2 | Imagery gap-fill | Do **not** reach for stock. Use asset-free recipes, or ask the client for 20 phone photos | `industry-playbooks.md` fallback recipes |
| 3 | Cutout | `rembg` with the `u2netp` model, offline after first download | `pip install "rembg[cpu,cli]"` → `rembg i -m u2netp in.png out.png` |
| 4 | Motion origination | Recompose the stills you already have. No generation. | Parallax / before-after wipe / cross-dissolve |
| 5 | Frame extraction | `ffmpeg-static` from npm — the system binary here is broken | **`node scripts/frames.mjs from-video <src.mp4> --out …`** |
| 6 | Compression | `sharp` — WebP, AVIF, mozjpeg, resize ladders, one dependency | same command; the two-width ladder is emitted in the same pass |
| 7 | Fonts | Self-host from google-webfonts-helper, **subset `latin` + `latin-ext`** | one `curl` to `gwfh.mranftl.com`, no key |
| 8 | Icons | Lucide for UI glyphs, **Simple Icons for every brand mark** | already a dep / CC0 download |
| 9 | Scroll engine | Native CSS `animation-timeline` behind `@supports`, **IntersectionObserver as the load-bearing path** | `scroll-effects.md` §0.5 helper |
| 10 | Vector motion | `python-lottie` generates Lottie JSON; or hand-authored SVG `stroke-dashoffset` | `pip install lottie` |
| 11 | 3D | Skip it. If genuinely required: Blender headless + Poly Haven CC0 | `blender -b -P script.py` |
| 12 | Budgets | `frames.mjs` refuses to emit an over-budget ladder; `verify.mjs` asserts the rest against `dist/` | `W×H×4×frames`, and the gate IDs in `performance-a11y-gates.md` |
| 13 | **Visual verification** | **Playwright + the Chromium already on disk.** Screenshot, scroll-CLS trace, reduced-motion pass. | **`node scripts/verify.mjs --dir dist`** → then **`Read` the PNGs in `work/verify/shots/`** |
| 14 | Hosting & delivery | Zip → `SendUserFile`. Live link: anonymous claimable Netlify draft. Client's permanent host: Cloudflare Pages free. | `delivery.md` §2–3 |

**What the zero-budget column actually gets you:** a self-hosted, multilingual, schema-marked, reduced-motion-correct, sub-400KB-first-viewport site built entirely from the client's own photographs, screenshot-verified at two viewports, delivered as a zip plus a live preview URL. That is the product. Nothing on the paid rungs is required to reach it.

**What it does not get you:** rescue of unusable source photography (§4.1), true AI video generation (§4.2), and a hosting account in the client's name that you can hand over without them signing up (§4.4).

---

## §1 — Tier definitions and the law of the ladder

| Tier | Means |
|---|---|
| **T0** | Free, **no signup**, no account, no key. Runs offline or against key-free public endpoints. An agent can use it unattended, start to finish. |
| **T1** | Free **but** costs an account, an email confirmation, or has a metered quota. Someone human usually has to click something once. |
| **T2** | Paid, **under $20/month** or a small one-time fee. The "just buy it" rung. |
| **T3** | Studio grade. Per-seat SaaS, licensed assets, human labour. Priced for an agency, not for one local business. |

**The law: you do not climb a rung because the next one looks nicer. You climb because a *named, written-down gate* failed.**

Write the failure down before you climb. In practice:

```
T0 → T1   because a measured quality gate failed on this specific input
          (e.g. u2netp shredded the hair edge on the hero portrait)
T1 → T2   because the T1 quota cannot cover the work in the time available
T2 → T3   because a human deliverable is required that no tool produces
          (a photographer, a translator, a lawyer)
```

An agent that arrives at T2 without a written T0 and T1 failure has skipped the ladder, and the resulting site will be *more expensive and no better*. Record every climb in the build report (`delivery.md` §6) as: **gate that failed → tier climbed → what it cost → what it fixed.**

Two corollaries that matter for this skill specifically:

1. **Recurring cost is a different animal from one-time cost.** A $19 one-time font licence is a business expense. A $19/month SaaS attached to a local butcher's website is a liability you are creating for a client who will forget to cancel it, and when it lapses their site breaks. Prefer one-time and self-hosted over subscription at *every* rung. Anything that gates *export* behind a subscription (see Rive, Appendix B) is disqualified outright — the deliverable stops existing when the card expires.
2. **The client pays for T2/T3, and knows they are paying.** Never silently attach a paid service to a client site. If a rung costs money, it goes in the proposal before it goes in the build.

---

## §2 — Credentials: the only rule

> **Use only the credentials the end user explicitly hands you for this specific job. Never look for any others.**

Concretely, and without exception:

- **Do not** enumerate `process.env`, dump the environment, or grep for anything matching `*_KEY`, `*_TOKEN`, `*_SECRET`.
- **Do not** test whether ambient cloud credentials exist or work — no probing Google, AWS, Cloudflare, `gh`, or any provider to "see what's available."
- **Do not** treat the presence of a credential as permission to use it. Presence is not consent.
- **Do** ask the user in words: *"Stage N needs a Cloudflare API token. Paste one and I'll deploy; otherwise I'll hand you a `dist/` and a two-minute drag-and-drop instruction."*
- **Do** write preflight checks that are keyed off what the user supplied: `if (userSuppliedToken) { verify it } else { take the no-key path }`. Never `if (anyTokenExists)`.
- **Do** treat "no key" as a **normal, fully supported path**. Every stage in §3 has a T0 rung precisely so that the no-key path is never a degraded one.

Every T1+ row below that needs a key is marked **`key: user-supplied`**. That marking is the whole contract. If the user has not handed you that key, that row does not exist for this run.

---

## §3 — The 14 stages

Stages are listed in build order. Stage 13 is **new** — the blueprint had thirteen stages and no browser anywhere in them, which meant the two gates it argued hardest for (scroll-CLS, visual distinctiveness) could never actually run.

---

### Stage 1 — Harvest the client's own visual content

*Getting the photographs that will ship. This is the point of the whole skill.*

| Tier | Tool | Cost 2026 | Unattended? | What you give up vs the tier above |
|---|---|---|---|---|
| **T0** | `fetch` + HTML/CSS parsing, **plus Playwright** for JS-rendered sites (Chromium already on disk) | $0 | **Yes** | Nothing meaningful. This is the correct rung. |
| **T1** | Wayback Machine / `web.archive.org` for dead or parked sites — key-free but rate-limited and slow | $0, no key | Yes | — (this is a *sibling* of T0, not a step up) |
| **T2** | Managed scraping API (ScrapingBee, Browserless — from ~$15–$49/mo) | $15+/mo, `key: user-supplied` | Yes | T0 gives up: nothing. You'd be paying for residential IPs to fight a bot wall that a small business's own website does not have. |
| **T3** | A human asks the client for the original files over WhatsApp | ~0 minutes of your time, 10 of theirs | No | T2 gives up: **the originals**. The client's phone has 4000×3000 originals; their website has 800px re-compressions. This "T3" beats every tier below it and costs nothing. |

**Caveats, verified:**

- **Image bytes fail far more often than pages do.** Pages fetch fine; arbitrary image CDNs return 403/503 to a bare `fetch`. Always send a real browser `User-Agent` **and** a `Referer` set to the page the image was found on, retry once on 403/429/503 with backoff, and on final failure write a `FAILED.md` listing each dead URL with a copy-paste `curl -A "Mozilla/5.0" -e "<page>" -O` line for the user.
- **Never claim a download that did not happen.** The harvest gate must print `requested N / downloaded M / failed K`. A manifest built from metadata you never actually fetched will pass a naive gate and fail at build time.
- **Instagram/Facebook CDN URLs (`scontent.*`) are signed and expire in hours.** If the user pastes them, fetch immediately in the same turn, or ask for files instead. Do not build a scraper against those platforms.
- **Playwright's proxy caveat:** when loading cross-origin content, Chromium's own network stack is often blocked even with `HTTPS_PROXY` set. Route through Playwright's Node fetcher — the exact snippet is in `delivery.md` §0.2. Local `127.0.0.1` traffic must never be routed.
- **The rights rule is in `brand-identity.md` §7 and it is absolute.** Bucket A (the client's own material, from a domain or profile they control) ships. Everything else is reference only. Keep them in physically separate directories so the rule cannot be broken by accident.

---

### Stage 2 — Imagery gap-fill (when the client has too little)

*What you do when stage 1 comes back thin. Note carefully what is **not** in the T0 cell.*

| Tier | Tool | Cost 2026 | Unattended? | What you give up vs the tier above |
|---|---|---|---|---|
| **T0** | **Asset-free recipes**: SVG stroke-draw, kinetic type, CSS mesh/gradient stages, typographic hero. Plus tight cropping and re-treatment of the few real photos that exist. | $0 | **Yes** | Photographs. You give up photography and replace it with typography and line-work — which for a lawyer, accountant or consultant is the *better* answer anyway. |
| **T1** | A written shot list sent to the client: 15–20 phone photos, specified (subject, framing, light, orientation), plus a 20-second video clip. | $0 | **No** — needs a human at both ends | T0 gives up: real photographs of the real business, which is the single biggest quality lever in this skill. |
| **T2** | Licensed stock the **client** buys and instructs you to use (Adobe Stock ~$30/mo, or ~$10 per single image) | $10–30, **client's licence, client's instruction** | No | T1 gives up: authenticity. Stock people in a stock office is the exact "AI slop" tell `luxury-register.md` §4 is written to prevent. |
| **T3** | A local photographer, half-day | €150–400 in this market | No | T2 gives up: images that are *this* business, correctly lit, in the right aspect ratios, owned outright. Cheapest genuine fix for a photography-poor client. |

**Caveats, verified:**

- **There is no free-stock rung, deliberately.** `brand-identity.md` §7 places Unsplash/Pexels/Pixabay of every tier in **Bucket B — reference only, never ships**. Not because the licences forbid commercial use (they generally allow it) but because a premium site built on the same eight photographs as everyone else defeats its own purpose, and licence terms change under you. Stock moves to Bucket A **only** when the client says in writing "I have licensed this image, use it" — and that instruction is recorded in the brand brief.
- The API-hostility of the free-stock platforms confirms the decision rather than driving it: Unsplash's production tier requires **manual human approval** and its guidelines require hotlinking with the `ixid` tracking parameter preserved (structurally incompatible with downloading, optimising and self-hosting); Pixabay's terms forbid permanent hotlinking, mass downloads and automated queries outright.
- **Say the gap out loud.** If the client has no usable photography, tell the user plainly — *"ovo je tipografski sajt, bez fotografija"* — and build the typographic version well. Silently substituting stock is the failure mode this stage exists to prevent.
- **A logo is an asset.** A client whose only file is a 500px profile picture is not a no-asset client: vectorise it (`potrace`, T0), stroke-draw the traced outline, derive the entire palette from it with `sharp.stats()`, and mask-reveal the headline through the logo shape. One file, full hero.

---

### Stage 3 — Background removal / cutout

*Needed for parallax depth, product floats, and any composite where the subject must leave its original background.*

| Tier | Tool | Cost 2026 | Unattended? | What you give up vs the tier above |
|---|---|---|---|---|
| **T0** | `rembg` with **`u2netp`** (4.57 MB, Apache-2.0). `pip install "rembg[cpu,cli]"`, Python ≥3.11. Model auto-downloads once, then fully offline, no quota. ~1.1s session init, ~0.3s per 1024×576 image. | $0 | **Yes** | Edge quality on hair, fur, glass, motion blur, and semi-transparency. For a hard-edged subject — a car, a door, a plate, a product — you give up nothing at all. |
| **T0b** | `rembg -m birefnet-general-lite` (MIT) — larger model, materially better on fine edges, still local and free | $0 | Yes | — (same rung, better model, slower) |
| **T1** | `@imgly/background-removal-node` (free, Node-native, fetches wasm+onnx on first run) — useful when you want to stay inside Node | $0 | Yes | Marginal. Comparable quality; different runtime. |
| **T2** | remove.bg API | ~$0.20/image, or 40 free credits/mo; `key: user-supplied` | Yes | T0/T1 give up: hair and fur edges on portraits. This is genuinely better on people. |
| **T3** | Manual masking in Photoshop/Affinity by a retoucher | €20–60/image | No | T2 gives up: control over a specific difficult edge, and per-image judgement. |

**Caveats, verified:**

- **LICENCE TRAP — do not use `bria-rmbg`.** It is bundled with `rembg` and it is often the default people reach for, but BRIA's own model card restricts it to **non-commercial use**. This skill builds sites for paying clients. Use `u2netp` (Apache-2.0) or `birefnet-general-lite` (MIT). Put the `-m` flag in every command you write so nobody inherits the default.
- **A bad cutout is worse than no cutout.** If the alpha edge is ragged, do not ship the parallax recipe — fall back to a full-frame treatment. A halo around the subject reads as amateur instantly and no amount of scroll polish recovers it.
- Hosted BiRefNet demos on Hugging Face Spaces are quota-blocked in practice from a datacenter IP (see Appendix C). Local `rembg` is the reliable default, not the compromise.

---

### Stage 4 — Motion origination

*Getting something that moves. **Read the caveat before you plan anything here.***

| Tier | Tool | Cost 2026 | Unattended? | What you give up vs the tier above |
|---|---|---|---|---|
| **T0** | **The client's own stills, recomposed.** Parallax depth push from one photo; before→after wipe from a pair; cross-dissolve scrub from a gallery; hotspot reveal over one dense photo. No generation, no quota, no network. | $0 | **Yes** | Nothing that matters. This is the rung the skill is built on. |
| **T1** | **Blender 5.2 LTS headless** (GPL) + Poly Haven CC0 assets (key-free API). Verified: 367 MB tarball, no system deps, no sudo, renders a 640×360 transparent RGBA PNG in 26.2s. | $0 | Yes, but **slow** | T0 gives up: nothing you need. T1 buys a *rendered object* (a part, a fitting, a product) when the client has no photograph of it. |
| **T2** | Cloudflare Workers AI image models — 10,000 Neurons/day free tier, plain REST | $0 within quota, then usage-priced; `key: user-supplied` + free CF account | Yes | Determinism and rights clarity. |
| **T3** | Runway / Kling / Sora-class image-to-video | $15–99/mo | Yes (with a key) | T2 gives up: actual video generation. This is the only rung where AI video is real. |

**Caveats, verified — this is the most important caveat in the file:**

- **Free anonymous AI video generation has effectively collapsed. Plan the entire build around PROCESSING, not GENERATION.** The hosted free GPU pools that made 2024-era "free AI video" workflows possible are gone in practice: Hugging Face **ZeroGPU quota is IP-keyed and reads as zero from a datacenter IP** — one 10.6-second call from a shared container proxy exhausted it (*"You have exceeded your ZeroGPU runs limit"*), and the quota is a **single pool across all Spaces**, so trying a different Space does not help. A free HF account buys ~5 GPU-minutes/day, which is a handful of seconds of video.
- **Do not architect a hero around generation.** If a generated asset is load-bearing and the quota is empty at build time, you have no site. Every recipe in this skill originates motion from photographs the client already owns, precisely so the build cannot fail this way.
- **Blender headless honest budget:** EEVEE requires a GL context, so a headless run **silently falls back to Cycles CPU**. Budget hours for a 1080p sequence, not minutes. Set `render.film_transparent = True` for free alpha. `Material.use_nodes` now emits a DeprecationWarning (removal in Blender 6.0).
- **Poly Haven** is key-free with no auth and no rate-limit headers (`/types`, `/assets?t=models`, `/info/{slug}`, `/files/{slug}`), everything CC0. Mirror anything you use into the project — do not hotlink.
- **AI-generated imagery presented as the client's premises or work is Bucket B** (`brand-identity.md` §7) and never ships. A generated "workshop" on a real workshop's website is a lie with a URL.

---

### Stage 5 — Frame extraction from video

*Turning a real clip the client already has into a scrubbing sequence.*

| Tier | Tool | Cost 2026 | Unattended? | What you give up vs the tier above |
|---|---|---|---|---|
| **T0** | **`ffmpeg-static` via npm.** `npm i -D ffmpeg-static`, then `const bin = require('ffmpeg-static')`. Verified here: resolves to a self-contained **ffmpeg 7.0.2-static**, no sudo, no apt. | $0 | **Yes** | Nothing. There is no better tool. |
| **T1** | — | — | — | — |
| **T2** | — | — | — | — |
| **T3** | — | — | — | — |

This stage has exactly one rung and no reason for another. The entire content of this row is a warning about which binary you call.

**Caveats, verified in this container:**

- **The system `ffmpeg` here is broken.** `ffmpeg -version` fails with `libcaca.so.0: cannot open shared object file`. Make `require('ffmpeg-static')` the first line of every media script; never call a bare `ffmpeg`.
- **Do not use Playwright's bundled ffmpeg as a fallback.** `/opt/pw-browsers/ffmpeg-1011/ffmpeg-linux` exists and prints a version banner, which makes it look usable. It is built `--disable-everything` with only `mjpeg`, `vp8`, `png`, `webm` and a handful of filters enabled — **it cannot decode an H.264 mp4**, which is the format every phone produces. It exists to record Playwright traces, nothing else.
- **Never extract a sequence directly to `.webp`.** ffmpeg writes **one animated WebP**, not N stills. Extract to PNG, convert with `sharp` in stage 6:
  ```bash
  "$(node -p "require('ffmpeg-static')")" -i src.mp4 -vf "fps=24,scale=1280:-2" work/frames/frame_%04d.png
  ```
- **Four-digit padding, always.** `%04d`. Two-digit padding breaks at frame 100 and the reference sequence everyone benchmarks against is 147 frames.
- `moviepy` may be present but is the wrong tool — breaking 2.x API, lagging docs, Pillow conflicts. Call the binary with explicit `-vf` filter graphs instead.

---

### Stage 6 — Image compression and the responsive ladder

*Every byte the visitor downloads passes through here.*

| Tier | Tool | Cost 2026 | Unattended? | What you give up vs the tier above |
|---|---|---|---|---|
| **T0** | **`sharp`** — what `preflight.mjs` installs (`sharp@^0.34`) resolves here to **0.34.5 / libvips 8.17.3**, prebuilt, zero system deps. WebP, AVIF, mozjpeg, PNG, TIFF, GIF, raw, resize, rotate, stats, metadata — one dependency replacing `cwebp`, `avifenc` and `mozjpeg-cli`. | $0 | **Yes** | Nothing. |
| **T1** | `sharp-cli` if you want a shell interface over the same binary | $0 | Yes | — |
| **T2** | Cloudflare Images (~$5/mo per 100k images stored + delivery) | $5+/mo, `key: user-supplied` | Yes | T0 gives up: on-the-fly variants for images you do not control at build time. For a fixed marketing site, build-time `sharp` is strictly better — the variants are hashed, immutable, and free to serve. |
| **T3** | imgix / Cloudinary transformation pipelines | $50+/mo | Yes | T2 gives up: DAM features nobody needs for a 12-page site. |

**Measured on this container**, on a real photograph — `public/images/car/frames/frame-30.jpg`, cover-cropped to 1200×800 at JPEG q90 (131,106 B) as the baseline, then re-encoded at 480px wide:

| Encode | Bytes | vs baseline |
|---|---|---|
| source JPEG q90, 1200×800 | 131,106 | — |
| 480px WebP q72 effort 4 | **14,920** | 11.4% |
| 480px AVIF q50 | **11,283** | 8.6% |
| 480px mozjpeg q75 | 19,124 | 14.6% |

Reproduce it. Note the explicit path into `work/tools` — `sharp` is deliberately **not** a
dependency of the client project (§Stage 6 caveats), so a bare `require('sharp')` or
`import 'sharp'` from the project root fails with `ERR_MODULE_NOT_FOUND`. Run
`scripts/preflight.mjs` first; that is what puts it there.

```bash
node -e "
const sharp = require('./work/tools/node_modules/sharp');
(async () => {
  const base = await sharp('public/images/car/frames/frame-30.jpg')
    .resize(1200, 800, { fit: 'cover' }).jpeg({ quality: 90 }).toBuffer();
  console.log('baseline', base.length);
  for (const [l, f] of [['webp', p => p.webp({quality:72,effort:4})],
                        ['avif', p => p.avif({quality:50})],
                        ['moz',  p => p.jpeg({quality:75,mozjpeg:true})]])
    console.log(l, (await f(sharp(base).resize(480)).toBuffer()).length);
})();
"
```

Ratios, not absolute bytes, are the transferable finding: **AVIF ≈ 0.75× WebP ≈ 0.59× mozjpeg** at visually comparable quality on photographic content. A flat or synthetic source will compress an order of magnitude smaller and tells you nothing about a real hero.

And on a real sequence — the first 24 of this repo's 60 `public/images/car/frames/*.jpg`, PNG (lossless extraction) vs WebP q72 effort 4, measured just now:

| Ladder width | PNG total | WebP q72 total | Per frame |
|---|---|---|---|
| 480 px | 2,519 KB | **158 KB** | 6.6 KB |
| 720 px | 4,823 KB | **250 KB** | 10.4 KB |
| 960 px | 7,524 KB | **334 KB** | 13.9 KB |

```bash
node -e "
const sharp = require('./work/tools/node_modules/sharp'), fs = require('fs');
(async () => {
  const files = fs.readdirSync('public/images/car/frames').sort().slice(0, 24)
    .map(f => 'public/images/car/frames/' + f);
  for (const w of [480, 720, 960]) {
    let png = 0, webp = 0;
    for (const f of files) {
      png  += (await sharp(f).resize(w).png().toBuffer()).length;
      webp += (await sharp(f).resize(w).webp({ quality: 72, effort: 4 }).toBuffer()).length;
    }
    console.log(w, (png/1024).toFixed(0)+' KB PNG ->', (webp/1024).toFixed(0)+' KB WebP,',
                (webp/24/1024).toFixed(1)+' KB/frame');
  }
})();
"
```

**Per-frame cost scales with the ladder width you chose, not with the frame count** — which is why the width decision comes before the frame-count decision, and why `frames.mjs` caps width to the source and never upscales.

**Caveats, verified:**

- **NEVER `@squoosh/cli`.** It installs cleanly, `--help` prints, and then it throws `ERR_INVALID_URL` inside `createWasm` while loading `imagequant_node-*.wasm` on Node 22. Upstream is archived. It passes a smoke test and fails in production — the worst possible failure shape. `sharp` covers everything it did.
- **`require('sharp/package.json')` throws** `ERR_PACKAGE_PATH_NOT_EXPORTED` — the subpath is not exported. Read `sharp.versions` instead if you need to log the version.
- **sharp limits to remember:** SVG is **input-only**; no JXL; no JP2; no ImageMagick delegate in this build.
- **Format choice is not "AVIF always".** AVIF q50 ≈ JPEG q75 at roughly half the bytes, but with materially **higher per-frame decode cost**. Prefer AVIF/WebP when bandwidth-bound (mobile, first paint); prefer JPEG when decode-bound (long sequences on low-end Android). Never PNG for a sequence. WebP/AVIF are mandatory only when you need alpha.
- **Emit the social card in the same pass.** A 1200×630 `og:` image is not optional — without it every WhatsApp and Viber share of the finished site renders a blank rectangle, and in this market that is the primary distribution channel. The templated-HTML-screenshot method (which produces a far better card than a crop) is in `i18n-seo.md` §4.4 and uses the same Chromium as stage 13.
- **Install as `devDependencies`.** `sharp` and `ffmpeg-static` are build-time only. `npm i -D`, or install them into a separate `work/tools/` project, so they never appear in the client's shipped dependency list.

---

### Stage 7 — Fonts

| Tier | Tool | Cost 2026 | Unattended? | What you give up vs the tier above |
|---|---|---|---|---|
| **T0** | **google-webfonts-helper** — one `curl`, no key: `https://gwfh.mranftl.com/api/fonts/inter?download=zip&subsets=latin,latin-ext&variants=regular,700&formats=woff2` (verified: 103,513 bytes, two woff2 files). Self-hosted, CSP-clean. | $0 | **Yes** | Variable-font axes and reproducible version pinning. gwfh serves **static weights only**. |
| **T1** | **Fontsource** npm (`@fontsource-variable/*`) — 2,000+ families, version-locked, real variable fonts | $0 | Yes | T0 gives up: variable axes, and a lockfile-reproducible build. |
| **T2** | A one-time commercial licence for a display face (many independent foundries sell a webfont licence at €30–150 one-time) | €30–150 **one-time** | No (human buys it) | T1 gives up: a typeface nobody else has. This is one of the highest-leverage paid rungs in the entire ladder — see §4.3. |
| **T3** | Full foundry licence, custom or extended-traffic tier | €500+ | No | T2 gives up: traffic headroom and multi-brand rights. |

**Caveats, verified:**

- **`latin-ext` is mandatory, not optional, for bs / hr / sr builds.** č ć ž š đ live in `latin-ext`. Omit that subset and the client's own business name renders as tofu boxes. Make it a gate, not a preference. (`i18n-seo.md` §2.5 has the subsetting and encoding verification commands.)
- **Never link `fonts.googleapis.com`.** It is a render-blocking stylesheet on two external hosts in the critical path, and it is the first thing to remove from any inherited codebase before optimising anything else.
- **Licence-check before committing to a family.** Google Fonts' own API returns licence, variable status, axes and ranges in one call — `brand-identity.md` §3.3 has the exact endpoints, and §3.4 has the download → instance → subset → inline pipeline with `fonttools`.
- For a single self-contained HTML artifact, base64 the woff2 into `@font-face` `data:` URIs at ~15–30 KB per weight/subset. **Two or three weights maximum** — a fourth is almost always a design failure rather than a need.

---

### Stage 8 — Icons

| Tier | Tool | Cost 2026 | Unattended? | What you give up vs the tier above |
|---|---|---|---|---|
| **T0** | **Lucide** (ISC, ~1,600 UI glyphs) for interface icons **+ Simple Icons** (CC0, 3,400+ brand marks, no attribution required) for every social/brand logo | $0 | **Yes** | Nothing. |
| **T1** | Heroicons (MIT, ~1,288), Phosphor (MIT, 7,700+ across 6 weights), Tabler (MIT, 5,000+) | $0 | Yes | — (sibling rungs; pick one family and stay in it) |
| **T2** | — | — | — | — |
| **T3** | A drawn icon set from an illustrator | €200+ | No | Everything below gives up: a mark that is *this* brand. Rarely justified below a five-figure project. |

**Caveats, verified:**

- **Lucide v1.0 (2026-06-23) deleted every brand icon.** GitHub, Facebook, Instagram, WhatsApp, Viber — all gone. This repo pins `lucide-react ^1.27.0`, so any inherited code using those imports is **already broken**. Every social link must come from Simple Icons. Keep Lucide for UI glyphs only.
- Lucide v1 also dropped UMD builds, shrank 32.3%, and **now defaults `aria-hidden` to true** — so any icon that is itself the interactive target needs an accessible name supplied by you.
- **Never mix icon families in one interface.** Two stroke weights in the same nav is one of the fastest ways to make a site read as assembled rather than designed (`luxury-register.md` §1.8).

---

### Stage 9 — Scroll engine / animation runtime

| Tier | Tool | Cost 2026 | Unattended? | What you give up vs the tier above |
|---|---|---|---|---|
| **T0** | **IntersectionObserver + CSS transitions** as the load-bearing path, with native **`animation-timeline: view()/scroll()`** layered on **behind `@supports`** as progressive enhancement. | $0, 0 KB | **Yes** | Timeline scrubbing, pinning, and complex sequencing. For reveals, progress bars, sticky shrink and stacking cards you give up nothing — and the native path runs off the main thread. |
| **T1** | **GSAP 3.15 + ScrollTrigger** — **100% free including every formerly-paid plugin** (MorphSVG, DrawSVG, SplitText, ScrollSmoother, Observer, Flip) **since Webflow made it free in April 2025**. Measured on gsap 3.15.0, `zlib.gzipSync(level:9)` over the shipped `dist/*.min.js`: gsap **27.7 KB** + ScrollTrigger **17.6 KB** = **45.3 KB gzipped**. | $0 | **Yes** | T0 gives up: pinning, timeline scrubbing, `matchMedia()` breakpoint branching that auto-reverts, and SplitText. 45 KB is a real cost against a 120 KB JS budget — spend it on the hero only. |
| **T2** | Lenis (MIT, <4 KB) for smooth scroll — import from `lenis/react` | $0 | Yes | Not a step up; a separate, **optional and risky** addition. See caveat. |
| **T3** | Motion+ (~£299 one-time) | £299 one-time | Yes | T1 gives up: **examples, not capability.** Not needed. |

**Caveats, verified:**

- **Native CSS scroll-driven animation is NOT baseline.** `animation-timeline` sits at ~83.66% global and **Firefox stable has not shipped it** (still behind `layout.css.scroll-driven-animations.enabled`; Interop 2026 target). Therefore: **the IntersectionObserver or GSAP path is load-bearing and the native path is the enhancement** — never the other way round. Every native block goes inside `@supports (animation-timeline: view())`.
- **The order trap that costs everyone an hour:** `animation-timeline` **must be declared *after* the `animation` shorthand**, or the shorthand silently resets it to `auto` and nothing moves. Same for `animation-range`. This is the single most common "why isn't my scroll animation working."
- **Safari's compositor allowlist (26.4+) is exactly:** `opacity`, `transform`, `translate`, `scale`, `rotate`, `filter`, `backdrop-filter`, and Motion Path properties. A scroll-driven animation on `width`, `height`, `color` or `clip-path` **silently stays on the main thread**. This is the mechanical reason behind the skill's transform/opacity-only rule.
- **GSAP licence nuance:** free of charge, but **not MIT**. The npm `license` field reads *"Standard 'no charge' license"*, and its Prohibited Use clause bars implementing GSAP inside tools that let users build visual animations **without code** in competition with Webflow. Generating GSAP code into a client's site is fine and is exactly what this skill does. Wrapping it in a no-code animation builder is not.
- **If you add Lenis, gate Lenis itself behind `prefers-reduced-motion`.** Hijacked scroll momentum is independently a motion-sickness trigger, separate from the animations it drives. Also: `@studio-freight/react-lenis` is formally **deprecated** — import from `lenis` / `lenis/react`.
- Implementations for every effect live in `scroll-effects.md`; the reduced-motion contract for each is in its §0.4. **Every animated thing ships a reduced-motion branch and a touch/mobile fallback** — no exceptions, and "reduced motion" means *show the end state instantly*, never *show nothing*.

---

### Stage 10 — Vector motion (icons, logo reveals, loaders, line-draws)

| Tier | Tool | Cost 2026 | Unattended? | What you give up vs the tier above |
|---|---|---|---|---|
| **T0** | **Hand-authored SVG `stroke-dasharray`/`stroke-dashoffset`** — pure CSS, universally supported, no browser caveats, a few hundred bytes. Best effort-to-impact ratio in the skill. | $0 | **Yes** | Character animation and complex easing. For a route line, a blueprint outline, a wiring run, an underline — nothing. |
| **T0b** | **`python-lottie`** (`pip install lottie`, v0.7.2, no hard deps) **generates** Lottie JSON programmatically — unlimited, deterministic, no account. Render with `@lottiefiles/dotlottie-web` (MIT). | $0 | Yes | — |
| **T1** | useAnimations (~90 icons, MIT) or Lottieflow (free account, no attribution) | $0, account | Partly | T0 gives up: professionally-eased ready-made icon animations. |
| **T2** | LottieFiles Individual | **$19.99/user/mo** | Yes | T1 gives up: the library and unlimited downloads (see quota caveat). |
| **T3** | Rive Cadet | **$9/mo — but see the disqualification** | Yes | — |

**Caveats, verified:**

- **Rive is disqualified despite being technically excellent.** `.riv` files are up to 90% smaller than Lottie, with real state machines and data binding — and the **free tier gates exports**, so nothing you build there can ship without an active subscription. Under a zero-recurring-cost contract that is fatal: when the client's card expires, their hero stops existing. dotLottie is the substitute.
- **LottieFiles' free workspace allows 10 public downloads per month with no programmatic API.** An agent iterating on a logo reveal burns that in one session. This is precisely why `python-lottie` is the T0 answer — generation is unlimited and deterministic.
- **`lottie-web` and `@lottiefiles/lottie-player` are deprecated** in favour of `@lottiefiles/dotlottie-web`. But dotlottie-web **loads a `.wasm` at runtime**, so under a strict CSP that blocks external hosts you must self-host or inline it. For a single-file artifact, prefer the T0 SVG route.
- Scroll-linking a Lottie: tween a playhead object and call `animation.goToAndStop(frame, true)` — the `true` means **frame-based, not time-based**. Reduced-motion end state is `goToAndStop(total - 1)`.

---

### Stage 11 — 3D / rendered assets

| Tier | Tool | Cost 2026 | Unattended? | What you give up vs the tier above |
|---|---|---|---|---|
| **T0** | **Blender 5.2 LTS headless** (GPL) + **Poly Haven** CC0 API (key-free, no auth, no rate-limit headers) | $0 | Yes, but hours | Real-time interactivity. You get pre-rendered frames, which for a scroll hero is what you wanted anyway. |
| **T1** | Sketchfab CC0 filter + Download API | $0, account | Yes | T0 gives up: ready-made models. **Mirror anything you use into the project** — the platform is winding down (the paid store moved to Epic's Fab; only CC-BY/Fab Standard migrated). |
| **T2** | three.js + React Three Fiber + drei (all MIT) — free in licence, **expensive in developer time** | $0 licence, high time | Yes | T1 gives up: a live 3D scene. Costs a large share of your JS budget and is almost never the right call for a local business site. |
| **T3** | Paid asset marketplaces / a 3D artist | €50–500+ | No | — |

**Caveats, verified:**

- **Only reach this stage when the client has no usable imagery AND the trade needs an accurate object.** In every other case the client's photographs are better, cheaper, faster and more honest than a render.
- **Blender headless timing, measured:** EEVEE needs a GL context, so headless **falls back to Cycles CPU**; a 640×360 frame took **26.2s**. A 60-frame 1080p sequence is an overnight job, not a coffee break. Set `render.film_transparent = True` for free alpha.
- For three.js: WebGPU works in R3F today via the promise-returning callback on the `gl` prop. Author shaders in TSL if you want a cheap WebGPU migration later.

---

### Stage 12 — Measurement and budget accounting (static / numeric)

*Counting, before any browser is involved. These are the numbers that get asserted in CI and in the build report.*

| Tier | Tool | Cost 2026 | Unattended? | What you give up vs the tier above |
|---|---|---|---|---|
| **T0** | `npm run build` size output, `du -sh`, a static-analysis script over `dist/` (preload present? external font stylesheet absent? `alt` on every `<img>`? `animation-timeline` after the shorthand? file count and largest file under the host caps?), plus the decoded-memory arithmetic by hand | $0 | **Yes** | Field data and real-device timings. |
| **T1** | PageSpeed Insights — real CrUX field data, but **only where the site already has traffic** | $0 | Yes (public API) | T0 gives up: what real users on real phones actually experience. For a site that launched yesterday there is no field data, so T1 is empty by definition at launch. |
| **T2** | DebugBear / SpeedCurve free-then-paid tiers | free tier → ~$20+/mo | Yes | T1 gives up: continuous monitoring and alerting. Sell this to the client as a service or skip it. |
| **T3** | Paid RUM (real-user monitoring) across the client's whole estate | $100+/mo | Yes | — |

**The budgets this stage asserts.** These are *reproduced as targets, not authored here.* **`performance-a11y-gates.md` is the authority**: it carries the justification for every number and the gate ID (`JS-BUDGET`, `DECODED-MEMORY`, `LCP`, …) that `scripts/verify.mjs` actually implements. Field-metric definitions are `i18n-seo.md` §5.6. If a number below ever disagrees with `performance-a11y-gates.md`, that file wins and this table is stale.

| Budget | Cap |
|---|---|
| JS, gzipped, single-page build | **≤ 120 KB** |
| First-viewport total transfer (HTML + critical CSS + JS + poster + 2 woff2) | **≤ 400 KB** |
| Poster image | **≤ 80 KB** |
| Keyframe subset that makes a scrub usable | **≤ 250 KB** |
| Full desktop sequence on disk | **≤ 4 MB** |
| Full mobile sequence on disk | **≤ 1.5 MB** |
| Decoded frame memory `W × H × 4 × frames` | warn above **~250 MB** |
| LCP / INP at 1.6 Mbps, 150 ms RTT, 4× CPU throttle | **≤ 2.5 s / ≤ 200 ms** |

**Caveats:**

- **`navigator.connection.saveData === true` → fetch no sequence at all.** Poster only. Save-Data is a terminal tier, not an input to a heuristic.
- **A canvas is not an LCP candidate.** The spec list is exactly `<img>`, `<image>` in SVG, `<video>`, `url()` background-image, and block-level elements containing text. Ship frame 0 as a real `<img fetchpriority="high" loading="eager" decoding="async">` with explicit width/height — it is both the LCP element and the CLS guard.
- **In a client-rendered SPA, that `<img>` cannot paint until the bundle downloads, parses and mounts.** You must *also* put `<link rel="preload" as="image" href="…/poster.jpg" fetchpriority="high">` in `index.html`'s `<head>`. Editing only the React component does nothing.
- **Decoded memory is not file size.** A 3.9 MB on-disk sequence can be 221 MB of live bitmap (60 frames × 1280 × 720 × 4). Do the arithmetic in a comment next to the frame count.
- **1.5 MB "mobile budget" is meaningless without knowing what lands first.** At 1.6 Mbps, 1.5 MB is 7.5 seconds. That is why the poster and keyframe-subset caps exist as separate lines above.

---

### Stage 13 — Browser automation and visual verification ← **NEW**

*The stage the blueprint did not have. Without it, the site ships without anyone — human or agent — ever having looked at it, and the two hardest gates (scroll-CLS, visual distinctiveness) are decorative.*

| Tier | Tool | Cost 2026 | Unattended? | What you give up vs the tier above |
|---|---|---|---|---|
| **T0** | **Playwright + the Chromium already on disk here.** Verified this session: `playwright@1.62.1` in the project, **Chromium 141.0.7390.37** at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, cold launch ~0.6 s, `layout-shift` PerformanceObserver works, `emulateMedia({ reducedMotion: 'reduce' })` works, screenshots work. | $0 | **Yes** | Real devices, real networks, and a human's eye. |
| **T1** | `npx lighthouse` (v13.x) against the local preview — not preinstalled, downloads on first use | $0 | Yes, if the sandbox allows the install | T0 gives up: a standardised score to put in a report. **Lighthouse never scrolls**, so it cannot see the CLS this skill's output is most exposed to. `delivery.md` §7.2.2 has a Playwright-only fallback that measures the same core metrics. |
| **T2** | BrowserStack / LambdaTest real-device sessions | ~$29+/mo | Partly | T1 gives up: real iOS Safari, real low-end Android. Genuinely useful once, before a big launch; not per-build. |
| **T3** | A QA pass by a human on the client's actual phone | hourly | No | Everything below gives up: judgement. A screenshot cannot tell you the hero is boring. |

**The launch incantation — use exactly this, and do NOT run `playwright install`:**

```js
const { chromium } = require('playwright');
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
});
```

**What T0 must actually do, every build** — this is the minimum, and all four are verified to work here:

1. **Screenshot at scroll progress 0 / 0.35 / 0.7 / 1.0 × viewports 375 px and 1440 px**, written to `work/verify/`. Then **`Read` the screenshots.** This is the only step in the entire skill that looks at the page. An agent that skips it is shipping blind.
2. **Scroll-CLS trace.** Register `new PerformanceObserver(…).observe({ type: 'layout-shift', buffered: true })`, drive a scripted scroll to the bottom and back, and **fail on any entry with `hadRecentInput === false`.** Scroll is explicitly *not* an excluding input in the Layout Instability spec — there is no 500 ms grace period, and every shift during scroll counts in full.
3. **Reduced-motion pass.** `await page.emulateMedia({ reducedMotion: 'reduce' })`, reload, screenshot again. Assert: a complete, informative end state; **no tall empty scroll region**; no infinite loops still running (pulsing glows and bouncing chevrons are the usual survivors).
4. **Keyboard order and focus visibility.** Tab through the hero; assert every interactive element is reachable, that focus is visible, and that focusing something inside a pinned/sticky section does not throw the scrubber to an arbitrary frame (`scroll-margin-top` on focusables inside sticky sections; a skip-link past the hero as the first focusable element).

**Caveats, verified:**

- **NEVER screenshot this skill's output with `animations: 'disabled'`.** It is the obvious way to make a capture deterministic and it silently destroys the evidence. Playwright's documented rule is *finite animations fast-forward to completion, infinite animations are cancelled to their initial state* — and a CSS animation driven by `animation-timeline: view()` has `duration: auto`, so it takes the **second** branch and is rewound to its `from` keyframe. Every `.pw-reveal` in `assets/scroll-reveal.css` starts at `opacity: 0`. Measured on a fixture that links that stylesheet and has one `<h1 class="pw-reveal" data-reveal>` at 72px, black on white — Chromium 141.0.7390.37, viewport 1440×900, scroll position 0, counting pixels darker than 200/255 inside the `<h1>`'s own bounding box:

  | screenshot option | headline ink px |
  |---|---|
  | `animations: 'allow'` | **14,841** |
  | `animations: 'disabled'` | **0** |

  The ink total depends on your headline's text and size; the **0** does not, and it is 0 for every reveal on the page. Reproduce it before you trust it — and if you want the end-to-end version, patch `scripts/verify.mjs` back to `animations: 'disabled'`, re-run it over a built site and look at `shots/1440-p000.png`: headline and lede gone, only the non-revealed CTA left.

  So the one step in the whole skill that *looks* at the page hands you a page with the headings missing, and you then "fix" a design that was never broken. `scripts/verify.mjs` now calls `settleAnimations(page)` before every capture and screenshots with `animations: 'allow'`: it reproduces Playwright's semantics for **time-driven** animations (finite → `finish()`, infinite → rewind to 0 and pause) and **skips anything on a `ViewTimeline`/`ScrollTimeline`**, whose state is a pure function of scroll position and therefore already deterministic once the scroll has settled. If you write your own capture script, copy that function — do not reach for the flag.
- **Do not run `playwright install` or `npx playwright install --with-deps`.** The browser is already on disk. Downloading another copy wastes minutes and may fail behind the proxy.
- **`--no-sandbox` is required** in this container.
- **Route cross-origin page traffic through Playwright's Node fetcher** when the page loads external resources — Chromium's own stack is often blocked even with `HTTPS_PROXY` set. Exact snippet in `delivery.md` §0.2. Never proxy `127.0.0.1`.
- **Verify the built output, not the dev server.** `npm run build` then serve `dist/` (`npx serve`, `http-server`, or `vite preview`) and point Playwright at that. Dev-server behaviour is not shipping behaviour.
- Global Playwright here is **1.56.1**; the project has **1.62.1**. If you `require('playwright')` from the project root you get 1.62.1. If you need the global one, `export NODE_PATH="$(npm root -g)"` and use `.cjs`.

---

### Stage 14 — Hosting and delivery

*Where the finished thing lives. **Read the licensing caveat — this is commercial client work and two of the obvious free hosts forbid it.***

| Tier | Tool | Cost 2026 | Unattended? | What you give up vs the tier above |
|---|---|---|---|---|
| **T0** | **Zip → `SendUserFile`** (the deliverable always exists), **plus** an anonymous claimable **Netlify draft** for a link the user can send today: `npx --yes netlify-cli deploy --dir=site --no-build --allow-anonymous --prod` | $0, no account | **Yes** | A permanent home on a domain the client owns. The draft is a **preview**, and an unclaimed anonymous site is temporary — say so in the handover, and hand over the claim URL. |
| **T1** | **Cloudflare Pages free** — the client's real host. Direct Upload: `npx wrangler pages deploy dist`. **The only major free tier that both permits commercial use and has genuinely unlimited static-asset bandwidth**, which matters when a frame sequence is 1.5–4 MB per visit. | $0; needs a free CF account + `key: user-supplied` API token | Yes, **if** the user supplies a token | T0 gives up: permanence, a custom domain, and an account in the client's name. |
| **T2** | Netlify Personal $9/mo, or Vercel Pro $20/seat/mo | $9–20/mo | Yes | T1 gives up: preview URLs per branch, build minutes, support. Rarely worth a recurring charge on a local business's site. |
| **T3** | Managed hosting with an SLA, or the client's existing agency hosting | €20–100/mo | No | T2 gives up: someone to phone at 2am. |

**The licensing consequence, stated plainly — this is commercial client work:**

| Host | Free tier | Verdict for a paying client's site |
|---|---|---|
| **Cloudflare Pages** | Unlimited static bandwidth; 500 builds/mo; 1 concurrent build; **20,000 files** per site; **25 MiB** per file; 100 custom domains | ✅ **Permitted and recommended.** This is the default target. |
| **Vercel Hobby** | Generous | ❌ **Disqualified by licence, not by limits.** Hobby is explicitly *"personal, non-commercial use."* A revenue-generating business site requires **Pro at $20/seat/mo**. Deploying a client site to Hobby is a terms violation you are creating on their behalf. |
| **GitHub Pages** | Generous | ❌ **Disqualified by licence.** The ToS prohibits using it *"as a free web-hosting service to run your online business."* Also disqualified by this skill's no-GitHub rule (`delivery.md` §0.1). |
| **Netlify free** | **300 credits/month, hard cap, no top-up** — ~15 credits per production deploy, ~20 credits/GB bandwidth | ⚠️ **Preview only.** Roughly 20 deploys at zero traffic, and on exhaustion **every site on the account is paused** and visitors see "Site not available." Fine for a claimable draft you hand to the user today; not somewhere a business's phone number lives. |

**Caveats, verified:**

- **The 20,000-file cap is why you count frames.** A 300-frame sequence at two resolutions plus an `og` card plus fonts is already 600+ files before the rest of the site. The **25 MiB per-file** cap is why you never ship an uncompressed hero video.
- **Immutable caching does not happen by itself on Cloudflare Pages.** Ship a `public/_headers` file or every visitor re-downloads the sequence:
  ```
  /anim/*
    Cache-Control: public, max-age=31536000, immutable
  /fonts/*
    Cache-Control: public, max-age=31536000, immutable
  ```
  Ship `public/_redirects` alongside it for language routing (`i18n-seo.md` §1.1).
- **A Cloudflare Pages project created by Direct Upload can never be switched to git later** — it needs a new project. Decide once.
- **Neither `wrangler` nor `gh` is installed here**, and no deploy token exists unless the user hands you one. **The default outcome of every run is therefore: a verified `dist/` + a zip + a `DEPLOY.md`** containing the exact `npx wrangler pages deploy dist --project-name=X` line, **the CLI-free dashboard drag-and-drop path** (which is how most clients will actually do it), the DNS/custom-domain steps, and the commands to regenerate frames from new photos. Hand-off is the normal path, not the failure path.
- **Before deploying anything publicly, ask.** A "temporary preview link" is a public URL. Unannounced pricing, an unlaunched brand, staff photos, anything under NDA — check first. Full export decision table in `delivery.md` §3.
- **Do not push to GitHub** unless the user says so in words (`delivery.md` §0.1). Absence of an objection is not instruction.

---

## Appendix A — Dead, broken, or archived in 2026

Do not reach for these. Each entry cost someone real time to discover.

| Thing | Status | Symptom |
|---|---|---|
| **System `ffmpeg` in this container** | **Broken** | `libcaca.so.0: cannot open shared object file`. Use `ffmpeg-static` from npm (7.0.2-static, verified). |
| **Playwright's bundled ffmpeg** (`/opt/pw-browsers/ffmpeg-1011/ffmpeg-linux`) | **Not a general ffmpeg** | Prints a real version banner, then cannot decode H.264. Built `--disable-everything`, only mjpeg/vp8/png/webm. |
| **`@squoosh/cli`** | **Dead on Node 22, upstream archived** | Installs cleanly, `--help` works, then `ERR_INVALID_URL` in `createWasm` on any real encode. Use `sharp`. |
| **`require('sharp/package.json')`** | **Throws** | `ERR_PACKAGE_PATH_NOT_EXPORTED`. Use `sharp.versions`. |
| **Anonymous ZeroGPU (Hugging Face Spaces)** | **Effectively zero from a datacenter IP** | Quota is IP-keyed and pooled across *all* Spaces; exhausted after one ~10s call. |
| **`@studio-freight/react-lenis`** | **Deprecated** | Import from `lenis` / `lenis/react`. |
| **`lottie-web`, `@lottiefiles/lottie-player`** | **Deprecated** | Use `@lottiefiles/dotlottie-web` (loads a wasm — self-host under strict CSP). |
| **Lucide brand icons** | **Deleted in v1.0 (2026-06-23)** | Facebook/Instagram/WhatsApp/Viber/GitHub imports break. Use Simple Icons (CC0). |
| **Lucide UMD builds** | **Dropped in v1.0** | ESM only. |
| **`moviepy` for frame extraction** | **Wrong tool** | Breaking 2.x API, lagging docs, Pillow conflicts. Call the ffmpeg binary. |
| **`playwright install` in this container** | **Unnecessary and may fail** | Chromium 141 is already at `/opt/pw-browsers/chromium-1194/`. |
| **`screenshot({ animations: 'disabled' })` on scroll-driven pages** | **Silently blanks the evidence** | Treats a `view()`/`scroll()` timeline animation as infinite and rewinds it to its `from` keyframe, so every reveal captures at `opacity: 0` — measured **0** headline ink px against 14,841 with `'allow'`. Use `settleAnimations()` + `animations: 'allow'` (Stage 13 caveats). |
| **`lighthouse` preinstalled** | **Not present** | `npx lighthouse` wants to download it. Playwright fallback in `delivery.md` §7.2.2. |
| **Native `animation-timeline` as a load-bearing path** | **Not baseline** | ~83.66% global; Firefox stable still flagged. Enhancement only, behind `@supports`. |
| **Free anonymous AI video generation, generally** | **Collapsed** | See §4.2. Plan around processing, not generation. |

---

## Appendix B — Licence traps

Every one of these is a trap because the tool *works* — the problem is what you are allowed to do with the output.

| Trap | The rule |
|---|---|
| **`bria-rmbg`** (bundled with rembg) | **Non-commercial only**, per BRIA's own model card. Never on a paying client's site. Pass `-m u2netp` (Apache-2.0) or `-m birefnet-general-lite` (MIT) explicitly. |
| **GSAP** | Free of charge including all plugins since Apr 2025, but **not MIT** — a Webflow "no charge" licence. Prohibited Use bars building **no-code animation builders** with it. Generating GSAP into a client's site: fine. Wrapping it in a visual animation editor: not. |
| **Vercel Hobby** | **"Personal, non-commercial use."** A client's business site needs Pro ($20/seat/mo). |
| **GitHub Pages** | ToS forbids using it *"as a free web-hosting service to run your online business."* |
| **Rive free tier** | **Gates exports.** Nothing ships without an active subscription — the deliverable disappears when the card does. |
| **Unsplash** | Production API tier requires **manual human approval**; guidelines require hotlinking with the `ixid` param preserved. Structurally incompatible with self-hosting. And it is Bucket B regardless (`brand-identity.md` §7). |
| **Pixabay** | Terms forbid permanent hotlinking, mass downloads and automated queries. |
| **Pexels** | Licence permits commercial use **but requires visible attribution** ("Photo by X on Pexels" + a live link). Bucket B for this skill regardless. |
| **Third-party photography generally** | **Reference only, never ships** — including competitor sites, agency portfolios, Pinterest, Dribbble, Behance, and AI-generated imagery presented as the client's premises or work. Keep Bucket A and Bucket B in physically separate directories with a build guard (`brand-identity.md` §7). |
| **The client's own photos are not automatically clean either** | They may have been shot by a hired photographer (copyright is the photographer's) or lifted from the web by the client. And salon/gym/restaurant/clinic photos contain **identifiable third parties** — before/after is literally faces, and clinical before/after is health data. **Ask, don't assume.** Record consent per identifiable person in the brand brief, or crop to detail (teeth only, hair only) — which should be the *default* for medical and dental. |
| **Fonts** | "Free on Google Fonts" is not the same as "free from the foundry's own site." Check licence + variable axes via the Google Fonts API before committing (`brand-identity.md` §3.3). |

---

## Appendix C — Quota reality, with numbers

What the free tiers actually give you, measured rather than advertised.

| Service | Real free allowance | What that means in practice |
|---|---|---|
| **Hugging Face ZeroGPU, anonymous** | IP-keyed, pooled across **all** Spaces | **Effectively zero from a datacenter IP.** Exhausted after one ~10.6 s call. |
| **Hugging Face ZeroGPU, free account** | ~5 GPU-minutes/day | A handful of images, or seconds of video. Not a pipeline. |
| **HF Inference Providers** | **$0.10/month** of credit | ≈ 3–5 FLUX images. Per month. |
| **Pollinations (no auth)** | `/models` now returns exactly `["sana"]`; the `model=` parameter is silently ignored | Weak prompt adherence; queues rather than 429s (measured 2 s, 2 s, **43.7 s**). Not dependable. |
| **Cloudflare Workers AI** | 10,000 Neurons/day | ≈ 220 images/day at 512×512, 4-step. Needs a free CF account + a user-supplied token. |
| **LottieFiles free workspace** | **10 public downloads/month**, no programmatic API | One iteration session burns the month. Generate with `python-lottie` instead. |
| **Netlify free** | **300 credits/month, hard cap, no top-up.** ~15 credits/production deploy, ~20 credits/GB | ~20 deploys at zero traffic; on exhaustion **all sites on the account are paused**. |
| **Cloudflare Pages free** | 500 builds/month, 1 concurrent build, 20,000 files/site, 25 MiB/file, **unlimited static bandwidth** | The only free tier that survives a frame-sequence hero at real traffic. |
| **remove.bg free** | ~40 credits/month | One hero portrait a week. |
| **Poly Haven** | No key, no auth, no rate-limit headers, everything CC0 | Genuinely unlimited. Mirror what you use. |
| **google-webfonts-helper** | No key, no quota | One `curl` per family. |

The pattern is consistent and worth naming: **free compute has collapsed; free *software* has not.** `sharp`, `ffmpeg-static`, `rembg`, Blender, GSAP, Playwright, Lucide, Simple Icons, python-lottie, Poly Haven — all free, all unlimited, all local. Every scarce thing in the table above is somebody else's GPU or somebody else's bandwidth. **Build on the local column and the ladder never runs out.**

---

## §4 — What you genuinely cannot get for free, and what the cheapest fix costs

Four honest gaps. Everything else on this page has a Tier 0 answer that ships.

### 4.1 Good photographs of a business that has none

**No tool fixes this.** Not upscaling, not generation, not clever cropping. A 640×480 WhatsApp-compressed JPEG will not survive a full-bleed hero, and enhancing it produces plastic. This is the single largest quality ceiling in the skill.

- **Free fix:** send the client a written shot list — 15–20 photos with subject, framing, light and orientation specified, plus one 20-second clip. Modern phones shoot 4000×3000. This works, it is free, and it costs the client twenty minutes. **Do this first, always.**
- **Cheapest paid fix:** a local photographer for a half-day, **€150–400** in this market. Delivers correctly-lit, correctly-framed, owned-outright imagery in the aspect ratios you asked for.
- **If neither is possible:** build the typographic site and *say so*. `industry-playbooks.md` has an asset-free route for every trade, and for lawyers, accountants and consultants it is the better build anyway.

### 4.2 AI video generation

Genuinely gone at the free tier, for the reasons in Appendix C. Do not design around it.

- **Free fix:** you do not need it. Every hero in this skill originates from the client's own stills — parallax push, before/after wipe, cross-dissolve scrub, hotspot reveal, frame extraction from a phone clip they already have. **Processing, not generation.**
- **Cheapest paid fix:** Runway / Kling image-to-video at **$15–30/mo**, cancelled after the build. Even then, ask the hard question first: does a generated clip of a business that does not look like this business belong on their homepage? Usually not.

### 4.3 A typeface nobody else is using

Google Fonts is free, excellent, and *everywhere*. Two competitors in the same town can end up on the same face. Typography is the primary luxury lever (`luxury-register.md` §2), so this is the paid rung with the best return in the whole ladder.

- **Free fix:** use a great but less-defaulted family, and do the work in the *system* rather than the *name* — a 1.25–1.333 scale used consistently, real optical sizing, `text-wrap: balance` on headings, and two weights used with discipline will out-class an expensive face used carelessly. Variable-font axes from Fontsource cost nothing and are underused.
- **Cheapest paid fix:** a **one-time** webfont licence from an independent foundry, typically **€30–150**. One-time, self-hosted, no subscription, no expiry, no dependency. If any money is going to be spent on this project, spend it here.

### 4.4 Hosting in the client's own name, without the client

You cannot create an account on someone's behalf, and the free hosts that do not require an account are previews rather than homes.

- **Free fix:** the anonymous claimable Netlify draft gives you a URL to send today, and the client claims it into their own free account in two minutes. Cloudflare Pages free then costs them nothing permanently and permits commercial use.
- **Cheapest paid fix:** a domain, **€10–15/year**, which the client must buy in their own name regardless — never register it in yours. Hosting itself stays at €0 on Cloudflare Pages.
- **What this is really about:** ownership. Everything this skill produces is a static bundle the client possesses outright. Never build a dependency that only you can renew.

### The bottom line

| | |
|---|---|
| **Cost of the entire Tier 0 stack** | **€0**, no signup, no expiry, no account for the client to lose |
| **Highest-return single purchase** | A one-time webfont licence, €30–150 |
| **Highest-return spend overall** | A photographer, €150–400 — it lifts every other stage at once |
| **Cost the client must carry regardless** | A domain, €10–15/year, in their name |
| **What no amount of money buys** | Taste, restraint, and one hard idea executed cleanly (`luxury-register.md`) |

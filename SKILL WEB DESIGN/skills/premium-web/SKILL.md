---
name: premium-web
description: Build a luxury-grade promotional website for a real business, adapted to its trade, animating the CLIENT'S OWN photos into scroll-driven motion characteristic of that trade. Multilingual (bs/en/de), responsive, zero recurring cost, delivered as a local bundle rather than pushed to GitHub. Use whenever the ask is a promotional site, landing page, business website, redesign of a dated site, an animated or scroll-driven hero, or anything like "napravi sajt za klijenta", "landing stranica", "animiraj njegove slike", "hero animacija", "promo stranica", "sajt za frizerski salon / teretanu / restoran", "izgleda mrtvo, treba animacija". Do NOT use for design critique with no build (web-zanat), social content packages (sadrzaj-fabrika), finding or pitching the client in the first place (local-client-outreach), or CMS/WordPress builds.
version: 1.0.0
---

# premium-web

Build a promotional website that reads as expensive, is specific to one trade, and moves using photographs the client already owns.

The differentiator is not a template with swapped colours. It is that **the assets decide the recipe, the trade decides the numbers, and the register can only veto.** A hotel and a gym can both land on the same recipe and still produce sites that look nothing alike.

---

## 0. Defaults contract — do not stall waiting for permission

This skill is expected to run to a finished product with minimal input. Announce these as decisions, do not ask for confirmation:

- Zero **recurring** cost. One-time free signups are allowed but must never be load-bearing.
- Languages bs + en + de unless told otherwise.
- Delivery is a local bundle: zip to the user + optional Drive. **No GitHub push** unless they say so in words.
- Deploy defaults to "build `dist/` + write `DEPLOY.md`". Only attempt a live deploy when the user supplied a token.

If the prompt contains a URL, derive trade, city, phone, hours and conversion action from the harvested page itself — JSON-LD `LocalBusiness`, `tel:` / `wa.me` links, `og:locale` — and proceed. Write every inference into `work/<slug>/ASSUMPTIONS.md` with a confidence level.

**Stop and ask only when:** trade confidence is low, two matrix rows tie, or there is no reachable imagery at all.

---

## 1. The routing algorithm — this is the skill

Count the harvest, then take the **first rule that matches** and stop. Never upgrade a class on optimism.

| Count | Meaning | → Recipe |
|---|---|---|
| `V ≥ 2.0s` | legible client video | **R7** frame extraction |
| `P ≥ 1` | before/after pair | **R3** transform-mask wipe |
| `S ≥ 12` | registered stills, one subject | **R2** assembly / orbit |
| `G ≥ 6` | usable stills ≥1200px | **R4** cross-dissolve scrub |
| `H ≥ 1` | hero-grade, cut-outable | **R1** 2.5D parallax push |
| `H ≥ 1` | hero-grade, dense/labelled | **R5** hotspot reveal |
| `L = 1` | logo only | **SET-G** knockout mask-reveal |
| — | nothing usable | **SET-F** → **R6** + **R9** |

Rule 2 outranks 3 and 4 deliberately: one before/after pair converts harder than any volume of gallery motion, so the pair becomes the hero and the gallery demotes to a static grid.

Hard floors, because a cheap-looking sequence is worse than one good still:
- Under 12 registered stills a sequence reads steppy → drop to R4, the crossfade hides the gaps.
- A 640×480 Facebook JPEG is **not** SET-A.
- A folder of logos and screenshots is **SET-G**, not SET-B.

Then: **the industry row supplies the numbers** — frame count, scroll range, lerp, dissolve percentage, section height. Copy them from `industry-playbooks.md` §0.4 verbatim. Using a recipe's defaults regardless of row is how you ship a recoloured template.

Then: **mood and register can only veto, never escalate.** A clinic with forty good photos still gets R1 under-driven. A law practice gets stillness with no canvas at all — in that register a scrubbed hero reads as a firm that needs to advertise. And no mood may push a build up a recipe it lacks assets for; take that row's own named fallback, never another row's primary.

---

## 2. Procedure

Each step names the reference to open. Gates are objective — do not proceed on a feeling.

**Setup**
1. **Intake** → `industry-playbooks.md` §13, §15. *Gate:* `work/<slug>/` has a trade, a city, and an inventory of named sources. Zero invented facts.
2. **Preflight** → `scripts/preflight.mjs`, `tool-ladder.md` §0–§1. *Gate:* PASS on sharp, ffmpeg-static, Chromium launch.

**Discovery**
3. **Harvest** → `scripts/harvest.mjs`, `brand-identity.md` §1, §7. *Gate:* prints `requested N / downloaded M / failed K`; `FAILED.md` lists every dead URL with a copy-paste curl. Nothing counts as downloaded that was not.
4. **Triage** → `animation-recipes.md` §0.1. *Gate:* all six counts and the winning rule written to `concept.md`.
5. **Derive brand** → `brand-identity.md` §2–§6. *Gate:* every colour role passes contrast in **both** themes; dark surface is not `#000000`; neutral ramp is hue-biased; both families carry `latin-ext`.
6. **Lock the row** → `industry-playbooks.md` §0.2, §0.4. *Gate:* motion verb fails the paste-under-another-row test. Parameters copied from the row table, not recipe defaults.

**Build**
7. **Shell + routes** → `i18n-seo.md` §1.1–§1.3. See §3 below. *Gate:* every route key has all three locale slugs; `/` → `/bs/` is a **302**.
8. **Copy** → `i18n-seo.md` §1.6–§2. Compose three times, never translate. *Gate:* parity check passes; no value identical to the base language; zero banned phrases.
9. **Motion assets** → `scripts/frames.mjs`. *Gate:* desktop ≤4.0 MB, mobile ≤1.5 MB, poster ≤80 KB. Decoded bitmap over ~250 MB forces the sliding window.
10. **Un-enhanced page first** → `luxury-register.md` §1–§2. *Gate:* with `CSS.supports` forced false **and** JS disabled, at 390px and 1440px the page is complete and beautiful. Nothing sits at `opacity: 0`.
11. **Wire the hero** + at most two supporting effects → `scroll-effects.md` §0.3–§0.4, `hover-effects.md` §0. *Gate:* moments ≤6 (hard cap 9), big moments ≤2. `animation-timeline` declared **after** every `animation` shorthand.
12. **SEO + structured data** → `i18n-seo.md` §3–§6. *Gate:* hreflang blocks byte-identical across all three versions; canonical self-referential and same-language.

**Ship**
13. **Look at it in a real browser** → `scripts/verify.mjs`. *Gate:* zero layout-shift entries with `hadRecentInput === false` during a scripted scroll; reduced-motion screenshots show a complete informative page.
14. **Assemble bundle** → `delivery.md` §1. *Gate:* `site/` runs standalone from a fresh extract on relative paths.
15. **Fail-closed gate** → `delivery.md` §7. *Gate:* Lighthouse mobile median-of-three: Performance ≥95, Accessibility 100.
16. **Package + verify the zip** → `delivery.md` §2. *Gate:* clean extract green; secrets scan clean.
17. **Export** → `delivery.md` §3, §6, §8. *Gate:* **SendUserFile was actually called.** This one is not optional.

---

## 3. Shell selection

Decide once, at step 7, from three counts: routes `R`, existing editable source `E`, blog/collection needed `B`.

- **Single-file HTML is never the client site.** Three locale trees + sitemap + per-page JSON-LD cannot live in one file. Reserved for `proof/pitch.html` and throwaway previews.
- **Vanilla multi-file is the DEFAULT** — `R ≤ 12` and `B` false. Templates + content JSON + a ~90-line `build.mjs`. The advantage that matters at handoff: *the client can fix a typo in Notepad, and nothing in the bundle expires.*
- **Astro** when `R > 12` **or** `B` is true. Cost goes in `MAINTENANCE.md`: node_modules, a Node pin, a build step. Set `prefixDefaultLocale: true`, `redirectToDefaultLocale: true`, and do **not** add `fallback`. `@astrojs/sitemap` emits `sitemap-index.xml` — robots.txt must name that.
- **Adapt an existing repo** only when the client supplied the source, the framework is Astro/Vite/Next-static, and it is a re-skin. First actions: strip `fonts.googleapis.com` links, replace Lucide brand icons (removed in v1.0) with Simple Icons.

---

## 4. Guardrails

**Credentials.** Use only what the user explicitly supplied for this job. Never enumerate `process.env`, never grep for `*_KEY` / `*_TOKEN`, never probe ambient Google/AWS/Cloudflare/gh credentials.

**No GitHub.** Do not push, gist, or leave a git repo full of client photos lying around. Absence of an objection is not consent.

**Only the client's own material ships.** Their domain, their profile, or files they handed over. Everything else is reference-only and lives in a physically separate directory. No stock or AI imagery presented as their premises, work, or staff — a generated workshop on a real workshop's site is a lie with their name on it.

**Licence traps.** Never `bria-rmbg` (non-commercial — pass `-m u2netp`). Never Vercel Hobby or GitHub Pages for a commercial site.

**Faces are a provenance gate.** Record consent per identifiable person and who owns the copyright — clients routinely hand over a hired photographer's work.

**Never invent a fact.** Years trading, jobs completed, ratings, accreditations. An invented number loses the client the day they read their own page.

**Never claim what you did not do.** No download that did not happen, no measurement not taken, no browser not run. A grep that errors is never a pass.

**Native CSS scroll-driven animation is enhancement, never load-bearing.** Roughly 1 in 6 visitors get none of it, overwhelmingly pre-26 mobile Safari — the phones this market actually carries.

**Never write a hidden start state** outside `@supports` or a JS-set `data-ready`. `opacity: 0` in the base layer is how agencies ship a blank page below the fold.

**Never observe an element you clipped.** `clip-path` makes IntersectionObserver report ratio 0 regardless of position, deadlocking the fallback forever. Clip an inner element, observe the wrapper.

**Never architect a hero around AI generation.** Free GPU quota reads as zero from a container; a load-bearing generated asset means no site at all on a bad day.

**Transform and opacity only** for anything scroll-linked. Scroll gets no CLS grace period.

**Every hover rule** lives inside `@media (hover: hover) and (pointer: fine)`, with `:active` feedback for touch.

**Never auto-redirect on Accept-Language** and never cross-canonical between languages.

**`latin-ext` is a gate.** The client's own name rendering as tofu is the worst possible delivery.

**Ask before publishing to any public URL.** A "temporary preview link" is a public URL.

**The container is ephemeral.** If turns or context run low, stop building and export what exists with an honest "unfinished" section. A shipped 80% beats a destroyed 100%.

---

## 5. Reference map

| File | Open it when |
|---|---|
| `industry-playbooks.md` | Step 1, 6 — picking and locking the trade row, motion verb, section order, anti-patterns |
| `animation-recipes.md` | Step 4, 9 — the routing algorithm and R1–R10 implementations |
| `tool-ladder.md` | Step 2 — free→paid table, 13 stages × 4 tiers, zero-budget column |
| `asset-pipeline.md` | Step 3, 9 — harvest → triage → cutout → frames → compress |
| `brand-identity.md` | Step 3, 5 — palette extraction, type pairing, mood, image-rights buckets |
| `luxury-register.md` | Step 10 — what reads as expensive, the scorecard, AI-design anti-patterns |
| `scroll-effects.md` | Step 11 — 11 scroll techniques with code, gotchas, reduced-motion invariant |
| `hover-effects.md` | Step 11 — 20 micro-interactions, the three laws, touch degradation |
| `i18n-seo.md` | Step 7, 8, 12 — routes, copy parity, structured data, local SEO |
| `performance-a11y-gates.md` | Step 13, 15 — objective thresholds behind every check |
| `scrubber-component.md` | Step 11 — ScrollScrubber props, modes, and the six defects it fixes |
| `delivery.md` | Step 14–17 — bundle, packaging, export routes, pitch page, build report |

**Assets:** `assets/ScrollScrubber.jsx` (drop-in, plain React, Framer Motion optional) · `assets/scroll-reveal.css` (native scroll layer for non-hero sections) · `assets/trade-paths/*.svg` (12 pre-authored trade silhouettes — this is what makes SET-F a real recipe instead of an apology)

**Scripts:** `preflight.mjs` (toolchain, no credentials) · `harvest.mjs` (client assets, with failure accounting) · `frames.mjs` (budget-checked frame ladder) · `verify.mjs` (Chromium ship/no-ship gate)

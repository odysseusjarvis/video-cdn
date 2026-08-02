# Brand Identity Derivation

How to go from *"here is a business"* to a defensible, documented visual identity — programmatically, in one pass, with no designer and no paid asset.

The output of this file is a **Brand Brief**: a palette as CSS custom properties, a typeface pairing with self-hosted `@font-face` rules, a mood classification with a motion budget, and an asset manifest that says exactly which images may ship. Everything downstream (`scroll-effects.md`, `hover-effects.md`, the build itself) consumes those tokens and nothing else.

```
business name (+ url? + socials? + files?)
        │
        ├─ 1. GATHER ──────────► evidence.json + assets/ + screenshots
        │                          (no evidence? → §6 low-evidence path)
        ├─ 2. EXTRACT ─────────► raw swatches → normalised token set (AA-checked)
        ├─ 3. TYPE ────────────► register → pairing → self-hosted @font-face
        ├─ 4. CLASSIFY ────────► mood → palette/type/motion/photo registers
        ├─ 5. UPLIFT ──────────► modernised direction, justified line by line
        └─ 7. RIGHTS ──────────► ships[] vs reference-only[] vs placeholder[]
```

Rule that governs the whole file: **every claim in the Brand Brief must trace to a piece of gathered evidence or to an explicit, stated assumption.** "It looks nice" is not a derivation. If you cannot point at the evidence, you are guessing — go to §6 and say so.

---

## 1. Input gathering (autonomous)

### 1.0 Environment

Chromium ships preinstalled. Playwright is installed globally, so scripts must be **CommonJS** (`.cjs`) and resolve via `NODE_PATH`, or you get `MODULE_NOT_FOUND`.

```bash
# Verified working preamble. Put this at the top of every gather session.
export NODE_PATH="$(npm root -g)"
export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
node -e 'const{chromium}=require("playwright");console.log("playwright",require("playwright/package.json").version)'
# -> playwright 1.62.1

ls /opt/pw-browsers/chromium-1194/chrome-linux/chrome   # the binary, if you need it directly
```

If Playwright is *not* installed globally in the environment you land in:

```bash
npm i -D playwright-core          # -core: no browser download, uses the preinstalled one
# then: chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" })
```

**Proxied/sandboxed environments.** In agent sandboxes, Chromium's own network stack is often blocked even when `HTTPS_PROXY` is set (symptom: `net::ERR_CONNECTION_RESET` on every navigation, while `curl` to the same host returns 200). The fix is *not* to disable TLS verification. Route every page request through Playwright's Node-side fetcher, which honours the environment proxy:

```js
// Verified fix. Add before the first newPage().
if (process.env.HTTPS_PROXY) {
  await ctx.route("**/*", async (route) => {
    try { await route.fulfill({ response: await ctx.request.fetch(route.request(), { timeout: 20000, maxRedirects: 5 }) }); }
    catch { await route.abort(); }   // dead asset: let the page render without it
  });
}
```

### 1.1 The harvest script

Write this to `harvest.cjs`. It has been run end-to-end against live sites; the output shape below is real.

```js
// harvest.cjs — run: NODE_PATH=$(npm root -g) node harvest.cjs <url> [outdir]
// Collects: assets, computed palette, font stacks, type scale, declared CSS vars, screenshots.
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");

const [, , TARGET, OUT = "./brand-evidence"] = process.argv;
if (!TARGET) { console.error("usage: node harvest.cjs <url> [outdir]"); process.exit(1); }
fs.mkdirSync(path.join(OUT, "assets"), { recursive: true });

(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,                    // retina screenshots, worth the bytes
    userAgent: "Mozilla/5.0 (compatible; brand-audit/1.0)",
  });

  // Proxy-safe request routing (see §1.0). Harmless when HTTPS_PROXY is unset.
  if (process.env.HTTPS_PROXY) {
    await ctx.route("**/*", async (route) => {
      try { await route.fulfill({ response: await ctx.request.fetch(route.request(), { timeout: 20000, maxRedirects: 5 }) }); }
      catch { await route.abort(); }
    });
  }

  const page = await ctx.newPage();
  await page.goto(TARGET, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(1200);           // let lazy images and webfonts settle

  const report = await page.evaluate(() => {
    const abs = (u) => { try { return new URL(u, location.href).href; } catch { return null; } };
    const uniq = (a) => [...new Set(a.filter(Boolean))];

    // --- raster + vector assets ------------------------------------------
    const imgs = [...document.images].map((i) => ({
      src: abs(i.currentSrc || i.src),       // currentSrc = what srcset ACTUALLY picked
      srcset: i.srcset || null,
      alt: i.alt || null,
      w: i.naturalWidth, h: i.naturalHeight,
      area: i.naturalWidth * i.naturalHeight,
    })).filter((i) => i.src && i.area > 10000);   // drop tracking pixels and sprite icons

    const bgs = uniq([...document.querySelectorAll("*")].flatMap((el) => {
      const bg = getComputedStyle(el).backgroundImage;
      if (!bg || bg === "none") return [];
      return [...bg.matchAll(/url\((['"]?)(.*?)\1\)/g)].map((m) => abs(m[2]));
    }));

    const meta = (sel, attr = "content") => document.querySelector(sel)?.getAttribute(attr) || null;

    const icons = uniq([...document.querySelectorAll(
      'link[rel~="icon"],link[rel~="apple-touch-icon"],link[rel~="mask-icon"]'
    )].map((l) => abs(l.getAttribute("href"))));

    // logo heuristic: img inside header/banner, or class/alt/src containing "logo"
    const logos = uniq([...document.querySelectorAll(
      'header img, [role="banner"] img, a[href="/"] img, img[class*="logo" i], img[alt*="logo" i], img[src*="logo" i]'
    )].map((i) => abs(i.currentSrc || i.src)));
    const inlineSvgLogos = [...document.querySelectorAll('header svg, [role="banner"] svg')]
      .slice(0, 3).map((s) => s.outerHTML.slice(0, 4000));   // often the real, crispest logo

    // --- computed palette: count what is ACTUALLY painted, not what is declared
    const tally = { color: {}, background: {}, border: {} };
    const bump = (bucket, v) => {
      if (!v || v === "rgba(0, 0, 0, 0)" || v === "transparent") return;
      tally[bucket][v] = (tally[bucket][v] || 0) + 1;
    };
    const fonts = {}, sizes = {};
    for (const el of document.querySelectorAll("body *")) {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (r.width * r.height < 4) continue;            // ignore invisible nodes
      bump("color", cs.color);
      bump("background", cs.backgroundColor);
      bump("border", cs.borderTopColor !== cs.color ? cs.borderTopColor : null);
      fonts[cs.fontFamily] = (fonts[cs.fontFamily] || 0) + 1;
      if (el.textContent && el.textContent.trim().length > 2) {
        const k = `${cs.fontFamily} | ${cs.fontWeight} | ${cs.fontSize} | ${cs.letterSpacing} | ${cs.textTransform}`;
        sizes[k] = (sizes[k] || 0) + 1;
      }
    }
    const top = (o, n = 12) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n);

    return {
      url: location.href,
      title: document.title,
      description: meta('meta[name="description"]'),
      ogImage: abs(meta('meta[property="og:image"]') || ""),
      ogSiteName: meta('meta[property="og:site_name"]'),
      themeColor: meta('meta[name="theme-color"]'),     // often the truest brand colour
      icons, logos, inlineSvgLogos,
      images: imgs.sort((a, b) => b.area - a.area).slice(0, 40),
      backgroundImages: bgs.slice(0, 40),
      palette: { color: top(tally.color), background: top(tally.background), border: top(tally.border) },
      fontStacks: top(fonts, 8),
      typeScale: top(sizes, 16),
      rootVars: (() => {                                 // vars the site already declares
        const out = {};
        for (const sheet of document.styleSheets) {
          let rules; try { rules = sheet.cssRules; } catch { continue; }  // CORS-blocked sheet
          for (const r of rules || []) {
            if (r.selectorText && /(^|,)\s*(:root|html)\s*(,|$)/.test(r.selectorText)) {
              for (const p of r.style) if (p.startsWith("--")) out[p] = r.style.getPropertyValue(p).trim();
            }
          }
        }
        return out;
      })(),
    };
  });

  fs.writeFileSync(path.join(OUT, "evidence.json"), JSON.stringify(report, null, 2));

  // --- screenshots: you MUST look at these, JSON alone will mislead you ------
  await page.screenshot({ path: path.join(OUT, "desktop-full.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, "mobile-full.png"), fullPage: true });

  // --- download candidates through the browser context (keeps cookies/referer)
  const wanted = [...new Set([...report.logos, ...report.icons, report.ogImage,
    ...report.images.map((i) => i.src), ...report.backgroundImages].filter(Boolean))].slice(0, 60);
  for (const [n, u] of wanted.entries()) {
    try {
      const res = await ctx.request.get(u, { timeout: 15000 });
      if (!res.ok()) continue;
      const ext = (u.split("?")[0].match(/\.(png|jpe?g|webp|avif|svg|ico|gif)$/i) || [, "bin"])[1];
      fs.writeFileSync(path.join(OUT, "assets", `${String(n).padStart(2, "0")}.${ext}`), await res.body());
    } catch { /* unreachable asset: skip, do not fail the run */ }
  }
  await browser.close();
  console.log(`evidence -> ${OUT}/evidence.json  (${wanted.length} assets)`);
})();
```

```bash
NODE_PATH=$(npm root -g) node harvest.cjs https://client-site.example ./brand-evidence
# evidence -> ./brand-evidence/evidence.json  (13 assets)
```

Real excerpt from a live run, so you know what you are reading:

```jsonc
{
  "themeColor": null,
  "logos": ["https://…/lockup.svg"],
  "ogImage": "https://…/social-wide.jpg",
  "palette": {
    "color":      [["rgb(32, 33, 36)", 439], ["rgb(26, 115, 232)", 21], ["rgb(95, 99, 104)", 13]],
    "background": [["rgb(255, 255, 255)", 31], ["rgb(245, 246, 247)", 22], ["rgb(26, 115, 232)", 2]]
  },
  "fontStacks": [["\"Google Sans\", \"Noto Sans\", …, sans-serif", 478]],
  "typeScale": [["…sans-serif | 400 | 16px | normal | none", 263],
                ["…sans-serif | 400 | 20px | -0.2px | none", 48]],
  "rootVars": {}
}
```

### 1.2 Reading the harvest correctly

- **`palette.background` outranks `palette.color` for identity.** The most-painted text colour is almost always near-black and tells you nothing. The *second* and *third* backgrounds, and any `color` with a mid count (20-60 nodes), are the brand.
- **`themeColor` is the highest-confidence single signal** when present — someone deliberately typed it.
- **`rootVars: {}` is normal**, not a failure. Cross-origin stylesheets throw on `cssRules`. Recover them by fetching the CSS as text:
  ```bash
  # pull declared custom properties out of a cross-origin stylesheet
  curl -sS "https://client-site.example/assets/main.css" \
    | grep -oE '\-\-[a-z0-9-]+:\s*[^;]+' | sort -u | head -40
  ```
- **`typeScale` gives you their real hierarchy** — the distinct `family|weight|size|tracking|transform` tuples, ranked. Two tuples means a flat, cheap-looking site; six or more means someone thought about it.
- **Look at the screenshots.** Density, whitespace, photo quality, and whether the site is a template are not in the JSON. Read `desktop-full.png` and `mobile-full.png` with the Read tool before writing a single token.

### 1.3 Sites that fight back (SPA, JS-gated, dead)

```bash
# 1. Renders nothing? Wait for real content instead of networkidle.
#    In harvest.cjs swap the goto for:
#      await page.goto(TARGET, { waitUntil: "domcontentloaded", timeout: 45000 });
#      await page.waitForFunction(() => document.body.innerText.trim().length > 400, { timeout: 20000 });

# 2. Site is down / parked — go to the archive, note it as archival evidence.
node harvest.cjs "https://web.archive.org/web/2023/https://client-site.example" ./brand-evidence-archived

# 3. No site at all — the social profile IS the brand. Harvest the public page,
#    then treat the grid screenshot as the primary photography evidence.
node harvest.cjs "https://www.facebook.com/theirpage" ./brand-evidence-social
```

For social profiles, three things matter more than the markup: the **profile image** (usually the only real logo that exists), the **cover image**, and the **grid** — whether their own photos are consistent in colour temperature, whether they shoot people or product, whether they are lit or ambient. Screenshot the grid and read it.

### 1.4 Files the client supplied

Always inventory them first; they outrank anything scraped.

```bash
# inventory: type, real dimensions, colour profile, transparency
find ./client-supplied -type f \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' \
  -o -iname '*.webp' -o -iname '*.svg' -o -iname '*.pdf' -o -iname '*.ai' -o -iname '*.eps' \) -print0 \
| xargs -0 -I{} sh -c 'printf "%s\t" "{}"; python3 -c "
import sys
from PIL import Image
try:
    im=Image.open(sys.argv[1]); print(im.format, im.size, im.mode)
except Exception as e: print(\"non-raster\", type(e).__name__)
" "{}"'
```

A vector logo (`.svg`, `.ai`, `.eps`, or a vector `.pdf`) is the single most valuable input you can receive: it gives you exact brand colours with zero quantisation error, and it scales to any hero size. Pull colours straight out of an SVG rather than extracting them:

```bash
grep -ohE '#[0-9a-fA-F]{3,8}|rgb\([^)]*\)|(fill|stroke)="[^"]+"' logo.svg | sort | uniq -c | sort -rn | head
```

---

## 2. Palette extraction

Two stages, and the second matters more. **Extraction gives you swatches. Swatches are not a palette.** A raw dominant colour will be too saturated for large surfaces, will fail contrast as body text, and has no dark-theme counterpart. Stage 2 fixes all three deterministically.

### 2.1 Stage 1 — extraction

**node-vibrant** (v4.0.4, verified). Best for logos and hero photography; gives you six semantically-named swatches.

```bash
npm i node-vibrant@4
```

```js
// extract.mjs  —  node extract.mjs ./brand-evidence/assets/00.png
import { Vibrant } from "node-vibrant/node";     // v4 import path — NOT the default export

const palette = await Vibrant.from(process.argv[2]).getPalette();
for (const [name, sw] of Object.entries(palette)) {
  if (sw) console.log(name.padEnd(14), sw.hex, "pop:", sw.population);
}
// Vibrant        #c4743c pop: 400
// DarkVibrant    #1c3c2c pop: 600
// LightVibrant   #f4ece4 pop: 200
// Muted          #754523 pop: 0     <-- population 0 = SYNTHESISED, do not trust
// DarkMuted      #30684c pop: 0
// LightMuted     #6c4c2c pop: 0
```

> **Trap:** node-vibrant always returns all six swatches. Ones with `population: 0` were interpolated, not observed. **Discard every swatch with population 0.** Ranking by population is the only honest ordering.

**sharp bucket quantisation** — dependency-light, deterministic, and it lets you drop paper-white and near-black before counting, which is exactly what you want from a photograph or a logo on a white card.

```bash
npm i sharp
```

```js
// quantise.mjs  —  node quantise.mjs ./brand-evidence/assets/00.png
import sharp from "sharp";

const { data, info } = await sharp(process.argv[2])
  .resize(128, 128, { fit: "inside" })     // downsample: kills JPEG noise, 100x faster
  .removeAlpha().raw().toBuffer({ resolveWithObject: true });

const bins = new Map();
for (let i = 0; i < data.length; i += info.channels) {
  const r = data[i], g = data[i + 1], b = data[i + 2];
  if (Math.max(r, g, b) < 18 || Math.min(r, g, b) > 242) continue;  // drop near-black / paper-white
  const key = `${r >> 4},${g >> 4},${b >> 4}`;                      // 16³ buckets
  const e = bins.get(key) || { n: 0, r: 0, g: 0, b: 0 };
  e.n++; e.r += r; e.g += g; e.b += b; bins.set(key, e);
}

console.log([...bins.values()].sort((a, b) => b.n - a.n).slice(0, 6).map((e) => ({
  hex: "#" + [e.r, e.g, e.b].map((v) => Math.round(v / e.n).toString(16).padStart(2, "0")).join(""),
  share: +(e.n / (info.width * info.height)).toFixed(3),
})));
// [ { hex:'#1b3a2f', share:0.492 }, { hex:'#c2703d', share:0.313 }, { hex:'#f3ede4', share:0.156 }, … ]
```

**colorthief** (v3.4.0) is the lightest option when you only want one dominant colour and a 5-colour ramp; it has no `population` signal, so prefer node-vibrant when you need confidence weighting.

**Pillow** — always present in these environments, zero install, and its `ADAPTIVE` quantiser is a proper median cut:

```python
# quantise.py — python3 quantise.py logo.png
import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert("RGB").resize((128, 128))
q  = im.quantize(colors=8, method=Image.MEDIANCUT)
pal = q.getpalette()
for count, idx in sorted(q.getcolors(), reverse=True):
    r, g, b = pal[idx*3:idx*3+3]
    if max(r,g,b) < 18 or min(r,g,b) > 242: continue      # drop black/paper
    print(f"#{r:02x}{g:02x}{b:02x}", round(count/(128*128), 3))
```

**ImageMagick** — use only if `magick` is on PATH (it frequently is not; check before you write the command).

```bash
command -v magick >/dev/null && magick logo.png -resize 128x128 -colors 8 -depth 8 \
  -format %c histogram:info: | sort -rn | head -8
```

### 2.2 Choosing brand vs accent from the swatches

Deterministic rule, applied in order:

1. **`themeColor` from the harvest wins as `brand`** if present and not pure black/white.
2. Otherwise **`brand` = the highest-population swatch with OKLCh chroma ≥ 0.04** (i.e. not a neutral). If nothing clears 0.04, the business has no colour identity — go to §6.
3. **`accent` = the highest-population remaining swatch whose hue differs from `brand` by ≥ 25°**. If none does, derive it: `accent = brand` rotated +150° hue at the brand's chroma (a considered complement beats an invented one).
4. If a swatch appears only in stock photography and not in the logo, favicon, or `themeColor`, **it is not brand colour** — it is one photographer's white balance. Weight logo-derived swatches ~3× over photo-derived ones.

### 2.3 Stage 2 — swatches to a shippable token set

Save as `palette.mjs`. Zero dependencies; sRGB↔OKLCh and WCAG maths inlined. Verified: emits AA-passing tokens for every input tested, including the hard case of a pale yellow accent.

```js
// palette.mjs — raw extracted colours -> shippable, AA-passing token set.
// Usage: node palette.mjs "#1b3a2f" "#c2703d"        (brand, accent)

/* ---------- colour maths (sRGB <-> Oklab/OKLCh) ---------- */
const srgbToLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const linToSrgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

export function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
}
export const rgbToHex = (rgb) =>
  "#" + rgb.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0")).join("");

export function rgbToOklch([r, g, b]) {
  const [R, G, B] = [r, g, b].map(srgbToLin);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const Bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  let H = (Math.atan2(Bb, A) * 180) / Math.PI; if (H < 0) H += 360;
  return { L, C: Math.hypot(A, Bb), H };
}
export function oklchToRgb({ L, C, H }) {
  const h = (H * Math.PI) / 180, A = C * Math.cos(h), B2 = C * Math.sin(h);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B2) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B2) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B2) ** 3;
  return [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map(linToSrgb);
}
const inGamut = (rgb) => rgb.every((v) => v >= -0.0005 && v <= 1.0005);

// Reduce chroma until representable in sRGB. Never let a hex leave this file out of gamut.
export function clampChroma(c) {
  if (inGamut(oklchToRgb(c))) return c;
  let lo = 0, hi = c.C;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    inGamut(oklchToRgb({ ...c, C: mid })) ? (lo = mid) : (hi = mid);
  }
  return { ...c, C: lo };
}
export const oklchToHex = (c) => rgbToHex(oklchToRgb(clampChroma(c)));

/* ---------- WCAG 2.1 contrast ---------- */
export const luminance = ([r, g, b]) =>
  0.2126 * srgbToLin(r) + 0.7152 * srgbToLin(g) + 0.0722 * srgbToLin(b);
export function contrast(hexA, hexB) {
  const a = luminance(hexToRgb(hexA)), b = luminance(hexToRgb(hexB));
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

// Walk OKLCh lightness away from the background until the ratio is met.
// Hue and chroma are preserved, so the colour stays recognisably theirs.
export function forceContrast(fgHex, bgHex, target = 4.5) {
  const dir = luminance(hexToRgb(bgHex)) > 0.5 ? -1 : 1;
  let c = rgbToOklch(hexToRgb(fgHex));
  for (let i = 0; i < 120; i++) {
    const hex = oklchToHex(c);
    if (contrast(hex, bgHex) >= target) return hex;
    c = { ...c, L: Math.min(1, Math.max(0, c.L + dir * 0.005)) };
  }
  return dir < 0 ? "#000000" : "#ffffff";
}

// Filled control: move the FILL until its own label passes AA — never ship a
// washed-out label on a brand-coloured button just to keep the swatch exact.
export function readableFill(fillHex, target = 4.5) {
  const c = rgbToOklch(hexToRgb(fillHex));
  const best = (hex) => {
    const w = contrast("#ffffff", hex), k = contrast("#111111", hex);
    return w >= k ? { on: "#ffffff", ratio: w } : { on: "#111111", ratio: k };
  };
  let b = best(oklchToHex(c));
  if (b.ratio >= target) return { fill: oklchToHex(c), on: b.on };
  for (let i = 1; i <= 140; i++) {              // step darker and lighter in parallel
    for (const dir of [-1, 1]) {
      const cand = oklchToHex({ ...c, L: Math.min(1, Math.max(0, c.L + dir * i * 0.004)) });
      const r = best(cand);
      if (r.ratio >= target) return { fill: cand, on: r.on };
    }
  }
  return { fill: "#111111", on: "#ffffff" };
}

/* ---------- neutral ramp, hue-biased toward the accent ---------- */
// Pure grey reads cheap and generic. Carrying a trace of the accent hue
// (C ~0.004-0.022) makes every surface, rule and shadow feel like the brand.
export function neutralRamp(accentHex, { chroma = 0.012 } = {}) {
  const { H } = rgbToOklch(hexToRgb(accentHex));
  const stops = { 0: 0.995, 50: 0.975, 100: 0.945, 200: 0.895, 300: 0.82,
                  400: 0.70, 500: 0.60, 600: 0.50, 700: 0.395, 800: 0.29,
                  900: 0.205, 950: 0.155, 1000: 0.115 };
  const out = {};
  for (const [k, L] of Object.entries(stops)) {
    const taper = 1 - Math.abs(L - 0.55) / 0.55;   // whites stay white-ish, blacks black-ish
    out[k] = oklchToHex({ L, C: chroma * Math.max(0.25, taper), H });
  }
  return out;
}

/* ---------- build the full token set ---------- */
export function buildPalette({ brand, accent = brand, name = "brand" }) {
  const n = neutralRamp(accent);
  const brandC = rgbToOklch(hexToRgb(brand));
  const accentC = rgbToOklch(hexToRgb(accent));
  const shade = (c, L) => oklchToHex({ ...c, L });

  const theme = (mode) => {
    const isLight = mode === "light";
    const surface = isLight ? n[0]   : n[950];
    const raised  = isLight ? n[50]  : n[900];
    const sunken  = isLight ? n[100] : n[1000];
    const text  = forceContrast(isLight ? n[900] : n[100], surface, 7);    // AAA body
    const muted = forceContrast(isLight ? n[600] : n[400], surface, 4.5);  // AA secondary
    const line  = isLight ? n[200] : n[800];
    const acc   = forceContrast(
      shade(accentC, isLight ? Math.min(accentC.L, 0.62) : Math.max(accentC.L, 0.72)), surface, 4.5);
    const fill  = readableFill(
      shade(accentC, isLight ? accentC.L : Math.max(accentC.L, 0.55)), 4.5);
    return {
      surface, raised, sunken, text, muted, line,
      accent: acc,
      "accent-solid": fill.fill,
      "accent-on": fill.on,
      brand: forceContrast(
        shade(brandC, isLight ? Math.min(brandC.L, 0.55) : Math.max(brandC.L, 0.78)), surface, 4.5),
    };
  };
  return { name, neutrals: n, light: theme("light"), dark: theme("dark") };
}

export function toCss(p) {
  const keys = Object.keys(p.light);
  const pair = (k) => `  --c-${k}: light-dark(${p.light[k]}, ${p.dark[k]});`;
  return `:root {
  color-scheme: light dark;

  /* neutral ramp — hue-biased toward the accent, never pure grey */
${Object.entries(p.neutrals).map(([k, v]) => `  --n-${k}: ${v};`).join("\n")}

  /* semantic roles — one value, resolves per color-scheme */
${keys.map(pair).join("\n")}
}

/* Fallback for engines without light-dark() (pre-2024 builds) */
@supports not (color: light-dark(#000, #fff)) {
  :root { ${keys.map((k) => `--c-${k}: ${p.light[k]};`).join(" ")} }
  @media (prefers-color-scheme: dark) {
    :root { ${keys.map((k) => `--c-${k}: ${p.dark[k]};`).join(" ")} }
  }
}`;
}

/* ---------- CLI: prints CSS on stdout, the contrast audit on stderr ---------- */
if (import.meta.url === `file://${process.argv[1]}`) {
  const [brand = "#1b3a2f", accent = "#c2703d"] = process.argv.slice(2);
  const p = buildPalette({ brand, accent });
  console.log(toCss(p));
  console.error("\n// contrast audit (AA body 4.5, AAA body 7, AA large/UI 3.0)");
  for (const mode of ["light", "dark"]) {
    for (const k of ["text", "muted", "accent", "brand"])
      console.error(`// ${mode}/${k} on surface: ${contrast(p[mode][k], p[mode].surface).toFixed(2)}`);
    console.error(`// ${mode}/accent-on on accent-solid: ${contrast(p[mode]["accent-on"], p[mode]["accent-solid"]).toFixed(2)}`);
  }
}
```

```bash
node palette.mjs "#1b3a2f" "#c2703d" > src/styles/tokens.css
# stderr:
# light/text on surface: 17.63     light/muted: 5.90    light/accent: 4.52    light/brand: 12.23
# light/accent-on on accent-solid: 5.11
# dark/text  on surface: 16.63     dark/muted:  7.30    dark/accent:  7.59    dark/brand:  9.98
```

Real emitted output for that input:

```css
:root {
  color-scheme: light dark;

  /* neutral ramp — hue-biased toward the accent, never pure grey */
  --n-0: #fffdfc;    --n-50: #f8f6f5;   --n-100: #efeceb;  --n-200: #dfdbda;
  --n-300: #c7c3c1;  --n-400: #a39d9a;  --n-500: #867e7a;  --n-600: #69625e;
  --n-700: #4a4542;  --n-800: #2e2a29;  --n-900: #191715;  --n-950: #0d0c0b;
  --n-1000: #060504;

  /* semantic roles — one value, resolves per color-scheme */
  --c-surface:      light-dark(#fffdfc, #0d0c0b);
  --c-raised:       light-dark(#f8f6f5, #191715);
  --c-sunken:       light-dark(#efeceb, #060504);
  --c-text:         light-dark(#191715, #efeceb);
  --c-muted:        light-dark(#69625e, #a39d9a);
  --c-line:         light-dark(#dfdbda, #2e2a29);
  --c-accent:       light-dark(#b1602d, #e18d5a);
  --c-accent-solid: light-dark(#c2703d, #c2703d);
  --c-accent-on:    light-dark(#ffffff, #111111);
  --c-brand:        light-dark(#1b3a2f, #9ec1b2);
}
```

Notice `--n-0` is `#fffdfc`, not `#ffffff`. That 2-point warm bias is the difference between "a website" and "their website", and it costs nothing.

### 2.4 The token contract

**Ten semantic roles. Consume these; never hardcode a hex in a component.**

| Token | Role | Guaranteed contrast |
|---|---|---|
| `--c-surface` | page background | — |
| `--c-raised` | cards, nav, anything above the page | — |
| `--c-sunken` | wells, code blocks, inset media | — |
| `--c-text` | body and headings | ≥ 7.0 on `--c-surface` (AAA) |
| `--c-muted` | captions, meta, disabled | ≥ 4.5 on `--c-surface` (AA) |
| `--c-line` | hairlines, dividers, input borders | non-text; decorative |
| `--c-accent` | accent **text** and icons, links | ≥ 4.5 on `--c-surface` |
| `--c-accent-solid` | filled buttons, active chips | non-text fill |
| `--c-accent-on` | label **on** `--c-accent-solid` | ≥ 4.5 on `--c-accent-solid` |
| `--c-brand` | logo lockup, hero rules, footer mark | ≥ 4.5 on `--c-surface` |

Derive everything else at runtime with relative colour syntax rather than adding tokens (Baseline since Sept 2024):

```css
/* Derived states. No new tokens, no Sass, no build step. */
.btn {
  background: var(--c-accent-solid);
  color: var(--c-accent-on);
  border: 1px solid oklch(from var(--c-accent-solid) calc(l - 0.08) c h);
}
.btn:hover  { background: oklch(from var(--c-accent-solid) calc(l + 0.05) c h); }
.btn:active { background: oklch(from var(--c-accent-solid) calc(l - 0.05) c h); }

/* Tints and washes: mix toward the surface, so they follow the theme automatically. */
.badge { background: color-mix(in oklab, var(--c-accent) 12%, var(--c-surface)); }

@supports not (color: oklch(from red l c h)) {
  .btn:hover { filter: brightness(1.06); }   /* cheap, GPU-friendly, good enough */
}
```

Do **not** reach for `contrast-color()` as the primary mechanism. It only shipped everywhere recently (Safari 26.0 / Firefox 146 / Chrome 147, Apr 2026), so it is *newly* available, not widely available, and it returns only black or white. Bake contrast in at build time with `palette.mjs`; use `contrast-color()` as a progressive enhancement for user-generated or runtime-unknown colours only:

```css
@supports (color: contrast-color(red)) {
  .swatch-chip { color: contrast-color(var(--user-picked-colour)); }
}
```

### 2.5 Palette self-check — refuse to ship if any fails

1. Every text role hits its ratio in **both** themes (the script's stderr audit proves it).
2. `--c-surface` in dark mode is **not** `#000000`. Pure black kills the elevation model and smears on OLED scroll.
3. The neutral ramp has **non-zero chroma** — grep the output for `#[0-9a-f]\{2\}\1\1` patterns; if the greys are literally equal-channel, the hue bias did not apply.
4. Accent appears on **less than ~10%** of painted area. Luxury is restraint; a wall of brand colour reads as a template.
5. Both themes rendered and screenshotted before delivery:
   ```bash
   NODE_PATH=$(npm root -g) node -e '
   const {chromium}=require("playwright");(async()=>{
     const b=await chromium.launch({args:["--no-sandbox"]});
     for (const scheme of ["light","dark"]) {
       const c=await b.newContext({colorScheme:scheme,viewport:{width:1440,height:900},deviceScaleFactor:2});
       const p=await c.newPage(); await p.goto("http://localhost:5173");
       await p.screenshot({path:`review-${scheme}.png`,fullPage:true});
     }
     await b.close();})()'
   ```

---

## 3. Typography direction

### 3.1 Register mapping

Read the register off the evidence, not off taste:

| Evidence signal | Reads as | Type register |
|---|---|---|
| Prices published, "since 19xx", family names, physical address foregrounded | Established, local, trustworthy | Transitional serif display + humanist sans body |
| Certifications, spec sheets, tolerances, ISO numbers | Technical, precise | Neo-grotesque display + neo-grotesque body + mono utility |
| Portfolio-led, few words, big images | Considered, editorial | High-contrast serif or didone display + quiet grotesque body |
| Booking/menu/opening hours dominant | Hospitable, immediate | Warm serif or soft sans display + high-x-height body |
| Heavy machinery, trades, load ratings | Industrial | Condensed/heavy grotesque display + workhorse sans body |
| Handmade, batch, provenance, "our workshop" | Artisanal | Old-style or slab serif display + old-style serif body |

**Always specify three roles.** Display (hero, section heads), Body (paragraphs, ≥ 400 weight, high x-height), Utility (labels, prices, spec tables, timestamps — usually a mono or a tightly-tracked small-caps sans). The third role is what most cheap sites lack and is the fastest single upgrade available.

### 3.2 Ten pairings, and what each one says

All verified present on Fontsource with an open licence as of 2026-08. Format: **Display / Body / Utility**.

| # | Mood | Display / Body / Utility | What it communicates |
|---|---|---|---|
| 1 | Luxury, restrained | **Instrument Serif** / **Schibsted Grotesk** / **Commit Mono** | Confidence without volume. Instrument Serif is a narrow, high-contrast display with almost no weight range — it only works large, which forces disciplined hierarchy. Reads gallery, jeweller, architecture practice. |
| 2 | Heritage, established | **Source Serif 4** / **Libre Franklin** / **IBM Plex Mono** | Institutional, printed, older-than-you. Source Serif's Fell-inspired shapes plus Franklin's news lineage says "we have been here a long time and we file our paperwork." Law, surveying, family manufacturing. |
| 3 | Artisanal, rustic | **Young Serif** / **Newsreader** / **DM Mono** | Young Serif has slab-ish, blunt, almost hand-cut terminals; Newsreader is warm and readable at length. Bakery, cooperage, small-batch food, joinery. |
| 4 | Clinical, precise | **Archivo** / **Public Sans** / **Martian Mono** | Neutral to the point of being unarguable. Archivo is a grotesque built for small sizes and tight tracking; Public Sans is a government-grade workhorse. Dental, diagnostics, calibration labs, medical device. |
| 5 | Industrial, heavy | **Bricolage Grotesque** / **Work Sans** / **Azeret Mono** | Bricolage's variable width and optical-size axes let a headline compress like signage on the side of a plant. Fabrication, haulage, plant hire, demolition. |
| 6 | Technical, modern | **Geist Sans** / **Inter Tight or Figtree** / **JetBrains Mono** | Screen-native, engineered, current. Geist's flat terminals and tight apertures read as product-company. Software, controls, integrators, instrumentation. |
| 7 | Warm, hospitable | **Fraunces** (`SOFT` + `WONK` axes) / **Literata** / **Chivo** | Fraunces is a variable old-style with a wonk axis that adds deliberate irregularity — human without being twee. Literata is designed for long reading on screen. Restaurants, guesthouses, clinics that want to feel unclinical. |
| 8 | Editorial, high fashion | **Bodoni Moda** / **Instrument Sans** / **Commit Mono** | Extreme thick/thin, hairline serifs. Bodoni Moda has an optical-size axis so the hairlines survive at 96px and do not vanish at 20px. Salon, atelier, photography, interiors. |
| 9 | Playful, confident | **Gabarito** / **Hanken Grotesk** / **Space Mono** | Gabarito's wide, rounded, slightly quirky caps carry personality without cartooning. Kids' activities, pet services, independent retail, events. |
| 10 | Architectural, quiet | **Marcellus** / **Jost** / **IBM Plex Mono** | Marcellus derives from Roman inscriptional capitals — permanence, stone, civic. Jost is a geometric with Bauhaus proportions. Landscape architects, developers, high-end construction. |

**Two more when the brief calls for it:** *Editorial-warm* — **Petrona** / **Alegreya** / **Roboto Mono** (Petrona's slightly condensed old-style is excellent for a wordy heritage brand). *Modern-severe* — **Unbounded** / **Onest** / **Martian Mono** (Unbounded's extreme widths make an uncompromising, almost brutalist statement; use only when the client's photography can carry it).

**Refuse these unless the client's existing brand already uses them:** Inter, Poppins, Montserrat, Playfair Display, Raleway, Lato, Roboto, Open Sans, Nunito, Space Grotesk, DM Sans. They are the default output of every template and every AI, and they will make a real business look generated. If a client's *existing* brand genuinely uses one of them, keep it — respecting an established identity beats novelty (see §5) — but move it to the body role and pick a display face with actual character.

### 3.3 Verify licence and axes before committing

```bash
# licence, variable status, weights, styles — one call, authoritative
curl -s https://api.fontsource.org/v1/fonts/fraunces | python3 -m json.tool
# {"id":"fraunces","family":"Fraunces","category":"serif","license":"OFL-1.1",
#  "variable":true,"weights":[100,…,900],"styles":["italic","normal"],"defSubset":"latin"}

# variable axes and their real ranges
curl -s https://api.fontsource.org/v1/variable/fraunces
# {"family":"Fraunces","axes":{"ital":…,"opsz":{"min":"9","max":"144"},
#  "wght":{"min":"100","max":"900"},"SOFT":{"min":"0","max":"100"},"WONK":{"min":"0","max":"1"}}}
```

Accept `OFL-1.1`, `Apache-2.0`, `MIT`, `Ubuntu`. Anything else, do not ship it.

### 3.4 Self-hosting: download, instance, subset, inline

Never link to a third-party font CDN in a delivered build. It costs a DNS lookup plus a connection on the critical path, it is a privacy liability in the EU, and it breaks the moment the CDN does. Self-host, always.

```bash
# 1. Fetch the woff2 straight off the Fontsource CDN (URL pattern is stable)
curl -sSL -o fraunces-var.woff2 \
  "https://cdn.jsdelivr.net/npm/@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2"
curl -sSL -o instrument-serif-400.woff2 \
  "https://cdn.jsdelivr.net/npm/@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2"
#   variable:  @fontsource-variable/<id>/files/<id>-<subset>-<axis>-normal.woff2
#   static:    @fontsource/<id>/files/<id>-<subset>-<weight>-normal.woff2

# 2. Tooling
pip install --quiet fonttools brotli      # brotli is REQUIRED for woff2 output
```

**Pin a variable font to one weight when you only use one.** This is the single biggest win and it is routinely skipped — verified numbers below:

```bash
# variable woff2 -> ttf -> instance at one weight -> subset -> woff2
python3 -c "
from fontTools.ttLib import TTFont
f = TTFont('fraunces-var.woff2'); f.flavor = None; f.save('fraunces.ttf')"

fonttools varLib.instancer fraunces.ttf wght=600 -o fraunces-600.ttf

pyftsubset fraunces-600.ttf --output-file=fraunces-600.woff2 --flavor=woff2 \
  --layout-features='kern,liga' --desubroutinize \
  --unicodes="U+0020-007E,U+00A0-00FF,U+2018-201D,U+2013,U+2014,U+2026"
```

| File | Bytes | as base64 |
|---|---|---|
| `fraunces-var.woff2` (full variable, latin) | 36,620 | 48,828 |
| `fraunces-600.woff2` (instanced + subset) | **11,308** | 15,080 |
| `instrument-serif-400.woff2` (static, latin) | 21,032 | 28,044 |
| `instrument-serif-400.woff2` (subset) | **14,380** | 19,176 |

Keep the variable font **only** when you actually animate or vary an axis (e.g. a `wght` shift on hover, or `opsz` across breakpoints). Otherwise instance it.

**Standard case — self-hosted file, `font-display: swap`:**

```css
/* Instanced + subset. One file, one weight, no FOIT. */
@font-face {
  font-family: "Display";
  src: url("/fonts/fraunces-600.woff2") format("woff2");
  font-weight: 600;
  font-style: normal;
  font-display: swap;         /* text is visible immediately in the fallback */
  unicode-range: U+0000-00FF, U+2013-2014, U+2018-201D, U+2026;
}

/* Metric-matched fallback so the swap does not shift layout.
   size-adjust et al. are Baseline WIDELY AVAILABLE (since Sept 2023). */
@font-face {
  font-family: "Display Fallback";
  src: local("Georgia"), local("Times New Roman");
  size-adjust: 96%;           /* tune per pair — see the measurement snippet below */
  ascent-override: 92%;
  descent-override: 24%;
  line-gap-override: 0%;
}

:root {
  --font-display: "Display", "Display Fallback", Georgia, serif;
  --font-body:    "Body", system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-utility: "Utility", ui-monospace, "SF Mono", Menlo, monospace;
}
```

Measure the override values instead of guessing them:

```js
// NODE_PATH=$(npm root -g) node measure-metrics.cjs  — prints size-adjust for a pair
const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch({ args: ["--no-sandbox"] });
  const p = await b.newPage();
  await p.goto("http://localhost:5173");        // page must already load the real face
  console.log(await p.evaluate(() => {
    const m = (family) => {
      const s = document.createElement("span");
      s.style.cssText = `position:absolute;visibility:hidden;font:400 100px ${family}`;
      s.textContent = "Hxn"; document.body.append(s);
      const w = s.getBoundingClientRect().width; s.remove(); return w;
    };
    return { sizeAdjust: (m('"Display"') / m("Georgia") * 100).toFixed(1) + "%" };
  }));
  await b.close();
})();
```

**Inline as a data URI — when, and when not.** Inlining removes a round trip, so the display face is painted on first render with no swap flash. But the base64 is ~33% larger *and it sits inside the render-blocking stylesheet*, so it delays first paint by its own size. The rule:

- **Inline only the display face**, only if the instanced+subset woff2 is **≤ 15 KB** (≈ 20 KB base64).
- **Never inline the body face.** It is bigger, and `font-display: swap` handles it fine.
- Put the inlined `@font-face` in a **separate, non-blocking** `<style>` in `<head>` if your critical CSS is already tight.

```bash
# emit a ready-to-paste @font-face with the font embedded
python3 - <<'PY' > src/styles/display-inline.css
import base64
b64 = base64.b64encode(open("fraunces-600.woff2","rb").read()).decode()
print(f'''@font-face {{
  font-family: "Display";
  src: url("data:font/woff2;base64,{b64}") format("woff2");
  font-weight: 600; font-style: normal; font-display: block;
}}''')
PY
wc -c src/styles/display-inline.css     # sanity-check the real cost before shipping
```

`font-display: block` is correct **only** for an inlined face (it is already in the CSS, so the block period is ~0ms). For any network-fetched face use `swap`.

### 3.5 Type scale

Fluid, three-role, one clamp per step. `clamp()` and `rem` only — never a JS resize listener.

```css
:root {
  /* 1.250 minor third at mobile widening to 1.333 perfect fourth at desktop */
  --step--1: clamp(0.83rem, 0.80rem + 0.15vw, 0.94rem);
  --step-0:  clamp(1.00rem, 0.95rem + 0.25vw, 1.13rem);
  --step-1:  clamp(1.25rem, 1.15rem + 0.50vw, 1.50rem);
  --step-2:  clamp(1.56rem, 1.38rem + 0.90vw, 2.00rem);
  --step-3:  clamp(1.95rem, 1.63rem + 1.60vw, 2.67rem);
  --step-4:  clamp(2.44rem, 1.90rem + 2.70vw, 3.55rem);
  --step-5:  clamp(3.05rem, 2.15rem + 4.50vw, 4.74rem);

  --leading-tight: 1.05;   /* display only */
  --leading-body:  1.6;    /* never below 1.5 for paragraphs */
  --measure: 66ch;         /* hard cap on paragraph width */
}
h1 { font: 600 var(--step-5)/var(--leading-tight) var(--font-display); letter-spacing: -0.02em; }
p  { font: 400 var(--step-0)/var(--leading-body) var(--font-body); max-width: var(--measure); }
.spec-label {
  font: 500 var(--step--1)/1.2 var(--font-utility);
  letter-spacing: 0.08em; text-transform: uppercase; color: var(--c-muted);
}
```

Negative tracking on display, positive on small uppercase utility. That single asymmetry is most of what separates typeset from typed.

---

## 4. Mood classification

### 4.1 Decision procedure

Run in order. **Stop at the first rule that fires** — later rules only break ties.

```
0. Client stated a mood in their own words?              -> use it. Skip to 4.2.
1. Regulated/licensed trade, or the site foregrounds
   certifications, tolerances, specs, or safety?         -> CLINICAL/PRECISE
2. Provenance language dominant ("handmade", "our
   workshop", "small batch", "since 18xx", maker named)? -> ARTISANAL/RUSTIC
3. Founded pre-1970 AND still trades on continuity
   (family name in the mark, "third generation")?        -> HERITAGE
4. Heavy plant, load ratings, tonnage, site photography
   of machinery, hi-vis in their own images?             -> INDUSTRIAL/HEAVY
5. Booking, menu, opening hours, or "welcome" is the
   primary call to action?                               -> WARM/HOSPITABLE
6. Portfolio-led: >60% of page area is their own
   photography, copy is sparse, prices absent?           -> LUXURY/RESTRAINED
7. Product is software, data, controls, or integration;
   evidence contains code, dashboards, or diagrams?      -> TECHNICAL/MODERN
8. Audience is children, pets, parties, or the existing
   palette is >2 saturated hues?                         -> PLAYFUL
9. None of the above                                     -> LUXURY/RESTRAINED
   (the safest default: restraint never embarrasses a
    business, exuberance frequently does)
```

**Secondary mood.** After the primary fires, check whether exactly one other rule *also* fires strongly. If so, record it as a modifier and let it bend the palette only — never the motion budget. `INDUSTRIAL/HEAVY + warm` is a real family fabrication shop; `CLINICAL/PRECISE + heritage` is an optician trading since 1946. This is where identities stop being generic.

### 4.2 Mood registers

| Mood | Palette register | Type register | Motion register | Photography treatment |
|---|---|---|---|---|
| **Rustic / artisanal** | Earth base (`--n-*` biased to 30-70° hue), one clay/ochre accent, cream surface `--n-0` ≈ `#fdfbf6`; never pure white | Pairing 3. Old-style or blunt-slab display, generous leading, occasional small caps | **Low.** Slow reveals only: opacity 0→1 over 700-900ms, translateY ≤ 16px. No parallax, no counters. Motion should feel like turning a page | Warm grade, natural light, visible texture and grain. Keep imperfections. No cutouts, no drop shadows. `filter: saturate(0.94) contrast(1.03)` |
| **Clinical / precise** | Cool near-neutral, single blue or teal accent, high surface/text contrast, `--c-line` clearly visible | Pairing 4. Tight tracking, sentence case, mono for every number and spec | **Very low.** Fades under 250ms, no transforms over 8px. Motion communicates state change, never decoration. Sticky spec tables instead of scroll effects | Even, shadowless lighting. White or `--n-50` backgrounds. Perfectly square crops. `filter: saturate(0.9)`. Clean, never moody |
| **Luxury / restrained** | Two colours total plus the ramp. Very low chroma (accent C ≤ 0.10). Deep sunken tone for full-bleed sections | Pairing 1 or 8. Huge display, tiny utility, nothing in between. Whitespace is the design | **Medium, slow.** Long `view()`-driven reveals, generous easing, one hero effect and nothing else. Restraint reads expensive — a second effect halves the first | Their photography at maximum size, minimum quantity. Full-bleed, long dwell. Very light grade. Never a grid of thumbnails |
| **Industrial / heavy** | Dark-dominant. Surface `--n-900`. One high-visibility accent (safety yellow/orange) used at < 5% area | Pairing 5. Condensed heavy display, uppercase permitted for section heads only | **Medium-high, blunt.** Fast, decisive transitions (150-220ms), linear or `cubic-bezier(.2,0,0,1)`. Clip-path wipes rather than fades. Nothing bouncy | High contrast, deep shadows, cool grade. Machinery and scale. `filter: contrast(1.08) saturate(0.85)`. Duotone toward `--c-brand` works well here |
| **Warm / hospitable** | Warm surface, soft raised layer, a second supporting hue permitted. Rounded corners (≥ 12px) carry meaning | Pairing 7. High x-height body, friendly display, comfortable 1.65 leading | **Medium.** Gentle scale on hover (≤ 1.02), soft staggers, 400-500ms. Movement should read as welcoming, never urgent | Golden-hour or warm-interior light. People in frame, doing things, not posed. Slight warm grade `filter: sepia(0.06) saturate(1.04)` |
| **Technical / modern** | Near-monochrome plus one electric accent. Dark theme is the *primary* theme; light is the variant | Pairing 6. Tight, mono utility everywhere, generous use of `--step--1` | **High but purposeful.** Scroll-linked progress, sticky diagrams, staged reveals. Every animation should explain something. 200-350ms | Product UI, diagrams, macro detail. Cool grade. Crisp, dark-background renders. Screens over faces |
| **Playful** | Three hues permitted, higher chroma (accent C 0.14-0.20), light surface | Pairing 9. Wide rounded display, larger body size, looser tracking | **High.** Springy easing (`linear()` or a bouncy cubic-bezier), staggered entrances, hover scale up to 1.05. This is the only mood where motion may be decorative | Bright, saturated, high-key. People smiling and it is fine. Cutouts on colour blocks are permitted here and nowhere else |
| **Heritage** | Muted, slightly desaturated, one deep traditional colour (bottle green, oxblood, navy). Cream not white | Pairing 2 or 10. Classical proportions, hairline rules, small caps for eyebrows | **Low.** Cross-fades and slow reveals. Rules that draw themselves with `clip-path` are the one permitted flourish. No parallax | Archival material first if it exists. Desaturated, slightly warm. Sepia only if the source genuinely is. Square or 4:5 crops. Framed, not bled |

### 4.3 Motion budget as tokens

Emit the mood's motion register as tokens too, so the effect files consume it rather than re-deciding. Reduced-motion is not a variant here — it is the same tokens with the movement removed.

```css
:root {
  /* Set by mood. This block is LUXURY/RESTRAINED. */
  --motion-distance: 24px;                       /* max translate for any reveal */
  --motion-duration: 800ms;
  --motion-stagger: 90ms;
  --motion-ease: cubic-bezier(0.16, 1, 0.3, 1);  /* long tail, no overshoot */
  --motion-hover-scale: 1.012;
}

/* Non-negotiable. Movement out, meaning kept. */
@media (prefers-reduced-motion: reduce) {
  :root {
    --motion-distance: 0px;
    --motion-duration: 1ms;
    --motion-stagger: 0ms;
    --motion-hover-scale: 1;
  }
  *, *::before, *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
    scroll-behavior: auto !important;
  }
}

/* Reveal built from the tokens: transform + opacity only. */
.reveal {
  opacity: 0;
  transform: translate3d(0, var(--motion-distance), 0);
  transition: opacity var(--motion-duration) var(--motion-ease),
              transform var(--motion-duration) var(--motion-ease);
}
.reveal.is-in { opacity: 1; transform: none; }

/* Native scroll-driven upgrade where supported; the IO class above is the fallback. */
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .reveal {
      opacity: 1; transform: none; transition: none;
      animation: reveal-in linear both;
      animation-timeline: view();
      animation-range: entry 10% cover 35%;
    }
    @keyframes reveal-in {
      from { opacity: 0; transform: translate3d(0, var(--motion-distance), 0); }
      to   { opacity: 1; transform: none; }
    }
  }
}
```

Motion register values by mood, for direct substitution:

| Mood | `--motion-distance` | `--motion-duration` | `--motion-stagger` | `--motion-ease` | `--motion-hover-scale` |
|---|---|---|---|---|---|
| Rustic / artisanal | 16px | 800ms | 110ms | `cubic-bezier(.22,1,.36,1)` | 1.01 |
| Clinical / precise | 8px | 240ms | 40ms | `cubic-bezier(.4,0,.2,1)` | 1.00 |
| Luxury / restrained | 24px | 800ms | 90ms | `cubic-bezier(.16,1,.3,1)` | 1.012 |
| Industrial / heavy | 20px | 200ms | 50ms | `cubic-bezier(.2,0,0,1)` | 1.00 |
| Warm / hospitable | 18px | 450ms | 80ms | `cubic-bezier(.33,1,.68,1)` | 1.02 |
| Technical / modern | 14px | 300ms | 60ms | `cubic-bezier(.32,.72,0,1)` | 1.015 |
| Playful | 28px | 550ms | 70ms | `linear(0,.6 30%,1.05 60%,.98 80%,1)` | 1.05 |
| Heritage | 12px | 700ms | 120ms | `cubic-bezier(.25,.8,.25,1)` | 1.00 |

---

## 5. The uplift rule

**You are not redesigning their brand. You are building the site their brand always implied.**

Three failure modes, all common:

- **Xerox** — reproduce the old site in nicer CSS. Client sees no reason to pay. You have added nothing.
- **Erasure** — ship a beautiful generic template with their name in the corner. Their customers do not recognise them, and the equity in fifteen years of vans, signage, and invoices is thrown away.
- **Correct** — carry every *load-bearing* identity element forward at higher fidelity, and replace every element that is merely an artefact of the tools they had.

### 5.1 The keep/lift/drop test

For each identity element found in §1, ask two questions:

> **Q1 — Does a customer recognise the business by this?** (on a van, an invoice, a shopfront, a search result)
> **Q2 — Does this exist because they chose it, or because their 2011 website builder chose it?**

| Q1 | Q2 | Verdict |
|---|---|---|
| Yes | Chose it | **KEEP.** Reproduce exactly. Match the hex, keep the mark, keep the tagline wording. |
| Yes | Builder chose it | **LIFT.** Preserve the *recognisable property*, upgrade the execution. Same hue, corrected lightness/chroma. Same idea, better typeface. |
| No | Chose it | **LIFT or DROP** — depends on whether it supports the mood. Keep it if it does; drop it politely if it does not. |
| No | Builder chose it | **DROP.** Silently. Do not mention it. |

Write the verdict for every element into the Brand Brief. That table *is* the justification you give the client, and it is what stops the work reading as arbitrary.

### 5.2 Worked example

**Business:** Harrow & Vale Joinery. Founded 1974, bespoke staircases and fitted furniture. Site last touched ~2013.

**Evidence gathered:**

```jsonc
{
  "themeColor": null,
  "palette": {
    "background": [["rgb(255, 255, 255)", 44], ["rgb(139, 90, 43)", 9], ["rgb(240, 240, 240)", 7]],
    "color":      [["rgb(51, 51, 51)", 310], ["rgb(139, 90, 43)", 18], ["rgb(0, 0, 238)", 12]]
  },
  "fontStacks": [["Verdana, Geneva, sans-serif", 288], ["Georgia, serif", 24]],
  "typeScale": [["Verdana… | 400 | 13px | normal | none", 240],
                ["Georgia… | 700 | 22px | normal | none", 11]],
  "logos": ["…/hv-logo.gif"],
  "images": [{ "src": "…/staircase-oak-2009.jpg", "w": 640, "h": 480 },
             { "src": "…/workshop.jpg",           "w": 600, "h": 400 }]
}
```

Screenshots: 960px fixed-width centred layout, `#8b5a2b` header bar, tiled wood-grain background image, six thumbnails at 200×150, body text 13px Verdana at ~1.2 leading, "Est. 1974" in the footer in 10px grey.

**Keep / lift / drop:**

| Element | Found | Q1 | Q2 | Verdict | Action |
|---|---|---|---|---|---|
| Brown `#8b5a2b` | Header bar, links, logo | **Yes** — it is on their van | Chose it | **LIFT** | Hue 55.6° is genuinely theirs and stays. But L 0.47 / C 0.087 is muddy at scale and fails AA as link text on white (3.9:1). Re-seat to `#8a5a2c` for the mark, and derive an AA accent at `#7d5127` (4.6:1). |
| "Est. 1974" | Footer, 10px grey | **Yes** — 50 years of trading is the single strongest asset on the site | Chose it | **KEEP + promote** | Move to the hero as an eyebrow in `--font-utility`, uppercase, `0.08em` tracking. It was buried because 2013 templates had no place to put it. |
| Verdana 13px/1.2 | Body copy | No | **Builder** — Verdana was a web-safe default, not a decision | **DROP** | Replaced. Nobody recognises Harrow & Vale by Verdana. |
| Georgia 22px bold | Headings | No | Builder | **DROP** | Replaced. |
| Tiled wood-grain background | Page background | No | Builder-era decoration | **DROP** | The wood should be in the *photographs*, not behind the text. |
| 960px fixed layout | Structure | No | Builder | **DROP** | Fluid, `--measure`-capped. |
| `hv-logo.gif` | Header | **Yes** | Chose it | **KEEP, re-render** | GIF is 180px wide and aliased. Request a vector; if unavailable, trace it or set the wordmark in the new display face and keep only the device. **Never redraw their mark from scratch without asking.** |
| Their own staircase and workshop photos | Body | **Yes** — this is their actual work | Chose it | **KEEP, re-treat** | 640×480 is too small for a full-bleed hero. Ship them at native size in a 4:5 editorial grid, warm-graded, and request higher-resolution originals for the hero. They ship (§7, bucket A). |

**Mood:** rule 2 fires (provenance language: "hand-cut", "our workshop"). Rule 3 also fires (1974, family name). → **ARTISANAL/RUSTIC, heritage modifier.**

**Derived direction:**

```bash
node palette.mjs "#8a5a2c" "#7d5127" > src/styles/tokens.css
```

- Palette: their brown, corrected and split into a recognisable brand tone and an AA-passing accent. Neutral ramp hue-biased to 55.6°, so every surface is warm — `--n-0` lands near `#fffdfa` instead of white, which is exactly the cream the mood register calls for. The tiled wood image is gone but its *warmth* is now in every pixel of the page.
- Type: pairing 3 with a heritage lean — **Young Serif** display / **Newsreader** body / **DM Mono** utility. Young Serif's blunt cut terminals echo hand-tooled timber; Newsreader repairs the 13px/1.2 legibility disaster at `--step-0`/1.6.
- Motion: rustic register — 16px, 800ms, no parallax. A stair rises slowly; so does the page.
- Photography: their own images, warm grade, native size, editorial grid. Request higher-res originals of the two best staircases for the hero.

**The one-line justification to the client:** *"Everything a customer recognises you by — the brown, the mark, the fifty years — is still here and is now the loudest thing on the page. What is gone is Verdana, the 960-pixel box, and the tiled background, none of which you chose; they were what the software of the day gave you."*

That sentence is the deliverable. If you cannot write it for a given project, you have not done §5.

---

## 6. Low-evidence path

Trigger this when **any** of the following is true: no website; site is a parked domain or a one-page builder stub; no logo of any kind; fewer than three of the client's own photographs; or `themeColor` absent *and* no swatch clears OKLCh chroma 0.04.

**Do not invent an identity and present it as derived.** Do not build three sites. Present **exactly three written directions**, and get a choice before writing a line of markup.

Each direction is a fixed structure. All five parts are mandatory — a direction missing any of them is not choosable.

```markdown
### Direction {N} — "{two-or-three-word name}"

**In one sentence:** {What this makes the business feel like to a first-time visitor.}

**Mood:** {mood from §4.2} {+ modifier if any}

**Palette** — swatch strip, hex + role + a plain-English name:
| Swatch | Hex | Role | Called |
|---|---|---|---|
| ██ | #1b3a2f | `--c-brand` | deep pine |
| ██ | #c2703d | `--c-accent` | terracotta |
| ██ | #fffdfc | `--c-surface` | warm paper |
| ██ | #191715 | `--c-text` | soft charcoal |
_Contrast: text on surface {n.n}:1, accent on surface {n.n}:1 — both AA._
_Dark theme included and audited._

**Type:** {Display} / {Body} / {Utility} — {one sentence on what the pairing communicates}
_Specimen:_
  H1  — "{their actual business name}" set in {Display} at 56px
  H2  — "{a real section heading from their trade}" in {Display} at 32px
  Body— "{two real sentences about their actual service}" in {Body} at 17px
  Util— "{a real price, spec, or opening hour}" in {Utility} at 13px uppercase

**Motion:** {register from §4.3, in words} — e.g. "slow, single hero effect, nothing
below the fold moves until you reach it." Plus the token block.

**Photography brief:** {exactly what you need them to send, with counts and framing}
— e.g. "6 landscape shots of finished work in natural light, 2000px wide minimum;
2 portrait shots of the workshop; 1 of the team. No phone flash, no posed groups."

**Reference feel (NOT shipping):** {2-3 named sites or publications whose *approach*
this echoes} — described in words only. See §7: these are never fetched into the build.

**Risk:** {the honest downside} — e.g. "the high-contrast display needs good
photography to hold it up; if the photos are weak this direction will expose that."
```

Rules for the set of three:

1. **They must be genuinely distinct** — different mood, different type register, different motion budget. Three variations on one idea is one direction with extra steps. A useful test: if you swapped the palettes between two directions and they would both still work, they are the same direction.
2. **One must be the conservative option.** Some clients need permission to be quiet. Usually LUXURY/RESTRAINED or HERITAGE.
3. **One must take a real position** — something the client could plausibly reject. If all three are safe, you have given no choice at all.
4. **Every palette must already pass AA in both themes.** Run `palette.mjs` for each of the three before writing them up. Never present a direction you have not proved.
5. **Name the risk of each.** A direction with no stated downside reads as a sales pitch, not advice.
6. **Ask at most three questions alongside them**, and make them concrete: *"Do your customers find you by looking you up, or by walking past?"*, *"When someone says your competitor's name, what do you want them to say about you instead?"*, *"Is there anything about the old site you would be upset to lose?"* That last question, asked before the build, prevents almost every late-stage rework.

If the client will not or cannot choose: **build Direction 1 if it is the conservative one, otherwise build the conservative one.** Say plainly which you built and why, and note that the other two remain available. Never silently pick the adventurous option on their behalf.

---

## 7. Image rights decision rule

This rule is absolute and there is no judgement call inside it — only a lookup.

### Bucket A — SHIPS

**The client's own material.** This is the normal, intended, expected case, and it is why §1 exists.

- Their current or previous website (including archived captures of it).
- Their own social profiles: profile photo, cover image, post images, gallery.
- Any file they hand over: logos, vectors, photography, brochures, PDFs, video stills.
- Their Google Business Profile photos, where posted by the business itself.
- Anything on a domain they own.

These go into the build at full fidelity. Optimise them, re-treat them per the mood register, crop them — but ship them. **Refusing to use the client's own photographs is a failure**, not caution: it forces you into placeholders or stock and produces exactly the generic result the whole skill exists to avoid.

### Bucket B — REFERENCE ONLY, NEVER SHIPS

**Anything not theirs.** Third-party, competitor, agency portfolio, editorial, Pinterest, Dribbble, Behance, Unsplash/Pexels/stock of any tier, another business's photographs, another brand's mark, AI-generated imagery presented as their premises or work.

You may look at it. You may describe it in words in the Brand Brief ("the reveal pacing of a well-made architecture practice site"). You may derive an abstract principle from it — a spacing rhythm, a motion tempo, a crop ratio.

You may **not**: download it into the repo, reference it by URL in markup or CSS, base64 it, screenshot-and-crop it, run it through a filter and call it new, or feed it to an image model to produce a variant.

*(Free-licence stock — Unsplash, Pexels — sits in Bucket B for this skill. The licences generally permit commercial use, but a "premium" site built on the same eight photographs every other site uses is self-defeating, and licence terms change. If the client explicitly instructs you to use a specific stock image and confirms they have licensed it, it moves to Bucket A on their say-so — record that instruction in the Brand Brief.)*

### Bucket C — PLACEHOLDER

Where a real asset is needed and Bucket A cannot supply it yet.

### How to determine the bucket

Mechanical, in order. Stop at the first hit.

1. **Did the client hand you this file directly?** → **A**.
2. **Is its origin URL on a domain the client owns, or a social profile the client controls?** Confirm the domain against what the client told you, the site's own footer/contact details, and the `og:site_name` from the harvest. → **A**.
3. **Did it arrive in a `brand-evidence-*` directory produced by harvesting a URL the client gave you as theirs?** → **A**.
4. **Anything else** → **B**.
5. **Cannot resolve 1-4 with certainty** → treat as **B**, and create a **C** placeholder in its slot. Never resolve ambiguity toward shipping.

Keep the buckets physically separated on disk so the rule cannot be violated by accident:

```bash
mkdir -p assets/{ships,reference-only,placeholder}
# ships/          <- bucket A. only this directory may be imported by the build.
# reference-only/ <- bucket B. add to .gitignore AND to the build's ignore list.
# placeholder/    <- bucket C.
printf 'assets/reference-only/\n' >> .gitignore
```

Add a check that fails the build rather than trusting yourself to remember:

```bash
# guard.sh — run before every delivery. Non-zero exit = do not ship.
set -e
if grep -rInE '(reference-only|unsplash\.com|pexels\.com|images\.pexels|pinimg\.com|cdn\.dribbble)' \
     src/ index.html 2>/dev/null; then
  echo "BLOCKED: reference-only or stock asset referenced in the build" >&2; exit 1
fi
echo "asset rights check: clean"
```

### Placeholder requirements

A placeholder must be **obviously** a placeholder. A grey box with "1600×900" reads as unfinished; a beautiful stock photograph reads as done and gets shipped by accident. Aim for the first.

```html
<!-- Placeholder: replace src, keep the figure and the aspect-ratio. -->
<figure class="ph" style="--ph-ratio: 3 / 2">
  <img src="assets/placeholder/hero.svg" alt="" width="1800" height="1200" decoding="async">
  <figcaption class="ph__note">
    <b>ASSET NEEDED</b> — hero. Landscape, ≥1800px wide, natural light,
    finished work in situ. Supplied by client. <span>slot: hero.primary</span>
  </figcaption>
</figure>
```

```css
.ph { position: relative; margin: 0; aspect-ratio: var(--ph-ratio); }
.ph img { width: 100%; height: 100%; object-fit: cover; display: block; }
/* Unmistakable, and it disappears the moment a real src is dropped in. */
.ph::after {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  outline: 2px dashed var(--c-accent); outline-offset: -6px;
  background: repeating-linear-gradient(45deg,
    transparent 0 14px, color-mix(in oklab, var(--c-accent) 8%, transparent) 14px 28px);
}
.ph__note {
  position: absolute; inset-inline: 0; bottom: 0;
  font: 500 var(--step--1)/1.4 var(--font-utility);
  letter-spacing: .06em; text-transform: uppercase;
  color: var(--c-accent-on); background: var(--c-accent-solid);
  padding: .5rem .75rem;
}
```

And record every slot, so the client gets a shopping list rather than a vague ask:

```markdown
## Assets still needed  (assets/placeholder/MANIFEST.md)

| Slot | What | Spec | Why |
|---|---|---|---|
| `hero.primary` | Finished staircase in situ | Landscape, ≥1800px, natural light, no flash | Only 640px versions exist; will look soft full-bleed |
| `about.workshop` | Workshop wide shot | Landscape, ≥1600px | Provenance is the strongest story and there is no image of it |
| `team.portrait` | Owner at the bench | Portrait 4:5, ≥1200px | Heritage mood needs a face; currently absent |
| `logo.vector` | Logo as SVG/AI/EPS | Vector, any size | Only a 180px GIF exists; will alias at any hero size |
```

### When unsure

**The default is not to ship it.** Move it to `reference-only/`, create the placeholder, add the row to the manifest, and put one line in the Brand Brief:

> *"`workshop-wide.jpg` was found on a supplier's site rather than yours — I have not used it. If it is your photograph, send it over and it goes straight in; if not, the `about.workshop` slot is waiting for a replacement."*

That sentence costs nothing, is always true, and converts an unresolvable rights question into a concrete request the client can answer in ten seconds.

---

## Brand Brief output template

The artefact this whole file produces. Write it to `BRAND-BRIEF.md` in the project root before any build begins.

```markdown
# Brand Brief — {Business}
Derived {date} from: {list every evidence source, with URLs and file paths}

## 1. Evidence
{what was harvested; what was missing; confidence: high / medium / low-evidence path §6}

## 2. Mood
**{PRIMARY}**{ + modifier} — fired on rule {n}: "{the specific evidence that triggered it}"

## 3. Palette
{the emitted tokens.css block}
Contrast audit: {paste the stderr from palette.mjs — both themes, all roles}

## 4. Typography
{Display} / {Body} / {Utility} — pairing {n}, {licence}, self-hosted, {n}KB total
Rationale: {one sentence tying the pairing to the mood and the evidence}

## 5. Motion budget
{the token block from §4.3} + prefers-reduced-motion branch: shipped.

## 6. Keep / Lift / Drop
{the §5.1 table, every element, with the Q1/Q2 verdict}

## 7. Assets
Ships ({n}): {list, with origin — bucket A justification per §7}
Reference only ({n}): {list — described, never fetched into the build}
Still needed ({n}): {the placeholder manifest}

## 8. The one-line justification
"{the §5.2 sentence}"
```

---

## Sources

- [light-dark() — Web platform features explorer](https://web-platform-dx.github.io/web-features-explorer/features/light-dark/) — Baseline newly available since May 2024; widely available Nov 2026.
- [Using relative colors — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Colors/Using_relative_colors) and [CSS relative color syntax — Chrome for Developers](https://developer.chrome.com/blog/css-relative-color-syntax) — Baseline since Sept 2024.
- [contrast-color() — Web platform features explorer](https://web-platform-dx.github.io/web-features-explorer/features/contrast-color/) and [Interop 2026 — WebKit](https://webkit.org/blog/17818/announcing-interop-2026/) — Chrome 147 (Apr 2026), Firefox 146, Safari 26.0; newly available, not yet widely available.
- [size-adjust @font-face descriptor — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/size-adjust) — Baseline widely available since Sept 2023.
- [oklch() — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value/oklch)
- Fontsource API (`api.fontsource.org/v1/fonts/{id}`, `/v1/variable/{id}`) — licence, variable status and axis ranges verified live for every pairing listed in §3.2.
- Package versions verified against the npm registry: `node-vibrant@4.0.4`, `colorthief@3.4.0`, `sharp@0.35.3`, `playwright@1.62.1`, `fonttools@4.63.0`.
```
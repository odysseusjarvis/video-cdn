# Delivery & Handoff

How to get a finished site **out of an ephemeral container and into the user's hands**, prove it works before you hand it over, and give the client something that sells the work.

```
   BUILD DONE
        │
   1. GATE ────────► verify.sh — objective, fail-closed. Nothing ships until green.  (§7)
        │
   2. ASSEMBLE ────► delivery/ tree: site + source + assets + README + LICENCE + MAINTENANCE  (§1)
        │
   3. PACKAGE ─────► clean zip, excludes applied, size-checked, RE-EXTRACTED AND RUN  (§2)
        │
   4. EXPORT ──────► SendUserFile → Google Drive → free host preview → (git only if told)  (§3)
        │
   5. EXPLAIN ─────► pitch.html for the client (§5) + BUILD-REPORT.md for the user (§6)
```

**The one law of this file:** the container is ephemeral. A perfect site that was never exported does not exist. Export is not the last chore — it is the deliverable. If you are running low on turns, budget, or context, **stop building and export what you have**, with an honest "unfinished" section in the build report. A shipped 80% beats a destroyed 100%.

---

## 0. Read this before you use anything else

### 0.1 The no-GitHub rule

This is commercial client work. **Do not push to GitHub. Not to a scratch repo, not to a gist, not "just to move the files".** The repo you are sitting in may already have an `origin` — check, and ignore it:

```bash
git -C "$PROJECT" remote -v      # informational only. Do not push to whatever this prints.
```

Git push is **route D** in §3.4 and requires the user to say so in words. Absence of an objection is not instruction. "Save this somewhere" is not instruction. The default is: zip → SendUserFile.

Corollary: do not `git init` + commit client photos and then leave the repo lying around. Client assets are the client's property (§1.4).

### 0.2 Environment, verified 2026-08-02

Checked in this container. Re-check before relying on any of it.

```bash
node -v                      # v22.22.2   (container runtime; NOT what you tell the client to install — see §4.4)
python3 -V                   # Python 3.11.15
which zip unzip              # /usr/bin/zip  /usr/bin/unzip
npm ls -g --depth=0          # playwright@1.56.1, serve@14.2.6, http-server@14.1.1, prettier, typescript
ls /opt/pw-browsers/chromium-1194/chrome-linux/chrome    # the Chromium binary
```

Preamble for every Playwright script in this file — **CommonJS `.cjs`**, because Playwright is installed *globally*:

```bash
export NODE_PATH="$(npm root -g)"
export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
```

And inside every script, the sandbox proxy fix (Chromium's own stack is often blocked even when `HTTPS_PROXY` is set):

```js
// Route page requests through Playwright's Node fetcher, which honours the env proxy.
// Only needed when the page loads anything cross-origin. Local file/server traffic is fine without it.
if (process.env.HTTPS_PROXY) {
  await ctx.route("**/*", async (route) => {
    if (new URL(route.request().url()).hostname === "127.0.0.1") return route.continue(); // never proxy localhost
    try { await route.fulfill({ response: await ctx.request.fetch(route.request(), { timeout: 20000, maxRedirects: 5 }) }); }
    catch { await route.abort(); }
  });
}
```

`lighthouse` is **not** preinstalled — `npx lighthouse` will want to download it (v13.4.1 at time of writing). If the sandbox blocks that install, §7.2.2 gives a Playwright-only fallback that measures the same core metrics.

### 0.3 Naming

One slug, used everywhere. Derive it once and reuse:

```bash
SLUG="northgate-joinery"                    # lowercase, hyphens, no spaces, no dates in the folder name
STAMP="$(date -u +%Y-%m-%d)"                # dates go in the FILE name, not the folder name
PROJECT="/home/user/${SLUG}"                # working dir
OUT="/home/user/delivery/${SLUG}"           # staging area for the bundle
ZIP="/home/user/delivery/${SLUG}_${STAMP}.zip"
```

Never ship a zip called `site.zip` or `final_v3_FINAL.zip`. The client will have it in their Downloads folder for three years.

---

## 1. The delivery bundle

### 1.1 Exact folder structure

This is the whole contract. Every path below is either present or deliberately omitted with a line in the README saying why.

```
northgate-joinery/
├── START-HERE.txt                  ← plain text, 20 lines, for someone who has never opened a terminal
├── README.md                       ← the fuller version of the same thing (§1.3)
├── LICENCE-AND-OWNERSHIP.md        ← who owns what, what is licensed, what must not be reused (§1.4)
├── MAINTENANCE.md                  ← how to change text / swap a photo / add a testimonial (§1.5)
├── BUILD-REPORT.md                 ← for the USER, not the client. Provenance + decisions. (§6)
│
├── site/                           ← THE BUILT SITE. This is what goes on a web host.
│   ├── index.html
│   ├── thank-you.html
│   ├── 404.html
│   ├── assets/
│   │   ├── css/site.css
│   │   ├── js/site.js
│   │   ├── fonts/          *.woff2      (subset, self-hosted — see LICENCE)
│   │   └── img/            *.avif *.webp *.jpg   (responsive sizes, hashed or plainly named)
│   ├── favicon.svg
│   ├── favicon.ico
│   ├── apple-touch-icon.png
│   ├── og-image.jpg                     (1200×630)
│   ├── site.webmanifest
│   ├── robots.txt
│   └── sitemap.xml
│
├── source/                         ← EDITABLE SOURCE. Omit entirely if site/ IS the source (see 1.2).
│   ├── package.json
│   ├── astro.config.mjs   |  vite.config.js
│   ├── .nvmrc                           ← pins the Node major. One line: 24
│   ├── src/
│   ├── public/
│   └── content/                         ← copy that a non-dev can edit (md/json), if the build uses it
│
├── assets/
│   ├── MANIFEST.csv                     ← every image: source, licence, where used, what was done to it
│   ├── optimised/                       ← exactly what ships in site/assets/img, at full quality
│   └── originals/                       ← client's untouched originals. SEE SIZE RULE §2.3.
│
├── brand/
│   ├── BRAND-BRIEF.md                   ← palette, type, mood, motion budget (from brand-identity.md)
│   ├── tokens.css                       ← the custom properties, standalone and portable
│   └── logo/                            ← svg + png at 3 sizes, light and dark variants
│
└── proof/
    ├── pitch.html                       ← the client-facing sales page (§5). Self-contained.
    ├── lighthouse-mobile.html           ← the real report, not a screenshot of one
    ├── lighthouse-desktop.html
    ├── lighthouse-summary.json          ← machine-readable scores, so nobody has to trust a number
    ├── before/  after/                  ← screenshots at 390 / 768 / 1440 (§5.3)
    └── VERIFY.txt                       ← the gate output from §7. Dated, signed, pass/fail per line.
```

**Rules about the tree:**

- `site/` must be **directly hostable**. Drag `site/` onto any static host and it works. No build step, no path rewriting, no "change this one line first". Test it (§2.4).
- All internal links inside `site/` are **relative** (`./assets/css/site.css`, not `/assets/css/site.css`). Absolute paths break when the client previews from a subfolder or from `file://`. This one rule prevents the single most common "you sent me a broken site" email.
- Nothing outside `site/` is required for the site to run. `source/`, `assets/originals/`, `brand/`, `proof/` are all archive material.
- `proof/` is for the user AND the client; `BUILD-REPORT.md` is user-only. If the user forwards the whole bundle to the client, the build report goes with it — so write it professionally, and put anything genuinely private in your chat response instead, not in a file.

### 1.2 `site/` vs `source/` — when to include source at all

| Build type | `site/` contains | `source/` |
|---|---|---|
| Vanilla HTML/CSS/JS, no build step | the actual editable files | **omit** — say so in the README: "there is no separate source; the files in `site/` are the source" |
| Vite / Astro / Next static export | the build output (`dist/`) | **include** — the full project minus `node_modules`, `.git`, caches |
| Anything with a CMS or API | the static shell | include, plus a `.env.example` with **placeholder values only** |

Duplicating the site into both folders when there is no build step is confusing, not generous. Pick one and explain it.

**Never ship a real `.env`, API key, form endpoint token, or analytics ID that belongs to you rather than the client.** Grep before packaging (§7.2.9).

### 1.3 `START-HERE.txt` and `README.md`

`START-HERE.txt` — deliberately plain text so it opens in Notepad/TextEdit with a double-click:

```text
NORTHGATE JOINERY — YOUR NEW WEBSITE
====================================

TO LOOK AT IT RIGHT NOW
  Open the folder called  site
  Double-click            index.html
  It opens in your browser. That is the whole site.

TO SHOW IT TO SOMEONE ELSE
  Open  proof/pitch.html  — it explains what was built and how fast it is.

TO PUT IT ON THE INTERNET
  Read  README.md, section "Publishing it".
  Short version: your web host has a "file manager" or "upload" area.
  Upload EVERYTHING INSIDE the  site  folder (not the folder itself).

TO CHANGE THE WORDS OR PHOTOS
  Read  MAINTENANCE.md. No programming needed for text and photos.

WHO OWNS THIS
  You do. Details in LICENCE-AND-OWNERSHIP.md.

If something looks broken when you double-click index.html — a slideshow that
does not move, a missing photo — that is usually the browser being strict about
files opened directly from disk. README.md, section "Why some things need a
local server", has a one-line fix.
```

`README.md` — the full version. Mandatory sections, in this order:

1. **What this is** — one paragraph, plain language, no jargon.
2. **What's in the box** — the tree from §1.1, annotated in one line each.
3. **Looking at it** — double-click, per OS (§4.1).
4. **Why some things need a local server** — the honest explanation + the one-liner (§4.2–4.3).
5. **Editing it** — pointer to MAINTENANCE.md.
6. **Building it** (only if `source/` exists) — Node version, install, dev, build, preview (§4.4).
7. **Publishing it** — what to upload, and where the site is already live if you deployed a preview (§3.3).
8. **Performance** — the real Lighthouse numbers with a link to `proof/lighthouse-mobile.html`.
9. **Browser support** — name the engines you actually ran (§1.4), not the ones you assume work. State which effects are progressive enhancements and what a non-supporting browser shows instead. If the only engine tested was Chromium, say Chromium.
10. **Ownership & licences** — one line, pointing at LICENCE-AND-OWNERSHIP.md.
11. **Known limitations / not included** — copied verbatim from the build report's "unfinished" section. Do not bury this.

Write every sentence for someone whose job is joinery, not JavaScript. Ban: "simply", "just", "obviously", "trivially". If a step needs a terminal, show the exact string to paste and say what a successful result looks like.

### 1.4 `LICENCE-AND-OWNERSHIP.md`

The bundle is worthless to a business that cannot prove it may use it. Be specific and be honest — including about the things you do *not* control.

```markdown
# Ownership and Licences

## The website itself
All HTML, CSS, JavaScript, layout, and copy written for this project are
**transferred to Northgate Joinery outright**. You may use, modify, resell,
re-host, or hand to another developer, without restriction and without
attribution. There is no ongoing licence fee and no lock-in.

## Your own material
| Item | Origin | Status |
|---|---|---|
| Photographs in `assets/originals/` | Supplied by you | Yours. Unchanged. |
| Photographs in `site/assets/img/` | Your originals, cropped/compressed/converted | Yours. Derived works of your files. |
| Logo | Your existing logo, redrawn as SVG for sharpness | Yours. The redraw is transferred to you. |
| Copy | Rewritten from your existing site and your brief | Yours. |

## Third-party material — READ THIS BEFORE REUSING ELSEWHERE
| Item | Licence | What it means |
|---|---|---|
| Inter (UI text) | SIL Open Font License 1.1 | Free for commercial use, may be embedded and self-hosted. Font files may not be sold on their own. Full text: `site/assets/fonts/LICENSE-Inter.txt` |
| Fraunces (headings) | SIL Open Font License 1.1 | Same. `site/assets/fonts/LICENSE-Fraunces.txt` |
| Icons | Hand-drawn SVG for this project | Yours. |

Every font shipped here is under a licence that permits commercial web
embedding. No font is loaded from a third-party CDN, so no visitor data leaves
your site to a font provider.

## What is NOT covered
- **Stock photography**: none was used. Every photograph is yours. If a
  placeholder image is still present it is listed in README.md → "Known
  limitations" and must be replaced before launch.
- **Domain name and hosting**: not included. Those are accounts in your name.
- **Third-party embeds** (maps, booking widgets, analytics): governed by that
  provider's terms, not by this document.

## Warranty
Delivered as-is. Automated checks were run in Chromium <version> at viewport
widths from 320px to 1920px, as recorded in `proof/VERIFY.txt` on <date>.
<If other engines were tested, name them here. If they were not, say so:>
Firefox and Safari were not available in the build environment and have not been
tested. The site uses no engine-specific features, and effects that Firefox does
not support degrade to their finished state rather than breaking — but this is
reasoning, not measurement. No guarantee is made about browsers released after
that date, or about third-party services.
```

**Do not write "tested in Chrome, Firefox and Safari" unless you actually ran those engines.** The default container ships Chromium only — `ls /opt/pw-browsers` returns `chromium*` and `ffmpeg`, no `firefox`, no `webkit` — and every gate script in §7 calls `chromium.launch()`. An unverifiable cross-browser claim in the one document the client would wave at a lawyer is the worst possible place to be sloppy.

If cross-engine evidence is worth the download, Playwright can supply it, and the gate scripts need only the launcher swapped:

```bash
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers npx --yes playwright@1.56.1 install firefox webkit
# then, in any gate script: const { firefox, webkit } = require("playwright");
```

If the install is blocked, that is a `SKIPPED (reason)` line in `VERIFY.txt` per §7.4 — not a licence to assert it passed.

If you used *anything* whose licence you could not verify, it does not ship. Put it in `assets/originals/` marked `reference-only`, and say so in both the manifest and the build report.

### 1.5 `MAINTENANCE.md`

The test: can the owner change the phone number on a Sunday without calling anyone? Structure it as **tasks**, not as a tour of the codebase.

````markdown
# Looking after your site

Every task below is done by opening a file in a plain text editor.
Windows: right-click the file → Open with → Notepad.
Mac: right-click → Open With → TextEdit.
**Never open these files in Word.** Word adds invisible formatting and breaks them.

**Before you change anything:** copy the whole `site` folder and rename the copy
`site-backup-<today's date>`. Takes five seconds, saves an afternoon.

---
## Change a phone number, email, or opening hours
1. Open `site/index.html`.
2. Press Ctrl+F (Windows) / Cmd+F (Mac) and search for the old number.
3. It appears in more than one place. Change **every** one, including any line
   that looks like `href="tel:+441912345678"` — that is the tap-to-call link,
   and it has no spaces or brackets in it.
4. Save. Double-click `index.html` to check.

## Change a heading or a paragraph
Search for the words you can see on the page. Change the text **between** the
angle-bracket tags, never the tags themselves.

    <h2 class="section__title">Kitchens built to last</h2>
                              ^^^^^^^^^^^^^^^^^^^^^^^ change this part only

## Swap a photograph
1. Your photo must be a `.jpg` and **no wider than 2000 pixels**. Anything
   bigger makes the site slow. To resize:
   - Windows: right-click → Open with → Photos → Crop/Resize → Save a copy.
   - Mac: double-click → Tools → Adjust Size → Width 2000 → Save.
2. Rename it to **exactly** the name of the photo you are replacing, e.g.
   `workshop-01.jpg`, and drop it into `site/assets/img/`, replacing the old one.
3. There may also be `workshop-01.avif` and `workshop-01.webp` next to it —
   these are faster versions of the same picture. **Delete those two files.**
   The site falls back to your `.jpg` automatically. It will be slightly slower
   but it will look right, which matters more.
4. Open `index.html` and search for `workshop-01`. Update the `alt="..."` text
   to describe the new photo in a few words — this is what blind visitors hear
   and what Google reads.

## Add a testimonial
1. Open `site/index.html`, search for `<!-- TESTIMONIAL -->`.
2. Copy everything from one `<blockquote ...>` to its matching `</blockquote>`.
3. Paste it directly underneath, then change the quote and the name.
Nothing else needs changing — the layout adjusts on its own.

## Change a colour across the whole site
Open `site/assets/css/site.css`. The first block is:

```css
:root {
  --c-ink:    #16130f;   /* body text */
  --c-accent: #8a5a2b;   /* buttons, links, underlines */
  --c-paper:  #faf7f2;   /* page background */
}
```
Change the six-character code after a `#`. Every use of that colour updates at
once. Use a picker like https://oklch.com if you need to find a code.
**If you change `--c-accent`, check that white text on a button is still easy to
read** — run the new colour through https://webaim.org/resources/contrastchecker/
and keep the ratio above 4.5.

## What NOT to touch
- Anything in `site/assets/js/` — that is the animation code.
- Any line starting with `@supports`, `@media`, or `animation-timeline`.
- File names of anything in `assets/fonts/`.
If you break something: delete the folder and restore your backup copy.

## Once a year
- Check every link still goes somewhere (click them all — there are 14).
- Check the copyright year in the footer.
- Re-run a free speed test at https://pagespeed.web.dev/ and compare against
  the numbers in `README.md`. A big drop usually means a huge photo was added.
````

### 1.6 `assets/MANIFEST.csv`

One row per image that ships. This is what makes the ownership claims in §1.4 checkable rather than asserted.

```csv
file,origin,origin_detail,licence,used_on,transform,ships
site/assets/img/hero-workshop.avif,client,"supplied 2026-07-28, IMG_4471.HEIC",client-owned,index.html hero,"crop 3:2, 2400w, AVIF q58",yes
site/assets/img/hero-workshop.jpg,client,"same source",client-owned,index.html hero fallback,"crop 3:2, 1800w, JPEG q78",yes
site/assets/img/team-01.jpg,scraped,"old site /about, 640w only",unverified,—,none,NO — too small and rights unconfirmed
brand/logo/logo.svg,derived,"redrawn from client PNG",transferred to client,all pages,vector redraw,yes
```

`ships=NO` rows are the point of the file. They are the honest answer to "why isn't there a photo of the team?" and they feed §6.5 "needs client input".

---

## 2. Packaging

### 2.1 What is excluded, and why

| Excluded | Why |
|---|---|
| `node_modules/` | 225 MB in this very repo. Regenerable from `package.json` in 30s. Never ship it. |
| `.git/`, `.gitignore` fragments | History can contain earlier drafts, keys, and the client's competitor names. Also huge. |
| `.astro/`, `.vite/`, `.next/`, `.cache/`, `.parcel-cache/`, `.turbo/` | Build caches. Machine-specific, sometimes absolute-path-poisoned. |
| `.DS_Store`, `Thumbs.db`, `desktop.ini` | Noise. Makes you look sloppy on the client's Mac. |
| `*.log`, `npm-debug.log*`, `.npm/` | Noise. |
| `.env`, `.env.*` (except `.env.example`) | **Secrets.** Hard fail if found (§7.2.9). |
| `screenshots/tmp/`, `harvest/`, `evidence.json`, scraped HTML | Your working intermediates. Interesting to you, confusing to the client, and possibly a rights problem. |
| `*.psd`, `*.fig`, unedited 40 MB HEIC bursts | Only if the client did not supply them. If they did, they belong in `assets/originals/`. |
| `.playwright-mcp/`, `test-results/`, `playwright-report/` | Ephemeral test output. `proof/` is the curated version. |

### 2.2 `package.sh` — copy-paste ready

```bash
#!/usr/bin/env bash
# package.sh — assemble and zip the delivery bundle.
# Usage: ./package.sh <slug> <project-dir>
set -euo pipefail

SLUG="${1:?usage: package.sh <slug> <project-dir>}"
PROJ="${2:?usage: package.sh <slug> <project-dir>}"
STAMP="$(date -u +%Y-%m-%d)"
OUT="/home/user/delivery/${SLUG}"
ZIP="/home/user/delivery/${SLUG}_${STAMP}.zip"

rm -rf "$OUT" "$ZIP"
mkdir -p "$OUT"/{site,assets/optimised,assets/originals,brand/logo,proof/before,proof/after}

# ---- 1. built site -----------------------------------------------------------
# Vanilla project: SRC=$PROJ/site .  Build project: run the build first.
if [ -f "$PROJ/package.json" ] && grep -q '"build"' "$PROJ/package.json"; then
  (cd "$PROJ" && npm run build)
  SRC="$PROJ/dist"                      # Astro/Vite. Next static export -> $PROJ/out
else
  SRC="$PROJ/site"
fi
cp -a "$SRC/." "$OUT/site/"

# ---- 2. source (only when there IS a build step) ------------------------------
if [ "$SRC" != "$PROJ/site" ]; then
  mkdir -p "$OUT/source"
  # rsync is the reliable way to copy-with-excludes. tar fallback below if absent.
  rsync -a \
    --exclude 'node_modules' --exclude '.git' --exclude 'dist' --exclude 'out' \
    --exclude '.astro' --exclude '.vite' --exclude '.next' --exclude '.cache' \
    --exclude '.turbo' --exclude 'test-results' --exclude 'playwright-report' \
    --exclude '.env' --exclude '.env.*' --exclude '*.log' --exclude '.DS_Store' \
    "$PROJ/." "$OUT/source/"
  echo "24" > "$OUT/source/.nvmrc"      # Node 24 = Active LTS as of 2026-08. See §4.4.
fi

# ---- 3. everything else ------------------------------------------------------
cp -a "$PROJ/assets/optimised/."  "$OUT/assets/optimised/"  2>/dev/null || true
cp -a "$PROJ/assets/originals/."  "$OUT/assets/originals/"  2>/dev/null || true
cp    "$PROJ/assets/MANIFEST.csv" "$OUT/assets/"            2>/dev/null || true
cp -a "$PROJ/brand/."             "$OUT/brand/"             2>/dev/null || true
cp -a "$PROJ/proof/."             "$OUT/proof/"             2>/dev/null || true
for f in START-HERE.txt README.md LICENCE-AND-OWNERSHIP.md MAINTENANCE.md BUILD-REPORT.md; do
  cp "$PROJ/$f" "$OUT/$f"
done

# ---- 4. scrub ----------------------------------------------------------------
find "$OUT" \( -name '.DS_Store' -o -name 'Thumbs.db' -o -name 'desktop.ini' \
            -o -name '*.log' -o -name '.env' \) -delete
find "$OUT" -name '__MACOSX' -type d -prune -exec rm -rf {} +
find "$OUT" -type d -empty -delete

# ---- 5. hard-fail on secrets -------------------------------------------------
if grep -rIlE '(sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{36}|-----BEGIN [A-Z ]*PRIVATE KEY)' "$OUT" ; then
  echo "ABORT: secret-shaped string found in bundle (see paths above)" >&2; exit 1
fi

# ---- 6. checksums, then zip --------------------------------------------------
( cd "$OUT" && find . -type f -not -name SHA256SUMS.txt -print0 \
    | sort -z | xargs -0 sha256sum > SHA256SUMS.txt )

# -r recurse, -q quiet, -9 max compression, -X drop extra file attrs (smaller, cleaner on Windows)
( cd "$(dirname "$OUT")" && zip -rq9X "$ZIP" "$(basename "$OUT")" \
    -x '*/node_modules/*' '*/.git/*' '*.DS_Store' '*/__MACOSX/*' )

echo "--- bundle ---"; du -sh "$OUT"/*; 
echo "--- zip ---";    ls -lh "$ZIP"; unzip -l "$ZIP" | tail -1
```

No `rsync`? Swap step 2 for:

```bash
# tar-pipe equivalent with the same excludes
mkdir -p "$OUT/source"
( cd "$PROJ" && tar -cf - \
    --exclude=node_modules --exclude=.git --exclude=dist --exclude=out \
    --exclude=.astro --exclude=.vite --exclude=.next --exclude=.cache \
    --exclude='.env*' --exclude='*.log' . ) | ( cd "$OUT/source" && tar -xf - )
```

### 2.3 Size targets

| Thing | Target | Hard ceiling | If you exceed it |
|---|---|---|---|
| `site/` total | ≤ 4 MB | 8 MB | Images. Always images. Re-encode. |
| Single hero image (AVIF) | ≤ 180 KB | 300 KB | Drop quality to q50, cap width at 2000. |
| Single hero image (JPEG fallback) | ≤ 320 KB | 500 KB | q75, progressive. |
| All fonts | ≤ 120 KB | 200 KB | 2 families × 2 weights, `woff2` only, subset to Latin. Variable font if 3+ weights. |
| `site.css` | ≤ 40 KB | 70 KB | You have written too much CSS. |
| `site.js` | ≤ 25 KB | 50 KB | You have reached for a library you did not need. |
| Whole zip **without** originals | ≤ 25 MB | 50 MB | — |
| `assets/originals/` | — | **20 MB** | Over 20 MB: split it out (below). |

**The originals rule.** Client camera-roll originals are the only thing that reliably makes a bundle enormous. If `assets/originals/` exceeds 20 MB, ship **two zips**:

```bash
# Main deliverable — everything the client actually needs.
( cd /home/user/delivery && zip -rq9X "${SLUG}_${STAMP}.zip" "$SLUG" -x "$SLUG/assets/originals/*" )
# Archive — their own untouched files, handed back separately.
( cd /home/user/delivery && zip -rq9X "${SLUG}_${STAMP}_originals.zip" "$SLUG/assets/originals" )
```

Two complete zips, not a split archive. **Never use `zip -s` split volumes** (`.z01`, `.z02`) — Windows Explorer's built-in extractor cannot open them and the client will simply conclude the file is corrupt.

### 2.4 Verify the zip actually runs — this is not optional

Unzipping into a clean directory catches: absolute paths, files that only existed because the dev server generated them, case-sensitivity mistakes (`Hero.jpg` vs `hero.jpg` — invisible on macOS, fatal on Linux hosting), and anything you forgot to copy.

```bash
#!/usr/bin/env bash
# verify-zip.sh <zip> — extract to a pristine dir, serve, assert the page works.
set -euo pipefail
ZIP="${1:?usage: verify-zip.sh <zip>}"
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
unzip -qq "$ZIP" -d "$T"
ROOT="$(find "$T" -maxdepth 2 -type d -name site | head -1)"
[ -n "$ROOT" ] || { echo "FAIL: no site/ directory in zip"; exit 1; }

# checksums survived the round trip
( cd "$(dirname "$ROOT")" && sha256sum -c --quiet SHA256SUMS.txt ) \
  && echo "PASS checksums" || { echo "FAIL checksums"; exit 1; }

# Serve the extracted copy on a port nothing else is using.
# NEVER pass -s/--single here. `serve -s` rewrites every not-found request to
# index.html with a 200, so a missing stylesheet, a broken image and a dead
# internal link all come back "fine" — and the 404 assertions below become
# decoration. -s is for SPAs; a delivered brochure site is not one.
npx --yes serve "$ROOT" -l 4321 >/dev/null 2>&1 &
SRV=$!; trap 'kill $SRV 2>/dev/null; rm -rf "$T"' EXIT
for i in $(seq 1 40); do curl -sf -o /dev/null http://127.0.0.1:4321/ && break || sleep 0.25; done

NODE_PATH="$(npm root -g)" PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
  node "$(dirname "$0")/smoke.cjs" http://127.0.0.1:4321/
```

```js
// smoke.cjs — hard assertions against the EXTRACTED copy. Exit non-zero on any failure.
const { chromium } = require("playwright");

(async () => {
  const url = process.argv[2];
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();

  const failures = [];
  page.on("console",   m => m.type() === "error" && failures.push("console: " + m.text()));
  page.on("pageerror", e => failures.push("pageerror: " + e.message));
  // Any request the page makes that does not come back 2xx/3xx is a broken asset.
  page.on("response",  r => { if (r.status() >= 400) failures.push(`${r.status()} ${r.url()}`); });
  page.on("requestfailed", r => failures.push(`requestfailed ${r.url()} ${r.failure()?.errorText}`));

  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

  // Every <img> decoded to real pixels (naturalWidth 0 = broken, even if the request 200'd).
  const brokenImgs = await page.$$eval("img", els =>
    els.filter(i => !i.complete || i.naturalWidth === 0).map(i => i.currentSrc || i.src));
  brokenImgs.forEach(s => failures.push("broken img: " + s));

  // Fonts actually loaded — catches a wrong @font-face path that silently falls back.
  // document.fonts.size counts DECLARED faces, loaded or not, so it cannot detect the
  // bug it is meant to catch. Check status instead. A site that deliberately uses only
  // system fonts declares none, which is a pass, not a failure.
  const fonts = await page.evaluate(async () => {
    await document.fonts.ready;
    const all = [...document.fonts];
    return { declared: all.length, loaded: all.filter(f => f.status === "loaded").length };
  });
  if (fonts.declared > 0 && fonts.loaded === 0)
    failures.push(`${fonts.declared} @font-face rules declared but none loaded — check the paths`);

  // The page has real content, not an empty shell.
  const textLen = (await page.locator("body").innerText()).trim().length;
  if (textLen < 400) failures.push(`body text only ${textLen} chars — page may not have rendered`);

  // No horizontal overflow at 390px — the single most common mobile defect.
  const of = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (of > 1) failures.push(`horizontal overflow ${of}px at 390w`);

  await browser.close();
  if (failures.length) { console.error("SMOKE FAIL\n" + failures.map(f => "  - " + f).join("\n")); process.exit(1); }
  console.log("SMOKE PASS");
})();
```

If `verify-zip.sh` fails, **the zip does not leave the container.** Fix, repackage, re-verify.

---

## 3. Export routes, in priority order

### 3.0 Decision table

| Situation | Route |
|---|---|
| Default, every time | **A — SendUserFile** (§3.1) |
| User wants it in Drive / wants it on their phone / wants a permanent copy off their laptop | A **then** B (§3.2) |
| User wants a link to send the client today | A **then** C (§3.3) |
| User explicitly says "push it to GitHub" | A **then** D, private repo (§3.4) |
| Zip > ~100 MB | Split per §2.3, then A twice |
| Bundle contains anything you could not licence-verify | Fix it first. Do not export a rights problem. |

Always do **A first**. Everything else is a bonus copy. A is the only route with no external account, no quota, and no network dependency.

### 3.1 Route A — `SendUserFile` (primary)

```
SendUserFile({
  files: ["/home/user/delivery/northgate-joinery_2026-08-02.zip"],
  caption: "Northgate Joinery — complete site bundle. Unzip, open site/index.html to view. "
         + "Lighthouse mobile 98/100/100/100. proof/pitch.html is the client-facing summary.",
  status: "proactive",
  display: "attach"
})
```

- `display: "attach"` for the zip — a download card. Never `"render"`; there is nothing to render and it wastes the panel.
- `status: "proactive"` when you finished autonomously and the user is away — it pushes to their phone. `"normal"` only if they just asked for it in the message you are replying to.
- Send the **pitch page separately** with `display: "render"` so they can look at it immediately without unzipping:

```
SendUserFile({
  files: ["/home/user/delivery/northgate-joinery/proof/pitch.html"],
  caption: "The page to send the client — before/after and the real numbers.",
  status: "normal",
  display: "render"
})
```

For `pitch.html` to render usefully outside the bundle it must be **fully self-contained**: inline CSS, inline JS, images as `data:` URIs. §5.5 builds it that way for exactly this reason.

Send **at most three** files in one turn — zip, pitch, build report. Sending twelve loose files makes the user do the assembly you were supposed to do.

If the transfer fails or the client rejects the size: split per §2.3 and send two complete zips, main one first.

### 3.2 Route B — Google Drive via MCP

Load the tools first:

```
ToolSearch({ query: "select:mcp__Google_Drive__create_file,mcp__Google_Drive__search_files,mcp__Google_Drive__get_file_metadata,mcp__Google_Drive__get_file_permissions", max_results: 6 })
```

**The schema (verified 2026-08-02).** `mcp__Google_Drive__create_file` takes camelCase fields:

| Field | Notes |
|---|---|
| `title` | file name, including extension |
| `parentId` | folder id; omit for My Drive root |
| `contentMimeType` | **required whenever content is provided** |
| `textContent` | UTF-8 text. Use this for anything text-shaped. |
| `base64Content` | base64 for binary. **Mutually exclusive with `textContent`** — setting both is an error. |
| `disableConversionToGoogleType` | **set `true` or your files get eaten** (below) |
| `content`, `mimeType` | deprecated — do not use |

**Trap 1 — silent conversion.** By default Drive converts uploads to Google-native types: `text/plain` becomes a Google Doc, `text/html` becomes a Google Doc, `text/csv` becomes a Sheet. Your `README.md` arrives as a Doc the client cannot edit as markdown, and `pitch.html` arrives as a mangled Doc that no longer renders. **Always pass `disableConversionToGoogleType: true`** unless converting is the explicit goal.

**Trap 2 — the base64 wall. This is the real constraint and it is not in the docs.** There is no path-based upload tool; binary must go through `base64Content`, which means the entire base64 string is emitted as model output tokens.

```
base64 chars = 4 × ceil(bytes / 3)          # +33% size
tokens       ≈ base64 chars / 3             # base64 of compressed data tokenises badly
```

| Zip size | base64 | ≈ tokens | Verdict |
|---|---|---|---|
| 100 KB | 137 KB | ~46 k | fine |
| 300 KB | 410 KB | ~137 k | the practical ceiling — one per session |
| 1 MB | 1.4 MB | ~466 k | exceeds context. Will fail or truncate. |
| 25 MB | 34 MB | ~11 M | impossible |

So: **a real site bundle cannot be uploaded to Drive through this tool.** Do not attempt it, do not burn the context discovering it, and do not tell the user it worked.

**What to actually do:**

```js
// 1. A folder to hold it all.
mcp__Google_Drive__create_file({
  title: "Northgate Joinery — Website 2026-08-02",
  contentMimeType: "application/vnd.google-apps.folder"
})
// → note the returned file id as FOLDER_ID.
// If the server rejects a folder created via contentMimeType, retry once with the
// deprecated `mimeType` field set to the same value — the two fields are in transition.

// 2. Text deliverables — cheap, exact, and the ones the user will actually reread.
mcp__Google_Drive__create_file({
  parentId: FOLDER_ID,
  title: "README.md",
  contentMimeType: "text/markdown",
  textContent: "<the literal file contents>",
  disableConversionToGoogleType: true
})
// repeat for LICENCE-AND-OWNERSHIP.md, MAINTENANCE.md, BUILD-REPORT.md,
// assets/MANIFEST.csv (contentMimeType "text/csv"), proof/VERIFY.txt.

// 3. The pitch page — self-contained HTML renders from Drive preview.
mcp__Google_Drive__create_file({
  parentId: FOLDER_ID,
  title: "pitch.html",
  contentMimeType: "text/html",
  textContent: "<the whole self-contained page>",
  disableConversionToGoogleType: true   // omit this and Drive turns it into a Doc
})

// 4. A pointer file, because the zip is NOT here.
mcp__Google_Drive__create_file({
  parentId: FOLDER_ID,
  title: "WHERE-IS-THE-ZIP.txt",
  contentMimeType: "text/plain",
  textContent: "The full bundle (site + source + assets, 18 MB) was delivered as a\n"
             + "file attachment in chat: northgate-joinery_2026-08-02.zip\n"
             + "Drag it into this folder to keep everything together.",
  disableConversionToGoogleType: true
})
```

`textContent` has no 33% inflation and tokenises normally, so text files up to a few hundred KB are genuinely fine. That is why Drive gets the *documents* and SendUserFile gets the *bundle*.

If the user insists the zip must reach Drive from the container, the only mechanism is splitting — and you should talk them out of it:

```bash
split -b 200k "$ZIP" part_      # → part_aa, part_ab, ... each base64'd in a separate call
```
…then N `create_file` calls with `contentMimeType: "application/octet-stream"`, plus reassembly instructions (`cat part_* > site.zip` on macOS, `copy /b part_* site.zip` on Windows). A 20 MB zip is 100 parts and roughly 9 M tokens. **Say plainly that this is not worth it** and offer instead: "I'll send the zip in chat; drag it into the Drive folder yourself — it takes ten seconds."

**Verify before you claim success.** The create call returning is not proof the user can find it:

```js
mcp__Google_Drive__search_files({ query: "title contains 'Northgate Joinery' and owner = 'me'" })
mcp__Google_Drive__get_file_metadata({ fileId: FOLDER_ID })
mcp__Google_Drive__get_file_permissions({ fileId: FOLDER_ID })  // confirm it is not world-readable
```

Client work should be **private by default** in Drive. Do not create public sharing links unless asked, and if you do, say so explicitly in your handoff message.

### 3.3 Route C — a free live preview link

The purpose is a URL the user can text their client this afternoon. It is a **preview**, not the client's production hosting — say that in the handoff, or you will be blamed for an outage on a domain you do not control.

Deploy `site/` **after** `verify-zip.sh` passes, so the thing on the internet is byte-identical to the thing in the zip.

| Host | Deploy without a git repo? | Command | Login needed? | Notes |
|---|---|---|---|---|
| **Netlify** | **yes** | `npx netlify-cli deploy --dir=site --no-build` | **no** — `--allow-anonymous` creates a *claimable* site | Best fit for a container. Draft deploy by default; `--prod` for the live URL. |
| **Cloudflare Pages** | yes (Direct Upload) | `npx wrangler pages deploy site` | yes (`wrangler login`, interactive, or `CLOUDFLARE_API_TOKEN`) | Limits: 20,000 files, 25 MiB per file. **A Direct Upload project can never be switched to git later** — new project required. |
| **Vercel** | yes | `npx vercel deploy ./site --yes` | yes (`vercel login` or `VERCEL_TOKEN`) | First deploy of a new project is automatically production. `stdout` is always the deployment URL. |
| Netlify Drop (web UI) | yes, drag a folder at `app.netlify.com/drop` | — | — | For the *user*, not for you — you cannot drag a folder from a container. Put it in the README as their manual option. |
| GitHub Pages | **no** — requires a repo | — | — | Disqualified by the no-GitHub rule. |

**The one that works from an ephemeral container with no user credentials:**

```bash
# Anonymous, claimable Netlify deploy. Verified flags: --dir, --no-build,
# --allow-anonymous ("deploy anonymously and create a claimable site instead of
# requiring authentication"), --prod (production instead of the default draft).
cd /home/user/delivery/northgate-joinery
npx --yes netlify-cli deploy --dir=site --no-build --allow-anonymous --prod 2>&1 | tee /tmp/deploy.log
grep -Eo 'https://[a-z0-9.-]+\.netlify\.app[^ ]*' /tmp/deploy.log | sort -u
```

The output contains **two** URLs: the live site and a **claim URL**. Give the user both and tell them plainly: *an unclaimed anonymous site is temporary — open the claim link and attach it to your own free Netlify account to keep it.* Do not assert a specific expiry window unless the CLI printed one; quote what it printed.

If the user has a token, prefer the authenticated path — it produces a site they own from the start:

```bash
npx --yes netlify-cli deploy --dir=site --no-build --prod --auth "$NETLIFY_AUTH_TOKEN"
```

Then confirm the deployed site actually works, from the outside:

```bash
node smoke.cjs https://your-preview-url.netlify.app/     # same assertions as §2.4
```

**Before deploying anything publicly**, check with the user if the site contains: the client's unannounced pricing, an unlaunched brand, staff photos, or anything under NDA. A "temporary preview link" is a public URL. When in doubt, deploy a password-less preview only after asking, or skip route C entirely.

Add to the README:

```markdown
## Where it is live right now
Preview: https://northgate-joinery-preview.netlify.app
This is a temporary preview so you can show people. It is not your final
hosting. To make it permanent, open the claim link that was sent with this
bundle and attach the site to your own free Netlify account — or upload the
contents of `site/` to whatever hosting you already pay for.
```

### 3.4 Route D — git, only when told

Requires the user to say it in words, in this conversation. Then:

1. **Private repo.** Never public. Client work, client photos, client pricing.
2. Add a `.gitignore` before the first commit — `node_modules/`, `.env*`, `dist/` (unless deploying from it), `assets/originals/` if large, `.DS_Store`, `*.log`.
3. Re-run the secret scan from `package.sh` step 5 against the working tree, not just the bundle.
4. Branch, don't commit to the default branch.
5. `assets/originals/` — camera-roll originals belong in the zip, not in git history where they are permanent.

```bash
gh repo create "northgate-joinery-site" --private --source=. --remote=origin --push
```

Or with the GitHub MCP tools if `gh` is unavailable: `mcp__github__create_repository` (set `private: true`) then `mcp__github__push_files`.

Never mirror a private client site into a public repo "for the portfolio". That is the user's call to make with their client, not yours.

---

## 4. Running it locally — instructions for a non-developer

### 4.1 The zero-build vanilla case

**Windows**
1. Right-click the zip → **Extract All…** → Extract. *(Do not work inside the zip preview — Windows lets you open files from it, and half the site's links will fail.)*
2. Open the extracted folder → open `site`.
3. Double-click `index.html`.

**macOS**
1. Double-click the zip. A folder appears next to it.
2. Open the folder → open `site`.
3. Double-click `index.html`. *(If it opens in a text editor instead of a browser: right-click → Open With → Safari or Chrome.)*

That is the whole thing for a static site. It should be genuinely true — see §4.2 for the small print, and design the site so the small print is as small as possible.

### 4.2 Why some things need a local server

Opening a file directly gives the page a `file://` origin, which browsers treat as opaque. What breaks:

| Feature | On `file://` | Mitigation at build time |
|---|---|---|
| `fetch()` of a local JSON/HTML file | blocked by CORS | inline the data into the HTML — then it never breaks |
| `<script type="module">` | blocked by CORS | ship one classic `<script defer>` bundle for the delivered build |
| Service worker | never registers | don't ship one for a brochure site |
| `canvas.getImageData()` on a local image | tainted-canvas error | avoid, or accept degradation |
| Web fonts | usually **fine** with relative paths | keep paths relative |
| CSS, images, scroll-driven animations, IntersectionObserver | **fine** | — |
| Same-document view transitions (`document.startViewTransition`) | **fine** | Baseline newly available (Chrome 111, Safari 18, Firefox 144) |
| **Cross-document** view transitions (`@view-transition`) | **never fire** | Each `file://` document is its own opaque origin, so the same-origin requirement fails. Also Baseline *limited* — Chrome 126, Safari 18.2, **no Firefox**. Treat the un-transitioned navigation as the real design. |

**Design goal: the delivered vanilla build has zero `file://` breakage.** If you achieve it, say so in the README and skip §4.3 entirely. If you cannot — e.g. the site loads `data/projects.json` — then either inline it or write this honestly:

> The photo gallery loads its list from a separate data file, which browsers block when a page is opened straight from your hard drive. Everything else works. To see the gallery, use the one-line server below, or just view the live preview link.

### 4.3 The one-line local server

**Windows** — press `Win`, type `powershell`, Enter. Then:

```powershell
cd "$env:USERPROFILE\Downloads\northgate-joinery\site"
python -m http.server 8000
```
Then open `http://localhost:8000` in the browser. Stop with `Ctrl+C`.
No Python? `py -m http.server 8000`. Still no? Install Node from https://nodejs.org (LTS button) and use `npx serve` instead.

**macOS** — press `Cmd+Space`, type `terminal`, Enter. Then:

```bash
cd ~/Downloads/northgate-joinery/site
python3 -m http.server 8000
```
Open `http://localhost:8000`. Stop with `Ctrl+C`. Python 3 ships with current macOS; if it prompts to install developer tools, accept, or use `npx serve` after installing Node.

Both, if Node is present (works identically on either OS):

```bash
npx --yes serve .          # prints the URL, e.g. http://localhost:3000
```

What success looks like: the terminal prints a `http://localhost:...` line and then appears to hang. **That is correct** — it is running. Leave the window open while you look at the site.

### 4.4 The Astro / React / Vite case

Put this in `README.md` only when `source/` exists.

```markdown
## Building the site from source

You only need this if you want to change the layout or add pages. To change
text, prices, or photos, see MAINTENANCE.md — no build needed.

### 1. Install Node.js
Download the **LTS** version from https://nodejs.org and run the installer.
This project targets Node **24** (the current Long Term Support release as of
August 2026). Node 22 also works. Node 20 and older are end-of-life — do not
use them.

Check it worked — open PowerShell (Windows) or Terminal (Mac):

    node -v      → should print v24.x.x  (or v22.x.x)
    npm -v       → should print a version number

### 2. Open a terminal in the source folder
Windows: open the `source` folder in File Explorer, click the address bar,
type `powershell`, press Enter.
Mac: right-click the `source` folder → Services → New Terminal at Folder.

### 3. Install the dependencies (once, ~1 minute, needs internet)

    npm install

This creates a `node_modules` folder of about 200 MB. That folder is not in
your bundle on purpose — it is rebuilt from scratch by this command.

### 4. Work on it

    npm run dev

Prints something like `http://localhost:4321`. Open it. Edits to files in
`src/` appear in the browser instantly. Stop with Ctrl+C.

### 5. Produce the real, publishable site

    npm run build        # writes the finished site into  dist/
    npm run preview      # serves dist/ so you can check it before uploading

Upload the **contents of `dist/`** to your hosting. `dist/` is the same thing
as the `site/` folder in this bundle.
```

Troubleshooting table — include it, these four cover most of what happens:

| Message | Meaning | Fix |
|---|---|---|
| `'npm' is not recognized` / `command not found: npm` | Node isn't installed, or the terminal predates the install | Install Node, then **close and reopen the terminal** |
| `EACCES` / permission denied (Mac) | installing into a system folder | You are in the wrong directory. `cd` into `source` first. Never use `sudo npm install`. |
| `Unsupported engine` / `requires Node >=22` | wrong Node major | Install Node 24 LTS |
| `port 4321 is already in use` | a previous run is still going | Close the other terminal, or `npm run dev -- --port 4322` |

Ship `.nvmrc` containing `24` so anyone using `nvm` gets the right version with `nvm use`, and pin it in `package.json`:

```json
{ "engines": { "node": ">=22" } }
```

Set the floor at 22 (still in maintenance LTS), target 24 in the docs. Do not pin an exact patch — it only causes install failures.

---

## 5. The client pitch page

### 5.1 What it is

A single self-contained HTML page whose job is to make the client feel the value **before** they open the site. The user forwards it, or opens it on a laptop in the client's kitchen. It is a sales document made of true statements.

It is **not** a case study for your portfolio, not a changelog, and not a place for invented numbers. Every figure on it is either produced by a tool in this repo or omitted.

### 5.2 Structure

| # | Section | Content | Rule |
|---|---|---|---|
| 1 | Hero | Business name, one line — *"Your site, rebuilt."* — and the single strongest number | One number only. Usually load time or the mobile performance score. |
| 2 | Before / after | Draggable comparison at mobile and desktop, real screenshots | Same viewport, same scroll position, same day. No cheating. |
| 3 | The numbers | Lighthouse 4-score row, plus LCP / CLS / total page weight, before vs after | Link to the raw report. Numbers you can't source get cut. |
| 4 | What changed and why | 4–6 items, each *observation → change → benefit in the client's language* | "Faster" is not a benefit. "Loads before someone gives up — 53% leave after 3 seconds on mobile" is. |
| 5 | What you received | The bundle contents in client terms: pages, photos processed, mobile layouts, ownership | Sets the value of the thing they are holding. |
| 6 | What's next | Anything needing their input (§6.5) + the honest "not included" list | Ending on a clear ask beats ending on a flourish. |

Length: one scroll on desktop, four or five on mobile. If it needs a table of contents it has failed.

### 5.3 Capturing before/after with Playwright

Same viewports, same wait conditions, both sites, one script. Run **before** you start rebuilding if the old site might be taken down.

```js
// shots.cjs — usage:
//   node shots.cjs before https://oldsite.example      /out/proof/before
//   node shots.cjs after  http://127.0.0.1:4321        /out/proof/after
const { chromium } = require("playwright");
const path = require("path");

const VIEWPORTS = [
  { name: "mobile",  width: 390,  height: 844,  dsf: 3 },   // iPhone-class
  { name: "tablet",  width: 768,  height: 1024, dsf: 2 },
  { name: "desktop", width: 1440, height: 900,  dsf: 2 },
];

(async () => {
  const [label, url, outDir] = process.argv.slice(2);
  const browser = await chromium.launch();

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.dsf,
      // Freeze motion so before/after are comparable and never catch a mid-animation frame.
      reducedMotion: "reduce",
      colorScheme: "light",
    });

    if (process.env.HTTPS_PROXY && !url.includes("127.0.0.1")) {
      await ctx.route("**/*", async (r) => {
        try { await r.fulfill({ response: await ctx.request.fetch(r.request(), { timeout: 20000, maxRedirects: 5 }) }); }
        catch { await r.abort(); }
      });
    }

    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });

    // Trigger lazy-loaded content, then return to the top so the fold shot is honest.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight)
        { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 250)); }
      window.scrollTo(0, 0);
    });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(600);          // let any entrance settle

    // Above the fold — this is the pair that goes in the slider.
    await page.screenshot({ path: path.join(outDir, `${label}-${vp.name}-fold.png`) });
    // Full page — for the "what changed" section and for your own records.
    await page.screenshot({ path: path.join(outDir, `${label}-${vp.name}-full.png`), fullPage: true });

    await ctx.close();
  }
  await browser.close();
  console.log("shots written to", outDir);
})();
```

Then shrink for embedding — the pitch page inlines these as data URIs and a 3× PNG will bloat it to 20 MB:

```bash
# Target ≤ 120 KB each. If ImageMagick is absent, use sharp or squoosh-cli via npx.
for f in proof/{before,after}/*-fold.png; do
  magick "$f" -resize 1200x -quality 72 "${f%.png}.jpg" && rm "$f"
done
du -ch proof/*/*.jpg | tail -1     # keep the total under ~700 KB
```

**Honesty rules for the screenshots:**
- Same day, same viewport, same scroll position, `reducedMotion: "reduce"` on both.
- Do not crop the old site to hide something that works, and do not screenshot it mid-load to make it look empty.
- If the old site is behind Cloudflare/consent walls and won't render, say so on the pitch page — *"their old site could not be captured automatically; screenshot supplied by the client"* — rather than faking it.
- **If there is no old site**, drop section 2 entirely and rename section 3 to "How it performs". Never fabricate a "before".

### 5.4 Real Lighthouse numbers

```bash
# Serve the BUILT site — never measure the dev server, its numbers are meaningless.
# No -s: see §2.4. Under -s a 404 returns index.html at 200 and Lighthouse
# scores a page that does not exist.
npx --yes serve site -l 4321 >/dev/null 2>&1 &
sleep 2

export CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome

# Do NOT add --preset=perf here. That preset forces --only-categories=performance,
# which silently overrides the four categories below; the extraction script then
# throws on r.categories.accessibility being undefined.
npx --yes lighthouse http://127.0.0.1:4321 \
  --form-factor=mobile --screenEmulation.mobile \
  --output=html --output=json \
  --output-path=./proof/lighthouse-mobile \
  --chrome-flags="--headless=new --no-sandbox --disable-dev-shm-usage" \
  --only-categories=performance,accessibility,best-practices,seo \
  --quiet

npx --yes lighthouse http://127.0.0.1:4321 \
  --form-factor=desktop --screenEmulation.disabled --throttling-method=simulate \
  --output=html --output=json --output-path=./proof/lighthouse-desktop \
  --chrome-flags="--headless=new --no-sandbox" --quiet
```

**Filenames.** With two `--output` formats, Lighthouse appends its own suffixes: `--output-path=./proof/lighthouse-mobile` writes `lighthouse-mobile.report.html` and `lighthouse-mobile.report.json`, *not* `lighthouse-mobile.html`. Either rename after the run or use the real names in the tree (§1.1 lists the short form):

```bash
for v in mobile desktop; do
  mv -f "proof/lighthouse-$v.report.html" "proof/lighthouse-$v.html" 2>/dev/null || true
done
```

Extract the numbers so nothing is transcribed by hand (this reads the `.report.json`, so run it *before* any rename of the JSON):

```bash
node -e '
const r = require("./proof/lighthouse-mobile.report.json");
const pct = c => Math.round(r.categories[c].score * 100);
const a = r.audits;
const out = {
  url: r.finalDisplayedUrl,
  fetchedAt: r.fetchTime,
  lighthouseVersion: r.lighthouseVersion,
  scores: { performance: pct("performance"), accessibility: pct("accessibility"),
            bestPractices: pct("best-practices"), seo: pct("seo") },
  metrics: { LCP: a["largest-contentful-paint"].displayValue,
             CLS: a["cumulative-layout-shift"].displayValue,
             TBT: a["total-blocking-time"].displayValue,
             SI:  a["speed-index"].displayValue,
             bytesKB: Math.round(a["total-byte-weight"].numericValue / 1024) }
};
require("fs").writeFileSync("./proof/lighthouse-summary.json", JSON.stringify(out, null, 2));
console.log(out);'
```

**Rules:**
- Run it **three times** and report the median. A single cold run in a shared container is noise, and a suspiciously perfect score you cannot reproduce will embarrass you when the client re-runs it on PageSpeed Insights.
- Report the **mobile** figure by default; mobile is where the client's customers are and it is the harder number.
- These are **lab** numbers. Label them as such on the pitch page: *"measured in a simulated mid-range mobile on a throttled 4G connection"*. Never present a lab score as field data.
- Measure the *old* site the same way, same night, same command, for the before column. If you can't (site gone, geo-blocked), leave the before column empty and say why.

### 5.5 `pitch.html` — self-contained, native, reduced-motion-safe

Everything inline; images as data URIs; no network requests; the comparison slider is a native `<input type="range">` driving one custom property.

```html
<!-- proof/pitch.html — self-contained. Inline the base64 images where marked. -->
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Northgate Joinery — your new site</title>

<style>
  /* ---- tokens: the only place colour/type is defined --------------------- */
  :root{
    --c-paper:#faf8f5; --c-ink:#17140f; --c-muted:#6b6459;
    --c-accent:#8a5a2b; --c-line:color-mix(in oklab, var(--c-ink) 12%, transparent);
    --c-good:#1f7a4d; --c-bad:#a8321f;
    --f-display:"Fraunces",Georgia,"Times New Roman",serif;
    --f-text:"Inter",system-ui,-apple-system,"Segoe UI",sans-serif;
    --step:clamp(3rem,7vw,6rem);        /* vertical rhythm between sections */
    --measure:68ch;
  }
  @media (prefers-color-scheme:dark){
    :root{ --c-paper:#12100d; --c-ink:#f2ede5; --c-muted:#a49b8c;
           --c-accent:#d19a5e; --c-good:#4dbd85; --c-bad:#e0705a; }
  }
  *,*::before,*::after{ box-sizing:border-box }
  body{ margin:0; background:var(--c-paper); color:var(--c-ink);
        font:400 clamp(1rem,.4vw + .95rem,1.125rem)/1.6 var(--f-text);
        -webkit-text-size-adjust:100%; overflow-x:hidden }
  h1,h2,h3{ font-family:var(--f-display); font-weight:600; line-height:1.05;
            letter-spacing:-.02em; text-wrap:balance; margin:0 0 .5em }
  h1{ font-size:clamp(2.5rem,7vw,5rem) }
  h2{ font-size:clamp(1.75rem,3.5vw,2.75rem) }
  p{ max-width:var(--measure); text-wrap:pretty }
  main{ width:min(100% - 2.5rem, 68rem); margin-inline:auto }
  section{ padding-block:var(--step); border-top:1px solid var(--c-line) }
  section:first-of-type{ border-top:0 }
  .eyebrow{ font:600 .78rem/1 var(--f-text); letter-spacing:.14em;
            text-transform:uppercase; color:var(--c-accent); margin:0 0 1rem }

  /* ---- entrance: view() timeline, progressively enhanced ----------------- */
  @supports (animation-timeline: view()){
    @media (prefers-reduced-motion: no-preference){
      .reveal{
        animation: rise both linear;
        animation-timeline: view();
        animation-range: entry 10% cover 26%;   /* done well before it's centred */
      }
      @keyframes rise{ from{ opacity:0; transform:translate3d(0,1.5rem,0) } /* GPU-only */
                       to  { opacity:1; transform:none } }
    }
  }
  /* No view(), or reduced motion → fully visible, no JS needed. Nothing to fall back to. */

  /* ---- hero -------------------------------------------------------------- */
  .hero{ min-height:min(78svh,44rem); display:grid; align-content:center; gap:1rem }
  .hero__figure{ font-family:var(--f-display); font-size:clamp(4rem,17vw,11rem);
                 line-height:.85; letter-spacing:-.045em; color:var(--c-accent) }
  .hero__figure small{ font-size:.28em; letter-spacing:0; color:var(--c-muted);
                       display:block; margin-top:.6em; font-family:var(--f-text) }

  /* ---- before/after: range input drives one custom property -------------- */
  .ba{ position:relative; border-radius:.75rem; overflow:hidden;
       border:1px solid var(--c-line); background:var(--c-line);
       aspect-ratio:390/560; touch-action:pan-y }   /* let the page still scroll on touch */
  @media (min-width:48rem){ .ba{ aspect-ratio:1440/900 } }
  .ba img{ position:absolute; inset:0; width:100%; height:100%;
           object-fit:cover; object-position:top center; display:block }
  /* Only the TOP layer is clipped. clip-path is paint-only: no layout, no reflow. */
  .ba__after{ clip-path: inset(0 calc(100% - var(--pos,50%)) 0 0) }

  /* The handle is a FULL-WIDTH box moved with transform, not an element whose `left`
     is rewritten on every pointer move. `left` is a layout property: setting it each
     input event forces layout on every frame of the drag. A percentage translateX
     resolves against the element's own border-box, so a width:100% handle translated
     by var(--pos) lands exactly where left:var(--pos) would have — on the compositor. */
  .ba__handle{ position:absolute; inset-block:0; left:0; width:100%;
               transform:translateX(var(--pos,50%)); will-change:transform;
               pointer-events:none }
  .ba__handle::before{ content:""; position:absolute; inset-block:0; left:-1px; width:2px;
               background:var(--c-paper);
               box-shadow:0 0 0 1px color-mix(in oklab,var(--c-ink) 30%,transparent) }
  .ba__handle::after{ content:""; position:absolute; top:50%; left:0;
               width:2.75rem; aspect-ratio:1; translate:-50% -50%; border-radius:50%;
               background:var(--c-paper);
               box-shadow:0 1px 10px color-mix(in oklab,var(--c-ink) 35%,transparent) }
  /* The real control: a native range input, so it is keyboard- and AT-accessible for free. */
  .ba__range{ position:absolute; inset:0; width:100%; height:100%;
              margin:0; opacity:0; cursor:ew-resize; appearance:none; background:none;
              touch-action:pan-y }
  /* Outline the knob, not the invisible full-width handle box. */
  .ba__range:focus-visible ~ .ba__handle::after{ outline:3px solid var(--c-accent); outline-offset:3px }
  /* pointer-events:none is REQUIRED — the tags come after .ba__range in the DOM and
     would otherwise sit on top of it, swallowing any drag that starts on a badge. */
  .ba__tag{ position:absolute; top:.75rem; padding:.3rem .6rem; border-radius:.35rem;
            font:600 .7rem/1 var(--f-text); letter-spacing:.1em; text-transform:uppercase;
            background:color-mix(in oklab,var(--c-paper) 88%,transparent); color:var(--c-ink);
            pointer-events:none }
  .ba__tag--l{ left:.75rem } .ba__tag--r{ right:.75rem }

  /* ---- scores ------------------------------------------------------------ */
  .scores{ display:grid; gap:1px; background:var(--c-line);
           grid-template-columns:repeat(auto-fit,minmax(9rem,1fr));
           border:1px solid var(--c-line); border-radius:.75rem; overflow:hidden }
  .score{ background:var(--c-paper); padding:1.5rem 1.25rem; display:grid; gap:.35rem }
  .score__n{ font-family:var(--f-display); font-size:clamp(2.5rem,6vw,3.5rem);
             line-height:1; color:var(--c-good); font-variant-numeric:tabular-nums }
  .score__l{ font-size:.8rem; color:var(--c-muted) }
  .score__was{ font-size:.8rem; color:var(--c-bad) }
  .score__was s{ text-decoration-thickness:1px }

  /* ---- changes ----------------------------------------------------------- */
  .changes{ list-style:none; padding:0; margin:0; display:grid; gap:2rem }
  @media (min-width:48rem){ .changes{ grid-template-columns:repeat(2,1fr); gap:2.5rem 3rem } }
  .changes h3{ font-size:1.15rem; margin-bottom:.35em }
  .changes p{ margin:0; color:var(--c-muted); font-size:.95rem }
  .changes p + p{ margin-top:.5rem; color:var(--c-ink) }

  .note{ font-size:.85rem; color:var(--c-muted); max-width:var(--measure) }
  footer{ padding-block:var(--step); color:var(--c-muted); font-size:.85rem }
</style>

<main>
  <section class="hero">
    <p class="eyebrow">Northgate Joinery — August 2026</p>
    <h1>Your site, rebuilt.</h1>
    <p class="hero__figure">1.2s<small>to first paint on a phone. It was 6.8s.</small></p>
  </section>

  <section class="reveal">
    <p class="eyebrow">Before and after</p>
    <h2>Same business. Same phone.</h2>
    <p>Drag the handle. Both captured on 2 August 2026 at 390&nbsp;px wide — the width of a typical phone.</p>

    <div class="ba">
      <img class="ba__before" src="data:image/jpeg;base64,PASTE_BEFORE" alt="The previous website on a phone: small text, a large logo, and the phone number below the fold.">
      <img class="ba__after"  src="data:image/jpeg;base64,PASTE_AFTER"  alt="The new website on a phone: a full-width workshop photograph, the trade name, and a tap-to-call button visible immediately.">
      <input class="ba__range" type="range" min="0" max="100" value="50" step="0.1"
             aria-label="Reveal the new site" oninput="this.closest('.ba').style.setProperty('--pos', this.value + '%')">
      <span class="ba__handle" aria-hidden="true"></span>
      <span class="ba__tag ba__tag--l">Before</span>
      <span class="ba__tag ba__tag--r">After</span>
    </div>
    <p class="note">Keyboard: focus the slider and use the arrow keys.</p>
  </section>

  <section class="reveal">
    <p class="eyebrow">Measured, not claimed</p>
    <h2>The numbers</h2>
    <div class="scores">
      <div class="score"><span class="score__n">98</span><span class="score__l">Performance</span><span class="score__was">was <s>31</s></span></div>
      <div class="score"><span class="score__n">100</span><span class="score__l">Accessibility</span><span class="score__was">was <s>64</s></span></div>
      <div class="score"><span class="score__n">100</span><span class="score__l">Best practices</span><span class="score__was">was <s>75</s></span></div>
      <div class="score"><span class="score__n">100</span><span class="score__l">SEO</span><span class="score__was">was <s>82</s></span></div>
    </div>
    <p class="note">Google Lighthouse 13.4.1, mobile profile, simulated mid-range Android on throttled 4G,
      median of three runs, 2 August 2026. Full reports are in the <code>proof</code> folder of your
      bundle. You can check these yourself for free at <code>pagespeed.web.dev</code>.</p>
  </section>

  <section class="reveal">
    <p class="eyebrow">What changed</p>
    <h2>And why it matters to you</h2>
    <ol class="changes">
      <li>
        <h3>Your phone number is now tappable, above the fold</h3>
        <p>It used to sit at the bottom of the page as plain text.</p>
        <p>Most people find you on a phone and want to call, not read. One tap, no typing.</p>
      </li>
      <li>
        <h3>Photographs are 12× smaller — and look better</h3>
        <p>The old site sent 8.4&nbsp;MB of images to every visitor. Now it sends 680&nbsp;KB.</p>
        <p>The page appears before someone gives up. On a rural 4G signal that is the difference between an enquiry and a bounce.</p>
      </li>
      <li>
        <h3>It is built for a phone first</h3>
        <p>The old site was a desktop layout shrunk down; text was unreadable without pinching.</p>
        <p>Roughly two-thirds of your visitors are on a phone. They now get a layout designed for one.</p>
      </li>
      <li>
        <h3>Search engines can read it</h3>
        <p>Headings, business details and services are now marked up in a structured way, with a sitemap.</p>
        <p>Google can show your opening hours and location directly in results.</p>
      </li>
    </ol>
  </section>

  <section class="reveal">
    <p class="eyebrow">What you received</p>
    <h2>Yours outright</h2>
    <ul>
      <li>A complete website — 3 pages, working on phones, tablets and desktops</li>
      <li>24 of your photographs cropped, colour-corrected and optimised for the web</li>
      <li>Your logo redrawn as a vector, so it is sharp at any size, including print</li>
      <li>Plain-English instructions for changing text, prices and photos yourself</li>
      <li>Full ownership — no licence fees, no lock-in, no monthly charge to us</li>
    </ul>
  </section>

  <section class="reveal">
    <p class="eyebrow">To finish</p>
    <h2>Two things we need from you</h2>
    <ol>
      <li>A photograph of the team — the current placeholder is a workshop shot.</li>
      <li>Confirmation of your 2026 call-out charge for the Services page.</li>
    </ol>
    <p class="note">Not included: domain registration, hosting, and email — those stay in your name with your existing provider.</p>
  </section>

  <footer>Prepared 2 August 2026. Performance figures are laboratory measurements and will vary with a visitor's device and connection.</footer>
</main>
```

Notes on why it is built this way:
- **No library.** The slider is `<input type="range">` + one custom property; the entrance is `animation-timeline: view()`. Nothing here needs GSAP, Motion or Lenis.
- **`clip-path: inset()` on the top layer only** — paint-only, no layout. Never animate `width` for a comparison slider.
- **The handle moves with `transform`, not `left`.** Both would look identical; only one avoids a layout pass on every frame of the drag. This is the whole rule: if a value changes during an interaction, it must be `transform`, `opacity`, `clip-path` or `filter` — never `left`, `top`, `width`, `height`, `margin` or `padding`.
- **Reduced motion**: the entrance block sits inside `@media (prefers-reduced-motion: no-preference)` nested in `@supports`. With reduced motion, or in a browser without `view()`, elements are simply visible — the fallback is the default state, so there is nothing to get wrong. This is the *only* animated effect on the page; the slider is user-driven, not motion, and needs no branch.
- **`animation: rise both linear` deliberately omits a duration.** `animation-duration`'s initial value is `auto`, which for a progress-based timeline means "the whole range". Adding an explicit `1s` would be ignored on a scroll timeline but would become a real 1s animation in any browser that supports `@supports (animation-timeline: view())` partially. Leave it off.
- **Dark mode** via tokens only, so the page looks deliberate wherever the client opens it.
- **`touch-action: pan-y`** on `.ba` *and* on `.ba__range` — the property is not inherited, and the range input is the element actually hit-tested, so vertical page scrolling on a phone depends on it being set there too.

**Browser support for the entrance, verified 2026-08-02.** `animation-timeline: view()` is **Baseline: Limited**, not widely available:

| Engine | Scroll-driven animations |
|---|---|
| Chrome / Edge | 115+ (July 2023) |
| Safari / iOS Safari | 26+ (September 2025) |
| **Firefox** | **not implemented** — Mozilla's position is positive, but it has not shipped |

So a Firefox visitor sees no entrance animation at all. That is *fine* — the fallback is the finished state — but say it plainly rather than implying the effect is universal. `CSS.supports("animation-timeline: view()")` returns true in Chromium, so the `@supports` guard is a valid detector and the non-supporting path is genuinely reached rather than being dead code.

One thing this page does that you should **not** copy into the delivered site: `body { overflow-x: hidden }`. On a self-contained one-off it is insurance; on the client's site it *hides* horizontal overflow rather than fixing it, and it will mask the exact defect §7.2.1 exists to catch.

Inline the images:

```bash
node -e '
const fs=require("fs");
let h=fs.readFileSync("proof/pitch.html","utf8");
for (const [tok,f] of [["PASTE_BEFORE","proof/before/before-mobile-fold.jpg"],
                       ["PASTE_AFTER", "proof/after/after-mobile-fold.jpg"]])
  h=h.replace(tok, fs.readFileSync(f).toString("base64"));
fs.writeFileSync("proof/pitch.html",h);
console.log("pitch.html", (Buffer.byteLength(h)/1024).toFixed(0)+" KB");'
```
Keep `pitch.html` under **1.5 MB** so it opens instantly from an email attachment.

---

## 6. The build report — for the user, not the client

`BUILD-REPORT.md` is where you are candid. The user is deciding whether to put their name on this. They need provenance, reasoning, and an honest list of what is not done.

````markdown
# Build report — Northgate Joinery
Built 2026-08-02 · bundle `northgate-joinery_2026-08-02.zip` · gate: PASS (see proof/VERIFY.txt)

## 1. Where every asset came from
| Asset | Source | How obtained | Rights | Ships? |
|---|---|---|---|---|
| 18 workshop/product photos | Client | WeTransfer 2026-07-28, HEIC originals | Client-owned | Yes → converted AVIF+JPEG |
| Logo | Client | 512px PNG from old site header | Client-owned; redrawn as SVG | Yes |
| 6 site photos | Old site scrape (`oldsite.example`) | Playwright harvest | Client-owned (their own site) | Yes, 2 of 6 — rest below 900px |
| Team photo | **None available** | — | — | **No** — placeholder in use, see §5 |
| Inter, Fraunces | Google Fonts | Downloaded, subset, self-hosted | SIL OFL 1.1 — commercial embedding permitted | Yes |
| Icons | Drawn for this project | — | Transferred to client | Yes |
Full row-level detail: `assets/MANIFEST.csv`.

**Nothing from a stock library. No third-party CDN at runtime — zero visitor data
leaves the site.**

## 2. Motion decisions
| Where | Chosen | Why this and not something else |
|---|---|---|
| Hero heading | `animation-timeline: view()`, masked rise | Native scroll-driven; no JS, no jank. Baseline *limited* — Chrome/Edge 115+, Safari 26+, **not Firefox**. Fallback in Firefox and under reduced motion = the finished, visible state. |
| Section entrances | Same, `entry 10% cover 26%` | Finishes early; nothing is ever mid-fade when read. |
| Gallery hover | `transform: scale(1.03)` + `clip-path` wipe | GPU-only. Disabled under `hover: none`. |
| Sticky testimonial | `position: sticky` | Pure CSS. No scroll listener anywhere on the site. |
| Header shrink | `IntersectionObserver` on a sentinel | Avoids a scroll handler; one callback per crossing. |
**No animation library was used.** GSAP/Motion/Lenis were considered and rejected:
nothing here needs a timeline, a physics solver, or scroll hijacking, and each
would add 30–70 KB to a site whose entire JS budget is 25 KB.

`prefers-reduced-motion: reduce` removes every transform and duration —
verified mechanically, `proof/VERIFY.txt` line "reduced-motion".

## 3. Tools and cost tier
| Tool | Used for | Tier |
|---|---|---|
| Playwright (preinstalled) | Screenshots, gate checks | Free, local |
| Lighthouse via npx | Performance measurement | Free, local |
| sharp / ImageMagick | AVIF + WebP + JPEG derivatives | Free, local |
| Google Fonts (download only) | Inter, Fraunces | Free, OFL |
| Netlify anonymous deploy | Preview link | Free tier, claimable |
**Total spend: zero.** No paid API, no stock licence, no subscription. Nothing in
the bundle creates a recurring cost for the client.

## 4. Not finished
- `thank-you.html` uses browser-default form validation only; no server-side handling
  (there is no server). Form posts to a `mailto:` — fine for low volume, will need a
  form service (Formspree free tier ≈ 50/month) if enquiries grow.
- No cookie banner, because there is no analytics and no third-party cookie. If the
  client adds Google Analytics, they will need one.
- Only English. If the second language discussed on 2026-07-30 is still wanted, the
  copy deck is ready in `source/content/` — add `content/cy/` and duplicate the keys.
- **Only Chromium was actually run.** Firefox and WebKit are not installed in the build
  container, so every figure and every gate line in `proof/VERIFY.txt` is Chromium-only.
  Firefox does not implement scroll-driven animations at all, so its users get the
  finished state with no entrance — safe by construction, but unobserved. Safari 26+
  supports them; Safari below 26 also falls back to visible. Nobody has looked at either.

## 5. Needs the client's decision
1. **Team photo** — placeholder is a workshop shot. Any group photo at 1600px+ works.
2. **Call-out charge** — the Services page says "from £—". Old site said £65 (2023).
3. **Domain** — currently `northgatejoinery.co.uk` points at the old host. Someone has
   to change the DNS; needs their registrar login, which we do not have and should not.
4. **The 6 old-site photos below 900px** — reshoot or accept them at reduced size.

## 6. If you hand this to another developer
Vanilla HTML/CSS/JS with no build step. Tokens in `brand/tokens.css` and duplicated
at the top of `site/assets/css/site.css`. Everything is portable into React/Astro
unchanged because there is no framework coupling — the CSS is plain custom properties.
````

Keep it to two pages. If a section has nothing in it, write "None" — an absent section reads as an oversight.

---

## 7. The pre-delivery verification gate

### 7.1 The contract

**Fail closed.** Every check is mechanical, prints `PASS`/`FAIL`, and returns an exit code. If the gate is red, nothing is packaged and nothing is sent. "It looked fine when I clicked around" is not a check.

Output goes to `proof/VERIFY.txt`, dated, and ships with the bundle. That file is the difference between "trust me" and "here is the evidence".

### 7.2 The checks

Each subsection is a real script. `gate.sh` (§7.3) runs them all.

#### 7.2.1 Responsive breakpoints — actually tested

Not "I wrote a media query". Tested: no horizontal overflow, no element wider than the viewport, no text smaller than 12px, tap targets ≥ 24px.

```js
// gate/responsive.cjs <url>
const { chromium } = require("playwright");
const WIDTHS = [320, 360, 390, 414, 768, 1024, 1280, 1440, 1920];  // 320 = smallest phone still in use

(async () => {
  const url = process.argv[2], b = await chromium.launch(), fails = [];
  for (const w of WIDTHS) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 } });
    const p = await ctx.newPage();
    await p.goto(url, { waitUntil: "networkidle" });
    await p.evaluate(() => document.fonts.ready);

    const r = await p.evaluate(() => {
      const de = document.documentElement;
      const overflow = de.scrollWidth - de.clientWidth;
      // Which element is the culprit? Report it, don't just say "something overflows".
      const wide = [...document.querySelectorAll("body *")]
        .filter(el => { const b = el.getBoundingClientRect();
                        return b.width > 0 && (b.right > de.clientWidth + 1 || b.left < -1); })
        .slice(0, 5)
        .map(el => el.tagName.toLowerCase() + (el.className ? "." + String(el.className).split(" ")[0] : ""));
      // Text too small to read on a phone.
      const tiny = [...document.querySelectorAll("p,li,a,span,td,label,button")]
        .filter(el => el.textContent.trim() && parseFloat(getComputedStyle(el).fontSize) < 12).length;
      // Tap targets: WCAG 2.2 SC 2.5.8 (AA) minimum is 24×24 CSS px — but the SC has
      // an explicit INLINE exception: a link sitting inside a sentence or block of
      // text is exempt, because you cannot enlarge it without wrecking the prose.
      // Without this exception the check fails on any page with a link in a
      // paragraph (a normal inline <a> is ~17px tall) and the gate can never pass.
      const inlineExempt = el => {
        if (el.tagName !== "A") return false;
        const p = el.parentElement;
        if (!p) return false;
        const own = el.textContent.trim().length;
        // Surrounded by meaningfully more text than the link itself = inline in prose.
        return p.textContent.trim().length > own + 20;
      };
      const small = [...document.querySelectorAll("a[href],button,input,select,[role=button]")]
        .filter(el => { const b = el.getBoundingClientRect();
                        return b.width > 0 && (b.width < 24 || b.height < 24); })
        .filter(el => !inlineExempt(el))
        .map(el => el.tagName.toLowerCase() + ":" + el.textContent.trim().slice(0, 24));
      return { overflow, wide, tiny, small };
    });

    if (r.overflow > 1) fails.push(`${w}px: overflow ${r.overflow}px — culprits: ${r.wide.join(", ") || "unknown"}`);
    if (r.tiny > 0)     fails.push(`${w}px: ${r.tiny} elements with font-size < 12px`);
    if (w <= 768 && r.small.length)
      fails.push(`${w}px: ${r.small.length} tap targets under 24×24px — ${r.small.slice(0,5).join(", ")}`);
    await ctx.close();
  }
  await b.close();
  console.log(fails.length ? "FAIL responsive\n  " + fails.join("\n  ") : `PASS responsive (${WIDTHS.length} widths)`);
  process.exit(fails.length ? 1 : 0);
})();
```

#### 7.2.2 Lighthouse thresholds

```bash
# gate/lighthouse.sh <url> — median of 3, asserted against thresholds.
set -euo pipefail
URL="${1:?}"; export CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
for i in 1 2 3; do
  npx --yes lighthouse "$URL" --form-factor=mobile --screenEmulation.mobile \
    --output=json --output-path="/tmp/lh$i.json" --quiet \
    --chrome-flags="--headless=new --no-sandbox --disable-dev-shm-usage" \
    --only-categories=performance,accessibility,best-practices,seo
done
node -e '
const med = a => a.sort((x,y)=>x-y)[1];
const rs=[1,2,3].map(i=>require(`/tmp/lh${i}.json`));
const s=c=>med(rs.map(r=>Math.round(r.categories[c].score*100)));
const m=k=>med(rs.map(r=>r.audits[k].numericValue));
const got={perf:s("performance"),a11y:s("accessibility"),bp:s("best-practices"),seo:s("seo"),
           lcp:m("largest-contentful-paint"),cls:m("cumulative-layout-shift"),tbt:m("total-blocking-time")};
const min={perf:95,a11y:100,bp:95,seo:100};                 // thresholds
const max={lcp:2500,cls:0.05,tbt:200};                      // ms, unitless, ms
const bad=[...Object.entries(min).filter(([k,v])=>got[k]<v).map(([k,v])=>`${k} ${got[k]} < ${v}`),
           ...Object.entries(max).filter(([k,v])=>got[k]>v).map(([k,v])=>`${k} ${Math.round(got[k]*1000)/1000} > ${v}`)];
console.log(bad.length?"FAIL lighthouse\n  "+bad.join("\n  "):`PASS lighthouse ${JSON.stringify(got)}`);
require("fs").writeFileSync("proof/lighthouse-summary.json",JSON.stringify(got,null,2));
process.exit(bad.length?1:0);'
```

**Thresholds:** Performance ≥ 95 (mobile), Accessibility = 100, Best Practices ≥ 95, SEO = 100, LCP ≤ 2.5s, CLS ≤ 0.05, TBT ≤ 200ms. Accessibility below 100 on a brochure site means something is genuinely wrong — do not negotiate it down.

If `npx lighthouse` cannot install, fall back to measuring the two metrics that matter with Playwright alone:

```js
// gate/perf-fallback.cjs <url> — LCP and CLS via PerformanceObserver. Not a substitute for
// a full audit; use only when Lighthouse cannot be installed, and SAY SO on the pitch page.
const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport:{width:390,height:844} });
  const p = await ctx.newPage();
  // CDP gives us the same throttling profile Lighthouse applies, without Lighthouse.
  const client = await ctx.newCDPSession(p);
  await client.send("Network.enable");
  await client.send("Network.emulateNetworkConditions",     // ~Slow 4G
    { offline:false, latencyMs:150, downloadThroughput:1.6e6/8, uploadThroughput:750e3/8 });
  await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await p.goto(process.argv[2], { waitUntil:"networkidle" });
  const r = await p.evaluate(() => new Promise(res => {
    let lcp = 0, cls = 0;
    new PerformanceObserver(l => { for (const e of l.getEntries()) lcp = e.startTime; })
      .observe({ type:"largest-contentful-paint", buffered:true });
    new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) cls += e.value; })
      .observe({ type:"layout-shift", buffered:true });
    setTimeout(() => res({ lcp: Math.round(lcp), cls: +cls.toFixed(4) }), 3000);
  }));
  await b.close();
  const bad = [r.lcp > 2500 && `LCP ${r.lcp}ms > 2500`, r.cls > 0.05 && `CLS ${r.cls} > 0.05`].filter(Boolean);
  console.log(bad.length ? "FAIL perf-fallback\n  " + bad.join("\n  ") : `PASS perf-fallback ${JSON.stringify(r)}`);
  process.exit(bad.length ? 1 : 0);
})();
```

#### 7.2.3 Every link resolves

Internal links checked against the filesystem (so a case mismatch is caught); external links by HTTP HEAD.

```js
// gate/links.cjs <siteDir> — crawls the built site, resolves every href/src.
const fs = require("fs"), path = require("path");
const root = path.resolve(process.argv[2]);
const html = [];
(function walk(d){ for (const e of fs.readdirSync(d,{withFileTypes:true})) {
  const p = path.join(d,e.name);
  if (e.isDirectory()) walk(p); else if (/\.html?$/i.test(e.name)) html.push(p); } })(root);

const fails = [], external = new Set();
for (const f of html) {
  const src = fs.readFileSync(f,"utf8");
  for (const m of src.matchAll(/(?:href|src|srcset|content)\s*=\s*["']([^"']+)["']/gi)) {
    for (let raw of m[1].split(",")) {                 // srcset is comma-separated
      const u = raw.trim().split(/\s+/)[0];
      if (!u || u.startsWith("data:") || u.startsWith("#")) continue;
      if (/^(mailto|tel|sms):/i.test(u)) {
        // tel: must have no spaces/brackets or iOS mangles it
        if (/^tel:/i.test(u) && /[\s()\-]/.test(u.slice(4)))
          fails.push(`${path.relative(root,f)}: tel: link contains spaces or punctuation → ${u}`);
        continue;
      }
      if (/^https?:\/\//i.test(u)) { external.add(u); continue; }
      if (u.startsWith("/")) fails.push(`${path.relative(root,f)}: absolute path "${u}" breaks in a subfolder and on file://`);
      const target = path.resolve(path.dirname(f), u.split(/[?#]/)[0]);
      // fs is case-sensitive here; macOS/Windows are not — this is exactly why we check on Linux.
      if (!fs.existsSync(target)) fails.push(`${path.relative(root,f)}: missing → ${u}`);
    }
  }
}

(async () => {
  for (const u of external) {
    try {
      let r = await fetch(u, { method:"HEAD", redirect:"follow", signal: AbortSignal.timeout(12000) });
      if (r.status === 405 || r.status === 403) r = await fetch(u, { method:"GET", redirect:"follow", signal: AbortSignal.timeout(12000) });
      if (!r.ok) fails.push(`external ${r.status} → ${u}`);
    } catch (e) { fails.push(`external unreachable → ${u} (${e.name})`); }
  }
  console.log(fails.length ? "FAIL links\n  " + fails.join("\n  ")
                           : `PASS links (${html.length} pages, ${external.size} external)`);
  process.exit(fails.length ? 1 : 0);
})();
```

An external link that is merely slow is not a build defect — re-run once before believing a timeout, and note flaky hosts in `VERIFY.txt` rather than blocking the ship.

#### 7.2.4 Forms behave

```js
// gate/forms.cjs <url>
const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch(), p = await (await b.newContext()).newPage();
  await p.goto(process.argv[2], { waitUntil:"networkidle" });
  const fails = [];
  const forms = await p.$$("form");
  if (!forms.length) { console.log("PASS forms (none present)"); await b.close(); process.exit(0); }

  for (const [i, form] of forms.entries()) {
    const meta = await form.evaluate(f => {
      // Only *data-entry* controls. Submit/reset/button/image inputs are not labelable:
      // el.labels is null for them, so including them flags every correct form as
      // having an "unlabelled" field. Verified in Chromium — a form with a properly
      // labelled text input plus <input type="submit"> reports unlabelled:["submit"].
      const DATA = el => ["INPUT","SELECT","TEXTAREA"].includes(el.tagName)
        && !["hidden","submit","reset","button","image"].includes(el.type);
      // WCAG 1.3.5 only asks for autocomplete on fields collecting the USER's own
      // details. Demanding it on every control fails on a message textarea and on
      // the submit button, i.e. on every real contact form.
      const IDENTITY = /name|mail|phone|tel|mobile|address|street|town|city|postcode|zip|company|organi[sz]ation/i;
      return {
        action: f.getAttribute("action"), method: (f.getAttribute("method")||"get").toLowerCase(),
        unlabelled: [...f.elements].filter(el => DATA(el) &&
          !el.labels?.length && !el.getAttribute("aria-label") && !el.getAttribute("aria-labelledby")
        ).map(el => el.name || el.type),
        // Correct types get the right mobile keyboard and free validation.
        typos: [...f.elements].filter(el => DATA(el) && (
          /mail/i.test(el.name||"") && el.type !== "email" ||
          /phone|tel|mobile/i.test(el.name||"") && el.type !== "tel")).map(el => el.name),
        required: [...f.elements].filter(el => DATA(el) && el.required).length,
        autocomplete: [...f.elements].filter(el =>
          DATA(el) && IDENTITY.test(el.name || el.id || "") && !el.autocomplete).map(el => el.name),
      };
    });
    const tag = `form[${i}]`;
    if (!meta.action)            fails.push(`${tag}: no action — submitting reloads the page and loses the enquiry`);
    if (meta.unlabelled.length)  fails.push(`${tag}: unlabelled fields: ${meta.unlabelled.join(", ")}`);
    if (meta.typos.length)       fails.push(`${tag}: wrong input type for: ${meta.typos.join(", ")}`);
    if (!meta.required)          fails.push(`${tag}: no required fields — empty submissions will arrive`);
    if (meta.autocomplete.length) fails.push(`${tag}: missing autocomplete on: ${meta.autocomplete.join(", ")}`);

    // Empty submit must be blocked by the browser, not silently accepted.
    let navigated = false;
    p.once("framenavigated", () => navigated = true);
    await form.evaluate(f => f.querySelector("[type=submit],button:not([type=button])")?.click());
    await p.waitForTimeout(600);
    if (navigated) fails.push(`${tag}: empty submission was accepted`);
  }
  await b.close();
  console.log(fails.length ? "FAIL forms\n  " + fails.join("\n  ") : `PASS forms (${forms.length})`);
  process.exit(fails.length ? 1 : 0);
})();
```

#### 7.2.5 No placeholder text left

The single most embarrassing delivery failure. Scan the **built output**, because a placeholder can survive templating.

Patterns live in a file, one per line. **Do not build this pattern as a single quoted shell string with `\` line-continuations** — inside single quotes a backslash-newline is *not* a continuation, so the string ends up containing a literal trailing `\`, GNU grep aborts with `grep: Trailing backslash` and exits **2**, and an `if grep ...; then` wrapper reads that non-zero exit as "no placeholders found" and prints `PASS`. That is a fail-open check in a fail-closed gate: it passes on every site, including ones full of Lorem ipsum.

```bash
# gate/placeholders.sh <siteDir>
set -uo pipefail
DIR="${1:?}"
PATFILE="$(mktemp)"; trap 'rm -f "$PATFILE"' EXIT

# One ERE per line. No continuations, nothing to mis-quote.
cat > "$PATFILE" <<'PATTERNS'
[Ll]orem ipsum
dolor sit amet
\bTODO\b
\bFIXME\b
\bTBD\b
[Pp]laceholder
PLACEHOLDER
Your (Company|Business)
(Company|Business) Name
Insert [a-z]+ here
Coming soon
example\.(com|org)
test@
foo@bar
555-?01[0-9]{2}
Lipsum
\{\{[^}]*\}\}
\$\{[a-z]
PATTERNS

grep -rInE -f "$PATFILE" "$DIR" \
  --include='*.html' --include='*.css' --include='*.js' --include='*.json'
rc=$?
case "$rc" in
  0) echo "FAIL placeholders (see above)"; exit 1 ;;
  1) : ;;                       # no matches — the only good outcome
  *) echo "FAIL placeholders: grep exited $rc (bad pattern / unreadable file)."
     echo "  A grep error is NEVER a pass. Fix the pattern file and re-run."; exit 1 ;;
esac

# HTML only. `\[[a-z ]+\]` and `£—` are useless against CSS and JS: `[hidden]` is a
# real selector and `arr[i]` is real code, so scanning those file types guarantees
# false positives and trains you to ignore the check.
grep -rInE -e '\[[a-z][a-z ]+\]' -e '£—' -e 'from £-' "$DIR" --include='*.html'
rc=$?
case "$rc" in
  0) echo "FAIL placeholders: unrendered brackets or an unfilled price in HTML"; exit 1 ;;
  1) : ;;
  *) echo "FAIL placeholders: grep exited $rc on the HTML pass"; exit 1 ;;
esac

echo "PASS placeholders"
```

`{{ }}`, `${...}` and `[bracketed]` catch templating that did not render — a class of bug that looks fine in the source and broken on the page. If a legitimate `£—` is intended (a genuinely unknown price), it must be listed in the build report §5 and acknowledged; otherwise it fails.

**Whenever you wrap a check in `if grep ...`, decide explicitly what a grep *error* means.** `grep` has three exit codes — 0 found, 1 not found, 2 error — and the two-branch `if` collapses 1 and 2 into "clean". Every grep-based check in this file uses the three-way `case` above for that reason.

#### 7.2.6 No missing images, and none oversized

```js
// gate/images.cjs <url>
const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:3 });
  const p = await ctx.newPage();
  const bytes = new Map();
  p.on("response", async r => { if (/image/.test(r.headers()["content-type"] || ""))
    try { bytes.set(r.url(), (await r.body()).length); } catch {} });
  await p.goto(process.argv[2], { waitUntil:"networkidle" });
  await p.evaluate(async () => {                      // force lazy images to load
    for (let y=0; y<document.body.scrollHeight; y+=innerHeight)
      { scrollTo(0,y); await new Promise(r=>setTimeout(r,200)); } scrollTo(0,0); });
  await p.waitForTimeout(800);

  const r = await p.evaluate(() => ({
    broken: [...document.images].filter(i => !i.complete || i.naturalWidth === 0).map(i => i.currentSrc || i.src),
    noAlt:  [...document.images].filter(i => !i.hasAttribute("alt")).map(i => i.currentSrc || i.src),
    // alt="" is legitimate ONLY for decoration; flag it for a human to confirm.
    emptyAlt: [...document.images].filter(i => i.getAttribute("alt") === "").length,
    // An image rendered far smaller than its intrinsic size is wasted bandwidth.
    oversized: [...document.images].filter(i => i.naturalWidth > i.clientWidth * devicePixelRatio * 1.6 && i.clientWidth > 0)
                 .map(i => `${i.currentSrc.split("/").pop()} ${i.naturalWidth}w rendered at ${i.clientWidth}px`),
    // Layout stability: an image with neither width/height attributes nor a CSS
    // aspect-ratio reserves no space, so the page jumps when it arrives → CLS.
    noDims: [...document.images].filter(i => {
      const hasAttrs = i.getAttribute("width") && i.getAttribute("height");
      const hasRatio = getComputedStyle(i).aspectRatio !== "auto";
      return !hasAttrs && !hasRatio;
    }).map(i => i.currentSrc || i.src),
    lcpLazy: [...document.images].slice(0,1).filter(i => i.loading === "lazy").map(i => i.src),
  }));
  // 500KB matches the JPEG hard ceiling in §2.3. A 300KB gate here would fail a
  // hero that §2.3 explicitly permits — keep the two numbers in step.
  const heavy = [...bytes].filter(([,n]) => n > 500*1024).map(([u,n]) => `${u.split("/").pop()} ${Math.round(n/1024)}KB`);
  await b.close();

  const fails = [];
  r.broken.forEach(s => fails.push("broken: " + s));
  r.noAlt .forEach(s => fails.push("no alt attribute: " + s));
  r.noDims.forEach(s => fails.push("no width/height (CLS risk): " + s));
  r.lcpLazy.forEach(s => fails.push("first image is loading=lazy — delays LCP: " + s));
  heavy   .forEach(s => fails.push("over 500KB: " + s));
  r.oversized.forEach(s => fails.push("oversized: " + s));
  console.log(fails.length ? "FAIL images\n  " + fails.join("\n  ")
    : `PASS images (${bytes.size} loaded, ${r.emptyAlt} decorative alt="" — confirm intentional)`);
  process.exit(fails.length ? 1 : 0);
})();
```

#### 7.2.7 Reduced motion honoured

Playwright's `reducedMotion: "reduce"` sets the real media feature, so this tests the actual CSS rather than a proxy.

```js
// gate/reduced-motion.cjs <url>
const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport:{width:1280,height:900}, reducedMotion:"reduce" });
  const p = await ctx.newPage();
  await p.goto(process.argv[2], { waitUntil:"networkidle" });
  await p.evaluate(async () => {                    // scroll through: entrances would fire here
    for (let y=0; y<document.body.scrollHeight; y+=innerHeight)
      { scrollTo(0,y); await new Promise(r=>setTimeout(r,120)); } scrollTo(0,0); });

  const r = await p.evaluate(() => {
    const ms = v => v.split(",").reduce((a,s)=>Math.max(a, parseFloat(s)*(s.includes("ms")?1:1000)||0),0);
    const moving = [], hidden = [], timelines = [];
    for (const el of document.querySelectorAll("body *")) {
      const cs = getComputedStyle(el);
      const id = el.tagName.toLowerCase() + (el.className ? "."+String(el.className).split(" ")[0] : "");
      // Anything still animating for a meaningful duration under reduce is a defect.
      if (cs.animationName !== "none" && ms(cs.animationDuration) > 80) moving.push(id + " anim " + cs.animationDuration);
      if (ms(cs.transitionDuration) > 300) moving.push(id + " transition " + cs.transitionDuration);
      // scroll-driven timelines must be switched off, not merely shortened
      if (cs.animationTimeline && cs.animationTimeline !== "auto" && cs.animationTimeline !== "none")
        timelines.push(id + " " + cs.animationTimeline);
      // WORST failure: an element that was only ever revealed BY the animation is now invisible.
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && (parseFloat(cs.opacity) < 0.05 || cs.visibility === "hidden")
          && el.textContent.trim().length > 20 && cs.position !== "fixed") hidden.push(id);
    }
    return { moving:[...new Set(moving)].slice(0,10), hidden:[...new Set(hidden)].slice(0,10),
             timelines:[...new Set(timelines)].slice(0,10),
             matches: matchMedia("(prefers-reduced-motion: reduce)").matches };
  });
  // Confirm the emulation actually took effect, or this test proves nothing.
  if (!r.matches) { console.log("FAIL reduced-motion: media feature not applied — test invalid"); await b.close(); process.exit(1); }

  const fails = [...r.hidden.map(s => "CONTENT INVISIBLE under reduced motion: " + s),
                 ...r.moving.map(s => "still animating: " + s),
                 ...r.timelines.map(s => "scroll timeline still active: " + s)];
  await b.close();
  console.log(fails.length ? "FAIL reduced-motion\n  " + fails.join("\n  ") : "PASS reduced-motion");
  process.exit(fails.length ? 1 : 0);
})();
```

The invisible-content check is the one that matters. The classic bug is `opacity: 0` applied as an entrance start state, with the reduced-motion branch removing the *animation* but not the start state — leaving a blank page for exactly the users who asked for less motion. Always write the reduce branch as `animation: none; opacity: 1; transform: none;`.

#### 7.2.8 All languages complete

```js
// gate/i18n.cjs <contentDir> <base-locale> — key-set diff plus an empty-value check.
const fs = require("fs"), path = require("path");
const [dir, base = "en"] = process.argv.slice(2);
const flat = (o, p = "") => Object.entries(o).flatMap(([k, v]) =>
  v && typeof v === "object" && !Array.isArray(v) ? flat(v, `${p}${k}.`) : [[`${p}${k}`, v]]);

// A vanilla site has no source/content at all. Without these two guards readdirSync
// throws ENOENT, the gate records a FAIL, and gate.sh refuses to ship a site that is
// perfectly fine — the single most likely false red in the whole gate.
if (!dir || !fs.existsSync(dir)) { console.log("PASS i18n (single locale — no content directory)"); process.exit(0); }

const locales = fs.readdirSync(dir).filter(f => f.endsWith(".json")).map(f => f.replace(".json", ""));
if (locales.length <= 1) { console.log(`PASS i18n (single locale${locales[0] ? " — " + locales[0] : ""})`); process.exit(0); }
if (!locales.includes(base)) { console.log(`FAIL i18n: no ${base}.json`); process.exit(1); }
const load = l => Object.fromEntries(flat(JSON.parse(fs.readFileSync(path.join(dir, l + ".json"), "utf8"))));
const ref = load(base), fails = [];

for (const l of locales.filter(l => l !== base)) {
  const t = load(l);
  const missing = Object.keys(ref).filter(k => !(k in t));
  const extra   = Object.keys(t).filter(k => !(k in ref));
  const empty   = Object.entries(t).filter(([, v]) => typeof v === "string" && !v.trim()).map(([k]) => k);
  // A value identical to the base language is usually an untranslated copy-paste.
  const same    = Object.entries(t).filter(([k, v]) => typeof v === "string" && v.length > 12 && v === ref[k]).map(([k]) => k);
  if (missing.length) fails.push(`${l}: ${missing.length} missing → ${missing.slice(0,6).join(", ")}`);
  if (extra.length)   fails.push(`${l}: ${extra.length} keys not in ${base} → ${extra.slice(0,6).join(", ")}`);
  if (empty.length)   fails.push(`${l}: ${empty.length} empty → ${empty.slice(0,6).join(", ")}`);
  if (same.length)    fails.push(`${l}: ${same.length} identical to ${base} (untranslated?) → ${same.slice(0,4).join(", ")}`);
}
console.log(fails.length ? "FAIL i18n\n  " + fails.join("\n  ") : `PASS i18n (${locales.join(", ")})`);
process.exit(fails.length ? 1 : 0);
```

Plus the HTML side — each localised page must declare its language and cross-link:

```bash
# Every page has a lang attribute. Use find, not site/**/*.html — `**` only recurses
# with `shopt -s globstar`, and without it the glob expands to site/*/*.html, which
# silently SKIPS site/index.html: the one page that matters most.
missing="$(find site -name '*.html' -exec grep -L '<html[^>]*lang=' {} +)"
[ -n "$missing" ] && { echo "FAIL i18n: pages missing lang attribute:"; echo "$missing"; exit 1; }
```

If the site is monolingual, this check prints `PASS i18n (single locale)` — do not delete it, because a second language added later must not slip through.

#### 7.2.9 Secrets, metadata, and the rest

```bash
# gate/hygiene.sh <bundleDir>
set -uo pipefail
D="${1:?}"; f=0
grep -rIlE '(sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{36}|-----BEGIN [A-Z ]*PRIVATE KEY|password\s*[:=]\s*["'"'"'][^"'"'"']{6,})' "$D" && { echo "FAIL hygiene: secret-shaped strings"; f=1; }
[ -d "$D/site/node_modules" ] && { echo "FAIL hygiene: node_modules inside site/"; f=1; }
find "$D" -name '.DS_Store' -o -name 'Thumbs.db' | grep -q . && { echo "FAIL hygiene: OS junk files"; f=1; }
# SEO/social basics — cheap to check, expensive to miss
for tag in '<title>' 'name="description"' 'property="og:title"' 'property="og:image"' 'rel="canonical"'; do
  grep -q "$tag" "$D/site/index.html" || { echo "FAIL hygiene: index.html missing $tag"; f=1; }
done
grep -q 'lang=' "$D/site/index.html" || { echo "FAIL hygiene: <html> has no lang"; f=1; }
[ -f "$D/site/favicon.ico" ] || [ -f "$D/site/favicon.svg" ] || { echo "FAIL hygiene: no favicon"; f=1; }
[ -f "$D/site/robots.txt" ] || { echo "FAIL hygiene: no robots.txt"; f=1; }
for doc in README.md LICENCE-AND-OWNERSHIP.md MAINTENANCE.md BUILD-REPORT.md START-HERE.txt; do
  [ -s "$D/$doc" ] || { echo "FAIL hygiene: missing or empty $doc"; f=1; }
done
[ $f -eq 0 ] && echo "PASS hygiene"; exit $f
```

### 7.3 `gate.sh` — one command, one verdict

```bash
#!/usr/bin/env bash
# gate.sh <bundleDir> — run every check, write proof/VERIFY.txt, exit non-zero on any failure.
set -uo pipefail
D="${1:?usage: gate.sh <bundleDir>}"
export NODE_PATH="$(npm root -g)" PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
mkdir -p "$D/proof"
REPORT="$D/proof/VERIFY.txt"
: > "$REPORT"
FAILED=0

npx --yes serve "$D/site" -l 4321 >/dev/null 2>&1 &   # no -s — see §2.4
SRV=$!; trap 'kill $SRV 2>/dev/null' EXIT
for i in $(seq 1 40); do curl -sf -o /dev/null http://127.0.0.1:4321/ && break || sleep 0.25; done
URL=http://127.0.0.1:4321/

run () {  # run <label> <command...>
  printf '%-18s ' "$1" >> "$REPORT"
  if out="$("${@:2}" 2>&1)"; then echo "$out" | head -1 >> "$REPORT"
  else FAILED=1; { echo "$out"; } >> "$REPORT"; fi
  tail -1 "$REPORT"
}

{ echo "PRE-DELIVERY VERIFICATION"
  echo "bundle : $D"
  echo "date   : $(date -u '+%Y-%m-%d %H:%M UTC')"
  echo "node   : $(node -v)   playwright: $(node -e 'console.log(require("playwright/package.json").version)')"
  echo "-----------------------------------------------------------"; } >> "$REPORT"

run responsive   node gate/responsive.cjs     "$URL"
run lighthouse   bash gate/lighthouse.sh      "$URL"
run links        node gate/links.cjs          "$D/site"
run forms        node gate/forms.cjs          "$URL"
run placeholders bash gate/placeholders.sh    "$D/site"
run images       node gate/images.cjs         "$URL"
run reducedmotion node gate/reduced-motion.cjs "$URL"
run i18n         node gate/i18n.cjs           "$D/source/content" en
run hygiene      bash gate/hygiene.sh         "$D"

{ echo "-----------------------------------------------------------"
  echo "VERDICT: $([ $FAILED -eq 0 ] && echo 'PASS — cleared for delivery' || echo 'FAIL — DO NOT DELIVER')"; } >> "$REPORT"
cat "$REPORT"
exit $FAILED
```

Sample `proof/VERIFY.txt`:

```
PRE-DELIVERY VERIFICATION
bundle : /home/user/delivery/northgate-joinery
date   : 2026-08-02 14:20 UTC
node   : v22.22.2   playwright: 1.56.1
-----------------------------------------------------------
responsive         PASS responsive (9 widths)
lighthouse         PASS lighthouse {"perf":98,"a11y":100,"bp":100,"seo":100,"lcp":1240,"cls":0.002,"tbt":30}
links              PASS links (3 pages, 4 external)
forms              PASS forms (1)
placeholders       PASS placeholders
images             PASS images (19 loaded, 3 decorative alt="" — confirm intentional)
reducedmotion      PASS reduced-motion
i18n               PASS i18n (single locale)
hygiene            PASS hygiene
-----------------------------------------------------------
VERDICT: PASS — cleared for delivery
```

### 7.4 When the gate fails

1. **Fix it.** Almost everything the gate catches is a real defect with a five-minute fix.
2. If a check is failing for an environmental reason — an external link on a host that blocks datacentre IPs, Lighthouse refusing to install — **downgrade that one line to `SKIPPED (reason)`, keep it in `VERIFY.txt`, and repeat the reason in the build report.** Never delete a check to make the report green.
3. If something is genuinely out of scope (no team photo exists), it is not a gate failure — it is a build-report §5 item and a line in the README's "Known limitations". Placeholders that ship must be *declared*, on the pitch page as well as the README.
4. Re-run the whole gate after any fix. Fixing an overflow at 320px routinely breaks the image sizing at 1440px.

---

## 8. Handoff message

The message you send with the files. Short, specific, no adjectives you cannot defend.

```
Northgate Joinery is built and verified. Bundle attached.

WHAT'S ATTACHED
  northgate-joinery_2026-08-02.zip (14 MB) — the complete deliverable
  pitch.html — the page to forward to the client

TO LOOK AT IT
  Unzip, open site/index.html. That's it, no install.

NUMBERS (Lighthouse mobile, median of 3, full reports in proof/)
  Performance 98 · Accessibility 100 · Best practices 100 · SEO 100
  LCP 1.24s (was 6.8s) · page weight 680 KB (was 8.4 MB)

LIVE PREVIEW (temporary, claimable)
  https://northgate-joinery-preview.netlify.app
  Claim link is in proof/deploy.txt — open it to move the site to a free
  Netlify account in your name, otherwise it won't persist.

ALSO COPIED TO GOOGLE DRIVE
  "Northgate Joinery — Website 2026-08-02" (private) — the documents only.
  The zip is too large to upload through the Drive tool; drag the attached
  file into that folder if you want everything in one place.

NEEDS THE CLIENT'S INPUT — 4 items, listed in BUILD-REPORT.md §5.
  Biggest one: there is no team photo, so a workshop shot is standing in.

NOT DONE
  Form posts to mailto: (no server). English only. Chromium-only testing —
  Firefox and Safari were not available in the container.
  Detail in BUILD-REPORT.md §4.

Nothing was pushed to GitHub.
```

That last line is not decoration. Say it every time, so the user never has to wonder.

---

## 9. Pre-flight checklist

Run down this list before your final message. Every line is a yes/no with a mechanical check behind it.

**Gate**
- [ ] `gate.sh` exits 0, or every non-pass line is `SKIPPED` with a stated reason
- [ ] `proof/VERIFY.txt` is in the bundle and dated today
- [ ] Lighthouse mobile: Perf ≥ 95, A11y 100, BP ≥ 95, SEO 100 — median of three runs
- [ ] Reduced motion: nothing animating **and nothing invisible**
- [ ] Zero placeholders; every deliberate gap is declared in README + build report

**Bundle**
- [ ] `site/` runs standalone from a fresh extract, with only relative paths
- [ ] `START-HERE.txt`, `README.md`, `LICENCE-AND-OWNERSHIP.md`, `MAINTENANCE.md`, `BUILD-REPORT.md` all present and non-empty
- [ ] `assets/MANIFEST.csv` accounts for every shipped image, including the `ships=NO` rows
- [ ] No `node_modules`, `.git`, caches, `.env`, or scraped intermediates
- [ ] `SHA256SUMS.txt` present and verifying
- [ ] Zip under 25 MB, or originals split into a second zip

**Verification of the package itself**
- [ ] `verify-zip.sh` passed — extracted, served, smoke test green
- [ ] Filenames are lowercase-consistent (case bugs are invisible on the user's Mac)

**Export**
- [ ] `SendUserFile` called with the zip — **this one is not optional**
- [ ] Pitch page sent separately with `display: "render"`
- [ ] Drive copy made if asked, verified with `search_files`, and confirmed private
- [ ] Preview link tested from the public URL, and its temporary status stated
- [ ] Nothing pushed to git unless explicitly instructed — and said so in the message

**The message**
- [ ] Real numbers, sourced
- [ ] Unfinished work stated plainly and first, not buried
- [ ] Items needing the client's input listed with specifics
- [ ] Total cost stated (zero) so the user can quote confidently

# Industry Playbooks

Twelve trades, one page each, plus **SET-G (logo-only)** and the rule for every trade that is not on the list.

This file is the **decision sheet**. It answers: what moves, how far, in what order, in what colours, with what type, from which photos, with what words, and what must never appear. Everything here is meant to be copied into `work/<slug>/concept.md` before a single line of markup is written.

---

## 0. How to use this file

### 0.1 What lives here and what lives elsewhere

| You need | Read |
|---|---|
| Which motion, how many frames, what section order, what copy angle — **per trade** | **this file** |
| What "expensive" means as a visual register, and the anti-slop rules | `luxury-register.md` (esp. §4 anti-patterns, §5 register per industry) |
| Extracting a palette and type direction from real evidence, and the AA token maths | `brand-identity.md` §2–§3 |
| The actual scroll implementations (scrubber, masked reveal, clip-path unmask, parallax) | `scroll-effects.md` |
| Hover/micro-interaction implementations | `hover-effects.md` |
| `schema.org` `@type` per BiH trade, hreflang, meta, GBP alignment | `i18n-seo.md` §3–§6 |
| Bundle, handover, gates, client-facing docs | `delivery.md` |

`luxury-register.md` §5 and this file overlap **on purpose and at different altitudes**. §5 tells you what register a trade sits in (taste). This file tells you what the page *does* (mechanics). When they touch the same trade, §5 wins on colour temperature, type feel and motion budget; this file wins on section order, recipe parameters, photo brief and copy.

### 0.2 The eight things a locked row must produce

Write all eight into `work/<slug>/concept.md`. Step 5's gate reads this file.

1. **Motion verb** — a sentence with a real verb. Not "dynamic", not "modern", not "elegant".
2. **Primary recipe** — recipe ID + SET class it assumes + the numeric parameters from that row's table.
3. **Fallback recipe** — recipe ID + the SET class that triggers it.
4. **Section order** — the ordered list, with the position of the single conversion action.
5. **Conversion action** — exactly one, named (`tel:`, `viber://`, `wa.me`, form, `maps` route).
6. **Palette** — two derived hex anchors (surface + accent) from the client's own evidence; the anchors in this file are the *fallback* when derivation yields nothing.
7. **Type pairing** — two real family names, both confirmed to carry `latin-ext`.
8. **Photo brief** — the ordered ask list actually sent to the client.

### 0.3 SET classes, recapped, including G

| SET | What the client has | Default hero route |
|---|---|---|
| A | one hero-grade still (≥1600px long edge) | R1 parallax, or R5 hotspots, or R6 over the photo |
| B | 6–20 unrelated stills | R4 cross-dissolve scrub |
| C | multiple stills of the *same* subject (angles or stages) | R2 assembly sequence |
| D | before/after pair(s) | R3 clip-path / translate wipe |
| E | real video | R7 frame extraction → R2/R4 |
| F | nothing usable, no logo | R9 kinetic type + R6 over a `assets/trade-paths/` figure |
| **G** | **logo only** (Facebook profile picture and nothing else) | **§14 — full path, do not route to F** |

**Triage never silently upgrades a class.** A 640×480 Facebook JPEG is not SET-A. A folder of screenshots and logos is **SET-G**, not SET-B.

### 0.4 The motion-parameter table — this is what actually differentiates the rows

Four recipes carry twelve trades. The differentiation is **in the numbers**, and the numbers are not negotiable defaults — they are the row.

| Row | Hero recipe | Frames / panels | Section height | Scrub maps to progress | Smoothing | Transition between frames |
|---|---|---|---|---|---|---|
| Auto servis | R2 sequence | 18–24 | 320vh | 0.08 → 0.72 (hotspots 0.72 → 0.92) | lerp 0.08 | none (registered frames) |
| Salon / barber | R3 wipe | 3–4 pairs, one panel each | 180vh **per panel** | 0.15 → 0.85 per panel | **none — 1:1** | hard panel boundary |
| Restoran | R1 parallax | 3 layers | 240vh | 0.00 → 1.00 | out-expo settle on type | n/a |
| Teretana | R7→R4 | 16–20 | 220vh | 0.05 → 0.95 | lerp 0.14 (snappy) | crossfade 25% of slot |
| Građevina | R2 stage build | 4–6 stages | 140vh **per stage**, cap 4 | full slot per stage | lerp 0.06 | crossfade 12% of slot |
| Ordinacija | R1 low-amplitude | 3 layers, scale 1.00→1.06 | **400vh** | 0.10 → 0.90 | lerp 0.05 | n/a |
| Nekretnine | R4 walkthrough | 6–8 | 400vh | 0.05 → 0.95 | lerp 0.08 | dwell 60% / dissolve 40% |
| Advokat | R9 + R6 | n/a — 3 moments total | normal flow | `view()` 20% → 60% | none | n/a |
| Hotel | R4 time-shift | 3–5 matched | 320vh | 0.00 → 1.00 | lerp 0.10 | **continuous dissolve, 100%** |
| Transport | R6 route draw | 1 path + 3–5 milestones | 240vh | `view()` 15% → 85% | none | n/a |
| Radnja | R2 turn / R1 cutout | 12–24 or 3 layers | 260vh | 0.10 → 0.85 | lerp 0.08 | none |
| Foto / video | R4 editorial | 9–12 | 300vh | 0.00 → 1.00 | **none** | **hard cut, 0% dissolve** |

Read that table sideways once. R4 appears four times and behaves four different ways: a hotel dissolves continuously so no frame is ever "the" frame; a gym snaps so the rep reads as effort; an estate agent dwells so each room registers as a room; a photo studio cuts hard so the rhythm reads as an edit. **If your build uses R4 with the default parameters regardless of row, you have shipped a recoloured template.**

Derive frame count from scroll distance, never the reverse. `frames per 100vh = frames ÷ ((section_vh − sticky_child_vh) × scrub_range ÷ 100)` — subtract the pinned child, it is not travel. Under ~6 frames/100vh a sequence reads as stepping; over ~35 you are paying for frames nobody perceives. Full derivation: `asset-pipeline.md` §5.4.

### 0.5 Cross-cutting rules that apply to all twelve rows

**Consent and copyright, before any face reaches the hero.** "The client's own photos have no licence question" is false. Salon, gym, restaurant and clinic photos contain identifiable third parties; R3 before/after is literally faces; dental and medical results are health data. Two things go in `concept.md` before R3 is selected:

- `consent: confirmed | cropped | unknown` — per identifiable person in any hero asset. `unknown` means crop to the detail (hair, teeth, nails, the work) and never the face.
- `photographer: client | hired | unknown` — small businesses routinely hand over photos a hired photographer owns, or images they lifted from the web. Ask. Do not assume.

**Crop-to-detail is the default for ordinacija and stomatologija**, not a judgement call.

**Alt text formula.** Never the filename, never "image1". Pattern: `<what is happening> — <where>, <grad>`.
`alt="Zamjena alternatora na Golfu 7 u radionici — Gradačac"`, `alt="Šišanje i fade prije/poslije — salon u Tuzli"`. Decorative gallery tiles that repeat information already in text take `alt=""`. Every trade's photo brief below doubles as the alt-text vocabulary.

**Conversion actions in this market, ranked.** Phone first, Viber/WhatsApp second, form a distant third. A contact form is the *worst* converting element on a BiH local-business site and it is the one every template leads with. Where a row says "form", it means "form **plus** a `tel:` that is never more than one thumb-scroll away".

**Latin-ext is a gate, not a preference.** č ć ž š đ live in `latin-ext`. Confirm before committing to a family:

```bash
curl -s "https://gwfh.mranftl.com/api/fonts/bebas-neue" \
  | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["family"], d["subsets"])'
# Bebas Neue ['latin', 'latin-ext']
```

Every family named in this file was checked this way against the live API. The check is `'latin-ext' in subsets` — **not** "is there more than one subset", which is the mistake that lets a trap through:

```bash
curl -s "https://gwfh.mranftl.com/api/fonts/prata" \
  | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["family"], d["subsets"])'
# Prata ['cyrillic', 'cyrillic-ext', 'latin', 'vietnamese']
```

**Prata failed** — four subsets, none of them `latin-ext`. It was replaced, and it is left documented in §2 as the worked example, because it is a family an agent would otherwise reach for. Note what the Prata list does and does not cover: `vietnamese` carries `Đ` (U+0110), so `Đurđević` looks fine while `Šišanje`, `Čačak` and `Žepče` render as tofu — a partial failure is harder to spot than a total one. If you substitute a family, re-run the check; the client's own business name rendering as tofu is the single most embarrassing possible delivery.

Checked and confirmed carrying `latin-ext`: Anton, Archivo, Archivo Narrow, Barlow, Barlow Condensed, Bodoni Moda, Chivo, Cormorant Garamond, Figtree, Fraunces, IBM Plex Sans, Instrument Serif, Inter, Manrope, Marcellus, Newsreader, Oswald, Playfair Display, Public Sans, Saira Condensed, Source Sans 3, Source Serif 4, Space Grotesk, Work Sans.

**`schema.org` `@type` per trade** is in `i18n-seo.md` §3.2. It is not repeated here.

---

## 1. Auto servis / autoelektrika / vulkanizer

> **Motion verb: the vehicle peels back its own skin — the body fades out layer by layer until the wiring, ECU and sensors stand exposed, and every exposed part names the service that fixes it.**

Not "a car spins". The gesture is *disassembly toward diagnosis*, because that is literally the job: the customer arrives with a symptom, the shop opens the thing and finds the cause.

**Primary — SET-C → R2 sequence.** 18–24 registered stills, 320vh section, frames map to progress 0.08–0.72, lerp 0.08. Registration matters more than count here: crop all frames to a common bounding box computed from the rembg alpha masks, or the "disassembly" reads as a shaky slideshow. From 0.72 to 0.92 fade in the R5 hotspot layer over the final frame.

**Fallback — SET-A → R5 + R6.** One clean workshop or engine-bay photo, a darkening scrim, 6–8 percentage-positioned hotspot buttons, and SVG "wiring" paths stroke-drawing between them (260vh). This costs nothing, needs no cutout, and reads as *elektrika* instantly. **R5 target-size rule:** compute `min(w%, h%) × containerPx` at a 375px viewport; if it is under 44px, do not ship percentage hotspots — auto-promote to the two-column labelled button grid below the image.

**Section order** (conversion action at 1 and 6):

1. Hero scrub with hotspots — `tel:` in the hero, thumb-reachable
2. **Servisi** — the 6–10 things they actually fix, as a grid, each with a starting price where they publish one
3. Dijagnostička oprema — which tester, which brands it reads (this is the credibility section for this trade)
4. Prije/poslije popravke, from their own photos
5. Godine / broj servisiranih vozila / marke — stat row
6. Radno vrijeme, mapa, **poziv / Viber** — the conversion block

**Palette.** Dark instrument-cluster register. One dominant near-black, one electric accent, no third hue. Derive the accent from the client's own sign, tool cart or brand board via `brand-identity.md` §2. Fallback anchors: surface `#101315`, accent `#E8A317`. If their sign is blue, the accent is blue — do not force amber.

**Type.** Headings **Archivo** 700/800, tracking −0.02em, large numerals. Body **Barlow** 400/500. Prices, torque figures and phone numbers in `font-variant-numeric: tabular-nums`. Alternative pairing: **Chivo** + **IBM Plex Sans**.

**Photos to ask for, in priority order:**

1. Vozilo na dizalici, cijelo, sa strane — 3–6 uzastopnih koraka istog popravka (ovo nosi cijelu animaciju)
2. Otvoren motorni prostor, odozgo, dnevno svjetlo
3. Dijagnostički uređaj priključen na auto, ekran se vidi
4. Radionica širokim kadrom — da se vidi da je uredna
5. Prije/poslije: zarđali dio i novi dio, isti kadar
6. Ekipa ispred radionice
7. Natpis / tabla firme (odavde izvlačimo boju)

**Copy angle (BiH).** Symptom-first, not service-first. The customer does not search "zamjena alternatora", they search "auto se ne pali Tuzla". Lead the services grid with symptoms and resolve to services. State: which brands they read, whether diagnostics is chargeable and how much, whether they do `dolazak na teren`, and whether the part is `originalni ili zamjenski` — that distinction is a real purchase decision here. City in the H1. Saturday hours are a differentiator; publish them.

**Anti-pattern that instantly cheapens this row:** neon-blue "HUD" overlay graphics, hexagon grids and glowing circuit textures laid over the engine photo. It is the tell of a template and it makes an honest workshop look like a phone-case advert. The exposed real parts are the graphic.

---

## 2. Frizerski salon / barber / kozmetički salon

> **Motion verb: the scroll performs the haircut — dragging down wipes the before away and leaves the after standing in the same frame, on the same person, in the same light.**

The scroll *is* the transformation. Nothing else in this skill converts as hard.

**Primary — SET-D → R3 wipe.** 3–4 pairs, each its own sticky panel of 180vh, wipe mapped to progress 0.15–0.85 within the panel. **No smoothing** — R3 is the one recipe where lerp hurts: a 1:1 coupling feels like the user's own hand on the divider, and lag feels broken. Normalise each pair with sharp to identical crop box, dimensions and exposure before anything else; mismatched framing destroys the illusion faster than any code defect. Implement the wipe as `transform: translateX()` on a masking overlay rather than `clip-path`, because `clip-path` is not on Safari's compositor-eligible list for scroll-driven animation. Leave a draggable handle behind after the scroll so people can play with it.

**Fallback — SET-B → R4.** The 10 best gallery shots, all cover-cropped to one portrait frame so consecutive dissolves read as one continuous person rather than a slideshow of strangers. 260vh, lerp 0.08, crossfade 40% of slot.

**Section order** (conversion at 1 and 5):

1. Prije→poslije hero wipe — Viber/WhatsApp button in the hero
2. **Cjenovnik** — usluge and prices, visible, not a PDF. This is the number one local search intent for this trade and hiding it loses the booking.
3. Ekipa — one card per stylist, their own photo, what they specialise in, and *their* booking link if they take their own appointments
4. Galerija radova — Instagram-shaped grid of their own work
5. **Termin** — one tap: Viber, WhatsApp, telefon
6. Radno vrijeme i lokacija

**Palette.** Warm neutral base with one saturated accent lifted from the salon's actual interior — a chair, a tile, a wall. Fallback anchors: surface `#F3EDE6`, accent `#8C4A3F`. Explicitly **do not** default to beauty-pink; use it only if the salon really is pink, and if it is, use their pink, sampled.

**Type.** High-contrast display serif over a quiet grotesque — the contrast itself is the "styled" signal. Headings **Bodoni Moda** 400/500 (large, high stroke contrast) or **Playfair Display** 500/700; body **Manrope** 400/600. Barber shops swing harder: **Archivo** 800 uppercase headings + **Barlow** body reads as barber, not salon. (**Prata** is the obvious-looking choice for this row and it is a trap — its subsets are `['cyrillic', 'cyrillic-ext', 'latin', 'vietnamese']`, with no `latin-ext`, so `Šišanje` renders as tofu. This is exactly what the §0.5 check catches.)

**Photos to ask for, in priority order:**

1. **Prije i poslije istog klijenta** — isti kadar, isto svjetlo, ista udaljenost. 3–4 para. Ovo je najvrjednija stvar koju možete poslati.
2. Poslije-fotke iz portfelja, portretni kadar, jednako kadrirane
3. Frizeri/kozmetičari pojedinačno, na radnom mjestu
4. Enterijer salona — stolice, ogledala, recepcija
5. Detalji: alat, proizvodi koje koriste, boje
6. Fasada / natpis sa ulice

Tell them plainly: **fotografije sa telefona su sasvim u redu — bitno je da su prije i poslije snimljene sa istog mjesta.**

**Copy angle (BiH).** Prices published per service, in KM, including the ones people are shy to ask about. Viber as the primary booking channel — this trade books on Viber, not on forms, and a form here reads as a business that does not answer. Name the stylists; people book a person, not a salon. Say whether they work Saturdays and until when. If they do bridal or graduation ("maturska"), that is a seasonal money section and deserves its own block from April.

**Anti-pattern:** the default beauty-template stack — rose-gold gradient, script font, dusty-pink `#F8E1E7`, and a stock photo of a woman with perfect hair who has never been in this salon. Any one of those alone is fatal here because the client's own before/after is sitting right there being more persuasive.

---

## 3. Restoran / kafić / pekara

> **Motion verb: the plate comes toward you — the background falls away and blurs while the dish itself rises and holds, the way food arrives at a table.**

Appetite first, information second, but the information is what they came for and it must be one scroll away.

**Primary — SET-A → R1 parallax push.** Three layers in a 240vh sticky section: a blurred, scaled copy of the original as the background plate; the rembg-cut dish; a foreground scrim/vignette. Rates: background 1.0×, subject 0.62×, scrim 0.28×. Transform and opacity only. Let the type settle with an out-expo curve (`cubic-bezier(0.19, 1, 0.22, 1)`) — slow settle reads as expensive; a linear text move reads as a banner.

**Fallback — SET-B → R4** across the menu photography, 12 frames, 200vh, crossfade 35%. If there is no usable food photography at all (very common — phone photos under fluorescent light), do **not** buy stock food. Go R6 + R9: a stroke-drawn plate/cup outline over a single interior photo, and the menu headings as kinetic type. A typographic menu page with real prices beats a stock steak.

**Section order** (conversion at 5, but hours and the phone are visible in the header from the first pixel):

1. Full-bleed food hero
2. **Danas / dnevni meni** with prices — the highest-frequency return visit on a restaurant site
3. **Cijeli meni** — the most-clicked element on any restaurant site. On the page, not a PDF download. If it must be a PDF, put the PDF *and* an HTML version.
4. Enterijer / atmosfera
5. **Rezervacija ili dostava** — one action; if they do both, pick the one that makes more money and make the other a secondary link
6. Radno vrijeme, lokacija, parking

**Palette.** Deep warm dark so the food supplies all the colour; accent sampled from the dominant food hue in their own photos. Fallback anchors: surface `#14100D`, accent `#C9752B`. A bakery inverts this — go paper-light (`#F5F0E6`) because bread photographs warm and dark backgrounds make it look grey.

**Type.** Editorial serif headings, generous line height, letter-spaced uppercase labels. Headings **Instrument Serif** 400 (large) or **Fraunces** 500/700; body **Work Sans** 400. Use `letter-spacing: 0.14em` uppercase for section labels — do **not** fake small caps with `font-variant: small-caps` on a family that has none; the browser synthesises them and it looks cheap at exactly the size you will use.

**Photos to ask for, in priority order:**

1. Tri najprodavanija jela, odozgo, na dnevnom svjetlu, pored prozora — bez blica
2. Isto jelo iz ugla od 45° (za paralaks sloj)
3. Sto sa više jela, širi kadar
4. Enterijer prazan, prije otvaranja
5. Enterijer pun, uveče (atmosfera)
6. Kuhar / ekipa
7. Fasada i natpis, danju i uveče

**Copy angle (BiH).** Prices in KM on the page, always. Working hours per day including Sunday, because "otvoreno nedjeljom" is a decision-maker. Delivery: name the actual channel (Wolt, Glovo, vlastita dostava) and the delivery zone and minimum. If they take reservations by phone only, say so in words — "rezervacije samo telefonom" is more trustworthy than a form that nobody reads. Mention `sala za proslave` capacity if they have one; that is the single most profitable enquiry a local restaurant gets.

**Anti-pattern:** a script font anywhere, plus an autoplaying full-screen video of steam or sizzling. Script + video is the "restaurant template" signature and it delays the menu, which is the only thing the visitor wants.

---

## 4. Teretana / fitness studio / sportski klub

> **Motion verb: the user drives the rep — scrolling pushes the lift through its range and scrolling back lowers it, so effort on the page mirrors effort in the room.**

**Primary — SET-E → R7 → R4/R2.** Most gyms have phone video of a session; that is the asset. Extract at 24fps, trim to the 2–3 most legible seconds of ONE movement, land on 16–20 frames over 220vh, scrub 0.05–0.95, **lerp 0.14** — snappier than every other row, because smoothing makes a rep look weightless. Crossfade only 25% of the slot. Make the first and last frame close enough that a scroll-back does not read as a jump cut.

```bash
FF=$(node -p "require('ffmpeg-static')")
"$FF" -ss 00:00:12 -t 3 -i trening.mp4 -vf "fps=24,scale=1280:-2" work/frames/frame_%04d.png
```

Four-digit padding, always — two digits breaks at frame 100 and the Apple reference this skill benchmarks against is 147 frames.

**Fallback — SET-B → R4** through 12–16 training photos at a fast cadence, which reads as motion rather than as a slideshow. **SET-F → R9**: one word (`SNAGA`, `IZDRŽLJIVOST`, `DISCIPLINA`) split per character and staggered on scroll. Zero assets, high impact, and this row is the one where kinetic type is genuinely on-register.

**Section order** (conversion at 6, price at 2):

1. Rep-cycle scrub hero
2. **Članarine i cijene** — monthly, 3-month, student, morning tariff. Published.
3. **Raspored grupnih treninga** — a real table, scrolling inside its own `overflow-x: auto` container on mobile
4. Treneri — cards with their own photos and actual certifications
5. Transformacije članova (consent recorded — see §0.5)
6. **Besplatni prvi trening** — the conversion action for this trade, one tap to Viber or phone
7. Radno vrijeme i lokacija

**Palette.** Deliberately the loudest row in the matrix: near-black plus one aggressive accent, ideally the club's own kit colour. Fallback anchors: surface `#0B0C0E`, accent `#C6F24E`. Accent coverage still stays under ~3% of pixels — loud means *saturated*, not *everywhere*.

**Type.** Condensed heavy uppercase, tight leading, so the type feels compressed like effort. Headings **Anton** 400 uppercase or **Barlow Condensed** 800; body **Inter** 400/600. Numbers (weights, reps, prices) in tabular figures.

**Photos to ask for, in priority order:**

1. **Video, 10–20 sekundi, jedan pokret, telefon na stativu ili naslonjen** — ovo je najvrjedniji materijal
2. Sprave, širokim kadrom, prazna sala
3. Grupni trening u toku
4. Treneri pojedinačno
5. Detalji: tegovi, šipke, ruke na šipci
6. Svlačionice i tuševi (ozbiljno — ovo ljudi provjeravaju)
7. Ulaz i natpis

**Copy angle (BiH).** Publish the membership price. A gym that hides its price loses to the one across town that shows it, every time. State: da li je članarina mjesečna ili po dolasku, ima li upisnina, radi li se vikendom, ima li ženski termin, ima li trener u cijeni ili se plaća posebno. "Prvi trening besplatan" is the highest-yield offer this trade has; make it the button, not a sentence.

**Anti-pattern:** "Kontaktirajte nas za cijenu." It converts worse than any price you could name. Second offender: purple-to-blue fitness-app gradients — this is a room with iron in it, not a SaaS product.

---

## 5. Građevina / stolarija / bravarija / zanatske usluge

> **Motion verb: the building assembles itself from the ground up — foundation, frame, cladding, finish — one stage locking in per scroll panel, the way the job actually got built.**

**Primary — SET-C → R2 stage build.** This trade photographs progress for invoicing, so the stages usually exist. 4–6 stages, **one sticky panel of 140vh per stage**, cap at 4 panels (more and the page becomes a chore), crossfade 12% of the slot so each stage lands as a discrete state rather than a dissolve, lerp 0.06. Label each panel with what happened and how long it took — this row converts on evidence of process, not on the finished photo.

**Fallback — SET-D → R3** before/after wipe on one renovation. **SET-A → R6 blueprint draw**: an SVG elevation/outline of the finished structure stroke-drawing itself over the finished photo. Cheapest possible, unmistakably *gradnja*, and genuinely good.

Use `assets/trade-paths/blueprint-elevation.svg` when there is no photo at all.

**Do not hand-roll the CSS.** Use the R6 block in `animation-recipes.md` §R6 → *Code* verbatim; this row only supplies the parameters. Two reasons, both measured:

1. **A hidden base layer is a Firefox blackout.** The intuitive version — `stroke-dasharray: 1; stroke-dashoffset: 1` in the base rule, un-hidden inside `@supports (animation-timeline: view())` — renders **0 ink pixels** on any engine without scroll-driven animation. Measured in this container by stripping the `@supports` block (a faithful simulation of Firefox stable) and counting non-white pixels on the shipped `blueprint-elevation.svg` at `stroke-width: 2`, white background:

| Render size | drawn (`stroke-dashoffset: 0`) | hidden base layer (`: 1`) |
|---|---|---|
| 480×320 | 11,110 ink px | **0** |
| 640×427 | 22,444 ink px | **0** |
| 960×640 | 43,107 ink px | **0** |

The drawn figure scales with render size, which is why it is quoted with one — a bare ink count with no dimensions is not reproducible. The number that matters is the same at every size: **zero**. Firefox stable has not shipped `animation-timeline`, so that is roughly one visitor in six seeing a blank rectangle. R6's contract puts the **fully drawn** graphic in the base layer and only ever hides it inside a rule that can also un-hide it.
2. **The shipped paths are authored for R6's stagger.** Every element in `assets/trade-paths/*.svg` carries `class="tp-ln" pathLength="1" style="--i:N"` and the wrapping `<g class="tp">` carries `style="--n:COUNT"`. A selector like `.blueprint path` matches them but throws `--i` away, so all eleven paths of the elevation draw in unison instead of building up. `pathLength="1"` is why no `getTotalLength()` is needed anywhere.

Row parameters for građevina: `animation-range: entry 15% cover 60%`, `--spread: .55`, stroke-width 2 (2.5 below 480px).

**Section order** (conversion at 5, but the phone is in the sticky header throughout):

1. Stage build-up hero
2. **Šta radimo** — the specific services, named the way a customer says them ("PVC stolarija", "ograde i kapije", "krovna konstrukcija")
3. **Reference / izvedeni radovi** — project cards with before→after, location, and duration. This is the section that wins the job.
4. Materijali, garancija, certifikati — with numbers (godine garancije, osiguranje, atesti)
5. **Besplatan izlazak i procjena** — the conversion action; phone plus a short form (ime, lokacija, opis, foto upload) because this trade genuinely needs a description
6. Područje rada (which cities), radno vrijeme

**Palette.** Site materials. Concrete, weathered timber, and hi-vis used exactly once. Fallback anchors: surface `#E6E3DC`, accent `#B4531B`. Hi-vis `#F2C200` is permitted as a single-use signal colour — this is the one register where hi-vis is correct rather than cheap — but it appears in one place, not on every button.

**Type.** Industrial, sturdy, larger-than-usual body (19px). Labels in wide-tracked condensed caps, hairline rules between sections like a drawing sheet. Headings **Archivo Narrow** 700 or **Saira Condensed** 600; body **IBM Plex Sans** 400/500. Project data (vrijednost, trajanje, kvadratura) in tabular figures.

**Photos to ask for, in priority order:**

1. **Isti objekat u 4–6 faza** — temelj, konstrukcija, oplata/fasada, gotovo. Sa približno istog mjesta.
2. Prije i poslije jedne adaptacije
3. Gotovi radovi — 6–10 različitih objekata
4. Ekipa na gradilištu, u radu (ne pozirano)
5. Mašine i alat
6. Detalji izrade — spoj, var, brava, ugao
7. Firma / kombi sa natpisom

**Copy angle (BiH).** Reference addresses and cities beat adjectives. Say `izlazak na teren i procjena besplatno` if true — it is the single most requested thing. State whether they issue `račun/fiskalni` and whether they work `sa PDV-om`, because that decides whether a company can hire them at all. Name the coverage radius in cities, not kilometres. Years of guarantee as a number. If they work for diaspora clients building or renovating remotely, say so and offer photo updates — that is a real and profitable segment here.

**Anti-pattern:** clip-art hard-hat and crane icons in a three-column "Zašto mi?" grid, plus a bright green "Besplatna procjena!" button repeated in every section. It converts a real builder into a lead-gen landing page. One CTA, real photos of real work.

---

## 6. Stomatološka / medicinska ordinacija

> **Motion verb: the room comes quietly into focus — a slow, low-amplitude push from a wide, reassuring view down to one precise detail, and then it stops.**

Motion here must read as precision and calm. Spectacle costs trust in this row, and trust is the product.

**Primary — SET-A → R1, deliberately under-driven.** Three layers, **400vh** (the longest section in the matrix — length is what makes it feel unhurried), scrub 0.10–0.90, scale ceiling **1.06**, translate ≤3% of viewport height, lerp 0.05. Nothing else moves on the page while this is happening.

**Fallback — and often the better build — native `animation-timeline: view()` fade-and-rise reveals only. No canvas anywhere.** This is a row where the fallback is not a compromise. `scroll-effects.md` §11 covers the staggered cascade; keep the stagger at 60–80ms and the travel at 12–16px.

**R3 before/after is permitted here with two hard conditions:** it is **click-to-reveal, never scroll-coupled**, and it is **cropped to the detail** — teeth, the treated area, the skin patch — never a full face. Health-related before/after imagery of an identifiable person is not an ordinary photo. Default to crop.

**Section order** (conversion at 6, phone in the header from the top):

1. Calm hero
2. **Usluge / tretmani** — plainly written, in the words a patient uses ("plombe", "vađenje", "proteza"), not the clinical names alone
3. **Tim i oprema** — names, specialisations, where they trained, which equipment. This is the credibility engine.
4. Prije/poslije — opt-in, click to reveal, cropped
5. Cijene ili raspon cijena, i informacije o plaćanju / ratama / fondu
6. **Naruči termin** — telefon first, Viber second
7. Radno vrijeme i lokacija

**Palette.** Clinical light, one calm deep accent, very high whitespace ratio. Fallback anchors: surface `#F7F9F9`, accent `#0F5257`. **Never mint, never lilac, never pale sky-blue** — those three are the medical-template palette and they read as cheap to exactly the audience you need to reassure. Body contrast is non-negotiable: this audience skews older.

**Type.** Humanist sans throughout, body **19px**, line-height 1.65, measure ~60ch, tap targets ≥48px. No display drama — legibility *is* the competence signal. **Source Sans 3** or **Public Sans** throughout at two weights; **IBM Plex Sans** if the practice has any technical register. One family is correct here.

**Photos to ask for, in priority order:**

1. Ordinacija, širokim kadrom, svjetlo upaljeno, uredna — dvije sobe ako imate
2. Čekaonica
3. Doktor/ica pojedinačno, u mantilu, na radnom mjestu, nasmijan/a ali ne pozirano
4. Oprema — rendgen, stolica, sterilizator (pacijenti ovo gledaju)
5. Detalj rada iz blizine, **bez lica**
6. Recepcija i ulaz
7. Prije/poslije samo ako imate **pisanu saglasnost pacijenta**

**Copy angle (BiH).** "Bez čekanja" and a real appointment window are the strongest claims this trade has. Publish base prices or ranges — patients call three practices and pick the one that answered the price question online. Say whether they work Saturdays, whether they take `fond`/insurance, and whether they offer `plaćanje na rate`. **Diaspora is a real segment**: patients living in Germany and Austria book dental work for July and August. If the practice serves them, put a line about summer appointments and booking ahead, in German if the site is multilingual (`i18n-seo.md` §1).

**Anti-pattern:** a full-face before/after gallery laid out like an e-commerce product grid, with hover-zoom. It is simultaneously the biggest privacy exposure and the fastest way to look like a cosmetic mill instead of a practice.

---

## 7. Nekretnine / agencija za nekretnine

> **Motion verb: the scroll walks you through the property — out of the street, through the door, into the living room, past the kitchen, and out onto the view.**

The gesture is travel, and the order is the tour a good agent gives.

**Primary — SET-B → R4 walkthrough.** Every listing already has exactly this photo set. Order it as a route: **eksterijer → ulaz → dnevni boravak → kuhinja → soba → kupatilo → pogled/terasa.** 6–8 frames over **400vh**, scrub 0.05–0.95, lerp 0.08, and the transition is **dwell 60% / dissolve 40%** — each room must exist as a room for a beat before the next one arrives, otherwise the viewer remembers a blur instead of a floor plan. If the client has a walkthrough video, R7 into the same treatment.

**Fallback — SET-A → R1** on the best exterior shot plus a static listings grid.

**Section order** (conversion at 6):

1. Walkthrough scrub hero for the featured property
2. **Istaknute nekretnine** — grid, each card carrying price, m², rooms, floor, and location *on the card*
3. Specifikacije — a real table per featured listing
4. Lokacija i okruženje — what is within walking distance, schools, transport
5. Agent — one card, photo, name, direct mobile number
6. **Zakaži obilazak** — phone and Viber; the form is secondary and pre-fills the property reference
7. Kontakt i radno vrijeme

**Palette.** Warm light neutrals so the property photography is the only saturated thing on screen; one deep accent reserved for CTAs and price. Fallback anchors: surface `#F4F1EB`, accent `#8A5A2B`. If the agency has a brand colour, it appears on the CTA and nowhere else.

**Type.** Refined serif headings with a clean sans for specifications; the numbers get their own treatment. Headings **Marcellus** 400 or **Cormorant Garamond** 500/600; body **Inter** 400/500 with `font-variant-numeric: tabular-nums` on every m², price and floor figure so columns of listings align.

**Photos to ask for, in priority order:**

1. **Redoslijedom obilaska**: eksterijer → ulaz → dnevni → kuhinja → soba → kupatilo → pogled. Po jedna fotka svake prostorije, iz ugla, sa što više svjetla.
2. Sve fotke iste orijentacije (landscape), sa istog nivoa (visina grudi)
3. Pogled kroz prozor / terasa
4. Zgrada ili kuća spolja, sa ulice
5. Tloris ako postoji (skenirano ili slikano)
6. Agent — portret
7. Ulica i okolina

Tell them explicitly: **ne koristite fisheye ni "HDR" filter — kupci to prepoznaju kao skrivanje.**

**Copy angle (BiH).** Prices in **KM and EUR**, both, because both are how people think about property here. State `uknjiženo` / `1/1` / `papiri uredni` — this is the first question every serious buyer asks and answering it on the page filters the timewasters. Say the agency commission openly (`provizija`), because hiding it is the trade's reputational problem and stating it is a differentiator. Give the agent's mobile, not a switchboard. Floor and lift (`sprat`, `lift`) matter more here than square metres alone.

**Anti-pattern:** fisheye-distorted, over-HDR interiors, plus a screenshot of Google Maps instead of a real embed or a link with the actual pin. Both say "we are hiding something", which in this trade is the only thing you cannot afford to say.

---

## 8. Advokat / računovođa / konsultant

> **Motion verb: nothing moves except the sentence settling into place and a single hairline rule drawing itself across the page under it.**

Deliberate stillness. In this row a frame-scrubbed hero actively damages credibility, and that is not a stylistic opinion — it reads as marketing spend, which reads as a practice that needs to advertise.

**Primary — SET-any → R9 + R6, three moments total.** One masked headline rise (`scroll-effects.md` §1), one hairline `stroke-dashoffset` rule, one fade on the credentials block. Each ≤600ms, fades and transforms only, `view()` range 20%–60%. **No canvas. No parallax. No pinning.**

**Fallback: there is none, because the primary *is* the cheap recipe.** If the user pushes for more motion, push back in writing: the reason is that this trade's clients are choosing on the basis of restraint, and every additional effect subtracts.

**Section order** (conversion at 6):

1. Statement hero — one authoritative image (the building, the city, the desk — not a person in a suit), one sentence
2. **Oblasti rada** — practice areas, named precisely
3. **Kvalifikacije** — bar membership number, years, where they studied, which courts
4. Rezultati ili sektori klijenata — as much as confidentiality allows
5. **Kako izgleda saradnja** — what happens after you call, step by step. This section converts better than any credential list because it removes the fear of an unknown process and an unknown bill.
6. **Konsultacija** — phone; state whether the first consultation is chargeable and how much
7. Kancelarija, radno vrijeme, mapa

**Palette.** Near-monochrome. Ink and paper plus one restrained institutional colour, accent on links only. Fallback anchors: surface `#F6F4EF`, ink/accent `#12233F`. (Deliberately the same navy `luxury-register.md` §5.2 specifies — this row is one where converging on the canonical answer is correct.) Maximum two hues on the whole site.

**Type.** The type *is* the design. Headings **Source Serif 4** 600 or **Newsreader** 500; body **Public Sans** 400 at 18–19px, line-height 1.6, measure 62ch. This is a reading site: strict single left edge, generous margins, documents rather than cards.

**Photos to ask for, in priority order:**

1. Zgrada / ulaz u kancelariju
2. Portret advokata/vlasnika — jedan, veliki, prirodno svjetlo, bez zamućene pozadine
3. Kancelarija iznutra — sto, police, bez ljudi
4. Grad / prepoznatljiv motiv iz grada
5. Diplome i rješenja o upisu u komoru (za dokaz, ne obavezno na sajtu)

Five items is the whole brief. This row needs the fewest photos of any in the matrix, and using fewer, larger, better photographs is itself the register.

**Copy angle (BiH).** Specificity is the entire strategy. `Advokat, upisan u Advokatsku komoru FBiH br. XXXX, od 2009.` outperforms any paragraph about dedication. Name the practice areas in the words clients use (`radni sporovi`, `naknada štete`, `registracija firme`, `prijenos vlasništva`). For accountants: state which software they work in, whether they do `PDV prijave`, `plate`, `godišnji obračun`, and whether they take `paušalce` — those are the actual selection criteria. Publish the consultation fee or say clearly that the first call is free. Office hours and a real address; a lawyer without a visible address is a lawyer nobody calls.

**Anti-pattern:** a gavel, a statue of Justice, a stock handshake, a blue gradient, and a "Trusted. Proven. Experienced." triad. Bosnian courts do not use gavels, which is a small thing that says something large: the image is imported from American stock libraries and everyone can tell.

---

## 9. Hotel / apartman / vikendica / smještaj

> **Motion verb: the same view moves through the day — morning light drains into golden hour and then into night, without the frame ever changing, so the visitor sees what waking up there is like.**

**Primary — SET-B (matched framing) → R4 time-shift.** 3–5 shots of the *same* view at different times or seasons, 320vh, scrub 0.00–1.00, lerp 0.10, and the transition is a **continuous dissolve, 100% of every slot** — unlike every other R4 row, no frame is ever fully "the" frame. That continuity is the whole effect.

**Fallback — SET-A → R1 parallax** with a slow gradient-overlay hue shift standing in for the light change, or a `transform: scale()` Ken Burns on native `view()` timeline (compositor-safe; `scale`, never `width`).

**Section order** (conversion at 5; booking never sits in the hero):

1. Time-shift hero
2. **Smještajne jedinice** — each with capacity, beds, price per night, and one photo
3. Sadržaji — heating, air conditioning, wifi, parking, kitchen, washing machine, pets. As a checklist, not prose.
4. Okolina — what there is to do within 30 minutes
5. **Provjeri dostupnost / rezerviši** — the conversion action, phone and Viber first
6. Dolazak, mapa, check-in/check-out, kućni red

**Palette.** Taken from the location's own materials — limewash, stone, timber, linen, and the landscape's dominant hue. Fallback anchors: surface `#EFE9E0`, accent `#2E3A33`. Two neutrals plus one accent reserved for the booking action.

**Type.** Warm serif headings set very large and very light over image, airy sans body, wide letter-spacing on location labels. Headings **Cormorant Garamond** 300/400 at display sizes; body **Figtree** 400. Short body copy — this register is browsed, not read.

**Photos to ask for, in priority order:**

1. **Isti pogled, tri doba dana** — jutro, zalazak, noć. Sa istog mjesta, telefon naslonjen na istu ogradu. Ovo je hero.
2. Svaka soba / apartman — jedna fotka, ujutro, roletne podignute
3. Kupatilo (gosti ovo uvijek gledaju)
4. Kuhinja / terasa / roštilj
5. Objekat spolja, iz daljine
6. Zima i ljeto, ako imate oboje
7. Okolina — staza, rijeka, planina, grad

**Copy angle (BiH).** Price per night in **KM and EUR**, and per person versus per unit stated unambiguously. Capacity as a number of people and a number of beds. `Grijanje` matters enormously for winter bookings — say what kind. If they are on Booking, that is fine and should be linked, but the site's job is to win the **direct** booking: state the direct-booking discount plainly, because that is why the site exists at all. Diaspora and summer: `rezervacije za juli i august se popunjavaju do aprila` is true and it converts. Distance to the nearest town and to the airport in minutes.

**Anti-pattern:** a booking widget dumped into the hero as a coloured box, before the visitor has any reason to book. Book flows are a quiet secondary surface. The hero's job is to make them want the view.

---

## 10. Transport / špedicija / taxi / dostava

> **Motion verb: the route draws itself — a line leaves the origin, crosses the map, and snaps in a milestone at each stop until it arrives.**

**Primary — every SET class → R6 stroke draw.** This is the only technique in the skill that is pure CSS, universally supported, has zero browser caveats, and costs a few hundred bytes. It is the primary hero here, not a fallback. One path plus 3–5 milestone markers, 240vh, driven by `view()` from 15% to 85%, no smoothing needed, layered over one photograph of their actual vehicle.

Ship `assets/trade-paths/route-line.svg` (or author your own path at `viewBox="0 0 240 160"` and normalise it to the same contract — the one-liner is in `animation-recipes.md` §R6 → *Asset prep* option C). Then use the R6 CSS and `draw.js` from `animation-recipes.md` §R6 → *Code* **verbatim**. This row supplies only the parameters:

| Parameter | Transport |
|---|---|
| `animation-range` | `entry 15% cover 85%` |
| `--spread` (stagger across milestones) | `.55` |
| Milestones | 3–5, as `.tp-ln` elements with ascending `--i` — they inherit the same draw, no separate `pop` keyframe needed |
| Scrubbed variant | `scrubProgress(stage, { ease: 0.10 })` from §0.7 instead of `draw.js`, over 240vh |

**Do not hand-roll a `.route path { stroke-dashoffset: 1 }` base layer.** See §5 for the measurement: a hidden base layer plus an `@supports`-only reveal renders **0 ink pixels** on Firefox stable, which has not shipped `animation-timeline`. R6's contract keeps the fully-drawn graphic in the base layer, ships an `IntersectionObserver` + `--p` fallback as the load-bearing path, and treats the native timeline as enhancement. (Earlier drafts of this file pointed at `scroll-effects.md` for that fallback — it is not there and never was; `animation-recipes.md` §R6 owns it.)

`pathLength="1"` is what makes all of it work without measurement. Verified in Chromium in this container, counting non-white pixels on a 400×200 white page holding exactly one element — `<path pathLength="1" d="M20 100 H380" stroke-width="10" stroke-linecap="butt" stroke-dasharray="1">`, i.e. a 360×10 = 3,600 px ink rectangle:

| `stroke-dashoffset` | lit px |
|---|---|
| `1` | **0** |
| `0.5` | **1,800** |
| `0` | **3,600** |

Exactly zero, exactly half, exactly whole — the geometry is spelled out so you can re-run it, because a lit-pixel count with no stated geometry proves nothing.

**Fallback: none needed.** R6 already requires one photo and a hand-authored path. If there is no photo either, `assets/trade-paths/route-line.svg` plus R9 carries the hero on its own.

**Section order** (conversion at 5):

1. Route-draw hero
2. **Usluge** — what they haul, in what, and where (`kombi do 1.5t`, `šleper`, `hladnjača`, `selidbe`)
3. **Relacije i destinacije** — the actual routes they run, named as city pairs
4. Vozni park — their own vehicle photos
5. **Zatraži ponudu** — phone and Viber first; a short form that asks for relation, weight/volume, and date
6. Kontakt i dispečerske sate

**Palette.** Utility: dark base, one high-visibility accent, high contrast. Speed reads through diagonal rules and tabular numbers, never through hue. Fallback anchors: surface `#0E1116`, accent `#FF5A1F`.

**Type.** Condensed sans with tabular numerals for prices, weights and times. Headings **Oswald** 500/600; body **IBM Plex Sans** 400 with `tabular-nums` everywhere a number appears. Weight and volume figures are the content of this site.

**Photos to ask for, in priority order:**

1. Kombi/kamion sa natpisom firme, sa strane, na dnevnom svjetlu
2. Utovar u toku — paleta, viljuškar, ruke
3. Vozni park zajedno, ako ima više vozila
4. Vozač / dispečer
5. Unutrašnjost tovarnog prostora, prazan
6. CMR, papiri, plombe (dokaz ozbiljnosti)

**Copy angle (BiH).** Name the relations as city pairs — `Tuzla–Beč`, `Sarajevo–München`, `Banja Luka–Zagreb`. Diaspora freight and `selidbe` to Germany and Austria are a large and specific market and they search by route, not by company. State: `ADR`, `CMR`, `carinsko posredovanje`, insurance cover, and whether the price is `po paleti`, `po m³` or `po kilometru`. Dispatch hours and a mobile number that a driver actually answers at 22:00 — say the hours honestly rather than implying 24/7.

**Anti-pattern:** an animated truck GIF driving across the screen, or a looping map with a pulsing dot. It is the one row where a literal illustration of the service is guaranteed to look like a 2009 clip-art banner. The abstract drawn line reads as logistics; a cartoon truck reads as a printing shop's template.

---

## 11. Radnja / butik / maloprodaja

> **Motion verb: the product turns to face you — it rotates out of the shelf and lands centred on a clean stage where its price is legible.**

**Primary — SET-C → R2 turn.** Many small retailers already shoot multi-angle product photos for Instagram. 12–24 frames, 260vh, scrub 0.10–0.85, lerp 0.08, no crossfade (registered frames). Run each frame through rembg (`u2netp`, Apache-2.0 — **never** `bria-rmbg`, which is non-commercial only) so the product floats on a controlled surface instead of the shop's messy background.

```bash
pip install "rembg[cpu,cli]"
rembg i -m u2netp work/raw/prod_01.jpg work/cut/prod_01.png
```

**Fallback — SET-B → R4** through the catalogue, 260vh. **SET-A → R1**: a single cut-out product drifting over a CSS gradient. One photo, one rembg call, done.

**Section order** (conversion at 5):

1. Product-turn hero
2. **Kategorije** — a grid the visitor can actually navigate
3. **Izdvojeno sa cijenama** — featured products with prices on the card
4. U radnji — interior photos, because a physical shop's advantage over an online seller is that it exists
5. **Provjeri dostupnost** — Viber first: "pošaljite nam poruku, javljamo za 10 minuta"
6. Radno vrijeme i lokacija

**Palette.** A neutral stage so product colour dominates; one accent reserved for price chips and the CTA. Fallback anchors: surface `#F6F4F1`, ink `#161616`. If the shop's products are themselves loud (children's clothes, sports equipment), the shell gets *quieter*, not louder.

**Type.** Clean grotesque, prices in a distinctly heavier weight, category labels as tracked uppercase. Headings **Figtree** 600/700; body **Inter** 400, prices **Inter** 600 with tabular figures. Category labels 12px, `letter-spacing: 0.12em`, uppercase, `--ink-3`.

**Photos to ask for, in priority order:**

1. **Jedan proizvod, 8–16 fotki u krug** — telefon na istom mjestu, proizvod se okreće na stolici ili tanjiru. Isto svjetlo, ista pozadina.
2. Top 6–10 proizvoda, pojedinačno, na bijeloj ili jednobojnoj pozadini
3. Radnja iznutra — police pune
4. Izlog sa ulice
5. Detalji materijala / etikete / veličina
6. Prodavač/ica u radnji

**Copy angle (BiH).** `Imamo na stanju` is the sentence that sells. Publish prices; a shop that shows prices gets the Viber message, and a shop that does not gets skipped. State: `dostava po BiH 24–48h`, `plaćanje pouzećem`, `zamjena veličine`, and whether they hold items (`rezervišemo do 3 dana`). Viber is the order channel for this trade — an "add to cart" flow that does not exist is worse than an honest "pošaljite poruku". If they are on Instagram and it is active, link it prominently; for a boutique the Instagram grid *is* the catalogue.

**Anti-pattern:** product photos on mismatched backgrounds — one on a wooden table, one on a bedsheet, one cut out on white — assembled into a hover-zoom grid. Inconsistent backgrounds are the single loudest "this is a hobby" signal in retail. Either cut them all out or shoot them all on the same surface; never half and half.

---

## 12. Foto studio / video produkcija / kreativna agencija

> **Motion verb: the contact sheet edits itself — frames cut past one at a time on a fixed rhythm, and the one that stops is the one they want you to see.**

The work is the hero. Every design decision here is about getting out of its way.

**Primary — SET-B → R4 editorial.** 9–12 frames over 300vh, scrub 0.00–1.00, **no smoothing and no dissolve at all — hard cut, 0% crossfade, equal dwell.** That is the entire differentiation from every other R4 row: the rhythm reads as an edit rather than a transition, which is the one thing a photographer or editor will notice within two seconds. Alternative build: a CSS-grid contact sheet where individual cells scale on a `view()` timeline (`scroll-effects.md` §11), which is genuinely appropriate here rather than a compromise.

**Fallback — static masonry grid with native scroll-driven fade-in per cell.** Also genuinely appropriate. This row is allowed one big scroll moment and no more.

**Section order** (conversion at 5):

1. Contact-sheet hero
2. **Izabrani radovi** — curated, 12 images maximum, not 80
3. **Usluge i paketi** — with prices or price ranges. Creative businesses hide prices more than any other trade and it costs them the enquiry.
4. Proces — what happens between the enquiry and the delivered files, with timings
5. **Rezerviši termin** — the conversion action; for wedding work this must include which dates are still open
6. Kontakt

**Palette.** Monochrome shell. The client's own images supply 100% of the colour; the brand hue appears only in the CTA. Fallback anchors: surface `#0A0A0A`, paper `#FAFAFA`. Pick one and commit — a photographer's site is dark or it is white, never both.

**Type.** Minimal, small, out of the way. One family, three sizes. **Inter** 400/500 at 13/16/40px, or **Space Grotesk** if the studio has an editorial edge. Any typographic personality here competes with the portfolio and loses.

**Photos to ask for, in priority order:**

1. **12 fotografija koje najbolje predstavljaju rad** — vi birate, ne mi. Jedna obrada, jedan omjer stranica.
2. Iste te fotke u punoj rezoluciji
3. Behind-the-scenes — set, oprema, ekipa u radu
4. Portret autora
5. Studio / prostor
6. Video reel, ako postoji, 30–60 sekundi

Insist on point 1. A portfolio the photographer curated converts; a portfolio you curated from what happened to be on their old site does not, and they will notice.

**Copy angle (BiH).** Publish package prices or ranges — `vjenčanje od X KM`, `krštenje`, `maturska`, `proizvod/katalog za firme`. State delivery times in days and how many edited photos are included, because that is the actual negotiation. Wedding availability by date is the highest-intent content this trade can publish; for 2027 dates, publish them in early 2026. Say which cities they travel to and whether travel is charged. If they shoot for companies, that is a separate, higher-margin section and it needs its own copy — corporate clients do not read the wedding page.

**Anti-pattern:** a wall of 80 thumbnails with hover-zoom. It is every portfolio template, it flattens their best work into their average work, and hover-zoom on a photograph is an insult to the crop. Twelve images, large, quiet captions.

---

## 13. Quick row-lock table

| Row | Motion verb (short) | Primary | Fallback | Conversion action | Surface / accent |
|---|---|---|---|---|---|
| Auto servis | peels back its own skin | R2 (SET-C) | R5+R6 (SET-A) | `tel:` + Viber | `#101315` / `#E8A317` |
| Salon | the scroll performs the haircut | R3 (SET-D) | R4 (SET-B) | Viber / WhatsApp | `#F3EDE6` / `#8C4A3F` |
| Restoran | the plate comes toward you | R1 (SET-A) | R4 / R6+R9 | rezervacija ili dostava | `#14100D` / `#C9752B` |
| Teretana | the user drives the rep | R7→R4 (SET-E) | R4 / R9 (SET-F) | besplatan prvi trening | `#0B0C0E` / `#C6F24E` |
| Građevina | assembles itself from the ground up | R2 stages (SET-C) | R3 / R6 blueprint | besplatna procjena | `#E6E3DC` / `#B4531B` |
| Ordinacija | comes quietly into focus | R1 low-amp (SET-A) | native `view()` reveals | naruči termin | `#F7F9F9` / `#0F5257` |
| Nekretnine | walks you through the property | R4 walkthrough (SET-B) | R1 (SET-A) | zakaži obilazak | `#F4F1EB` / `#8A5A2B` |
| Advokat | nothing moves except the sentence | R9+R6 (any) | — (primary is the cheap one) | konsultacija (`tel:`) | `#F6F4EF` / `#12233F` |
| Hotel | the same view moves through the day | R4 time-shift (SET-B) | R1 / Ken Burns | direktna rezervacija | `#EFE9E0` / `#2E3A33` |
| Transport | the route draws itself | R6 (any) | — (none needed) | zatraži ponudu | `#0E1116` / `#FF5A1F` |
| Radnja | the product turns to face you | R2 turn (SET-C) | R4 / R1 cutout | provjeri dostupnost (Viber) | `#F6F4F1` / `#161616` |
| Foto | the contact sheet edits itself | R4 hard-cut (SET-B) | masonry + `view()` | rezerviši termin | `#0A0A0A` / `#FAFAFA` |

---

## 14. SET-G — LOGO ONLY

**This is the most common real client.** A Facebook page, a 500px profile picture, a phone number in the About box, and nothing else. It is not SET-A (the logo is not hero-grade photography), it is not SET-B, and routing it to SET-F throws away the single asset the business actually owns.

SET-G has a complete path. The logo becomes the palette, the hero geometry, the motion and the reveal. Everything else on the page is type, real data, and space.

**Triage routes here when:** every harvested image is a logo, a screenshot, a poster, or a text graphic; or the only asset is a profile picture under ~800px; or the harvest downloaded 0 of N images and the user pasted only a logo.

### 14.1 Get the best available logo

Ask for the source file first — most businesses have a `.ai`, `.cdr`, `.pdf` or a large PNG from whoever made the sign or the stamp. One sentence to the client:

> Pošaljite nam logo u najvećoj verziji koju imate — ako imate fajl od dizajnera (`.ai`, `.pdf`, `.cdr`, `.svg`) to je najbolje. Ako ne, pošaljite najveću sliku loga koju nađete, i sliku table/natpisa ispred objekta.

If only a small raster exists: **do not upscale it.** Vectorising a 500px logo produces clean geometry at any size; upscaling produces mush. Vectorise. And ask for the *sign* photo — a photograph of the shop's physical sign is often a better-lit, larger, more honest source of both geometry and colour than the digital logo.

Set up the tools once, in a build-only directory so the client's `package.json` never carries them:

```bash
mkdir -p work/tools && cd work/tools
npm init -y >/dev/null
npm i sharp potrace                # verified: sharp 0.34.5, potrace 2.1.8, Node 22, no system binary
```

### 14.2 Derive the whole palette from the logo

`sharp.stats()` alone is a **trap** on a logo. Measured in this container on a 500×500 logo on a white card:

```
dominant { r: 248, g: 248, b: 248 }     <-- the background, not the brand
```

`dominant` returns the largest colour region, which on a logo is the paper. You need alpha-aware, background-rejecting bucket quantisation. Save as `work/tools/logo-palette.mjs`:

```js
// logo-palette.mjs — node logo-palette.mjs <logo.png|jpg>
// Emits the logo's real colours, background rejected, ordered by area share.
import sharp from "sharp";

const src = process.argv[2];
if (!src) { console.error("usage: node logo-palette.mjs <logo>"); process.exit(1); }

const { data, info } = await sharp(src)
  .ensureAlpha()
  .resize(160, 160, { fit: "inside", kernel: "nearest" })   // nearest keeps flat logo colours flat
  .raw()
  .toBuffer({ resolveWithObject: true });

const px = (x, y) => {
  const i = (y * info.width + x) * info.channels;
  return [data[i], data[i + 1], data[i + 2], data[i + 3]];
};

// Corner sampling: if 3+ corners are opaque and similar, that is the card colour.
const corners = [px(0, 0), px(info.width - 1, 0), px(0, info.height - 1), px(info.width - 1, info.height - 1)];
const opaque = corners.filter((c) => c[3] > 16);
const bg = opaque.length >= 3
  ? [0, 1, 2].map((k) => Math.round(opaque.reduce((s, c) => s + c[k], 0) / opaque.length))
  : null;                                                    // null => transparent PNG, nothing to reject

const near = (a, b, t = 26) =>
  Math.abs(a[0] - b[0]) < t && Math.abs(a[1] - b[1]) < t && Math.abs(a[2] - b[2]) < t;

const bins = new Map();
for (let i = 0; i < data.length; i += info.channels) {
  const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
  if (a < 200) continue;                                     // ignore anti-aliased edges entirely
  if (bg && near([r, g, b], bg)) continue;                   // ignore the card
  if (Math.max(r, g, b) < 14 || Math.min(r, g, b) > 244) continue;  // ignore pure black / paper white
  const key = `${r >> 4},${g >> 4},${b >> 4}`;               // 16³ buckets
  const e = bins.get(key) || { n: 0, r: 0, g: 0, b: 0 };
  e.n++; e.r += r; e.g += g; e.b += b;
  bins.set(key, e);
}

const total = [...bins.values()].reduce((s, e) => s + e.n, 0) || 1;
const hex = (e) => "#" + [e.r, e.g, e.b].map((v) => Math.round(v / e.n).toString(16).padStart(2, "0")).join("");
const swatches = [...bins.values()]
  .sort((a, b) => b.n - a.n)
  .slice(0, 6)
  .map((e) => ({ hex: hex(e), share: +(e.n / total).toFixed(3) }));

console.log(JSON.stringify({
  background: bg ? "#" + bg.map((v) => v.toString(16).padStart(2, "0")).join("") : "transparent",
  swatches,
  brand:  swatches[0]?.hex ?? null,
  accent: swatches[1]?.hex ?? null,
}, null, 2));
```

Measured output on a two-colour logo on a white card in this container:

```json
{
  "background": "#ffffff",
  "swatches": [
    { "hex": "#123b3a", "share": 0.864 },
    { "hex": "#c8802a", "share": 0.116 },
    { "hex": "#a5732d", "share": 0.003 }
  ],
  "brand": "#123b3a",
  "accent": "#c8802a"
}
```

It recovered both authored colours exactly. Everything under ~1% share is anti-aliasing residue — **discard it.**

Then hand `brand` and `accent` straight to `brand-identity.md` §2.3's `palette.mjs`, which turns two raw hexes into an AA-passing light/dark token set. Do not invent a ramp by hand.

```bash
node work/tools/logo-palette.mjs work/harvest/raw/logo.png > work/<slug>/logo-palette.json
node palette.mjs "#123b3a" "#c8802a" > work/<slug>/tokens.css
```

**If the logo yields only one chromatic colour**, do not invent a second. Follow `brand-identity.md` §2.2 rule 3: derive the accent as the brand hue rotated +150° at the same chroma. A considered complement beats a guessed one. **If the logo is pure black-on-white**, the business has no colour identity — that is a finding, not a failure. Build a monochrome site with one material texture and say so in the handover.

### 14.3 Vectorise

The pure-JS `potrace` package (v2.1.8) needs no system binary — the `potrace`/`mkbitmap` CLIs are **not** installed in this container and do not need to be.

```js
// vectorize.mjs — node vectorize.mjs <logo.png> <out.svg>
import { promises as fs } from "node:fs";
import sharp from "sharp";
import potrace from "potrace";

const [src, out] = process.argv.slice(2);

// Flatten alpha onto white, upscale, greyscale, normalise: potrace wants clean bitonal input.
const prepped = await sharp(src)
  .flatten({ background: "#ffffff" })
  .resize({ width: 1600, fit: "inside", kernel: "lanczos3" })
  .greyscale()
  .normalise()
  .png()
  .toBuffer();

const svg = await new Promise((res, rej) =>
  potrace.trace(
    prepped,
    { threshold: 170, turdSize: 12, optCurve: true, alphaMax: 1, color: "#000000", background: "transparent" },
    (err, s) => (err ? rej(err) : res(s))
  )
);

await fs.writeFile(out, svg);
const paths = [...svg.matchAll(/\sd="([^"]+)"/g)].length;
console.log(`traced -> ${out}  paths:${paths}  bytes:${svg.length}`);
```

```bash
node work/tools/vectorize.mjs work/harvest/raw/logo.png work/<slug>/logo-traced.svg
# traced -> work/tuzla-x/logo-traced.svg  paths:1  bytes:6142      <- a simple wordmark
# traced -> work/setg/logo-traced.svg     paths:1  bytes:16075     <- ring + bar + block mark
# traced -> work/setg/logo2-traced.svg    paths:1  bytes:7769      <- three flat geometric shapes
# traced -> work/setg/logo-traced.svg     paths:1  bytes:20752     <- same, plus a 6-letter wordmark
```

`paths:1` is the normal result and is not a bug — see §14.4. Byte count scales with the **number of
curve segments** in the mark, not with the source resolution: flat geometry is cheap, and letterforms
are what actually cost — adding a six-letter wordmark to the mark above took it from 7,769 to 20,752
bytes. Anywhere in **6–25 KB** is normal for a real small-business logo. Past ~40 KB, see the budget
note below: you are tracing a photograph.

Tuning, in the order you should try it:

| Symptom | Change |
|---|---|
| Thin strokes disappear | lower `threshold` (170 → 140) |
| Everything merges into a blob | raise `threshold` (170 → 200) |
| Speckles / JPEG noise traced as dots | raise `turdSize` (12 → 40) |
| Corners rounded off a geometric mark | lower `alphaMax` (1 → 0.4) |
| Output over ~40KB | raise `turdSize`, and drop the resize width to 1000 |

Budget: **a traced logo over ~40KB of path data is not a logo, it is a photograph.** If you cannot get under that, the source is a raster photo of a sign — use it as a photograph (SET-A) and stroke-draw `assets/trade-paths/<row>.svg` instead.

Always open the result and look at it. A trace that lost the counters of the letters is worse than no trace.

### 14.4 Stroke-draw the traced outline (R6)

`potrace` emits filled paths. For a stroke-draw you invert that: `fill: none`, add a stroke, and animate the dash.

**You do not need `getTotalLength()`.** Set `pathLength="1"` on every path and the dash units become fractions of the path. Verified in Chromium in this container: `stroke-dashoffset: 1` → 0 stroke pixels rendered; `0.5` → exactly half; `0` → the whole path.

```html
<svg class="logo-draw" viewBox="0 0 1600 1600" aria-label="Naziv firme">
  <path pathLength="1" d="…potrace output…" fill="none"
        stroke="var(--brand)" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>
</svg>
```

The CSS and JS are `animation-recipes.md` §R6 → *Code*, unchanged. Normalise the traced path to R6's contract first (`class="tp-ln" pathLength="1" style="--i:0"`, wrapper `<g class="tp" style="--n:1">`) with the one-liner in §R6 → *Asset prep* option C, then wrap the section in `class="draw"` and load `draw.js`. Row parameter: `animation-range: entry 10% cover 55%`.

**The one rule that matters more than the parameters:** the fully drawn logo is the **base layer**, and only `.js-draw` / `.sda-draw` ever set it to hidden. Written the intuitive way round — `stroke-dashoffset: 1` in the base rule, un-hidden inside `@supports` — the client's wordmark is **invisible** with JS off, in a crawler, in print, and in Firefox stable, which has not shipped `animation-timeline` (still behind `layout.css.scroll-driven-animations.enabled`; ~16% of visitors). Measured on the shipped `blueprint-elevation.svg` with the `@supports` block removed: **0 ink pixels**, at every render size tested (§5 has the table). For a SET-G build the logo *is* the hero, so this failure mode takes the whole page with it.

Three things to get right for a traced logo specifically:

- A traced logo is usually **one** path containing many `M…Z` subpaths, so it draws as a single continuous line. For stagger, split on `M` into separate `<path>` elements and give each an ascending `--i`; R6's `--spread` then does the rest, with no per-element `animation-range`.
- Add `aria-label` to the `<svg>` with the business name. This *is* the wordmark — it is not decorative, and it is not `aria-hidden`. (The **knockout** overlay in §14.5 is the opposite case: that one *is* `aria-hidden`.)
- Bump `stroke-width` to 2.5 below 480px or the hairline disappears on a phone.

### 14.5 Mask-reveal the headline through the logo shape

The signature SET-G move: the headline exists only inside the logo silhouette, then the silhouette opens until the headline stands free.

The naive implementation animates `mask-size` or `clip-path`, both of which are **off Safari's compositor allowlist** for scroll-driven animation and land on the main thread. There is a version that is pure `transform` and therefore compositor-safe: build an overlay in the page's own surface colour with the logo shape **knocked out** of it via `fill-rule="evenodd"`, then scale the overlay up. The hole grows; the content beneath is revealed; nothing but `transform` animates.

Compose the knockout from the traced SVG:

```js
// knockout.mjs — node knockout.mjs <logo-traced.svg> <out.svg>
import { promises as fs } from "node:fs";

const svg = await fs.readFile(process.argv[2], "utf8");
const vb  = (svg.match(/viewBox="([^"]+)"/)?.[1] || "0 0 1600 1600").split(/\s+/).map(Number);
const d   = [...svg.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1]).join(" ");
const [, , w, h] = vb;

// Outer rect drawn well beyond the art box so the overlay still covers the viewport at scale 1.
const outer = `M${-w} ${-h} H${w * 2} V${h * 2} H${-w} Z`;

// preserveAspectRatio MUST be "meet", not "slice". See the mobile note below — with
// "slice" this effect silently dies on every phone. Coverage is not at risk: the outer
// rect spans -w…2w and -h…2h, i.e. three viewBoxes in each axis, so it still paints past
// the viewport edge under "meet".
const out =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" ` +
  `preserveAspectRatio="xMidYMid meet" aria-hidden="true">` +
  `<path fill="var(--surface, #0d0f10)" fill-rule="evenodd" d="${outer} ${d}"/></svg>`;

await fs.writeFile(process.argv[3], out);
console.log("knockout bytes:", out.length);
```

```html
<section class="logo-reveal">
  <h1>AUTO ELEKTRIKA HODŽIĆ</h1>
  <div class="knockout" aria-hidden="true"><!-- inline the knockout.svg here --></div>
</section>
```

```css
.logo-reveal { position: relative; min-height: 100svh; display: grid; place-items: center;
               background: var(--surface); }
.logo-reveal h1 { color: var(--brand); margin: 0; font-size: clamp(2.5rem, 9vw, 7rem); }

/* Start and end scale are PARAMETERS, tuned per breakpoint against the pixel
   counter below. There is no universally correct pair — see traps 2 and 3. */
.knockout { --ko-from: 1; --ko-to: 6;   /* 6 is margin over the measured plateau of 3 — re-measure yours */
            position: absolute; inset: 0; transform-origin: 50% 50%;
            transform: scale(var(--ko-from)); will-change: transform; }
.knockout svg { width: 100%; height: 100%; display: block; }

@media (max-width: 768px) { .knockout { --ko-from: .35; --ko-to: 4; } }

@media not (prefers-reduced-motion: reduce) {
  @supports (animation-timeline: view()) {
    .knockout {
      animation: open linear both;
      animation-timeline: view();
      animation-range: entry 0% cover 70%;
    }
  }
}
@keyframes open { from { transform: scale(var(--ko-from)); } to { transform: scale(var(--ko-to)); } }

/* Reduced motion and Firefox: the hole is already open. The headline is simply visible. */
@media (prefers-reduced-motion: reduce) { .knockout { display: none; } }
```

This effect is far more geometry-dependent than it looks, and all three traps below were found by rendering it in Chromium and counting pixels — not by reading the CSS. **Measure your own mark before you ship it.** The harness is six lines:

```js
// Count brand-coloured pixels at a series of scales. Screenshot at 375x812 and 1440x900.
// If the count does not RISE across the ramp, the reveal is not happening — see the two traps.
const { data, info } = await sharp(await page.screenshot()).raw().toBuffer({ resolveWithObject: true });
let brand = 0;
for (let i = 0; i < data.length; i += info.channels)
  if (data[i] > 150 && data[i + 1] > 90 && data[i + 1] < 160 && data[i + 2] < 90) brand++;
```

Measured in this container, headline `AUTO ELEKTRIKA HODŽIĆ` in `#c8802a` on `#0d0f10`, `.knockout { transform: scale(s) }`, a traced mark whose **centre is solid ink**:

| viewBox fit | viewport | s=1 | s=3 | s=6 | s=12 | s=20 |
|---|---|---|---|---|---|---|
| `meet`  | 1440×900 | 42,272 | **62,012** | 62,012 | 62,012 | 62,012 |
| `slice` | 1440×900 | 60,755 | 62,012 | 62,012 | 62,012 | 62,012 |
| `meet`  | 375×812  | 7,721 | 7,721 | 7,721 | 7,721 | 7,721 |
| `slice` | 375×812  | 7,721 | 7,721 | 7,721 | 7,721 | 7,721 |

62,012 / 7,721 is the fully-revealed headline at each viewport. Read the table honestly — it says three things:

**Trap 1 — `slice` kills the reveal, and it does so on the desktop viewport, not the phone.** `preserveAspectRatio` cover-fits (`slice`) to the *larger* viewport axis and contain-fits (`meet`) to the *smaller* one. At 1440×900 landscape, `meet` fits the 900 axis → a 900×900 silhouette, narrower than the headline, so there is a real reveal (42,272 → 62,012, a 47% rise). `slice` fits the 1440 axis → a 1440×1440 silhouette that already clears the headline at scale 1, so the ramp moves 2% and the visitor sees nothing happen. **Use `meet`.**

**Trap 2 — on a portrait phone, scale 1 is already fully open, for both values.** At 375×812 the `meet` art box is 375 wide, which *is* the whole viewport width, so the silhouette starts bigger than the wrapped headline; `slice` is worse but indistinguishable, because both are already past full. The measured counts are identical and flat across the entire ramp. The fix is not `preserveAspectRatio` — **the start scale is a parameter too.** Measured at 375×812 with `meet`: `scale(0.35)` → 3,957 brand px, rising to 7,721 by `scale(1)`. So drive `--ko-from: .35` on mobile and `1` on desktop rather than hard-coding `from { transform: scale(1) }`:

```css
.knockout { --ko-from: 1; --ko-to: 6; }
@media (max-width: 768px) { .knockout { --ko-from: .35; --ko-to: 4; } }
@keyframes open { from { transform: scale(var(--ko-from)); } to { transform: scale(var(--ko-to)); } }
```

**Trap 3 — a hollow-centred mark runs the effect BACKWARDS and ends on a black screen.** The outer `<svg>` clips to its own viewport, so scaling the overlay magnifies whatever sits at the transform origin. If the centre of the traced mark is a *hole in the overlay* (solid ink in the logo) the hole grows and the page opens. If the centre is *overlay* — a ring, an outline, a wordmark with a gap in the middle — you are magnifying solid surface colour, and the page closes. Measured on a ring-outline mark at `meet`:

| viewport | s=1 | s=3 | s=6 | s=12 | s=20 |
|---|---|---|---|---|---|
| 375×812 | 3,194 | 3,450 | 713 | **0** | **0** |
| 1440×900 | 12,187 | 30,483 | 1,825 | **0** | **0** |

It peaks, then collapses to a fully black hero. **Before using this effect, check that the transform origin lands on ink.** If the mark is an outline or a ring, either re-origin the transform onto a solid part of it (`transform-origin` is free), or skip the knockout and use the §14.4 stroke-draw, which has no such requirement.

Four rules for this effect:

- **Use `preserveAspectRatio="xMidYMid meet"`.** `slice` is the intuitive choice for a full-bleed overlay and it is measurably wrong at desktop widths.
- **`--surface` on the knockout must be byte-identical to the section background.** One hex off and a visible rectangle edge appears at the start scale.
- **The `<h1>` is real text underneath, always.** The reveal is decoration over real content; screen readers and search engines see the heading regardless of the overlay, which is `aria-hidden`.
- **Tune `--ko-from` and `--ko-to` per breakpoint against the pixel counter above, and stop at the first scale that reaches the plateau.** Scaling past it costs nothing visually and everything in rasterisation. There is no single correct end scale: the same mark needed 3 at 1440×900 and a *start* below 1 to work at all at 375×812.

For a Firefox-safe non-`@supports` build, drive the same `transform: scale()` from a GSAP ScrollTrigger or an `IntersectionObserver` + Web Animations tween. The property being animated does not change.

### 14.6 What fills the rest of a SET-G page

The hero is solved. The page still has to be a page, and it has to be built out of the only things you have: **the business's real data, type, space, and one derived colour pair.**

1. **Hero** — knockout reveal + the headline + city + the one conversion action.
2. **Šta radimo** — the service list. Written from what the client tells you, set large, generously spaced. No icons; icons here are filler.
3. **A material band** — one full-width strip of derived colour with a CSS texture (a `repeating-linear-gradient` hairline grid, a subtle noise `filter`, or the traced logo repeated at 3% opacity as a `background-image`). This is where the page gets physical without a photograph.
4. **Brojevi** — years in business, jobs done, cities covered. Set as display-size numerals. Real numbers only; an invented one is the fastest way to lose the client's trust when they read the page.
5. **Cjenovnik or usluge s cijenama** if the trade publishes prices.
6. **Kontakt** — phone, Viber, address, hours, map. Large.
7. **Footer** with the traced logo, static.

Total hero payload for a SET-G build: **under 25KB** — a traced SVG under 40KB uncompressed (far less gzipped), two woff2 subsets, and no raster at all. It is the fastest page this skill produces.

**Say it out loud in the handover.** In `work/<slug>/ASSUMPTIONS.md` and in the delivery note:

> Ovo je tipografski sajt — nemamo fotografije, pa smo sve izgradili iz vašeg loga (boje, animacija, oblik). Kada nam pošaljete fotografije rada, ubacujemo ih u galeriju i hero bez ponovne izrade sajta.

Do **not** silently fill a SET-G page with Pexels stock. It breaks the skill's core promise, it looks like every other template, and the client will recognise that the workshop in the photo is not theirs. If stock genuinely must appear, it appears once, as an abstract texture, with the mandatory visible `Photo by X on Pexels` attribution — never as "their" premises, "their" work, or "their" staff.

### 14.7 SET-G gate

- [ ] `logo-palette.json` exists, has ≥1 swatch over 5% share, and `brand` is not the card colour
- [ ] `logo-traced.svg` is under 40KB and has been **looked at**, not just written
- [ ] The stroke-draw uses `pathLength="1"` (no `getTotalLength()` in the shipped JS)
- [ ] `animation-timeline` is declared **after** the `animation` shorthand everywhere
- [ ] An `IntersectionObserver` fallback exists for every `@supports`-gated effect
- [ ] **The base layer is the fully drawn state.** Delete every `@supports` block and reload: the logo must still be visible. If it vanishes, the shipped site is blank in Firefox.
- [ ] The knockout `--surface` matches the section background exactly
- [ ] The knockout `<svg>` uses `preserveAspectRatio="xMidYMid meet"` — **`slice` flatlines the reveal at desktop widths** (measured 2% movement at 1440×900)
- [ ] **The transform origin lands on ink.** A hollow-centred mark (ring, outline, gapped wordmark) runs the reveal backwards and ends on a black hero — measured 12,187 → 30,483 → 1,825 → **0** across scale 1→12
- [ ] The knockout reveal was screenshotted at **375×812 as well as 1440×900**, and the brand-pixel count actually **rises** across the ramp at both. At 375×812 that normally requires `--ko-from` **below 1** — at `scale(1)` the `meet` art box is already the full viewport width and nothing is hidden
- [ ] `--ko-to` stops at the first scale that reaches the plateau, not at a round number
- [ ] The `<h1>` is real text; the knockout `<svg>` is `aria-hidden="true"`
- [ ] Zero stock photography on the page, or exactly one with visible attribution
- [ ] The "tipografski sajt" sentence is in the handover

---

## 15. A trade that is not in the matrix

The matrix has twelve rows. Bosnia has several thousand kinds of small business. **The skill must produce a real answer for every one of them, and the answer is never "closest name wins".**

### 15.1 Map by motion, not by industry name

Ask four questions in this order and let the answers pick the row.

**Q1 — What does this trade physically do to a thing, over time?** This picks the motion verb and therefore the recipe.

| The work is… | Row to borrow the motion from |
|---|---|
| **Transformation** of one object, with a visible before and after | Salon (R3 wipe) |
| **Assembly** — a thing built up in stages | Građevina (R2 stages) |
| **Disassembly / diagnosis** — opening something to find the cause | Auto servis (R2 + R5 hotspots) |
| **Traversal** — moving through a space or along a route | Nekretnine (R4 walkthrough) or Transport (R6 route) |
| **Repetition / effort** — a cycle performed over and over | Teretana (R7→R4, snappy) |
| **Presentation** — one object shown from all sides | Radnja (R2 turn) |
| **Atmosphere over time** — the same place, different light | Hotel (R4 continuous dissolve) |
| **Curation** — selecting and sequencing others' attention | Foto (R4 hard cut) |
| **Appetite / desire** for a consumable | Restoran (R1 push) |
| **Care** — something done gently to a person | Ordinacija (R1 low-amplitude) |
| **Judgement / advice** — nothing physical happens at all | Advokat (R9 + R6, stillness) |

**Q2 — What does the customer search for and check first?** This picks the section order.
Price → salon/teretana order. Menu/offer → restoran order. Credentials → advokat/ordinacija order. Availability → hotel order. Evidence of past work → građevina/foto order. Stock → radnja order. Route/coverage → transport order.

**Q3 — What assets exist?** This picks the SET class and therefore whether you get the primary or the fallback recipe. Run triage before locking anything.

**Q4 — What is the one conversion action?** Phone, Viber/WhatsApp, form, booking, or directions. One.

Q1 and Q2 may land on **different rows**, and that is normal and good — it is what produces a site that is not any single template. A private language school: Q1 says "care/advice" (ordinacija — calm, credentials, restrained motion), Q2 says "price and schedule" (teretana — published tariffs and a real timetable table). The correct build takes ordinacija's motion and register and teretana's section order. That combination does not exist in the matrix, which is exactly the point.

### 15.2 What you keep and what you replace

When you borrow a row, **keep** these — they are what the row is for:

- the motion verb (rewritten in the new trade's own vocabulary)
- the recipe IDs and their numeric parameters from §0.4
- the section-order *logic* (what comes second, where the conversion action sits)
- the motion budget and the register discipline

**Replace** these — they are trade-specific and copying them is exactly how you get a recoloured template:

- palette anchors (derive from the new client's own evidence)
- type pairing
- photo brief
- copy angle
- the anti-pattern (find the new trade's own; every trade has one)

Write it in `work/<slug>/concept.md` in this exact shape so a later agent can audit it:

```markdown
## Row lock
Trade: Veterinarska ambulanta
Closest row: 6 — Ordinacija  (Q1 care, Q2 credentials + price)
Borrowed: motion verb pattern, R1 low-amplitude 400vh, calm register, section order 1-3
Replaced: palette (derived from clinic sign: #2E5E4E / #E8DCC8), type (Public Sans throughout),
          photo brief (animals not equipment), copy angle (hitni slučajevi 24h, cijena pregleda),
          anti-pattern (cartoon paw prints and a wagging-tail animation)
Motion verb: the waiting room settles and the camera comes to rest on the vet's hands on an animal.
Conversion action: tel: — hitni broj, visible in the header at all times
```

### 15.3 Worked mappings

| Trade | Row | Q1 reasoning | What changes most |
|---|---|---|---|
| Veterinarska ambulanta | 6 Ordinacija | care | emergency number in the header, animals not equipment in photos |
| Autopraonica / detailing | 2 Salon | transformation, visible before/after | dark palette from auto servis; the wipe is the whole site |
| Cvjećara | 11 Radnja + 2 Salon motion | presentation, but arrangements are transformations | seasonal (1. mart, 8. mart, Dan žena) is the revenue calendar |
| Tetovaža studio | 2 Salon | transformation on a person | artist-by-artist portfolios; consent is mandatory, not optional |
| Klima servis / vodoinstalater | 1 Auto servis | diagnosis | symptom-first services grid, `hitne intervencije` |
| Namještaj po mjeri | 5 Građevina + 11 Radnja | assembly, then presentation | stage build for the process, turn for the finished piece |
| Kamenorezac / spomenici | 8 Advokat register + 5 Građevina motion | assembly, but the register must be grave | absolute restraint; no motion in the hero at all |
| Autoškola | 4 Teretana order + 6 Ordinacija register | repetition (lessons), calm | published price per lesson and per package, pass rate |
| Pekara (industrijska, ne kafić) | 3 Restoran | appetite | wholesale enquiry as the conversion action, not walk-in |
| IT / marketing agencija | 8 Advokat | advice | case results with numbers; resist every temptation toward gradients |
| Pčelar / domaći proizvodi / OPG | 3 Restoran + 11 Radnja | appetite + presentation | provenance copy (where the hives are), seasonal availability |
| Bazen / spa / wellness | 9 Hotel | atmosphere over time | day-pass price, water temperature, ženski termin |
| Bend / DJ / event usluge | 12 Foto | curation | availability calendar by date is the highest-intent content |
| Rent-a-car | 11 Radnja turn + 10 Transport palette | presentation | price per day, deposit, mileage limit, delivery to airport |
| Vrtić / privatna škola | 6 Ordinacija | care | published monthly fee, daily schedule, staff qualifications |
| Knjigovodstvena agencija | 8 Advokat | advice | which software, which filings, paušalci yes/no |
| Perionica tepiha | 2 Salon | transformation | before/after is trivially available and enormously persuasive |
| Poljoprivredna apoteka | 11 Radnja | presentation | seasonal stock, `imamo na stanju`, advice as the differentiator |

### 15.4 When to stop and ask

Proceed with an inferred row and log it in `work/<slug>/ASSUMPTIONS.md` with a confidence level. Stop and ask the user **only** when:

- **Two rows tie on Q1** and their motions genuinely conflict — e.g. a business that is half workshop and half showroom, where "disassembly" and "presentation" are equally true. Ask which half makes the money.
- **Q1 has no answer** because the trade is genuinely intangible and the client also has no assets — this collapses to advokat's register plus SET-G, and it is worth one sentence of confirmation before building it.
- **The trade carries a legal or ethical constraint you cannot verify** — pharmacies, clinics, financial advice, anything involving minors. Get the constraint in writing before publishing claims.

Everything else: pick the row, write down what you borrowed and what you replaced, and build.

---

## 16. Distinctiveness self-check

Run before the build is called finished. Every item is machine-checkable against `work/<slug>/concept.md` or the built output.

- [ ] The motion verb contains a real verb and **names something this trade physically does**. Paste it under a different row's heading — if it still makes sense there, it is wrong.
- [ ] The recipe **parameters** match §0.4 for the locked row. R4 with default parameters on a hotel, a gym, an estate agent and a photographer is four identical sites.
- [ ] The section order differs from the previously built site's order, and sections 1–3 match the locked row.
- [ ] The conversion action is trade-correct, singular, and reachable within one thumb-scroll on a 375px viewport.
- [ ] Both palette anchors were **derived** from the client's own evidence, or the fallback anchors were used with a written reason.
- [ ] Both font families were confirmed to carry `latin-ext`.
- [ ] The photo brief was actually sent, and the harvested set is scored against it.
- [ ] The row's named anti-pattern does not appear anywhere on the page.
- [ ] Consent and photographer provenance are recorded for every identifiable person in the hero.
- [ ] **The meta-test:** swap the logo and the photographs for a different business in a different trade. If the page still works, it has no register — go back to §0.4 and re-read the row.

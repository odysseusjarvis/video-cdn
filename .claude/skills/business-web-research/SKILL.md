---
name: business-web-research
description: >
  Gathers all publicly available online documentation about a specific local
  business (text + carefully selected images) and compiles it into one structured
  context document ready for a web-building agent to create a personalized,
  branded website filled with real data. Activate when the user requests research
  or data collection about a specific business for website creation or analysis.
  Required input: BUSINESS NAME + CITY. Optional: disambiguating identifier
  (address, IG handle, owner name, industry, direct link).
version: 2.0.0
---

# SKILL: Business Web Research → Website Context Document

## 1. OBJECTIVE
Produce ONE self-contained document that is the complete online dossier of a
business: who they are, what they do, where they are, contact info, offerings,
brand tone, social proof — PLUS a small set of CAREFULLY selected images.
The consumer of this document is ANOTHER AI AGENT that will build the website.
The document must be self-sufficient and packed with real, verified data.

**The document is finished when a web-building agent can build the whole site from
it without asking a single follow-up question.** Every field the builder needs —
phone, hours, address, service names, tone — is either filled with a sourced fact
or explicitly marked as missing with instructions for how to get it.

## 2. GUIDING PRINCIPLE: Value vs Cost
Be exhaustive where value is high, economical where it is low.
**Stop rule**: when the last 2 sources yield no new information from the
high-value list — stop researching and move to document compilation.

## 3. REGIONAL CONTEXT
**Primary region**: Balkans (Bosnia and Herzegovina, Croatia, Serbia, Montenegro).
**Secondary**: diaspora businesses and international locations.

**For Balkan businesses**, expect sources in Bosnian, Croatian, Serbian, or
Montenegrin. Useful local registries and directories include:
- **akta.ba** — Bosnian business registry
- **biznet.hr** — Croatian business registry
- **apr.gov.rs** — Serbian business registry
- **pfrr.ba** — Federation of BiH business registry
- **kupujemprodajem.com** — Serbian/regional classifieds
- **Google Maps** — reviews are often in local languages

**For international businesses**, adapt the source strategy:
- Use country-specific business registries and directories
- Check Google Business Profile, Yelp, TripAdvisor as appropriate
- Social media remains the same approach regardless of region

Translate and present all extracted data in the SAME LANGUAGE as the output
document (match the user's language preference).

## 4. ⭐ GOLDEN RULE FOR IMAGES (most important section)

### 4a. Text is NOT an image
If a graphic or social media post contains PURELY TEXTUAL data (service list,
opening hours, price list, contact info, address) — DO NOT save it as an image.
Instead, READ it and TRANSCRIBE the content into the appropriate text section
of the document. Images cost tokens and storage; text is cheap and far more
useful to the consuming agent.

This applies equally to a screenshot the user uploads: a screenshot of an
opening-hours story is **text**, not an image asset. Read it, transcribe it,
and do not keep it in the assets folder.

### 4b. Images are ONLY what cannot be expressed as text
Download exclusively visuals that build brand identity and atmosphere.
Selection priority (most important first — aim for 6–10 total):
  1. **LOGO / PROFILE PICTURE** — brand identity (always, if it exists).
  2. **EXTERIOR** — building facade, entrance, signage.
  3. **TOP POST** — the image with the most likes/engagement (proven strongest visual).
  4. **TOOLS + FINISHED WORK** — work process and final result/product.
  5. **INTERIOR / TEAM** — ambience, people at work (if high quality exists).
  6. **⭐ BEFORE/AFTER** — the most convincing proof of quality.
     IMPORTANT: before/after are usually 2 images in the SAME post (carousel) —
     you MUST swipe/click through the carousel to reach the second image.
     Download both and name them `...-before.jpg` and `...-after.jpg`.

### 4c. Quality determines method
- Fetch the ORIGINAL full-resolution image when possible → PREFERRED.
- Screenshot/crop only when original download is unavailable.
- Skip: blurry images, duplicates, text-only graphics, watermarks from other brands.
- If NO download mechanism is available, record the direct image URL and a
  description in `image-urls.md` so the user or next agent can retrieve it.

---

## 5. ⭐ ACCESS LADDER — how this skill actually reaches the data

This is the part that decides whether the skill works or silently produces an
empty document. **Never assume a route works. Probe, record, then research.**

### 5a. Step 0.5 — Probe the environment ONCE, before any research

Run each rung until one returns real content. Spend at most ~2 minutes total.
Record the winning rung and every failure in the document's §0 Research Meta.

| # | Rung | How to test | Known failure signature |
|---|---|---|---|
| 1 | **Web search** | `WebSearch "<name> <city>"` | returns only a profile URL, no content |
| 2 | **Page fetch** | `WebFetch` on the found URLs | `429`, `403`, or a login wall |
| 3 | **Raw HTTP** | `curl -sS -A "<desktop browser UA>" <url>` | `200` but the body is a JS shell — check for `<title>` of the site name only and **no `og:` meta tags**; that means zero data |
| 4 | **Headless browser** | Playwright + Chromium, load the URL, read `document.body.innerText` | `ERR_CONNECTION_RESET` on *every* host = the sandbox has no browser egress; do not retry |
| 5 | **⭐ User upload** | ask the user for the screenshot bundle in §5c | never fails — this is the floor |

**Rung 5 always works.** A vision-capable `Read` opens PNG/JPG directly, so a
screenshot of a profile is a fully readable source. Treat it as a first-class
source, not a consolation prize.

### 5b. Known result for Instagram from a sandboxed container

Measured, not assumed — re-probe if the environment changes:

| Route | Result |
|---|---|
| `WebFetch` instagram.com | **429** |
| `curl` via proxy | **200, ~600 KB — JS shell only.** `<title>Instagram</title>`, no `og:` meta, no post JSON |
| Headless Chromium | **`ERR_CONNECTION_RESET` on every host**, including example.com |
| `r.jina.ai`, `imginn`, `picuki` | **403** |
| `web.archive.org` | blocked |

**Conclusion: Instagram content cannot be retrieved from a sandboxed container.**
When the target's only presence is Instagram, go straight to rung 5 — do not
burn turns on rungs 1–4 beyond the single probe.

Note the asymmetry: a **local HTML file** loads fine in headless Chromium even
when network egress is dead. Browser verification of a built page still works;
only outbound fetching is blocked.

### 5c. The upload request — be specific, ask once

Never say "send me everything". Ask for exactly this, in one message, and
explain that each screenshot replaces a section of the document:

1. **Profile header** — 1 shot: bio, follower/post counts, link, category.
2. **Highlights / services** — 1–3 shots of the story highlights that list
   services, prices, or hours.
3. **Top posts** — 3–5 shots of the posts with the most likes, *with captions visible*.
4. **Before/after** — 1 pair if it exists (both carousel frames).
5. **Contact** — a shot of whatever carries the phone, address and hours.
6. **Photos for the site** — the 6–10 originals per §4b, as files, at full resolution.

Then: read every uploaded image with `Read`, transcribe all text per §4a, and
keep only the §4b visuals as assets.

### 5d. Never do this
- Never attempt to log in to any source, or ask the user for credentials.
- Never route around a `403`/`407` from an egress proxy — report the blocked host.
- Never spend more than 2 attempts on a single blocked source.
- Never let a blocked source become an empty section with no explanation.

---

## 6. PROCEDURE

### Step 0 — Identification
Search for `"<name> <city>"` (+ identifier). Confirm the found entity matches
the target business via the identifier (address / handle / owner).
Record confidence level: **high** / **medium** / **low**.
If confidence is low, ask the user for clarification before proceeding.

### Step 0.5 — Probe the environment
Run §5a. Write the winning rung and the failures into §0 of the output document.
If the probe lands on rung 5, send the §5c request now so the user can be
collecting screenshots while you research everything else.

### Step 1 — Source mapping & plan
List all available sources: Google Business/Maps, Instagram, Facebook,
own website, local directories/registries (see §3), news articles, YouTube.
For each source decide: WHAT TO READ (text) and WHICH IMAGE to potentially
take (per §4b). Present this plan briefly to the user before deep-diving.

### Step 2 — Text extraction (high-value list)
Collect the following, in priority order:
1. **Identity**: commercial name, legal name, owner, industry, year founded
2. **Contact**: address, city, phone, email, website, opening hours
3. **Offerings**: services/products grouped by category, prices if public
4. **Portfolio**: specific work examples, measurable results
5. **Social proof**: average rating, review count, recurring praise/complaint themes
6. **Brand**: slogan, tone of voice, visual identity notes

TRANSCRIBE all text from text-heavy graphics (§4a).
PARAPHRASE reviews into recurring themes — never copy verbatim.
Record the source URL **for every data point**, or `upload:<filename>` when the
fact came from a user-supplied screenshot.

### Step 3 — Image collection (per §4, in priority order)
Follow the priority list in §4b strictly.
Ask the user for download permission ONCE (batch approval) before the first image.
Save images with descriptive filenames:
`<business>-logo.jpg`, `<business>-exterior.jpg`, `<business>-top-post.jpg`, etc.

**Fallback when images can't be downloaded directly:** create `image-urls.md`
listing direct URL, description, priority category (§4b) and suggested filename.

### Step 4 — Handle blocked or unavailable sources
1. Try the next rung of the §5a ladder.
2. If still blocked, record it as `"source blocked — <route>: <status>"` in §0
   **and** name which document sections are consequently empty.
3. Move on. Never more than 2 attempts on one source.

### Step 5 — Compile the document
Assemble `<business>-web-context.md` using the template in §7.
Missing data → `"not found online"`. Data awaiting an upload →
`"awaiting upload — see §10"`. Never invent a value to fill a gap.

---

## 7. OUTPUT TEMPLATE
```markdown
# <BUSINESS NAME> — Web Context

> Context document for an AI web-building agent.
> All data is factual; reviews are paraphrased. Generated on <DATE>.

## 0. Research Meta
- Date: <date>
- Identification confidence: high / medium / low
- **Access rung used** (§5a): <1–5>
- **Routes tried and failed**: <route → status, one line each>
- Sources reviewed: <list with URLs>
- Sections left empty because of a blocked source: <list>

## 1. Core Info
- Commercial name:
- Legal name (from registry):
- Owner / contact person:
- Industry / category:
- One-sentence description:
- Year founded:

## 2. Contact & Location
- Address:
- City / Region:
- Phone:
- Email:
- Website:
- Opening hours:
- Google Maps link:

## 3. Services / Products
<!-- Grouped by category; prices if publicly available -->
<!-- TRANSCRIBED from graphics per §4a -->

## 4. Portfolio / Work Examples

## 5. Social Proof
- Rating: X.X / 5 (N reviews) — source: <platform>
- Recurring praise themes (paraphrased):
- Recurring complaints (paraphrased, if any):

## 6. Brand Identity
- Logo: <file path or URL>
- Colors (hex if identifiable):
- Slogan / key messages:
- Communication tone:

## 7. Visual Assets
| # | Filename | Category (§4b) | Description | Source |
|---|----------|----------------|-------------|--------|

## 8. Social Media & Sources
| Platform | URL | Followers/Reviews | Notes |
|----------|-----|-------------------|-------|

## 9. Website Recommendations
- Suggested page sections:
- Recommended color palette / style:
- CTAs (calls to action):
- Key messages to highlight:
- Copywriting tone:
- Competitor comparison notes (if found):

## 10. What is still missing — exact upload list
<!-- The §5c list, narrowed to what is actually still unknown.
     A builder agent reading this knows precisely what it cannot yet build. -->
```

## 8. OUTPUT LOCATION

Detect the environment and write to the first path that exists:

| Environment | Path |
|---|---|
| Git repo where `work/` is **not** ignored | `work/research/<business-slug>/` |
| Git repo where `work/` **is** in `.gitignore` | `docs/research/<business-slug>/` |
| Desktop (macOS / Windows / Linux) | `Desktop/Business-Research/<business-slug>/` |

**Check `.gitignore` before choosing.** A container is reclaimed when the session
ends; a document written to an ignored path is lost the moment the work is over.
The dossier only has value if it survives to the next session — commit it.

```
<root>/<business-slug>/
├── <business>-web-context.md
├── <business>-logo.jpg
├── <business>-exterior.jpg
├── image-urls.md          ← fallback when direct download is unavailable
└── uploads/               ← raw user screenshots, kept only until transcribed
```
Create the folder structure before saving any file. `Desktop/` does not exist in
a container — do not try to write there, and do not ask the user to read a path
that only exists on the other machine.

## 9. BOUNDARIES & SAFETY
- Never fabricate data; missing = `"not found online"`.
- **A placeholder that looks real is worse than an empty field.** Never emit an
  invented phone number, address, rating or year. A builder agent will ship it.
- Transcribe text-heavy graphics, don't download them as images (§4a).
- Paraphrase reviews — never copy verbatim.
- Do not collect private personal data or facial databases.
- Get user permission before downloading files (batch approval is fine).
- Respect the stop rule (§2) and the ladder rules (§5d).
- If a source requires login, do NOT attempt to log in. Route to rung 5.

## 10. TOOL ADAPTATION

Use whatever the current environment provides. Measured behaviour, not assumptions:

| Task | Tool | Notes / measured outcome |
|---|---|---|
| Web search | `WebSearch` | works; finds profile URLs but rarely their content |
| Read static pages | `WebFetch` | works for ordinary sites; **429 on Instagram** |
| Raw HTTP with custom UA | `Bash` + `curl` | reaches hosts `WebFetch` refuses, but returns JS shells for SPA sites |
| Interactive pages | Playwright + Chromium `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` | **no network egress in the sandbox**; still fine for `file://` |
| Read uploaded screenshots | `Read` | vision-capable — the reliable floor (rung 5) |
| Download images | `Bash` + `curl` | else log URLs in `image-urls.md` |
| Create folders & files | `Bash` + `Write` | output per §8 |

**Key principle**: never fail silently. If a route is unavailable, log what could
not be done and leave enough instruction for a human or a later agent to finish it.

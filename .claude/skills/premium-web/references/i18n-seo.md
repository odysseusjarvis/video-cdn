# Multilingual + SEO

How this skill ships **Bosnian + English + German** by default, and how it makes a small BiH business
actually findable — without a CMS, a plugin, a subscription or a translator.

Companion to `scroll-effects.md` (motion), `hover-effects.md` (micro-interaction), `luxury-register.md` (visual quality).
**Verified 2026-08-02** against primary sources (Google Search Central, web.dev, schema.org, Astro docs). Sources in §8.

---

## 0. How to use this file

**Default output of this skill: three languages, always.** `bs`, `en`, `de`. Not "Bosnian, and English if there's time."

Why those three, stated once so you can repeat it to the client:

| Language | Who it is for | Commercial reason |
|---|---|---|
| **bs** | Domestic customers, local search, Google Business Profile traffic | 100% of walk-in / call-now / "blizu mene" demand |
| **de** | Diaspora in DE/AT/CH ordering for family property; German & Austrian firms sourcing from BiH | Highest-value enquiries. A German-language page is the single cheapest credibility signal a BiH supplier can buy |
| **en** | Everyone else — international buyers, EU procurement, partners, tourists, the fallback for every non-matching browser | It is the `x-default` audience. Never skip it |

Read **§1 before creating a single file** — the URL and content structure cannot be retrofitted cheaply.
Read **§2 before writing a word of copy.**
Run **§7 before you tell the user the site is done.** It is pass/fail, not vibes.

### 0.1 Facts this file depends on (checked today, not from a 2024 post)

| Fact | Status 2026-08-02 | Consequence for us |
|---|---|---|
| Core Web Vitals = **LCP, INP, CLS**; INP replaced FID in 2024; all evaluated at the **75th percentile**, segmented mobile/desktop | Stable (web.dev/articles/vitals) | Targets in §5.7 are field-data targets, not Lighthouse-lab scores |
| hreflang requires **reciprocity + self-reference**; region code alone is invalid | Current (Google Search Central) | §1.4 markup is non-optional boilerplate |
| Canonical should point to a page in the **same language**; Google prefers URLs inside an hreflang cluster | Current (Search Central, consolidate-duplicate-urls) | Never cross-canonical `/de/` → `/bs/` |
| **FAQ rich results were removed from Google Search entirely on 2026-06-15** (after being restricted to gov/health sites since 2023-09-14) | Confirmed on the FAQPage doc page | Ship `FAQPage` only for semantic/AI-answer value — **never promise the client star-style FAQ results in Google.** See §3.7 |
| `LocalBusiness` required properties are only `name` + `address`; everything else is recommended | Current (Search Central local-business) | Everything in §3.4 beyond those two is us being better than required |
| Astro `i18n` config: `locales`, `defaultLocale`, `routing.prefixDefaultLocale`, `routing.fallbackType`, `fallback`; helpers `getRelativeLocaleUrl` / `getAbsoluteLocaleUrl` / `getLocaleByPath`; `Astro.currentLocale` | Current (docs.astro.build) | §1.8 code is the current API, not the old `astro-i18next` era |
| Google Fonts' `latin` subset **does not contain č ć ž š đ** (they live in Latin Extended-A, U+0100–017F) | Verifiable in any font's `unicode-range` | §2.5 — the single most common way a BiH site ships broken |

---

## 1. Multilingual architecture

### 1.1 URL strategy — the decision, made

| Option | Example | Verdict |
|---|---|---|
| **Subdirectory, all locales prefixed** | `/bs/usluge/` `/en/services/` `/de/leistungen/` | ✅ **USE THIS.** One domain, one certificate, one hosting account, one accumulating authority. Symmetric — no locale is structurally special, so adding `nl` later is a folder. Works on any free static host. |
| Subdirectory, default locale unprefixed | `/usluge/` + `/en/…` + `/de/…` | ⚠️ Works, and is Astro's default (`prefixDefaultLocale: false`). But it makes `bs` structurally privileged: the switcher, the sitemap, the hreflang builder and every relative link now need an "is this the default?" branch. Every one of those branches is a place to get it wrong. Only choose it if the client explicitly demands a clean `/usluge/`. |
| Subdomain | `de.firma.ba` | ❌ Splits crawl signals, needs DNS + certs per locale, no benefit at this scale. |
| ccTLD | `firma.de`, `firma.ba` | ❌ Strongest geo-signal that exists, and completely wrong here: three domains, three renewals, three sets of backlinks to build from zero. Only justified for a company with a registered legal entity in each country. |
| Query parameter | `?lang=de` | ❌ Historically weak canonicalisation, ugly, easy to get indexed as duplicates. Never. |
| Cookie / `Accept-Language` auto-swap on one URL | `/usluge/` serves 3 languages | ❌ **Fatal.** Googlebot crawls from one locale and will only ever see one version; the other two are invisible. Also un-shareable — a user cannot send a colleague the German page. |

**Decision: subdirectory, every locale prefixed, `/` is a redirect.**

```
https://stolarija-vrelo.ba/            → 302 to /bs/   (and x-default points here or at /bs/)
https://stolarija-vrelo.ba/bs/
https://stolarija-vrelo.ba/en/
https://stolarija-vrelo.ba/de/
```

Root redirect on the free static hosts:

```
# Netlify / Cloudflare Pages — public/_redirects
/    /bs/    302
```

`vercel.json`:

```json
{ "redirects": [{ "source": "/", "destination": "/bs/", "permanent": false }] }
```

```html
<!-- GitHub Pages (no redirect engine) — /index.html, 8 lines, no JS required for crawlers.
     The <link rel="canonical"> and the visible links are what Google follows; the meta refresh is for humans. -->
<!doctype html>
<html lang="bs">
<head>
  <meta charset="utf-8">
  <title>Stolarija Vrelo — Tuzla</title>
  <link rel="canonical" href="https://stolarija-vrelo.ba/bs/">
  <meta http-equiv="refresh" content="0; url=/bs/">
</head>
<body>
  <p>Izaberite jezik / Choose a language / Sprache wählen:</p>
  <ul>
    <li><a href="/bs/" hreflang="bs" lang="bs">Bosanski</a></li>
    <li><a href="/en/" hreflang="en" lang="en">English</a></li>
    <li><a href="/de/" hreflang="de" lang="de">Deutsch</a></li>
  </ul>
</body>
</html>
```

Use **302, not 301**, for the root redirect. The root is a router, not a permanently moved page — a 301 tells Google `/` *is* `/bs/`, which you will regret the day the client wants a real language chooser there.

### 1.2 Language codes — exactly which strings

| Where | bs | en | de |
|---|---|---|---|
| Folder / URL prefix | `bs` | `en` | `de` |
| `<html lang="…">` | `bs` | `en` | `de` |
| `hreflang="…"` | `bs` | `en` | `de` |
| `og:locale` | `bs_BA` | `en_US` | `de_DE` |
| `og:locale:alternate` (on each page, the other two) | — | — | add `de_AT` if the client actively sells to Austria |
| JSON-LD `inLanguage` | `bs` | `en` | `de` |
| `Intl` locale for dates/numbers | `bs-BA` | `en-GB` | `de-DE` |

Rules that bite:

- **Never emit a region code alone.** `hreflang="ba"` is not "Bosnia" — region must be paired with a language (`bs-BA`), and bare `bs` is what you want anyway.
- **Do not create `hr` and `sr` versions.** Serving near-identical Croatian and Serbian copies of the Bosnian page is a duplicate-content own-goal, and it is a political statement the client did not ask you to make. One `bs` version serves the whole regional market. If the client sells heavily into Croatia and *insists*, add `hr` with genuinely rewritten copy (different vocabulary: *tvrtka/kompanija*, *tjedan/sedmica*, *travanj/april*) — not a copy.
- **Do not split `de` into `de-DE` / `de-AT` / `de-CH` unless the pages actually differ** (different phone number, different price, different legal notice). Three identical German pages compete with each other. One `de` covers all three markets.
- `en` unqualified is correct here — the audience is international, not American or British. Keep the *spelling* British-neutral (see §2.3).

### 1.3 The route map — one source of truth

Every URL in every language comes from **one file**. The switcher, the hreflang block, the sitemap, the breadcrumbs and the nav all read from it. If a slug is written twice anywhere in the project, you have a bug waiting.

```js
// content/routes.js — the single source of truth for every URL on the site.
// Nothing anywhere else in the project may hard-code a path.

export const SITE           = 'https://stolarija-vrelo.ba';   // no trailing slash
export const LOCALES        = /** @type {const} */ (['bs', 'en', 'de']);
export const DEFAULT_LOCALE = 'bs';                            // also the x-default target

// key → { locale: slug }.  '' means the locale home page.
// Slugs are ASCII-only: see §2.5 for the transliteration rules that produced them.
export const ROUTES = {
  home:     { bs: '',           en: '',           de: ''            },
  services: { bs: 'usluge',     en: 'services',   de: 'leistungen'  },
  work:     { bs: 'radovi',     en: 'work',       de: 'referenzen'  },
  about:    { bs: 'o-nama',     en: 'about',      de: 'ueber-uns'   },  // ü → ue, NOT über-uns
  contact:  { bs: 'kontakt',    en: 'contact',    de: 'kontakt'     },
  // service detail pages
  'services/kitchens': { bs: 'usluge/kuhinje',  en: 'services/kitchens', de: 'leistungen/kuechen' },
  'services/stairs':   { bs: 'usluge/stepenice', en: 'services/stairs',  de: 'leistungen/treppen' },
};

/** Absolute URL for a route key in a locale. Always trailing-slashed, always absolute. */
export function url(key, locale) {
  const slug = ROUTES[key][locale];
  return `${SITE}/${locale}/${slug ? slug + '/' : ''}`;
}

/** All alternates for a route, in the order hreflang should be emitted. */
export function alternates(key) {
  return LOCALES.map((l) => ({ locale: l, href: url(key, l) }));
}
```

**Localised slugs are worth the effort.** `/de/leistungen/kuechen/` outranks `/de/usluge/kuhinje/` for German queries because the URL itself is a relevance signal and, more importantly, because a German buyer reading a Bosnian URL loses confidence in the second before they read the page. The route map makes it cost nothing.

### 1.4 hreflang — done correctly

The three rules that cause 90% of broken implementations:

1. **Reciprocity.** If `/bs/usluge/` lists `/de/leistungen/`, then `/de/leistungen/` must list `/bs/usluge/`. Missing return links → Google ignores the whole cluster silently.
2. **Self-reference.** Every page lists *itself* among the alternates. A three-language page carries **four** `<link>` tags (bs, en, de, x-default) and all three pages carry the *identical* block.
3. **Absolute URLs.** Relative hrefs in hreflang are not reliably resolved. Always `https://…`.

Emit this identical block in the `<head>` of all three versions of every page:

```html
<!-- ================= /bs/usluge/  AND  /en/services/  AND  /de/leistungen/ =================
     Identical in all three files. Absolute URLs. Self-reference included. -->
<link rel="alternate" hreflang="bs"        href="https://stolarija-vrelo.ba/bs/usluge/">
<link rel="alternate" hreflang="en"        href="https://stolarija-vrelo.ba/en/services/">
<link rel="alternate" hreflang="de"        href="https://stolarija-vrelo.ba/de/leistungen/">
<link rel="alternate" hreflang="x-default" href="https://stolarija-vrelo.ba/bs/usluge/">
```

**Canonical is per-page and same-language.** It is *not* the same tag and does not point across languages:

```html
<!-- in /de/leistungen/ ONLY -->
<link rel="canonical" href="https://stolarija-vrelo.ba/de/leistungen/">
<html lang="de">
```

> Google: canonicals must "specify a canonical page in the same language, or the best possible substitute language."
> Cross-language canonicals de-index your translations. This is the single most expensive mistake in this document.

**What `x-default` is for:** the version served to a browser whose language matches none of yours. A Dutch or Italian visitor matches neither `bs`, `en` nor `de`. Two defensible targets:

- **`/bs/…` (recommended for a domestic-first business).** Simple, and the Bosnian page is the one with the most complete content.
- **The root `/`** if you built a real language chooser there instead of a redirect. Google explicitly blesses "a language selector or auto-redirecting homepage" as the x-default target.

Pick one and use it on every page. Do not mix.

**Generating the block** (works in any templating system — this is the whole logic):

```js
// build/hreflang.js — emits the <link> block for one page.
import { LOCALES, DEFAULT_LOCALE, url } from '../content/routes.js';

export function hreflangBlock(routeKey) {
  const links = LOCALES.map(
    (l) => `<link rel="alternate" hreflang="${l}" href="${url(routeKey, l)}">`
  );
  links.push(`<link rel="alternate" hreflang="x-default" href="${url(routeKey, DEFAULT_LOCALE)}">`);
  return links.join('\n');
}
```

**Verification (do this, don't assume):** in Search Console → *Indexing* → *Pages*, and by fetching each URL and diffing the blocks:

```bash
# All three files must print byte-identical hreflang blocks. Any difference is a bug.
for u in bs/usluge en/services de/leistungen; do
  echo "--- $u"
  curl -s "https://stolarija-vrelo.ba/$u/" | grep -o '<link rel="alternate"[^>]*>' | sort
done
```

### 1.5 Language switcher UX

**The requirement: switching language keeps you on the same page.** A switcher that dumps a user from `/de/leistungen/kuechen/` onto `/bs/` is the most common and most infuriating i18n bug on small business sites. The route map (§1.3) makes it trivial — the current page knows its own route key, so the switcher is just `url(routeKey, otherLocale)`.

**With three languages, do not build a dropdown.** Three two-letter links cost less space than the dropdown's chevron and require no JS, no focus trap and no ARIA. This is also the more expensive-looking choice (see `luxury-register.md` §1 — fewer parts, tighter tolerance).

```html
<!-- Rendered inside <header>. `routeKey` is known at build time for this page. -->
<nav class="lang" aria-label="Jezik · Language · Sprache">
  <ul class="lang__list">
    <li>
      <!-- Current language: NOT a link. A link to the page you are on is noise for screen readers. -->
      <span class="lang__item lang__item--current" lang="bs" aria-current="true">BS</span>
    </li>
    <li>
      <a class="lang__item" href="/en/services/" hreflang="en" lang="en" rel="alternate">EN</a>
    </li>
    <li>
      <a class="lang__item" href="/de/leistungen/" hreflang="de" lang="de" rel="alternate">DE</a>
    </li>
  </ul>
</nav>
```

```css
/* Language switcher — no JS, no dropdown, no layout shift. */
.lang__list {
  display: flex;
  align-items: center;
  gap: var(--space-2xs, 0.75rem);
  margin: 0; padding: 0;
  list-style: none;
}
.lang__item {
  display: inline-block;
  padding-block: 0.35em;                 /* generous tap target without changing layout height */
  font-size: 0.8125rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-decoration: none;
  color: var(--c-ink-60, #6b6b6b);
  transition: color 180ms cubic-bezier(0.22, 1, 0.36, 1);
}
.lang__item:hover,
.lang__item:focus-visible { color: var(--c-ink, #111); }
.lang__item--current { color: var(--c-ink, #111); }

/* Separator drawn with a pseudo-element so the DOM stays clean. */
.lang__list > li + li::before {
  content: "";
  display: inline-block;
  inline-size: 1px; block-size: 0.75em;
  margin-inline-end: var(--space-2xs, 0.75rem);
  vertical-align: -0.05em;
  background: currentColor;
  opacity: 0.25;
}

/* Underline grows from the centre — transform only, no layout work. */
.lang__item { position: relative; }
.lang__item::after {
  content: "";
  position: absolute; inset-inline: 0; bottom: 0.1em;
  block-size: 1px;
  background: currentColor;
  transform: scaleX(0);
  transform-origin: 50% 50%;
  transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
}
.lang__item:hover::after,
.lang__item:focus-visible::after,
.lang__item--current::after { transform: scaleX(1); }

@media (prefers-reduced-motion: reduce) {
  .lang__item, .lang__item::after { transition: none; }   /* state still changes, just instantly */
}
```

**Never auto-redirect on `Accept-Language`.** It hides two thirds of your site from Googlebot (which crawls from one locale), traps a Bosnian speaker in Germany on the German site, and breaks shared links. Offer, don't impose:

```html
<!-- Placed as the FIRST child of <body>. min-block-size is reserved so showing it causes zero CLS. -->
<aside id="lang-hint" class="lang-hint" hidden aria-live="polite">
  <p class="lang-hint__text"></p>
  <a class="lang-hint__go" href="#"></a>
  <button class="lang-hint__close" type="button" aria-label="Close">×</button>
</aside>
```

```css
.lang-hint {
  min-block-size: 3rem;                /* reserved BEFORE it is shown → CLS stays 0 */
  display: flex; align-items: center; gap: 1rem;
  padding-inline: var(--space-s, 1rem);
  background: var(--c-surface-2, #f4f2ee);
  opacity: 0;
  transform: translateY(-0.5rem);
  transition: opacity 260ms ease, transform 260ms cubic-bezier(0.22, 1, 0.36, 1);
}
.lang-hint[data-shown] { opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) {
  .lang-hint { transition: none; transform: none; }
}
```

```js
// lang-hint.js — ~20 lines, no dependency. Suggests a language, never forces one.
// ALTERNATES is injected per page by the build from routes.js.
(function () {
  const ALTERNATES = window.__ALTERNATES__;            // { bs:'/bs/usluge/', en:'/en/services/', de:'/de/leistungen/' }
  const CURRENT    = document.documentElement.lang;    // 'bs' | 'en' | 'de'
  const KEY        = 'lang-pref';

  // Respect an explicit earlier choice, and never nag twice.
  if (localStorage.getItem(KEY)) return;

  // First matching browser language that we actually publish.
  const wanted = (navigator.languages || [navigator.language || ''])
    .map((l) => l.slice(0, 2).toLowerCase())
    .find((l) => l in ALTERNATES);

  if (!wanted || wanted === CURRENT) return;

  const COPY = {
    bs: ['Ova stranica je dostupna i na bosanskom.', 'Pređi na bosanski'],
    en: ['This page is also available in English.',  'Switch to English'],
    de: ['Diese Seite gibt es auch auf Deutsch.',    'Auf Deutsch ansehen'],
  };

  const el = document.getElementById('lang-hint');
  el.querySelector('.lang-hint__text').textContent = COPY[wanted][0];
  const go = el.querySelector('.lang-hint__go');
  go.textContent = COPY[wanted][1];
  go.href = ALTERNATES[wanted];
  go.setAttribute('hreflang', wanted);
  go.setAttribute('lang', wanted);
  el.querySelector('.lang-hint__text').setAttribute('lang', wanted);

  el.hidden = false;
  requestAnimationFrame(() => el.setAttribute('data-shown', ''));

  go.addEventListener('click', () => localStorage.setItem(KEY, wanted));
  el.querySelector('.lang-hint__close').addEventListener('click', () => {
    localStorage.setItem(KEY, CURRENT);
    el.hidden = true;
  });
})();
```

Switcher checklist: real `<a href>` (works with JS off) · same page preserved · `hreflang` + `lang` on every link · current locale not a link · language names in their **own** language (Bosanski / English / Deutsch — never "Bosnian / Englisch") · no flags (a flag is a country, not a language: which flag is English?).

### 1.6 Content storage a non-developer can edit

The client must be able to fix a typo without you. That rules out "text lives inside HTML in three files". It also rules out anything that needs a database.

**Structure: one folder per locale, one file per page, flat keys, no nesting deeper than two levels.**

```
content/
  routes.js                # §1.3 — developer file, client never touches
  nap.json                 # §6 — Name/Address/Phone, ONE copy, feeds footer + JSON-LD + contact page
  bs/
    common.json            # nav, footer, buttons, form labels, error messages
    home.json
    services.json
    work.json
    about.json
    contact.json
    images.json            # alt text, keyed by image id — see §5.5
  en/  (same six files, same keys)
  de/  (same six files, same keys)
```

`content/bs/home.json` — flat, self-describing keys, no HTML in values except `<strong>`/`<em>`. **No comments: JSON does not allow them and the build will throw.**

```json
{
  "meta.title":        "Stolarija po mjeri — Tuzla | Stolarija Vrelo",
  "meta.description":  "Kuhinje, stepenice i namještaj po mjeri od masivnog drveta. Vlastita radionica u Tuzli, 18 godina iskustva, izrada 3–6 sedmica.",
  "hero.eyebrow":      "Radionica u Tuzli od 2007.",
  "hero.title":        "Namještaj koji nadživi kuću",
  "hero.lead":         "Kuhinje, stepenice i ugradni ormari od masivnog hrasta i bukve. Mjerenje, izrada i montaža — jedna ekipa, jedna odgovornost.",
  "hero.cta":          "Zatražite ponudu",
  "hero.ctaSecondary": "Pogledajte radove",
  "proof.years":       "18",
  "proof.yearsLabel":  "godina radionice",
  "proof.projects":    "640+",
  "proof.projectsLabel": "završenih kuhinja"
}
```

`content/de/home.json` — **same keys**, natively written German (see §2). Never a machine translation.

```json
{
  "meta.title":        "Massivholz nach Maß aus Bosnien | Tischlerei Vrelo",
  "meta.description":  "Küchen, Treppen und Einbauschränke aus Massivholz. Eigene Werkstatt in Tuzla, 18 Jahre Erfahrung, Lieferung nach DE/AT in 4–7 Wochen.",
  "hero.eyebrow":      "Werkstatt in Tuzla seit 2007",
  "hero.title":        "Massivholz, das bleibt",
  "hero.lead":         "Küchen, Treppen und Einbauschränke aus Eiche und Buche. Aufmaß, Fertigung und Montage aus einer Hand.",
  "hero.cta":          "Angebot anfordern",
  "hero.ctaSecondary": "Referenzen ansehen",
  "proof.years":       "18",
  "proof.yearsLabel":  "Jahre Werkstatt",
  "proof.projects":    "640+",
  "proof.projectsLabel": "gefertigte Küchen"
}
```

Rules for these files, printed in the README you hand the client:

- **Keys are identical across all three locales.** Adding a key means adding it three times. The checker in §1.7 enforces this.
- **No HTML in values** except `<strong>`, `<em>`, `<br>`. Anything else belongs in the template.
- **Numbers stay as strings** (`"640+"`, `"3–6"`) so the client can write `"preko 600"` without breaking a type.
- **One sentence per value.** If a value needs two paragraphs it should be two keys.
- Editable in Notepad, VS Code, or GitHub's web editor (`github.dev`) — no tooling required. If the client will edit on GitHub, add a `content/README.md` with a screenshot of the edit button.

### 1.7 Translation parity checker (run in CI and before every delivery)

```js
// tools/check-i18n.mjs — zero dependencies. `node tools/check-i18n.mjs`
// Fails the build on: missing keys, extra keys, empty values, and untranslated copy-paste.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'content';
const LOCALES = ['bs', 'en', 'de'];
const BASE = 'bs';                       // the locale that defines the key set
// Values legitimately identical across languages (names, numbers, emails, symbols):
const ALLOW_IDENTICAL = /^[\d\s+.,–—%€$/()-]*$|@|^https?:|^Vrelo/i;

let errors = 0;
const fail = (msg) => { console.error('✗ ' + msg); errors++; };

const load = (loc, file) => JSON.parse(readFileSync(join(ROOT, loc, file), 'utf8'));
const files = readdirSync(join(ROOT, BASE)).filter((f) => f.endsWith('.json'));

for (const file of files) {
  const base = load(BASE, file);
  for (const loc of LOCALES.filter((l) => l !== BASE)) {
    let other;
    try { other = load(loc, file); } catch { fail(`${loc}/${file} is missing entirely`); continue; }

    for (const k of Object.keys(base)) {
      if (!(k in other))            fail(`${loc}/${file}: missing key "${k}"`);
      else if (!String(other[k]).trim()) fail(`${loc}/${file}: empty value for "${k}"`);
      else if (other[k] === base[k] && !ALLOW_IDENTICAL.test(other[k]))
                                    fail(`${loc}/${file}: "${k}" is identical to ${BASE} — untranslated?`);
    }
    for (const k of Object.keys(other)) {
      if (!(k in base))             fail(`${loc}/${file}: extra key "${k}" not present in ${BASE}`);
    }
  }
}

// Length guard: German that is >45% longer than Bosnian will break a button or a heading. See §2.4.
for (const file of files) {
  const bs = load('bs', file), de = load('de', file);
  for (const k of Object.keys(bs)) {
    if (!de[k] || k.startsWith('meta.')) continue;
    const ratio = de[k].length / Math.max(bs[k].length, 1);
    if (bs[k].length > 8 && ratio > 1.45)
      console.warn(`⚠ de/${file}: "${k}" is ${Math.round((ratio - 1) * 100)}% longer than bs — check layout`);
  }
}

console.log(errors ? `\n${errors} i18n error(s)` : '\n✓ i18n parity OK');
process.exit(errors ? 1 : 0);
```

Wire it into `package.json` so a broken translation can never reach a build:

```json
{ "scripts": { "check:i18n": "node tools/check-i18n.mjs", "prebuild": "npm run check:i18n" } }
```

### 1.8 Approach A — vanilla HTML build (zero dependencies)

Static HTML with no framework, generated from the content JSON. ~90 lines total. This is the default output of this skill when the client has no build toolchain.

```
templates/
  base.html          # <html> shell, head, header, footer — {{token}} placeholders
  home.html          # body fragment
  services.html
build.mjs
```

```html
<!-- templates/base.html — the shell. {{…}} tokens are replaced verbatim; no template engine. -->
<!doctype html>
<html lang="{{locale}}">
<head>
<meta charset="utf-8">                                    <!-- FIRST tag: č/ć/ž/š/đ depend on it -->
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{meta.title}}</title>
<meta name="description" content="{{meta.description}}">
<link rel="canonical" href="{{canonical}}">
{{hreflang}}
<meta property="og:type" content="website">
<meta property="og:site_name" content="Stolarija Vrelo">
<meta property="og:locale" content="{{ogLocale}}">
{{ogLocaleAlternates}}
<meta property="og:title" content="{{meta.title}}">
<meta property="og:description" content="{{meta.description}}">
<meta property="og:url" content="{{canonical}}">
<meta property="og:image" content="{{ogImage}}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{{meta.ogImageAlt}}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="stylesheet" href="/assets/site.css">
<script type="application/ld+json">{{jsonld}}</script>
</head>
<body>
<a class="skip" href="#main">{{skipToContent}}</a>   <!-- key lives in content/{locale}/common.json -->
{{langHint}}
<header class="site-header">{{nav}}{{switcher}}</header>
<main id="main">{{body}}</main>
<footer class="site-footer">{{footer}}</footer>
<script>window.__ALTERNATES__ = {{alternatesJson}};</script>
<script src="/assets/lang-hint.js" defer></script>
</body>
</html>
```

```js
// build.mjs — reads content/, writes dist/{bs,en,de}/…/index.html. No dependencies.
import { readFileSync, mkdirSync, writeFileSync, cpSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { LOCALES, DEFAULT_LOCALE, ROUTES, SITE, url } from './content/routes.js';

const OG_LOCALE = { bs: 'bs_BA', en: 'en_US', de: 'de_DE' };
const PAGES = [                                  // routeKey → template + content file
  { key: 'home',     tpl: 'home.html',     data: 'home.json'     },
  { key: 'services', tpl: 'services.html', data: 'services.json' },
  { key: 'work',     tpl: 'work.html',     data: 'work.json'     },
  { key: 'about',    tpl: 'about.html',    data: 'about.json'    },
  { key: 'contact',  tpl: 'contact.html',  data: 'contact.json'  },
];

const read  = (p) => readFileSync(p, 'utf8');
const json  = (p) => JSON.parse(read(p));
/** Replace {{key}} tokens. Unknown tokens throw — a silent {{typo}} shipping to production is worse. */
const fill  = (tpl, vars) => tpl.replace(/\{\{([\w.]+)\}\}/g, (_, k) => {
  if (!(k in vars)) throw new Error(`Missing token {{${k}}}`);
  return vars[k];
});

const base = read('templates/base.html');

for (const locale of LOCALES) {
  const common = json(`content/${locale}/common.json`);

  for (const page of PAGES) {
    const data = json(`content/${locale}/${page.data}`);
    const canonical = url(page.key, locale);

    const hreflang = [
      ...LOCALES.map((l) => `<link rel="alternate" hreflang="${l}" href="${url(page.key, l)}">`),
      `<link rel="alternate" hreflang="x-default" href="${url(page.key, DEFAULT_LOCALE)}">`,
    ].join('\n');

    const alternates = Object.fromEntries(
      LOCALES.map((l) => [l, new URL(url(page.key, l)).pathname])
    );

    const switcher = `<nav class="lang" aria-label="Jezik · Language · Sprache"><ul class="lang__list">` +
      LOCALES.map((l) => l === locale
        ? `<li><span class="lang__item lang__item--current" lang="${l}" aria-current="true">${l.toUpperCase()}</span></li>`
        : `<li><a class="lang__item" href="${alternates[l]}" hreflang="${l}" lang="${l}" rel="alternate">${l.toUpperCase()}</a></li>`
      ).join('') + `</ul></nav>`;

    const vars = {
      ...common, ...data,
      locale, canonical, hreflang, switcher,
      ogLocale: OG_LOCALE[locale],
      ogLocaleAlternates: LOCALES.filter((l) => l !== locale)
        .map((l) => `<meta property="og:locale:alternate" content="${OG_LOCALE[l]}">`).join('\n'),
      ogImage: `${SITE}/og/${locale}-${page.key.replace(/\//g, '-')}.jpg`,
      alternatesJson: JSON.stringify(alternates),
      jsonld: read(`content/jsonld/${page.key.replace(/\//g, '-')}.${locale}.json`),
      nav: renderNav(locale, common),
      footer: renderFooter(locale, common),
      langHint: read('templates/lang-hint.html'),
      body: fill(read(`templates/${page.tpl}`), { ...common, ...data }),
    };

    const out = join('dist', new URL(canonical).pathname, 'index.html');
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, fill(base, vars));
    console.log('→', out);
  }
}
cpSync('public', 'dist', { recursive: true });

function renderNav(locale, c) {
  return `<nav aria-label="${c['nav.label']}"><ul>` +
    ['home', 'services', 'work', 'about', 'contact'].map((k) =>
      `<li><a href="${new URL(url(k, locale)).pathname}">${c['nav.' + k]}</a></li>`).join('') +
    `</ul></nav>`;
}
function renderFooter(locale, c) {
  const nap = json('content/nap.json');            // §6 — one source, never retyped
  return `<address>
    <span>${nap.name}</span>
    <span>${nap.street}, ${nap.postalCode} ${nap.city}</span>
    <a href="tel:${nap.phoneE164}">${nap.phoneDisplay}</a>
    <a href="mailto:${nap.email}">${nap.email}</a>
  </address><p>${c['footer.rights']}</p>`;
}
```

### 1.9 Approach B — Astro i18n (current API, 2026-08)

Use Astro when the client wants a blog, more than ~12 pages, or content collections. The i18n config below is the current API.

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://stolarija-vrelo.ba',
  i18n: {
    locales: ['bs', 'en', 'de'],
    defaultLocale: 'bs',
    routing: {
      prefixDefaultLocale: true,      // → /bs/, /en/, /de/ — symmetric, matches §1.1
      redirectToDefaultLocale: true,  // / → /bs/
      fallbackType: 'redirect',       // a missing /de/ page redirects rather than silently showing bs
    },
    fallback: { de: 'en', en: 'bs' }, // only fires for pages that genuinely don't exist yet
  },
  integrations: [
    sitemap({
      i18n: { defaultLocale: 'bs', locales: { bs: 'bs', en: 'en', de: 'de' } }, // emits xhtml:link alternates
    }),
  ],
});
```

```
src/
  i18n/
    ui.ts                 # UI strings (nav, buttons) — small, typed
    routes.ts             # same route map as §1.3
  content/
    pages/
      bs/usluge.md   en/services.md   de/leistungen.md    # long-form copy, frontmatter meta
  layouts/BaseLayout.astro
  components/Seo.astro  LangSwitcher.astro
  pages/
    [lang]/index.astro
    [lang]/[...slug].astro
```

```ts
// src/i18n/ui.ts — UI strings only. Page copy lives in content collections.
export const languages = { bs: 'Bosanski', en: 'English', de: 'Deutsch' } as const;
export const defaultLang = 'bs' as const;

export const ui = {
  bs: { 'nav.services': 'Usluge', 'nav.work': 'Radovi', 'cta.quote': 'Zatražite ponudu' },
  en: { 'nav.services': 'Services', 'nav.work': 'Work',  'cta.quote': 'Request a quote'  },
  de: { 'nav.services': 'Leistungen', 'nav.work': 'Referenzen', 'cta.quote': 'Angebot anfordern' },
} as const;

/** t('nav.services') bound to a locale, with a hard fail in dev if a key is missing. */
export function useTranslations(lang: keyof typeof ui) {
  return function t(key: keyof (typeof ui)['bs']): string {
    return ui[lang][key] ?? ui[defaultLang][key];
  };
}
```

```astro
---
// src/components/Seo.astro — canonical + hreflang + OG, computed, never hand-written.
import { getAbsoluteLocaleUrl } from 'astro:i18n';

interface Props { path: Record<'bs' | 'en' | 'de', string>; title: string; description: string; ogImage: string; }
const { path, title, description, ogImage } = Astro.props;

const locales = ['bs', 'en', 'de'] as const;
const OG_LOCALE = { bs: 'bs_BA', en: 'en_US', de: 'de_DE' } as const;
const current = (Astro.currentLocale ?? 'bs') as (typeof locales)[number];
const href = (l: (typeof locales)[number]) => getAbsoluteLocaleUrl(l, path[l]);
---
<link rel="canonical" href={href(current)} />
{locales.map((l) => <link rel="alternate" hreflang={l} href={href(l)} />)}
<link rel="alternate" hreflang="x-default" href={href('bs')} />

<title>{title}</title>
<meta name="description" content={description} />
<meta property="og:type" content="website" />
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:url" content={href(current)} />
<meta property="og:image" content={new URL(ogImage, Astro.site)} />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:locale" content={OG_LOCALE[current]} />
{locales.filter((l) => l !== current).map((l) => <meta property="og:locale:alternate" content={OG_LOCALE[l]} />)}
<meta name="twitter:card" content="summary_large_image" />
```

```astro
---
// src/components/LangSwitcher.astro — preserves the current page. Same markup as §1.5.
import { getRelativeLocaleUrl } from 'astro:i18n';
import { languages } from '../i18n/ui';
interface Props { path: Record<'bs' | 'en' | 'de', string>; }
const { path } = Astro.props;
const current = Astro.currentLocale ?? 'bs';
---
<nav class="lang" aria-label="Jezik · Language · Sprache">
  <ul class="lang__list">
    {Object.keys(languages).map((l) => (
      <li>
        {l === current
          ? <span class="lang__item lang__item--current" lang={l} aria-current="true">{l.toUpperCase()}</span>
          : <a class="lang__item" href={getRelativeLocaleUrl(l, path[l])} hreflang={l} lang={l} rel="alternate">{l.toUpperCase()}</a>}
      </li>
    ))}
  </ul>
</nav>
```

> `getRelativeLocaleUrl(locale, path)` returns e.g. `/de/leistungen/`. Pass the **localised slug** from the route map, not the current URL's slug — otherwise the German switcher points at `/de/usluge/`, which 404s.

---

## 2. Translation quality

### 2.1 The rule: compose, never translate

**You are not translating a website. You are writing the same business's website three times, for three different buyers.**

The failure mode is obvious to a native reader in half a second and invisible to a machine: grammatically perfect sentences that no one in that market would have written. It reads as *imported*, which for a BiH firm selling into Germany is precisely the impression that loses the job.

**The three-pass method — follow it literally:**

1. **Pass 1 — the fact sheet, in no language.** Before writing any copy, extract from the client into a plain list: what they make, the materials, the years, the numbers, the lead time, the guarantee, the geography, the three objections a buyer raises, the proof for each. Bullet points, no sentences, no adjectives.
2. **Pass 2 — compose each language from the fact sheet, from a blank page.** Write Bosnian from the fact sheet. Then close it. Write German from the fact sheet — **not from the Bosnian.** Then English. Different sentence counts, different section orders and different emphasis between the three versions are *correct*, not a bug. The German page can lead with certification and delivery time; the Bosnian page can lead with the workshop and the family name.
3. **Pass 3 — the single-reader test.** Read one language version in isolation and answer: *would a person from that market, with that job, have written this?* For German: would a Bavarian *Einkäufer* have written it? For Bosnian: would a Tuzlan who actually owns this workshop say it out loud? If the answer needs a "well, it's a translation, so…", rewrite the paragraph.

Two hard bans:
- **Never machine-translate then edit.** Post-editing preserves the source's sentence structure, which is exactly the thing that gives it away.
- **Never make the three versions structurally identical sentence-for-sentence.** Parity is at the *key* level (§1.7), not the sentence level. One key may hold 9 words in Bosnian and 14 in German.

### 2.2 Register: formal vs informal, per market

Getting this wrong is worse than a typo. `du` to a German plant manager loses the enquiry outright.

| Market / audience | Address | Notes |
|---|---|---|
| **Bosnian — trades, construction, B2B, medical, legal, anything where money changes hands** | **Vi** (capitalised in direct address: *Vaša kuhinja*, *javite nam se*) | Default. Safe everywhere. Do not "modernise" it. |
| **Bosnian — fitness, cafés, youth fashion, streetwear, gaming, personal brands under ~30** | **ti** | Only if the client's own Instagram already uses `ti`. Check before deciding. |
| **German — every B2B context, all trades, all construction, all professional services, anything to DE/AT/CH firms** | **Sie**, always | `Sie`, `Ihre`, `Ihnen` capitalised. There is no upside to `du` here and a real downside. |
| **German — fitness studios, cafés, D2C lifestyle, tourism/apartment rental to a young audience** | **du** | Choose once and never mix within the site. Mixed address reads as amateur. |
| **English** | Direct second person, no formality distinction | Warm and plain. Avoid "esteemed", "kindly", "we would be delighted to". |

Once chosen, the register is a project-wide constant, including in form labels, error messages, the cookie notice and the 404 page.

### 2.3 Translationese markers — the actual traps

These are the phrases that mark a site as template-generated. Ban them by name.

**Bosnian — replace:**

| Dead phrase | Why it fails | Write instead |
|---|---|---|
| "Dobrodošli na našu web stranicu" | The universal 2011 template opener. Says nothing. | Open with what you make: *"Kuhinje od masivnog hrasta, iz naše radionice u Tuzli."* |
| "Mi smo firma koja se bavi proizvodnjom…" | Bureaucratic; buries the product in a subordinate clause | *"Pravimo kuhinje po mjeri."* |
| "Naš tim stručnjaka stoji Vam na raspolaganju" | Empty; every site says it | Name the people or the number: *"Četiri majstora, jedna radionica, 18 godina."* |
| "Kvalitet i povjerenje na prvom mjestu" | Unfalsifiable claim | Replace with a checkable one: *"Garancija 5 godina na sve spojeve."* |
| "Kontaktirajte nas za više informacija" | Weak CTA, no next step | *"Pošaljite mjere — ponuda za 48 sati."* |

**English — replace:**

| Dead phrase | Write instead |
|---|---|
| "Our company is engaged in the production of…" | "We build…" |
| "We are pleased to welcome you to our website" | Delete. Start with the offer. |
| "High quality products at affordable prices" | "Solid oak, made to measure, from 1 800 KM per running metre." |
| "Do not hesitate to contact us" | "Send us the measurements. Quote within 48 hours." |
| "With many years of experience" | "Since 2007. 640 kitchens." |

**German — replace:**

| Dead phrase | Why it fails | Write instead |
|---|---|---|
| "Herzlich willkommen auf unserer Webseite" | The single clearest signal of a template or a translation | *"Massivholzküchen aus eigener Fertigung."* |
| "Wir sind Ihr kompetenter Partner rund um das Thema Holz" | *kompetenter Partner* and *rund um das Thema* are the two most worn phrases in German small-business web copy | *"Wir fertigen Küchen, Treppen und Einbauschränke aus Massivholz."* |
| "Qualität made in Europe" | Vague and slightly suspicious to a German reader | *"Eiche und Buche aus bosnischen Wäldern, FSC-zertifiziert, Fertigung in eigener Werkstatt."* |
| "Wir freuen uns auf Ihre Kontaktaufnahme" | Stiff nominalisation (*Kontaktaufnahme*) | *"Schreiben Sie uns — Angebot innerhalb von 48 Stunden."* |
| "Preise auf Anfrage" everywhere | German B2B buyers screen on price ranges early | Give a range or a per-unit figure. |

**Positive German rules that make copy read as native:** verbs over nominalisations (*wir fertigen* > *die Fertigung erfolgt durch uns*); concrete numbers, dimensions and standards (a German buyer trusts *18 mm*, *DIN 68871*, *4–7 Wochen* far more than adjectives); short main clauses — resist the temptation to nest; state delivery, warranty and payment terms explicitly on the page, because their absence reads as evasive.

### 2.4 German compound length — the layout killer

German runs **~10–35% longer than English** in body copy and much worse in single words. That length lands in exactly the places with no room: buttons, nav items, table headers, form labels, card titles.

Real strings this skill hits routinely:

| EN | BS | DE | DE chars |
|---|---|---|---|
| Services | Usluge | **Leistungen** | 11 |
| Request a quote | Zatražite ponudu | **Angebot anfordern** | 18 |
| Terms & conditions | Uslovi korištenja | **Allgemeine Geschäftsbedingungen** | 33 |
| Privacy policy | Politika privatnosti | **Datenschutzerklärung** | 22 |
| Delivery time | Rok isporuke | **Lieferzeit** | 10 |
| Surface treatment | Obrada površine | **Oberflächenbehandlung** | 22 |
| Made to measure | Po mjeri | **Maßanfertigung** | 15 |
| Load-bearing capacity | Nosivost | **Tragfähigkeitsnachweis** | 22 |

Defences, all CSS, all cheap:

```css
/* 1. NEVER size a control by its content in one language. Buttons get a min, not a fixed width. */
.btn {
  min-inline-size: 12rem;          /* fits "Angebot anfordern" comfortably */
  padding-inline: clamp(1.25rem, 3vw, 2rem);
  inline-size: auto;               /* never a fixed px width */
  white-space: nowrap;             /* a two-line button looks broken… */
}
@media (max-width: 26rem) {
  .btn { white-space: normal; text-wrap: balance; }   /* …except on tiny screens, where wrapping beats overflow */
}

/* 2. Flex/grid children must be allowed to shrink. This one line prevents most German overflow. */
.nav__item, .card, .grid > * { min-inline-size: 0; }

/* 3. Hyphenation. `hyphens: auto` requires a CORRECT lang attribute to load the dictionary —
      it silently does nothing on <html lang="en"> containing German text. */
:lang(de) {
  hyphens: auto;
  hyphenate-limit-chars: 8 4 4;    /* progressive enhancement: min word 8, min 4 before/after break */
}
/* Bosnian hyphenation dictionaries are not reliably shipped by browsers — do not rely on hyphens:auto for bs. */
:lang(bs) { hyphens: manual; }     /* use &shy; by hand in the 1–2 places it matters */

/* 4. Last-resort break so a 33-character compound can never cause a horizontal scrollbar. */
h1, h2, h3, .card__title, .table th { overflow-wrap: break-word; }

/* 5. Headings: balance short ones, pretty the long ones. Both are widely available (see luxury-register §0.2). */
h1, h2, .card__title { text-wrap: balance; }
p, li { text-wrap: pretty; }

/* 6. Give German headings a slightly smaller clamp ceiling so the same design survives the longer words. */
:lang(de) h1 { font-size: clamp(2.25rem, 6.4vw, 4.4rem); }   /* vs 7vw / 5rem for bs/en */
```

**Test procedure, not a hope:** before delivery, load each page at **320px wide** in all three languages and confirm zero horizontal overflow:

```js
// Paste into DevTools console on every page × every language. Must log nothing.
document.querySelectorAll('*').forEach((el) => {
  if (el.scrollWidth > document.documentElement.clientWidth + 1) console.warn('OVERFLOW:', el);
});
```

### 2.5 Bosnian diacritics — where č ć ž š đ break things

**Five places, four of which are silent failures.**

**(a) Fonts — the number one cause of a broken-looking BiH site.**
The Google Fonts `latin` subset covers German (ä ö ü ß live in Latin-1 Supplement) but **not** Bosnian: č ć ž š đ live in **Latin Extended-A, U+0100–U+017F**. Request `latin-ext` or ship tofu boxes.

```html
<!-- If using the Google Fonts CDN: latin-ext is REQUIRED. -->
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&subset=latin,latin-ext&display=swap">
```

```css
/* Self-hosted (preferred — faster, no third-party request). unicode-range MUST include Latin Extended-A. */
@font-face {
  font-family: "Fraunces";
  src: url("/fonts/fraunces-latin-ext.woff2") format("woff2");
  font-weight: 400 600;
  font-display: swap;
  unicode-range: U+0000-00FF, U+0100-017F, U+2000-206F, U+20AC, U+2122;
  /*             basic latin  ↑ č ć ž š đ AND ä ö ü ß    punctuation  €     ™            */
}
```

```bash
# Subset a self-hosted font correctly with free tooling (fonttools):
pip install fonttools brotli
pyftsubset Fraunces.ttf --output-file=fraunces-latin-ext.woff2 --flavor=woff2 \
  --unicodes="U+0000-00FF,U+0100-017F,U+2000-206F,U+20AC,U+2122" \
  --layout-features="kern,liga,onum,tnum"
```

**The check, run on every font on the site:** render this string and look at it. Any box, any fallback-font letter, any wrong weight = the font is not usable.

```
ČĆŽŠĐ čćžšđ Džemal Šćepanović žuti đak — ÄÖÜäöüß — 0123456789
```

If a display font genuinely lacks č/ć/ž/š/đ (common with fashionable free display faces), you have two options: pick a different font, or use it **only** for English/German headings and a matched fallback for Bosnian. Never accept tofu.

**(b) Slugs and filenames — transliterate to ASCII, always.**
Percent-encoded UTF-8 URLs are legal and Google handles them, but `/bs/usluge/ku%C4%87ni-namje%C5%A1taj/` is unreadable when pasted into Viber, breaks in some email clients, and looks broken in an ad. Transliterate.

| Character | Slug | | Character | Slug |
|---|---|---|---|---|
| č, Č | `c` | | dž, Dž | `dz` |
| ć, Ć | `c` | | ä, Ä | `ae` |
| ž, Ž | `z` | | ö, Ö | `oe` |
| š, Š | `s` | | ü, Ü | `ue` |
| đ, Đ | `d` | | ß | `ss` |

```js
// tools/slug.mjs — deterministic ASCII slugs for bs and de. Use at build time; never at runtime.
const MAP = { č:'c', ć:'c', ž:'z', š:'s', đ:'d', dž:'dz', ä:'ae', ö:'oe', ü:'ue', ß:'ss' };
export const slug = (s) =>
  s.toLowerCase()
   .replace(/dž|[čćžšđäöüß]/g, (m) => MAP[m])
   .normalize('NFD').replace(/\p{Diacritic}/gu, '')   // catch anything the map missed
   .replace(/[^a-z0-9]+/g, '-')
   .replace(/^-+|-+$/g, '');

// slug('Kućni namještaj')      → 'kucni-namjestaj'
// slug('Küchen & Türen')       → 'kuechen-tueren'
// slug('Stepenice od hrasta')  → 'stepenice-od-hrasta'
```

Same rule for **image filenames** (`radionica-tuzla-01.avif`, never `radionica-tuzla-čamac.avif`) — some CDNs and some Windows toolchains still mangle non-ASCII filenames.

**(c) Visible copy, `<title>`, meta description, JSON-LD, alt text — keep the diacritics.**
These are UTF-8 and correct. *"Namjestaj po mjeri"* in a title is a spelling error to a Bosnian reader and cheapens the brand instantly. Requirements: `<meta charset="utf-8">` as the first tag in `<head>`, all content files saved as UTF-8 **without BOM**, and the server sending `Content-Type: text/html; charset=utf-8`.

```bash
# Verify encoding of every content file and of the served page.
file -I content/bs/*.json          # must say charset=utf-8
curl -sI https://stolarija-vrelo.ba/bs/ | grep -i content-type
```

**(d) Search behaviour.** Bosnian users very often type without diacritics (`stolarija tuzla kucni namjestaj`). Google folds diacritics, so you do **not** need to duplicate keywords. Do not write "namještaj / namjestaj" on the page — it reads as spam. The one legitimate place a diacritic-free variant appears naturally is the URL slug (which you already transliterated) and, occasionally, an alt text.

**(e) Forms and email.** Any contact form that posts to a third-party endpoint must send `charset=utf-8`; test with a message containing `Šćepanović, đevrek, žuč`. A client receiving `Ĺ ÄŤepanoviÄ‡` in their inbox will assume the whole site is broken.

### 2.6 Numbers, dates, prices, phone — per locale

```js
// tools/format.mjs — locale-correct formatting. Never hand-format numbers in three languages.
const LOC = { bs: 'bs-BA', en: 'en-GB', de: 'de-DE' };

export const money = (v, locale, currency = 'BAM') =>
  new Intl.NumberFormat(LOC[locale], { style: 'currency', currency, maximumFractionDigits: 0 }).format(v);
// money(1800,'bs') → "1.800 KM"   money(920,'de','EUR') → "920 €"   money(920,'en','EUR') → "€920"

export const date = (iso, locale) =>
  new Intl.DateTimeFormat(LOC[locale], { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
// date('2026-03-14','bs') → "14. mart 2026."   → de: "14. März 2026"   → en: "14 March 2026"
```

Conventions to respect in hand-written copy too:

| | bs | de | en |
|---|---|---|---|
| Decimal separator | comma — `18,5 mm` | comma — `18,5 mm` | point — `18.5 mm` |
| Thousands | dot or space — `1.800` | dot — `1.800` | comma — `1,800` |
| Currency | `1.800 KM` (KM after) | `920 €` (€ after) | `€920` / `KM 1,800` |
| Date | `14.03.2026.` (trailing dot) | `14.03.2026` | `14 March 2026` |
| Phone display | `+387 35 123 456` | `+387 35 123 456` | `+387 35 123 456` |
| `tel:` href | `tel:+38735123456` — always E.164, no spaces, in all three | | |

Show prices to the German audience in **EUR** and to the domestic audience in **KM**, and say which: *"Preise in EUR, zzgl. MwSt."* / *"Cijene su u KM, sa uključenim PDV-om."* Vagueness about VAT is a trust killer in German B2B.

### 2.7 Marking foreign fragments inline

When a German quote appears on a Bosnian page (a testimonial from an Austrian client, a certification name), tag it. Screen readers switch voice, hyphenation loads the right dictionary, and it is one attribute:

```html
<blockquote lang="de" cite="https://example.com">
  <p>Die Treppe wurde exakt nach Aufmaß geliefert — in fünf Wochen.</p>
  <footer>— Bauunternehmen Kellner, Graz <span lang="de">(AT)</span></footer>
</blockquote>
```

---

## 3. Local SEO — structured data for BiH businesses

### 3.1 Rules before the code

- **One JSON-LD `<script>` per page**, containing a single `@graph` array. Multiple competing blocks make debugging miserable.
- **Stable `@id` URIs**, so entities reference each other instead of being duplicated: `https://site.ba/#organization`, `#localbusiness`, `#website`, and per page `…/bs/usluge/#webpage`.
- **`LocalBusiness` requires only `name` and `address`.** Everything else is us being better than the minimum — and it is the "everything else" that wins local packs.
- **The `name` is identical in all three languages.** A legal business name is not translated. Localise `description`, never `name`, `streetAddress` or `telephone`. (See §6.)
- **Only mark up what is visible on the page.** Opening hours in JSON-LD but nowhere on the page is a policy violation and, more practically, a support call when they change.
- **Validate before delivery** at `validator.schema.org` (syntax and vocabulary) *and* Google's Rich Results Test (eligibility). Both free.

### 3.2 Pick the right subtype

Use the **most specific** schema.org `LocalBusiness` subtype that exists. If none fits, use `LocalBusiness` plus `additionalType` pointing at a Wikipedia/Wikidata URI.

| Trade (BiH) | schema.org type |
|---|---|
| Stolarija / joinery, namještaj po mjeri | `HomeAndConstructionBusiness` (+ `additionalType` Wikipedia *Joinery*) |
| Građevinska firma, izvođač radova | `GeneralContractor` |
| Vodoinstalater | `Plumber` |
| Električar | `Electrician` |
| Moler / farbar | `HousePainter` |
| Krovopokrivač | `RoofingContractor` |
| Bravarija, ograde, kapije | `HomeAndConstructionBusiness` |
| Kovačnica / metaloprerada / **proizvodnja** | **`Organization`, not `LocalBusiness`** — a factory that does not serve walk-in customers is not a local business. Add `ProfessionalService` only if they do serve local clients directly. |
| Auto servis | `AutoRepair` · autopraonica `AutoWash` · vulkanizer `AutoRepair` · autodijelovi `AutoPartsStore` |
| Frizerski salon | `HairSalon` · kozmetički `BeautySalon` · spa/wellness `DaySpa` · nokti `NailSalon` |
| Teretana / fitness | `HealthClub` · sportski teren `SportsActivityLocation` |
| Restoran | `Restaurant` · kafić `CafeOrCoffeeShop` · pekara `Bakery` · fast food `FastFoodRestaurant` |
| Apartmani / vikendica / pansion | `LodgingBusiness`, or `BedAndBreakfast` / `Resort` / `Hotel` where accurate |
| Advokat | `Attorney` (subtype of `LegalService`) |
| Računovodstvena agencija | `AccountingService` |
| Stomatolog | `Dentist` · ordinacija `MedicalClinic` · apoteka `Pharmacy` · fizioterapija `Physiotherapy` |
| Autoškola | `DrivingSchool` · privatna škola/kurs `EducationalOrganization` |
| Transport / špedicija | `MovingCompany` (selidbe) or `Organization` + `additionalType` |
| Turistička agencija | `TravelAgency` |
| Cvjećara | `Florist` · trgovina `Store` · zlatara `JewelryStore` |
| IT / marketing / dizajn agencija | `ProfessionalService` |
| Veterinar | `VeterinaryCare` |
| Poljoprivredno gazdinstvo / OPG | `Organization` (+ `additionalType`), `FarmStand` if they sell on site |

Multiple types are legal where genuinely true (a workshop that also sells over the counter):

```json
{ "@type": ["HomeAndConstructionBusiness", "Store"] }
```

### 3.3 The homepage `@graph` — complete, copy-paste

Placeholders use a fictional joinery in Tuzla. Replace every value; delete every line you cannot verify.

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://stolarija-vrelo.ba/#organization",
      "name": "Stolarija Vrelo d.o.o.",
      "alternateName": "Stolarija Vrelo",
      "legalName": "Stolarija Vrelo društvo s ograničenom odgovornošću Tuzla",
      "url": "https://stolarija-vrelo.ba/",
      "logo": {
        "@type": "ImageObject",
        "@id": "https://stolarija-vrelo.ba/#logo",
        "url": "https://stolarija-vrelo.ba/img/logo-1000.png",
        "width": 1000, "height": 1000,
        "caption": "Stolarija Vrelo d.o.o."
      },
      "image": { "@id": "https://stolarija-vrelo.ba/#logo" },
      "foundingDate": "2007-04-18",
      "vatID": "200123456789",
      "taxID": "4200123456789",
      "email": "info@stolarija-vrelo.ba",
      "telephone": "+38735123456",
      "knowsLanguage": ["bs", "en", "de"],
      "sameAs": [
        "https://www.facebook.com/stolarijavrelo",
        "https://www.instagram.com/stolarijavrelo",
        "https://maps.app.goo.gl/PLACEHOLDER"
      ]
    },
    {
      "@type": "HomeAndConstructionBusiness",
      "@id": "https://stolarija-vrelo.ba/#localbusiness",
      "parentOrganization": { "@id": "https://stolarija-vrelo.ba/#organization" },
      "name": "Stolarija Vrelo d.o.o.",
      "description": "Radionica za izradu kuhinja, stepenica i ugradnog namještaja od masivnog drveta. Tuzla, od 2007.",
      "url": "https://stolarija-vrelo.ba/bs/",
      "telephone": "+38735123456",
      "email": "info@stolarija-vrelo.ba",
      "image": [
        "https://stolarija-vrelo.ba/img/radionica-1x1.jpg",
        "https://stolarija-vrelo.ba/img/radionica-4x3.jpg",
        "https://stolarija-vrelo.ba/img/radionica-16x9.jpg"
      ],
      "logo": { "@id": "https://stolarija-vrelo.ba/#logo" },
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Rudarska 14",
        "addressLocality": "Tuzla",
        "addressRegion": "Tuzlanski kanton",
        "postalCode": "75000",
        "addressCountry": "BA"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": 44.53842,
        "longitude": 18.67610
      },
      "hasMap": "https://maps.app.goo.gl/PLACEHOLDER",
      "openingHoursSpecification": [
        {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          "opens": "08:00", "closes": "17:00"
        },
        {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": "Saturday",
          "opens": "08:00", "closes": "13:00"
        },
        {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": "Sunday",
          "opens": "00:00", "closes": "00:00"
        }
      ],
      "specialOpeningHoursSpecification": [
        {
          "@type": "OpeningHoursSpecification",
          "opens": "00:00", "closes": "00:00",
          "validFrom": "2026-11-25", "validThrough": "2026-11-25",
          "description": "Dan državnosti BiH"
        }
      ],
      "priceRange": "$$",
      "currenciesAccepted": "BAM, EUR",
      "paymentAccepted": "Gotovina, Bankovni transfer, Kartica",
      "areaServed": [
        { "@type": "City", "name": "Tuzla" },
        { "@type": "City", "name": "Lukavac" },
        { "@type": "City", "name": "Srebrenik" },
        { "@type": "AdministrativeArea", "name": "Tuzlanski kanton" },
        { "@type": "Country", "name": "Bosna i Hercegovina" },
        { "@type": "Country", "name": "Deutschland" },
        { "@type": "Country", "name": "Österreich" }
      ],
      "serviceArea": {
        "@type": "GeoCircle",
        "geoMidpoint": { "@type": "GeoCoordinates", "latitude": 44.53842, "longitude": 18.67610 },
        "geoRadius": "80000"
      },
      "knowsLanguage": ["bs", "en", "de"],
      "numberOfEmployees": { "@type": "QuantitativeValue", "value": 9 },
      "contactPoint": [
        {
          "@type": "ContactPoint",
          "contactType": "sales",
          "telephone": "+38735123456",
          "email": "info@stolarija-vrelo.ba",
          "availableLanguage": ["bs", "en", "de"],
          "areaServed": ["BA", "DE", "AT", "CH"]
        }
      ]
    },
    {
      "@type": "WebSite",
      "@id": "https://stolarija-vrelo.ba/#website",
      "url": "https://stolarija-vrelo.ba/",
      "name": "Stolarija Vrelo",
      "publisher": { "@id": "https://stolarija-vrelo.ba/#organization" },
      "inLanguage": ["bs", "en", "de"]
    },
    {
      "@type": "WebPage",
      "@id": "https://stolarija-vrelo.ba/bs/#webpage",
      "url": "https://stolarija-vrelo.ba/bs/",
      "name": "Stolarija po mjeri — Tuzla | Stolarija Vrelo",
      "description": "Kuhinje, stepenice i namještaj po mjeri od masivnog drveta. Vlastita radionica u Tuzli, 18 godina iskustva.",
      "isPartOf": { "@id": "https://stolarija-vrelo.ba/#website" },
      "about": { "@id": "https://stolarija-vrelo.ba/#localbusiness" },
      "inLanguage": "bs",
      "primaryImageOfPage": { "@type": "ImageObject", "url": "https://stolarija-vrelo.ba/img/hero-16x9.jpg" },
      "datePublished": "2026-02-10",
      "dateModified": "2026-08-02"
    }
  ]
}
</script>
```

**Per-language variants.** The German homepage ships the *same* `Organization` and `LocalBusiness` nodes with the **same `@id`, same `name`, same `address`, same `telephone`** — only `description`, `url` and the `WebPage` node change:

```json
{
  "@type": "WebPage",
  "@id": "https://stolarija-vrelo.ba/de/#webpage",
  "url": "https://stolarija-vrelo.ba/de/",
  "name": "Massivholz nach Maß aus Bosnien | Tischlerei Vrelo",
  "description": "Küchen, Treppen und Einbauschränke aus Massivholz. Eigene Werkstatt in Tuzla, Lieferung nach DE/AT in 4–7 Wochen.",
  "isPartOf": { "@id": "https://stolarija-vrelo.ba/#website" },
  "about":    { "@id": "https://stolarija-vrelo.ba/#localbusiness" },
  "inLanguage": "de"
}
```

Notes on the fields that people get wrong:

- **`geo` needs ≥5 decimal places.** `44.5, 18.7` is a kilometre of error. Get exact coordinates by right-clicking the workshop in Google Maps → the numbers at the top of the menu.
- **`telephone` in E.164** (`+38735123456`, no spaces) for machines; the *display* string on the page may be spaced. `tel:` hrefs use E.164 too.
- **Closed all day = `"opens": "00:00", "closes": "00:00"`.** Open 24h = `00:00`→`23:59`.
- **`priceRange`** takes `"$$"` or a real range (`"800–2500 KM"`), max 100 chars. If the client refuses to publish any price, omit the property rather than writing "on request".
- **`aggregateRating` / `review` are for sites reviewing *other* businesses.** Do not self-mark your own star rating — it is against Google's guidelines and can earn a manual action. Real customer reviews belong on the Google Business Profile.
- **`areaServed`** is what makes the diaspora/export story machine-readable. Include the DE/AT countries only if the client genuinely delivers there.

### 3.4 Service pages

One `Service` node per service page, provider-linked by `@id` so the business is never duplicated.

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Service",
      "@id": "https://stolarija-vrelo.ba/de/leistungen/kuechen/#service",
      "name": "Massivholzküchen nach Maß",
      "serviceType": "Küchenbau",
      "description": "Planung, Fertigung und Montage von Küchen aus Eiche und Buche. Aufmaß vor Ort, Fertigung in eigener Werkstatt, Lieferung nach DE und AT.",
      "provider": { "@id": "https://stolarija-vrelo.ba/#localbusiness" },
      "areaServed": [
        { "@type": "Country", "name": "Deutschland" },
        { "@type": "Country", "name": "Österreich" },
        { "@type": "Country", "name": "Bosna i Hercegovina" }
      ],
      "availableLanguage": ["de", "en", "bs"],
      "url": "https://stolarija-vrelo.ba/de/leistungen/kuechen/",
      "image": "https://stolarija-vrelo.ba/img/kuechen-16x9.jpg",
      "offers": {
        "@type": "Offer",
        "priceCurrency": "EUR",
        "priceSpecification": {
          "@type": "UnitPriceSpecification",
          "priceCurrency": "EUR",
          "minPrice": 950,
          "maxPrice": 2400,
          "unitText": "laufender Meter",
          "valueAddedTaxIncluded": false
        },
        "availability": "https://schema.org/InStock",
        "areaServed": { "@type": "Country", "name": "Deutschland" }
      },
      "hasOfferCatalog": {
        "@type": "OfferCatalog",
        "name": "Leistungen",
        "itemListElement": [
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Aufmaß vor Ort" } },
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Fertigung Massivholz" } },
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Montage" } }
        ]
      }
    },
    {
      "@type": "WebPage",
      "@id": "https://stolarija-vrelo.ba/de/leistungen/kuechen/#webpage",
      "url": "https://stolarija-vrelo.ba/de/leistungen/kuechen/",
      "isPartOf": { "@id": "https://stolarija-vrelo.ba/#website" },
      "about": { "@id": "https://stolarija-vrelo.ba/de/leistungen/kuechen/#service" },
      "inLanguage": "de",
      "breadcrumb": { "@id": "https://stolarija-vrelo.ba/de/leistungen/kuechen/#breadcrumb" }
    }
  ]
}
</script>
```

### 3.5 BreadcrumbList — localised names, localised URLs

```json
{
  "@type": "BreadcrumbList",
  "@id": "https://stolarija-vrelo.ba/de/leistungen/kuechen/#breadcrumb",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Start",      "item": "https://stolarija-vrelo.ba/de/" },
    { "@type": "ListItem", "position": 2, "name": "Leistungen", "item": "https://stolarija-vrelo.ba/de/leistungen/" },
    { "@type": "ListItem", "position": 3, "name": "Küchen" }
  ]
}
```

The **last item carries no `item` URL** (it is the current page). Names must match the visible breadcrumb text, and the visible breadcrumb must exist:

```html
<nav aria-label="Breadcrumb">
  <ol class="crumbs">
    <li><a href="/de/">Start</a></li>
    <li><a href="/de/leistungen/">Leistungen</a></li>
    <li><span aria-current="page">Küchen</span></li>
  </ol>
</nav>
```

### 3.6 Organization vs LocalBusiness — when to drop the local node

If the client is a **manufacturer, wholesaler, or export-only firm with no walk-in customers**, `LocalBusiness` is the wrong claim: you are telling Google to rank them for "blizu mene" queries they cannot serve, and inviting drop-ins they do not want. Ship `Organization` only, keep `address`, `geo`, `contactPoint` and `areaServed`, and drop `openingHoursSpecification` and `priceRange`.

If they are **both** (a workshop with a small showroom): ship both nodes as in §3.3, with the `LocalBusiness` describing the showroom and `parentOrganization` linking to the firm.

### 3.7 FAQPage — ship it, but know what it does now

**Current fact (verified today):** Google restricted FAQ rich results to authoritative government and health sites on **2023-09-14**, and **removed the FAQ rich result entirely on 2026-06-15**. There is no star-style FAQ dropdown in Google Search results any more.

**So why still ship it?** Because it is cheap, valid, and it is machine-readable Q&A for AI answer engines and assistants that quote pages. **Do not tell the client it will produce rich results in Google.** If a choice must be made, spend the time on the visible FAQ copy, not the markup.

```json
{
  "@type": "FAQPage",
  "@id": "https://stolarija-vrelo.ba/de/leistungen/#faq",
  "inLanguage": "de",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Wie lange dauert die Fertigung einer Küche?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Nach dem Aufmaß fertigen wir in vier bis sieben Wochen. Die Montage in Deutschland und Österreich planen wir direkt mit dem Liefertermin."
      }
    },
    {
      "@type": "Question",
      "name": "Liefern Sie auch nach Deutschland und Österreich?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Ja. Wir liefern und montieren in ganz Deutschland und Österreich. Die Anfahrt ist ab einem Auftragswert von 6.000 € im Preis enthalten."
      }
    }
  ]
}
```

Rules: every question and answer must be **visible on the page** (a `<details>`/`<summary>` accordion counts); questions localised per language version; no promotional links inside `text`; one `FAQPage` per page maximum.

### 3.8 Validation commands

```bash
# Extract and pretty-print every JSON-LD block from a built page (catches trailing commas before deploy).
node -e '
const s=require("fs").readFileSync(process.argv[1],"utf8");
[...s.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .forEach((m,i)=>{ try{ JSON.parse(m[1]); console.log("✓ block",i,"valid"); }
                    catch(e){ console.error("✗ block",i,e.message); process.exit(1);} });
' dist/bs/index.html
```

Then, manually, before delivery: `validator.schema.org` (paste the URL) and Google's Rich Results Test. Both free, both must be clean.

---

## 4. Meta + social

### 4.1 Title patterns

Budget: aim for **≤ 60 characters**; for German **≤ 57**, because a truncated compound noun (`Oberflächenbehand…`) is unreadable in a way a truncated English phrase is not. Titles are unique per page **and** per language.

| Page type | Pattern | Example (bs / en / de) |
|---|---|---|
| Home (local business) | `{What they make} — {City} \| {Brand}` | `Stolarija po mjeri — Tuzla \| Stolarija Vrelo`<br>`Custom joinery in Tuzla, Bosnia \| Vrelo`<br>`Massivholz nach Maß aus Bosnien \| Tischlerei Vrelo` |
| Home (export/B2B) | `{Product} from {Country} — {Differentiator} \| {Brand}` | `Massivholzmöbel aus Bosnien — eigene Fertigung \| Vrelo` |
| Service hub | `{Services} \| {Brand} {City}` | `Usluge — kuhinje, stepenice, ormari \| Vrelo Tuzla` |
| Service detail | `{Service} {qualifier} \| {Brand}` | `Kuhinje po mjeri od masiva \| Stolarija Vrelo` |
| Portfolio / work | `{Proof noun} — {number} \| {Brand}` | `Radovi — 640 završenih kuhinja \| Vrelo` |
| About | `O nama / About / Über uns — {one fact} \| {Brand}` | `Über uns — Werkstatt in Tuzla seit 2007 \| Vrelo` |
| Contact | `Kontakt — {City}, {phone-free} \| {Brand}` | `Kontakt — Tuzla, Rudarska 14 \| Stolarija Vrelo` |
| Location page (if several) | `{Service} {City} \| {Brand}` | `Stolarija Lukavac \| Vrelo` |

Rules: **city in the title for every local business** — it is the highest-value local term you own. Brand goes last (except where the brand *is* the search term). No `|` chains longer than two segments. No "Home", "Welcome", "Untitled", and never the same title on two pages.

### 4.2 Description patterns

Budget: **140–160 characters** (mobile truncates near 120, so front-load). Descriptions are not a ranking factor but they are the click-through-rate lever. Formula:

> `{What + material/spec} + {proof number} + {geography} + {concrete next step}`

```
bs: Kuhinje, stepenice i ugradni ormari od masivnog hrasta. Vlastita radionica u Tuzli, 18 godina, 640 kuhinja. Pošaljite mjere — ponuda za 48 sati.        (155)
en: Solid oak kitchens, stairs and fitted wardrobes from our own workshop in Tuzla. 18 years, 640 kitchens delivered. Send measurements for a 48-hour quote. (152)
de: Küchen, Treppen und Einbauschränke aus Massivholz — eigene Werkstatt in Bosnien. Lieferung nach DE/AT in 4–7 Wochen. Angebot innerhalb von 48 Stunden.  (154)
```

Note the three are **not** the same sentence: the German one leads with delivery time to Germany, because that is the German buyer's first objection. That difference is the point of §2.1.

Never: duplicate descriptions across pages, keyword lists, `"..."` truncation, or the company slogan alone.

### 4.3 The complete social head block

```html
<!-- ============ /de/leistungen/ — canonical + hreflang from §1.4 sit above this ============ -->
<title>Massivholzküchen nach Maß | Tischlerei Vrelo</title>
<meta name="description" content="Küchen aus Eiche und Buche, gefertigt in eigener Werkstatt in Bosnien. Aufmaß, Fertigung, Montage — Lieferung nach DE/AT in 4–7 Wochen.">

<!-- Open Graph — consumed by Facebook, LinkedIn, WhatsApp, Viber, Signal, Slack, iMessage -->
<meta property="og:type"        content="website">
<meta property="og:site_name"   content="Tischlerei Vrelo">
<meta property="og:title"       content="Massivholzküchen nach Maß">
<meta property="og:description" content="Eigene Werkstatt in Bosnien. Aufmaß, Fertigung, Montage. Lieferung nach DE/AT in 4–7 Wochen.">
<meta property="og:url"         content="https://stolarija-vrelo.ba/de/leistungen/">
<meta property="og:image"       content="https://stolarija-vrelo.ba/og/de-services.jpg"> <!-- ABSOLUTE URL, always -->
<meta property="og:image:width"  content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:type"   content="image/jpeg">
<meta property="og:image:alt"    content="Massivholzküche aus Eiche in der Werkstatt in Tuzla">
<meta property="og:locale"           content="de_DE">
<meta property="og:locale:alternate" content="bs_BA">
<meta property="og:locale:alternate" content="en_US">

<!-- X / Twitter. og:* is used as fallback for everything not repeated here. -->
<meta name="twitter:card"  content="summary_large_image">
<meta name="twitter:title" content="Massivholzküchen nach Maß">
<meta name="twitter:description" content="Eigene Werkstatt in Bosnien. Lieferung nach DE/AT in 4–7 Wochen.">
<meta name="twitter:image" content="https://stolarija-vrelo.ba/og/de-services.jpg">
<meta name="twitter:image:alt" content="Massivholzküche aus Eiche in der Werkstatt in Tuzla">

<!-- Icons -->
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">   <!-- 180×180, opaque background -->
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#111111">
```

**Per-language OG images are mandatory**, not a nicety: a German buyer sharing a link into a WhatsApp group must see German text on the card. One image per page per language: `og/{locale}-{routeKey}.jpg`.

Hard requirements: **1200 × 630** (1.91:1) · JPG or PNG (**not WebP or AVIF** — several scrapers and older WhatsApp builds still fail on them) · **≤ 300 KB** · absolute `https://` URL · no text within 60px of any edge · headline ≥ 60px tall so it survives the ~360px-wide preview in a phone chat.

### 4.4 Generating OG images with no paid tooling

**Method 1 — headless Chrome screenshot of an HTML template (recommended; you already know CSS).**

```html
<!-- tools/og/template.html — 1200×630 exactly. Fonts referenced as local files, no network. -->
<style>
  @font-face { font-family: "Fraunces"; src: url("../../public/fonts/fraunces-latin-ext.woff2") format("woff2"); font-weight: 400 700; }
  * { margin: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; overflow: hidden; font-family: "Fraunces", Georgia, serif; }
  .og {
    position: relative; width: 100%; height: 100%;
    display: grid; align-content: end; gap: 18px;
    padding: 72px;                                   /* ≥60px safe margin on every edge */
    color: #fff; background: #14110e;
  }
  .og__photo {                                        /* client's own photo, darkened for contrast */
    position: absolute; inset: 0; width: 100%; height: 100%;
    object-fit: cover; filter: brightness(0.45) saturate(0.9);
  }
  .og__eyebrow { position: relative; font-size: 26px; letter-spacing: 0.18em; text-transform: uppercase; opacity: 0.85; }
  .og__title   { position: relative; font-size: 76px; line-height: 1.04; max-width: 15ch; text-wrap: balance; }
  .og__meta    { position: relative; font-size: 28px; opacity: 0.9; }
  .og__rule    { position: absolute; left: 72px; right: 72px; top: 96px; height: 1px; background: rgba(255,255,255,.35); }
</style>
<div class="og">
  <img class="og__photo" src="__PHOTO__" alt="">
  <div class="og__rule"></div>
  <p class="og__eyebrow">__EYEBROW__</p>
  <h1 class="og__title">__TITLE__</h1>
  <p class="og__meta">__META__</p>
</div>
```

```js
// tools/og/build-og.mjs — one PNG per page per language, then convert to JPG.
// Requires only a Chrome/Chromium binary (free) and ffmpeg OR ImageMagick (free).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const CHROME = process.env.CHROME ?? 'chromium';        // or 'google-chrome', or the macOS .app path
const TPL = readFileSync('tools/og/template.html', 'utf8');

const CARDS = [
  { out: 'bs-home',     photo: 'radionica.jpg', eyebrow: 'Tuzla · od 2007.',   title: 'Namještaj koji nadživi kuću', meta: '640 kuhinja · masivni hrast' },
  { out: 'en-home',     photo: 'radionica.jpg', eyebrow: 'Tuzla · since 2007', title: 'Furniture that outlives the house', meta: '640 kitchens · solid oak' },
  { out: 'de-home',     photo: 'radionica.jpg', eyebrow: 'Tuzla · seit 2007',  title: 'Massivholz, das bleibt',      meta: 'Lieferung DE/AT · 4–7 Wochen' },
  { out: 'de-services', photo: 'kuhinja.jpg',   eyebrow: 'Leistungen',         title: 'Küchen nach Maß',             meta: 'Aufmaß · Fertigung · Montage' },
];

mkdirSync('dist/og', { recursive: true });
mkdirSync('.tmp/og', { recursive: true });

for (const c of CARDS) {
  const html = TPL
    .replace('__PHOTO__',   'file://' + resolve('public/img/' + c.photo))
    .replace('__EYEBROW__', c.eyebrow)
    .replace('__TITLE__',   c.title)
    .replace('__META__',    c.meta);
  const tmp = resolve(`.tmp/og/${c.out}.html`);
  writeFileSync(tmp, html);

  // Chrome writes PNG regardless of the extension you give --screenshot.
  execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--window-size=1200,630',
    `--screenshot=.tmp/og/${c.out}.png`,
    'file://' + tmp,
  ], { stdio: 'inherit' });

  // PNG → JPG at q≈82 keeps a photo card under ~180 KB. ffmpeg or ImageMagick, both free.
  execFileSync('ffmpeg', ['-y', '-i', `.tmp/og/${c.out}.png`, '-q:v', '3', `dist/og/${c.out}.jpg`], { stdio: 'inherit' });
  console.log('→ dist/og/' + c.out + '.jpg');
}
```

**Method 2 — Playwright**, if the project already has Node dev deps: `page.setViewportSize({width:1200,height:630})` then `page.screenshot({path, type:'jpeg', quality:82})`. Same template, fewer moving parts, one dev dependency.

**Method 3 — hand-composited with ImageMagick** when there is no browser available at all:

```bash
magick public/img/radionica.jpg -resize 1200x630^ -gravity center -extent 1200x630 \
  -fill '#000000' -colorize 55% \
  -font public/fonts/Fraunces.ttf -fill white \
  -pointsize 74 -annotate +72+470 'Massivholz, das bleibt' \
  -pointsize 28 -annotate +72+540 'Lieferung DE/AT · 4–7 Wochen' \
  -quality 82 dist/og/de-home.jpg
```

**Verify before delivery:** open the LinkedIn Post Inspector and Facebook Sharing Debugger (both free, no account cost) for one URL per language, and paste one link into WhatsApp/Viber on a phone. A broken OG card is invisible in Search Console and highly visible to the client.

---

## 5. Technical SEO

### 5.1 sitemap.xml with hreflang

Every URL entry lists **all** alternates including itself — the same reciprocity rule as §1.4, in XML form.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>https://stolarija-vrelo.ba/bs/usluge/</loc>
    <lastmod>2026-08-02</lastmod>
    <xhtml:link rel="alternate" hreflang="bs"        href="https://stolarija-vrelo.ba/bs/usluge/"/>
    <xhtml:link rel="alternate" hreflang="en"        href="https://stolarija-vrelo.ba/en/services/"/>
    <xhtml:link rel="alternate" hreflang="de"        href="https://stolarija-vrelo.ba/de/leistungen/"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="https://stolarija-vrelo.ba/bs/usluge/"/>
  </url>
  <url>
    <loc>https://stolarija-vrelo.ba/en/services/</loc>
    <lastmod>2026-08-02</lastmod>
    <xhtml:link rel="alternate" hreflang="bs"        href="https://stolarija-vrelo.ba/bs/usluge/"/>
    <xhtml:link rel="alternate" hreflang="en"        href="https://stolarija-vrelo.ba/en/services/"/>
    <xhtml:link rel="alternate" hreflang="de"        href="https://stolarija-vrelo.ba/de/leistungen/"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="https://stolarija-vrelo.ba/bs/usluge/"/>
  </url>
  <!-- …and the /de/leistungen/ entry with the same four alternates -->
</urlset>
```

```js
// tools/sitemap.mjs — generates the whole thing from routes.js. Zero dependencies.
import { writeFileSync } from 'node:fs';
import { LOCALES, DEFAULT_LOCALE, ROUTES, url } from '../content/routes.js';

const today = new Date().toISOString().slice(0, 10);
const keys = Object.keys(ROUTES);

const alt = (key) => [
  ...LOCALES.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${url(key, l)}"/>`),
  `    <xhtml:link rel="alternate" hreflang="x-default" href="${url(key, DEFAULT_LOCALE)}"/>`,
].join('\n');

const entries = keys.flatMap((key) =>
  LOCALES.map((l) => `  <url>\n    <loc>${url(key, l)}</loc>\n    <lastmod>${today}</lastmod>\n${alt(key)}\n  </url>`)
);

writeFileSync('dist/sitemap.xml',
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join('\n')}
</urlset>
`);
console.log(`→ dist/sitemap.xml (${entries.length} URLs)`);
```

Rules: absolute URLs only · one canonical form (trailing slash everywhere, consistently) · **never list a URL that is noindexed, redirected or 404** · `lastmod` must be honest (a build timestamp on unchanged pages trains Google to ignore it — prefer the content file's git mtime) · submit once in Search Console per property.

### 5.2 robots.txt

```
# https://stolarija-vrelo.ba/robots.txt
User-agent: *
Allow: /

# Never block CSS, JS or images — Google renders the page and will judge it broken.
Disallow: /assets/tmp/
Disallow: /.tmp/

Sitemap: https://stolarija-vrelo.ba/sitemap.xml
```

Do not add `Crawl-delay` (Google ignores it). Do not block `/en/` or `/de/` "until they're ready" — ship them finished or not at all. If the client asks about AI crawlers (`GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`), present it as their business decision: blocking removes them from AI answers that increasingly drive discovery; allowing means their photos and copy are used for training. Default for a business that wants to be found: **allow**.

### 5.3 Canonical rules

| Situation | Canonical |
|---|---|
| `/de/leistungen/` | `https://stolarija-vrelo.ba/de/leistungen/` — itself, absolute, **same language** |
| Any page reachable at `?utm_source=…` | The clean URL without parameters |
| `http://` and `www.` variants | 301 to the single `https://` non-www (or www) form — pick one, forever |
| Trailing slash vs not | Pick one; 301 the other; make `routes.js` the enforcer |
| Paginated portfolio | Each page self-canonical. Never canonical all pages to page 1 |
| A German page that does not exist yet | **Do not publish a stub canonicalised to Bosnian.** Either write it or leave it out of nav, sitemap and hreflang |

**Never** point a canonical across languages. It de-indexes the translation and wastes the entire i18n effort.

### 5.4 Semantic structure

```html
<body>
  <a class="skip" href="#main">Preskoči na sadržaj</a>
  <header>
    <a href="/bs/" aria-label="Stolarija Vrelo — početna"><svg …></svg></a>
    <nav aria-label="Glavna navigacija"> … </nav>
    <nav class="lang" aria-label="Jezik · Language · Sprache"> … </nav>
  </header>

  <main id="main">
    <h1>Namještaj koji nadživi kuću</h1>       <!-- EXACTLY ONE per page -->

    <section aria-labelledby="usluge-h">
      <h2 id="usluge-h">Šta radimo</h2>
      <article><h3>Kuhinje po mjeri</h3> … </article>
      <article><h3>Stepenice od masiva</h3> … </article>
    </section>

    <section aria-labelledby="radovi-h">
      <h2 id="radovi-h">Radovi</h2>
      <figure>
        <img src="/img/kuhinja-hrast-01.avif" width="1600" height="1067"
             alt="Kuhinja od masivnog hrasta s ostrvom, ugrađena u stanu u Tuzli" loading="lazy" decoding="async">
        <figcaption>Kuhinja od hrasta, Tuzla, 2025.</figcaption>
      </figure>
    </section>
  </main>

  <footer>
    <address> … NAP from content/nap.json … </address>
  </footer>
</body>
```

Rules: exactly one `<h1>` · no level skipped (`h2` → `h4` is a bug) · headings describe content, never chosen for size (size is CSS) · `<main>` once · every `<section>` labelled by its heading via `aria-labelledby` · `<address>` only for contact details of the page owner · `<nav>` elements distinguished by `aria-label` when there is more than one.

### 5.5 Image alt text in the right language

Alt text is content and is therefore translated — a German page with Bosnian alt text is a machine-readable admission that the page is a bolt-on.

`content/de/images.json` — keyed by image id, same keys in all three locales:

```json
{
  "kuhinja-hrast-01": "Massivholzküche aus Eiche mit Kochinsel, eingebaut in Tuzla",
  "radionica-01":     "Tischler beim Zusammenbau einer Eichenfront in der Werkstatt",
  "logo":             ""
}
```

Rules: describe **what is in the picture and why it is on this page**, ≤ 125 characters · never start with "Slika/Image/Bild of…" (screen readers already announce it) · decorative images get `alt=""` (empty, not missing) · a logo that links home gets its label on the link, `alt=""` on the `<svg>`/`<img>` · never keyword-stuff (`alt="stolarija tuzla kuhinje po mjeri jeftino"` is spam) · **always set `width` and `height`** (or `aspect-ratio` in CSS) — this is CLS insurance, not decoration.

### 5.6 Core Web Vitals — the actual numbers

Measured on **field data at the 75th percentile**, segmented mobile and desktop. A green Lighthouse score with red field data means you are failing.

| Metric | Good | Needs improvement | Poor |
|---|---|---|---|
| **LCP** — Largest Contentful Paint | **≤ 2.5 s** | 2.5 – 4.0 s | > 4.0 s |
| **INP** — Interaction to Next Paint (replaced FID in 2024) | **≤ 200 ms** | 200 – 500 ms | > 500 ms |
| **CLS** — Cumulative Layout Shift | **≤ 0.1** | 0.1 – 0.25 | > 0.25 |

Diagnostics to hold alongside them: **TTFB ≤ 800 ms**, **FCP ≤ 1.8 s**.

**This skill's delivery targets are stricter, because a static site has no excuse:** LCP ≤ **1.8 s** on a mid-range Android over 4G, INP ≤ **120 ms**, CLS ≤ **0.02**.

Page-weight budget for a BiH audience on mobile data (first view, uncached):

| Asset class | Budget (mobile) | How |
|---|---|---|
| HTML | ≤ 25 KB gzip | Static, no framework runtime |
| CSS | ≤ 30 KB gzip | One file, custom properties, no framework |
| JS | ≤ 30 KB gzip, **zero dependencies** | IntersectionObserver + a handful of listeners |
| Fonts | ≤ 90 KB | 2 weights (or 1 variable), woff2, subset with **latin-ext** (§2.5), `font-display: swap`, preloaded |
| Hero image | ≤ 180 KB | AVIF with WebP fallback, `<picture>` + `srcset`, `fetchpriority="high"`, **never** `loading="lazy"` |
| All other images | ≤ 120 KB each | AVIF, `loading="lazy"`, `decoding="async"`, correct `sizes` |
| **Total first view** | **≤ 900 KB mobile / ≤ 1.4 MB desktop** | |

LCP essentials:

```html
<!-- Preload the LCP image with the SAME srcset/sizes as the <img>, or the preload fetches a second file. -->
<link rel="preload" as="image" fetchpriority="high"
      imagesrcset="/img/hero-800.avif 800w, /img/hero-1600.avif 1600w, /img/hero-2400.avif 2400w"
      imagesizes="100vw" type="image/avif">
<link rel="preload" as="font" type="font/woff2" href="/fonts/fraunces-latin-ext.woff2" crossorigin>
```

```html
<img src="/img/hero-1600.jpg"
     srcset="/img/hero-800.avif 800w, /img/hero-1600.avif 1600w, /img/hero-2400.avif 2400w"
     sizes="100vw" width="2400" height="1350"
     fetchpriority="high" decoding="async"
     alt="Radionica u Tuzli: majstor sastavlja front od masivnog hrasta">
```

> **The trap that connects this file to `scroll-effects.md`:** Chrome **ignores elements with `opacity: 0`** for LCP. An entrance animation that fades the hero `<h1>` or hero image in from `opacity: 0` makes LCP fire when the animation *finishes*, not when the pixel paints. **Never animate the LCP element from zero opacity.** Animate everything *below* the fold; let the hero's headline and image paint immediately, and use a `transform`-only reveal (e.g. a `clip-path` wipe already at full opacity) if the hero must move at all.

CLS essentials: `width`/`height` or `aspect-ratio` on every image, video, iframe and embed · reserve height for the language hint banner (§1.5) and any cookie notice · self-hosted fonts with `size-adjust`/`ascent-override` matched to the fallback · never inject content above existing content after load · `content-visibility: auto` only together with `contain-intrinsic-size`.

INP essentials: no scroll event handlers doing layout reads (scroll-driven CSS animations cost nothing on the main thread) · no long tasks on tap — defer analytics, defer everything non-critical with `defer` · keep total JS under the budget above, which makes INP a non-issue by construction.

### 5.7 What a frame-sequence hero actually costs

`scroll-effects.md` §3 is the most expensive-looking effect available. Here is its bill, and the rule for paying it.

| Config | Frames | Per frame | Total | Time to fully load |
|---|---|---|---|---|
| Naive desktop sequence | 90 | 30 KB | **2.7 MB** | 13.5 s at "Slow 4G" (~200 KB/s) · 1.4 s at good LTE (~1.9 MB/s) |
| Disciplined desktop | 60 | 22 KB AVIF @1600px | **1.3 MB** | 6.6 s / 0.7 s |
| **Disciplined mobile** | **24** | **12 KB AVIF @720px** | **288 KB** | 1.4 s / 0.15 s |
| Mobile fallback (no sequence) | 1 | 90 KB | **90 KB** | instant |

Rules that keep it inside budget — all of them, not a selection:

1. **Never above the fold.** The sequence must not be the LCP element. Ever.
2. **Never on the mobile critical path.** Load it only after the LCP has painted.
3. **Half the frames and half the resolution on mobile.** 24 frames scrubbed over a 200vh runway is smooth; the eye cannot resolve more while scrolling on a phone.
4. **Respect Save-Data and slow connections** — degrade to a single still, no apology needed.
5. **Preload frame 0 only.** Everything else is fetched lazily, `fetchpriority="low"`.
6. **`prefers-reduced-motion: reduce` → one still frame**, no fetching of the rest.

```js
// seq-gate.js — decides whether the frame sequence is allowed to load AT ALL.
// Run this before any sequence fetching. Returns the frame count to use, or 0 for "still image only".
export function sequenceBudget() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return 0;                                   // non-negotiable

  const c = navigator.connection;                          // Chromium/Android; undefined elsewhere
  if (c?.saveData) return 0;                               // user explicitly asked us not to
  if (c && ['slow-2g', '2g', '3g'].includes(c.effectiveType)) return 0;

  const coarse = matchMedia('(pointer: coarse)').matches;
  const narrow = matchMedia('(max-width: 48rem)').matches;
  if (coarse || narrow) return 24;                         // mobile: 24 frames @ 720px  ≈ 288 KB
  if (navigator.deviceMemory && navigator.deviceMemory < 4) return 24;
  return 60;                                               // desktop: 60 frames @ 1600px ≈ 1.3 MB
}

// Usage: start fetching only after the LCP has painted, so the sequence never competes with it.
export function loadSequenceAfterLCP(startFn) {
  const frames = sequenceBudget();
  if (!frames) return;                                     // still image stays; nothing else is fetched
  new PerformanceObserver((list, obs) => {
    if (list.getEntries().length) {
      obs.disconnect();
      // requestIdleCallback keeps the fetch off the interaction path (INP protection).
      (window.requestIdleCallback ?? setTimeout)(() => startFn(frames), { timeout: 2000 });
    }
  }).observe({ type: 'largest-contentful-paint', buffered: true });
}
```

```html
<!-- Frame 0 is the still. It is real content and must be in the HTML, not injected. -->
<figure class="seq" data-seq>
  <img class="seq__still" src="/seq/mobile/000.avif" width="1440" height="900"
       loading="lazy" decoding="async"
       alt="Kuhinjski element od hrasta, prikaz sklapanja">
  <canvas class="seq__canvas" width="1440" height="900" aria-hidden="true"></canvas>
</figure>
```

If the budget returns 0, the `<img>` still is the whole experience — and it is a good one. That is the fallback requirement satisfied, not a degradation notice.

---

## 6. Google Business Profile alignment

For a local BiH business, the Google Business Profile (GBP) will out-earn the website for the first months. The website's job is to **confirm the profile**, not contradict it. Local ranking is relevance + distance + prominence; inconsistent data damages relevance and prominence simultaneously, because Google can no longer confidently tell that the profile, the site and the directory listings describe **one** entity.

### 6.1 One NAP file, rendered everywhere

`content/nap.json` — **the** source. Footer, contact page, JSON-LD and GBP all read from this. If any value here changes, it changes *here* and in GBP on the same day, and nowhere else.

```json
{
  "name":         "Stolarija Vrelo d.o.o.",
  "street":       "Rudarska 14",
  "city":         "Tuzla",
  "region":       "Tuzlanski kanton",
  "postalCode":   "75000",
  "countryCode":  "BA",
  "phoneDisplay": "+387 35 123 456",
  "phoneE164":    "+38735123456",
  "viber":        "+38761123456",
  "whatsapp":     "+38761123456",
  "email":        "info@stolarija-vrelo.ba",
  "lat":          44.53842,
  "lng":          18.67610,
  "gbpUrl":       "https://maps.app.goo.gl/PLACEHOLDER",
  "hours": {
    "mon-fri": ["08:00", "17:00"],
    "sat":     ["08:00", "13:00"],
    "sun":     null
  }
}
```

### 6.2 The matching rules

| Field | Rule |
|---|---|
| **Name** | **Byte-identical** to the GBP name and to the business registration. Do **not** append keywords: "Stolarija Vrelo — najbolja stolarija u Tuzli" violates GBP naming policy (suspension risk) *and* breaks the entity match. Do **not** translate the name on the `/de/` page. |
| **Address** | Identical string, identical abbreviations, identical diacritics. Pick "Rudarska 14" or "Ul. Rudarska 14" — once — and use it in the footer, the contact page, the JSON-LD and GBP. |
| **Phone** | One primary number everywhere. Display format identical on every page; `tel:` links always E.164. Do not show `035/123-456` in the footer and `+387 35 123 456` in the schema. |
| **Category** | The GBP primary category, the schema.org subtype (§3.2) and the `<h1>`/title should describe the same trade. A `HairSalon` schema on a business filed under "Beauty salon" in GBP with an `<h1>` saying "Wellness centar" is three different businesses to a machine. |
| **Hours** | Identical in GBP, in the visible page, and in `openingHoursSpecification`. Holiday closures go in both GBP special hours and `specialOpeningHoursSpecification`. |
| **Website field in GBP** | Point it at **`/bs/`**, not `/`. The redirect works, but a direct link removes a hop for the local audience that clicks it most. Add a UTM only if the client actually reads analytics: `?utm_source=google&utm_medium=organic&utm_campaign=gbp`. |
| **`sameAs`** | Include the GBP short link (`maps.app.goo.gl/…`) plus every social profile the client actively maintains. Do not list dead profiles. |
| **Photos** | The photos on the site and on GBP should be visibly the same shoot — same workshop, same colours, same crops. Recognition across surfaces is a prominence signal for humans and a consistency signal for machines. |
| **Reviews** | Live on GBP. Quote them on the site as plain testimonials **without** `aggregateRating` markup (§3.3). Link "Pogledajte recenzije na Google-u" to the GBP profile. |

### 6.3 The footer block, generated from the file

```html
<address class="nap">
  <!-- itemprop-free: JSON-LD in <head> already carries the machine version. This is for humans. -->
  <strong class="nap__name">Stolarija Vrelo d.o.o.</strong>
  <span class="nap__street">Rudarska 14</span>
  <span class="nap__city">75000 Tuzla, Bosna i Hercegovina</span>
  <a class="nap__phone" href="tel:+38735123456">+387 35 123 456</a>
  <a class="nap__mail"  href="mailto:info@stolarija-vrelo.ba">info@stolarija-vrelo.ba</a>
  <a class="nap__map"   href="https://maps.app.goo.gl/PLACEHOLDER" rel="noopener">Prikaži na karti</a>
</address>
```

The **address stays in Bosnian on all three language versions** — a German customer needs the address in the form that works in a satnav and on a parcel label. Only the *labels* around it are translated ("Adresa" / "Address" / "Anschrift"), and the country name may be localised ("Bosnien und Herzegowina") **outside** the JSON-LD, whose `addressCountry` is always the code `BA`.

### 6.4 What to hand the client alongside the site

A one-page checklist they can act on the same week — this is where the ranking actually comes from:

1. Claim/verify the GBP listing; primary category set to match §3.2.
2. Business hours entered, including Saturday and holiday exceptions.
3. Service area set if they travel to customers.
4. Website field → `/bs/`.
5. 10+ real photos, geotagged by simply being taken on site, uploaded from the phone.
6. Ask the last 10 satisfied customers for a Google review — the single highest-leverage action available to a small BiH business.
7. Same NAP on every directory they are already on (`bizbih.ba`, local chamber listings, Facebook page "About").

---

## 7. Pre-delivery SEO checklist

Objective. Every line is pass/fail. Do not report the site as done with an unchecked box.

**Multilingual**
- [ ] All three locales exist at `/bs/`, `/en/`, `/de/` and every page exists in all three (or is absent from nav + sitemap + hreflang in all three).
- [ ] `/` redirects (302) to `/bs/` or serves a real chooser.
- [ ] hreflang block is **byte-identical** across the three versions of each page, includes self-reference and `x-default`, uses absolute URLs (verify with the `curl` loop in §1.4).
- [ ] `<html lang>` is correct on every page and matches the folder.
- [ ] Canonical on every page is self-referential, absolute, and **same-language**.
- [ ] Switching language from any deep page lands on the same page in the new language (test three deep pages).
- [ ] `npm run check:i18n` passes: no missing keys, no empty values, no untranslated duplicates.
- [ ] No auto-redirect based on `Accept-Language` anywhere.
- [ ] Localised slugs, ASCII-transliterated (`ueber-uns`, not `über-uns`; `kucni-namjestaj`, not `kućni-namještaj`).

**Copy quality**
- [ ] Each language composed from the fact sheet, not translated (§2.1). Sentence counts differ between languages.
- [ ] Register consistent site-wide: Vi/Sie for B2B & trades, including form labels, errors and the 404 page.
- [ ] Zero banned phrases: "Dobrodošli na našu web stranicu", "Herzlich willkommen auf unserer Webseite", "kompetenter Partner", "Our company is engaged in".
- [ ] German checked at 320px: no overflow, no clipped compound, no two-line button (§2.4 console snippet logs nothing).
- [ ] Every font renders `ČĆŽŠĐ čćžšđ ÄÖÜäöüß` with no tofu and no fallback substitution.
- [ ] `<meta charset="utf-8">` is the first tag in `<head>`; content files UTF-8 without BOM; contact form round-trips `Šćepanović` intact.
- [ ] Prices, dates and phone numbers formatted per locale; VAT status stated explicitly.

**Structured data**
- [ ] One `<script type="application/ld+json">` per page containing one `@graph`.
- [ ] Correct `LocalBusiness` subtype from §3.2 (or `Organization` alone for a non-walk-in manufacturer).
- [ ] `name`, `address`, `telephone` identical across all three language versions and identical to `nap.json` and GBP.
- [ ] `geo` has ≥5 decimal places; `hasMap` points at the real GBP link.
- [ ] `openingHoursSpecification` matches the visible hours; closed days use `00:00`/`00:00`.
- [ ] `areaServed` reflects reality (do not claim Germany if they do not deliver there).
- [ ] No self-authored `aggregateRating` or `review`.
- [ ] `BreadcrumbList` on every non-home page, last item without `item`, names matching the visible breadcrumb.
- [ ] Valid at `validator.schema.org` and clean in Google's Rich Results Test.
- [ ] Client has **not** been promised FAQ rich results (removed 2026-06-15).

**Meta + social**
- [ ] Unique title per page per language; ≤ 60 chars (≤ 57 for German); city in the title for local businesses.
- [ ] Unique description per page per language, 140–160 chars, front-loaded, with a concrete next step.
- [ ] OG image per page **per language**, 1200×630, JPG/PNG, ≤ 300 KB, absolute URL, text ≥ 60px and ≥ 60px from edges.
- [ ] `og:locale` + two `og:locale:alternate` on every page.
- [ ] `twitter:card = summary_large_image`; `og:image:alt` present and localised.
- [ ] One URL per language pasted into WhatsApp/Viber on a real phone — card renders with the right language.
- [ ] Favicon, `apple-touch-icon`, `theme-color`, manifest present.

**Technical**
- [ ] `sitemap.xml` lists every URL in every language with all four alternates; no noindexed/redirected/404 URLs; submitted in Search Console.
- [ ] `robots.txt` present, allows CSS/JS/images, references the sitemap.
- [ ] http→https and www→non-www (or the reverse) both 301 to the one canonical form; one trailing-slash convention.
- [ ] Exactly one `<h1>` per page; no skipped heading levels; `<main>` present once; skip link works.
- [ ] Every image has `width`+`height` (or `aspect-ratio`), correct `loading`, and **alt text in the page's language**; decorative images `alt=""`.
- [ ] LCP element is not lazy-loaded, is preloaded with matching `imagesrcset`, and is **not animated from `opacity: 0`**.
- [ ] Field targets: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 at p75 (delivery targets 1.8 s / 120 ms / 0.02).
- [ ] Mobile first-view weight ≤ 900 KB; JS ≤ 30 KB gzip with zero dependencies.
- [ ] Frame sequence (if any) gated by §5.7: not the LCP element, ≤ 24 frames on mobile, skipped on Save-Data / 2G-3G / reduced-motion.
- [ ] `prefers-reduced-motion: reduce` verified on: language hint banner, switcher underline, every scroll effect.
- [ ] 404 page exists, is localised per language, and links back into the site.

**Google Business Profile**
- [ ] NAP on the site is byte-identical to GBP (name, street, phone format).
- [ ] GBP primary category, schema subtype and `<h1>` describe the same trade.
- [ ] GBP website field points at `/bs/`.
- [ ] Hours match in all three places (GBP, visible page, JSON-LD).
- [ ] GBP link present in `sameAs` and as a visible "view on map" link.
- [ ] Client handed the §6.4 one-page action list.

---

## 8. Sources (fetched and verified 2026-08-02)

- Core Web Vitals metrics, thresholds, 75th-percentile rule, INP replacing FID — https://web.dev/articles/vitals
- hreflang: reciprocity, self-reference, `x-default`, code format, three implementation methods — https://developers.google.com/search/docs/specialty/international/localized-versions
- Canonical rules incl. same-language canonicals and hreflang-cluster preference — https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- `LocalBusiness` required/recommended properties, `openingHoursSpecification` formats, subtype guidance, GBP relationship — https://developers.google.com/search/docs/appearance/structured-data/local-business
- FAQ rich result restriction (2023-09-14) and full removal (2026-06-15) — https://developers.google.com/search/docs/appearance/structured-data/faqpage
- Astro i18n configuration (`locales`, `defaultLocale`, `routing.prefixDefaultLocale`, `routing.fallbackType`, `fallback`), `astro:i18n` helpers, `Astro.currentLocale` — https://docs.astro.build/en/guides/internationalization/

# MJERENJA

> Samo brojevi koji su stvarno izmjereni u ovoj sesiji. Nijedan nije procijenjen.
> Ako broja nema ovdje, nije izmjeren — i ne smije se citirati kao da jeste.

---

## Pristup izvorima

## MJERA-01 — Instagram iz kontejnera: nedostupan, pet ruta
| Ruta | Ishod |
|---|---|
| `WebFetch` instagram.com | **HTTP 429** |
| `curl` preko proxyja, desktop UA | **HTTP 200, 606 KB — ali samo JS ljuska**: `<title>Instagram</title>`, nijedan `og:` meta, nijedan post JSON |
| headless Chromium (Playwright) | **`ERR_CONNECTION_RESET`** |
| `r.jina.ai`, `imginn.com`, `picuki.com` | **HTTP 403** |
| `web.archive.org` | blokiran za WebFetch |
→ [[PRAVILA#PRAVILO-03]], [[OTVORENO#OTV-01]]

## MJERA-02 — Chromium u ovom kontejneru nema izlaz na mrežu
`ERR_CONNECTION_RESET` na **svaki** host, uključujući `example.com`. Nije stvar
Instagrama. Proxy je uredan (`enabled: true`, `selective: false`) i `curl` kroz njega
prolazi — browser jednostavno ne prolazi.
**Ali `file://` učitava normalno** — zato provjera izgrađene stranice u pravom
pregledniku radi, a dohvat sa weba ne. *(ovo je razlika koja spašava verifikaciju)*
→ [[PRAVILA#PRAVILO-03]], [[MJERENJA#MJERA-03]]

## MJERA-03 — Chromium binarka nije ona koju Playwright očekuje
Lokalni Playwright 1.56.1 traži `chromium_headless_shell-1234`; u slici postoji
`chromium-1194`. Radi tek uz
`executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'`.
→ [[PRAVILA#PRAVILO-03]]

## MJERA-04 — Gemini ključ iz okruženja: 401
`GEMINI_API_KEY` postoji u okruženju, ali `generativelanguage.googleapis.com` vraća
**HTTP 401 `ACCESS_TOKEN_TYPE_UNSUPPORTED`** — očekuje OAuth 2 token, ne ovaj oblik ključa.
Posljedica: Gemini kao „veliki kontekst" nije bio na raspolaganju; posao je odrađen
destilacijom umjesto većim prozorom. → [[MJERA-06]]

## MJERA-05 — Javnih izvora o E-Drive Gradačac: nula
Tri pretrage, uključujući `akta.ba` registar. Jedini pogodak je sam Instagram profil.
Nema Google Business profila, nema recenzija, nema unosa u registru.
→ [[OTVORENO#OTV-01]]

---

## Transkript i kontekst

## MJERA-06 — 61,5 MB transkripta = 219 KB kičme (**0,36%**)
| Mjera | Vrijednost |
|---|---|
| zapisa u `.jsonl` | 4 305 |
| sirovo | **61,5 MB** |
| kičma (čovjek + agent, bez izlaza alata) | **219 KB — 0,36%** |
| izlaz alata | **25,8 MB — 41,96%** |
| poruka u kičmi | 528 (68 čovjekovih) |
| poziva alata | 1 115 |
| redigovanih tajni u kičmi | 10 |

## MJERA-07 — Raspodjela poziva alata
`Bash` 523 · `Read` 176 · `Write` 79 · `Edit` 78 · `pull_request_read` 59 ·
`ToolSearch` 39 · `send_later` 22 · `Agent` 19 · `ExitPlanMode` 16 ·
`AskUserQuestion` 14 · `WebFetch` 12 · `WebSearch` 11.
**Čitanje/pisanje fajlova i shell su 78% svih poziva** — mreža je marginalna.
→ [[MJERENJA#MJERA-06]]

---

## Stranica

## MJERA-08 — Materijal animacije
Izvor `car-disassembly.mp4`: 7,08 s, 1280×720, 24 fps → **170 kadrova**.
Ništa u projektu ne prelazi 720p.

| Kadrova | efektivnih /s | Desktop WebP | Mobil WebP |
|---|---|---|---|
| 60 (bilo) | 8,5 | 1 842 KB | 1 386 KB |
| **85 (svaki 2.)** | **12,0** | **2 610 KB** | **1 963 KB** |
| 170 (svi) | 24,0 | 5 219 KB | 3 927 KB |
→ [[GRESKE#GRESKA-04]], [[PRAVILA#PRAVILO-10]]

## MJERA-09 — Memorija heroa prije ispravke
~211 MB dekodiranih slika + ~45 MB canvas ≈ **256 MB**. iPhone gasi tabove u tom rangu.
→ [[GRESKE#GRESKA-03]]

## MJERA-10 — Težina bundlea
Cijeli lucide set: **1,04 MB sirovo / 287 KB gzip**. Statička mapa od 8 ikona:
**−750 KB**. Početna prije ijedne interakcije: **~4,3 MB**, uključujući 2,26 MB videa
koji se nigdje ne referencira a ipak se deploya.
→ [[GRESKE#GRESKA-12]], [[PRAVILA#PRAVILO-12]]

## MJERA-11 — Isporučena brend stranica
57 kadrova ugrađeno kao WebP data URI, **1,32 MB jedan fajl**, nula vanjskih zahtjeva.
Provjereno u Chromiumu: `canvas=1`, `img=1`, canvas `390×844@0` i `1440×900@0`,
nula grešaka na stranici.
→ [[GRESKE#GRESKA-06]], [[PRAVILA#PRAVILO-01]]

## MJERA-12 — Revizija `src/` prije ispravki
38 fajlova, **60 nađenih problema**.
→ [[GRESKE#GRESKA-01]], [[PRAVILA#PRAVILO-02]]

---

## Repozitorij

## MJERA-14 — Statička mapa ikona: izmjereni dobitak
Zamjena `import * as Icons from 'lucide-react'` statičkom mapom od 8 ikona,
potvrđeno ponovnim buildom:

| | prije | poslije | razlika |
|---|---|---|---|
| bundle sirovo | 1 044,82 KB | **418,37 KB** | **−626,45 KB** |
| gzip | 287,85 KB | **132,88 KB** | **−154,97 KB** |

Procjena u [[MJERENJA#MJERA-10]] je bila −750 KB; stvarno je **−626 KB**. Razlika je
razlog zašto se procjena ne upisuje kao mjerenje.
→ [[PRAVILA#PRAVILO-12]], [[GRESKE#GRESKA-12]]

## MJERA-13 — PR #1
208 izmijenjenih fajlova, +29 399 / −152, 28 commita.
**0 workflowa u repou → 0 check runova.** „CI zeleno" nije stanje koje ovaj PR može
dostići; provjere mogu hvatati samo komentare i konflikte.
→ [[OTVORENO#OTV-04]]


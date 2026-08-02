# E-Drive — samostalne stranice

Dvije statične stranice za Autoelektrika E-Drive, Gradačac. Nisu dio React aplikacije
u `src/` — svaka je **jedan HTML fajl bez ijednog vanjskog zahtjeva**: frame-ovi,
slike i skripte su ugrađeni kao `data:` URI. Otvaraju se dvoklikom, hostaju se bilo gdje,
nemaju mjesečni trošak.

| Fajl | Šta je |
|---|---|
| `edrive-brend.html` | brend stranica — jedna animacija rasklapanja preko cijelog prozora, boksovi s iskočnim prozorom, prije/poslije, bez cijena |
| `edrive-kontakt.html` | kontakt stranica — ulaz preko simptoma, bez animacije |

## Regeneracija

Generatori su izvor istine; HTML je njihov izlaz. Ne uređuj HTML rukom.

```bash
npm i sharp playwright        # nisu u package.json — trebaju samo za ovaj build
node site/edrive/gen-brand.mjs
node site/edrive/gen-kontakt.mjs
```

`frames/` sadrži 57 izvornih kadrova rasklapanja (JPEG). `gen-brand.mjs` ih skalira na
880×495 WebP i ugrađuje u HTML.

## Provjera u pregledniku

```bash
mkdir -p site/edrive/shots
node site/edrive/shot-brend.mjs
```

Snima 390×844 i 1440×900 na skrolu 0 / .33 / .66 / 1.0 u `shots/`, i ispisuje broj
canvasa i grešaka. **Očekivano: `canvas=1`** — na stranici je jedna animacija i jedan auto.
Ako ih ikad bude dvije, nešto je duplirano.

Napomena: headless Chromium u ovom kontejneru nema izlaz na internet, ali `file://`
učitava normalno — zato provjera radi, a dohvat sa weba ne.

## Kontakt podaci

U `gen-brand.mjs` postoji **jedno** mjesto istine:

```js
const PHONE = null;   // npr. '+38761123456'
```

Dok je `null`, svako dugme (nav, hero, iskočni prozor, podnožje) vodi na Instagram —
jedini kanal za koji je potvrđeno da postoji. Upiši pravi broj i cijela stranica se
povuče sama; nigdje nema ručno prekucanog broja.

Šta je još neprovjereno na stranici — radno vrijeme, poštanski broj, opisi usluga —
popisano je u `docs/research/edrive-web-kontekst.md`, §9.

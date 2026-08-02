---
name: web-design-build
description: >
  Gradi gotovu stranicu za stvarnog klijenta iz istraživačkog dosjea koji je
  napravio business-web-research. Vezuje istraživanje na dizajn: činjenice iz
  dosjea su jedini dozvoljeni sadržaj, rupe u dosjeu ostaju rupe na stranici.
  Nosi kapije koje su nastale iz stvarnih kvarova — čitljivost, duplikat,
  pokrivenost kadra, jedno mjesto istine za kontakt. Koristi kad postoji
  `<biznis>-web-kontekst.md` i traži se stranica, redizajn ili popravka.
version: 1.0.0
---

# web-design-build — od dosjea do stranice

Ovo nije zamjena za `premium-web`. `premium-web` odlučuje **kako stranica izgleda i
kako se kreće**; ovaj skill odlučuje **šta smije na nju** i **kada je gotova**.

```
business-web-research  →  <biznis>-web-kontekst.md  →  [ OVAJ SKILL ]  →  premium-web  →  isporuka
                              činjenice + rupe          ugovor o ulazu      recept i pokret     kapije
```

---

## 1. Ugovor o ulazu — bez dosjea se ne počinje

Ulaz je `<biznis>-web-kontekst.md`. Ako ga nema, prvo se pokreće
`business-web-research`. Gradnja „na osnovu djelatnosti" je izmišljanje sa dodatnim
korakom.

Iz dosjea se čita i **prenosi doslovno**:

| Sekcija dosjea | Gdje ide na stranici |
|---|---|
| §1 Osnovni podaci | naslov, `<title>`, JSON-LD `LocalBusiness` |
| §2 Kontakt i lokacija | CTA rute, podnožje, mapa, radno vrijeme |
| §3 Usluge | boksovi / sekcija usluga — **imena onako kako ih klijent zove** |
| §5 Društveni dokaz | ocjene i teme pohvala — samo ako postoje |
| §6 Brend | paleta, logo, ton copyja |
| §7 Vizuelni materijal | ulaz u `premium-web` triage (broji se, ne procjenjuje) |
| §9 Preporuke | struktura sekcija i CTA strategija |
| §10 Šta nedostaje | **lista rupa — ovo je kapija ispod** |

### Kapija ulaza
Za svako polje u dosjeu koje piše `„nije nađeno online"` ili `„čeka upload"`,
stranica **ne smije** imati uvjerljivu vrijednost na tom mjestu. Dozvoljeno je:
prazno, vidno označeno kao demo, ili sekcija izostavljena.

**Zabranjeno:** izmisliti radno vrijeme, broj telefona, godinu osnivanja, broj
klijenata, ocjenu. Uvjerljiv placeholder se objavi jer niko ne primijeti da nije
stvaran, i klijent ga pročita na svojoj stranici. → `PRAVILO-02`, `GRESKA-01`

## 2. Kontakt ima jedno mjesto istine

Sve CTA rute izlaze iz jedne konstante, nikad prekucane:

```js
const PHONE = null;                    // upiši kad stigne iz dosjea §2
const IG    = 'https://instagram.com/<handle>';
const CONTACT       = PHONE ? 'tel:' + PHONE : IG;
const CONTACT_ALT   = PHONE ? 'https://wa.me/' + PHONE.replace(/\D/g,'') : IG;
const CONTACT_LABEL = PHONE ? 'Pozovi odmah' : 'Piši nam na Instagramu';
```

Dok je `PHONE` `null`, svako dugme vodi na kanal za koji je **potvrđeno** da postoji.
Kad broj stigne, mijenja se jedna linija i nav, hero, iskočni prozor i podnožje se
povuku sami. → `PRAVILO-08`

## 3. Kapije izlaza — ovo je ono što `premium-web` nema

`premium-web` ima kapije za pomak rasporeda, težinu i reducirani pokret. Sve četiri
greške ispod su **prošle te kapije** i pale tek kad je neko otvorio sliku.

Poslije gradnje, snimi 390×844 i 1440×900 na skrolu `0 / .33 / .66 / 1.0` — i
**otvori svaku sliku**. Zatim provjeri:

### K1 — Duplikat
```bash
# jedan hero = jedan canvas; dva znače da je "unaprijedi" izvedeno kao "dodaj pored"
node shot.mjs | grep -q 'canvas=1'
```
Broji i `<video>`, `<img>` heroje i sekcije sa istim sadržajem. Isti subjekt dva puta
na jednoj stranici je kvar, ne bogatstvo. → `GRESKA-06`, `PRAVILO-05`

### K2 — Pokrivenost kadra
Ako je izvor 16:9 a viewport uspravan, `cover` pokaže ~26% kadra — matematika uredna,
subjekt nevidljiv. Pravilo: **ako bi `cover` pokazao manje od 62% kadra, uklapa se
cijeli kadar** i prihvata traka pozadine.

„Preko cijelog ekrana" i „vidi se cijeli subjekt" su na telefonu fizički nespojivi.
Biraj i **reci naglas** šta si izabrao. → `GRESKA-02`, `PRAVILO-07`

### K3 — Čitljivost teksta nad slikom
Bijeli tekst nad svijetlim subjektom je nevidljiv iako je DOM ispravan. Provjeri na
**svakoj** snimljenoj tački skrola, ne samo na skrolu 0:
- veo mora imati pod pri vrhu i pri dnu, sredina smije biti bistra
- `text-shadow` na naslovu i podnaslovu
- na uspravnom ekranu tekst se diže **iznad** kadra, ne leži na njemu

### K4 — Kolizija kaskade
Traži pravila koja se međusobno gase. Klasičan slučaj: `.foot a{color:#fff}`
(specifičnost 0,1,1) pojede `.bCall{color:var(--deep)}` (0,1,0) → bijelo dugme na
bijeloj podlozi. Grep po bojama nije dovoljan; **dugme se mora vidjeti na slici**.
→ `GRESKA-07`

### K5 — Nevidljivi slojevi ne hvataju dodire
Svaki sloj sa `opacity: 0` ima `pointer-events: none`. Bez toga korisnik tapne sliku
i otvori mu se nasumična sekcija. → `GRESKA-09`

### K6 — Reducirani pokret je stranica, ne ostatak
Uz `prefers-reduced-motion` provjeri da se slojevi ne preklapaju: ono što je bez
skrola besmisleno (koraci sekvence) se **skriva**, ne forsira na `opacity: 1`.
→ `GRESKA-15`

### K7 — Kadrovi bez duplikata
Uzorkovanje kadrova iz videa ide na **cijelom** koraku. Korak 2,83 daje duplikate koje
oko vidi kao zamrzavanje animacije. Provjeri manifest na ponovljene hasheve.
→ `PRAVILO-10`, `GRESKA-04`

## 4. Popravka postojeće stranice

Kad je zadatak „popravi, ne dograđuj":

1. **Prvo utvrdi šta je duplirano.** Traži dva elementa iste svrhe prije bilo čega.
2. **Ne dodavati ništa novo** — ni sekciju, ni efekat, ni copy.
3. Proći K1–K7 i popraviti samo ono što padne.
4. Sve izmišljene podatke sa stranice popisati u dosje §9 kao „ne smije se objaviti
   prije provjere" — brisanje bez zapisa znači da se vrate.

## 5. Isporuka

- Stranica je **jedan samostalan fajl** kad je to demo (data URI, nula vanjskih
  zahtjeva) — otvara se dvoklikom, hostuje bilo gdje, nema mjesečni trošak.
- Generator je izvor istine; HTML je izlaz. **HTML se ne uređuje rukom.**
- Sve što je vrijedno ide u git ili u zip koji ide korisniku. `work/` je često u
  `.gitignore` — tamo napisan dokument nestaje sa kontejnerom. → `PRAVILO-09`

## 6. Veze

- Istraživanje ulaza → `business-web-research`
- Recept, pokret, tipografija, isporuka → `premium-web`
- Trajno znanje i graf → `graphify`, `knowledge/00-NAJVAZNIJE.md`

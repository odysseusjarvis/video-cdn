# premium-web — plan izmjena v2

Nastao iz tri kruga Q/A sa vanjskim recenzentom (Gemini 3.1 Pro, 1M kontekst) koji je
pročitao kompletnu sesiju — 46MB transkripta destilovano na 285k tokena — plus izgrađeni skill.

Podijeljeno u tri kategorije. **C je jednako važna kao A**: sprječava da se djeluje po
samouvjerenoj tvrdnji koja nije tačna.

---

## A — Stvarni defekti, moraju se ispraviti

### A1. Algoritam je slijep za kvalitet ⚠️ najveći

**Problem.** Rutiranje broji materijal ali ga ne ocjenjuje. Klijent sa 2.5 sekunde mutnog
snimka iz ruke u mraku dobija `V ≥ 2.0 → R7` i taj snimak postaje hero — dok njegova
odlična fotografija stoji neiskorištena, jer je pravilo za video iznad pravila za sliku.

**Ispravka.** Gate kvaliteta ulazi u Korak 4, **prije** dodjele SET klase:

| Mjera | Alat | Prag | Posljedica |
|---|---|---|---|
| Oštrina | `sharp` + Laplacian konvolucija `[0,1,0,1,-4,1,0,1,0]` | `stdev < 10` = mutno | slika ispada iz H |
| Veličina subjekta | bounding box alfa kanala nakon `rembg` | `< 800×800` | ispada iz hero, ne iz galerije |
| Bitrate videa | `ffprobe` | `< 2.5 Mbps` = WhatsApp kompresija | gubi V status, degradira na frame-ove |

Mjeri se **subjekt, ne slika** — 4K fotografija gdje auto zauzima 15% kadra nije hero materijal.

### A2. Tiha degradacija u SET-F je poslovni autogol

**Problem.** Ako sve padne na kvalitetu, algoritam bi klijenta bacio u SET-F i isporučio SVG
crtež. Čovjeku koji je poslao 50 slika to znači „tvoj trud ne valja, evo ti crtež". Gubi se
klijent, ne dobija se sajt.

**Ispravka.** Algoritam **STAJE** i traži novi materijal sa uputom koju majstor može ispuniti
iz prve. Bez fotografskog žargona:

> 1. Obriši objektiv na telefonu majicom
> 2. Izađi na dnevno svjetlo ili upali sva svjetla — **bez blica**
> 3. Stavi dio na čist sto ili haubu, skloni alat i krpe iz kadra
> 4. Priđi dok dio ne popuni ekran, dodirni ekran da izoštri
> 5. **Pošalji kao „Dokument"** na Viber/WhatsApp, ne kao sliku

Peta stavka je najvažnija i najlakše se propusti: obje aplikacije komprimuju slike poslane
normalno, a kao dokument prolaze netaknute.

### A3. Korak 10 pa 11 tjera agenta da prepisuje isti fajl

**Problem.** Napiši stranicu bez animacije, pa je u sljedećem koraku prepravi da dodaš pokret.
Prepisivanje fajla od 500+ linija je gdje LLM gubi tagove i halucinira. To je ljudski workflow
nasilno primijenjen na agenta.

**Ispravka.** Jedan prolaz, gdje je **osnovni CSS već finalno vidljivo stanje**:

```css
/* baza = ono što svako vidi, uključujući bez JS-a */
.hero-el { opacity: 1; transform: translateY(0); }

/* pokret je nadogradnja, nikad nosilac */
@media (prefers-reduced-motion: no-preference) {
  @supports (animation-timeline: view()) {
    .hero-el { animation: fade-up linear both; animation-timeline: view(); }
  }
}
```

Cilj koraka 10 — garancija da neanimirano stanje valja — ostaje, ali se **dokazuje mjerenjem
umjesto drugim buildom**: `verify.mjs` otvori istu izgrađenu stranicu drugi put sa
`emulateMedia({ reducedMotion: 'reduce' })` i padne ako H1 ili CTA imaju `opacity: 0` ili nisu
u viewportu.

### A4. Sigurnosni nalaz se prijavio prije nego je istražen

**Problem.** Prijavio sam da je subagent ispitivao kredencijale, pa nastavio dalje. Zapise sam
otvorio tek sat kasnije, kad me vanjski recenzent natjerao. Ishod je bio bezopasan — ali to
sam saznao slučajno, ne procedurom.

**Ispravka.** Pravilo u guardrails: sigurnosni nalaz se **ne prijavljuje dok se ne utvrdi**
(1) tačna vrijednost poslanog podatka — je li maskiran, (2) tačan URL primaoca, (3) HTTP
odgovor. Tek onda odluka o eskalaciji. Prijava bez ovih triju je nagađanje.

---

## B — Poboljšanja

### B1. Astro kao default + Decap CMS

Moj argument za vanilla bio je „klijent može otvoriti u Notepadu i promijeniti broj telefona".
Slabiji je nego što sam mislio — mali biznis ne otvara HTML, nego zove majstora. A custom
`build.mjs` od 90 linija je nedokumentovan SSG koji niko drugi neće razumjeti.

**Bolje rješenje:** Astro + Decap CMS bez backend servera. Sadržaj u `src/content/data.json`,
`/admin` ruta sa OAuth prijavom, klijent mijenja broj telefona kroz interfejs, CMS commituje,
Cloudflare rebuilda. Ne mora znati šta je Node.

Vanilla ostaje samo za jednokratne artefakte i pitch stranicu.

### B2. Prije/poslije ide IZNAD pregiba

Ranija preporuka je bila statična slika iznad pregiba, animacija ispod. To je bilo tačno
**dok se mislilo da nema dobrog materijala**. Kad postoji prije/poslije par, on ide gore:
spržena instalacija koja se prevlačenjem pretvara u uredan snop je krunski dokaz kompetencije
i to se mora vidjeti u prvoj sekundi.

Tehnički je jeftino — dvije slike i CSS maska, bez canvasa i bez frame sekvence — pa ne ruši
LCP kao scrubber. Dugme „Pozovi" ostaje fiksirano preko toga.

### B3. Skill je predebeo za brzo korištenje

12 referenci (~700KB) znači da agent troši veliki dio konteksta na čitanje prije nego išta
uradi. Cilj rezanja: **agent prestaje biti čitač dokumentacije i postaje izvršilac.**

| Fajl | Odluka | Obrazloženje |
|---|---|---|
| `scrubber-component.md` | **briši** | Objašnjava komponentu koja već postoji. Komponenta se dokumentuje kroz JSDoc u sebi. |
| `i18n-seo.md` | **sreži u šablone** | Zadrži copy-paste JSON-LD i hreflang pravila. Izbaci SEO teoriju — agentu ne treba udžbenik. |
| `scroll-effects.md` + `hover-effects.md` | **spoji, zadrži ~6** | Od 31 efekta, lokalni biznisi koriste: mask-wipe, parallax, fade-up, hotspot, stagger, stroke-draw. Ostatak seli u živi katalog kao referenca za biranje, van skilla. |
| `luxury-register.md` | **djelimično** — vidi C3 | |

---

## C — Gdje je recenzent pogriješio

Ovo se **ne ispravlja** jer nije pokvareno. Zapisano da se ne djeluje po tome kasnije.

### C1. „Kredencijali su eksfiltrirani, hitno rotiraj AWS/Cloudflare/GitHub" — netačno

Ocijenjeno kao BLOKER. Provjera transkripata subagenata (`wf_a1efc044-885/agent-*.jsonl`):

- Jedini stvarni mrežni poziv s tokenom → `generativelanguage.googleapis.com`, **HTTP 401**
- Sva odredišta su **first-party** endpointi izdavaoca tokena, nijedno treća strana
- `CLOUDFLARE_API_TOKEN`, `HF_TOKEN`, `REPLICATE_API_TOKEN` — prazni
- Ključevi koji „postoje" prijavljeni kao `len=17`; pravi Pexels ključ ima 56 znakova → maske

Ništa nije procurilo, nema šta rotirati. Recenzent je povukao ocjenu kad je vidio dokaz.
Procesna pouka ostaje kao **A4**.

### C2. „Prihvatio si pali test uz izgovor da je do alata" — netačno

Nije pretpostavka nego mjerenje. Nakon sumnje na smooth-scroll artefakt, ubačen je debug
atribut i očitana stvarna vrijednost motion value:

```
scrollY=300  progress=0.1042  titleOpacity=0.6979
scrollY=500  progress=0.1736  titleOpacity=0.0000
scrollY=2500 progress=0.8681  titleOpacity=0.0000
```

Tek nakon toga uklonjen debug. Recenzent je povukao tačku.

### C3. „Briši luxury-register.md, model to već zna" — samo pola tačno

Apstraktna teorija o whitespace-u i tipografiji jeste u težinama i može ići.

Ali **lista AI-dizajn klišea ostaje** — krem + serif + terakota, ljubičasto-plavi gradijent,
Inter kao „sigurna" opcija, emoji kao oznake sekcija, sve centrirano. To nije znanje koje
model ima kao *zabranu* — to je tačno ono na šta model **sam sklizne** kad nije ograničen.
Sekcija postoji da se to spriječi, pa ostaje.

### C4. „Subagenti su tražili osnovne CSS koncepte koje model već zna" — netačno za verifikaciju

Autorstvo je zaista bilo preskupo i to prihvatam. Ali agenti su **izvršavali u kontejneru** i
našli stvari kojih nema u težinama, a svaka je promijenila odluku:

- GSAP je 100% besplatan od aprila 2025, uključujući plaćene plugine
- ZeroGPU kvota je nula sa datacenter IP-a → cijeli plan generisanja videa pao
- `@squoosh/cli` puca na Node 22 · sistemski `ffmpeg` slomljen u ovom kontejneru
- `rembg` model `bria-rmbg` je **nekomercijalan** · Vercel Hobby zabranjuje komercijalnu upotrebu

Plus je adversarijalni prolaz našao stvarne bugove: skriveni `stroke-dashoffset` izvan
`@supports` (nula piksela na ~16% browsera), `frames.mjs` odbijao legitiman set, path traversal
u preload href-u, poster koji gubi LCP status, cover-fit koji pokazuje 26% kadra na telefonu.

**Podjela koja ostaje:** dokumentaciju piše glavni model iz težina; agenti **samo izvršavaju
i provjeravaju**.

---

## D — Dva paketa umjesto jednog (ispravka moje greške)

Analiza konverzije iznad optimizuje za **jedan** segment: zanatlija kojem trebaju mušterije
sutra. Za njega je scroll hero smetnja i to ostaje tačno.

Ali postoji drugi segment koji sam propustio: **biznis koji već ima mušterije i plaća da
izgleda kao brend.** Tu scroll iskustvo nije ukras nego proizvod — poruka je „nismo više
lokalna radnja". Za njega je jeftina konverzijska stranica premalo, i on to zna.

Skill mora nositi oba, jer se prodaju po različitoj cijeni.

| | **Paket A — Mušterije** | **Paket B — Brend** |
|---|---|---|
| Kome | tek otvorio, treba pozive | ima posao, hoće poziciju |
| Cijena (BiH) | ~300 KM | ~800 KM |
| Stranica | jedna | više + stranica po usluzi |
| Hero | statična slika + telefon | scroll iskustvo preko ekrana |
| Prije/poslije | slika do slike | prevlačenje prstom |
| Jezici | bs | bs / en / de |
| Težina | < 500 KB | < 1.4 MB, klizni prozor |
| Održavanje | statika | Decap CMS |

### Pravilo koje čuva obje cijene

**B sadrži A, ne zamjenjuje ga.** Isti telefon iznad pregiba, isti ulaz preko simptoma, isti
LCP prag. Brend sloj ide **preko** konverzijske kičme, nikad umjesto nje.

Razlog je komercijalan, ne tehnički: ako skuplja stranica donese manje poziva od jeftine,
klijent to primijeti za tri mjeseca i izgubiš i njega i preporuku. Skuplja stranica smije
koštati više da se napravi — ne smije konvertovati slabije.

Praktično: B se gradi tako što se A završi i verifikuje, pa se brend sloj dodaje kao
nadogradnja koja se može isključiti. Ako `verify.mjs` pokaže da B ima lošiji LCP ili duži put
do dugmeta „Pozovi" nego A, brend sloj pada, ne A.

---

## Redoslijed

| # | Šta | Zašto prvo |
|---|---|---|
| 1 | **A4** — pravilo za sigurnosne nalaze | jedina stavka koja mijenja ponašanje pri incidentu |
| 2 | **A2** — stop umjesto tihe degradacije | sprječava gubitak klijenta |
| 3 | **A1** — gate kvaliteta | bez njega A2 nema okidač |
| 4 | **A3** — jedan prolaz | najveća ušteda tokena i najmanje halucinacija |
| 5 | **B3** — rezanje referenci | ubrzava svako sljedeće pokretanje |
| 6 | **B1** — Astro + Decap | mijenja shell, radi se jednom pa vrijedi |
| 7 | **B2** — prije/poslije gore | ionako pada iz A1 kad se gate uvede |

A1–A3 su vezane i rade se zajedno: gate mjeri, stop reaguje, jedan prolaz gradi.

# AUTOELEKTRIKA E-DRIVE — Web kontekst

> Kontekstni dokument za AI agenta koji gradi stranicu.
> Svi podaci su činjenični; recenzije su parafrazirane. Napravljeno 2026-08-02.
> Skill: `business-web-research` v2.0.0

---

## 0. Meta istraživanja

- **Datum**: 2026-08-02
- **Pouzdanost identifikacije**: **visoka** — Instagram `@edrive.servis` se u pretrazi
  pojavljuje kao „Autoelektrika E-Drive", a grad Gradačac potvrđen kroz upit korisnika.
- **Korištena prečka pristupa** (§5a skilla): **5 — upload korisnika** (još nije stigao)

### Rute koje su probane i pale

| Ruta | Ishod |
|---|---|
| `WebSearch "E-Drive autoelektrika Gradačac"` | radi — vraća **samo IG link**, nula sadržaja |
| `WebSearch` akta.ba / registar | **nema** E-Drive Gradačac u rezultatima |
| `WebFetch` instagram.com/edrive.servis | **HTTP 429** |
| `curl` preko proxyja | **HTTP 200, 606 KB — samo JS ljuska.** `<title>Instagram</title>`, nijedan `og:` meta tag, nijedan post JSON |
| Headless Chromium (Playwright, `/opt/pw-browsers/chromium-1194`) | **`ERR_CONNECTION_RESET` na svaki host**, i na example.com — sandbox nema izlaz za browser |
| `r.jina.ai`, `imginn.com`, `picuki.com` | **HTTP 403** |
| `web.archive.org` | blokiran |

### Pregledani izvori

- https://www.instagram.com/edrive.servis/ — **postoji, sadržaj nedostupan**
- https://www.akta.ba/registar — pretraženo, **nema pogotka**
- opšta web pretraga (3 upita) — **nema pogotka osim IG linka**

### Sekcije prazne zbog blokiranog izvora

§1 (osim imena i djelatnosti) · §2 kompletno · §3 · §4 · §5 · §6 · §7 · §8 (brojači)

**Zaključak: E-Drive nema nijedan javno čitljiv izvor osim Instagrama, a Instagram
se iz ovog kontejnera ne može pročitati.** Sve što slijedi u §10 je jedini put dalje.

---

## 1. Osnovni podaci

| Polje | Vrijednost | Izvor |
|---|---|---|
| Komercijalno ime | **Autoelektrika E-Drive** | IG naziv profila, iz pretrage |
| Pravno ime (registar) | nije nađeno online | akta.ba — nema pogotka |
| Vlasnik / kontakt osoba | nije nađeno online | — |
| Djelatnost | **autoelektrika / auto-elektronika** | naziv profila |
| Opis u jednoj rečenici | čeka upload — §10 | — |
| Godina osnivanja | nije nađeno online | — |

## 2. Kontakt i lokacija

| Polje | Vrijednost | Izvor |
|---|---|---|
| Adresa | **nije nađeno online** | — |
| Grad / regija | **Gradačac, BiH** | navod korisnika |
| Telefon | **nije nađeno online** | — |
| E-mail | nije nađeno online | — |
| Web | **nema ga** — Instagram je jedini kanal | — |
| Radno vrijeme | **nije nađeno online** | — |
| Google Maps | nije nađeno online | — |

## 3. Usluge / proizvodi

**Čeka upload.** Osam usluga koje su trenutno na stranici (dijagnostika, chip tuning,
klima, instalacije, senzori, starteri, alarmi i ključevi, moduli) **nisu preuzete ni sa
jednog izvora** — napisane su na osnovu djelatnosti. Prije objave ih treba potvrditi
ili zamijeniti onim što E-Drive stvarno radi.

## 4. Portfolio / primjeri radova

Čeka upload — §10.

## 5. Društveni dokaz

Nije nađeno online. Nema Google Business profila u rezultatima, nema recenzija,
nema ocjene. Broj pratilaca na Instagramu nije očitan (izvor blokiran).

## 6. Brend

| Polje | Vrijednost |
|---|---|
| Logo | **nema ga** — trenutna stranica koristi tekstualni znak `E—DRIVE` |
| Boje | nisu preuzete sa izvora; trenutna paleta (`#0D5A6E` petrol + `#C79A46` zlatna) je **odabir dizajnera, ne brend klijenta** |
| Slogan | nije nađeno online; „Ne pogađamo. Mjerimo." je **napisano za stranicu**, nije njegovo |
| Ton komunikacije | čeka upload — §10 |

## 7. Vizuelni materijal

| # | Fajl | Kategorija (§4b) | Opis | Izvor |
|---|---|---|---|---|
| — | **nijedan** | — | Nijedna fotografija radionice, tima, vozila ni prije/poslije nije pribavljena. Animacija na stranici koristi **generički render automobila**, ne njegovu radionicu. | — |

## 8. Društvene mreže i izvori

| Platforma | URL | Pratioci / recenzije | Napomena |
|---|---|---|---|
| Instagram | https://www.instagram.com/edrive.servis/ | **neočitano** | jedini potvrđen kanal; sadržaj blokiran |
| Google Business | nije nađen | — | ne pojavljuje se u pretrazi |
| Facebook | nije nađen | — | — |
| akta.ba | nema unosa | — | pretraženo |

---

## 9. Preporuke za stranicu

Ovo je jedini dio koji se smije pisati bez njegovih podataka — jer slijedi iz
**situacije**, a ne iz izmišljenih činjenica.

- **Predložene sekcije**: hero sa jednom animacijom preko cijelog prozora → usluge kao
  boksovi koji se otvaraju → prije/poslije sa **njegovim** fotografijama → jedno pravilo
  radionice kao citat → kontakt. (Trenutna struktura već je ovakva.)
- **Paleta i stil**: tamna petrol osnova sa zlatnim akcentom radi dok nema njegovog
  brenda; **čim stigne logo, paletu izvući iz njega**, ne obrnuto.
- **CTA**: dok nema broja — **jedan** CTA, na Instagram DM. Čim broj stigne, primarni CTA
  postaje `tel:`, a Instagram pada na sekundarni. Za lokalni servis poziv je konverzija.
- **Ključne poruke**: dijagnostika prije zamjene dijela; nalaz prije popravke; mjerenje
  umjesto pogađanja. Ovo je **hipoteza pozicioniranja**, ne njegova izjava — provjeriti
  na uploadu i odbaciti ako se ne poklapa sa tonom njegovih objava.
- **Ton copyja**: kratke rečenice, bez marketinškog naduvavanja, „ti" a ne „Vi" —
  uobičajeno za zanatske servise na ovom tržištu. **Potvrditi iz njegovih objava.**
- **Konkurencija**: u Gradačcu se u pretrazi pojavljuje Auto Servis Car Line
  (http://carline.ba/) — opšti autoservis, ne direktan konkurent u autoelektrici.
  Njihova stranica je statična i bez animacije; prostor za razliku je očigledan.

### Šta se NE smije objaviti prije provjere

Trenutno na stranici stoje **neprovjereni** podaci koje niko nije preuzeo sa izvora:

- `Gradačac 76250` — poštanski broj nije potvrđen
- `Pon–Pet 08–17 · Sub 08–13` — radno vrijeme **izmišljeno**
- `OTVORENO DO 17:00`, `IZLAZAK NA TEREN`, `NALAZ ISTI DAN` — tvrdnje **izmišljene**
- opisi svih 8 usluga — **napisani, ne preuzeti**

Telefon je već uklonjen sa stranice: svako dugme sada vodi na Instagram, jer je to
jedini kanal za koji je potvrđeno da postoji.

---

## 10. Šta još nedostaje — tačna lista za upload

Pošalji ovo i dokument se popunjava do kraja. Svaki screenshot zamjenjuje jednu sekciju.

| # | Šta | Popunjava |
|---|---|---|
| 1 | **1 screenshot zaglavlja profila** — bio, broj pratilaca i objava, kategorija, link | §1, §6, §8 |
| 2 | **1–3 screenshota highlights-a** koji nabrajaju usluge, cijene ili radno vrijeme | §2, §3 |
| 3 | **3–5 screenshota objava s najviše lajkova, sa vidljivim opisima** | §3, §4, §6 ton |
| 4 | **1 par prije/poslije** (oba kadra iz carousel-a) | §4, §7 |
| 5 | **Screenshot onoga što nosi telefon, adresu i radno vrijeme** | §2 |
| 6 | **6–10 originalnih fotografija** po §4b: logo, eksterijer radionice, alat, gotov rad, tim | §7 |

**Najvažnije od svega: tačan telefon.** Čim ga pošalješ, upisuje se na jedno mjesto
u generatoru (`const PHONE`) i cijela stranica se povuče sama — nav, hero, popup i podnožje.

Fotografije radionice su druga po važnosti: animacija trenutno vrti **generički auto**,
a §4b traži njegove slike. Sa 12+ registrovanih snimaka istog objekta može se napraviti
animacija od njegovog materijala umjesto od stock rendera.

# PRAVILA

> Izvedena iz stvarnog kvara, ne iz opšte mudrosti. Svako pravilo ima povod.

---

## PRAVILO-01 — Provjera nije gotova dok neko nije pogledao sliku
Numerički gate propušta kvarove koji su očigledni na screenshotu. Svaka izmjena
vizuelnog sloja završava screenshotom na najmanjem i najvećem viewportu, i taj
screenshot mora biti **otvoren i pogledan**, ne samo snimljen.
*(iz: cover-fit 26% kadra, bijelo dugme na bijeloj podlozi, tekst na karoseriji)*

## PRAVILO-02 — Placeholder nikad ne smije izgledati kao podatak
Ako vrijednost nije potvrđena iz izvora, ona je prazna ili vidno označena. Nikad
uvjerljiv broj telefona, nikad okrugla statistika, nikad radno vrijeme „za sad".
Uvjerljiv placeholder se objavi jer niko ne primijeti da nije stvaran.
*(iz: +387 61 000 000 na 4 mjesta; „10+ godina, 2000+ klijenata, 5000+ dijagnostika")*

## PRAVILO-03 — Ruta se mjeri prije nego uđe u plan
Prije nego plan kaže „iskoristi X", X se testira jednom i ishod se zapiše. Plan
sagrađen na neprovjerenoj ruti pada tek na kraju, kad je najskuplje.
*(iz: Instagram 429/JS-ljuska, Gemini 401, Chromium bez izlaza)*
→ [[MJERENJA#MJERA-01]], [[MJERENJA#MJERA-02]], [[MJERENJA#MJERA-04]]

## PRAVILO-04 — Redakcija tajni je u alatu, i ide prva
Ne naknadno čišćenje. Alat koji čita transkript redigira prije nego išta zapiše, i
redigira **prije** rezanja stringa — rezanje na N znakova razbije uzorak pa token prođe.
*(iz: OAuth token iz chata dospio u destilat u tri fajla)*

## PRAVILO-05 — Unaprijediti znači zamijeniti, ne dodati pored
Prije dodavanja komponente provjeri postoji li već ista funkcija na stranici.
„Dodaj bolji hero" bez brisanja starog daje dva heroa.
*(iz: dva canvasa, dvije animacije od istih kadrova)*

## PRAVILO-06 — Kad kontekst ne stane, izbaci izlaz alata a ne značenje
Kičma razgovora je red veličine manja od transkripta. Destilacija prije sažimanja;
sažimanje tek ako destilat i dalje ne stane.
*(iz: 61,5 MB → 219 KB, 0,36%)*
→ [[MJERENJA#MJERA-06]], [[MJERENJA#MJERA-07]]

## PRAVILO-07 — Kad su dva zahtjeva fizički nespojiva, reci to
Ne biraj tiho jedan i pusti da drugi izgleda riješen. Imenuj sukob, izaberi, obrazloži.
*(iz: 16:9 izvor na 9:19.5 ekranu — „preko cijelog" i „cijeli auto" ne mogu oba)*

## PRAVILO-08 — Jedno mjesto istine za kontakt
Telefon, WhatsApp i sve CTA rute izlaze iz jedne konstante. Ručno prekucan broj na
četiri mjesta znači četiri prilike da jedan ostane star.
*(iz: `const PHONE = null` → nav, hero, popup, podnožje se povuku sami)*

## PRAVILO-09 — Isporuka mora preživjeti kontejner
Sve što je vrijedno ide u git ili u zip koji ide korisniku. `work/` je u `.gitignore` —
dokument napisan tamo nestaje kad sesija završi.
*(iz: istraživački dosje prvo napisan u ignorisan folder)*

## PRAVILO-10 — Necjelobrojno uzorkovanje kadrova pravi zamrzavanja
Kod izvlačenja N kadrova iz videa korak mora biti cijeli broj. Korak 2,83 daje
duplikate koji u animaciji izgledaju kao da se stranica zaglavila.
*(iz: 60 od 170 kadrova → 3 para duplikata → 3 zamrzavanja)*

## PRAVILO-11 — Sloj sa `opacity: 0` mora imati `pointer-events: none`
Nevidljiv sloj koji i dalje hvata dodire je najgora vrsta kvara: korisnik tapne
sliku i otvori mu se nešto nasumično.
*(iz: hotspot sloj hvatao dodire preko cijelog heroa od skrola 0)*

## PRAVILO-12 — `import * as Icons` uvuče cijelu biblioteku
Dinamički pristup ikonama onemogući tree-shaking. Statička mapa od 8 ikona umjesto
barrel importa: **−750 KB**.
*(iz: cijeli lucide set, 1,04 MB sirovo / 287 KB gzip, u bundleu)*

## PRAVILO-13 — Forma bez `action`/`fetch` je tiho bacanje mušterija
Ako forma piše „Poruka poslana!" a nema odredište, svaki upit je izgubljen a korisnik
misli da je stigao. Ili spoji na endpoint ili je zamijeni `tel:`/WhatsApp dugmetom.
*(iz: kontakt forma bez ijednog `name` atributa i bez slanja)*

## PRAVILO-14 — SPA bez fallbacka vraća 404 na dijeljene linkove
`BrowserRouter` bez `_redirects` znači da svaki link podijeljen na Instagramu — a to
je klijentov jedini kanal — vodi u 404.
*(iz: direktni `/usluge` pada)*

## PRAVILO-15 — Pitaj samo kad odgovor mijenja posao
Čovjek koji kaže „ne pitaj me ništa" traži da rješavaš, ne da delegiraš nazad.
Pitanje je opravdano samo ako bi dva različita odgovora dala dva različita proizvoda.
*(iz: „nemoj me nista pitati moras nac nacin")*
→ [[KORISNIK]], [[OTVORENO#OTV-05]]


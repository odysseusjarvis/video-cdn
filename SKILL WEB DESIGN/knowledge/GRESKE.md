# GREŠKE I ISPRAVKE

> Konkretni kvarovi iz sesije 28.07.–02.08.2026. Zapisani su oni koji bi se ponovili
> da nisu zapisani. Format: **simptom** → uzrok → ispravka.

---

## GRESKA-01 — Lažan kontakt kao činjenica
**Simptom:** `+387 61 000 000` u navigaciji, herou, iskočnom prozoru i podnožju; uz to
`wa.me/38761000000`. Izgleda kao pravi broj.
**Uzrok:** placeholder upisan ručno na četiri mjesta dok se čekao pravi, pa zaboravljen.
**Ispravka:** jedna konstanta `const PHONE = null`; dok je `null`, sve CTA rute vode na
Instagram — jedini potvrđen kanal. Upiše se pravi broj i stranica se povuče sama.
→ [[PRAVILA#PRAVILO-02]], [[PRAVILA#PRAVILO-08]]

## GRESKA-02 — Cover-fit pojeo 74% kadra na telefonu
**Simptom:** na 375×812 vidi se samo sredina auta; „rasklapanje" nerazumljivo.
**Uzrok:** `object-fit: cover` na 16:9 izvoru u uspravnom viewportu. Numerički ispravno,
vizuelno neupotrebljivo. Prošlo sve gateove.
**Ispravka:** grana u `paint()` — ako bi cover pokazao manje od 62% kadra, uklapa se
**cijeli** kadar. Prihvaćena posljedica: traka sa pozadinom gore i dolje.
→ [[PRAVILA#PRAVILO-01]], [[PRAVILA#PRAVILO-07]]

## GRESKA-03 — Hero od ~256 MB dekodiranih slika ruši telefone
**Simptom:** sajt „umre" na mobitelu.
**Uzrok:** 60 kadrova držano u memoriji bez pražnjenja, bez DPR kape; na iPhoneu
(dpr 3) backing store 4500×2532 → ~211 MB slika + ~45 MB canvas.
**Ispravka:** klizni prozor kadrova, `DPR ≤ 2`, `frames` se prazni, rAF parkiran na
`IntersectionObserver`.
→ [[MJERENJA#MJERA-09]], [[PRAVILA#PRAVILO-01]]

## GRESKA-04 — Tri zamrzavanja u animaciji
**Simptom:** rasklapanje stane tri puta pa nastavi.
**Uzrok:** 60 kadrova uzorkovano iz 170 → korak 2,83 → tri para identičnih kadrova.
**Ispravka:** cjelobrojni korak. → [[PRAVILA#PRAVILO-10]]

## GRESKA-05 — Osam beskonačnih `box-shadow` animacija
**Simptom:** stranica djeluje zaglavljeno i troši bateriju.
**Uzrok:** `box-shadow` nije kompozitabilan — boje se računaju na glavnoj niti 60×/s,
zauvijek, čak i dok su elementi na `opacity: 0`.
**Ispravka:** `opacity` na gradijent pseudo-elementu + kapija „u vidnom polju".
→ [[PRAVILA#PRAVILO-01]]

## GRESKA-06 — Isti auto dva puta, dvije animacije
**Simptom:** korisnik: „ima 2 puta kola i 2 animacije".
**Uzrok:** novi hero preko cijelog prozora **dodan pored** postojeće sekcije sa punim
rasklapanjem, umjesto da je zamijeni. Oba canvasa vrtjela iste kadrove.
**Ispravka:** jedan pinovani hero, jedan canvas, jedan `scrubber()` poziv; provjera
`canvas=1` u skripti za screenshot. → [[PRAVILA#PRAVILO-05]]

## GRESKA-07 — Bijelo dugme na bijeloj podlozi
**Simptom:** CTA u podnožju je prazna bijela pilula.
**Uzrok:** `.foot a{color:#fff}` (specifičnost 0,1,1) nadjačao `.bCall{color:var(--deep)}`
(0,1,0). Kolizija kaskade, DOM potpuno ispravan.
**Ispravka:** `.foot .bCall{color:var(--deep)}`.
→ [[PRAVILA#PRAVILO-01]]

## GRESKA-08 — Tajna iz chata dospjela u destilat
**Simptom:** OAuth token nađen u tri izlazna fajla, spremna za commit i za vault.
**Uzrok:** destilator je nosio tekst korisnikovih poruka doslovno. Kad je dodana
redakcija, jedan pogodak je i dalje prošao jer se redigovalo **poslije** rezanja na
160 znakova — rezanje je skratilo token ispod praga uzorka.
**Ispravka:** redakcija u alatu, prije rezanja; sirove Bash komande se uopšte ne
zapisuju u trag. Provjera: 49 redigovanih, nula pogodaka u radnom stablu.
→ [[PRAVILA#PRAVILO-04]]

## GRESKA-09 — Nevidljiva dugmad hvataju dodire
**Simptom:** tapneš auto na vrhu stranice, otvori se nasumična usluga.
**Uzrok:** hotspot sloj na `opacity: 0` do 68% skrola, ali bez `pointer-events: none`.
**Ispravka:** `pointer-events: none` na svaki sloj sa `opacity: 0`.
→ [[PRAVILA#PRAVILO-11]]

## GRESKA-10 — Kontakt forma tiho bacala svaku poruku
**Simptom:** korisnik dobije „Poruka Poslana! Javit ćemo vam se u najkraćem roku."
**Uzrok:** forma bez `action`, bez `fetch`, bez `name` atributa. Nigdje odredišta.
**Ispravka:** stvarni endpoint ili zamjena `tel:`/WhatsApp dugmadima.
→ [[PRAVILA#PRAVILO-13]]

## GRESKA-11 — Dijeljeni linkovi vraćaju 404
**Simptom:** `/usluge` podijeljen sa Instagrama pada.
**Uzrok:** `BrowserRouter` bez fallback konfiguracije.
**Ispravka:** `_redirects`. → [[PRAVILA#PRAVILO-14]]

## GRESKA-12 — Cijeli lucide set u bundleu
**Simptom:** početna ~4,3 MB prije ijedne interakcije.
**Uzrok:** `import * as Icons` sa dinamičkim pristupom onemogućio tree-shaking.
**Ispravka:** statička mapa od 8 ikona, **−750 KB**. → [[PRAVILA#PRAVILO-12]]

## GRESKA-13 — `scroll-behavior: smooth` + `scrollTo(0,0)` pri promjeni rute
**Simptom:** svaka navigacija animirano skrola kroz 500vh.
**Uzrok:** globalni `scroll-behavior: smooth` u kombinaciji sa reset skrolom.
**Ispravka:** ukloniti globalni smooth; lerp vremenski zasnovan `1 - exp(-k·dt)`
umjesto fiksnog faktora koji ovisi o 60 vs 120 Hz.
→ [[PRAVILA#PRAVILO-01]]

## GRESKA-14 — Promjena veličine trajno obriše hero
**Simptom:** okreneš telefon, hero ostane prazan.
**Uzrok:** `ResizeObserver` postavlja `canvas.width`, što po specifikaciji briše canvas,
a ništa ne prekrtava.
**Ispravka:** `ResizeObserver` koji nakon promjene **ponovo crta** trenutni kadar.
→ [[PRAVILA#PRAVILO-01]], [[GRESKE#GRESKA-02]]

## GRESKA-15 — Reducirani pokret: dva teksta jedan preko drugog
**Simptom:** uz `prefers-reduced-motion` hero tekst i koraci rasklapanja se preklapaju.
**Uzrok:** oba sloja forsirana na `opacity: 1` jer bez skrola nema redoslijeda.
**Ispravka:** bez skrola koraci nemaju smisao — `display: none` na korake, jači veo
ispod statičnog kadra.
→ [[PRAVILA#PRAVILO-01]]

## GRESKA-16 — Fiksni nav preko trake ispod njega
**Simptom:** logo i tekst obavijesti jedno preko drugog na svakom viewportu.
**Uzrok:** `nav{position:fixed;top:0}` iznad trake koja je u normalnom toku.
**Ispravka:** traci gornji razmak jednak visini nava.
→ [[PRAVILA#PRAVILO-01]]


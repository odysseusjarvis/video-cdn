# OTVORENO

> Šta je blokirano i šta tačno odblokira. Bez ovoga sljedeći agent ponavlja isti krug.

---

## OTV-01 — E-Drive nema nijedan podatak osim imena
**Stanje:** dosje `edrive-web-kontekst.md` je gotovo prazan. Adresa, telefon, radno
vrijeme, usluge, fotografije, ocjene — ništa nije potvrđeno.
**Blokira:** objavu stranice klijentu. Sve što sada stoji je ili prazno ili označeno.
**Odblokira:** šest uploada iz §10 dosjea. Najvažnija dva:
1. **tačan telefon** — upisuje se u `const PHONE` i cijela stranica se povuče sama
2. **fotografije radionice** — animacija trenutno vrti generički render auta, ne njegov posao
→ [[MJERENJA#MJERA-05]], [[MJERENJA#MJERA-01]], [[PRAVILA#PRAVILO-02]]

## OTV-02 — Neprovjereni podaci koji trenutno stoje na stranici
Nisu preuzeti ni sa jednog izvora, a stoje kao činjenica:
- `Gradačac 76250` — poštanski broj nepotvrđen
- `Pon–Pet 08–17 · Sub 08–13` — radno vrijeme izmišljeno
- `OTVORENO DO 17:00`, `IZLAZAK NA TEREN`, `NALAZ ISTI DAN` — tvrdnje izmišljene
- opisi svih 8 usluga — napisani, ne preuzeti

**Ne smiju se objaviti prije provjere.** → [[PRAVILA#PRAVILO-02]]

## OTV-03 — Gemini kao dugi kontekst nije dostupan
Ključ iz okruženja vraća 401. Dok ne stigne ispravan API ključ (`AIza…` oblik, ne
OAuth token), svaki plan koji se oslanja na „Gemini pročita sve" ne stoji.
**Zaobilaznica koja radi:** destilacija transkripta — 61,5 MB → 219 KB stane u običan
kontekst bez ikakvog vanjskog modela. → [[MJERENJA#MJERA-06]]

## OTV-04 — Repozitorij nema nijedan CI workflow
0 workflowa → 0 check runova na PR #1. Provjere PR-a mogu hvatati samo komentare i
konflikte; „CI zeleno" nije dostižno stanje.
**Odblokira:** minimalni GitHub Actions workflow (`npm ci` + `oxlint` + `vite build`).
Tek tada praćenje PR-a ima smisla.
→ [[MJERENJA#MJERA-13]]

## OTV-05 — Isporuka na Desktop se ne može uraditi direktno
Agent radi u izolovanom kontejneru; korisnikov Desktop mu nije dostupan ni za čitanje
ni za pisanje. Nijedan alat to ne mijenja.
**Način koji radi:** cijeli folder se izgradi u repou, spakuje u `.zip` i pošalje
korisniku; korisnik ga raspakuje na Desktop. Isti zip nosi i Obsidian vault.
→ [[PRAVILA#PRAVILO-09]]

## OTV-06 — Kontakt stranica nije objavljena kao zaseban link
`edrive-kontakt.html` je izgrađena i u repou, ali nema svoj artefakt link.
**Odblokira:** jedna komanda kad korisnik potvrdi da je hoće kao zaseban link.
→ [[PRAVILA#PRAVILO-09]]


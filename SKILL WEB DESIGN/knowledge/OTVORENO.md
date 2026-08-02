# OTVORENO

> Šta je blokirano i šta tačno odblokira. Bez ovoga sljedeći agent ponavlja isti krug.

---

## OTV-01 — ~~E-Drive nema nijedan podatak~~ · RIJEŠENO 02.08.2026.
**Bilo:** dosje gotovo prazan; ništa osim imena nije bilo potvrđeno.
**Riješeno:** vlasnik je dostavio dosje sa svim podacima. Potvrđeno na četiri izvora
(Instagram, Facebook, Kupci.com, Akta.ba registar):
telefon **062/844-979** · adresa **Sarajevska bb, 75320 Gradačac** ·
radno vrijeme **Pon–Pet 08–16, Sub 08–15, Ned neradna** ·
vlasnik **Amar Hadžiahmetović**, Obrtnička radnja „E-Drive", ID 4312031980000.
**Pouka:** ljestvica pristupa iz `business-web-research` §5 završava prečkom „čovjek
pošalje". Ta prečka je i odradila posao — nijedna mrežna ruta nije uspjela.
→ [[MJERENJA#MJERA-01]], [[PRAVILA#PRAVILO-02]]


## OTV-02 — ~~Neprovjereni podaci na stranici~~ · RIJEŠENO 02.08.2026.
Sve izmišljeno je zamijenjeno potvrđenim:

| Bilo (izmišljeno) | Sada (potvrđeno) |
|---|---|
| `+387 61 000 000` | **062/844-979** |
| `Gradačac 76250` | **Sarajevska bb, 75320 Gradačac** |
| `Pon–Pet 08–17 · Sub 08–13` | **Pon–Pet 08–16 · Sub 08–15 · Ned neradna** |
| `IZLAZAK NA TEREN`, `NALAZ ISTI DAN` | uklonjeno — nije bilo iz izvora |
| 8 izmišljenih opisa usluga | njegovih 8 usluga, njegovim riječima |
| lažni „prije/poslije" gradijent | **Audi SQ5 Stage 1: 345→402 KS, 440→520 Nm** |
| izmišljena petrol paleta | **njegov brend: crna #0A0A0A + narandžasta #F5A623** |
| DEMO traka | uklonjena — podaci su stvarni |

→ [[PRAVILA#PRAVILO-02]], [[GRESKE#GRESKA-01]]


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


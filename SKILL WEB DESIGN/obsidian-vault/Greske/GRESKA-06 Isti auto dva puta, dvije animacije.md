---
tags: [greska]
oznaka: GRESKA-06
izvor: "GRESKE.md"
---

# 🐞 GRESKA-06 — Isti auto dva puta, dvije animacije

**Simptom:** korisnik: „ima 2 puta kola i 2 animacije".
**Uzrok:** novi hero preko cijelog prozora **dodan pored** postojeće sekcije sa punim
rasklapanjem, umjesto da je zamijeni. Oba canvasa vrtjela iste kadrove.
**Ispravka:** jedan pinovani hero, jedan canvas, jedan `scrubber()` poziv; provjera
`canvas=1` u skripti za screenshot. → [[PRAVILO-05 Unaprijediti znači zamijeniti, ne dodati pored|📐 [[PRAVILO-05 Unaprijediti znači zamijeniti, ne dodati pored|📐 PRAVILO-05]]]]

---

## Vezano

- [[MJERA-11 Isporučena brend stranica|📊 MJERA-11 — Isporučena brend stranica]]

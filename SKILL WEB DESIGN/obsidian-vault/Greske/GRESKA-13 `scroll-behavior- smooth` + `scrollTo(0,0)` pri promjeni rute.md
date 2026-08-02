---
tags: [greska]
oznaka: GRESKA-13
izvor: "GRESKE.md"
---

# 🐞 GRESKA-13 — `scroll-behavior: smooth` + `scrollTo(0,0)` pri promjeni rute

**Simptom:** svaka navigacija animirano skrola kroz 500vh.
**Uzrok:** globalni `scroll-behavior: smooth` u kombinaciji sa reset skrolom.
**Ispravka:** ukloniti globalni smooth; lerp vremenski zasnovan `1 - exp(-k·dt)`
umjesto fiksnog faktora koji ovisi o 60 vs 120 Hz.
→ [[PRAVILO-01 Provjera nije gotova dok neko nije pogledao sliku|📐 [[PRAVILO-01 Provjera nije gotova dok neko nije pogledao sliku|📐 PRAVILO-01]]]]

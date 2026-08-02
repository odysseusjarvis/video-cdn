---
tags: [greska]
oznaka: GRESKA-05
izvor: "GRESKE.md"
---

# 🐞 GRESKA-05 — Osam beskonačnih `box-shadow` animacija

**Simptom:** stranica djeluje zaglavljeno i troši bateriju.
**Uzrok:** `box-shadow` nije kompozitabilan — boje se računaju na glavnoj niti 60×/s,
zauvijek, čak i dok su elementi na `opacity: 0`.
**Ispravka:** `opacity` na gradijent pseudo-elementu + kapija „u vidnom polju".
→ [[PRAVILO-01 Provjera nije gotova dok neko nije pogledao sliku|📐 [[PRAVILO-01 Provjera nije gotova dok neko nije pogledao sliku|📐 PRAVILO-01]]]]

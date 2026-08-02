---
tags: [greska]
oznaka: GRESKA-07
izvor: "GRESKE.md"
---

# 🐞 GRESKA-07 — Bijelo dugme na bijeloj podlozi

**Simptom:** CTA u podnožju je prazna bijela pilula.
**Uzrok:** `.foot a{color:#fff}` (specifičnost 0,1,1) nadjačao `.bCall{color:var(--deep)}`
(0,1,0). Kolizija kaskade, DOM potpuno ispravan.
**Ispravka:** `.foot .bCall{color:var(--deep)}`.
→ [[PRAVILO-01 Provjera nije gotova dok neko nije pogledao sliku|📐 [[PRAVILO-01 Provjera nije gotova dok neko nije pogledao sliku|📐 PRAVILO-01]]]]

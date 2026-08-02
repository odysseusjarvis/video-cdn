---
tags: [greska]
oznaka: GRESKA-03
izvor: "GRESKE.md"
---

# 🐞 GRESKA-03 — Hero od ~256 MB dekodiranih slika ruši telefone

**Simptom:** sajt „umre" na mobitelu.
**Uzrok:** 60 kadrova držano u memoriji bez pražnjenja, bez DPR kape; na iPhoneu
(dpr 3) backing store 4500×2532 → ~211 MB slika + ~45 MB canvas.
**Ispravka:** klizni prozor kadrova, `DPR ≤ 2`, `frames` se prazni, rAF parkiran na
`IntersectionObserver`.
→ [[MJERA-09 Memorija heroa prije ispravke|📊 [[MJERA-09 Memorija heroa prije ispravke|📊 MJERA-09]]]], [[PRAVILO-01 Provjera nije gotova dok neko nije pogledao sliku|📐 [[PRAVILO-01 Provjera nije gotova dok neko nije pogledao sliku|📐 PRAVILO-01]]]]

---

## Vezano

- [[MJERA-09 Memorija heroa prije ispravke|📊 MJERA-09 — Memorija heroa prije ispravke]]

---
tags: [greska]
oznaka: GRESKA-15
izvor: "GRESKE.md"
---

# 🐞 GRESKA-15 — Reducirani pokret: dva teksta jedan preko drugog

**Simptom:** uz `prefers-reduced-motion` hero tekst i koraci rasklapanja se preklapaju.
**Uzrok:** oba sloja forsirana na `opacity: 1` jer bez skrola nema redoslijeda.
**Ispravka:** bez skrola koraci nemaju smisao — `display: none` na korake, jači veo
ispod statičnog kadra.
→ [[PRAVILO-01 Provjera nije gotova dok neko nije pogledao sliku|📐 [[PRAVILO-01 Provjera nije gotova dok neko nije pogledao sliku|📐 PRAVILO-01]]]]

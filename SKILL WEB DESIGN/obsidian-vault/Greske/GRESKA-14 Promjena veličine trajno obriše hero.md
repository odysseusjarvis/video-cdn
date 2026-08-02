---
tags: [greska]
oznaka: GRESKA-14
izvor: "GRESKE.md"
---

# 🐞 GRESKA-14 — Promjena veličine trajno obriše hero

**Simptom:** okreneš telefon, hero ostane prazan.
**Uzrok:** `ResizeObserver` postavlja `canvas.width`, što po specifikaciji briše canvas,
a ništa ne prekrtava.
**Ispravka:** `ResizeObserver` koji nakon promjene **ponovo crta** trenutni kadar.
→ [[PRAVILO-01 Provjera nije gotova dok neko nije pogledao sliku|📐 [[PRAVILO-01 Provjera nije gotova dok neko nije pogledao sliku|📐 PRAVILO-01]]]], [[GRESKA-02 Cover-fit pojeo 74% kadra na telefonu|🐞 [[GRESKA-02 Cover-fit pojeo 74% kadra na telefonu|🐞 GRESKA-02]]]]

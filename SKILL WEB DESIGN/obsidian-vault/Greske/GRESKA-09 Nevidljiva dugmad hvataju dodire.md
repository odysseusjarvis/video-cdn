---
tags: [greska]
oznaka: GRESKA-09
izvor: "GRESKE.md"
---

# 🐞 GRESKA-09 — Nevidljiva dugmad hvataju dodire

**Simptom:** tapneš auto na vrhu stranice, otvori se nasumična usluga.
**Uzrok:** hotspot sloj na `opacity: 0` do 68% skrola, ali bez `pointer-events: none`.
**Ispravka:** `pointer-events: none` na svaki sloj sa `opacity: 0`.
→ [[PRAVILO-11 Sloj sa `opacity: 0` mora imati `pointer-events: none`|📐 [[PRAVILO-11 Sloj sa `opacity: 0` mora imati `pointer-events: none`|📐 PRAVILO-11]]]]

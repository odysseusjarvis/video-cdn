---
tags: [greska]
oznaka: GRESKA-01
izvor: "GRESKE.md"
---

# 🐞 GRESKA-01 — Lažan kontakt kao činjenica

**Simptom:** `+387 61 000 000` u navigaciji, herou, iskočnom prozoru i podnožju; uz to
`wa.me/38761000000`. Izgleda kao pravi broj.
**Uzrok:** placeholder upisan ručno na četiri mjesta dok se čekao pravi, pa zaboravljen.
**Ispravka:** jedna konstanta `const PHONE = null`; dok je `null`, sve CTA rute vode na
Instagram — jedini potvrđen kanal. Upiše se pravi broj i stranica se povuče sama.
→ [[PRAVILO-02 Placeholder nikad ne smije izgledati kao podatak|📐 [[PRAVILO-02 Placeholder nikad ne smije izgledati kao podatak|📐 PRAVILO-02]]]], [[PRAVILO-08 Jedno mjesto istine za kontakt|📐 [[PRAVILO-08 Jedno mjesto istine za kontakt|📐 PRAVILO-08]]]]

---

## Vezano

- [[MJERA-12 Revizija `src/` prije ispravki|📊 MJERA-12 — Revizija `src/` prije ispravki]]
- [[OTV-02 ~~Neprovjereni podaci na stranici~~ · RIJEŠENO 02.08.2026.|🚧 OTV-02 — ~~Neprovjereni podaci na stranici~~ · RIJEŠENO 02.08.2026.]]

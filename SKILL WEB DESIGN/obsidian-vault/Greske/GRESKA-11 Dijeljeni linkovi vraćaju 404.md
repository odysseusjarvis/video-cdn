---
tags: [greska]
oznaka: GRESKA-11
izvor: "GRESKE.md"
---

# 🐞 GRESKA-11 — Dijeljeni linkovi vraćaju 404

**Simptom:** `/usluge` podijeljen sa Instagrama pada.
**Uzrok:** `BrowserRouter` bez fallback konfiguracije.
**Ispravka:** `_redirects`. → [[PRAVILO-14 SPA bez fallbacka vraća 404 na dijeljene linkove|📐 [[PRAVILO-14 SPA bez fallbacka vraća 404 na dijeljene linkove|📐 PRAVILO-14]]]]

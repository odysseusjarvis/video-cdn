---
tags: [pravilo]
oznaka: PRAVILO-12
izvor: "PRAVILA.md"
---

# 📐 PRAVILO-12 — `import * as Icons` uvuče cijelu biblioteku

Dinamički pristup ikonama onemogući tree-shaking. Statička mapa od 8 ikona umjesto
barrel importa: **−750 KB**.
*(iz: cijeli lucide set, 1,04 MB sirovo / 287 KB gzip, u bundleu)*

---

## Vezano

- [[GRESKA-12 Cijeli lucide set u bundleu|🐞 GRESKA-12 — Cijeli lucide set u bundleu]]
- [[MJERA-10 Težina bundlea|📊 MJERA-10 — Težina bundlea]]
- [[MJERA-14 Statička mapa ikona: izmjereni dobitak|📊 MJERA-14 — Statička mapa ikona: izmjereni dobitak]]

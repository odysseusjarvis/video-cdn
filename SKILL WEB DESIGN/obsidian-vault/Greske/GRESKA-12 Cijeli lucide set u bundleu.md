---
tags: [greska]
oznaka: GRESKA-12
izvor: "GRESKE.md"
---

# 🐞 GRESKA-12 — Cijeli lucide set u bundleu

**Simptom:** početna ~4,3 MB prije ijedne interakcije.
**Uzrok:** `import * as Icons` sa dinamičkim pristupom onemogućio tree-shaking.
**Ispravka:** statička mapa od 8 ikona, **−750 KB**. → [[PRAVILO-12 `import * as Icons` uvuče cijelu biblioteku|📐 [[PRAVILO-12 `import * as Icons` uvuče cijelu biblioteku|📐 PRAVILO-12]]]]

---

## Vezano

- [[MJERA-10 Težina bundlea|📊 MJERA-10 — Težina bundlea]]
- [[MJERA-14 Statička mapa ikona: izmjereni dobitak|📊 MJERA-14 — Statička mapa ikona: izmjereni dobitak]]

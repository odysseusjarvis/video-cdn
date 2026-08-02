---
tags: [mjera]
oznaka: MJERA-14
izvor: "MJERENJA.md"
---

# 📊 MJERA-14 — Statička mapa ikona: izmjereni dobitak

Zamjena `import * as Icons from 'lucide-react'` statičkom mapom od 8 ikona,
potvrđeno ponovnim buildom:

| | prije | poslije | razlika |
|---|---|---|---|
| bundle sirovo | 1 044,82 KB | **418,37 KB** | **−626,45 KB** |
| gzip | 287,85 KB | **132,88 KB** | **−154,97 KB** |

Procjena u [[MJERA-10 Težina bundlea|📊 [[MJERA-10 Težina bundlea|📊 MJERA-10]]]] je bila −750 KB; stvarno je **−626 KB**. Razlika je
razlog zašto se procjena ne upisuje kao mjerenje.
→ [[PRAVILO-12 `import * as Icons` uvuče cijelu biblioteku|📐 [[PRAVILO-12 `import * as Icons` uvuče cijelu biblioteku|📐 PRAVILO-12]]]], [[GRESKA-12 Cijeli lucide set u bundleu|🐞 [[GRESKA-12 Cijeli lucide set u bundleu|🐞 GRESKA-12]]]]

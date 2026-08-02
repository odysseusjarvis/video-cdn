---
tags: [otvoreno]
oznaka: OTV-03
izvor: "OTVORENO.md"
---

# 🚧 OTV-03 — Gemini kao dugi kontekst nije dostupan

Ključ iz okruženja vraća 401. Dok ne stigne ispravan API ključ (`AIza…` oblik, ne
OAuth token), svaki plan koji se oslanja na „Gemini pročita sve" ne stoji.
**Zaobilaznica koja radi:** destilacija transkripta — 61,5 MB → 219 KB stane u običan
kontekst bez ikakvog vanjskog modela. → [[MJERA-06 61,5 MB transkripta = 219 KB kičme (**0,36%**)|📊 [[MJERA-06 61,5 MB transkripta = 219 KB kičme (**0,36%**)|📊 MJERA-06]]]]

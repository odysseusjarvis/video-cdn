---
tags: [mjera]
oznaka: MJERA-02
izvor: "MJERENJA.md"
---

# 📊 MJERA-02 — Chromium u ovom kontejneru nema izlaz na mrežu

`ERR_CONNECTION_RESET` na **svaki** host, uključujući `example.com`. Nije stvar
Instagrama. Proxy je uredan (`enabled: true`, `selective: false`) i `curl` kroz njega
prolazi — browser jednostavno ne prolazi.
**Ali `file://` učitava normalno** — zato provjera izgrađene stranice u pravom
pregledniku radi, a dohvat sa weba ne. *(ovo je razlika koja spašava verifikaciju)*
→ [[PRAVILO-03 Ruta se mjeri prije nego uđe u plan|📐 [[PRAVILO-03 Ruta se mjeri prije nego uđe u plan|📐 PRAVILO-03]]]], [[MJERA-03 Chromium binarka nije ona koju Playwright očekuje|📊 [[MJERA-03 Chromium binarka nije ona koju Playwright očekuje|📊 MJERA-03]]]]

---

## Vezano

- [[PRAVILO-03 Ruta se mjeri prije nego uđe u plan|📐 PRAVILO-03 — Ruta se mjeri prije nego uđe u plan]]

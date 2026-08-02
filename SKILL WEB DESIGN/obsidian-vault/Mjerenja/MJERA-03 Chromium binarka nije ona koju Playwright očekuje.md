---
tags: [mjera]
oznaka: MJERA-03
izvor: "MJERENJA.md"
---

# 📊 MJERA-03 — Chromium binarka nije ona koju Playwright očekuje

Lokalni Playwright 1.56.1 traži `chromium_headless_shell-1234`; u slici postoji
`chromium-1194`. Radi tek uz
`executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'`.
→ [[PRAVILO-03 Ruta se mjeri prije nego uđe u plan|📐 [[PRAVILO-03 Ruta se mjeri prije nego uđe u plan|📐 PRAVILO-03]]]]

---

## Vezano

- [[MJERA-02 Chromium u ovom kontejneru nema izlaz na mrežu|📊 MJERA-02 — Chromium u ovom kontejneru nema izlaz na mrežu]]

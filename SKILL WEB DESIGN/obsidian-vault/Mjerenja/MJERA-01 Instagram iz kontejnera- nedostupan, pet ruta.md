---
tags: [mjera]
oznaka: MJERA-01
izvor: "MJERENJA.md"
---

# 📊 MJERA-01 — Instagram iz kontejnera: nedostupan, pet ruta

| Ruta | Ishod |
|---|---|
| `WebFetch` instagram.com | **HTTP 429** |
| `curl` preko proxyja, desktop UA | **HTTP 200, 606 KB — ali samo JS ljuska**: `<title>Instagram</title>`, nijedan `og:` meta, nijedan post JSON |
| headless Chromium (Playwright) | **`ERR_CONNECTION_RESET`** |
| `r.jina.ai`, `imginn.com`, `picuki.com` | **HTTP 403** |
| `web.archive.org` | blokiran za WebFetch |
→ [[PRAVILO-03 Ruta se mjeri prije nego uđe u plan|📐 [[PRAVILO-03 Ruta se mjeri prije nego uđe u plan|📐 PRAVILO-03]]]], [[OTV-01 E-Drive nema nijedan podatak osim imena|🚧 [[OTV-01 E-Drive nema nijedan podatak osim imena|🚧 OTV-01]]]]

---

## Vezano

- [[OTV-01 E-Drive nema nijedan podatak osim imena|🚧 OTV-01 — E-Drive nema nijedan podatak osim imena]]
- [[PRAVILO-03 Ruta se mjeri prije nego uđe u plan|📐 PRAVILO-03 — Ruta se mjeri prije nego uđe u plan]]

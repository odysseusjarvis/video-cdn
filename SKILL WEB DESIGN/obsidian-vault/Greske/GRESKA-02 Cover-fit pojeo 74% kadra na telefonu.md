---
tags: [greska]
oznaka: GRESKA-02
izvor: "GRESKE.md"
---

# 🐞 GRESKA-02 — Cover-fit pojeo 74% kadra na telefonu

**Simptom:** na 375×812 vidi se samo sredina auta; „rasklapanje" nerazumljivo.
**Uzrok:** `object-fit: cover` na 16:9 izvoru u uspravnom viewportu. Numerički ispravno,
vizuelno neupotrebljivo. Prošlo sve gateove.
**Ispravka:** grana u `paint()` — ako bi cover pokazao manje od 62% kadra, uklapa se
**cijeli** kadar. Prihvaćena posljedica: traka sa pozadinom gore i dolje.
→ [[PRAVILO-01 Provjera nije gotova dok neko nije pogledao sliku|📐 [[PRAVILO-01 Provjera nije gotova dok neko nije pogledao sliku|📐 PRAVILO-01]]]], [[PRAVILO-07 Kad su dva zahtjeva fizički nespojiva, reci to|📐 [[PRAVILO-07 Kad su dva zahtjeva fizički nespojiva, reci to|📐 PRAVILO-07]]]]

---

## Vezano

- [[GRESKA-14 Promjena veličine trajno obriše hero|🐞 GRESKA-14 — Promjena veličine trajno obriše hero]]

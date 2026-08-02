---
tags: [greska]
oznaka: GRESKA-08
izvor: "GRESKE.md"
---

# 🐞 GRESKA-08 — Tajna iz chata dospjela u destilat

**Simptom:** OAuth token nađen u tri izlazna fajla, spremna za commit i za vault.
**Uzrok:** destilator je nosio tekst korisnikovih poruka doslovno. Kad je dodana
redakcija, jedan pogodak je i dalje prošao jer se redigovalo **poslije** rezanja na
160 znakova — rezanje je skratilo token ispod praga uzorka.
**Ispravka:** redakcija u alatu, prije rezanja; sirove Bash komande se uopšte ne
zapisuju u trag. Provjera: 49 redigovanih, nula pogodaka u radnom stablu.
→ [[PRAVILO-04 Redakcija tajni je u alatu, i ide prva|📐 [[PRAVILO-04 Redakcija tajni je u alatu, i ide prva|📐 PRAVILO-04]]]]

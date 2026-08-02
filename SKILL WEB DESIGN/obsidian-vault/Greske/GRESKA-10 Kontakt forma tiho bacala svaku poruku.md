---
tags: [greska]
oznaka: GRESKA-10
izvor: "GRESKE.md"
---

# 🐞 GRESKA-10 — Kontakt forma tiho bacala svaku poruku

**Simptom:** korisnik dobije „Poruka Poslana! Javit ćemo vam se u najkraćem roku."
**Uzrok:** forma bez `action`, bez `fetch`, bez `name` atributa. Nigdje odredišta.
**Ispravka:** stvarni endpoint ili zamjena `tel:`/WhatsApp dugmadima.
→ [[PRAVILO-13 Forma bez `action`/`fetch` je tiho bacanje mušterija|📐 [[PRAVILO-13 Forma bez `action`/`fetch` je tiho bacanje mušterija|📐 PRAVILO-13]]]]

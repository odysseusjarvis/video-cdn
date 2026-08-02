---
tags: [pravilo]
oznaka: PRAVILO-13
izvor: "PRAVILA.md"
---

# 📐 PRAVILO-13 — Forma bez `action`/`fetch` je tiho bacanje mušterija

Ako forma piše „Poruka poslana!" a nema odredište, svaki upit je izgubljen a korisnik
misli da je stigao. Ili spoji na endpoint ili je zamijeni `tel:`/WhatsApp dugmetom.
*(iz: kontakt forma bez ijednog `name` atributa i bez slanja)*

---

## Vezano

- [[GRESKA-10 Kontakt forma tiho bacala svaku poruku|🐞 GRESKA-10 — Kontakt forma tiho bacala svaku poruku]]

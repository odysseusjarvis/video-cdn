---
tags: [pravilo]
oznaka: PRAVILO-11
izvor: "PRAVILA.md"
---

# 📐 PRAVILO-11 — Sloj sa `opacity: 0` mora imati `pointer-events: none`

Nevidljiv sloj koji i dalje hvata dodire je najgora vrsta kvara: korisnik tapne
sliku i otvori mu se nešto nasumično.
*(iz: hotspot sloj hvatao dodire preko cijelog heroa od skrola 0)*

---

## Vezano

- [[GRESKA-09 Nevidljiva dugmad hvataju dodire|🐞 GRESKA-09 — Nevidljiva dugmad hvataju dodire]]

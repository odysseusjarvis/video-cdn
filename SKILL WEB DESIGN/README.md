# SKILL WEB DESIGN

Sve što je naučeno gradeći web stranice za lokalne klijente — skillovi, agent, baza
znanja i Obsidian vault — u jednom folderu.

Nastalo iz sesije **28.07. – 02.08.2026.** (100+ sati, 61,5 MB transkripta).
Destilovano, povezano i zapisano tako da se ne uči ispočetka.

---

## Postavljanje — tri koraka

### 1. Raspakuj na Desktop
Folder se zove `SKILL WEB DESIGN`. Može stajati bilo gdje, ali putanje u uputama
pretpostavljaju Desktop.

### 2. Instaliraj agenta i skillove u Claude Code

```bash
# agent
mkdir -p ~/.claude/agents
cp "AGENT/web-majstor-bs.md" ~/.claude/agents/

# skillovi
mkdir -p ~/.claude/skills
cp -r skills/business-web-research ~/.claude/skills/
cp -r skills/web-design-build      ~/.claude/skills/
cp -r skills/graphify              ~/.claude/skills/
cp -r skills/premium-web           ~/.claude/skills/
```

Pokreni agenta sa: **„napravi sajt za klijenta"**, „sredi ovom majstoru stranicu",
„popravi stranicu", „trebam demo za pitch".

### 3. Otvori vault
Obsidian → *Open folder as vault* → izaberi `obsidian-vault/`.
Otvori `00 START HERE.md`, pa **Graph view** (`Ctrl/Cmd+G`).

---

## Šta je unutra

```
SKILL WEB DESIGN/
├── AGENT/
│   └── web-majstor-bs.md        agent koji vodi cijeli lanac i sam se održava
├── skills/
│   ├── business-web-research/   nađi šta se o biznisu može saznati (v2, ljestvica pristupa)
│   ├── web-design-build/        veže istraživanje na dizajn + kapije K1–K7
│   ├── premium-web/             recept, pokret, tipografija, isporuka
│   └── graphify/                od razgovora do grafa znanja
├── knowledge/                   ← IZVOR ISTINE
│   ├── 00-NAJVAZNIJE.md         sedam stvari; čita se prvo
│   ├── PRAVILA.md               15 pravila, svako sa povodom
│   ├── GRESKE.md                16 kvarova: simptom → uzrok → ispravka
│   ├── MJERENJA.md              13 stvarno izmjerenih brojeva
│   ├── KORISNIK.md              kako Niho radi
│   ├── OTVORENO.md              šta je blokirano i šta odblokira
│   ├── edrive-web-kontekst.md   dosje prvog klijenta
│   └── distilled/               kičma razgovora (219 KB od 61,5 MB)
├── obsidian-vault/              ← IZLAZ, ne uređivati ručno
│   50 atomskih bilješki · 104 veze · nula siročića
└── tools/
    ├── distil-transcript.mjs    transkript → kičma, sa redakcijom tajni
    ├── graphify.mjs             knowledge/ → vault + graph.json
    └── gemini-ask.mjs           dugi kontekst preko Gemini API-ja
```

---

## Lanac

```
business-web-research  →  <biznis>-web-kontekst.md  →  web-design-build  →  premium-web  →  isporuka
                              činjenice + rupe          ugovor + kapije      recept i pokret
                                                                                   │
                                                              graphify  ←──────────┘
                                                          (upiši šta si naučio)
```

Nijedan korak ne pretpostavlja podatak iz prethodnog. Ako dosje kaže
`„nije nađeno online"`, stranica to **prikazuje kao rupu**, ne popunjava.

---

## Kako se održava

Baza je živa. Poslije svakog posla:

1. dopiši **nove** nalaze u `knowledge/` — nastavi numeraciju (`PRAVILO-16`, `GRESKA-17`…)
2. pregradi vault:
   ```bash
   node tools/graphify.mjs knowledge --vault "obsidian-vault" --title "SKILL WEB DESIGN"
   ```
3. kapija: **nula siročića**. Ako ih ima, znanje nije povezano — poveži ga stvarnim
   odnosom, nikad vezom koja ne postoji u sadržaju.

Agent ovo radi sam na kraju svakog posla. Ako radiš ručno, radi isto.

---

## Dvije stvari koje treba znati odmah

**Tajne.** Destilator redigira API ključeve prije nego išta zapiše — jer ljudi lijepe
ključeve u chat, a sve što prođe kroz alat ide u git i u vault, dakle objavljeno je.
Poslije svake destilacije provjeri:
```bash
grep -rlE 'AQ\.[A-Za-z0-9_-]{15,}|AIza[0-9A-Za-z_-]{25,}|sk-[A-Za-z0-9]{20,}|gh[pousr]_[A-Za-z0-9]{20,}' . --exclude-dir=.git
```
Prazan izlaz je jedini prihvatljiv.

**Gemini.** `tools/gemini-ask.mjs` radi, ali ključ iz okruženja je vraćao **401**
(`ACCESS_TOKEN_TYPE_UNSUPPORTED` — traži OAuth 2, ne ovaj oblik ključa). Nije bio
potreban: destilacija svede 61,5 MB na 219 KB, što stane u običan kontekst bez ijednog
vanjskog modela. Detalji: `knowledge/MJERENJA.md` → MJERA-04, MJERA-06.

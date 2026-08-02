---
name: graphify
description: >
  Pretvara zbirku markdown dokumenata (ili sirovi transkript sesije) u graf znanja
  i gotov Obsidian vault sa atomskim bilješkama, backlinkovima i tagovima. Koristi
  kad treba trajno zapisati šta je naučeno u nekom poslu, kad kontekst ne stane u
  jedan prozor, ili kad se traži „zapiši sve", „napravi bazu znanja", „obsidian
  vault", „poveži ovo u graf", „sažmi cijeli razgovor".
version: 1.0.0
---

# graphify — od razgovora do grafa znanja

Znanje koje ostane u transkriptu je izgubljeno znanje. Ovaj skill ga vadi, reže na
atome i povezuje tako da se sljedeći put ne uči ispočetka.

---

## 0. Kada NIJE za ovo

- Za jedan dokument koji treba sažeti → običan sažetak, ne graf.
- Za kod → kod se čita, ne graficira.
- Ako nema bar 10 zasebnih nalaza, graf je prazan trud.

## 1. Lanac

```
sirovi transkript .jsonl
      │  distil-transcript.mjs      ← izbaci izlaz alata, redigiraj tajne
      ▼
   spine.md  (kičma razgovora)
      │  ručno ili modelom          ← izvuci PRAVILA / GRESKE / MJERE / OTVORENO
      ▼
 knowledge/*.md  (oznake)
      │  graphify.mjs
      ▼
 obsidian-vault/  +  graph.json
```

## 2. Prvi korak — destilacija

```bash
node tools/distil-transcript.mjs <transkript.jsonl> --out knowledge/distilled
```

Transkript je uglavnom masa, ne značenje: izlaz alata zna biti **preko 40%** bajtova,
a kičma razgovora **ispod 1%**. Destilat izbacuje `tool_result`, `image` i `thinking`
blokove i zadržava samo šta je čovjek tražio i šta je agent odgovorio.

**Redakcija tajni je u destilatoru i nije opcionalna.** Ljudi lijepe API ključeve u
chat. Sve što destilator ispusti ide u git i u vault — dakle objavljeno je. Uzorci
pokrivaju Google OAuth/API, OpenAI, Anthropic, GitHub, NVIDIA, Slack, JWT i Bearer.
Redakcija se radi **prije** rezanja stringova: rezanje na N znakova skrati token
ispod praga uzorka i on prođe neredigovan.

Provjeri poslije svakog pokretanja:
```bash
grep -rlE 'AQ\.[A-Za-z0-9_-]{15,}|AIza[0-9A-Za-z_-]{25,}|sk-[A-Za-z0-9]{20,}|gh[pousr]_[A-Za-z0-9]{20,}' . --exclude-dir=.git
```
Prazan izlaz je jedini prihvatljiv.

## 3. Drugi korak — izvuci znanje u oznake

Iz kičme napravi dokumente u `knowledge/` gdje je **svaki nalaz jedna sekcija** oblika:

```markdown
## PRAVILO-07 — Kad su dva zahtjeva fizički nespojiva, reci to
Tekst pravila.
*(iz: kratki povod)*
→ [[GRESKE#GRESKA-02]]
```

Prefiksi koje alat prepoznaje i razvrstava u foldere:

| Prefiks | Folder | Za šta |
|---|---|---|
| `PRAVILO-nn` | Pravila | šta se ubuduće radi drugačije |
| `GRESKA-nn` | Greske | simptom → uzrok → ispravka |
| `MJERA-nn` | Mjerenja | brojevi koji su **stvarno** izmjereni |
| `OTV-nn` | Otvoreno | blokirano + šta tačno odblokira |
| `ODLUKA-nn` | Odluke | izbor i zašto je izabran |

Pravila pisanja koja odlučuju je li baza korisna ili balast:

- **Svaki nalaz ima povod.** Pravilo bez „iz: …" je opšta mudrost, a nje ima svuda.
- **Mjera bez izmjerene vrijednosti se ne piše.** Nikad procjena predstavljena kao mjerenje.
- **Greška se piše tek kad je riješena** — inače pripada u `OTV`.
- Dokumenti bez oznaka (npr. `00-NAJVAZNIJE.md`, `KORISNIK.md`) prolaze cijeli i
  služe kao ulazna tačka.

## 4. Treći korak — graf

```bash
node tools/graphify.mjs knowledge --vault "obsidian-vault" --title "Naziv baze"
```

Šta alat radi:

- reže svaki `## OZNAKA — naslov` u **vlastitu bilješku** — Obsidianov graf crta veze
  *među fajlovima*, pa 15 pravila u jednom fajlu daje jedan čvor i ništa ne pokazuje
- prepisuje `[[FAJL#OZNAKA]]` u atomski `[[OZNAKA naslov]]`
- hvata i **gole oznake** u tekstu: „vidi GRESKA-04" je veza i bez uglastih zagrada
- dopisuje sekciju **Vezano** (backlinkovi) u svaku bilješku na koju neko pokazuje
- piše `00 START HERE.md` kao ulaz i `graph.json` kao podatak
- konfiguriše `.obsidian/` — boje po tagu, graf uključen, vault se otvara upotrebljiv

## 5. Kontrola kvaliteta

Alat na kraju ispiše siročiće — čvorove bez ijedne veze.

**Siroče je znak da znanje nije povezano, ne da alat ne radi.** Ako ih ima više od
~10%, nalazi su pisani izolovano. Vrati se i poveži ih stvarnim odnosom
(mjera → greška koju dokazuje, greška → pravilo koje je iz nje izvedeno).
Nikad ne dodavati vezu koja ne postoji u sadržaju samo da graf izgleda gušće.

Cilj: **nula siročića**, i svaka veza da izdrži pitanje „zašto je ovo povezano".

## 6. Održavanje

Baza je živa. Poslije svakog većeg posla:

1. ponovo pokreni destilaciju nad novim transkriptom
2. dopiši samo **nove** nalaze (oznake se nastavljaju, ne renumerišu)
3. ponovo pokreni `graphify.mjs` — vault se pregrađuje iz izvora

Vault se nikad ne uređuje ručno: izvor je `knowledge/`, vault je izlaz. Ručna izmjena
u vaultu nestaje pri sljedećem pokretanju.

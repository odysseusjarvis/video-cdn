# NAJVAŽNIJE

> Ovo se čita prvo. Sedam stvari koje mijenjaju kako se radi — svaka je plaćena
> stvarnim kvarom u sesiji od 28.07. do 02.08.2026. Ostalo je detalj.

---

### 1. **Pogledaj screenshot. Brojevi lažu.**

Svaki ozbiljan kvar u ovoj sesiji prošao je numeričku provjeru i pao tek kad je neko
otvorio sliku. Cover-fit je pokazivao **26% kadra** na telefonu — matematika uredna,
auto nevidljiv. Dugme u podnožju je bilo bijelo na bijelom — DOM ispravan, dugme
nepostojeće. → [[GRESKA-02 Cover-fit pojeo 74% kadra na telefonu|🐞 [[GRESKA-02 Cover-fit pojeo 74% kadra na telefonu|🐞 GRESKA-02]]]], [[GRESKA-07 Bijelo dugme na bijeloj podlozi|🐞 [[GRESKA-07 Bijelo dugme na bijeloj podlozi|🐞 GRESKA-07]]]], [[PRAVILO-01 Provjera nije gotova dok neko nije pogledao sliku|📐 [[PRAVILO-01 Provjera nije gotova dok neko nije pogledao sliku|📐 PRAVILO-01]]]]

### 2. **Nikad ne stavljaj izmišljen podatak na stranicu klijenta.**

Telefon `+387 61 000 000`, „2000+ zadovoljnih klijenata", radno vrijeme, poštanski
broj — sve izmišljeno, sve je stajalo kao činjenica. Lažan broj na stranici lokalnog
servisa je **konverzija koja izgleda živa a mrtva je**. Prazno polje je bolje od
uvjerljivog placeholdera, jer prazno polje neko popuni.
→ [[PRAVILO-02 Placeholder nikad ne smije izgledati kao podatak|📐 [[PRAVILO-02 Placeholder nikad ne smije izgledati kao podatak|📐 PRAVILO-02]]]], [[GRESKA-01 Lažan kontakt kao činjenica|🐞 [[GRESKA-01 Lažan kontakt kao činjenica|🐞 GRESKA-01]]]]

### 3. **Provjeri rutu prije nego izgradiš plan na njoj.**

Instagram se iz kontejnera ne može pročitati — izmjereno pet načina, ne pretpostavljeno.
Gemini ključ u okruženju vraća 401. Chromium nema izlaz na mrežu. Sve tri stvari su
stajale u planu kao „iskoristi X" prije nego je iko provjerio radi li X.
→ [[PRAVILO-03 Ruta se mjeri prije nego uđe u plan|📐 [[PRAVILO-03 Ruta se mjeri prije nego uđe u plan|📐 PRAVILO-03]]]], [[MJERA-01 Instagram iz kontejnera: nedostupan, pet ruta|📊 [[MJERA-01 Instagram iz kontejnera: nedostupan, pet ruta|📊 MJERA-01]]]], [[MJERA-04 Gemini ključ iz okruženja: 401|📊 [[MJERA-04 Gemini ključ iz okruženja: 401|📊 MJERA-04]]]]

### 4. **Tajna koja prođe kroz alat je objavljena tajna.**

Čovjek je zalijepio OAuth token u chat sa „nemoj ga objaviti na github". Destilat
transkripta ga je pokupio i skoro odnio u git i u vault. Redakcija mora biti **u alatu**,
ne naknadno čišćenje — i mora ići **prije** rezanja teksta, jer rezanje razbije uzorak
pa token prođe. → [[PRAVILO-04 Redakcija tajni je u alatu, i ide prva|📐 [[PRAVILO-04 Redakcija tajni je u alatu, i ide prva|📐 PRAVILO-04]]]], [[GRESKA-08 Tajna iz chata dospjela u destilat|🐞 [[GRESKA-08 Tajna iz chata dospjela u destilat|🐞 GRESKA-08]]]]

### 5. **Jedan element, jedna svrha. Duplikat je kvar, ne dodatak.**

Stranica je vrtjela isti auto dva puta, dvije animacije od istih kadrova. Nastalo tako
što je „unaprijedi hero" izvedeno kao **dodavanje** novog heroa pored starog umjesto
zamjene. Prije nego dodaš — provjeri postoji li već.
→ [[GRESKA-06 Isti auto dva puta, dvije animacije|🐞 [[GRESKA-06 Isti auto dva puta, dvije animacije|🐞 GRESKA-06]]]], [[PRAVILO-05 Unaprijediti znači zamijeniti, ne dodati pored|📐 [[PRAVILO-05 Unaprijediti znači zamijeniti, ne dodati pored|📐 PRAVILO-05]]]]

### 6. **Masa nije značenje: 61 MB transkripta je 219 KB razgovora.**

Kičma ove sesije je **0,36%** sirove mase; 42% je izlaz alata. Kad kontekst ne stane,
odgovor nije veći model nego izbacivanje izlaza alata. Ovo je razlog zašto cijela sesija
od 100+ sati stane u jedan prozor. → [[MJERA-06 61,5 MB transkripta = 219 KB kičme (**0,36%**)|📊 [[MJERA-06 61,5 MB transkripta = 219 KB kičme (**0,36%**)|📊 MJERA-06]]]], [[PRAVILO-06 Kad kontekst ne stane, izbaci izlaz alata a ne značenje|📐 [[PRAVILO-06 Kad kontekst ne stane, izbaci izlaz alata a ne značenje|📐 PRAVILO-06]]]]

### 7. **Fizika kadra se ne pobjeđuje CSS-om.**

Izvor 16:9, telefon uspravno 9:19.5. „Preko cijelog ekrana" i „vidi se cijeli auto" su
na telefonu **međusobno isključivi**. Bira se jedno i kaže se naglas — ne pretvara se da
su oba riješena. → [[PRAVILO-07 Kad su dva zahtjeva fizički nespojiva, reci to|📐 [[PRAVILO-07 Kad su dva zahtjeva fizički nespojiva, reci to|📐 PRAVILO-07]]]], [[GRESKA-02 Cover-fit pojeo 74% kadra na telefonu|🐞 [[GRESKA-02 Cover-fit pojeo 74% kadra na telefonu|🐞 GRESKA-02]]]]

---

## Lanac koji radi

```
business-web-research  →  <biznis>-web-kontekst.md  →  web-design-build  →  provjera u pregledniku
   (§5 ljestvica pristupa)     (činjenice + rupe)        (dizajn iz činjenica)   (screenshot, ne broj)
```

Nijedan korak ne smije pretpostaviti podatak iz prethodnog: ako kontekst kaže
`„nije nađeno online"`, dizajn to **prikazuje kao rupu**, ne popunjava.

---

Detalji: [[PRAVILA]] · [[GRESKE]] · [[MJERENJA]] · [[KORISNIK]] · [[OTVORENO]]

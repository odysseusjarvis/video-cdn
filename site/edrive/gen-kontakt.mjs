import fs from 'fs';
import sharp from 'sharp';

const S = new URL('.', import.meta.url).pathname.replace(/\/$/, '');
const SRC = S + '/frames';
const files = fs.readdirSync(SRC).sort();

// hero: jedan kadar, i tri iz sekvence za "kako radimo"
const b64 = async (f, w, q) => 'data:image/webp;base64,' +
  (await sharp(SRC + '/' + f).resize(w, Math.round(w * 9 / 16), { fit: 'cover' }).webp({ quality: q }).toBuffer()).toString('base64');

const hero = await b64(files[6], 1100, 72);
const steps = [await b64(files[0], 520, 64), await b64(files[26], 520, 64), await b64(files[54], 520, 64)];

const SYM = [
  { t: 'Neće upaliti', s: 'Ne pali, škljoca, slabo okreće', a: 'Najčešće akumulator, alternator ili starter. Provjera sistema punjenja traje desetak minuta i besplatna je — tek onda znamo šta se mijenja.' },
  { t: 'Klima ne hladi', s: 'Duva toplo ili slabo', a: 'Prvo tražimo curenje pod pritiskom. Punjenje bez toga je bacanje novca jer plin izađe za par sedmica.' },
  { t: 'Lampica na tabli', s: 'Motor, ABS, airbag', a: 'Očitamo grešku i kažemo tačno šta je prije nego išta dodirnemo. Lampica je posljedica — tražimo uzrok.' },
  { t: 'Troši previše', s: 'Slaba snaga, veća potrošnja', a: 'Obično senzor koji laže — lambda, MAF ili MAP. Live data pokazuje koji šalje pogrešnu vrijednost pod opterećenjem.' },
  { t: 'Ne radi struja', s: 'Podizač, brava, svjetlo', a: 'Kvar je rijetko tamo gdje se vidi. Tražimo od izvora struje do potrošača — prekidač, motorić ili instalacija u vratima.' },
  { t: 'Problem s ključem', s: 'Izgubljen, ne otključava', a: 'Programiramo ključeve i daljinske za većinu marki. Ako auto ne prepoznaje ključ, obično je antena oko brave ili modul.' },
];

const SVC = [
  ['🖥️', 'Kompjuterska dijagnostika', 'Očitavanje grešaka, live data, svi protokoli'],
  ['❄️', 'Servis klime', 'Detekcija curenja, punjenje, dezinfekcija'],
  ['🔋', 'Starteri i alternatori', 'Sistem punjenja, remont, zamjena'],
  ['🔌', 'Elektro instalacije', 'Kratki spojevi, rekabliranje, dodatna oprema'],
  ['🔑', 'Ključevi i immobilizer', 'Programiranje, daljinski, centralna brava'],
  ['⚙️', 'Chip tuning', 'Stage 1 i 2, DPF / EGR / AdBlue'],
];

const html = `<title>Autoelektrika E-Drive Gradačac — dijagnostika i popravka</title>
<style>
:root{
  --ink:#0A0D10; --paper:#fff; --sunk:#F3F6F7; --rule:#E2E7EA; --dim:#4C555D; --faint:#8A939B;
  --brand:#0D5A6E; --deep:#04222C; --gold:#C79A46; --ok:#177249;
  --sans:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;
  --mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;
  --serif:Charter,"Iowan Old Style",Georgia,serif;
}
@media (prefers-color-scheme:dark){:root{--ink:#EEF1F3;--paper:#090C0E;--sunk:#12171A;--rule:#222A30;
  --dim:#9AA4AC;--faint:#6A737B;--brand:#4FB8CE;--deep:#02161D;--gold:#DDB265;--ok:#43BE85;}}
:root[data-theme="dark"]{--ink:#EEF1F3;--paper:#090C0E;--sunk:#12171A;--rule:#222A30;--dim:#9AA4AC;
  --faint:#6A737B;--brand:#4FB8CE;--deep:#02161D;--gold:#DDB265;--ok:#43BE85;}
:root[data-theme="light"]{--ink:#0A0D10;--paper:#fff;--sunk:#F3F6F7;--rule:#E2E7EA;--dim:#4C555D;
  --faint:#8A939B;--brand:#0D5A6E;--deep:#04222C;--gold:#C79A46;--ok:#177249;}

*{box-sizing:border-box}
html{overflow-x:clip;scroll-behavior:auto}
body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--sans);line-height:1.5;
  -webkit-font-smoothing:antialiased;overflow-x:clip;padding-bottom:78px}
.w{max-width:720px;margin:0 auto;padding:0 20px}
.note{background:var(--ink);color:var(--paper);font-family:var(--mono);font-size:10.5px;
  padding:7px 16px;text-align:center;line-height:1.4}

/* HERO */
.hero{position:relative;overflow:hidden;background:var(--deep);color:#fff;padding:26px 0 30px}
.hero img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.34}
.hero::after{content:"";position:absolute;inset:0;
  background:linear-gradient(175deg,#04222Ccc 0%,#04222Ce6 62%,#04222C 100%)}
.hero .in{position:relative;z-index:2}
.open{display:inline-flex;align-items:center;gap:7px;background:#ffffff1c;border:1px solid #ffffff2e;
  border-radius:99px;padding:6px 13px;font:600 12.5px var(--sans)}
.open i{width:7px;height:7px;border-radius:50%;background:#4ADE80;font-style:normal;
  box-shadow:0 0 0 0 #4ADE8099;animation:pl 2.6s infinite}
@keyframes pl{70%{box-shadow:0 0 0 8px #4ADE8000}100%{box-shadow:0 0 0 0 #4ADE8000}}
.hero h1{font-size:clamp(29px,7.6vw,44px);font-weight:800;letter-spacing:-.038em;line-height:1.05;
  margin:15px 0 10px;text-wrap:balance}
.hero p.sub{font-family:var(--serif);font-size:16px;line-height:1.5;opacity:.88;margin:0 0 22px;max-width:34ch}
.cta{display:flex;gap:9px}
.bc{flex:1;background:#fff;color:var(--deep);text-decoration:none;font-weight:800;font-size:17px;
  padding:16px;border-radius:13px;text-align:center;letter-spacing:-.015em;
  box-shadow:0 5px 20px #0005;transition:transform .15s}
.bc:active{transform:scale(.98)}
.bw{flex:0 0 60px;background:#ffffff1c;border:1px solid #ffffff33;border-radius:13px;
  display:grid;place-items:center;font-size:22px;text-decoration:none;transition:background-color .18s}
.bw:hover{background:#ffffff30}
.hmeta{display:flex;gap:15px;margin-top:15px;font:600 11.5px var(--mono);color:#ffffffab;flex-wrap:wrap}

section{padding:42px 0}
.lbl{font:800 10.5px var(--sans);letter-spacing:.14em;text-transform:uppercase;color:var(--gold);margin:0 0 7px}
h2{font-size:clamp(23px,4.6vw,30px);font-weight:800;letter-spacing:-.03em;margin:0 0 8px;text-wrap:balance}
.intro{font-family:var(--serif);font-size:15.5px;color:var(--dim);margin:0 0 22px;line-height:1.55;max-width:50ch}

/* SIMPTOMI — boks se otvara na klik */
.syms{display:grid;gap:8px}
.sy{border:1px solid var(--rule);border-radius:14px;background:var(--paper);overflow:hidden;
  transition:border-color .22s,box-shadow .22s}
.sy.on{border-color:var(--brand);box-shadow:0 8px 26px #0000000f}
.syh{width:100%;display:flex;align-items:center;gap:13px;padding:16px 17px;background:none;border:0;
  cursor:pointer;text-align:left;font-family:inherit;min-height:56px}
.syh b{font-size:15.5px;font-weight:700;letter-spacing:-.015em;display:block;color:var(--ink)}
.syh span{font-size:12.5px;color:var(--dim);display:block;margin-top:2px}
.syh em{margin-left:auto;font-style:normal;font-size:19px;color:var(--brand);
  transition:transform .28s cubic-bezier(.2,.9,.3,1);flex:0 0 auto}
.sy.on .syh em{transform:rotate(45deg)}
.syb{display:grid;grid-template-rows:0fr;transition:grid-template-rows .3s cubic-bezier(.2,.9,.3,1)}
.sy.on .syb{grid-template-rows:1fr}
.syb>div{overflow:hidden}
.syb p{font-family:var(--serif);font-size:14.5px;line-height:1.6;color:var(--dim);margin:0 17px 14px}
.syb a{display:inline-flex;align-items:center;gap:7px;margin:0 17px 17px;background:var(--brand);
  color:#fff;text-decoration:none;font-weight:700;font-size:14.5px;padding:12px 20px;border-radius:11px}

/* KAKO RADIMO */
.steps{display:grid;gap:12px}
.st{display:grid;grid-template-columns:74px 1fr;gap:14px;align-items:center;
  border:1px solid var(--rule);border-radius:14px;padding:12px;background:var(--paper)}
.st img{width:74px;height:42px;object-fit:cover;border-radius:8px;display:block}
.st b{display:block;font-size:15px;font-weight:700;letter-spacing:-.015em;margin-bottom:2px}
.st span{font-size:13px;color:var(--dim);line-height:1.42}

/* USLUGE */
.svcs{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:9px}
.sv{display:flex;gap:12px;align-items:flex-start;border:1px solid var(--rule);border-radius:13px;
  padding:15px 15px;background:var(--paper);transition:border-color .2s,transform .2s}
.sv:hover{border-color:var(--brand);transform:translateY(-2px)}
.sv i{font-style:normal;font-size:19px;flex:0 0 auto}
.sv b{display:block;font-size:14.5px;font-weight:700;letter-spacing:-.015em;margin-bottom:2px}
.sv span{font-size:12.5px;color:var(--dim);line-height:1.4}

/* PRIJE / POSLIJE */
.ba{position:relative;border-radius:16px;overflow:hidden;aspect-ratio:4/3;background:var(--sunk);
  border:1px solid var(--rule);touch-action:none;cursor:ew-resize;user-select:none}
.ba div{position:absolute;inset:0;display:grid;place-items:center;color:#fff;text-align:center;
  font-family:var(--mono);font-size:12px;line-height:1.6;padding:18px}
.baL{background:linear-gradient(140deg,#5E4A3E,#2B211B)}
.baR{background:linear-gradient(140deg,var(--brand),var(--deep));clip-path:inset(0 0 0 50%)}
.baH{position:absolute;top:0;bottom:0;left:50%;width:2px;background:#fff;box-shadow:0 0 10px #0007;
  display:block!important;inset:auto}
.baH::after{content:"⇤⇥";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
  background:#fff;color:var(--ink);font-size:14px;width:48px;height:48px;border-radius:50%;
  display:grid;place-items:center;box-shadow:0 3px 12px #0005;letter-spacing:-2px}

/* KONTAKT */
.info{display:grid;gap:1px;background:var(--rule);border:1px solid var(--rule);border-radius:15px;overflow:hidden}
.info a,.info div{background:var(--paper);padding:16px 17px;display:flex;gap:14px;align-items:center;
  font-size:15.5px;text-decoration:none;color:var(--ink);min-height:58px;transition:background-color .18s}
.info a:hover{background:var(--sunk)}
.info b{flex:0 0 84px;color:var(--faint);font:800 10.5px var(--mono);letter-spacing:.1em;text-transform:uppercase}
.info a strong{color:var(--brand);font-weight:800}
.info a em{margin-left:auto;font-style:normal;color:var(--brand);font-size:17px}

.bar{position:fixed;left:0;right:0;bottom:0;z-index:60;
  background:color-mix(in srgb,var(--paper) 93%,transparent);backdrop-filter:blur(16px);
  border-top:1px solid var(--rule);padding:10px 20px 12px}
.bar .in{max-width:720px;margin:0 auto;display:flex;gap:10px;align-items:center}
.bar .t{flex:1;min-width:0}
.bar .t b{display:block;font-size:14px;font-weight:800;letter-spacing:-.015em}
.bar .t span{font-size:11.5px;color:var(--dim)}
.bar a{background:var(--brand);color:#fff;text-decoration:none;font-weight:800;font-size:15.5px;
  padding:13px 24px;border-radius:12px;white-space:nowrap;min-height:48px;display:grid;place-items:center}
footer{padding:24px 0 30px;font:500 11.5px var(--mono);color:var(--faint);text-align:center}

@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}
  .syb{transition:none}.sy.on .syb{grid-template-rows:1fr}}
</style>

<div class="note">DEMO · prave slike radionice i pravi broj telefona se ubacuju prije objave</div>

<header class="hero">
  <img src="${hero}" alt="Automobil u servisu — Autoelektrika E-Drive, Gradačac">
  <div class="in w">
    <span class="open"><i></i> Otvoreno — zatvara u 17:00</span>
    <h1>Auto elektrika i dijagnostika, Gradačac</h1>
    <p class="sub">Kvar na struji, klimi ili elektronici — nađemo uzrok isti dan.</p>
    <div class="cta">
      <a class="bc" href="tel:+38762844979">Pozovi odmah</a>
      <a class="bw" href="https://wa.me/38762844979" aria-label="Pošalji WhatsApp poruku">💬</a>
    </div>
    <div class="hmeta"><span>SARAJEVSKA BB</span><span>PON–PET 08–16</span><span>SUB 08–15</span></div>
  </div>
</header>

<main>
<section><div class="w">
  <p class="lbl">Počni ovdje</p>
  <h2>Šta se dešava s autom?</h2>
  <p class="intro">Ne moraš znati naziv usluge. Dodirni ono što ti se dešava — kažemo šta je najčešći uzrok.</p>
  <div class="syms" id="syms"></div>
</div></section>

<section style="background:var(--sunk)"><div class="w">
  <p class="lbl">Kako radimo</p>
  <h2>Nalaz prije popravke</h2>
  <p class="intro">Dio se ne mijenja dok se ne dokaže da je pokvaren.</p>
  <div class="steps">
    <div class="st"><img src="${steps[0]}" alt="Vozilo dolazi u servis"><div><b>1 · Simptom</b><span>Opišeš šta se dešava, mi pitamo par pitanja koja sužavaju krug.</span></div></div>
    <div class="st"><img src="${steps[1]}" alt="Rastavljanje i dijagnostika sistema vozila"><div><b>2 · Mjerenje</b><span>Čitamo svaki modul posebno i tražimo koji zaista prijavljuje grešku.</span></div></div>
    <div class="st"><img src="${steps[2]}" alt="Svi sistemi vozila prikazani odvojeno"><div><b>3 · Nalaz i cijena</b><span>Dobiješ šta je u kvaru i koliko košta — prije nego išta radimo.</span></div></div>
  </div>
</div></section>

<section><div class="w">
  <p class="lbl">Usluge</p>
  <h2>Šta radimo</h2>
  <div class="svcs">${SVC.map(([i, t, d]) => `<div class="sv"><i>${i}</i><div><b>${t}</b><span>${d}</span></div></div>`).join('')}</div>
</div></section>

<section style="background:var(--sunk)"><div class="w">
  <p class="lbl">Dokaz</p>
  <h2>Prije i poslije</h2>
  <p class="intro">Svaki popravak fotografišemo iz iste tačke. Prevuci prstom preko slike.</p>
  <div class="ba" id="ba">
    <div class="baL">PRIJE<br><small style="opacity:.75">njegova stvarna slika</small></div>
    <div class="baR" id="baR">POSLIJE<br><small style="opacity:.75">ista tačka, isti kadar</small></div>
    <span class="baH" id="baH"></span>
  </div>
</div></section>

<section><div class="w">
  <p class="lbl">Kontakt</p>
  <h2>Javi se</h2>
  <p class="intro">Nazovi i opiši kvar — kažemo odmah da li možemo i koliko okvirno traje.</p>
  <div class="info">
    <a href="tel:+38762844979"><b>Telefon</b><strong>062 / 844-979</strong><em>›</em></a>
    <a href="https://wa.me/38762844979"><b>WhatsApp</b><span>Pošalji sliku kvara</span><em>›</em></a>
    <a href="https://maps.google.com/?q=Sarajevska+bb%2C+75320+Grada%C4%8Dac"><b>Adresa</b><span>Sarajevska bb, 75320 Gradačac</span><em>›</em></a>
    <div><b>Radno</b><span>Pon–Pet 08–16 · Sub 08–15 · Ned neradna</span></div>
  </div>
</div></section>
</main>

<div class="bar"><div class="in">
  <div class="t"><b>Kvar na autu?</b><span>Javi se, kažemo odmah da li možemo</span></div>
  <a href="tel:+38762844979">Pozovi</a>
</div></div>

<footer>Autoelektrika E-Drive · Gradačac</footer>

<script>
const SYM=${JSON.stringify(SYM)};
document.getElementById('syms').innerHTML=SYM.map((s,i)=>
 '<div class="sy" data-i="'+i+'">'+
 '<button class="syh" aria-expanded="false" aria-controls="b'+i+'"><span><b>'+s.t+'</b><span>'+s.s+'</span></span><em>+</em></button>'+
 '<div class="syb" id="b'+i+'"><div><p>'+s.a+'</p>'+
 '<a href="tel:+38762844979">Pozovi i opiši →</a></div></div></div>').join('');

document.querySelectorAll('.sy').forEach(el=>{
  const btn=el.querySelector('.syh');
  btn.addEventListener('click',()=>{
    const open=el.classList.contains('on');
    document.querySelectorAll('.sy.on').forEach(o=>{o.classList.remove('on');
      o.querySelector('.syh').setAttribute('aria-expanded','false')});
    if(!open){el.classList.add('on');btn.setAttribute('aria-expanded','true')}
  });
});

(()=>{const w=document.getElementById('ba'),r=document.getElementById('baR'),h=document.getElementById('baH');
 const set=p=>{p=Math.max(0,Math.min(100,p));r.style.clipPath='inset(0 0 0 '+p+'%)';h.style.left=p+'%'};
 let d=false;const at=e=>{const b=w.getBoundingClientRect();set(((e.clientX-b.left)/b.width)*100)};
 w.addEventListener('pointerdown',e=>{d=true;w.setPointerCapture(e.pointerId);at(e)});
 w.addEventListener('pointermove',e=>{if(d)at(e)});
 w.addEventListener('pointerup',()=>d=false);w.addEventListener('pointercancel',()=>d=false);})();
</script>`;

fs.writeFileSync(S + '/edrive-kontakt.html', html);
console.log('napisano edrive-kontakt.html · ' + (html.length / 1024).toFixed(0) + ' KB');

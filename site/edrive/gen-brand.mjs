import fs from 'fs';
import sharp from 'sharp';

const S = new URL('.', import.meta.url).pathname.replace(/\/$/, '');
const SRC = S + '/frames';
const files = fs.readdirSync(SRC).sort();

const frames = [];
for (const f of files) {
  const b = await sharp(SRC + '/' + f).resize(880, 495, { fit: 'cover' }).webp({ quality: 60, effort: 6 }).toBuffer();
  frames.push('data:image/webp;base64,' + b.toString('base64'));
}
const poster = 'data:image/webp;base64,' +
  (await sharp(SRC + '/' + files[0]).resize(1280, 720, { fit: 'cover' }).webp({ quality: 74 }).toBuffer()).toString('base64');

/* Kontakt — jedno mjesto istine.
   Dok je PHONE null, svako dugme vodi na Instagram: to je jedini kanal za koji je
   provjereno da postoji. Kad pravi broj stigne iz istrazivackog dokumenta, upisi ga
   ovdje i cijela stranica se povuce sama — nigdje nema rucno upisanog broja. */
const PHONE = '+38762844979';                        // 062/844-979 — potvrđeno: IG, FB, Kupci.com, Akta.ba
const IG    = 'https://www.instagram.com/edrive.servis/';
const CONTACT           = PHONE ? 'tel:' + PHONE : IG;
const CONTACT_ALT       = PHONE ? 'https://wa.me/' + PHONE.replace(/\D/g, '') : IG;
const CONTACT_LABEL     = PHONE ? 'Pozovi odmah' : 'Piši nam na Instagramu';
const CONTACT_SHORT     = PHONE ? 'Pozovi' : 'Instagram';
const CONTACT_ALT_LABEL = PHONE ? 'WhatsApp' : 'Otvori profil';
const CONTACT_ROW_LABEL = PHONE ? 'Telefon' : 'Instagram';
const CONTACT_DISPLAY   = PHONE || '@edrive.servis';

const SERVICES = [
  { id: 'autoelektrika', ico: '⚡', t: 'Autoelektrika', d: 'Popravke električnih kvarova na svim vozilima.',
    long: 'Kvar na instalaciji rijetko je tamo gdje se simptom vidi. Traži se od izvora struje do potrošača, pa se popravlja ono što je stvarno u kvaru.' },
  { id: 'dijagnostika', ico: '🖥️', t: 'Dijagnostika za sva vozila', d: 'Svaki modul se čita posebno.',
    long: 'Priključimo se na vozilo i pročitamo svaki upravljački modul zasebno. Live data pokazuje šta senzor stvarno šalje, ne šta bi trebao.' },
  { id: 'kljucevi', ico: '🔑', t: 'Izrada ključeva', d: 'Ključevi i daljinski za većinu marki.',
    long: 'Izrada i programiranje ključeva. Immobilizer koji ne prepoznaje ključ obično je antena oko brave ili modul, a ne sam ključ.' },
  { id: 'kodiranje', ico: '🧩', t: 'Kodiranje', d: 'Kodiranje i aktivacije skrivenih funkcija.',
    long: 'Kodiranje nakon zamjene dijela je obavezno — dio bez kodiranja je mrtav dio. Radimo i aktivacije tvorničkih funkcija koje nisu uključene.' },
  { id: 'elektronika', ico: '🔌', t: 'Programiranje i zamjena elektronike', d: 'Moduli se popravljaju, ne samo mijenjaju.',
    long: 'Programiranje i zamjena upravljačkih jedinica. Gdje se modul može popraviti, popravlja se — zamjena je zadnja opcija, ne prva.' },
  { id: 'igla', ico: '🛡️', t: 'IGLA zaštita', d: 'Elektronska zaštita vozila od krađe.',
    long: 'Ugradnja IGLA elektronske zaštite. Sistem radi kroz originalnu elektroniku vozila, bez dodatnih tastera i bez rezanja instalacije. Ugrađeno na BMW X2 U10 i BMW X5.' },
  { id: 'stage', ico: '🏁', t: 'Pojačavanje snage (Stage 1)', d: 'Remap, Hot Start Fix, Vmax OFF.',
    long: 'Stage 1 na serijskom motoru. Primjer: Audi SQ5 3.0 V6 TFSI — 345 na 402 KS, 440 na 520 Nm, uz Pop & Bang i Rev limiter OFF. Radimo i Hot Start Fix i Vmax OFF.' },
  { id: 'softver', ico: '⚙️', t: 'AdBlue · DPF · EGR', d: 'SCR, TVA, SWIRL, FLAPS — softverski.',
    long: 'Softverska rješenja za AdBlue, SCR, DPF, EGR, TVA, SWIRL i FLAPS. Primjer: BMW M3 Competition — OPF delete softverski, bez diranja ECU zaštite i bez check engine lampica.' },
];

const html = `<title>Autoelektrika E-Drive — Gradačac</title>
<style>
:root{
  --ink:#07090B; --paper:#fff; --sunk:#F5F7F8; --rule:#E4E8EB; --dim:#4E575F; --faint:#8A939B;
  --brand:#F5A623; --deep:#0A0A0A; --gold:#F5A623;
  --sans:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;
  --mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;
  --serif:Charter,"Iowan Old Style",Georgia,serif;
}
@media (prefers-color-scheme:dark){:root{--ink:#EEF1F3;--paper:#080B0D;--sunk:#11161A;--rule:#212A30;
  --dim:#9AA4AC;--faint:#6A737B;--brand:#F5A623;--deep:#0A0A0A;--gold:#F5A623;}}
:root[data-theme="dark"]{--ink:#EEF1F3;--paper:#080B0D;--sunk:#11161A;--rule:#212A30;--dim:#9AA4AC;
  --faint:#6A737B;--brand:#F5A623;--deep:#0A0A0A;--gold:#F5A623;}
:root[data-theme="light"]{--ink:#07090B;--paper:#fff;--sunk:#F5F7F8;--rule:#E4E8EB;--dim:#4E575F;
  --faint:#8A939B;--brand:#F5A623;--deep:#0A0A0A;--gold:#F5A623;}

*{box-sizing:border-box}
html{overflow-x:clip}
body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--sans);line-height:1.5;
  -webkit-font-smoothing:antialiased;overflow-x:clip}
.w{max-width:1080px;margin:0 auto;padding:0 22px}
/* nav je fixed na top:0 i inace legne preko ove trake — zato joj gornji prostor za nav */
.note{background:var(--ink);color:var(--paper);font-family:var(--mono);font-size:10.5px;
  padding:56px 18px 7px;text-align:center;line-height:1.4}

/* nav */
.nav{position:fixed;top:0;left:0;right:0;z-index:70;padding:14px 0;
  transition:background-color .25s,border-color .25s,backdrop-filter .25s;
  border-bottom:1px solid transparent;will-change:background-color}
.nav.on{background:color-mix(in srgb,var(--paper) 90%,transparent);backdrop-filter:blur(16px);
  border-bottom-color:var(--rule)}
.nav .in{max-width:1080px;margin:0 auto;padding:0 22px;display:flex;align-items:center;gap:16px}
.brandmark{font-weight:800;letter-spacing:-.04em;font-size:18px;color:#fff;transition:color .25s}
.nav.on .brandmark{color:var(--ink)}
.brandmark s{text-decoration:none;color:var(--gold)}
.navcall{margin-left:auto;background:var(--brand);color:#fff;text-decoration:none;font-weight:700;
  font-size:13.5px;padding:9px 17px;border-radius:99px;white-space:nowrap;
  transform:translateY(-60px);opacity:0;transition:transform .3s cubic-bezier(.2,.9,.3,1),opacity .3s}
.nav.on .navcall{transform:none;opacity:1}

/* HERO — JEDNA animacija, preko cijelog prozora, na obje orijentacije */
.hero{position:relative;height:230vh;background:var(--deep)}
.heroPin{position:sticky;top:0;height:100svh;min-height:520px;overflow:hidden}
.heroCanvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.heroImg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
/* Auto je svijetao, tekst je bijel — veo mora imati pod i na vrhu i pri dnu,
   a sredina ostaje bistra da se rasklapanje vidi. */
.heroVeil{position:absolute;inset:0;background:
  linear-gradient(180deg,#0A0A0Af2 0%,#0A0A0A94 26%,#0A0A0A3d 50%,#0A0A0Aa8 78%,#0A0A0Afa 100%)}
.heroIn{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;
  color:#fff;z-index:3;opacity:var(--ho,1);pointer-events:none}
.heroIn a{pointer-events:auto}
/* uspravno: kadar 16:9 sjedi u sredini prozora — tekst se dize iznad njega */
@media (max-aspect-ratio:1/1){.heroIn{justify-content:flex-start;padding-top:13vh}}
.eyebrow{font:700 10.5px var(--mono);letter-spacing:.2em;text-transform:uppercase;color:var(--gold);
  margin:0 0 18px;text-shadow:0 1px 12px #0A0A0A}
.hero h1,.hero .sub{text-shadow:0 2px 20px #0A0A0Ad9}
.hero h1{font-size:clamp(38px,9vw,86px);font-weight:800;letter-spacing:-.045em;line-height:.98;
  margin:0 0 18px;text-wrap:balance;max-width:15ch}
.hero h1 b{display:block;color:var(--brand);font-weight:800}
.hero .sub{font-family:var(--serif);font-size:clamp(15px,2.4vw,19px);line-height:1.5;opacity:.85;
  max-width:40ch;margin:0 0 28px}
.heroCta{display:flex;gap:10px;flex-wrap:wrap}
.bCall{background:#fff;color:var(--deep);text-decoration:none;font-weight:800;font-size:16px;
  padding:15px 30px;border-radius:99px;letter-spacing:-.015em;box-shadow:0 6px 26px #0006;
  transition:transform .16s}
.bCall:active{transform:scale(.97)}
.bGhost{border:1px solid #ffffff4d;color:#fff;text-decoration:none;font-weight:600;font-size:15px;
  padding:15px 26px;border-radius:99px;transition:background-color .2s}
.bGhost:hover{background:#ffffff1a}
.hMeta{position:absolute;left:0;right:0;bottom:22px;z-index:3;font:600 11px var(--mono);
  letter-spacing:.06em;color:#ffffffb3;display:flex;gap:20px;flex-wrap:wrap;opacity:var(--ho,1)}
.progress{position:absolute;left:0;bottom:0;height:2px;background:var(--brand);z-index:4;
  width:calc(var(--p,0)*100%)}

/* koraci rasklapanja — preuzimaju kad hero tekst izblijedi */
.seqTxt{position:absolute;left:0;right:0;bottom:9vh;z-index:3;text-align:center;padding:0 22px;
  color:#fff;opacity:var(--so,0)}
.seqTxt b{display:block;font-size:clamp(23px,4.6vw,40px);font-weight:800;letter-spacing:-.035em;
  line-height:1.06;margin:0 auto 10px;max-width:20ch;text-wrap:balance;text-shadow:0 2px 18px #0A0A0A}
.seqTxt span{font-family:var(--serif);font-size:15.5px;color:#ffffffe0;line-height:1.55;
  display:block;max-width:44ch;margin:0 auto;text-shadow:0 1px 14px #0A0A0A}

section{padding:76px 0}
.lbl{font:800 10.5px var(--sans);letter-spacing:.15em;text-transform:uppercase;color:var(--gold);margin:0 0 10px}
h2{font-size:clamp(27px,4.6vw,42px);font-weight:800;letter-spacing:-.035em;margin:0 0 12px;text-wrap:balance}
.intro{font-family:var(--serif);font-size:16.5px;color:var(--dim);max-width:52ch;margin:0 0 34px;line-height:1.6}

/* BOKSOVI — hover otkriva, klik vodi */
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px}
.box{position:relative;border:1px solid var(--rule);border-radius:16px;padding:24px 22px;
  background:var(--paper);cursor:pointer;overflow:hidden;text-align:left;font-family:inherit;
  transition:transform .3s cubic-bezier(.2,.8,.3,1),border-color .3s,box-shadow .3s;
  will-change:transform}
.box::after{content:"";position:absolute;inset:0;opacity:0;transition:opacity .34s;pointer-events:none;
  background:radial-gradient(120% 90% at 50% 0%,color-mix(in srgb,var(--brand) 16%,transparent),transparent 62%)}
.box:hover,.box:focus-visible{transform:translateY(-4px);border-color:var(--brand);
  box-shadow:0 14px 34px #00000012;outline:none}
.box:hover::after,.box:focus-visible::after{opacity:1}
.box i{font-style:normal;font-size:23px;display:block;margin-bottom:12px}
.box b{display:block;font-size:17px;font-weight:700;letter-spacing:-.02em;margin-bottom:5px;position:relative}
.box p{margin:0;font-size:13.5px;color:var(--dim);line-height:1.45;position:relative}
.box .go{position:relative;display:inline-block;margin-top:14px;font:700 12px var(--mono);
  color:var(--brand);transform:translateX(-6px);opacity:0;transition:all .3s}
.box:hover .go,.box:focus-visible .go{transform:none;opacity:1}

/* iskocni prozor */
.pop{position:fixed;inset:0;z-index:95;display:none;place-items:center;padding:20px;
  background:#0a0a0acc;backdrop-filter:blur(6px)}
.pop.on{display:grid}
.popIn{background:var(--paper);border-radius:20px;max-width:520px;width:100%;padding:30px 28px 26px;
  position:relative;box-shadow:0 30px 80px #0006;animation:popup .3s cubic-bezier(.2,.9,.3,1)}
@keyframes popup{from{opacity:0;transform:translateY(14px) scale(.97)}to{opacity:1;transform:none}}
.popIn i{font-style:normal;font-size:30px;display:block;margin-bottom:12px}
.popIn h3{font-size:24px;font-weight:800;letter-spacing:-.03em;margin:0 0 12px}
.popIn p{font-family:var(--serif);font-size:16px;line-height:1.62;color:var(--dim);margin:0 0 22px}
.popX{position:absolute;top:14px;right:14px;width:44px;height:44px;border-radius:50%;border:0;
  background:var(--sunk);color:var(--ink);font-size:19px;cursor:pointer;display:grid;place-items:center}
.popCta{display:flex;gap:9px;flex-wrap:wrap}
.popCta a{flex:1;min-width:130px;text-align:center;text-decoration:none;font-weight:700;font-size:15px;
  padding:14px;border-radius:11px}
.popCta .p{background:var(--brand);color:#fff}
.popCta .s{background:var(--sunk);color:var(--ink)}

/* rezultat sa brojkama — stvarno mjerenje, ne lažna fotografija */
.baWrap{position:relative;min-height:100svh;background:var(--deep);overflow:hidden;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6vh;padding:80px 22px}
.baCap{position:relative;z-index:4;text-align:center;color:#fff}
.baCap b{display:block;font-size:clamp(22px,4vw,38px);font-weight:800;letter-spacing:-.03em;margin-top:8px}
.baCap span{font:600 11px var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--gold)}
.baNums{display:flex;gap:clamp(28px,7vw,90px);flex-wrap:wrap;justify-content:center}
.baNums div{text-align:center;color:#fff}
.baNums i{font-style:normal;font-weight:800;font-size:clamp(34px,8vw,68px);letter-spacing:-.04em;
  font-variant-numeric:tabular-nums;opacity:.45}
.baNums i.up{opacity:1;color:var(--brand)}
.baNums s{text-decoration:none;font-size:clamp(20px,4vw,34px);margin:0 .35em;opacity:.5}
.baNums span{display:block;margin-top:6px;font:600 10.5px var(--mono);letter-spacing:.16em;color:#ffffff8c}
.baFine{position:relative;z-index:4;font:600 12px var(--mono);color:#ffffff9e;text-align:center;margin:0}

.quote{background:var(--sunk)}
.quote blockquote{margin:0;font-family:var(--serif);font-size:clamp(19px,3.4vw,28px);line-height:1.42;
  letter-spacing:-.02em;max-width:22ch}
.quote cite{display:block;margin-top:18px;font:600 12px var(--mono);color:var(--faint);font-style:normal}

.foot{background:var(--deep);color:#fff;padding:64px 0 40px}
.foot h2{color:#fff;margin-bottom:16px}
.foot .row{display:flex;gap:34px;flex-wrap:wrap;margin-bottom:32px;font-size:15px}
.foot .row div b{display:block;font:700 10.5px var(--mono);letter-spacing:.12em;text-transform:uppercase;
  color:var(--gold);margin-bottom:5px}
.foot a{color:#fff}
.foot .bCall{color:var(--deep)}   /* inace bijelo na bijelom — dugme nestane */
.foot .fine{font:500 11.5px var(--mono);color:#ffffff59;border-top:1px solid #ffffff1f;padding-top:20px}

@media (prefers-reduced-motion:reduce){
  *{animation:none!important;transition:none!important}
  .hero{height:100svh}
  .heroPin{position:static;height:100%}
  .heroIn{opacity:1!important}
  /* bez skrola koraci nemaju redoslijed — ostaje samo hero tekst, da se ne preklapaju */
  .seqTxt{display:none}
  /* jedan statican kadar ispod teksta — veo mora biti jaci nego kad se krece */
  .heroVeil{background:linear-gradient(180deg,#0A0A0Af7 0%,#0A0A0Ad9 50%,#0A0A0Afa 100%)}
  .navcall{transform:none;opacity:1}
  .box .go{transform:none;opacity:1}
}
</style>


<nav class="nav" id="nav"><div class="in">
  <span class="brandmark">E<s>—</s>DRIVE</span>
  <a class="navcall" href="${CONTACT}">${CONTACT_SHORT}</a>
</div></nav>

<header class="hero" id="hero">
  <div class="heroPin" id="heroPin">
    <img class="heroImg" id="heroImg" src="${poster}" alt="Automobil rasklopljen na sastavne dijelove — Autoelektrika E-Drive, Gradačac">
    <canvas class="heroCanvas" id="heroCanvas" style="opacity:0;transition:opacity .5s"></canvas>
    <div class="heroVeil"></div>
    <div class="heroIn"><div class="w">
      <p class="eyebrow">Autoelektrika · Gradačac</p>
      <h1>Ne pogađamo.<b>Mjerimo.</b></h1>
      <p class="sub">Svaki sistem u autu ostavlja trag. Mi ga čitamo — pa mijenjamo samo ono što je
        stvarno u kvaru.</p>
      <div class="heroCta">
        <a class="bCall" href="${CONTACT}">${CONTACT_LABEL}</a>
        <a class="bGhost" href="#usluge">Šta radimo</a>
      </div>
    </div></div>
    <div class="seqTxt"><b id="seqT">Auto je jedan sistem</b><span id="seqB">Struja, senzori, moduli i instalacija rade zajedno. Kad jedno otkaže, simptom se pojavi negdje sasvim drugdje.</span></div>
    <div class="hMeta w"><span>PON–PET 08–16</span><span>SUB 08–15</span><span>SARAJEVSKA BB, GRADAČAC</span></div>
    <div class="progress" id="hprog"></div>
  </div>
</header>

<section id="usluge"><div class="w">
  <p class="lbl">Šta radimo</p>
  <h2>Osam sistema, jedan pristup</h2>
  <p class="intro">Pređi mišem preko bilo kojeg — otvara se šta tačno radimo. Na telefonu dodirni.</p>
  <div class="grid" id="grid"></div>
</div></section>

<section class="baWrap" id="ba">
  <div class="baCap"><span>Mjerljivo</span><b>Audi SQ5 3.0 V6 TFSI — Stage 1</b></div>
  <div class="baNums">
    <div><i>345</i><s>→</s><i class="up">402</i><span>KONJSKIH SNAGA</span></div>
    <div><i>440</i><s>→</s><i class="up">520</i><span>Nm MOMENTA</span></div>
  </div>
  <p class="baFine">Pop &amp; Bang · Rev limiter OFF · bez check engine lampica</p>
</section>

<section class="quote"><div class="w">
  <blockquote>Dio se ne mijenja dok se ne dokaže da je pokvaren.</blockquote>
  <cite>— pravilo radionice</cite>
</div></section>

<footer class="foot"><div class="w">
  <p class="lbl">Kontakt</p>
  <h2>Javi se, kažemo odmah da li možemo</h2>
  <div class="row">
    <div><b>${CONTACT_ROW_LABEL}</b><a href="${CONTACT}">${CONTACT_DISPLAY}</a></div>
    <div><b>Gdje</b>Sarajevska bb, 75320 Gradačac</div>
    <div><b>Radno vrijeme</b>Pon–Pet 08–16 · Sub 08–15 · Ned neradna</div>
    <div><b>Vlasnik</b>Amar Hadžiahmetović</div>
  </div>
  <a class="bCall" href="${CONTACT}" style="display:inline-block">${CONTACT_LABEL}</a>
  <p class="fine" style="margin-top:34px">Autoelektrika E-Drive · Gradačac</p>
</div></footer>

<div class="pop" id="pop" role="dialog" aria-modal="true" aria-labelledby="popH">
  <div class="popIn">
    <button class="popX" id="popX" aria-label="Zatvori">✕</button>
    <i id="popI"></i><h3 id="popH"></h3><p id="popP"></p>
    <div class="popCta">
      <a class="p" href="${CONTACT}">${CONTACT_SHORT}</a>
      <a class="s" href="${CONTACT_ALT}">${CONTACT_ALT_LABEL}</a>
    </div>
  </div>
</div>

<script>
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FR = ${JSON.stringify(frames)};
const SV = ${JSON.stringify(SERVICES)};

/* ---------- boksovi ---------- */
document.getElementById('grid').innerHTML = SV.map((s,i)=>
  '<button class="box" data-i="'+i+'"><i>'+s.ico+'</i><b>'+s.t+'</b><p>'+s.d+'</p>'+
  '<span class="go">Detaljnije →</span></button>').join('');

const pop=document.getElementById('pop');
const open=i=>{const s=SV[i];
  document.getElementById('popI').textContent=s.ico;
  document.getElementById('popH').textContent=s.t;
  document.getElementById('popP').textContent=s.long;
  pop.classList.add('on');document.body.style.overflow='hidden';
  document.getElementById('popX').focus();};
const close=()=>{pop.classList.remove('on');document.body.style.overflow='';};
document.querySelectorAll('.box').forEach(b=>b.addEventListener('click',()=>open(+b.dataset.i)));
document.getElementById('popX').addEventListener('click',close);
pop.addEventListener('click',e=>{if(e.target===pop)close()});
addEventListener('keydown',e=>{if(e.key==='Escape'&&pop.classList.contains('on'))close()});

/* ---------- scrubber: klizni prozor, DPR kapa, redraw na resize ---------- */
function scrubber(canvasEl, getP, mode, BG){
  const cv=canvasEl, ctx=cv.getContext('2d',{alpha:false});
  mode=mode||'auto'; BG=BG||'#F5F7F8';
  const imgs=new Array(FR.length); let ready=0, cur=0, tgt=0, raf=null, live=false, last=0;
  const DPR=Math.min(window.devicePixelRatio||1, 2);

  const load=(i,prio)=>{ if(imgs[i])return; const im=new Image();
    if(prio) im.fetchPriority='high';
    im.onload=()=>{ready++; if(ready===1)paint(0);}; im.src=FR[i]; imgs[i]=im; };
  load(0,true);
  const step=Math.max(1,Math.round(FR.length/8));
  for(let i=0;i<FR.length;i+=step) load(i,true);
  const rest=()=>{ for(let i=0;i<FR.length;i++) if(!imgs[i]) load(i,false); };
  'requestIdleCallback' in window ? requestIdleCallback(rest,{timeout:2500}) : setTimeout(rest,900);

  const nearest=i=>{ i=Math.max(0,Math.min(FR.length-1,i));
    if(imgs[i]&&imgs[i].complete&&imgs[i].naturalWidth)return imgs[i];
    for(let d=1;d<FR.length;d++){
      const a=i-d,b=i+d;
      if(a>=0&&imgs[a]&&imgs[a].complete&&imgs[a].naturalWidth)return imgs[a];
      if(b<FR.length&&imgs[b]&&imgs[b].complete&&imgs[b].naturalWidth)return imgs[b];
    } return null; };

  function size(){ const r=cv.getBoundingClientRect();
    const w=Math.round(r.width*DPR), h=Math.round(r.height*DPR);
    if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;return true} return false; }

  /* D8: cover-fit na uspravnom telefonu odreze 16:9 kadar do neupotrebljivosti.
     Ako bi cover pokazao manje od 62% kadra, uklapamo CIJELI kadar. */
  function paint(i){ const im=nearest(Math.round(i)); if(!im)return;
    size();
    const cw=cv.width, ch=cv.height; if(!cw||!ch)return;
    const ir=im.naturalWidth/im.naturalHeight, cr=cw/ch;
    const survives = ir>cr ? cr/ir : ir/cr;
    ctx.fillStyle=BG; ctx.fillRect(0,0,cw,ch);
    if(mode==='cover' || survives>=0.62){
      let sw,sh,sx,sy;
      if(ir>cr){sh=im.naturalHeight;sw=sh*cr;sx=(im.naturalWidth-sw)/2;sy=0}
      else{sw=im.naturalWidth;sh=sw/cr;sx=0;sy=(im.naturalHeight-sh)/2}
      ctx.drawImage(im,sx,sy,sw,sh,0,0,cw,ch);
    } else {
      const s=Math.min(cw/im.naturalWidth, ch/im.naturalHeight);
      const dw=im.naturalWidth*s, dh=im.naturalHeight*s;
      ctx.drawImage(im,0,0,im.naturalWidth,im.naturalHeight,(cw-dw)/2,(ch-dh)*0.42,dw,dh);
    }
    if(cv.style.opacity==='0') cv.style.opacity='1'; }

  /* vremenski zasnovan lerp — ne ovisi o 60 vs 120 Hz */
  function loop(ts){
    const dt=last?Math.min((ts-last)/1000,.05):.016; last=ts;
    const k=9;                                  // brzina sustizanja
    cur += (tgt-cur)*(1-Math.exp(-k*dt));
    if(Math.abs(tgt-cur)>0.08){ paint(cur); raf=requestAnimationFrame(loop); }
    else { cur=tgt; paint(cur); raf=null; last=0; } }
  const kick=()=>{ if(!raf&&live){ last=0; raf=requestAnimationFrame(loop); } };

  new IntersectionObserver(es=>{ live=es[0].isIntersecting;
    if(live)kick(); else if(raf){cancelAnimationFrame(raf);raf=null} },{rootMargin:'120px'}).observe(cv);

  new ResizeObserver(()=>{ if(size()) paint(cur); }).observe(cv);   // redraw, ne samo resize

  const upd=()=>{ const p=getP(); if(p==null)return;
    tgt=Math.max(0,Math.min(1,p))*(FR.length-1); kick(); };
  addEventListener('scroll',upd,{passive:true}); addEventListener('resize',upd);
  if(RM){ tgt=cur=FR.length-1; setTimeout(()=>paint(cur),60); } else upd();
  return {paint:()=>paint(cur)};
}

/* JEDINA animacija na stranici: puno rasklapanje, preko cijelog prozora.
   Hero tekst blijedi u prvoj petini, koraci ga preuzimaju. */
const heroEl=document.getElementById('hero'), heroPin=document.getElementById('heroPin'),
      heroImg=document.getElementById('heroImg');
const ST=document.getElementById('seqT'), SB=document.getElementById('seqB');
const STEPS=[['Auto je jedan sistem','Struja, senzori, moduli i instalacija rade zajedno. Kad jedno otkaže, simptom se pojavi negdje sasvim drugdje.'],
 ['Zato ne pogađamo','Dijagnostika čita svaki modul posebno i pokazuje koji zaista prijavljuje grešku, a koji samo trpi posljedicu.'],
 ['Mijenjamo samo pokvareno','Nalaz dobiješ prije popravke. Bez zamjene dijelova „za svaki slučaj".']];
let lastStep=-1;
scrubber(document.getElementById('heroCanvas'), ()=>{
  const r=heroEl.getBoundingClientRect();
  const tot=heroEl.offsetHeight-innerHeight;
  const p=Math.max(0,Math.min(1,(-r.top)/(tot||1)));
  heroPin.style.setProperty('--p',p);
  heroPin.style.setProperty('--ho', Math.max(0,1-p/0.16));
  heroPin.style.setProperty('--so', p<0.20?0:Math.min(1,(p-0.20)/0.07));
  if(p>0.01&&heroImg.style.opacity!=='0')heroImg.style.opacity='0';
  const i=p<.40?0:p<.72?1:2;
  if(i!==lastStep){lastStep=i;ST.textContent=STEPS[i][0];SB.textContent=STEPS[i][1];}
  return p; }, 'auto', '#0A0A0A');

/* nav */
let navTick=false;
addEventListener('scroll',()=>{ if(navTick)return; navTick=true;
  requestAnimationFrame(()=>{ document.getElementById('nav').classList.toggle('on',scrollY>60); navTick=false; }); },{passive:true});

/* prije/poslije */
(()=>{ const w=document.getElementById('ba'),r=document.getElementById('baR'),h=document.getElementById('baH');
  const set=p=>{p=Math.max(0,Math.min(100,p));r.style.clipPath='inset(0 0 0 '+p+'%)';h.style.left=p+'%'};
  let d=false; const at=e=>{const b=w.getBoundingClientRect();set(((e.clientX-b.left)/b.width)*100)};
  w.addEventListener('pointerdown',e=>{d=true;w.setPointerCapture(e.pointerId);at(e)});
  w.addEventListener('pointermove',e=>{if(d)at(e)});
  w.addEventListener('pointerup',()=>d=false); w.addEventListener('pointercancel',()=>d=false);
})();
</script>`;

fs.writeFileSync(S + '/edrive-brend.html', html);
console.log('napisano edrive-brend.html');
console.log('veličina: ' + (html.length / 1024 / 1024).toFixed(2) + ' MB');
console.log('frame-ova ugrađeno: ' + frames.length);

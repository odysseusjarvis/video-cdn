import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const OUT = process.argv[2] || '/tmp/pw-verify';
const BASE = 'http://127.0.0.1:5178';
fs.mkdirSync(OUT, { recursive: true });

const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

/** Hash the visible hero pixels so we can prove the frame actually changed. */
async function heroSignature(page) {
  return page.evaluate(() => {
    const c = document.querySelector('canvas');
    if (!c) return { err: 'no canvas' };
    const ctx = c.getContext('2d');
    // Sample a coarse grid; a real frame change moves many of these.
    const pts = [];
    let sum = 0;
    for (let y = 1; y < 8; y++) {
      for (let x = 1; x < 8; x++) {
        const px = ctx.getImageData(
          Math.floor((c.width * x) / 9),
          Math.floor((c.height * y) / 9),
          1,
          1
        ).data;
        pts.push(px[0], px[1], px[2]);
        sum += px[0] + px[1] + px[2];
      }
    }
    let h = 2166136261;
    for (const v of pts) { h ^= v; h = Math.imul(h, 16777619); }
    return { hash: (h >>> 0).toString(16), mean: +(sum / pts.length).toFixed(2), w: c.width, h: c.height };
  });
}

async function scrollToProgress(page, p) {
  await page.evaluate((prog) => {
    const sec = document.querySelector('[data-pw-scrubber]');
    const pin = sec.firstElementChild;
    const travel = sec.getBoundingClientRect().height - pin.offsetHeight;
    const top = sec.offsetTop + travel * prog;
    window.scrollTo(0, top);
  }, p);
  // Let the lerp settle: the loop parks itself once |diff| < 0.05.
  await page.waitForTimeout(700);
}

const report = { steps: [] };
const log = (...a) => { console.log(...a); report.steps.push(a.join(' ')); };

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });

/* ───────────────── 1. SCRUB MODE, desktop ───────────────── */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const consoleMsgs = [];
  const badRequests = [];
  page.on('console', (m) => consoleMsgs.push(`${m.type()}: ${m.text()}`));
  page.on('pageerror', (e) => consoleMsgs.push(`PAGEERROR: ${e.message}`));
  page.on('response', (r) => { if (r.status() >= 400) badRequests.push(`${r.status()} ${r.url()}`); });
  page.on('requestfailed', (r) => badRequests.push(`FAILED ${r.url()}`));

  await page.goto(`${BASE}/?mode=scrub`, { waitUntil: 'load' });
  await page.waitForTimeout(900);

  // Poster must be present as a real <img> with explicit width/height (LCP + CLS).
  const poster = await page.evaluate(() => {
    const img = document.querySelector('[data-pw-scrubber] img');
    return img ? { src: img.getAttribute('src'), w: img.width, h: img.height, fp: img.getAttribute('fetchpriority') } : null;
  });
  log('POSTER', JSON.stringify(poster));

  const sigs = [];
  for (const p of [0, 0.15, 0.3, 0.45, 0.6, 0.75, 1]) {
    await scrollToProgress(page, p);
    const s = await heroSignature(page);
    sigs.push({ p, ...s });
    await page.screenshot({ path: path.join(OUT, `scrub-${String(Math.round(p * 100)).padStart(3, '0')}.png`) });
    log(`scrub p=${p.toFixed(2)}  hash=${s.hash}  mean=${s.mean}  backing=${s.w}x${s.h}`);
  }
  const uniq = new Set(sigs.map((s) => s.hash));
  log(`UNIQUE FRAME HASHES: ${uniq.size} / ${sigs.length}`);
  report.scrubUnique = uniq.size;
  report.scrubSigs = sigs;

  // rAF parking: after settling, the loop must NOT be running.
  const parked = await page.evaluate(() => new Promise((res) => {
    let n = 0; const t0 = performance.now();
    const orig = window.requestAnimationFrame;
    window.requestAnimationFrame = function (cb) { n++; return orig.call(window, cb); };
    setTimeout(() => { window.requestAnimationFrame = orig; res({ rafCalls: n, ms: Math.round(performance.now() - t0) }); }, 1000);
  }));
  log('rAF CALLS WHILE IDLE (1s, settled):', JSON.stringify(parked));
  report.idleRaf = parked;

  // Offscreen parking: scroll far past the hero, count again.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(600);
  const parkedOff = await page.evaluate(() => new Promise((res) => {
    let n = 0; const orig = window.requestAnimationFrame;
    window.requestAnimationFrame = function (cb) { n++; return orig.call(window, cb); };
    setTimeout(() => { window.requestAnimationFrame = orig; res({ rafCalls: n }); }, 1000);
  }));
  log('rAF CALLS WHILE OFFSCREEN (1s):', JSON.stringify(parkedOff));
  report.offscreenRaf = parkedOff;

  // D1: resize must redraw, not blank.
  await scrollToProgress(page, 0.5);
  const before = await heroSignature(page);
  await page.setViewportSize({ width: 900, height: 1200 });
  await page.waitForTimeout(120);           // deliberately short: no scroll happens
  const afterResize = await heroSignature(page);
  await page.screenshot({ path: path.join(OUT, 'scrub-after-resize.png') });
  log(`RESIZE REDRAW  before=${before.hash} mean=${before.mean} (${before.w}x${before.h}) -> after=${afterResize.hash} mean=${afterResize.mean} (${afterResize.w}x${afterResize.h})`);
  report.resize = { before, afterResize };

  // Backward scrub must never blank (sliding-window edge case).
  await page.setViewportSize({ width: 1440, height: 900 });
  const back = [];
  for (const p of [1, 0.8, 0.6, 0.4, 0.2, 0]) {
    await scrollToProgress(page, p);
    const s = await heroSignature(page);
    back.push({ p, hash: s.hash, mean: s.mean });
  }
  log('BACKWARD SCRUB means:', back.map((b) => `${b.p}:${b.mean}`).join(' '));
  report.backward = back;

  // Layout-shift entries during a scripted scroll (Lighthouse never scrolls).
  const cls = await page.evaluate(() => new Promise((res) => {
    const entries = [];
    const po = new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) entries.push(e.value); });
    po.observe({ type: 'layout-shift', buffered: false });
    let y = 0;
    const step = () => {
      y += 160; window.scrollTo(0, y);
      if (y < document.body.scrollHeight) requestAnimationFrame(step);
      else setTimeout(() => { po.disconnect(); res({ count: entries.length, total: entries.reduce((a, b) => a + b, 0) }); }, 400);
    };
    window.scrollTo(0, 0); requestAnimationFrame(step);
  }));
  log('SCROLL-CLS:', JSON.stringify(cls));
  report.cls = cls;

  report.console = consoleMsgs;
  report.badRequests = badRequests;
  log('BAD REQUESTS:', badRequests.length ? JSON.stringify(badRequests) : 'none');
  log('CONSOLE:', JSON.stringify(consoleMsgs.filter((m) => !m.startsWith('debug: [vite]')).slice(0, 8)));
  await ctx.close();
}

/* ───────────────── 2. CROSSFADE / WIPE / PARALLAX ───────────────── */
for (const mode of ['crossfade', 'wipe', 'parallax']) {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(`${BASE}/?mode=${mode}`, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  const sigs = [];
  for (const p of [0.12, 0.3, 0.5, 0.68]) {
    await scrollToProgress(page, p);
    const s = await heroSignature(page);
    sigs.push(`${p}:${s.hash}/${s.mean}`);
    await page.screenshot({ path: path.join(OUT, `${mode}-${Math.round(p * 100)}.png`) });
  }
  const uniq = new Set(sigs.map((s) => s.split(':')[1]));
  log(`${mode.toUpperCase()} sigs -> ${sigs.join('  ')}  unique=${uniq.size}/4  errors=${errs.length}`);
  report[mode] = { sigs, unique: uniq.size, errs };
  await ctx.close();
}

/* ───────────────── 3. REDUCED MOTION ───────────────── */
{
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(`${BASE}/?mode=scrub`, { waitUntil: 'load' });
  await page.waitForTimeout(900);
  const rm = await page.evaluate(() => {
    const sec = document.querySelector('[data-pw-scrubber]');
    const img = sec.querySelector('img');
    return {
      dataMode: sec.getAttribute('data-pw-scrubber'),
      reason: sec.getAttribute('data-pw-reason'),
      sectionH: Math.round(sec.getBoundingClientRect().height),
      docH: document.documentElement.scrollHeight,
      canvasCount: sec.querySelectorAll('canvas').length,
      imgSrc: img && img.getAttribute('src'),
      imgComplete: img && img.complete && img.naturalWidth > 0,
      alt: img && img.getAttribute('alt'),
    };
  });
  log('REDUCED MOTION:', JSON.stringify(rm));
  await page.screenshot({ path: path.join(OUT, 'reduced-motion-top.png') });
  const rmRaf = await page.evaluate(() => new Promise((res) => {
    let n = 0; const orig = window.requestAnimationFrame;
    window.requestAnimationFrame = function (cb) { n++; return orig.call(window, cb); };
    setTimeout(() => { window.requestAnimationFrame = orig; res(n); }, 1000);
  }));
  log('REDUCED MOTION rAF CALLS (1s):', rmRaf);
  report.reduced = { ...rm, rafCalls: rmRaf, errs };
  await ctx.close();
}

/* ───────────────── 4. MOBILE TIER (375px) ───────────────── */
{
  const ctx = await browser.newContext({ viewport: { width: 375, height: 780 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const dbg = [];
  page.on('console', (m) => { if (m.text().includes('[ScrollScrubber]')) dbg.push(m.text()); });
  await page.goto(`${BASE}/?mode=scrub`, { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await scrollToProgress(page, 0.4);
  const s = await heroSignature(page);
  await page.screenshot({ path: path.join(OUT, 'mobile-375.png') });
  const hscroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  log(`MOBILE 375@dpr3 backing=${s.w}x${s.h} (dprCap 1.5 => expect ~562 wide) hash=${s.hash} horizontalScroll=${hscroll}`);
  log('MOBILE DEBUG:', dbg.join(' | '));
  report.mobile = { backing: `${s.w}x${s.h}`, hscroll, dbg };
  await ctx.close();
}

/* ─────── 4b. SLIDING DECODED-FRAME WINDOW (forced on via a 20 MB budget) ─────── */
{
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const page = await ctx.newPage();
  const dbg = [];
  const errs = [];
  page.on('console', (m) => { if (m.text().includes('[ScrollScrubber]')) dbg.push(m.text()); });
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(`${BASE}/?mode=scrub&budget=20`, { waitUntil: 'load' });
  await page.waitForTimeout(900);

  // Forward, then far backward past the evicted edge, then forward again.
  const seq = [];
  for (const p of [0.12, 0.3, 0.5, 0.64, 0.2, 0.12, 0.55]) {
    await scrollToProgress(page, p);
    const s = await heroSignature(page);
    // A blank canvas reads as mean 0 (cleared) or 255 (white fill). The frames are
    // light-grey studio shots, so anything under 40 means we drew nothing.
    seq.push({ p, hash: s.hash, mean: s.mean, blank: s.mean < 40 });
  }
  await page.screenshot({ path: path.join(OUT, 'window-backscrub.png') });
  const blanks = seq.filter((s) => s.blank).length;
  log('SLIDING WINDOW:', dbg.join(' | '));
  log('  scrub path', seq.map((s) => `${s.p}:${s.mean}`).join(' '), `blankDraws=${blanks} errors=${errs.length}`);
  report.window = { dbg, seq, blanks, errs };
  await ctx.close();
}

/* ─────── 4c. saveData TERMINAL TIER: poster only, no sequence fetched ─────── */
{
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      get: () => ({ saveData: true, effectiveType: '3g', addEventListener() {}, removeEventListener() {} }),
    });
  });
  const page = await ctx.newPage();
  const frameReqs = [];
  page.on('request', (r) => { if (/\/frames\/frame-\d+\.jpg/.test(r.url())) frameReqs.push(r.url()); });
  await page.goto(`${BASE}/?mode=scrub`, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  const st = await page.evaluate(() => {
    const sec = document.querySelector('[data-pw-scrubber]');
    return {
      dataMode: sec.getAttribute('data-pw-scrubber'),
      reason: sec.getAttribute('data-pw-reason'),
      canvases: sec.querySelectorAll('canvas').length,
      sectionH: Math.round(sec.getBoundingClientRect().height),
    };
  });
  await page.screenshot({ path: path.join(OUT, 'savedata-poster.png') });
  // The preload in index.html legitimately fetches frame-00; the SEQUENCE must not.
  const seqReqs = frameReqs.filter((u) => !u.endsWith('frame-00.jpg'));
  log('SAVE-DATA TIER:', JSON.stringify(st), `sequenceFrameRequests=${seqReqs.length} (preload frame-00 excluded)`);
  report.saveData = { ...st, frameReqs: frameReqs.length, seqReqs: seqReqs.length };
  await ctx.close();
}

/* ───────────────── 5. scroll-reveal.css page ───────────────── */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(`${BASE}/reveal.html`, { waitUntil: 'load' });
  await page.waitForTimeout(500);

  const support = await page.evaluate(() => ({
    sda: CSS.supports('animation-timeline: view()'),
    pwjs: document.documentElement.classList.contains('pw-js'),
  }));
  log('REVEAL support:', JSON.stringify(support));

  // Walk the page, screenshotting, then assert every utility ends visible.
  const H = await page.evaluate(() => document.body.scrollHeight);
  let shot = 0;
  for (let y = 0; y < H; y += 800) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(320);
    if (shot % 3 === 0) await page.screenshot({ path: path.join(OUT, `reveal-${String(shot).padStart(2, '0')}.png`) });
    shot++;
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, 'reveal-top.png') });

  // Mid-scroll snapshot of an element that should be PARTLY revealed.
  const midState = await page.evaluate(() => {
    const el = document.querySelector('.pw-reveal');
    const cs = getComputedStyle(el);
    return { animationName: cs.animationName, timeline: cs.animationTimeline, range: cs.animationRange, opacity: cs.opacity };
  });
  log('REVEAL computed (.pw-reveal at top, before entry):', JSON.stringify(midState));

  // Now scroll everything into view and assert nothing is left hidden.
  const hidden = await page.evaluate(async () => {
    const sel = '.pw-reveal, .pw-scale, .pw-blur, .pw-stagger > *, .pw-wipe__inner, .pw-draw path, .pw-kenburns__img, .pw-parallax__layer, .pw-stack__card';
    const els = [...document.querySelectorAll(sel)];
    const bad = [];
    for (const el of els) {
      el.scrollIntoView({ block: 'center' });
      // Push a little further so scrubbed reveals are past the end of their range,
      // not caught mid-scrub — this asserts the RESTING state, not an instant.
      window.scrollBy(0, Math.round(window.innerHeight * 0.35));
      await new Promise((r) => setTimeout(r, 120));
      const cs = getComputedStyle(el);
      const op = parseFloat(cs.opacity);
      const clip = cs.clipPath;
      const invisible = op < 0.6;
      const clipped = clip && clip !== 'none' && /100%/.test(clip);
      if (invisible || clipped) bad.push(`${el.className || el.tagName} opacity=${cs.opacity} clip=${clip}`);
    }
    return { checked: els.length, bad };
  });
  log(`REVEAL visibility sweep: checked=${hidden.checked} stillHidden=${hidden.bad.length}`, hidden.bad.slice(0, 6).join(' || '));
  report.reveal = { support, ...hidden, errs };

  // The order trap: assert the computed timeline actually survived the shorthand.
  const timelineOk = await page.evaluate(() => {
    const el = document.querySelector('.pw-reveal');
    return getComputedStyle(el).animationTimeline;
  });
  log('COMPUTED animation-timeline on .pw-reveal =', timelineOk);
  report.timeline = timelineOk;

  // Stage panels + stagger ranges resolved?
  const ranges = await page.evaluate(() => {
    const p = [...document.querySelectorAll('.pw-stage__panel')].map((e) => getComputedStyle(e).animationRange);
    const s = [...document.querySelectorAll('.pw-stagger > *')].slice(0, 6).map((e) => getComputedStyle(e).animationRangeStart);
    const g = [...document.querySelectorAll('.pw-stagger--group > *')].map((e) => getComputedStyle(e).animationTimeline + ' @ ' + getComputedStyle(e).animationRangeStart);
    const tokens = getComputedStyle(document.documentElement);
    return {
      panels: p,
      stagger: s,
      group: g,
      tokens: {
        rise: tokens.getPropertyValue('--pw-rise'),
        step: tokens.getPropertyValue('--pw-stagger-step'),
        stageH: tokens.getPropertyValue('--pw-stage-h'),
      },
    };
  });
  log('RANGES:', JSON.stringify(ranges));
  report.ranges = ranges;
  log('REVEAL page errors:', errs.length);
  await ctx.close();
}

/* ───────────────── 6. reveal page under reduced motion ───────────────── */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/reveal.html`, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  const rm = await page.evaluate(() => {
    const stage = document.querySelector('.pw-stage');
    const pin = document.querySelector('.pw-stage__pin');
    const els = [...document.querySelectorAll('.pw-reveal, .pw-scale, .pw-blur, .pw-stagger > *, .pw-wipe__inner, .pw-stage__panel')];
    const hiddenNow = els.filter((e) => parseFloat(getComputedStyle(e).opacity) < 0.9).length;
    return {
      pwjs: document.documentElement.classList.contains('pw-js'),
      stagePosition: getComputedStyle(pin).position,
      stageHeightPx: Math.round(stage.getBoundingClientRect().height),
      viewport: window.innerHeight,
      progressBarDisplay: getComputedStyle(document.querySelector('.pw-progress')).display,
      panelOpacity: [...document.querySelectorAll('.pw-stage__panel')].map((e) => getComputedStyle(e).opacity),
      hiddenNow,
      checked: els.length,
    };
  });
  log('REVEAL @reduced-motion:', JSON.stringify(rm));
  await page.screenshot({ path: path.join(OUT, 'reveal-reduced-top.png') });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.55));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, 'reveal-reduced-mid.png') });
  report.revealReduced = rm;
  await ctx.close();
}

await browser.close();
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
console.log('\nARTIFACTS ->', OUT);

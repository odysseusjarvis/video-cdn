#!/usr/bin/env node
/**
 * premium-web / verify.mjs — the runnable ship / no-ship gate.
 *
 * This is the check that actually LOOKS AT THE PAGE. Everything else in the skill
 * reasons about the site; this drives a real Chromium over the BUILT output and
 * comes back with pixels, bytes and milliseconds.
 *
 * WHAT IT DOES
 *   1.  Serves the built directory itself (no external server dep, no SPA rewrite
 *       unless you ask for one — see --spa and the note in §links).
 *   2.  Screenshots at scroll progress 0 / 0.35 / 0.7 / 1.0 across 375 / 768 / 1440
 *       into <out>/shots/. THE AGENT MUST `Read` THESE. It is the only check that
 *       can tell you the page looks broken, generic, or unfinished.
 *   3.  Collects PerformanceObserver layout-shift entries during a SCRIPTED scroll
 *       and fails on any entry with hadRecentInput === false.
 *   4.  Re-runs under prefers-reduced-motion: reduce and asserts a complete,
 *       informative end state with no tall empty scroll track.
 *   5.  Asserts no horizontal overflow at 320 / 375 / 768 / 1440.
 *   6.  Measures LCP and the transferred bytes needed to paint the hero, throttled.
 *   7.  Keyboard-walks every interactive element and asserts a visible focus state.
 *   8.  Asserts meaningful alt text, ordered headings, and no surviving placeholder
 *       text ("lorem", "TODO", "Vaš tekst", "{{...}}", …).
 *   9.  Asserts every internal link resolves and every declared language is complete.
 *  10.  Static checks on the built files: JS/CSS gzip budgets, external font
 *       stylesheets in <head>, poster preload for SPA shells, host file caps,
 *       frame-sequence disk + decoded-memory budgets.
 *  Exits non-zero with a readable report on any failure. Writes report.md +
 *  report.json next to the screenshots.
 *
 * ── THE SMOOTH-SCROLL TRAP (this already bit this project once) ─────────────────
 * `scroll-behavior: smooth` in CSS makes *programmatic* scrolling animate. So
 * `window.scrollTo(0, y)` returns immediately while the page is still gliding, and
 * then:
 *    • every screenshot captures a mid-transition frame — you screenshot the blur
 *      between two states and conclude the design is broken;
 *    • every assertion taken right after the scroll reads the OLD scroll position,
 *      the OLD sticky offsets and the OLD canvas frame;
 *    • layout-shift entries land while the smooth animation is still running, so
 *      you cannot tell a genuine shift from the tail of the scroll.
 * This script defends three ways, and you should keep all three:
 *    (a) an init script forces `scroll-behavior: auto !important` document-wide
 *        during measurement (disable with --keep-smooth-scroll to see the real
 *        user experience — but then do not trust the numbers);
 *    (b) every scroll is issued with `behavior: 'instant'` AND by writing
 *        scrollTop directly, which bypasses the CSS property entirely;
 *    (c) after every scroll we SETTLE: poll scrollY across animation frames until
 *        it stops changing, then await document.fonts.ready and image decode.
 * JS smooth-scroll hijackers (Lenis, Locomotive, GSAP ScrollSmoother) are NOT
 * fixed by (a) or (b) — they animate a transform, not the scroller. We detect them
 * and warn loudly, because their presence invalidates scroll-position assertions.
 *
 * ── SECURITY ───────────────────────────────────────────────────────────────────
 * This script reads NO credentials. It does not touch process.env looking for
 * tokens, does not probe cloud/OAuth credentials, and makes no authenticated
 * network call. Its only network traffic is to the local static server it starts
 * itself, plus (optionally, with --check-external) HEAD requests to link targets
 * that are literally written in the client's own HTML.
 *
 * ── ENVIRONMENT (verified in this container) ───────────────────────────────────
 *   node v22, playwright 1.62.1 present, Chromium at
 *   /opt/pw-browsers/chromium-1194/chrome-linux/chrome  → launch with --no-sandbox.
 *   Do NOT run `playwright install`; the browser is already on disk.
 *
 * USAGE
 *   node verify.mjs --dir dist
 *   node verify.mjs --dir dist --spa --max-routes 6
 *   node verify.mjs --url https://staging.example.com --no-static
 *   node verify.mjs --dir dist --budget lcpMs=3000 --budget jsGzip=200000
 *   node verify.mjs --dir dist --langs bs,en,de
 *
 * Thresholds and their justification: references/performance-a11y-gates.md
 */

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import zlib from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/* ═══════════════════════════════════════════════════════════════════════════════
   0. CLI
   ═══════════════════════════════════════════════════════════════════════════════ */

function parseArgs(argv) {
  const o = {
    dir: null,
    url: null,
    out: null,
    spa: false,
    keepSmoothScroll: false,
    noStatic: false,
    checkExternal: false,
    throttle: true,
    maxRoutes: 6,
    langs: [],
    chrome: process.env.PW_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    budgetOverrides: {},
    quiet: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case '--dir': o.dir = path.resolve(next()); break;
      case '--url': o.url = next(); break;
      case '--out': o.out = path.resolve(next()); break;
      case '--spa': o.spa = true; break;
      case '--keep-smooth-scroll': o.keepSmoothScroll = true; break;
      case '--no-static': o.noStatic = true; break;
      case '--check-external': o.checkExternal = true; break;
      case '--no-throttle': o.throttle = false; break;
      case '--max-routes': o.maxRoutes = parseInt(next(), 10); break;
      case '--langs': o.langs = next().split(',').map((s) => s.trim()).filter(Boolean); break;
      case '--chrome': o.chrome = next(); break;
      case '--quiet': o.quiet = true; break;
      case '--budget': {
        const [k, v] = next().split('=');
        o.budgetOverrides[k] = Number(v);
        break;
      }
      case '-h':
      case '--help':
        console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0]);
        process.exit(0);
        break;
      default:
        console.error(`unknown argument: ${a}`);
        process.exit(2);
    }
  }
  if (!o.dir && !o.url) {
    console.error('verify.mjs: need --dir <built-output> or --url <live-url>');
    process.exit(2);
  }
  o.out = o.out || path.resolve(process.cwd(), 'work/verify');
  return o;
}

const ARGS = parseArgs(process.argv);

/* Budgets. Every number is defended in references/performance-a11y-gates.md.
   Override any of them with --budget key=value. */
const BUDGET = Object.assign(
  {
    lcpMs: 2500,              // Core Web Vitals "good", measured throttled
    heroBytes: 400 * 1024,    // everything transferred before LCP paints
    pageBytesMobile: 1500 * 1024,   // whole page after a full scroll, at 375px
    pageBytesDesktop: 4 * 1024 * 1024,
    jsGzip: 120 * 1024,       // all .js in the build, gzipped
    cssGzip: 40 * 1024,
    fontBytes: 200 * 1024,    // all self-hosted font files on disk
    posterBytes: 80 * 1024,   // the single LCP image
    singleImageBytes: 500 * 1024,
    clsLoad: 0.05,            // load-phase CLS
    clsScroll: 0,             // scroll-phase CLS — scroll gets NO grace period
    decodedMemoryMB: 250,     // W×H×4×frames for any frame sequence
    minTapPx: 24,             // WCAG 2.2 SC 2.5.8 AA
    minTapPxCTA: 44,          // house rule for the primary conversion action
    maxFiles: 20000,          // Cloudflare Pages
    maxFileBytes: 25 * 1024 * 1024,
    minBodyText: 400,         // a page with less than this did not render
    langTextRatio: 0.6,       // a translation shorter than 60% of the fullest one is incomplete
  },
  ARGS.budgetOverrides
);

const VIEWPORTS = [
  { w: 375, h: 812, label: '375', dsf: 2 },
  { w: 768, h: 1024, label: '768', dsf: 2 },
  { w: 1440, h: 900, label: '1440', dsf: 1 },
];
const OVERFLOW_WIDTHS = [320, 375, 768, 1440];
const PROGRESSES = [0, 0.35, 0.7, 1.0];

/* ═══════════════════════════════════════════════════════════════════════════════
   1. Result collection + reporting
   ═══════════════════════════════════════════════════════════════════════════════ */

const RESULTS = [];
function record(id, title, status, detail = [], data = undefined) {
  const r = { id, title, status, detail: [].concat(detail).filter(Boolean), data };
  RESULTS.push(r);
  if (!ARGS.quiet) {
    const badge = { PASS: 'PASS', FAIL: 'FAIL', WARN: 'WARN', SKIP: 'SKIP', INFO: 'INFO' }[status];
    console.log(`${badge}  ${id.padEnd(22)} ${title}`);
    for (const d of r.detail.slice(0, 12)) console.log(`        ${d}`);
    if (r.detail.length > 12) console.log(`        … and ${r.detail.length - 12} more`);
  }
  return r;
}
const fail = (id, t, d, data) => record(id, t, 'FAIL', d, data);
const pass = (id, t, d, data) => record(id, t, 'PASS', d, data);
const warn = (id, t, d, data) => record(id, t, 'WARN', d, data);
const skip = (id, t, d) => record(id, t, 'SKIP', d);

const kb = (n) => `${(n / 1024).toFixed(1)}KB`;
const mb = (n) => `${(n / 1024 / 1024).toFixed(2)}MB`;

/* ═══════════════════════════════════════════════════════════════════════════════
   2. Playwright + Chromium resolution
   ═══════════════════════════════════════════════════════════════════════════════ */

async function loadPlaywright() {
  const tried = [];
  const candidates = [];
  // Bare specifier first — works when run from inside a project that has it.
  candidates.push('playwright', 'playwright-core');
  // Then explicit locations: cwd, this script's project, the global root.
  const roots = [path.join(process.cwd(), 'node_modules'), path.join(HERE, '..', 'node_modules')];
  try {
    roots.push(execSync('npm root -g', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim());
  } catch { /* npm not on PATH — the bare specifiers may still work */ }
  for (const r of roots) {
    for (const p of ['playwright', 'playwright-core']) {
      candidates.push(pathToFileURL(path.join(r, p, 'index.mjs')).href);
    }
  }
  for (const c of candidates) {
    try {
      const mod = await import(c);
      if (mod.chromium) return mod;
    } catch (e) {
      tried.push(`${c}: ${e.code || e.message.split('\n')[0]}`);
    }
  }
  console.error('verify.mjs: could not load playwright. Tried:\n  ' + tried.join('\n  '));
  console.error('This container ships playwright already — do NOT run `playwright install`.');
  process.exit(2);
}

function resolveChrome(preferred) {
  if (preferred && fs.existsSync(preferred)) return preferred;
  const base = '/opt/pw-browsers';
  if (fs.existsSync(base)) {
    for (const d of fs.readdirSync(base)) {
      const p = path.join(base, d, 'chrome-linux', 'chrome');
      if (fs.existsSync(p)) return p;
    }
  }
  return null; // let playwright fall back to its own resolution
}

/* ═══════════════════════════════════════════════════════════════════════════════
   3. Static file server (no dependency, no accidental SPA rewrite)
   ═══════════════════════════════════════════════════════════════════════════════ */

const MIME = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4',
  '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json', '.map': 'application/json',
};

async function startServer(root, { spa }) {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0].split('#')[0]);
    let filePath = path.join(root, path.normalize(urlPath).replace(/^(\.\.[/\\])+/, ''));
    if (!filePath.startsWith(root)) { res.writeHead(403).end('forbidden'); return; }
    try {
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }
      if (!fs.existsSync(filePath)) {
        if (spa) {
          // Serve the shell, but MARK IT. delivery.md §2.4 is right that a blind
          // SPA rewrite makes 404s invisible; this header keeps them visible.
          const shell = path.join(root, 'index.html');
          if (fs.existsSync(shell)) {
            const body = fs.readFileSync(shell);
            res.writeHead(200, {
              'content-type': MIME['.html'],
              'content-length': body.length,
              'x-verify-fallback': '1',
            });
            res.end(body);
            return;
          }
        }
        res.writeHead(404, { 'content-type': 'text/plain' }).end('404');
        return;
      }
      const body = fs.readFileSync(filePath);
      res.writeHead(200, {
        'content-type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
        'content-length': body.length,
        'cache-control': 'no-store',
      });
      res.end(body);
    } catch (e) {
      res.writeHead(500, { 'content-type': 'text/plain' }).end(String(e && e.message));
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  return {
    origin: `http://127.0.0.1:${port}`,
    close: () => new Promise((r) => server.close(r)),
  };
}

/* ═══════════════════════════════════════════════════════════════════════════════
   4. The page-side init script — observers, helpers, smooth-scroll neutraliser
   ═══════════════════════════════════════════════════════════════════════════════ */

function initScript({ killSmoothScroll }) {
  return `(() => {
  const Q = (window.__pwq = {
    shifts: [], lcp: null, phase: 'load', scrollStart: null,
    longTasks: 0, smoothDetected: false, hijackDetected: [],
  });

  /* ---- helpers every later evaluate() can reuse ---- */
  Q.cssPath = function (el) {
    if (!el || el.nodeType !== 1) return '';
    if (el.id) return '#' + CSS.escape(el.id);
    const parts = [];
    let n = el, depth = 0;
    while (n && n.nodeType === 1 && depth++ < 6) {
      let s = n.tagName.toLowerCase();
      if (n.id) { parts.unshift('#' + CSS.escape(n.id)); break; }
      const p = n.parentElement;
      if (p) {
        const same = [...p.children].filter((c) => c.tagName === n.tagName);
        if (same.length > 1) s += ':nth-of-type(' + (same.indexOf(n) + 1) + ')';
      }
      parts.unshift(s);
      n = n.parentElement;
    }
    return parts.join(' > ');
  };
  Q.describe = function (el) {
    if (!el || el.nodeType !== 1) return '(non-element)';
    const cls = typeof el.className === 'string' && el.className.trim()
      ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '';
    const txt = (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 40);
    return el.tagName.toLowerCase() + cls + (txt ? ' "' + txt + '"' : '');
  };
  Q.visible = function (el) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.02) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  Q.accName = function (el) {
    const al = el.getAttribute && el.getAttribute('aria-label');
    if (al && al.trim()) return al.trim();
    const lb = el.getAttribute && el.getAttribute('aria-labelledby');
    if (lb) {
      const t = lb.split(/\\s+/).map((id) => (document.getElementById(id) || {}).textContent || '').join(' ').trim();
      if (t) return t;
    }
    const txt = (el.innerText || el.textContent || '').trim();
    if (txt) return txt.replace(/\\s+/g, ' ').slice(0, 80);
    const img = el.querySelector && el.querySelector('img[alt]');
    if (img && img.getAttribute('alt').trim()) return img.getAttribute('alt').trim();
    const t = el.getAttribute && el.getAttribute('title');
    if (t && t.trim()) return t.trim();
    const v = el.value;
    if (typeof v === 'string' && v.trim()) return v.trim();
    return '';
  };

  /* ---- CLS: record EVERY layout-shift entry with its phase ---- */
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        let sources = [];
        try {
          sources = (e.sources || []).slice(0, 3).map((s) => Q.describe(s.node));
        } catch (_) { /* node may be gone */ }
        Q.shifts.push({
          t: Math.round(e.startTime),
          value: e.value,
          hadRecentInput: e.hadRecentInput,
          phase: Q.phase,
          sources,
        });
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch (_) {}

  /* ---- LCP ---- */
  try {
    new PerformanceObserver((list) => {
      const es = list.getEntries();
      const e = es[es.length - 1];
      if (!e) return;
      Q.lcp = {
        time: Math.round(e.startTime),
        size: e.size,
        url: e.url || '',
        el: e.element ? Q.describe(e.element) : '(no element — cross-origin or removed)',
        tag: e.element ? e.element.tagName.toLowerCase() : '',
      };
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (_) {}

  try {
    new PerformanceObserver((l) => { Q.longTasks += l.getEntries().length; })
      .observe({ type: 'longtask', buffered: true });
  } catch (_) {}

  /* ---- THE SMOOTH-SCROLL TRAP ----
     scroll-behavior: smooth turns every programmatic scroll into an animation, so
     screenshots land mid-transition and assertions read stale positions. We record
     that it was there (so the report says so) and then force it off for the run. */
  const stamp = () => {
    try {
      const de = document.documentElement;
      if (de) {
        const sb = getComputedStyle(de).scrollBehavior;
        if (sb === 'smooth') Q.smoothDetected = true;
      }
      const bd = document.body;
      if (bd && getComputedStyle(bd).scrollBehavior === 'smooth') Q.smoothDetected = true;
    } catch (_) {}
    ${killSmoothScroll ? `
    try {
      if (!document.getElementById('__pw_no_smooth')) {
        const st = document.createElement('style');
        st.id = '__pw_no_smooth';
        st.textContent = 'html,body,*{scroll-behavior:auto !important}';
        (document.head || document.documentElement).appendChild(st);
      }
    } catch (_) {}` : ''}
  };
  stamp();
  document.addEventListener('DOMContentLoaded', stamp);
  window.addEventListener('load', () => {
    stamp();
    /* JS scroll hijackers are NOT fixed by the CSS override — they animate a
       transform on a wrapper instead of moving the scroller. Detect and report. */
    for (const [k, label] of [['lenis', 'Lenis'], ['__lenis', 'Lenis'],
      ['locomotive', 'LocomotiveScroll'], ['ScrollSmoother', 'GSAP ScrollSmoother']]) {
      if (window[k]) Q.hijackDetected.push(label);
    }
    if (document.querySelector('[data-lenis-prevent],.lenis,[data-scroll-container]')) {
      Q.hijackDetected.push('smooth-scroll wrapper markup');
    }
  });
})();`;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   5. Scroll driving + settling  (see the smooth-scroll note at the top)
   ═══════════════════════════════════════════════════════════════════════════════ */

async function settle(page, { quiet = 250, timeout = 5000 } = {}) {
  await page.evaluate(
    async ({ quiet, timeout }) => {
      const frame = () =>
        new Promise((r) => {
          let done = false;
          requestAnimationFrame(() => { if (!done) { done = true; r(); } });
          setTimeout(() => { if (!done) { done = true; r(); } }, 120);
        });
      const scroller = () => document.scrollingElement || document.documentElement;
      const t0 = performance.now();
      let last = -1;
      let stableSince = performance.now();
      while (performance.now() - t0 < timeout) {
        await frame();
        const y = Math.round(scroller().scrollTop);
        if (y !== last) { last = y; stableSince = performance.now(); }
        else if (performance.now() - stableSince >= quiet) break;
      }
      try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (_) {}
      try {
        const imgs = [...document.images].filter((i) => i.getBoundingClientRect().height > 0);
        await Promise.allSettled(imgs.map((i) => (i.decode ? i.decode() : Promise.resolve())));
      } catch (_) {}
      await frame();
    },
    { quiet, timeout }
  );
}

async function scrollToProgress(page, p) {
  await page.evaluate((p) => {
    const de = document.scrollingElement || document.documentElement;
    const max = Math.max(0, de.scrollHeight - window.innerHeight);
    const target = Math.round(max * p);
    // Three ways to the same place, because any one of them can be intercepted.
    try { window.scrollTo({ top: target, left: 0, behavior: 'instant' }); } catch (_) {}
    de.scrollTop = target;
    window.scrollTo(0, target);
  }, p);
  await settle(page);
}

/** Walk the whole page in viewport-sized steps. Triggers lazy loading, IO reveals
 *  and any scroll-linked animation, and is the trace window for scroll CLS. */
async function scrollSweep(page, { step = 0.9, pause = 140 } = {}) {
  const steps = await page.evaluate(({ step }) => {
    const de = document.scrollingElement || document.documentElement;
    const max = Math.max(0, de.scrollHeight - window.innerHeight);
    return Math.min(60, Math.ceil(max / Math.max(1, window.innerHeight * step)) + 1);
  }, { step });
  for (let i = 0; i <= steps; i++) {
    await page.evaluate(({ i, step }) => {
      const de = document.scrollingElement || document.documentElement;
      const y = Math.round(i * window.innerHeight * step);
      try { window.scrollTo({ top: y, left: 0, behavior: 'instant' }); } catch (_) {}
      de.scrollTop = y;
    }, { i, step });
    await page.waitForTimeout(pause);
  }
  await settle(page);
}

async function markScrollPhase(page) {
  await page.evaluate(() => {
    window.__pwq.phase = 'scroll';
    window.__pwq.scrollStart = performance.now();
  });
}

async function readTelemetry(page) {
  return page.evaluate(() => {
    const Q = window.__pwq || {};
    return {
      shifts: Q.shifts || [],
      lcp: Q.lcp || null,
      longTasks: Q.longTasks || 0,
      smoothDetected: !!Q.smoothDetected,
      hijackDetected: [...new Set(Q.hijackDetected || [])],
    };
  });
}

/* ═══════════════════════════════════════════════════════════════════════════════
   6. Browser context factory
   ═══════════════════════════════════════════════════════════════════════════════ */

async function makeContext(browser, { w, h, dsf = 1, reducedMotion = 'no-preference' }) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: dsf,
    reducedMotion,
    // Locale matters for Intl-formatted prices/dates on regional sites.
    locale: 'bs-BA',
    ignoreHTTPSErrors: true,
  });
  await ctx.addInitScript(initScript({ killSmoothScroll: !ARGS.keepSmoothScroll }));
  return ctx;
}

async function open(ctx, url) {
  const page = await ctx.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const badResponses = [];
  const bytes = new Map();
  // A bare "Failed to load resource" console line has no URL in it. requestfailed
  // does, and naming the dead host is the difference between a finding and a shrug.
  page.on('requestfailed', (r) => {
    const why = (r.failure() && r.failure().errorText) || 'unknown';
    badResponses.push(`request failed (${why}) → ${r.url()}`);
  });
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/Failed to load resource/i.test(t)) return; // requestfailed already named it, with the URL
    consoleErrors.push(t.slice(0, 200));
  });
  page.on('pageerror', (e) => pageErrors.push(String(e.message).slice(0, 200)));
  page.on('response', async (r) => {
    try {
      if (r.status() >= 400) badResponses.push(`${r.status()} ${r.url()}`);
      const s = await r.request().sizes();
      bytes.set(r.url(), (s.responseBodySize || 0) + (s.responseHeadersSize || 0));
    } catch (_) { /* aborted / redirected away */ }
  });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await settle(page);
  return { page, consoleErrors, pageErrors, badResponses, bytes };
}

/* ═══════════════════════════════════════════════════════════════════════════════
   7. CHECK — visual screenshots + scroll CLS + overflow
   ═══════════════════════════════════════════════════════════════════════════════ */

async function checkVisualAndScrollCLS(browser, url, shotDir) {
  const shots = [];
  const scrollShiftFailures = [];
  let scrollShiftSum = 0;
  const loadCls = {};
  const baseline = {}; // per-viewport normal-motion metrics, reused by the reduced-motion check
  let smoothSeen = false;
  let hijackSeen = [];
  const runtimeErrors = [];

  for (const vp of VIEWPORTS) {
    const ctx = await makeContext(browser, vp);
    const { page, consoleErrors, pageErrors, badResponses } = await open(ctx, url);

    // Everything up to here is the LOAD phase. Split it off before scrolling so we
    // can report load CLS and scroll CLS separately — they have different rules.
    const pre = await readTelemetry(page);
    loadCls[vp.label] = pre.shifts
      .filter((s) => !s.hadRecentInput)
      .reduce((a, s) => a + s.value, 0);
    smoothSeen = smoothSeen || pre.smoothDetected;

    await markScrollPhase(page);

    for (const p of PROGRESSES) {
      await scrollToProgress(page, p);
      const file = path.join(shotDir, `${vp.label}-p${String(Math.round(p * 100)).padStart(3, '0')}.png`);
      await page.screenshot({ path: file, animations: 'disabled' });
      shots.push(path.relative(ARGS.out, file));
    }
    // A dense sweep gives layout shift a chance to happen between the four stops.
    await scrollSweep(page);

    const post = await readTelemetry(page);
    hijackSeen = [...new Set([...hijackSeen, ...post.hijackDetected])];
    for (const s of post.shifts) {
      if (s.phase !== 'scroll') continue;
      if (s.hadRecentInput) continue; // genuinely user-driven; excluded by spec
      if (s.value <= 0) continue;
      scrollShiftSum += s.value;
      scrollShiftFailures.push(
        `${vp.label}px  shift ${s.value.toFixed(4)} at ${s.t}ms — ${s.sources.filter((x) => x !== '(non-element)').join(' | ') || 'source node already detached (usually a reveal that unmounts, or a lazy image swapping in)'}`
      );
    }

    // Full-page reference shot: cheap, and the fastest way to see "does this look generic".
    const fullFile = path.join(shotDir, `${vp.label}-fullpage.png`);
    await page.screenshot({ path: fullFile, fullPage: true, animations: 'disabled' }).catch(() => {});
    if (fs.existsSync(fullFile)) shots.push(path.relative(ARGS.out, fullFile));

    baseline[vp.label] = await page.evaluate(() => {
      const de = document.scrollingElement || document.documentElement;
      return {
        scrollHeight: de.scrollHeight,
        innerHeight: window.innerHeight,
        textLen: (document.body.innerText || '').replace(/\s+/g, ' ').trim().length,
        interactive: document.querySelectorAll('a[href],button,input,select,textarea,[role="button"]').length,
      };
    });

    runtimeErrors.push(
      ...pageErrors.map((e) => `${vp.label}px pageerror: ${e}`),
      ...consoleErrors.slice(0, 5).map((e) => `${vp.label}px console: ${e}`),
      ...badResponses.slice(0, 8).map((e) => `${vp.label}px response ${e}`)
    );

    await ctx.close();
  }

  record(
    'VISUAL-SHOTS',
    `screenshots written to ${path.relative(process.cwd(), ARGS.out)}/shots — READ THEM`,
    'INFO',
    shots
  );

  if (smoothSeen) {
    warn('SMOOTH-SCROLL', 'CSS scroll-behavior: smooth is active on this page', [
      ARGS.keepSmoothScroll
        ? 'Running WITH smooth scroll (--keep-smooth-scroll): screenshots may be mid-transition and scroll assertions may read stale values. Re-run without the flag before trusting this report.'
        : 'Neutralised for measurement (scroll-behavior:auto !important + behavior:"instant" + scrollTop write + settle). Real users still get the smooth animation — that is fine, this only affects the harness.',
      'Trap: window.scrollTo() returns immediately while the page is still gliding, so a screenshot taken straight after it captures the transition, not the state.',
    ]);
  }
  if (hijackSeen.length) {
    warn('SCROLL-HIJACK', `JS smooth-scroll library detected: ${hijackSeen.join(', ')}`, [
      'A JS hijacker animates a transform instead of moving the scroller, so neither behavior:"instant" nor scroll-behavior:auto stops it.',
      'Gate it behind prefers-reduced-motion (blueprint step 10) and re-run; until then treat scroll-position assertions here as advisory.',
    ]);
  }

  const worstLoadCls = Math.max(...Object.values(loadCls));
  if (worstLoadCls > BUDGET.clsLoad) {
    fail('CLS-LOAD', `load-phase CLS ${worstLoadCls.toFixed(4)} > ${BUDGET.clsLoad}`,
      Object.entries(loadCls).map(([k, v]) => `${k}px: ${v.toFixed(4)}`));
  } else {
    pass('CLS-LOAD', `load-phase CLS ${worstLoadCls.toFixed(4)} ≤ ${BUDGET.clsLoad}`,
      Object.entries(loadCls).map(([k, v]) => `${k}px: ${v.toFixed(4)}`));
  }

  if (scrollShiftFailures.length && scrollShiftSum > BUDGET.clsScroll) {
    fail(
      'CLS-SCROLL',
      `${scrollShiftFailures.length} layout-shift entries with hadRecentInput=false during scripted scroll (sum ${scrollShiftSum.toFixed(4)} > ${BUDGET.clsScroll})`,
      scrollShiftFailures.concat([
        'Scroll is NOT an excluding input in the Layout Instability spec — there is no 500ms grace period, every one of these counts fully.',
        'Lighthouse never scrolls, so a green lab score does not contradict this.',
        'Fix by animating transform/opacity only: translateY not top, scaleY not height, opacity not visibility+height. Reserve space for every lazy image.',
        'If these are genuinely sub-pixel and you have decided to accept them, raise the bar explicitly: --budget clsScroll=0.01. Do not silence the check.',
      ])
    );
  } else if (scrollShiftFailures.length) {
    warn('CLS-SCROLL', `${scrollShiftFailures.length} sub-threshold layout shifts during scroll (sum ${scrollShiftSum.toFixed(4)} ≤ ${BUDGET.clsScroll})`, scrollShiftFailures);
  } else {
    pass('CLS-SCROLL', 'zero unexpected layout shifts during scripted scroll at 375/768/1440');
  }

  if (runtimeErrors.length) {
    fail('RUNTIME', `${runtimeErrors.length} runtime errors / failed responses`, runtimeErrors);
  } else {
    pass('RUNTIME', 'no page errors, no console errors, no 4xx/5xx responses');
  }

  return baseline;
}

async function checkOverflow(browser, url) {
  const failures = [];
  const notes = [];
  for (const w of OVERFLOW_WIDTHS) {
    const ctx = await makeContext(browser, { w, h: 900, dsf: 1 });
    const { page } = await open(ctx, url);
    await scrollSweep(page, { pause: 90 });
    await scrollToProgress(page, 0);
    const r = await page.evaluate(() => {
      const de = document.documentElement;
      const overflow = de.scrollWidth - de.clientWidth;
      const culprits = [...document.querySelectorAll('body *')]
        .filter((el) => {
          const b = el.getBoundingClientRect();
          if (b.width <= 0 || b.height <= 0) return false;
          const cs = getComputedStyle(el);
          if (cs.position === 'fixed') return false;
          return b.right > de.clientWidth + 1 || b.left < -1;
        })
        .slice(0, 6)
        .map((el) => `${window.__pwq.describe(el)} [${Math.round(el.getBoundingClientRect().left)}…${Math.round(el.getBoundingClientRect().right)}]`);
      return { overflow, culprits, clientWidth: de.clientWidth };
    });
    if (r.overflow > 1) {
      failures.push(`${w}px: body scrolls ${r.overflow}px horizontally — ${r.culprits.join(' ; ') || 'culprit not identified'}`);
    } else {
      notes.push(`${w}px: clean`);
    }
    await ctx.close();
  }
  if (failures.length) {
    fail('OVERFLOW', 'horizontal body overflow', failures.concat([
      'Wide content (tables, galleries, code) must scroll inside its own overflow-x:auto container — never the body.',
    ]));
  } else {
    pass('OVERFLOW', `no horizontal overflow at ${OVERFLOW_WIDTHS.join('/')}`, notes);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════════
   8. CHECK — reduced motion end state
   ═══════════════════════════════════════════════════════════════════════════════ */

async function checkReducedMotion(browser, url, shotDir, baseline) {
  const failures = [];
  const infos = [];
  const shots = [];

  for (const vp of [VIEWPORTS[0], VIEWPORTS[2]]) {
    const ctx = await makeContext(browser, { ...vp, reducedMotion: 'reduce' });
    const { page } = await open(ctx, url);

    const applied = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (!applied) {
      failures.push(`${vp.label}px: prefers-reduced-motion emulation did not apply — this check proved nothing`);
      await ctx.close();
      continue;
    }

    await scrollSweep(page, { pause: 120 });
    await scrollToProgress(page, 0);

    const f0 = path.join(shotDir, `reduced-${vp.label}-p000.png`);
    await page.screenshot({ path: f0, animations: 'disabled' });
    shots.push(path.relative(ARGS.out, f0));
    await scrollToProgress(page, 0.5);
    const f5 = path.join(shotDir, `reduced-${vp.label}-p050.png`);
    await page.screenshot({ path: f5, animations: 'disabled' });
    shots.push(path.relative(ARGS.out, f5));
    const ffull = path.join(shotDir, `reduced-${vp.label}-fullpage.png`);
    await page.screenshot({ path: ffull, fullPage: true, animations: 'disabled' }).catch(() => {});
    if (fs.existsSync(ffull)) shots.push(path.relative(ARGS.out, ffull));

    const r = await page.evaluate(() => {
      const Q = window.__pwq;
      const de = document.scrollingElement || document.documentElement;
      const vh = window.innerHeight;
      const ms = (v) =>
        String(v || '0s').split(',').reduce((a, s) => {
          const n = parseFloat(s);
          if (!isFinite(n)) return a;
          return Math.max(a, s.includes('ms') ? n : n * 1000);
        }, 0);

      const hiddenContent = [];
      const stillAnimating = [];
      const infiniteLoops = [];
      const liveTimelines = [];
      const emptyTracks = [];

      for (const el of document.querySelectorAll('body *')) {
        const cs = getComputedStyle(el);
        const rect = el.getBoundingClientRect();

        // 1. The classic reduced-motion bug: the entrance animation was removed but
        //    its opacity:0 / translateY start state was not, so content is invisible.
        if (
          rect.width > 2 && rect.height > 2 &&
          cs.display !== 'none' && cs.position !== 'fixed' &&
          (parseFloat(cs.opacity) < 0.05 || cs.visibility === 'hidden') &&
          (el.innerText || '').trim().length > 20
        ) hiddenContent.push(Q.describe(el));

        // 2. Anything still animating for a meaningful duration.
        if (cs.animationName !== 'none' && ms(cs.animationDuration) > 80) {
          stillAnimating.push(Q.describe(el) + ' — ' + cs.animationName + ' ' + cs.animationDuration);
          if (cs.animationIterationCount === 'infinite') {
            infiniteLoops.push(Q.describe(el) + ' — infinite ' + cs.animationName);
          }
        }
        // 3. Scroll-driven timelines must be switched off, not merely shortened.
        if (cs.animationTimeline && !['auto', 'none', ''].includes(cs.animationTimeline)) {
          liveTimelines.push(Q.describe(el) + ' — animation-timeline: ' + cs.animationTimeline);
        }

        // 4. A TALL EMPTY SCROLL TRACK: a section ≥2 viewports tall whose actual
        //    content occupies less than half of it. Under reduce, a pinned 500vh
        //    scrubber section that was not collapsed looks exactly like this — the
        //    user scrolls through screens of nothing to reach the next section.
        if (rect.height >= vh * 2) {
          let top = Infinity, bottom = -Infinity, found = 0;
          for (const d of el.querySelectorAll('*')) {
            const dr = d.getBoundingClientRect();
            if (dr.width <= 0 || dr.height <= 0) continue;
            const hasText = (d.textContent || '').trim().length > 8 &&
              [...d.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 8);
            const isMedia = ['IMG', 'CANVAS', 'SVG', 'VIDEO', 'PICTURE'].includes(d.tagName);
            const cs2 = getComputedStyle(d);
            const hasBgImage = cs2.backgroundImage && cs2.backgroundImage !== 'none';
            if (!hasText && !isMedia && !hasBgImage) continue;
            if (cs2.position === 'sticky' || cs2.position === 'fixed') {
              // A sticky child only ever covers one viewport of the track, no matter
              // how tall the track is — that is the whole point, and under reduce it
              // means the remaining height is empty.
              found += 1;
              continue;
            }
            found += 1;
            top = Math.min(top, dr.top);
            bottom = Math.max(bottom, dr.bottom);
          }
          const covered = found && isFinite(top) ? Math.max(0, bottom - top) : 0;
          if (covered < rect.height * 0.5) {
            emptyTracks.push(
              Q.describe(el) + ' — ' + Math.round(rect.height / vh) + '×viewport tall, content covers ' +
              Math.round((covered / rect.height) * 100) + '%'
            );
          }
        }
      }

      return {
        scrollHeight: de.scrollHeight,
        innerHeight: vh,
        textLen: (document.body.innerText || '').replace(/\s+/g, ' ').trim().length,
        interactive: document.querySelectorAll('a[href],button,input,select,textarea,[role="button"]').length,
        hiddenContent: [...new Set(hiddenContent)].slice(0, 10),
        stillAnimating: [...new Set(stillAnimating)].slice(0, 10),
        infiniteLoops: [...new Set(infiniteLoops)].slice(0, 10),
        liveTimelines: [...new Set(liveTimelines)].slice(0, 10),
        emptyTracks: [...new Set(emptyTracks)].slice(0, 10),
      };
    });

    const base = baseline[vp.label] || {};
    const L = `${vp.label}px`;

    r.hiddenContent.forEach((s) => failures.push(`${L}: CONTENT INVISIBLE under reduce — ${s}`));
    r.stillAnimating.forEach((s) => failures.push(`${L}: still animating under reduce — ${s}`));
    r.infiniteLoops.forEach((s) => failures.push(`${L}: infinite loop under reduce (WCAG 2.3.3 vestibular trigger) — ${s}`));
    r.liveTimelines.forEach((s) => failures.push(`${L}: scroll timeline still bound under reduce — ${s}`));
    r.emptyTracks.forEach((s) => failures.push(`${L}: TALL EMPTY SCROLL TRACK — ${s}`));

    // Informative end state: the reduce build must not lose content or CTAs.
    if (base.textLen && r.textLen < base.textLen * 0.9) {
      failures.push(`${L}: reduce build shows ${r.textLen} chars vs ${base.textLen} normally — content is missing, not merely still`);
    }
    if (base.interactive && r.interactive < base.interactive * 0.9) {
      failures.push(`${L}: ${r.interactive} interactive elements vs ${base.interactive} normally — a CTA disappeared under reduce`);
    }
    if (base.scrollHeight && r.scrollHeight > base.scrollHeight * 1.02) {
      failures.push(`${L}: page is TALLER under reduce (${r.scrollHeight}px vs ${base.scrollHeight}px) — pinned sections were not collapsed`);
    } else if (base.scrollHeight) {
      infos.push(`${L}: ${r.scrollHeight}px tall under reduce vs ${base.scrollHeight}px normally (${Math.round((r.scrollHeight / base.scrollHeight) * 100)}%)`);
    }
    infos.push(`${L}: ${r.textLen} chars, ${r.interactive} interactive elements under reduce`);

    await ctx.close();
  }

  record('REDUCED-SHOTS', 'reduced-motion screenshots — READ THEM too', 'INFO', shots);

  if (failures.length) {
    fail('REDUCED-MOTION', 'prefers-reduced-motion does not present a complete end state', failures.concat([
      'The rule is SHOW THE END STATE INSTANTLY, never show nothing:',
      '  canvas scrub → draw the final/most informative frame and collapse the tall section to 100vh',
      '  CSS scroll-driven → wrap animation-timeline in @media not (prefers-reduced-motion: reduce) so the to-state applies statically',
      '  GSAP → gsap.matchMedia("(prefers-reduced-motion: reduce)") branch using .set() and creating zero ScrollTriggers',
      '  Lottie → goToAndStop(total - 1);  Lenis → do not instantiate it at all',
    ]));
  } else {
    pass('REDUCED-MOTION', 'complete, informative, static end state with no empty scroll track', infos);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════════
   9. CHECK — LCP + hero payload (throttled)
   ═══════════════════════════════════════════════════════════════════════════════ */

async function checkPerformance(browser, url) {
  const ctx = await makeContext(browser, { w: 375, h: 812, dsf: 2 });
  const page = await ctx.newPage();

  const sizes = new Map();
  page.on('response', async (r) => {
    try {
      const s = await r.request().sizes();
      sizes.set(r.url(), (s.responseBodySize || 0) + (s.responseHeadersSize || 0));
    } catch (_) {}
  });

  let throttleLabel = 'unthrottled';
  if (ARGS.throttle) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 150,
      downloadThroughput: (1.6 * 1000 * 1000) / 8,
      uploadThroughput: (750 * 1000) / 8,
    });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    throttleLabel = 'Slow 4G (1.6Mbps / 150ms RTT) + 4× CPU';
  }

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await settle(page, { timeout: 6000 });
  await page.waitForTimeout(1200); // let a late LCP candidate land

  const tele = await readTelemetry(page);
  const timing = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] || {};
    return {
      resources: performance.getEntriesByType('resource').map((e) => ({
        url: e.name, start: Math.round(e.startTime), end: Math.round(e.responseEnd),
        transferSize: e.transferSize || 0, initiator: e.initiatorType,
      })),
      docBytes: nav.transferSize || 0,
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd || 0),
      loadEvent: Math.round(nav.loadEventEnd || 0),
    };
  });

  const lcpTime = tele.lcp ? tele.lcp.time : null;
  const sizeOf = (u) => {
    if (sizes.has(u)) return sizes.get(u);
    const rt = timing.resources.find((r) => r.url === u);
    return rt ? rt.transferSize : 0;
  };

  // Hero payload = everything that had to arrive before the hero could paint.
  let heroBytes = timing.docBytes || sizeOf(url) || 0;
  const heroParts = [];
  for (const r of timing.resources) {
    if (lcpTime !== null && r.start > lcpTime) continue;
    const b = sizeOf(r.url);
    heroBytes += b;
    if (b > 8 * 1024) heroParts.push(`${b >= 1024 ? kb(b) : b + 'B'}  ${r.initiator}  ${r.url.replace(/^https?:\/\/[^/]+/, '')}`);
  }
  heroParts.sort((a, b) => parseFloat(b) - parseFloat(a));

  // Full-page payload after a complete scroll (frame sequences land here).
  await markScrollPhase(page);
  await scrollSweep(page, { pause: 200 });
  const totalBytes = [...sizes.values()].reduce((a, b) => a + b, 0);
  const heavy = [...sizes.entries()]
    .filter(([, n]) => n > BUDGET.singleImageBytes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([u, n]) => `${kb(n)}  ${u.replace(/^https?:\/\/[^/]+/, '')}`);

  await ctx.close();

  /* --- LCP --- */
  if (!tele.lcp) {
    fail('LCP', 'no largest-contentful-paint entry was recorded', [
      'The page painted nothing the spec counts. LCP candidates are exactly: <img>, <image> in <svg>, <video> poster, url() background-image, and block-level elements containing text.',
      'A <canvas> is deliberately NOT on that list — a canvas hero with no real <img> poster has no LCP element at all.',
    ]);
  } else {
    const detail = [
      `element: ${tele.lcp.el}`,
      tele.lcp.url ? `source: ${tele.lcp.url.replace(/^https?:\/\/[^/]+/, '')}` : 'source: (text node)',
      `measured under ${throttleLabel}`,
      `DOMContentLoaded ${timing.domContentLoaded}ms, load ${timing.loadEvent}ms, ${tele.longTasks} long tasks`,
    ];
    if (tele.lcp.tag === 'canvas') {
      detail.push('WARNING: the LCP element is a <canvas>, which the spec does not treat as a candidate — this measurement is unreliable. Ship frame 0 as a real <img>.');
    }
    if (lcpTime > BUDGET.lcpMs) {
      fail('LCP', `LCP ${lcpTime}ms > ${BUDGET.lcpMs}ms`, detail);
    } else {
      pass('LCP', `LCP ${lcpTime}ms ≤ ${BUDGET.lcpMs}ms`, detail);
    }
  }

  /* --- the poster on its own ---
     The LCP image is the one file that must arrive before anything else is
     allowed to matter. Budget it separately from the rest of the hero payload. */
  if (tele.lcp && tele.lcp.url) {
    const posterBytes = sizeOf(tele.lcp.url);
    const rel = tele.lcp.url.replace(/^https?:\/\/[^/]+/, '');
    if (posterBytes > BUDGET.posterBytes) {
      fail('POSTER-BYTES', `the LCP image is ${kb(posterBytes)} > ${kb(BUDGET.posterBytes)}`, [
        rel,
        'Re-encode at the real display width: AVIF q50 or JPEG q75. A 1600px-wide poster on a 375px phone is three quarters wasted.',
        'Ship it as <img fetchpriority="high" loading="eager" decoding="async"> with explicit width/height, and preload it from index.html on a client-rendered build.',
      ]);
    } else {
      pass('POSTER-BYTES', `the LCP image is ${kb(posterBytes)} ≤ ${kb(BUDGET.posterBytes)}`, [rel]);
    }
  } else {
    skip('POSTER-BYTES', 'no image LCP candidate — nothing to weigh');
  }

  /* --- hero payload --- */
  const heroDetail = [
    `${heroParts.length} resources ≥8KB arrived before LCP:`,
    ...heroParts.slice(0, 10),
  ];
  if (heroBytes > BUDGET.heroBytes) {
    fail('HERO-PAYLOAD', `${kb(heroBytes)} transferred before LCP > ${kb(BUDGET.heroBytes)}`, heroDetail.concat([
      'Split the budget: poster ≤80KB, keyframe subset ≤250KB, remainder at fetchpriority="low" AFTER load.',
      'At 1.6Mbps, every 200KB is one extra second before the hero exists.',
    ]));
  } else {
    pass('HERO-PAYLOAD', `${kb(heroBytes)} transferred before LCP ≤ ${kb(BUDGET.heroBytes)}`, heroDetail);
  }

  /* --- whole-page payload --- */
  if (totalBytes > BUDGET.pageBytesMobile) {
    fail('PAGE-PAYLOAD', `${mb(totalBytes)} transferred at 375px after a full scroll > ${mb(BUDGET.pageBytesMobile)}`,
      heavy.length ? ['heaviest responses:', ...heavy] : []);
  } else {
    pass('PAGE-PAYLOAD', `${mb(totalBytes)} at 375px after a full scroll ≤ ${mb(BUDGET.pageBytesMobile)}`,
      heavy.length ? ['heaviest responses:', ...heavy] : []);
  }

  return { lcp: tele.lcp, heroBytes, totalBytes };
}

/* ═══════════════════════════════════════════════════════════════════════════════
   10. CHECK — keyboard walk + visible focus
   ═══════════════════════════════════════════════════════════════════════════════ */

const FOCUS_PROPS = [
  'outlineStyle', 'outlineWidth', 'outlineColor', 'outlineOffset',
  'boxShadow', 'backgroundColor', 'borderTopColor', 'borderBottomColor',
  'borderTopWidth', 'color', 'textDecorationLine', 'textDecorationColor',
  'transform', 'filter', 'opacity',
];

async function checkKeyboard(browser, url) {
  const ctx = await makeContext(browser, { w: 1440, h: 900, dsf: 1 });
  const { page } = await open(ctx, url);
  await scrollToProgress(page, 0);

  const readFocused = () =>
    page.evaluate((PROPS) => {
      const el = document.activeElement;
      if (!el || el === document.body || el === document.documentElement) return null;
      const cs = getComputedStyle(el);
      const styles = {};
      for (const p of PROPS) styles[p] = cs[p];
      const r = el.getBoundingClientRect();
      return {
        sel: window.__pwq.cssPath(el),
        desc: window.__pwq.describe(el),
        tag: el.tagName.toLowerCase(),
        name: window.__pwq.accName(el),
        w: Math.round(r.width),
        h: Math.round(r.height),
        visible: window.__pwq.visible(el),
        // The primary conversion action gets the stricter 44px rule. Keep this
        // NARROW: a nav link whose label happens to read "Kontakt" is navigation,
        // not the conversion action, and holding it to 44px fails every normal
        // header. Only a real dial/message/booking target qualifies.
        isCTA: /^(tel:|mailto:|sms:|viber:|whatsapp:)/i.test(el.getAttribute('href') || '') ||
               /wa\.me|api\.whatsapp\.com|m\.me\//i.test(el.getAttribute('href') || '') ||
               ((el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') &&
                /rezerv|pozovi|zakaz|naruč|naruc|book now|get a quote|zatraži/i.test(el.innerText || '')),
        styles,
      };
    }, FOCUS_PROPS);

  const walk = [];
  const seen = new Set();
  let nulls = 0;
  for (let i = 0; i < 160; i++) {
    await page.keyboard.press('Tab');
    const info = await readFocused();
    if (!info) { if (++nulls >= 3) break; continue; }
    nulls = 0;
    if (seen.has(info.sel)) break; // wrapped around
    seen.add(info.sel);
    walk.push(info);
  }

  // Baseline: read the same properties with NOTHING focused, so a difference proves
  // the indicator is real rather than a permanent border we mistook for focus.
  await page.evaluate(() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); });
  const baseStyles = await page.evaluate(
    ({ sels, PROPS }) =>
      sels.map((s) => {
        const el = document.querySelector(s);
        if (!el) return null;
        const cs = getComputedStyle(el);
        const o = {};
        for (const p of PROPS) o[p] = cs[p];
        return o;
      }),
    { sels: walk.map((w) => w.sel), PROPS: FOCUS_PROPS }
  );

  const noFocus = [];
  const noName = [];
  const tooSmall = [];
  for (let i = 0; i < walk.length; i++) {
    const w = walk[i];
    if (!w.visible) continue;
    const base = baseStyles[i];
    const hasOutline = w.styles.outlineStyle !== 'none' && parseFloat(w.styles.outlineWidth) >= 1;
    const changed = base ? FOCUS_PROPS.some((p) => base[p] !== w.styles[p]) : false;
    if (!hasOutline && !changed) noFocus.push(`${w.desc}  (${w.sel})`);
    if (!w.name) noName.push(`${w.desc}  (${w.sel})`);
    const min = w.isCTA ? BUDGET.minTapPxCTA : BUDGET.minTapPx;
    const inlineExempt = w.tag === 'a' && w.h < 30 && w.h >= 12; // link inside prose — SC 2.5.8 exception
    if ((w.w < min || w.h < min) && !inlineExempt) {
      tooSmall.push(`${w.desc} is ${w.w}×${w.h}px, needs ${min}×${min}`);
    }
  }

  await ctx.close();

  if (!walk.length) {
    fail('KEYBOARD-FOCUS', 'Tab reached no interactive element at all', [
      'Either the page has no links/buttons, or everything is a div with a click handler. Both are ship-blockers.',
    ]);
    return;
  }

  const detail = [`walked ${walk.length} focusable elements`];
  if (noFocus.length) {
    fail('KEYBOARD-FOCUS', `${noFocus.length} of ${walk.length} focusable elements have NO visible focus state`,
      noFocus.concat([
        'Nothing about the computed style changes when the element is focused — a keyboard user cannot see where they are.',
        'Fix: :focus-visible { outline: 2px solid <accent>; outline-offset: 3px } and never `outline: none` without a replacement.',
      ]));
  } else {
    pass('KEYBOARD-FOCUS', `all ${walk.length} focusable elements show a visible focus state`, detail);
  }

  if (noName.length) {
    fail('ACCESSIBLE-NAME', `${noName.length} focusable elements have no accessible name`, noName.concat([
      'Icon-only buttons need aria-label. Note Lucide v1 sets aria-hidden on its glyphs by default, so an icon button with no label is silently nameless.',
    ]));
  } else {
    pass('ACCESSIBLE-NAME', 'every focusable element has an accessible name');
  }

  if (tooSmall.length) {
    fail('TAP-TARGETS', `${tooSmall.length} targets below the minimum size`, tooSmall.concat([
      `WCAG 2.2 SC 2.5.8 floor is ${BUDGET.minTapPx}×${BUDGET.minTapPx}px; the primary conversion action gets ${BUDGET.minTapPxCTA}px here.`,
      'Percentage-positioned hotspots are the usual culprit — compute min(w%,h%)×containerPx at 375px and promote to the mobile grid fallback when it fails.',
    ]));
  } else {
    pass('TAP-TARGETS', `all targets ≥ ${BUDGET.minTapPx}px (CTAs ≥ ${BUDGET.minTapPxCTA}px)`);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════════
   11. CHECK — content: alt text, heading order, placeholders, links, languages
   ═══════════════════════════════════════════════════════════════════════════════ */

/* Patterns that are safe against ANY file type and against rendered text. */
const PLACEHOLDER_PATTERNS = [
  // English
  'lorem ipsum', 'dolor sit amet', 'lipsum',
  '\\bTODO\\b', '\\bFIXME\\b', '\\bTBD\\b', '\\bXXX\\b',
  'Your (Company|Business|Name|Text|Logo)', '(Company|Business) Name',
  'Insert [a-z]+ here', 'text goes here', 'Coming soon', 'Sample text',
  'example\\.(com|org)', 'foo@bar', '555-?01[0-9]{2}',
  // Bosnian / Croatian / Serbian — the ones an agent actually leaves behind
  'Vaš tekst', 'Vas tekst', 'Vaše ime', 'Vaša firma', 'Vaš naslov',
  'Unesite tekst', 'Ovdje ide', 'Ovdje unesite', 'Tekst ovdje',
  'Naslov ovdje', 'Opis usluge ovdje', 'Uskoro dostupno', 'Primjer teksta',
  'Ime firme', 'Broj telefona ovdje',
  // unrendered templating
  '\\{\\{[^}]{1,40}\\}\\}',
];
const PLACEHOLDER_RE = new RegExp(PLACEHOLDER_PATTERNS.join('|'), 'g');

/* Patterns that are ONLY valid against rendered text or HTML — never against CSS
   or JS. `[hidden]`, `[multiple]`, `::placeholder` are real CSS; `arr[i]` and
   `${x}` are real code. Scanning those file types with these produces a wall of
   false positives, which trains everyone to ignore the check — see delivery.md
   §7.2.5, which makes exactly this point. */
const TEXTONLY_PATTERNS = [
  '[Pp]laceholder text', 'PLACEHOLDER',
  '\\[[a-z][a-z ]{2,20}\\]',        // an unfilled [bracketed] slot in prose
  '\\$\\{[a-zA-Z_$][^}]{0,40}\\}',  // an unrendered template literal in prose
];
const TEXTONLY_RE = new RegExp(TEXTONLY_PATTERNS.join('|'), 'g');

async function checkContent(browser, origin, routes) {
  const ctx = await makeContext(browser, { w: 1440, h: 900, dsf: 1 });
  const altFails = [];
  const headingFails = [];
  const placeholderFails = [];
  const emptyPages = [];
  const internalLinkFails = [];
  const info = [];
  const allInternalHrefs = new Set();

  for (const route of routes) {
    const url = new URL(route, origin).href;
    const page = await ctx.newPage();
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await scrollSweep(page, { pause: 90 });
    await scrollToProgress(page, 0);

    const usedFallback = resp && resp.headers()['x-verify-fallback'] === '1';

    const r = await page.evaluate(() => {
      const Q = window.__pwq;

      /* ---- alt text ---- */
      const alt = { missing: [], filenameish: [], decorative: 0, total: 0, inLink: [] };
      for (const img of document.images) {
        if (!Q.visible(img) && img.getBoundingClientRect().height === 0) continue;
        alt.total++;
        const src = (img.currentSrc || img.src || '').split('/').pop().split('?')[0];
        if (!img.hasAttribute('alt')) { alt.missing.push(src); continue; }
        const a = img.getAttribute('alt').trim();
        if (a === '') {
          alt.decorative++;
          if (img.closest('a,button')) {
            const host = img.closest('a,button');
            if (!Q.accName(host)) alt.inLink.push(src);
          }
          continue;
        }
        const bad =
          /\.(jpe?g|png|webp|avif|gif|svg)$/i.test(a) ||
          /^(img|image|photo|slika|dsc|pic)[-_ ]?\d*$/i.test(a) ||
          /^[\d\s_-]+$/.test(a) ||
          a.length < 3 ||
          /^frame[-_]?\d+$/i.test(a);
        if (bad) alt.filenameish.push(`${src} → alt="${a}"`);
      }

      /* ---- heading order ---- */
      const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]
        .filter((h) => Q.visible(h) || (h.innerText || '').trim())
        .map((h) => ({ level: +h.tagName[1], text: (h.innerText || h.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60) }));
      const headingIssues = [];
      const h1s = hs.filter((h) => h.level === 1);
      if (h1s.length === 0) headingIssues.push('no <h1> on this page');
      if (h1s.length > 1) headingIssues.push(`${h1s.length} <h1> elements: ${h1s.map((h) => '"' + h.text + '"').join(', ')}`);
      let prev = 0;
      for (const h of hs) {
        if (!h.text) headingIssues.push(`empty <h${h.level}>`);
        if (prev && h.level > prev + 1) headingIssues.push(`h${prev} → h${h.level} skips a level at "${h.text}"`);
        prev = h.level;
      }

      /* ---- rendered text: placeholders + emptiness ---- */
      const text = (document.body.innerText || '').replace(/\s+/g, ' ').trim();

      /* ---- links ---- */
      const links = [];
      for (const a of document.querySelectorAll('a[href]')) {
        const href = a.getAttribute('href');
        links.push({
          href,
          resolved: a.href,
          text: (a.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 40),
          name: Q.accName(a),
          target: a.getAttribute('target') || '',
          rel: a.getAttribute('rel') || '',
        });
      }

      /* ---- declared languages ---- */
      const htmlLang = document.documentElement.getAttribute('lang') || '';
      const alternates = [...document.querySelectorAll('link[rel="alternate"][hreflang]')]
        .map((l) => ({ lang: l.getAttribute('hreflang'), href: l.href }));
      const langSwitchers = [...document.querySelectorAll('[hreflang],[data-lang],[lang]')]
        .map((e) => e.getAttribute('hreflang') || e.getAttribute('data-lang') || e.getAttribute('lang'))
        .filter(Boolean);

      return {
        alt, headingIssues, text, links, htmlLang, alternates,
        langSwitchers: [...new Set(langSwitchers)],
        title: document.title,
        headings: hs.length,
      };
    });

    const tag = route === '/' ? '/' : route;

    if (usedFallback && !ARGS.spa) {
      internalLinkFails.push(`${tag}: no file on disk — 404 on any static host`);
    } else if (usedFallback) {
      info.push(`${tag}: served by the SPA fallback (client route) — the host must be configured to rewrite to index.html, or this is a 404 in production`);
    }
    if (resp && resp.status() >= 400) {
      internalLinkFails.push(`${tag}: HTTP ${resp.status()}`);
    }
    if (r.text.length < BUDGET.minBodyText) {
      emptyPages.push(`${tag}: only ${r.text.length} chars of visible text (min ${BUDGET.minBodyText}) — did it render?`);
    }
    r.alt.missing.forEach((s) => altFails.push(`${tag}: <img> with NO alt attribute — ${s}`));
    r.alt.filenameish.forEach((s) => altFails.push(`${tag}: alt is a filename or a stub — ${s}`));
    r.alt.inLink.forEach((s) => altFails.push(`${tag}: alt="" inside a link with no other text — the link has no name — ${s}`));
    if (r.alt.total && r.alt.decorative / r.alt.total > 0.5) {
      altFails.push(`${tag}: ${r.alt.decorative}/${r.alt.total} images are alt="" — a gallery of the client's own work is content, not decoration`);
    }
    r.headingIssues.forEach((s) => headingFails.push(`${tag}: ${s}`));

    const hits = [
      ...new Set([
        ...(r.text.match(PLACEHOLDER_RE) || []),
        ...(r.text.match(TEXTONLY_RE) || []),
      ].map((s) => s.trim())),
    ];
    hits.forEach((h) => placeholderFails.push(`${tag}: visible placeholder text "${h}"`));
    // A tel: href that is not a dialable number is the most expensive placeholder
    // on a local-business site: the entire conversion action is dead.
    for (const l of r.links) {
      if (!/^tel:/i.test(l.href)) continue;
      const digits = l.href.slice(4).replace(/[^\d]/g, '');
      if (/x/i.test(l.href.slice(4)) || digits.length < 6) {
        placeholderFails.push(`${tag}: tel: link is not a real number → ${l.href} — the conversion action does not work`);
      }
    }
    if (!r.title || /vite|react|app|document|untitled/i.test(r.title)) {
      placeholderFails.push(`${tag}: <title> is "${r.title}" — a default template title`);
    }

    for (const l of r.links) {
      if (!l.name) internalLinkFails.push(`${tag}: link with no accessible name → ${l.href}`);
      if (/^tel:/i.test(l.href) && /[\s()\-]/.test(l.href.slice(4))) {
        internalLinkFails.push(`${tag}: tel: link contains spaces/punctuation, iOS will mangle it → ${l.href}`);
      }
      if (l.target === '_blank' && !/noopener/.test(l.rel)) {
        internalLinkFails.push(`${tag}: target="_blank" without rel="noopener" → ${l.href}`);
      }
      if (l.href.startsWith('#')) {
        // hash targets are resolved in-page below
      } else if (l.resolved.startsWith(origin)) {
        allInternalHrefs.add(l.resolved);
      }
    }

    // Hash targets must exist in the DOM of the page that links to them.
    const badHashes = await page.evaluate(() =>
      [...document.querySelectorAll('a[href^="#"]')]
        .map((a) => a.getAttribute('href'))
        .filter((h) => h && h !== '#' && !document.querySelector(h.replace(/^#/, '#')))
    ).catch(() => []);
    badHashes.forEach((h) => internalLinkFails.push(`${tag}: in-page link ${h} has no matching element`));

    info.push(`${tag}: ${r.text.length} chars, ${r.headings} headings, ${r.alt.total} images, ${r.links.length} links, lang="${r.htmlLang}"`);
    await page.close();
  }

  /* ---- resolve every internal href we collected ---- */
  const checked = new Set();
  for (const href of [...allInternalHrefs].slice(0, 60)) {
    const p = new URL(href).pathname;
    if (checked.has(p)) continue;
    checked.add(p);
    try {
      let res = await fetch(href, { method: 'HEAD', redirect: 'follow' });
      if (res.status === 405 || res.status === 501) res = await fetch(href, { method: 'GET', redirect: 'follow' });
      if (res.status >= 400) internalLinkFails.push(`internal link ${p} → HTTP ${res.status}`);
      else if (res.headers.get('x-verify-fallback') === '1' && !ARGS.spa) {
        internalLinkFails.push(`internal link ${p} → no such file (SPA fallback)`);
      }
    } catch (e) {
      internalLinkFails.push(`internal link ${p} → unreachable (${e.message})`);
    }
  }

  await ctx.close();

  record('CONTENT-SURVEY', 'per-route content survey', 'INFO', info);

  altFails.length
    ? fail('ALT-TEXT', `${altFails.length} image alt-text defects`, altFails.concat([
        'Write alt from the trade and the subject ("Servisiranje kočnica u radionici u Gradačcu"), never from the filename.',
        'alt="" is correct ONLY for genuinely decorative images, and never inside a link with no other text.',
      ]))
    : pass('ALT-TEXT', 'every image has meaningful alt text');

  headingFails.length
    ? fail('HEADING-ORDER', `${headingFails.length} heading-structure defects`, headingFails.concat([
        'Exactly one <h1> per page, containing the business name and the city (local search intent). No skipped levels.',
      ]))
    : pass('HEADING-ORDER', 'one h1 per page, no skipped levels, no empty headings');

  placeholderFails.length
    ? fail('PLACEHOLDER-TEXT', `${placeholderFails.length} placeholders survived into the built site`, placeholderFails)
    : pass('PLACEHOLDER-TEXT', 'no lorem / TODO / "Vaš tekst" / unrendered template braces in the rendered page');

  emptyPages.length
    ? fail('PAGE-RENDERED', `${emptyPages.length} routes rendered almost nothing`, emptyPages)
    : pass('PAGE-RENDERED', `all ${routes.length} routes render real content`);

  internalLinkFails.length
    ? fail('INTERNAL-LINKS', `${internalLinkFails.length} link defects`, internalLinkFails)
    : pass('INTERNAL-LINKS', `every internal link resolves (${checked.size} unique paths)`);
}

/* ═══════════════════════════════════════════════════════════════════════════════
   12. CHECK — languages complete
   ═══════════════════════════════════════════════════════════════════════════════ */

async function checkLanguages(browser, origin, dir) {
  const ctx = await makeContext(browser, { w: 1440, h: 900, dsf: 1 });
  const page = await ctx.newPage();
  await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

  const decl = await page.evaluate(() => ({
    htmlLang: document.documentElement.getAttribute('lang') || '',
    alternates: [...document.querySelectorAll('link[rel="alternate"][hreflang]')]
      .map((l) => ({ lang: l.getAttribute('hreflang'), href: l.href })),
    ogLocale: (document.querySelector('meta[property="og:locale"]') || {}).content || '',
    ogAlt: [...document.querySelectorAll('meta[property="og:locale:alternate"]')].map((m) => m.content),
    switcherLinks: [...document.querySelectorAll('a[hreflang], [data-lang] a, a[data-lang]')]
      .map((a) => ({ lang: a.getAttribute('hreflang') || a.getAttribute('data-lang'), href: a.href }))
      .filter((x) => x.lang),
  }));

  const failures = [];
  const infos = [];

  if (!decl.htmlLang) {
    failures.push('<html> has no lang attribute — screen readers pick the wrong voice and hyphenation is wrong');
  } else if (!/^[a-z]{2}(-[A-Za-z]{2,4})?$/.test(decl.htmlLang)) {
    failures.push(`<html lang="${decl.htmlLang}"> is not a valid BCP 47 tag`);
  } else {
    infos.push(`base language: ${decl.htmlLang}`);
  }

  // Every declared language: the union of hreflang alternates, og:locale:alternate,
  // any switcher links, and anything the caller passed with --langs.
  const declaredMap = new Map();
  for (const a of decl.alternates) if (a.lang && a.lang !== 'x-default') declaredMap.set(a.lang.toLowerCase(), a.href);
  for (const s of decl.switcherLinks) if (!declaredMap.has(s.lang.toLowerCase())) declaredMap.set(s.lang.toLowerCase(), s.href);
  for (const l of ARGS.langs) if (!declaredMap.has(l.toLowerCase())) declaredMap.set(l.toLowerCase(), new URL(`/${l}/`, origin).href);
  for (const l of decl.ogAlt) {
    const code = String(l).split('_')[0].toLowerCase();
    if (code && !declaredMap.has(code)) declaredMap.set(code, null);
  }

  if (declaredMap.size === 0) {
    await ctx.close();
    skip('I18N-COMPLETE', `single-language site (${decl.htmlLang || 'lang not set'}) — nothing to cross-check`, [
      'If this site is supposed to be multilingual, the language versions are not declared at all: no link[rel=alternate][hreflang], no og:locale:alternate, no switcher.',
    ]);
    if (failures.length) fail('LANG-ATTR', 'language declaration defects', failures);
    else pass('LANG-ATTR', `lang="${decl.htmlLang}" declared correctly`, infos);
    return;
  }

  // Base page text for comparison.
  const baseText = await page.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' ').trim());
  const variants = [{ lang: decl.htmlLang.toLowerCase(), text: baseText, url: origin }];

  for (const [lang, href] of declaredMap) {
    if (!href) { failures.push(`${lang}: declared via og:locale:alternate but no URL is reachable from the page`); continue; }
    if (lang === decl.htmlLang.toLowerCase()) continue;
    const p = await ctx.newPage();
    try {
      const resp = await p.goto(href, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await p.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
      if (!resp || resp.status() >= 400) {
        failures.push(`${lang}: ${href} → HTTP ${resp ? resp.status() : 'no response'}`);
        await p.close();
        continue;
      }
      const v = await p.evaluate(() => ({
        text: (document.body.innerText || '').replace(/\s+/g, ' ').trim(),
        lang: document.documentElement.getAttribute('lang') || '',
        title: document.title,
        h1: (document.querySelector('h1') || {}).innerText || '',
      }));
      variants.push({ lang, text: v.text, url: href });
      if (!v.lang.toLowerCase().startsWith(lang.split('-')[0])) {
        failures.push(`${lang}: page at ${href} declares lang="${v.lang}" — the switcher points at the wrong document`);
      }
      if (!v.h1.trim()) failures.push(`${lang}: no <h1> content`);
      if (v.text === baseText) failures.push(`${lang}: body text is byte-identical to ${decl.htmlLang} — not translated`);
      infos.push(`${lang}: ${v.text.length} chars, h1 "${v.h1.trim().slice(0, 40)}"`);
    } catch (e) {
      failures.push(`${lang}: ${href} unreachable (${e.message})`);
    }
    await p.close();
  }

  const longest = Math.max(...variants.map((v) => v.text.length));
  for (const v of variants) {
    if (v.text.length < longest * BUDGET.langTextRatio) {
      failures.push(
        `${v.lang}: only ${v.text.length} chars vs ${longest} in the fullest language ` +
        `(${Math.round((v.text.length / longest) * 100)}%) — sections are missing from this translation`
      );
    }
  }

  // Locale JSON key-set diff, when the build ships one.
  if (dir) {
    const localeDirs = [];
    const walkFor = (d, depth = 0) => {
      if (depth > 4 || !fs.existsSync(d)) return;
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        if (e.isDirectory()) {
          if (/^(locales?|lang|i18n|translations?)$/i.test(e.name)) localeDirs.push(path.join(d, e.name));
          else walkFor(path.join(d, e.name), depth + 1);
        }
      }
    };
    walkFor(dir);
    for (const ld of localeDirs) {
      const files = fs.readdirSync(ld).filter((f) => f.endsWith('.json'));
      if (files.length < 2) continue;
      const flat = (o, p = '') =>
        Object.entries(o).flatMap(([k, v]) =>
          v && typeof v === 'object' && !Array.isArray(v) ? flat(v, `${p}${k}.`) : [[`${p}${k}`, v]]
        );
      const loaded = {};
      for (const f of files) {
        try { loaded[f.replace(/\.json$/, '')] = Object.fromEntries(flat(JSON.parse(fs.readFileSync(path.join(ld, f), 'utf8')))); }
        catch (e) { failures.push(`${ld}/${f} is not valid JSON: ${e.message}`); }
      }
      const names = Object.keys(loaded);
      if (names.length < 2) continue;
      const refName = names.includes(decl.htmlLang) ? decl.htmlLang : names[0];
      const ref = loaded[refName];
      for (const n of names.filter((x) => x !== refName)) {
        const t = loaded[n];
        const missing = Object.keys(ref).filter((k) => !(k in t));
        const empty = Object.entries(t).filter(([, v]) => typeof v === 'string' && !v.trim()).map(([k]) => k);
        const same = Object.entries(t).filter(([k, v]) => typeof v === 'string' && v.length > 12 && v === ref[k]).map(([k]) => k);
        if (missing.length) failures.push(`${path.relative(dir, ld)}/${n}.json: ${missing.length} keys missing vs ${refName} → ${missing.slice(0, 5).join(', ')}`);
        if (empty.length) failures.push(`${path.relative(dir, ld)}/${n}.json: ${empty.length} empty values → ${empty.slice(0, 5).join(', ')}`);
        if (same.length) failures.push(`${path.relative(dir, ld)}/${n}.json: ${same.length} values identical to ${refName} (untranslated) → ${same.slice(0, 4).join(', ')}`);
      }
      infos.push(`locale files: ${path.relative(dir, ld)} (${names.join(', ')})`);
    }
  }

  await ctx.close();

  if (failures.length) {
    fail('I18N-COMPLETE', `${declaredMap.size + 1} declared languages, ${failures.length} completeness defects`, failures);
  } else {
    pass('I18N-COMPLETE', `all ${variants.length} declared languages are complete`, infos);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════════
   13. CHECK — static analysis of the built files
   ═══════════════════════════════════════════════════════════════════════════════ */

function walkFiles(root) {
  const out = [];
  (function rec(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) rec(p);
      else out.push(p);
    }
  })(root);
  return out;
}

async function checkStatic(dir, browser, origin) {
  const files = walkFiles(dir);
  const byExt = (exts) => files.filter((f) => exts.includes(path.extname(f).toLowerCase()));
  const gz = (f) => zlib.gzipSync(fs.readFileSync(f), { level: 9 }).length;

  /* ---- bundle budgets ---- */
  const js = byExt(['.js', '.mjs']).filter((f) => !f.endsWith('.map'));
  const css = byExt(['.css']);
  const jsGzip = js.reduce((a, f) => a + gz(f), 0);
  const cssGzip = css.reduce((a, f) => a + gz(f), 0);
  const jsDetail = js
    .map((f) => ({ f, raw: fs.statSync(f).size, g: gz(f) }))
    .sort((a, b) => b.g - a.g)
    .slice(0, 6)
    .map((x) => `${kb(x.g)} gz (${kb(x.raw)} raw)  ${path.relative(dir, x.f)}`);

  jsGzip > BUDGET.jsGzip
    ? fail('JS-BUDGET', `${kb(jsGzip)} of gzipped JS > ${kb(BUDGET.jsGzip)}`, jsDetail.concat([
        'For a single promotional page: drop react-router (one page, anchor nav), prefer native CSS scroll-driven reveals over a motion library for every non-hero section, and let the library tree-shake down to the scrubber only.',
      ]))
    : pass('JS-BUDGET', `${kb(jsGzip)} of gzipped JS ≤ ${kb(BUDGET.jsGzip)}`, jsDetail);

  cssGzip > BUDGET.cssGzip
    ? fail('CSS-BUDGET', `${kb(cssGzip)} of gzipped CSS > ${kb(BUDGET.cssGzip)}`,
        css.map((f) => `${kb(gz(f))} gz  ${path.relative(dir, f)}`))
    : pass('CSS-BUDGET', `${kb(cssGzip)} of gzipped CSS ≤ ${kb(BUDGET.cssGzip)}`);

  /* ---- fonts self-hosted, latin-ext present ---- */
  const fonts = byExt(['.woff2', '.woff', '.ttf', '.otf']);
  const fontBytes = fonts.reduce((a, f) => a + fs.statSync(f).size, 0);
  if (fontBytes > BUDGET.fontBytes) {
    fail('FONT-BUDGET', `${kb(fontBytes)} of self-hosted fonts > ${kb(BUDGET.fontBytes)}`,
      fonts.map((f) => `${kb(fs.statSync(f).size)}  ${path.relative(dir, f)}`));
  } else if (fonts.length === 0) {
    warn('FONT-BUDGET', 'no self-hosted font files in the build', [
      'Either the site uses system fonts (legitimate) or it is pulling fonts from a third-party host (a render-blocking request in the critical path — see FONT-HOST).',
    ]);
  } else {
    pass('FONT-BUDGET', `${fonts.length} self-hosted font files, ${kb(fontBytes)} ≤ ${kb(BUDGET.fontBytes)}`);
  }

  /* ---- index.html head hygiene ---- */
  const indexPath = path.join(dir, 'index.html');
  if (fs.existsSync(indexPath)) {
    const html = fs.readFileSync(indexPath, 'utf8');
    const head = (html.match(/<head[\s\S]*?<\/head>/i) || [''])[0];
    const externalCss = [...head.matchAll(/<link[^>]+rel=["']?stylesheet["']?[^>]*>/gi)]
      .map((m) => m[0])
      .filter((tag) => /href=["']https?:\/\//i.test(tag));
    if (externalCss.length) {
      fail('FONT-HOST', `${externalCss.length} render-blocking external stylesheet(s) in <head>`,
        externalCss.map((t) => t.slice(0, 160)).concat([
          'A fonts.googleapis.com stylesheet blocks first paint on two extra hosts (DNS + TLS + request + the font files it then discovers).',
          'Fix: self-host woff2. One curl: https://gwfh.mranftl.com/api/fonts/<family>?download=zip&subsets=latin,latin-ext&variants=regular,700&formats=woff2',
          'latin-ext is MANDATORY for bs/hr/sr — č ć ž š đ live there. Omit it and the client\'s own business name renders as tofu.',
        ]));
    } else {
      pass('FONT-HOST', 'no render-blocking external stylesheet in <head>');
    }

    const isSpaShell = /<div id=["']root["']><\/div>|<div id=["']app["']><\/div>/.test(html) &&
      html.replace(/<head[\s\S]*?<\/head>/i, '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, '').trim().length < 200;
    const hasPosterPreload = /<link[^>]+rel=["']?preload["']?[^>]*as=["']?image["']?/i.test(head);
    if (isSpaShell && !hasPosterPreload) {
      fail('LCP-PRELOAD', 'client-rendered shell with no <link rel="preload" as="image"> in <head>', [
        'index.html contains only a root div and a module script, so a poster <img> inside a component cannot paint until the bundle downloads, parses and mounts.',
        'Editing the component does nothing. The fix goes in index.html:',
        '  <link rel="preload" as="image" href="/…/poster.jpg" fetchpriority="high">',
      ]);
    } else if (hasPosterPreload) {
      pass('LCP-PRELOAD', 'poster preload present in <head>');
    } else {
      pass('LCP-PRELOAD', 'server-rendered HTML — the hero <img> is discoverable in the markup itself');
    }

    // SEO/social basics — a blank WhatsApp preview kills the primary share channel.
    const seoMissing = [];
    if (!/<link[^>]+rel=["']?canonical["']?/i.test(head)) seoMissing.push('<link rel="canonical">');
    if (!/property=["']og:image["']/i.test(head)) seoMissing.push('<meta property="og:image"> (1200×630) — every WhatsApp/Viber/Facebook share renders blank without it');
    if (!/<meta[^>]+name=["']description["']/i.test(head)) seoMissing.push('<meta name="description">');
    const hasJsonLd = /<script[^>]+type=["']application\/ld\+json["']/i.test(html);
    if (!hasJsonLd) seoMissing.push('LocalBusiness JSON-LD with address, telephone, openingHoursSpecification');
    else {
      for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
        try { JSON.parse(m[1]); } catch (e) { seoMissing.push(`JSON-LD block is not parseable JSON: ${e.message}`); }
      }
    }
    seoMissing.length
      ? fail('SEO-META', `${seoMissing.length} discovery/social tags missing from <head>`, seoMissing)
      : pass('SEO-META', 'canonical, description, og:image and parseable JSON-LD all present');
  } else {
    warn('FONT-HOST', 'no index.html at the root of the built directory', []);
  }

  /* ---- the CSS order trap + compositor discipline ---- */
  const cssText = css.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  const orderTrap = [];
  // Within one declaration block, `animation-timeline` BEFORE the `animation`
  // shorthand is silently reset to auto by the shorthand. Same for animation-range.
  for (const block of cssText.match(/\{[^{}]*\}/g) || []) {
    const tl = block.search(/animation-timeline\s*:/);
    const rg = block.search(/animation-range\s*:/);
    const sh = block.search(/(^|[;{\s])animation\s*:/);
    if (sh >= 0 && tl >= 0 && tl < sh) orderTrap.push(`animation-timeline declared BEFORE the animation shorthand: ${block.slice(0, 120).replace(/\s+/g, ' ')}`);
    if (sh >= 0 && rg >= 0 && rg < sh) orderTrap.push(`animation-range declared BEFORE the animation shorthand: ${block.slice(0, 120).replace(/\s+/g, ' ')}`);
  }
  const usesTimeline = /animation-timeline\s*:/.test(cssText);
  const guarded = /@supports\s*\([^)]*animation-timeline/i.test(cssText);
  if (usesTimeline && !guarded) {
    orderTrap.push('animation-timeline used without an @supports (animation-timeline: view()) guard — Firefox stable has not shipped scroll-driven animations, so those sections do nothing there. Ship an IntersectionObserver or GSAP fallback as the load-bearing path.');
  }
  orderTrap.length
    ? fail('CSS-SCROLL-TRAPS', `${orderTrap.length} scroll-driven CSS defects`, orderTrap)
    : pass('CSS-SCROLL-TRAPS', usesTimeline
        ? 'animation-timeline declared after the shorthand and guarded by @supports'
        : 'no native scroll-driven CSS in the build');

  const reduceGuard = /prefers-reduced-motion/.test(cssText) ||
    js.some((f) => /prefers-reduced-motion/.test(fs.readFileSync(f, 'utf8')));
  reduceGuard
    ? pass('REDUCE-BRANCH', 'a prefers-reduced-motion branch exists in the shipped CSS/JS')
    : fail('REDUCE-BRANCH', 'no prefers-reduced-motion anywhere in the built CSS or JS', [
        'Every animated thing ships a reduced-motion branch. Not optional, not a nice-to-have.',
      ]);

  /* ---- host limits ---- */
  const big = files.filter((f) => fs.statSync(f).size > BUDGET.maxFileBytes);
  if (files.length > BUDGET.maxFiles || big.length) {
    fail('HOST-LIMITS', `${files.length} files, ${big.length} over ${mb(BUDGET.maxFileBytes)}`,
      big.map((f) => `${mb(fs.statSync(f).size)}  ${path.relative(dir, f)}`));
  } else {
    pass('HOST-LIMITS', `${files.length} files ≤ ${BUDGET.maxFiles}, largest ${mb(Math.max(...files.map((f) => fs.statSync(f).size)))} ≤ ${mb(BUDGET.maxFileBytes)}`);
  }

  /* ---- placeholder text in the built source, not just the rendered page ----
     A placeholder can survive templating into a string that never renders on the
     home page but does render on a route the crawl never reached, so scan the
     files too. The universal patterns go over every text file; the prose-only
     patterns go over HTML only — `[hidden]` is real CSS and `arr[i]` is real code,
     and scanning those types with a bracket pattern makes the check noise. */
  const scanFiles = files.filter((f) => ['.html', '.css', '.js', '.mjs', '.json', '.txt', '.xml'].includes(path.extname(f).toLowerCase()));
  const srcPlaceholders = [];
  for (const f of scanFiles) {
    const t = fs.readFileSync(f, 'utf8');
    for (const m of new Set(t.match(PLACEHOLDER_RE) || [])) {
      srcPlaceholders.push(`${path.relative(dir, f)}: "${String(m).trim().slice(0, 60)}"`);
    }
    if (/\.html?$/i.test(f)) {
      for (const m of new Set(t.match(TEXTONLY_RE) || [])) {
        srcPlaceholders.push(`${path.relative(dir, f)}: "${String(m).trim().slice(0, 60)}"`);
      }
    }
  }
  srcPlaceholders.length
    ? fail('PLACEHOLDER-FILES', `${srcPlaceholders.length} placeholders in built HTML/CSS/JSON`, srcPlaceholders.slice(0, 20))
    : pass('PLACEHOLDER-FILES', 'no placeholder strings in the built HTML/CSS/JSON');

  /* ---- frame sequence: disk budget + decoded memory ---- */
  const frameFiles = files.filter((f) => /(^|[/\\])frame[-_]?\d+\.(jpe?g|png|webp|avif)$/i.test(f));
  if (frameFiles.length) {
    const dirs = [...new Set(frameFiles.map((f) => path.dirname(f)))];
    const detail = [];
    let worstMB = 0;
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
    for (const d of dirs) {
      const inDir = frameFiles.filter((f) => path.dirname(f) === d);
      const bytes = inDir.reduce((a, f) => a + fs.statSync(f).size, 0);
      const rel = '/' + path.relative(dir, inDir[0]).split(path.sep).join('/');
      const dims = await page.evaluate(
        (src) =>
          new Promise((res) => {
            const i = new Image();
            i.onload = () => res({ w: i.naturalWidth, h: i.naturalHeight });
            i.onerror = () => res({ w: 0, h: 0 });
            i.src = src;
          }),
        new URL(rel, origin).href
      );
      const decodedMB = (dims.w * dims.h * 4 * inDir.length) / 1024 / 1024;
      worstMB = Math.max(worstMB, decodedMB);
      // Padding width matters: 2-digit naming overflows past 99 frames and sorts wrong.
      const pad = Math.min(...inDir.map((f) => (path.basename(f).match(/(\d+)\./) || [, ''])[1].length));
      detail.push(
        `${path.relative(dir, d)}: ${inDir.length} frames, ${mb(bytes)} on disk, ` +
        `${dims.w}×${dims.h} → ${decodedMB.toFixed(0)}MB decoded (W×H×4×frames), ${pad}-digit naming`
      );
      if (pad < 4 && inDir.length > 90) {
        detail.push(`  ${path.relative(dir, d)}: ${pad}-digit frame numbering with ${inDir.length} frames — overflows and sorts wrong past 99. Use 4-digit padding.`);
      }
    }
    await ctx.close();
    if (worstMB > BUDGET.decodedMemoryMB) {
      fail('DECODED-MEMORY', `${worstMB.toFixed(0)}MB of live decoded bitmap > ${BUDGET.decodedMemoryMB}MB`, detail.concat([
        'File size on disk is not the constraint — decoded size is, and it is invisible in any network panel. This is the iOS Safari tab-kill risk.',
        'Above the budget the sliding decoded-frame window with ImageBitmap.close() on eviction is mandatory, not optional. Pin the every-Nth keyframe subset permanently so a backward scrub always has something to draw.',
      ]));
    } else {
      pass('DECODED-MEMORY', `${worstMB.toFixed(0)}MB peak decoded bitmap ≤ ${BUDGET.decodedMemoryMB}MB`, detail);
    }
  } else {
    skip('DECODED-MEMORY', 'no frame sequence in the build');
  }

  /* ---- cache headers template for the host ---- */
  const hasHeaders = fs.existsSync(path.join(dir, '_headers'));
  hasHeaders
    ? pass('CACHE-HEADERS', '_headers present — immutable caching on hashed asset paths')
    : warn('CACHE-HEADERS', 'no public/_headers file in the build', [
        'Cloudflare Pages does not apply immutable caching to arbitrary paths by itself. Ship:',
        '  /anim/*',
        '    Cache-Control: public, max-age=31536000, immutable',
      ]);
}

/* ═══════════════════════════════════════════════════════════════════════════════
   14. Route discovery
   ═══════════════════════════════════════════════════════════════════════════════ */

async function discoverRoutes(browser, origin, max) {
  const ctx = await makeContext(browser, { w: 1440, h: 900, dsf: 1 });
  const page = await ctx.newPage();
  await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  const hrefs = await page.evaluate(
    (origin) =>
      [...document.querySelectorAll('a[href]')]
        .map((a) => a.href)
        .filter((h) => h.startsWith(origin))
        .map((h) => new URL(h).pathname)
        .filter((p) => !/\.(jpg|jpeg|png|webp|avif|svg|pdf|mp4|mp3|zip)$/i.test(p)),
    origin
  );
  await ctx.close();
  const uniq = [...new Set(['/', ...hrefs])];
  return uniq.slice(0, Math.max(1, max));
}

/* ═══════════════════════════════════════════════════════════════════════════════
   15. Report writing
   ═══════════════════════════════════════════════════════════════════════════════ */

async function writeReport(outDir, meta) {
  const fails = RESULTS.filter((r) => r.status === 'FAIL');
  const warns = RESULTS.filter((r) => r.status === 'WARN');
  const passes = RESULTS.filter((r) => r.status === 'PASS');

  const lines = [];
  lines.push('# premium-web verification report');
  lines.push('');
  lines.push(`- target: \`${meta.target}\``);
  lines.push(`- run: ${new Date().toISOString()}`);
  lines.push(`- chromium: \`${meta.chrome || 'playwright default'}\``);
  lines.push(`- verdict: **${fails.length ? 'NO-SHIP' : 'SHIP'}** — ${passes.length} pass, ${warns.length} warn, ${fails.length} fail`);
  lines.push('');
  lines.push('## Screenshots — the agent MUST Read these');
  lines.push('');
  lines.push('Nothing else in this report can tell you the page looks broken, generic or unfinished.');
  lines.push('');
  const shotCheck = RESULTS.find((r) => r.id === 'VISUAL-SHOTS');
  const rmCheck = RESULTS.find((r) => r.id === 'REDUCED-SHOTS');
  for (const s of [...(shotCheck ? shotCheck.detail : []), ...(rmCheck ? rmCheck.detail : [])]) {
    lines.push(`- \`${path.join(outDir, s)}\``);
  }
  lines.push('');
  for (const [heading, set] of [['## Failures', fails], ['## Warnings', warns], ['## Passed', passes]]) {
    if (!set.length) continue;
    lines.push(heading);
    lines.push('');
    for (const r of set) {
      lines.push(`### ${r.status} — ${r.id}: ${r.title}`);
      lines.push('');
      for (const d of r.detail) lines.push(`- ${d}`);
      lines.push('');
    }
  }
  lines.push('## The smooth-scroll trap');
  lines.push('');
  lines.push('`scroll-behavior: smooth` makes programmatic scrolling animate, so a screenshot taken');
  lines.push('immediately after `window.scrollTo()` captures a mid-transition frame and any assertion');
  lines.push('taken there reads the previous scroll position. This harness forces `scroll-behavior: auto`,');
  lines.push('scrolls with `behavior: "instant"` plus a direct `scrollTop` write, and then polls until the');
  lines.push('scroll position stops changing before it measures anything. Do not remove those three.');
  lines.push('');

  await fsp.writeFile(path.join(outDir, 'report.md'), lines.join('\n'), 'utf8');
  await fsp.writeFile(
    path.join(outDir, 'report.json'),
    JSON.stringify({ meta, budget: BUDGET, verdict: fails.length ? 'NO-SHIP' : 'SHIP', results: RESULTS }, null, 2),
    'utf8'
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   16. main
   ═══════════════════════════════════════════════════════════════════════════════ */

async function main() {
  const t0 = Date.now();
  const outDir = ARGS.out;
  const shotDir = path.join(outDir, 'shots');
  await fsp.mkdir(shotDir, { recursive: true });

  const { chromium } = await loadPlaywright();
  const chrome = resolveChrome(ARGS.chrome);
  if (!chrome) {
    warn('CHROMIUM', 'the pinned Chromium path was not found — falling back to playwright resolution', [
      `expected ${ARGS.chrome}`,
      'Do NOT run `playwright install`; if this container really has no browser, say so and stop.',
    ]);
  }

  let server = null;
  let origin;
  if (ARGS.dir) {
    if (!fs.existsSync(ARGS.dir)) {
      console.error(`verify.mjs: --dir ${ARGS.dir} does not exist. Run the build first.`);
      process.exit(2);
    }
    server = await startServer(ARGS.dir, { spa: ARGS.spa });
    origin = server.origin;
  } else {
    origin = ARGS.url.replace(/\/$/, '');
  }

  console.log('');
  console.log('premium-web verification gate');
  console.log(`  target      ${ARGS.dir ? ARGS.dir + '  (served at ' + origin + ')' : origin}`);
  console.log(`  chromium    ${chrome || 'playwright default'}`);
  console.log(`  output      ${outDir}`);
  console.log(`  smooth-scroll ${ARGS.keepSmoothScroll ? 'LEFT ON (measurements unreliable)' : 'neutralised for measurement'}`);
  console.log('');

  const browser = await chromium.launch({
    ...(chrome ? { executablePath: chrome } : {}),
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'],
  });

  try {
    const routes = ARGS.dir || ARGS.url ? await discoverRoutes(browser, origin, ARGS.maxRoutes) : ['/'];
    record('ROUTES', `${routes.length} routes under test`, 'INFO', routes);

    const baseline = await checkVisualAndScrollCLS(browser, origin, shotDir);
    await checkOverflow(browser, origin);
    await checkReducedMotion(browser, origin, shotDir, baseline);
    await checkPerformance(browser, origin);
    await checkKeyboard(browser, origin);
    await checkContent(browser, origin, routes);
    await checkLanguages(browser, origin, ARGS.dir);
    if (ARGS.dir && !ARGS.noStatic) await checkStatic(ARGS.dir, browser, origin);
    else skip('STATIC-FILES', 'static file checks need --dir (skipped for a remote --url)');
  } catch (e) {
    fail('HARNESS', 'the verification harness itself threw', [String(e && e.stack ? e.stack.split('\n').slice(0, 6).join(' | ') : e)]);
  } finally {
    await browser.close().catch(() => {});
    if (server) await server.close();
  }

  await writeReport(outDir, { target: ARGS.dir || ARGS.url, chrome, durationMs: Date.now() - t0 });

  const fails = RESULTS.filter((r) => r.status === 'FAIL');
  const warns = RESULTS.filter((r) => r.status === 'WARN');
  const passes = RESULTS.filter((r) => r.status === 'PASS');

  console.log('');
  console.log('─'.repeat(78));
  console.log(`  ${passes.length} PASS   ${warns.length} WARN   ${fails.length} FAIL      (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  console.log('─'.repeat(78));
  if (fails.length) {
    console.log('  VERDICT: NO-SHIP');
    console.log('');
    for (const f of fails) console.log(`   ✗ ${f.id.padEnd(20)} ${f.title}`);
  } else {
    console.log('  VERDICT: SHIP');
  }
  console.log('');
  console.log(`  report      ${path.join(outDir, 'report.md')}`);
  console.log(`  screenshots ${shotDir}   ← Read these before you believe any of the above`);
  console.log('');

  process.exit(fails.length ? 1 : 0);
}

main().catch((e) => {
  console.error('verify.mjs crashed:', e);
  process.exit(2);
});

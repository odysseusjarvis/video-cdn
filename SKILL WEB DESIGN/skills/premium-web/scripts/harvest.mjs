#!/usr/bin/env node
/**
 * harvest.mjs — pull the CLIENT'S OWN visual content off their existing web presence.
 *
 * Part of the `premium-web` skill. This is step 3 of the workflow: everything the
 * site will ship is harvested here, from pages the client already owns.
 *
 *   node harvest.mjs <url|imageUrl ...> [options]
 *
 * What it extracts from every page:
 *   og:image / og:image:secure_url / twitter:image / itemprop=image
 *   every <img> src (+ data-src / data-lazy-src / data-original) and the LARGEST srcset candidate
 *   <picture><source srcset> and <video>/<source> src + poster
 *   CSS url() backgrounds from <style>, style="" attributes AND every linked stylesheet
 *   JSON-LD image / logo / photo / thumbnailUrl / contentUrl fields
 *   <link rel=preload as=image> (href and imagesrcset)
 *   <link rel=icon|apple-touch-icon|mask-icon>  ← the logo, which is what makes SET-G possible
 *
 * It also lifts the client's real NAP data (name, telephone, address, opening hours,
 * sameAs, geo, price range) out of JSON-LD plus every tel:/viber:/wa.me link, because
 * that is the only place those facts exist and every later step needs them.
 *
 * ── SECURITY ────────────────────────────────────────────────────────────────────
 * This script touches NO credentials. It does not read, enumerate, probe or test any
 * API key, token or ambient cloud credential from the environment, and it never will.
 * It reads exactly three environment variables, all of them named, documented and
 * non-secret — no enumeration, no pattern-matching, no `Object.keys(process.env)`:
 *   HTTPS_PROXY / https_proxy   route the browser's own requests through the proxy this
 *                               container already requires (loopback is never proxied)
 *   PREMIUM_WEB_TOOLS           where to install sharp, so it never lands in the client's
 *                               package.json
 *   TMPDIR                      where the curl HTTP/1.1 fallback writes its temp file
 * Reading a named path or proxy variable is not credential access; enumerating the
 * environment is. If a future step needs a key, that key must be one the END USER
 * explicitly supplied for their own task, validated at the point of use — never
 * something discovered by looking around.
 *
 * ── DO NOT SCRAPE SOCIAL PLATFORMS ──────────────────────────────────────────────
 * Instagram and Facebook profile/page URLs are refused by design. Their CDN URLs
 * (scontent*.cdninstagram.com, *.fbcdn.net) are signed and expire in hours: if the user
 * pastes them, pass them as direct arguments and they are fetched FIRST, immediately.
 * Otherwise tell the user to drop the files into <out>/raw/ themselves.
 *
 * ── ENVIRONMENT NOTES (verified in this container, 2026-08-02) ──────────────────
 * Node v22.  sharp is auto-installed into a sibling .tools/ dir so it never pollutes
 * the client's package.json.  Chromium is ALREADY installed at
 *   /opt/pw-browsers/chromium-1194/chrome-linux/chrome
 * with playwright 1.62.1 present — launch with { executablePath, args:['--no-sandbox'] }.
 * NEVER run `playwright install`.
 *
 * Only run this against pages the user has the right to harvest — their own client's.
 *
 * Exit codes: 0 = at least one asset downloaded. 3 = pages read but ZERO bytes obtained
 * (SET class auto-downgraded — see the banner). 1 = usage/fatal error.
 */

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const execFileAsync = promisify(execFile);

/* ═══════════════════════════════════════════════════════════════════════════════
   0. Constants
   ═══════════════════════════════════════════════════════════════════════════════ */

const UA_PRIMARY =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36';
const UA_SECONDARY =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15';

const RETRYABLE_STATUS = new Set([403, 408, 409, 425, 429, 500, 502, 503, 504, 520, 521, 522, 523, 524]);

// Hosts whose *pages* we refuse to crawl, and whose *asset* URLs are signed + expiring.
const SOCIAL_PAGE_HOSTS = /(^|\.)(instagram\.com|facebook\.com|fb\.com|m\.facebook\.com|threads\.net|tiktok\.com)$/i;
const SIGNED_CDN_HOSTS = /(^|\.)(cdninstagram\.com|fbcdn\.net|xx\.fbcdn\.net)$/i;

const IMAGE_EXT = /\.(jpe?g|png|webp|avif|gif|bmp|tiff?|svg|ico|heic|heif)(\?|#|$)/i;
const VIDEO_EXT = /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i;
const NON_ASSET_EXT = /\.(css|js|mjs|json|xml|txt|woff2?|ttf|otf|eot|pdf|zip|map)(\?|#|$)/i;

const LOGO_HINT = /(logo|lockup|brandmark|wordmark|favicon|apple-touch|touch-icon|mask-icon|isotype|amblem)/i;
// Provenance strings (the `from` array) that mean "this is the brand mark, not content".
const LOGO_SOURCE = /(link:icon|json-ld:logo|tile-image)/i;
const SCREENSHOT_HINT = /(screenshot|screen-shot|screen_shot|snimak-ekrana|placeholder|dummy|lorem)/i;
const SPRITE_HINT = /(sprite|icons?[-_.]|glyph|bullet|arrow|chevron|spinner|loader|pixel|tracking|beacon|1x1|blank)/i;
const BEFORE_HINT = /(^|[-_.\s/])(before|prije|pre|prie|raniije|ranije)([-_.\s/]|$)/i;
const AFTER_HINT = /(^|[-_.\s/])(after|poslije|posle|nakon|posli)([-_.\s/]|$)/i;

/* ═══════════════════════════════════════════════════════════════════════════════
   1. CLI
   ═══════════════════════════════════════════════════════════════════════════════ */

function usage() {
  console.log(`
harvest.mjs — harvest the client's own visual content

  node harvest.mjs <url ...> [options]

Arguments may be PAGE urls (crawled) or direct IMAGE/VIDEO urls (fetched first,
immediately — this is the path for pasted, signed, expiring Instagram/Facebook URLs).

Options
  --out <dir>            output root                 (default: work/harvest)
  --slug <slug>          shorthand for --out work/<slug>/harvest  (idempotency: one
                         client per slug, a re-run never destroys another client's work)
  --tools-dir <dir>      where sharp is installed    (default: <dirname(out)>/.tools)
  --from-file <path>     read additional URLs, one per line (# comments allowed)
  --browser              force the Playwright/Chromium rendered harvest for every page
  --no-browser           never launch Chromium (plain fetch only)
  --max <n>              max assets to download      (default: 80)
  --min-bytes <n>        reject anything smaller     (default: 3000; vectors and the
                         page's own brand marks — <link rel=icon|apple-touch-icon|
                         mask-icon>, schema.org logo — are EXEMPT, because a real SVG
                         wordmark is ~300 B and dropping it kills SET-G)
  --max-video-bytes <n>  skip videos larger than     (default: 26214400 = 25 MiB,
                         which is Cloudflare Pages' per-file cap)
  --concurrency <n>      parallel downloads          (default: 4)
  --timeout <ms>         per-request timeout         (default: 25000)
  --keep-small           keep tiny images instead of rejecting them
  --no-auto-install      fail instead of installing sharp into the tools dir
  --quiet                only print the summary
  -h, --help             this

Output
  <out>/raw/               the downloaded originals, untouched
  <out>/manifest.json      every asset + probe metrics + the client's NAP data
  <out>/FAILED.md          copy-paste curl blocks for anything that would not download
`);
}

function parseArgs(argv) {
  const o = {
    urls: [],
    out: null,
    slug: null,
    toolsDir: null,
    fromFile: null,
    browser: 'auto', // 'auto' | 'force' | 'off'
    max: 80,
    minBytes: 3000,
    maxVideoBytes: 26214400,
    concurrency: 4,
    timeout: 25000,
    keepSmall: false,
    autoInstall: true,
    quiet: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case '-h': case '--help': usage(); process.exit(0); break;
      case '--out': o.out = next(); break;
      case '--slug': o.slug = next(); break;
      case '--tools-dir': o.toolsDir = next(); break;
      case '--from-file': o.fromFile = next(); break;
      case '--browser': o.browser = 'force'; break;
      case '--no-browser': o.browser = 'off'; break;
      case '--max': o.max = parseInt(next(), 10); break;
      case '--min-bytes': o.minBytes = parseInt(next(), 10); break;
      case '--max-video-bytes': o.maxVideoBytes = parseInt(next(), 10); break;
      case '--concurrency': o.concurrency = parseInt(next(), 10); break;
      case '--timeout': o.timeout = parseInt(next(), 10); break;
      case '--keep-small': o.keepSmall = true; break;
      case '--no-auto-install': o.autoInstall = false; break;
      case '--quiet': o.quiet = true; break;
      default:
        if (a.startsWith('-')) { console.error(`unknown option: ${a}`); usage(); process.exit(1); }
        o.urls.push(a);
    }
  }
  if (!o.out) o.out = o.slug ? path.join('work', o.slug, 'harvest') : path.join('work', 'harvest');
  if (!o.toolsDir) o.toolsDir = defaultToolsDir(o.out);
  return o;
}

/**
 * One shared build-time tool directory per project: `<cwd>/work/tools/`.
 *
 * This MUST agree with scripts/preflight.mjs and scripts/frames.mjs, which both use
 * `PREMIUM_WEB_TOOLS || <cwd>/work/tools`. It used to be derived from `--out` instead, so
 * an `--out` outside a `work/` tree (a scratch dir, /tmp, anywhere) sent harvest off to
 * install a SECOND, newer sharp of its own — and then the run reported a different libvips
 * than `work/preflight.json` did, for the same repo, in the same session. tool-ladder.md
 * promises "run preflight first, every later script re-probes nothing"; that promise is
 * only true if every script looks in the same place.
 *
 * `--out`-relative resolution survives only as a fallback, for the case where a `work/`
 * tree already exists alongside the output and cwd is somewhere unrelated.
 */
function defaultToolsDir(out) {
  if (process.env.PREMIUM_WEB_TOOLS) return path.resolve(process.env.PREMIUM_WEB_TOOLS);
  const shared = path.join(process.cwd(), 'work', 'tools');
  if (fs.existsSync(shared)) return shared;
  const parts = path.resolve(out).split(path.sep);
  const i = parts.lastIndexOf('work');
  if (i > 0) return parts.slice(0, i + 1).concat('tools').join(path.sep);
  return shared;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   2. Small utilities
   ═══════════════════════════════════════════════════════════════════════════════ */

const C = process.stdout.isTTY
  ? { dim: '\x1b[2m', red: '\x1b[31m', grn: '\x1b[32m', yel: '\x1b[33m', cyn: '\x1b[36m', bold: '\x1b[1m', off: '\x1b[0m' }
  : { dim: '', red: '', grn: '', yel: '', cyn: '', bold: '', off: '' };

let QUIET = false;
const log = (...a) => { if (!QUIET) console.log(...a); };
const warn = (...a) => console.log(`${C.yel}${a.join(' ')}${C.off}`);
const err = (...a) => console.log(`${C.red}${a.join(' ')}${C.off}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const kb = (n) => `${(n / 1024).toFixed(1)}KB`;
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const round = (n, p = 3) => (Number.isFinite(n) ? Number(n.toFixed(p)) : null);

/**
 * Decode the HTML entities that appear inside attribute values. This is NOT cosmetic:
 * `srcset="/_next/image?url=…&amp;w=3840&amp;q=75"` fetched literally returns HTTP 400,
 * because the query is then `&amp;w=3840` and the resizer never sees `w`. Measured on a
 * live Next.js site: 14/16 assets failed for exactly this reason before the fix.
 */
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'", '#34': '"' };
function decodeEntities(s) {
  return String(s).replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, e) => {
    const k = e.toLowerCase();
    if (ENTITIES[k]) return ENTITIES[k];
    if (k[0] === '#') {
      const code = k[1] === 'x' ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
    }
    return m;
  });
}

function abs(url, base) {
  if (!url) return null;
  const u = decodeEntities(String(url).trim()).replace(/^["']|["']$/g, '').trim();
  if (!u || u.startsWith('data:') || u.startsWith('blob:') || u.startsWith('javascript:')) return null;
  if (u.startsWith('#')) return null;
  try { const r = new URL(u, base); r.hash = ''; return r.href; } catch { return null; }
}

/**
 * Image-resizing proxies wrap the real asset in a query parameter:
 *   /_next/image?url=https%3A%2F%2Fcdn.sanity.io%2F…-2560x1440.jpg&w=3840&q=75
 *   /_next/image?url=%2Fimg%2Finterijer.jpg&w=3840&q=75          <-- SAME-ORIGIN form
 *   https://images.weserv.nl/?url=…
 * Going to the INNER url is strictly better — it is the untouched original at full
 * resolution, not the proxy's re-encode capped at whatever `w` the page asked for.
 * Returns the inner absolute URL, or null.
 *
 * The inner value is NOT always absolute. Next.js — by far the most common wrapper
 * you will meet — percent-encodes a ROOT-RELATIVE path for every image served out of
 * the site's own `public/`, which is the majority of a small business's photography.
 * An earlier version tested `/^https?:\/\//` and bailed on those, so the harvest kept
 * the proxy URL. Both halves of that were measured against a local fixture whose
 * `/_next/image` handler re-encodes (2400x1600 q88 original -> 1200-wide q60), harvesting
 * the same page with only this function reverted:
 *
 *   before   8181327f-image.jpg          1200x800    5,892 B   <- the resizer's re-encode,
 *                                                                 named after `/_next/image`
 *   after    cf961e5b-interijer.jpg      2400x1600  22,768 B   <- the original file
 *
 * So it is not only a cosmetic naming problem: sequence and before/after detection key on
 * the filename tokens that `image.jpg` throws away, AND the pixels kept are the proxy's
 * downscale. Resolving the relative form against the outer URL fixes both.
 *
 * Relative values are only accepted when they actually look like an asset path, so a
 * tracking parameter such as `?u=/thank-you` can never be mistaken for the payload.
 */
function unwrapImageProxy(url) {
  try {
    const u = new URL(url);
    for (const key of ['url', 'src', 'image', 'uri', 'u']) {
      const v = u.searchParams.get(key);
      if (!v) continue;
      let inner;
      if (/^https?:\/\//i.test(v)) inner = new URL(v);
      else if (/^\/[^/]/.test(v) && (IMAGE_EXT.test(v) || VIDEO_EXT.test(v))) inner = new URL(v, u);
      else continue;
      if (inner.href === u.href) continue;
      return inner.href;
    }
  } catch { /* not a proxy */ }
  return null;
}

function hostOf(u) { try { return new URL(u).hostname; } catch { return ''; } }

/** Basename without extension. Works for URLs and for plain filenames (dropped-in files). */
function baseName(u) {
  if (!u) return 'asset';
  let last;
  try {
    last = decodeURIComponent(new URL(u).pathname.split('/').filter(Boolean).pop() || '');
  } catch {
    last = String(u).split(/[\\/]/).filter(Boolean).pop() || '';
  }
  return last.replace(/\.[a-z0-9]+$/i, '') || 'asset';
}

function safeName(s) {
  return (s || 'asset').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 44) || 'asset';
}

const CT_EXT = {
  'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/pjpeg': 'jpg',
  'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif',
  'image/gif': 'gif', 'image/svg+xml': 'svg', 'image/bmp': 'bmp',
  'image/tiff': 'tiff', 'image/x-icon': 'ico', 'image/vnd.microsoft.icon': 'ico',
  'image/heic': 'heic', 'image/heif': 'heif',
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov', 'video/ogg': 'ogv',
};

function extFor(url, contentType) {
  const ct = (contentType || '').split(';')[0].trim().toLowerCase();
  if (CT_EXT[ct]) return CT_EXT[ct];
  const m = String(url).match(IMAGE_EXT) || String(url).match(VIDEO_EXT);
  if (m) return m[1].toLowerCase().replace('jpeg', 'jpg');
  return 'bin';
}

/** Facebook/Instagram CDN URLs carry `oe=<hex unix seconds>` — the signature expiry. */
function signedExpiry(url) {
  try {
    const oe = new URL(url).searchParams.get('oe');
    if (!oe || !/^[0-9a-f]{6,10}$/i.test(oe)) return null;
    const t = parseInt(oe, 16) * 1000;
    const now = Date.now();
    if (t < now - 86400000 * 365 || t > now + 86400000 * 365) return null;
    return new Date(t).toISOString();
  } catch { return null; }
}

/* ═══════════════════════════════════════════════════════════════════════════════
   3. Module loading — sharp and playwright, without polluting the client's package
   ═══════════════════════════════════════════════════════════════════════════════ */

function globalNodeModules() {
  try { return execFileSync('npm', ['root', '-g'], { encoding: 'utf8', timeout: 20000 }).trim(); }
  catch { return null; }
}

/** Resolve a package from: this file's tree → cwd → extra dirs → npm root -g. */
async function loadModule(name, extraDirs = []) {
  try { return await import(name); } catch { /* keep looking */ }
  const roots = [
    process.cwd(),
    ...extraDirs,
    ...(globalNodeModules() ? [path.join(globalNodeModules(), '..')] : []),
  ];
  for (const root of roots) {
    for (const dir of [root, path.join(root, 'node_modules')]) {
      try {
        const req = createRequire(path.join(path.resolve(dir), '__resolve__.cjs'));
        const entry = req.resolve(name);
        return await import(pathToFileURL(entry).href);
      } catch { /* next */ }
    }
  }
  return null;
}

async function loadSharp(toolsDir, autoInstall) {
  let mod = await loadModule('sharp', [toolsDir]);
  if (mod) return mod.default || mod;
  if (!autoInstall) {
    err(`sharp not found. Install it without touching the client's package.json:`);
    err(`  npm install --prefix ${toolsDir} sharp --no-audit --no-fund`);
    return null;
  }
  log(`${C.dim}sharp not found — installing into ${toolsDir} (build-time only, never a client dependency)${C.off}`);
  fs.mkdirSync(toolsDir, { recursive: true });
  const pkg = path.join(toolsDir, 'package.json');
  if (!fs.existsSync(pkg)) fs.writeFileSync(pkg, JSON.stringify({ name: 'premium-web-tools', private: true, version: '0.0.0' }, null, 2));
  try {
    await execFileAsync('npm', ['install', '--prefix', toolsDir, 'sharp', '--no-audit', '--no-fund', '--loglevel=error'], {
      timeout: 300000, maxBuffer: 1024 * 1024 * 16,
    });
  } catch (e) {
    err(`sharp install failed: ${e.message.split('\n')[0]}`);
    return null;
  }
  mod = await loadModule('sharp', [toolsDir]);
  return mod ? (mod.default || mod) : null;
}

function findChromium() {
  const explicit = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  if (fs.existsSync(explicit)) return explicit;
  const root = '/opt/pw-browsers';
  if (fs.existsSync(root)) {
    for (const d of fs.readdirSync(root).filter((x) => x.startsWith('chromium')).sort().reverse()) {
      for (const rel of ['chrome-linux/chrome', 'chrome-linux/headless_shell']) {
        const p = path.join(root, d, rel);
        if (fs.existsSync(p)) return p;
      }
    }
  }
  return null; // let Playwright resolve it itself; NEVER run `playwright install`
}

async function loadPlaywright(toolsDir) {
  const mod = await loadModule('playwright', [toolsDir]) || await loadModule('playwright-core', [toolsDir]);
  return mod ? (mod.chromium ? mod : mod.default) : null;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   4. Fetch layer — hardened, because binary image fetch is genuinely unreliable
   ═══════════════════════════════════════════════════════════════════════════════

   Measured reality: arbitrary CDNs return 403/503 to a plain node fetch while the
   HTML page from the same origin returns 200. Every asset therefore gets an attempt
   ladder, not a single try.

     1. fetch()  + real browser UA + Referer of the page it was found on
     2. fetch()  again after backoff, different UA + full Sec-Fetch-* set   (403/429/503)
     3. Playwright browser context — carries the cookies the page set        (if available)
     4. curl --http1.1                                                       (different stack)
     5. give up → FAILED.md gets a copy-paste curl block
*/

function imageHeaders(referer, ua = UA_PRIMARY) {
  const h = {
    'user-agent': ua,
    accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    'accept-language': 'en-US,en;q=0.9,bs;q=0.8,hr;q=0.7,sr;q=0.6',
    'accept-encoding': 'gzip, deflate, br',
    'cache-control': 'no-cache',
    pragma: 'no-cache',
  };
  if (referer) {
    h.referer = referer;
    try { h.origin = new URL(referer).origin; } catch { /* ignore */ }
  }
  return h;
}

function pageHeaders(ua = UA_PRIMARY) {
  return {
    'user-agent': ua,
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'accept-language': 'en-US,en;q=0.9,bs;q=0.8,hr;q=0.7,sr;q=0.6',
    'upgrade-insecure-requests': '1',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'none',
    'sec-fetch-user': '?1',
  };
}

async function tryFetch(url, { headers, timeout, asText = false, maxBytes = Infinity }) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeout);
  try {
    const res = await fetch(url, { headers, redirect: 'follow', signal: ac.signal });
    const ct = res.headers.get('content-type') || '';
    const cl = parseInt(res.headers.get('content-length') || '0', 10);
    if (!res.ok) {
      // drain so the socket is released
      try { await res.arrayBuffer(); } catch { /* ignore */ }
      return { ok: false, status: res.status, reason: `HTTP ${res.status}`, contentType: ct, finalUrl: res.url || url };
    }
    if (cl && cl > maxBytes) {
      try { await res.arrayBuffer(); } catch { /* ignore */ }
      return { ok: false, status: res.status, reason: `too large (${kb(cl)} > ${kb(maxBytes)})`, oversize: true, contentType: ct, finalUrl: res.url || url };
    }
    if (asText) {
      const text = await res.text();
      return { ok: true, status: res.status, text, contentType: ct, finalUrl: res.url || url };
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > maxBytes) {
      return { ok: false, status: res.status, reason: `too large (${kb(buf.length)} > ${kb(maxBytes)})`, oversize: true, contentType: ct, finalUrl: res.url || url };
    }
    return { ok: true, status: res.status, buf, contentType: ct, finalUrl: res.url || url };
  } catch (e) {
    const msg = e?.cause?.message || e?.message || String(e);
    return { ok: false, status: 0, reason: e?.name === 'AbortError' ? `timeout after ${timeout}ms` : msg, finalUrl: url };
  } finally {
    clearTimeout(t);
  }
}

/** curl over an explicitly forced HTTP/1.1 connection. Different TLS + network stack. */
async function curlFetch(url, { referer, timeout, asText = false, maxBytes = Infinity }) {
  const tmp = path.join(
    process.env.TMPDIR || '/tmp',
    `harvest-${crypto.randomBytes(6).toString('hex')}.bin`,
  );
  const args = [
    '-sS', '-L', '--http1.1', '--compressed',
    '--max-time', String(Math.ceil(timeout / 1000)),
    '-A', UA_PRIMARY,
    '-w', '%{http_code}',
    '-o', tmp,
  ];
  if (referer) args.push('-e', referer);
  args.push(url);
  try {
    const { stdout } = await execFileAsync('curl', args, { timeout: timeout + 5000, maxBuffer: 1024 * 64 });
    const status = parseInt(String(stdout).trim().slice(-3), 10) || 0;
    if (status < 200 || status >= 300) { await fsp.rm(tmp, { force: true }); return { ok: false, status, reason: `HTTP ${status} (curl --http1.1)` }; }
    const buf = await fsp.readFile(tmp);
    await fsp.rm(tmp, { force: true });
    if (buf.length > maxBytes) return { ok: false, status, reason: `too large (${kb(buf.length)})`, oversize: true };
    return asText
      ? { ok: true, status, text: buf.toString('utf8'), via: 'curl --http1.1' }
      : { ok: true, status, buf, via: 'curl --http1.1' };
  } catch (e) {
    await fsp.rm(tmp, { force: true }).catch(() => {});
    return { ok: false, status: 0, reason: `curl: ${String(e.message).split('\n')[0]}` };
  }
}

/** Full ladder for one binary asset. Returns { ok, buf, contentType, via, attempts[] }. */
async function fetchAsset(url, { referer, timeout, maxBytes, browserCtx, fallbackUrl = null }) {
  const attempts = [];

  // 1 — plain fetch with a real browser identity
  let r = await tryFetch(url, { headers: imageHeaders(referer), timeout, maxBytes });
  attempts.push({ via: 'fetch', status: r.status, reason: r.ok ? 'ok' : r.reason });
  if (r.ok) return { ...r, via: 'fetch', attempts };
  if (r.oversize) return { ok: false, reason: r.reason, oversize: true, attempts };

  // 2 — one backoff retry on the statuses that are worth retrying
  if (r.status === 0 || RETRYABLE_STATUS.has(r.status)) {
    await sleep(1200 + Math.floor(Math.random() * 800));
    const h = imageHeaders(referer, UA_SECONDARY);
    h['sec-fetch-dest'] = 'image';
    h['sec-fetch-mode'] = 'no-cors';
    h['sec-fetch-site'] = 'cross-site';
    r = await tryFetch(url, { headers: h, timeout, maxBytes });
    attempts.push({ via: 'fetch:retry', status: r.status, reason: r.ok ? 'ok' : r.reason });
    if (r.ok) return { ...r, via: 'fetch:retry', attempts };
    if (r.oversize) return { ok: false, reason: r.reason, oversize: true, attempts };
  }

  // 3 — through the live browser context: carries cookies the page handed out
  if (browserCtx) {
    try {
      const res = await browserCtx.request.get(url, {
        timeout,
        maxRedirects: 5,
        headers: referer ? { referer, 'user-agent': UA_PRIMARY } : { 'user-agent': UA_PRIMARY },
      });
      if (res.ok()) {
        const buf = Buffer.from(await res.body());
        attempts.push({ via: 'playwright', status: res.status(), reason: 'ok' });
        if (buf.length > maxBytes) return { ok: false, reason: `too large (${kb(buf.length)})`, oversize: true, attempts };
        return { ok: true, buf, contentType: res.headers()['content-type'] || '', via: 'playwright', attempts };
      }
      attempts.push({ via: 'playwright', status: res.status(), reason: `HTTP ${res.status()}` });
    } catch (e) {
      attempts.push({ via: 'playwright', status: 0, reason: String(e.message).split('\n')[0] });
    }
  }

  // 4 — curl, forced onto HTTP/1.1
  const c = await curlFetch(url, { referer, timeout, maxBytes });
  attempts.push({ via: 'curl --http1.1', status: c.status, reason: c.ok ? 'ok' : c.reason });
  if (c.ok) return { ok: true, buf: c.buf, contentType: '', via: c.via, attempts };

  // 5 — the resizing-proxy URL we unwrapped away from, in case the origin CDN is the
  //     one refusing us and the proxy is not.
  if (fallbackUrl && fallbackUrl !== url) {
    const f = await fetchAsset(fallbackUrl, { referer, timeout, maxBytes, browserCtx });
    attempts.push(...f.attempts.map((a) => ({ ...a, via: `proxy:${a.via}` })));
    if (f.ok) return { ...f, via: `proxy:${f.via}`, attempts, resolvedUrl: fallbackUrl };
  }

  return { ok: false, reason: attempts.map((a) => `${a.via}:${a.reason}`).join(' | '), attempts };
}

/** Page HTML: fetch → curl. (Chromium is a separate, deliberate escalation.) */
async function fetchPageHtml(url, timeout) {
  let r = await tryFetch(url, { headers: pageHeaders(), timeout, asText: true });
  if (r.ok) return { ok: true, html: r.text, finalUrl: r.finalUrl, via: 'fetch' };
  if (r.status === 0 || RETRYABLE_STATUS.has(r.status)) {
    await sleep(1000);
    r = await tryFetch(url, { headers: pageHeaders(UA_SECONDARY), timeout, asText: true });
    if (r.ok) return { ok: true, html: r.text, finalUrl: r.finalUrl, via: 'fetch:retry' };
  }
  const c = await curlFetch(url, { timeout, asText: true });
  if (c.ok) return { ok: true, html: c.text, finalUrl: url, via: 'curl --http1.1' };
  return { ok: false, reason: `${r.reason} | ${c.reason}`, finalUrl: url };
}

/* ═══════════════════════════════════════════════════════════════════════════════
   5. HTML / CSS / JSON-LD extraction (no DOM library — regex, deliberately)
   ═══════════════════════════════════════════════════════════════════════════════ */

/** WHATWG-ish srcset scanner. Handles `a.jpg 1x, b.jpg 2x` and `a.jpg 400w, b.jpg 800w`. */
function parseSrcset(str) {
  const out = [];
  const s = String(str || '');
  let i = 0;
  while (i < s.length) {
    while (i < s.length && /[\s,]/.test(s[i])) i++;
    if (i >= s.length) break;
    const start = i;
    while (i < s.length && !/\s/.test(s[i]) && s[i] !== ',') i++;
    let url = s.slice(start, i);
    let desc = '';
    while (i < s.length && s[i] !== ',') { desc += s[i]; i++; }
    if (i < s.length) i++; // consume comma
    url = url.replace(/,+$/, '');
    desc = desc.trim();
    const m = desc.match(/^([\d.]+)\s*([wx])$/i);
    if (url) out.push({ url, w: m && m[2].toLowerCase() === 'w' ? parseFloat(m[1]) : null, d: m && m[2].toLowerCase() === 'x' ? parseFloat(m[1]) : null });
  }
  return out;
}

function largestSrcsetCandidate(str) {
  const cands = parseSrcset(str);
  if (!cands.length) return null;
  const byW = cands.filter((c) => c.w);
  if (byW.length) return byW.sort((a, b) => b.w - a.w)[0].url;
  const byD = cands.filter((c) => c.d);
  if (byD.length) return byD.sort((a, b) => b.d - a.d)[0].url;
  return cands[cands.length - 1].url;
}

function attrs(tag) {
  const out = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>`]+))/g;
  let m;
  while ((m = re.exec(tag))) out[m[1].toLowerCase()] = m[3] ?? m[4] ?? m[5] ?? '';
  return out;
}

function cssUrls(css) {
  const out = [];
  const re = /url\(\s*(?:(["'])([^"']*?)\1|([^)\s"']+))\s*\)/g;
  let m;
  while ((m = re.exec(css))) {
    const u = (m[2] ?? m[3] ?? '').trim();
    if (u && !u.startsWith('data:')) out.push(u);
  }
  // also @import'ed image-ish things are rare; url() covers the real cases
  return out;
}

/**
 * Sink entries are `{ url, key }`, not bare strings. The KEY is load-bearing: a
 * schema.org `logo` is the asset SET-G is built on, and once it has been flattened
 * into an anonymous list of image URLs nothing downstream can tell it apart from a
 * gallery photo. Keeping the key lets the caller label it `json-ld:logo`, which the
 * size floor then exempts.
 */
function walkJsonLdImages(node, sink, depth = 0) {
  if (!node || depth > 8) return;
  if (Array.isArray(node)) { for (const n of node) walkJsonLdImages(n, sink, depth + 1); return; }
  if (typeof node !== 'object') return;
  for (const [k, v] of Object.entries(node)) {
    if (/^(image|logo|photo|thumbnailurl|contenturl|primaryimageofpage|screenshot)$/i.test(k)) {
      const key = k.toLowerCase();
      const push = (x) => {
        if (typeof x === 'string') sink.push({ url: x, key });
        else if (x && typeof x === 'object') {
          if (typeof x.url === 'string') sink.push({ url: x.url, key });
          if (typeof x.contentUrl === 'string') sink.push({ url: x.contentUrl, key });
        }
      };
      if (Array.isArray(v)) v.forEach(push); else push(v);
    }
    walkJsonLdImages(v, sink, depth + 1);
  }
}

function collectBusiness(jsonLdBlocks, html) {
  const biz = { types: [], name: null, telephone: [], email: null, address: null, geo: null, openingHours: null, sameAs: [], priceRange: null, lang: null, locale: null };
  const visit = (n, depth = 0) => {
    if (!n || depth > 8) return;
    if (Array.isArray(n)) { n.forEach((x) => visit(x, depth + 1)); return; }
    if (typeof n !== 'object') return;
    const t = n['@type'];
    if (t) (Array.isArray(t) ? t : [t]).forEach((x) => { if (typeof x === 'string' && !biz.types.includes(x)) biz.types.push(x); });
    if (!biz.name && typeof n.name === 'string' && /organization|business|store|restaurant|shop|salon|hotel|service|dentist|company|lodging|attorney|gym/i.test(String(t || ''))) biz.name = n.name;
    if (n.telephone) (Array.isArray(n.telephone) ? n.telephone : [n.telephone]).forEach((p) => { if (typeof p === 'string' && !biz.telephone.includes(p)) biz.telephone.push(p); });
    if (!biz.email && typeof n.email === 'string') biz.email = n.email;
    if (!biz.address && n.address) biz.address = n.address;
    if (!biz.geo && n.geo) biz.geo = n.geo;
    if (!biz.openingHours && (n.openingHoursSpecification || n.openingHours)) biz.openingHours = n.openingHoursSpecification || n.openingHours;
    if (n.sameAs) (Array.isArray(n.sameAs) ? n.sameAs : [n.sameAs]).forEach((s) => { if (typeof s === 'string' && !biz.sameAs.includes(s)) biz.sameAs.push(s); });
    if (!biz.priceRange && typeof n.priceRange === 'string') biz.priceRange = n.priceRange;
    for (const v of Object.values(n)) visit(v, depth + 1);
  };
  jsonLdBlocks.forEach((b) => visit(b));

  // tel: / viber: / wa.me links are the real conversion action in this market
  const links = [...html.matchAll(/href\s*=\s*["']((?:tel:|viber:|https?:\/\/(?:wa\.me|api\.whatsapp\.com))[^"']+)["']/gi)].map((m) => m[1]);
  for (const l of links) {
    if (l.startsWith('tel:')) { const p = decodeURIComponent(l.slice(4)).trim(); if (p && !biz.telephone.includes(p)) biz.telephone.push(p); }
    else if (!biz.sameAs.includes(l)) biz.sameAs.push(l);
  }
  const langM = html.match(/<html[^>]*\slang\s*=\s*["']([^"']+)["']/i);
  if (langM) biz.lang = langM[1];
  const locM = html.match(/<meta[^>]+property\s*=\s*["']og:locale["'][^>]*>/i);
  if (locM) biz.locale = attrs(locM[0]).content || null;
  if (!biz.name) {
    const site = html.match(/<meta[^>]+property\s*=\s*["']og:site_name["'][^>]*>/i);
    if (site) biz.name = attrs(site[0]).content || null;
  }
  return biz;
}

/**
 * Extract every asset candidate from one page's HTML.
 * Returns { candidates:[{url, origin, alt, from}], stylesheets:[url], business, title }
 */
function extractFromHtml(html, pageUrl) {
  const baseTag = html.match(/<base[^>]+href\s*=\s*["']([^"']+)["']/i);
  const base = baseTag ? (abs(baseTag[1], pageUrl) || pageUrl) : pageUrl;

  const cands = [];
  const seen = new Set();
  const add = (raw, from, extra = {}) => {
    const resolved = abs(raw, base);
    if (!resolved) return;
    // Prefer the original behind an image-resizing proxy; keep the proxy URL as a fallback.
    const inner = unwrapImageProxy(resolved);
    const u = inner || resolved;
    if (NON_ASSET_EXT.test(u)) return;
    const key = u;
    if (seen.has(key)) {
      // keep the richest metadata we have seen for this URL
      const prev = cands.find((c) => c.url === key);
      if (prev && !prev.alt && extra.alt) prev.alt = extra.alt;
      if (prev && !prev.from.includes(from)) prev.from.push(from);
      return;
    }
    seen.add(key);
    cands.push({
      url: u, proxyUrl: inner ? resolved : null, page: pageUrl, from: [from],
      alt: extra.alt || '', declaredW: extra.w || null, declaredH: extra.h || null,
      kind: extra.kind || (VIDEO_EXT.test(u) ? 'video' : 'image'),
    });
  };

  // --- social / meta cards -----------------------------------------------------
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const a = attrs(m[0]);
    const key = (a.property || a.name || a.itemprop || '').toLowerCase();
    if (!a.content) continue;
    if (key === 'og:image' || key === 'og:image:url' || key === 'og:image:secure_url') add(a.content, 'og:image');
    else if (key === 'twitter:image' || key === 'twitter:image:src') add(a.content, 'twitter:image');
    else if (key === 'image' && a.itemprop) add(a.content, 'itemprop:image');
    else if (key === 'msapplication-tileimage') add(a.content, 'tile-image');
  }

  // --- <link> : preload-as-image, icons, apple-touch ---------------------------
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const a = attrs(m[0]);
    const rel = (a.rel || '').toLowerCase();
    if (rel.includes('preload') && (a.as || '').toLowerCase() === 'image') {
      if (a.href) add(a.href, 'preload-as-image');
      if (a.imagesrcset) { const best = largestSrcsetCandidate(a.imagesrcset); if (best) add(best, 'preload-imagesrcset'); }
    } else if (/\b(icon|apple-touch-icon|mask-icon|shortcut)\b/.test(rel) && a.href) {
      add(a.href, 'link:icon');
    } else if (rel.includes('stylesheet') && a.href) {
      // handled separately below
    }
  }

  const stylesheets = [];
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const a = attrs(m[0]);
    if ((a.rel || '').toLowerCase().includes('stylesheet') && a.href) {
      const u = abs(a.href, base);
      if (u && !stylesheets.includes(u)) stylesheets.push(u);
    }
  }

  // --- <img> -------------------------------------------------------------------
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const a = attrs(m[0]);
    const alt = a.alt || '';
    const w = a.width ? parseInt(a.width, 10) : null;
    const h = a.height ? parseInt(a.height, 10) : null;
    const best = a.srcset ? largestSrcsetCandidate(a.srcset) : (a['data-srcset'] ? largestSrcsetCandidate(a['data-srcset']) : null);
    if (best) add(best, 'img:srcset', { alt, w, h });
    for (const k of ['src', 'data-src', 'data-lazy-src', 'data-original', 'data-lazy', 'data-image', 'data-bg']) {
      if (a[k]) add(a[k], `img:${k}`, { alt, w, h });
    }
  }

  // --- <source> (picture + video) and <video> ----------------------------------
  for (const m of html.matchAll(/<source\b[^>]*>/gi)) {
    const a = attrs(m[0]);
    const isVideo = /^video\//i.test(a.type || '') || VIDEO_EXT.test(a.src || '');
    if (a.srcset) { const best = largestSrcsetCandidate(a.srcset); if (best) add(best, 'source:srcset'); }
    if (a.src) add(a.src, 'source:src', { kind: isVideo ? 'video' : 'image' });
  }
  for (const m of html.matchAll(/<video\b[^>]*>/gi)) {
    const a = attrs(m[0]);
    if (a.src) add(a.src, 'video:src', { kind: 'video' });
    if (a.poster) add(a.poster, 'video:poster');
  }

  // --- inline style="" and <style> blocks --------------------------------------
  for (const m of html.matchAll(/\bstyle\s*=\s*("([^"]*)"|'([^']*)')/gi)) {
    for (const u of cssUrls(m[2] ?? m[3] ?? '')) add(u, 'inline-style:url()');
  }
  for (const m of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    for (const u of cssUrls(m[1])) add(u, 'style-block:url()');
  }

  // --- JSON-LD -----------------------------------------------------------------
  const blocks = [];
  for (const m of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    const raw = m[1].trim().replace(/^﻿/, '');
    try { blocks.push(JSON.parse(raw)); }
    catch { try { blocks.push(JSON.parse(raw.replace(/,\s*([}\]])/g, '$1'))); } catch { /* unparseable JSON-LD: ignore */ } }
  }
  const jsonImages = [];
  blocks.forEach((b) => walkJsonLdImages(b, jsonImages));
  jsonImages.forEach(({ url, key }) => add(url, key === 'logo' ? 'json-ld:logo' : 'json-ld:image'));

  const titleM = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);

  return {
    candidates: cands,
    stylesheets,
    business: collectBusiness(blocks, html),
    title: titleM ? titleM[1].trim().replace(/\s+/g, ' ').slice(0, 200) : null,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════════
   6. Playwright rendered harvest — the fallback when plain fetch is not enough
   ═══════════════════════════════════════════════════════════════════════════════ */

async function browserHarvest(pw, ctx, pageUrl, timeout) {
  const page = await ctx.newPage();
  const netAssets = new Set();
  page.on('response', (res) => {
    const ct = (res.headers()['content-type'] || '').toLowerCase();
    if (/^(image|video)\//.test(ct)) netAssets.add(res.url());
  });
  try {
    await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout });
    // Give lazy images and webfonts a chance; do not depend on networkidle, which
    // never fires on sites with polling/analytics.
    await page.waitForTimeout(1500);
    // Scroll the whole page so IntersectionObserver-based lazy loaders actually fire.
    await page.evaluate(async () => {
      const step = Math.round(window.innerHeight * 0.8);
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(800);

    const found = await page.evaluate(() => {
      const A = (u) => { try { return new URL(u, location.href).href; } catch { return null; } };
      const out = [];
      const push = (url, from, extra = {}) => { const u = A(url); if (u && !u.startsWith('data:')) out.push({ url: u, from, ...extra }); };

      for (const i of document.images) {
        push(i.currentSrc || i.src, 'rendered:img', { alt: i.alt || '', w: i.naturalWidth || null, h: i.naturalHeight || null });
        if (i.srcset) {
          // largest w-descriptor candidate, computed in-page where the parser is native
          const best = i.srcset.split(',').map((s) => s.trim()).filter(Boolean)
            .map((s) => { const p = s.split(/\s+/); return { u: p[0], w: parseFloat((p[1] || '').replace(/[wx]$/, '')) || 0 }; })
            .sort((a, b) => b.w - a.w)[0];
          if (best) push(best.u, 'rendered:img:srcset', { alt: i.alt || '' });
        }
      }
      for (const el of document.querySelectorAll('*')) {
        const bg = getComputedStyle(el).backgroundImage;
        if (bg && bg !== 'none') {
          for (const m of bg.matchAll(/url\((['"]?)(.*?)\1\)/g)) push(m[2], 'rendered:background-image');
        }
      }
      for (const v of document.querySelectorAll('video')) {
        if (v.currentSrc || v.src) push(v.currentSrc || v.src, 'rendered:video', { kind: 'video' });
        if (v.poster) push(v.poster, 'rendered:video:poster');
        for (const s of v.querySelectorAll('source')) if (s.src) push(s.src, 'rendered:source', { kind: 'video' });
      }
      for (const l of document.querySelectorAll('link[rel~="icon"],link[rel~="apple-touch-icon"],link[rel~="mask-icon"]')) {
        if (l.href) push(l.href, 'rendered:link:icon');
      }
      const meta = (s) => document.querySelector(s)?.content || null;
      for (const [sel, from] of [['meta[property="og:image"]', 'rendered:og:image'], ['meta[name="twitter:image"]', 'rendered:twitter:image']]) {
        const c = meta(sel); if (c) push(c, from);
      }
      return { assets: out, title: document.title, html: document.documentElement.outerHTML.slice(0, 3000000) };
    });

    // Anything the network actually served as image/* or video/* — catches CSS-injected
    // and JS-injected assets that never appear in the DOM we can read.
    for (const u of netAssets) found.assets.push({ url: u, from: 'rendered:network' });

    const meta = extractFromHtml(found.html, pageUrl); // reuse the JSON-LD/NAP extraction
    const cands = [];
    const seen = new Set();
    for (const a of found.assets) {
      if (!a.url) continue;
      const inner = unwrapImageProxy(a.url);
      const u = inner || a.url;
      if (seen.has(u) || NON_ASSET_EXT.test(u)) continue;
      seen.add(u);
      cands.push({
        url: u, proxyUrl: inner ? a.url : null, page: pageUrl, from: [a.from], alt: a.alt || '',
        declaredW: a.w || null, declaredH: a.h || null,
        kind: a.kind || (VIDEO_EXT.test(u) ? 'video' : 'image'),
      });
    }
    // merge in anything only the static parser saw
    for (const c of meta.candidates) if (!seen.has(c.url)) { seen.add(c.url); cands.push(c); }

    await page.close();
    return { ok: true, candidates: cands, stylesheets: meta.stylesheets, business: meta.business, title: found.title || meta.title };
  } catch (e) {
    await page.close().catch(() => {});
    return { ok: false, reason: String(e.message).split('\n')[0] };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════════
   7. Probing — sharp metadata, mean luminance, subject isolation
   ═══════════════════════════════════════════════════════════════════════════════

   subjectScore = mean edge magnitude in the CENTRE 60% ÷ mean edge magnitude in the
   OUTER 20% border ring, computed on a 128×128 greyscale downsample. It is a cheap
   proxy for "is there one clean subject here":

     >= 1.60  one isolated subject on a calm background — cutout/parallax/hero grade
     1.15-1.59 a real scene with a clear focal area — usable full-bleed
     0.80-1.14 busy everywhere — gallery tile, not a hero
     <  0.80  detail lives at the edges (screenshot, collage, text block, pattern)
*/

async function probe(sharp, buf, url, kind) {
  const out = {
    bytes: buf.length, format: null, width: null, height: null, longEdge: null,
    aspect: null, orientation: null, hasAlpha: null, meanLuminance: null,
    edgeCentre: null, edgeBorder: null, subjectScore: null, dominant: null, probeError: null,
  };
  if (kind === 'video') { out.format = 'video'; out.probeError = 'video — probe with ffmpeg-static (see references/asset-pipeline.md §5)'; return out; }
  if (!sharp) { out.probeError = 'sharp unavailable'; return out; }
  try {
    const img = sharp(buf, { failOn: 'none', animated: false });
    const md = await img.metadata();
    out.format = md.format || null;
    out.width = md.width || null;
    out.height = md.height || null;
    out.hasAlpha = !!md.hasAlpha;
    if (out.width && out.height) {
      out.longEdge = Math.max(out.width, out.height);
      out.aspect = round(out.width / out.height);
      out.orientation = out.aspect > 1.08 ? 'landscape' : out.aspect < 0.92 ? 'portrait' : 'square';
    }
    try {
      const st = await sharp(buf, { failOn: 'none', animated: false }).stats();
      if (st.dominant) {
        const { r, g, b } = st.dominant;
        out.dominant = `#${[r, g, b].map((v) => Math.max(0, Math.min(255, v | 0)).toString(16).padStart(2, '0')).join('')}`;
      }
    } catch { /* stats can fail on exotic inputs; not fatal */ }

    const N = 128;
    const { data } = await sharp(buf, { failOn: 'none', animated: false })
      .flatten({ background: '#ffffff' })   // composite alpha over white so PNG cutouts read honestly
      .greyscale()
      .resize(N, N, { fit: 'fill' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    let lumSum = 0;
    for (let i = 0; i < data.length; i++) lumSum += data[i];
    out.meanLuminance = round(lumSum / data.length / 255);

    const lo = Math.round(N * 0.2), hi = Math.round(N * 0.8);
    let cSum = 0, cN = 0, bSum = 0, bN = 0;
    for (let y = 1; y < N - 1; y++) {
      for (let x = 1; x < N - 1; x++) {
        const i = y * N + x;
        const gx = Math.abs(data[i + 1] - data[i - 1]);
        const gy = Math.abs(data[i + N] - data[i - N]);
        const mag = (gx + gy) / 2;
        const inCentre = x >= lo && x < hi && y >= lo && y < hi;
        if (inCentre) { cSum += mag; cN++; } else { bSum += mag; bN++; }
      }
    }
    out.edgeCentre = round(cN ? cSum / cN : 0, 2);
    out.edgeBorder = round(bN ? bSum / bN : 0, 2);
    out.subjectScore = round(out.edgeCentre / ((out.edgeBorder || 0) + 0.5), 2);
  } catch (e) {
    out.probeError = String(e.message).split('\n')[0];
  }
  return out;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   8. Classification — the numeric thresholds documented in asset-pipeline.md §3
   ═══════════════════════════════════════════════════════════════════════════════ */

const T = {
  HERO_LONG_EDGE: 1600,
  USABLE_LONG_EDGE: 1200,
  HERO_MIN_BYTES: 60000,
  HERO_MIN_SUBJECT: 1.15,
  HERO_LUMA_MIN: 0.06,
  HERO_LUMA_MAX: 0.94,
  HERO_ASPECT_MIN: 0.55,
  HERO_ASPECT_MAX: 2.80,
  LOGO_MAX_LONG_EDGE: 900,
  SEQUENCE_MIN: 12,
  GALLERY_MIN: 6,
  REJECT_LONG_EDGE: 320,
};

/** A downloaded record's identity: the URL it came from, or its filename if it was dropped in. */
const assetUrl = (a) => a.sourceUrl || a.requestedUrl || a.file || '';

function classifyAsset(a) {
  const p = a.probe;
  const url = assetUrl(a);
  const name = `${baseName(url) || url} ${a.altSourceHint || a.alt || ''}`.toLowerCase();
  const flags = [];
  let role = 'gallery';

  if (a.kind === 'video') return { role: 'video', flags: ['video'], score: 0, heroGrade: false };
  if (p.format === 'svg' || /\.svg(\?|$)/i.test(url)) { flags.push('vector'); role = 'logo'; }
  if (LOGO_HINT.test(url) || LOGO_HINT.test(a.altSourceHint || '')) { flags.push('logo-hint'); role = 'logo'; }
  if (SPRITE_HINT.test(name)) {
    flags.push('sprite-hint');
    // UI chrome, icon fonts, loaders, tracking pixels: never content. Only spare it if
    // it is genuinely large, because "icons-" also matches some legitimate filenames.
    if (p.longEdge == null || p.longEdge < T.USABLE_LONG_EDGE) role = 'reject';
  }
  if (SCREENSHOT_HINT.test(name)) { flags.push('screenshot-hint'); role = 'reject'; }
  if (BEFORE_HINT.test(name)) flags.push('before');
  if (AFTER_HINT.test(name)) flags.push('after');

  if (p.longEdge != null) {
    if (p.longEdge < T.REJECT_LONG_EDGE) { flags.push('too-small'); role = role === 'logo' ? 'logo' : 'reject'; }
    else if (p.longEdge <= T.LOGO_MAX_LONG_EDGE && p.hasAlpha) { flags.push('small+alpha'); role = 'logo'; }
    else if (p.longEdge < T.USABLE_LONG_EDGE) { flags.push('under-1200'); if (role !== 'logo') role = 'support'; }
  }

  const heroGrade =
    role !== 'reject' && role !== 'logo' &&
    p.longEdge != null && p.longEdge >= T.HERO_LONG_EDGE &&
    p.bytes >= T.HERO_MIN_BYTES &&
    p.subjectScore != null && p.subjectScore >= T.HERO_MIN_SUBJECT &&
    p.meanLuminance != null && p.meanLuminance > T.HERO_LUMA_MIN && p.meanLuminance < T.HERO_LUMA_MAX &&
    p.aspect != null && p.aspect >= T.HERO_ASPECT_MIN && p.aspect <= T.HERO_ASPECT_MAX &&
    !flags.includes('logo-hint') && !flags.includes('sprite-hint');

  if (heroGrade) role = 'hero-candidate';
  else if (role === 'gallery' && p.longEdge != null && p.longEdge >= T.USABLE_LONG_EDGE) role = 'gallery';

  // ranking score: area, then how cleanly the subject reads, then a mild aspect preference
  let score = 0;
  if (p.width && p.height) score += Math.min(1, (p.width * p.height) / (2400 * 1600)) * 50;
  if (p.subjectScore) score += Math.min(1, p.subjectScore / 2.5) * 30;
  if (p.aspect) score += (p.aspect >= 1.2 && p.aspect <= 2.2 ? 12 : 4);
  if (p.meanLuminance != null && p.meanLuminance > 0.12 && p.meanLuminance < 0.9) score += 8;
  if (flags.includes('logo-hint') || flags.includes('sprite-hint')) score -= 40;
  if (flags.includes('screenshot-hint')) score -= 60;

  return { role, flags, score: round(score, 1), heroGrade };
}

/** Sequence detection: >=SEQUENCE_MIN assets in the same URL directory with trailing numbers. */
function detectSequences(assets) {
  const groups = new Map();
  for (const a of assets) {
    if (a.classification.role === 'reject' || a.kind === 'video') continue;
    const url = assetUrl(a);
    let dir, num;
    try {
      const u = new URL(url);
      dir = u.origin + u.pathname.replace(/[^/]*$/, '');
      const m = baseName(url).match(/(\d{1,5})\s*$/);
      num = m ? parseInt(m[1], 10) : null;
    } catch {
      // dropped in by hand: group by directory on disk, number from the filename
      dir = path.dirname(a.path || '.');
      const m = String(a.file || '').replace(/\.[a-z0-9]+$/i, '').match(/(\d{1,5})\s*$/);
      num = m ? parseInt(m[1], 10) : null;
    }
    if (num == null) continue;
    if (!groups.has(dir)) groups.set(dir, []);
    groups.get(dir).push({ url, num });
  }
  const seqs = [];
  for (const [dir, items] of groups) {
    if (items.length < T.SEQUENCE_MIN) continue;
    const nums = items.map((i) => i.num).sort((a, b) => a - b);
    const span = nums[nums.length - 1] - nums[0] + 1;
    const density = items.length / Math.max(1, span);
    if (density >= 0.6) seqs.push({ dir, count: items.length, span, density: round(density, 2) });
  }
  return seqs.sort((a, b) => b.count - a.count);
}

function detectPairs(assets) {
  const befores = assets.filter((a) => a.classification.flags.includes('before'));
  const afters = assets.filter((a) => a.classification.flags.includes('after'));
  const key = (a, re) => (baseName(assetUrl(a)) || a.file || '').toLowerCase().replace(/\.[a-z0-9]+$/i, '').replace(re, '-');
  const pairs = [];
  const used = new Set();
  for (const b of befores) {
    const bkey = key(b, BEFORE_HINT);
    const match = afters.find((a) => !used.has(a.file) && key(a, AFTER_HINT) === bkey);
    if (match) { used.add(match.file); pairs.push({ before: b.file, after: match.file }); }
  }
  // even unmatched, an equal-ish count of before/after tokens is a strong SET-D signal
  return { pairs, beforeCount: befores.length, afterCount: afters.length };
}

function suggestSetClass(assets, counts) {
  const kept = assets.filter((a) => a.classification.role !== 'reject');
  const heroes = kept.filter((a) => a.classification.heroGrade);
  const usable = kept.filter((a) => a.kind === 'image' && a.probe.longEdge != null && a.probe.longEdge >= T.USABLE_LONG_EDGE && a.classification.role !== 'logo');
  const logos = kept.filter((a) => a.classification.role === 'logo');
  const videos = kept.filter((a) => a.kind === 'video');
  const seqs = detectSequences(kept);
  const { pairs, beforeCount, afterCount } = detectPairs(kept);

  const evidence = {
    downloaded: counts.downloaded,
    heroGrade: heroes.length,
    usableStills: usable.length,
    logosOrVectors: logos.length,
    videos: videos.length,
    sequences: seqs,
    beforeAfter: { matchedPairs: pairs.length, beforeTokens: beforeCount, afterTokens: afterCount },
  };

  if (counts.downloaded === 0) {
    return { set: 'F', confidence: 'forced', downgraded: true, evidence,
      reason: 'ZERO bytes were obtained. Nothing can be classified from metadata that was never fetched.' };
  }
  if (videos.length) return { set: 'E', confidence: 'high', evidence, reason: `${videos.length} real video source(s) — R7 frame extraction.` };
  if (pairs.length >= 1 || (beforeCount >= 1 && afterCount >= 1)) return { set: 'D', confidence: pairs.length ? 'high' : 'medium', evidence, reason: `before/after material detected (${pairs.length} matched pair(s)) — R3 wipe, the highest-converting recipe.` };
  if (seqs.length) return { set: 'C', confidence: 'medium', evidence, reason: `${seqs[0].count} numbered stills in one directory — likely a registered sequence, R2 assembly.` };
  if (usable.length >= T.GALLERY_MIN) return { set: 'B', confidence: 'high', evidence, reason: `${usable.length} usable stills ≥${T.USABLE_LONG_EDGE}px — R4 cross-dissolve scrub.` };
  if (heroes.length >= 1) return { set: 'A', confidence: 'high', evidence, reason: `${heroes.length} hero-grade still(s) ≥${T.HERO_LONG_EDGE}px — R1 / R5 / R6.` };
  if (usable.length >= 1) return { set: 'A', confidence: 'low', evidence, reason: `${usable.length} usable still(s) but none hero-grade — R1/R5 at reduced scale, or crop to detail. Do NOT upscale.` };
  if (logos.length >= 1) return { set: 'G', confidence: 'high', evidence, reason: `no usable photography, ${logos.length} logo/vector asset(s) — SET-G, see industry-playbooks.md §14. Do NOT route to F.` };
  return { set: 'F', confidence: 'high', evidence, reason: 'nothing usable and no logo — R9 kinetic type + R6 over a shipped trade path.' };
}

/* ═══════════════════════════════════════════════════════════════════════════════
   9. FAILED.md
   ═══════════════════════════════════════════════════════════════════════════════ */

function failedMarkdown(failures, outDir, slugNote) {
  const rawDir = path.join(outDir, 'raw');
  const lines = [];
  lines.push('# Assets that would not download');
  lines.push('');
  lines.push(`Generated ${new Date().toISOString()} by \`harvest.mjs\`.${slugNote}`);
  lines.push('');
  lines.push('Every URL below survived the full attempt ladder — browser User-Agent + Referer,');
  lines.push('a backoff retry, the live Chromium context, and `curl --http1.1` — and still did not');
  lines.push('return bytes. This is normal: arbitrary CDNs 403 non-browser clients while the HTML');
  lines.push('page from the same origin returns 200.');
  lines.push('');
  lines.push('## What to do');
  lines.push('');
  lines.push('1. **Run the curl blocks below yourself** — from a machine with a normal browser');
  lines.push('   session they usually succeed. Files land straight in `raw/`, then re-run:');
  lines.push('   `node harvest.mjs --out ' + outDir + ' <same urls>` (already-present files are kept).');
  lines.push('2. Or open the page in a browser, right-click → *Save image as…* into `' + rawDir + '/`.');
  lines.push('3. Or ask the client to send the originals — always the best outcome, because the');
  lines.push('   originals are larger than anything their website serves.');
  lines.push('');
  lines.push('> **Signed social CDN URLs expire.** `scontent*.cdninstagram.com` and `*.fbcdn.net`');
  lines.push('> links carry a short-lived signature (often only a few hours). If one is listed');
  lines.push('> below, do not retry it later — it is already dead. Ask for the file itself.');
  lines.push('');
  lines.push('---');
  lines.push('');
  for (const f of failures) {
    lines.push(`### ${f.url}`);
    lines.push('');
    lines.push(`- found on: ${f.page || '(passed directly)'}`);
    lines.push(`- via: ${(f.from || []).join(', ') || 'n/a'}`);
    lines.push(`- last error: ${f.reason}`);
    if (f.expiresAt) lines.push(`- **signed URL, signature expires ${f.expiresAt}**`);
    lines.push('');
    lines.push('```bash');
    lines.push(`curl -L --http1.1 --compressed \\`);
    lines.push(`  -A "${UA_PRIMARY}" \\`);
    if (f.page) lines.push(`  -e "${f.page}" \\`);
    lines.push(`  -H "Accept: image/avif,image/webp,image/apng,image/*,*/*;q=0.8" \\`);
    lines.push(`  -o "${path.join(rawDir, f.suggestedFile)}" \\`);
    lines.push(`  "${f.url}"`);
    lines.push('```');
    lines.push('');
  }
  lines.push('---');
  lines.push('');
  lines.push('After dropping files in by hand, re-run `harvest.mjs` with the same `--out` so the');
  lines.push('manifest and the SET class are recomputed from what actually exists on disk.');
  lines.push('');
  return lines.join('\n');
}

/* ═══════════════════════════════════════════════════════════════════════════════
   10. Main
   ═══════════════════════════════════════════════════════════════════════════════ */

async function main() {
  const opt = parseArgs(process.argv.slice(2));
  QUIET = opt.quiet;

  if (opt.fromFile) {
    const extra = fs.readFileSync(opt.fromFile, 'utf8').split(/\r?\n/)
      .map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
    opt.urls.push(...extra);
  }
  if (!opt.urls.length) { usage(); process.exit(1); }

  const outDir = path.resolve(opt.out);
  const rawDir = path.join(outDir, 'raw');
  fs.mkdirSync(rawDir, { recursive: true });

  log(`${C.bold}harvest${C.off} ${C.dim}→ ${outDir}${C.off}`);

  // ── split arguments into pages vs direct assets ──────────────────────────────
  const pageUrls = [];
  const directAssets = [];
  const refusals = [];
  for (const raw of opt.urls) {
    const u = abs(raw, 'https://example.invalid/');
    if (!u) { refusals.push({ url: raw, why: 'not a URL' }); continue; }
    const host = hostOf(u);
    if (SIGNED_CDN_HOSTS.test(host) || IMAGE_EXT.test(u) || VIDEO_EXT.test(u)) {
      directAssets.push({ url: u, page: null, from: ['argument'], alt: '', kind: VIDEO_EXT.test(u) ? 'video' : 'image', signed: SIGNED_CDN_HOSTS.test(host) });
      continue;
    }
    if (SOCIAL_PAGE_HOSTS.test(host)) { refusals.push({ url: u, why: 'social platform page' }); continue; }
    pageUrls.push(u);
  }

  if (refusals.length) {
    warn('');
    warn('── Refused, by design ─────────────────────────────────────────────────────');
    for (const r of refusals) warn(`  ${r.url}  (${r.why})`);
    warn('');
    warn('  This skill does NOT build scrapers against Instagram, Facebook, Threads or');
    warn('  TikTok. Two supported routes instead:');
    warn('');
    warn('   A. Ask the user to open each post, copy the direct image URL, and pass those');
    warn('      URLs as ARGUMENTS to this script. They are fetched first, immediately —');
    warn('      scontent/fbcdn links are signed and typically expire within hours, so a URL');
    warn('      pasted this morning is dead this afternoon. Do not save them for later.');
    warn('   B. Better: ask the user to download the photos and drop the files into');
    warn(`      ${rawDir}/  — originals from the phone beat anything the CDN re-encodes.`);
    warn('');
  }

  if (!pageUrls.length && !directAssets.length) {
    err('Nothing harvestable was supplied.');
    process.exit(1);
  }

  // ── load tools ───────────────────────────────────────────────────────────────
  const sharp = await loadSharp(path.resolve(opt.toolsDir), opt.autoInstall);
  if (sharp) log(`${C.dim}sharp ok (libvips ${sharp.versions?.vips || '?'})${C.off}`);
  else warn('sharp unavailable — assets will still download, but the manifest will carry no dimensions/luminance/subject score.');

  let pw = null, browser = null, ctx = null;
  let renderedHarvestRan = false;   // did Chromium actually render a page? drives the advice below
  const wantBrowser = opt.browser === 'force';
  async function ensureBrowser() {
    if (ctx || opt.browser === 'off') return ctx;
    pw = pw || await loadPlaywright(path.resolve(opt.toolsDir));
    if (!pw) { warn('playwright not resolvable — skipping the rendered harvest. (Never run `playwright install`.)'); opt.browser = 'off'; return null; }
    const executablePath = findChromium();
    try {
      browser = await pw.chromium.launch({ ...(executablePath ? { executablePath } : {}), args: ['--no-sandbox'] });
    } catch (e) {
      warn(`chromium launch failed: ${String(e.message).split('\n')[0]}`);
      opt.browser = 'off'; return null;
    }
    ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent: UA_PRIMARY,
      locale: 'en-US',
      ignoreHTTPSErrors: false,
    });
    // Proxy-safe routing: in sandboxes Chromium's own stack is often blocked even when
    // HTTPS_PROXY is set. Route page requests through Playwright's Node-side fetcher,
    // which honours the environment proxy. Never disable TLS verification.
    // LOOPBACK IS NEVER PROXIED. A local preview (vite preview, `npx serve dist`, the
    // fixture server you harvest against in a test) has no business going through an
    // egress proxy: a proxy that does not exempt loopback either refuses the request or
    // resolves 127.0.0.1 to ITSELF, which turns a working local page into an unexplained
    // abort. This matches the rule in references/delivery.md §0.2 — route cross-origin
    // traffic, never loopback.
    //
    // Honesty about the evidence: in THIS container the guard is belt-and-braces. NO_PROXY
    // already lists 127.0.0.0/8, and harvesting http://127.0.0.1:8123/ succeeds with the
    // guard forced off even after unsetting NO_PROXY — so the failure above was not
    // reproduced here. Keep the guard anyway: it costs one URL parse, and NO_PROXY
    // coverage is an environment detail this script must not depend on.
    if (process.env.HTTPS_PROXY || process.env.https_proxy) {
      await ctx.route('**/*', async (route) => {
        const target = route.request().url();
        let isLoopback = false;
        try {
          const h = new URL(target).hostname.replace(/^\[|\]$/g, '');
          isLoopback = h === 'localhost' || h === '::1' || h === '0.0.0.0' || /^127\./.test(h);
        } catch { /* unparseable — treat as remote and route it */ }
        if (isLoopback) return route.continue();
        try { await route.fulfill({ response: await ctx.request.fetch(route.request(), { timeout: opt.timeout, maxRedirects: 5 }) }); }
        catch { await route.abort(); }
      });
    }
    log(`${C.dim}chromium ready${executablePath ? ` (${executablePath})` : ''}${C.off}`);
    return ctx;
  }

  // ── crawl pages ──────────────────────────────────────────────────────────────
  const allCandidates = [];
  const pageReports = [];
  const business = {};

  for (const pageUrl of pageUrls) {
    log('');
    log(`${C.cyn}page${C.off} ${pageUrl}`);
    let harvested = null, via = null;
    // Keep WHY a page produced nothing. Printing it once as it happens is not enough:
    // the closing banner is what the next agent acts on, and it scrolls past by then.
    let pageFailReason = null;

    if (!wantBrowser) {
      const r = await fetchPageHtml(pageUrl, opt.timeout);
      if (r.ok) {
        harvested = extractFromHtml(r.html, r.finalUrl || pageUrl);
        via = r.via;
        log(`  ${C.dim}html ${kb(Buffer.byteLength(r.html))} via ${via} → ${harvested.candidates.length} candidate(s)${C.off}`);
        // pull url() out of every linked stylesheet, resolved against the SHEET's url
        for (const sheet of harvested.stylesheets.slice(0, 12)) {
          const s = await tryFetch(sheet, { headers: { 'user-agent': UA_PRIMARY, accept: 'text/css,*/*;q=0.1', referer: pageUrl }, timeout: opt.timeout, asText: true });
          if (!s.ok) { log(`  ${C.dim}css ${sheet} — ${s.reason}${C.off}`); continue; }
          let n = 0;
          for (const u of cssUrls(s.text)) {
            const resolved = abs(u, sheet);
            if (!resolved || NON_ASSET_EXT.test(resolved)) continue;
            if (!harvested.candidates.some((c) => c.url === resolved)) {
              harvested.candidates.push({ url: resolved, page: pageUrl, from: ['stylesheet:url()'], alt: '', kind: VIDEO_EXT.test(resolved) ? 'video' : 'image' });
              n++;
            }
          }
          if (n) log(`  ${C.dim}css ${sheet.split('/').pop()} → +${n}${C.off}`);
        }
      } else {
        pageFailReason = `plain fetch: ${r.reason}`;
        warn(`  plain fetch failed: ${r.reason}`);
      }
    }

    // Escalate to the rendered harvest when plain fetch failed, found almost nothing,
    // or the user forced it. This is the S1 fallback.
    const thin = !harvested || harvested.candidates.filter((c) => c.kind === 'image').length < 3;
    if (opt.browser !== 'off' && (wantBrowser || thin)) {
      const reason = wantBrowser ? 'forced' : (!harvested ? 'plain fetch failed' : 'fewer than 3 image candidates from static HTML');
      log(`  ${C.yel}escalating to Chromium (${reason})${C.off}`);
      const c = await ensureBrowser();
      if (c) {
        const b = await browserHarvest(pw, c, pageUrl, Math.max(opt.timeout, 45000));
        if (b.ok) {
          renderedHarvestRan = true;
          log(`  ${C.dim}rendered → ${b.candidates.length} candidate(s)${C.off}`);
          if (harvested) {
            const seen = new Set(harvested.candidates.map((x) => x.url));
            for (const cd of b.candidates) if (!seen.has(cd.url)) harvested.candidates.push(cd);
            harvested.business = harvested.business || b.business;
          } else {
            harvested = { candidates: b.candidates, stylesheets: b.stylesheets || [], business: b.business, title: b.title };
          }
          via = via ? `${via}+chromium` : 'chromium';
        } else {
          pageFailReason = `rendered harvest: ${b.reason}`;
          warn(`  rendered harvest failed: ${b.reason}`);
        }
      }
    }

    if (!harvested) {
      pageReports.push({ url: pageUrl, ok: false, candidates: 0, via: null, reason: pageFailReason || 'unknown' });
      err(`  no content from ${pageUrl}`);
      continue;
    }

    pageReports.push({ url: pageUrl, ok: true, candidates: harvested.candidates.length, via, title: harvested.title || null });
    // merge business facts, first non-empty wins
    const b = harvested.business || {};
    for (const [k, v] of Object.entries(b)) {
      if (v == null || (Array.isArray(v) && !v.length)) continue;
      if (Array.isArray(v)) { business[k] = [...new Set([...(business[k] || []), ...v])]; }
      else if (business[k] == null) business[k] = v;
    }
    for (const c of harvested.candidates) allCandidates.push(c);
  }

  // ── merge, dedupe by URL, order: direct args first (signed URLs expire) ───────
  const byUrl = new Map();
  for (const a of [...directAssets, ...allCandidates]) {
    const prev = byUrl.get(a.url);
    if (prev) {
      prev.from = [...new Set([...prev.from, ...a.from])];
      if (!prev.alt && a.alt) prev.alt = a.alt;
      if (!prev.page && a.page) prev.page = a.page;
      if (!prev.proxyUrl && a.proxyUrl) prev.proxyUrl = a.proxyUrl;
      continue;
    }
    byUrl.set(a.url, { ...a });
  }
  let queue = [...byUrl.values()];

  // annotate expiry on signed CDN urls, and push them to the front
  for (const a of queue) {
    const host = hostOf(a.url);
    if (SIGNED_CDN_HOSTS.test(host)) { a.signed = true; a.expiresAt = signedExpiry(a.url); }
  }
  queue.sort((a, b) => (b.signed ? 1 : 0) - (a.signed ? 1 : 0));

  const signedCount = queue.filter((a) => a.signed).length;
  if (signedCount) {
    warn('');
    warn(`── ${signedCount} signed social-CDN URL(s) queued FIRST ────────────────────────`);
    warn('  These carry a short-lived signature. They are being fetched right now because');
    warn('  in a few hours they will 403 for everyone, including the client.');
    for (const a of queue.filter((x) => x.signed).slice(0, 8)) {
      warn(`  ${a.expiresAt ? `expires ${a.expiresAt}` : 'expiry unknown'}  ${a.url.slice(0, 100)}…`);
    }
    warn('');
  }

  const requested = queue.length;
  if (requested > opt.max) {
    log(`${C.dim}${requested} candidates found; downloading the first ${opt.max} (raise with --max)${C.off}`);
    queue = queue.slice(0, opt.max);
  }

  // ── download ─────────────────────────────────────────────────────────────────
  log('');
  log(`${C.bold}downloading ${queue.length} asset(s)${C.off}${requested > queue.length ? ` ${C.dim}(of ${requested} found)${C.off}` : ''}`);

  const byHash = new Map();
  const downloaded = [];
  const failures = [];
  const skipped = [];

  async function handle(a) {
    const maxBytes = a.kind === 'video' ? opt.maxVideoBytes : 40 * 1024 * 1024;
    const res = await fetchAsset(a.url, {
      referer: a.page, timeout: opt.timeout, maxBytes,
      browserCtx: opt.browser === 'off' ? null : ctx,
      fallbackUrl: a.proxyUrl || null,
    });
    if (!res.ok) {
      if (res.oversize) {
        skipped.push({ ...a, reason: res.reason });
        log(`  ${C.yel}skip${C.off} ${res.reason}  ${a.url.slice(0, 80)}`);
        return;
      }
      failures.push({ ...a, reason: res.reason, suggestedFile: `${safeName(baseName(a.url))}.${extFor(a.url, '')}` });
      err(`  fail ${a.url.slice(0, 90)}`);
      err(`       ${res.reason.slice(0, 160)}`);
      return;
    }
    const buf = res.buf;

    // SOFT 404. A great many CMS and SPA hosts answer a dead asset URL with HTTP 200 and
    // the site's own HTML error page. Without this check that lands as either a mystifying
    // "below --min-bytes" skip, or — with --keep-small — an HTML document written into
    // raw/ under a .jpg name, which then fails to probe and pollutes the manifest.
    // Name it for what it is: the URL is dead, and it belongs in FAILED.md.
    // SVG is exempt: it IS a text format, and hosts serve it as image/svg+xml, text/xml,
    // application/xml or (wrongly) text/plain. Rejecting it here would throw away the logo,
    // which is the single asset that keeps SET-G reachable.
    const isSvg = /\.svg(\?|#|$)/i.test(a.url) || /^image\/svg/i.test(res.contentType || '') || /<svg[\s>]/i.test(buf.slice(0, 400).toString('latin1'));
    const ctLower = String(res.contentType || '').split(';')[0].trim().toLowerCase();
    const looksTextual = /^(text\/|application\/(xhtml\+xml|json|javascript)$)/.test(ctLower);
    const htmlMagic = /^\s*(<!doctype html|<html[\s>])/i.test(buf.slice(0, 200).toString('latin1'));
    if (!isSvg && (looksTextual || htmlMagic)) {
      const reason = `server returned ${ctLower || 'a text document'} for an asset URL — soft 404 (an HTML error page served with HTTP 200), not an image`;
      failures.push({ ...a, reason, suggestedFile: `${safeName(baseName(a.url))}.${extFor(a.url, '')}` });
      err(`  fail ${a.url.slice(0, 90)}`);
      err(`       ${reason}`);
      return;
    }

    // SIZE FLOOR — with a logo exemption.
    //
    // --min-bytes exists to drop tracking pixels, spacer GIFs and sprite fragments.
    // Applied flat it also deletes the one asset that keeps SET-G reachable, because a
    // brand mark is SMALL BY DESIGN: the SVG wordmark in the local fixture is 270 B and
    // its apple-touch-icon 1,038 B — both an order of magnitude under the 3,000 B
    // default. Measured before this exemption existed, against a logo-only page:
    //
    //     requested 2 / downloaded 0 / failed 0 (+2 skipped: too small or over the size cap)
    //     ZERO ASSETS DOWNLOADED — SET CLASS AUTO-DOWNGRADED TO SET-F
    //
    // — while the banner simultaneously advised "or SET-G if a logo exists". The logo
    // did exist, was found, was fetched successfully, and was then thrown away by this
    // very line. The soft-404 check twenty lines above already exempts SVG for exactly
    // this reason ("the single asset that keeps SET-G reachable"); the floor has to
    // agree with it or the exemption upstream buys nothing.
    //
    // A logo-grade asset is one that is a vector, or that the page itself nominated as
    // its brand mark (<link rel=icon|apple-touch-icon|mask-icon>, schema.org `logo`,
    // msapplication-TileImage), or whose filename says so. classifyAsset() already
    // routes all of these to role 'logo' and REJECT_LONG_EDGE already spares a small
    // logo there — so keeping them here costs nothing and loses nothing to noise.
    const logoGrade =
      isSvg ||
      LOGO_SOURCE.test((a.from || []).join(' ')) ||
      LOGO_HINT.test(a.url);
    if (!opt.keepSmall && buf.length < opt.minBytes && a.kind !== 'video' && !logoGrade) {
      skipped.push({ ...a, reason: `below --min-bytes (${buf.length} < ${opt.minBytes})` });
      return;
    }
    const hash = sha256(buf);
    if (byHash.has(hash)) {
      const orig = byHash.get(hash);
      orig.duplicateOf = orig.duplicateOf || [];
      orig.aliasUrls = [...new Set([...(orig.aliasUrls || []), a.url])];
      log(`  ${C.dim}dupe${C.off} ${a.url.slice(0, 70)} ${C.dim}→ ${orig.file}${C.off}`);
      return;
    }
    // Content-addressed filename: re-running on the same client rewrites the same files
    // instead of accumulating 001-/002- copies of identical bytes.
    const ext = extFor(a.url, res.contentType);
    const file = `${hash.slice(0, 8)}-${safeName(baseName(a.url))}.${ext}`;
    await fsp.writeFile(path.join(rawDir, file), buf);
    const p = await probe(sharp, buf, a.url, a.kind);
    const rec = {
      file,
      path: path.join(rawDir, file),
      sourceUrl: res.resolvedUrl || a.url,
      requestedUrl: a.url,
      proxyUrl: a.proxyUrl || null,   // the resizing-proxy URL this was unwrapped from
      sourcePage: a.page,
      foundVia: a.from,
      fetchedVia: res.via,
      attempts: res.attempts,
      signed: !!a.signed,
      expiresAt: a.expiresAt || null,
      sha256: hash,
      kind: a.kind,
      alt: '',                     // authored later from trade + subject, NEVER from the filename
      altSourceHint: a.alt || '',  // the client's own alt, if they wrote one — a hint, not the answer
      consent: 'unknown',          // identifiable people? confirm or crop before any face reaches a hero
      photographer: 'unknown',     // client | hired | unknown — a hired photographer owns the copyright
      probe: p,
    };
    rec.classification = classifyAsset(rec);
    byHash.set(hash, rec);
    downloaded.push(rec);
    const dims = p.width ? `${p.width}×${p.height}` : (p.probeError ? 'unprobed' : '?');
    log(`  ${C.grn}ok${C.off}   ${file.padEnd(52)} ${String(dims).padEnd(11)} ${kb(buf.length).padStart(9)}  ${C.dim}${rec.classification.role}${res.via !== 'fetch' ? ` via ${res.via}` : ''}${C.off}`);
  }

  const pool = Math.max(1, Math.min(opt.concurrency, 8));
  let cursor = 0;
  await Promise.all(Array.from({ length: pool }, async () => {
    while (cursor < queue.length) {
      const a = queue[cursor++];
      try { await handle(a); }
      catch (e) { failures.push({ ...a, reason: `unexpected: ${String(e.message).split('\n')[0]}`, suggestedFile: `${safeName(baseName(a.url))}.bin` }); }
    }
  }));

  // ── pick up anything the user dropped in by hand ──────────────────────────────
  const known = new Set(downloaded.map((d) => d.file));
  const dropped = [];
  for (const f of fs.readdirSync(rawDir)) {
    if (known.has(f)) continue;
    if (!IMAGE_EXT.test(f) && !VIDEO_EXT.test(f)) continue;
    const full = path.join(rawDir, f);
    const buf = await fsp.readFile(full);
    const hash = sha256(buf);
    if (byHash.has(hash)) continue;
    const kind = VIDEO_EXT.test(f) ? 'video' : 'image';
    const p = await probe(sharp, buf, f, kind);
    const rec = {
      file: f, path: full, sourceUrl: null, sourcePage: null,
      foundVia: ['dropped-in-by-hand'], fetchedVia: 'local', attempts: [],
      signed: false, expiresAt: null, sha256: hash, kind,
      alt: '', altSourceHint: '', consent: 'unknown', photographer: 'unknown', probe: p,
    };
    rec.classification = classifyAsset(rec);
    byHash.set(hash, rec);
    downloaded.push(rec);
    dropped.push(f);
  }
  if (dropped.length) log(`${C.dim}picked up ${dropped.length} file(s) already present in raw/${C.off}`);

  if (browser) await browser.close().catch(() => {});

  // ── classify the set ─────────────────────────────────────────────────────────
  const counts = { requested, downloaded: downloaded.length, failed: failures.length, skipped: skipped.length };
  const setClass = suggestSetClass(downloaded, counts);

  const heroShortlist = downloaded
    .filter((d) => d.kind === 'image' && d.classification.role !== 'reject' && d.classification.role !== 'logo')
    .sort((a, b) => (b.classification.score || 0) - (a.classification.score || 0))
    .slice(0, 8)
    .map((d) => ({
      file: d.file, dims: d.probe.width ? `${d.probe.width}×${d.probe.height}` : null,
      longEdge: d.probe.longEdge, subjectScore: d.probe.subjectScore,
      meanLuminance: d.probe.meanLuminance, dominant: d.probe.dominant,
      heroGrade: !!d.classification.heroGrade, score: d.classification.score, sourceUrl: d.sourceUrl,
    }));

  // ── write manifest ───────────────────────────────────────────────────────────
  const manifest = {
    generatedAt: new Date().toISOString(),
    generator: 'premium-web/scripts/harvest.mjs',
    out: outDir,
    slug: opt.slug || null,
    inputs: { pages: pageUrls, directAssets: directAssets.map((d) => d.url), refused: refusals },
    pages: pageReports,
    accounting: counts,
    thresholds: T,
    setClass,
    heroShortlist,
    business,
    provenanceReminder:
      'These are the CLIENT\'S OWN images, which removes the stock-licence question — but NOT every question. ' +
      'Salon/gym/restaurant/clinic photos contain identifiable third parties, and small businesses routinely ' +
      'hand over photos a hired photographer owns. Set consent and photographer on every asset that reaches a ' +
      'hero before you build. Unknown consent means crop to the detail, never the face.',
    assets: downloaded,
    failures: failures.map((f) => ({ url: f.url, page: f.page, from: f.from, reason: f.reason, expiresAt: f.expiresAt || null })),
    skipped: skipped.map((s) => ({ url: s.url, reason: s.reason })),
  };
  await fsp.writeFile(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  const failedPath = path.join(outDir, 'FAILED.md');
  if (failures.length) {
    await fsp.writeFile(failedPath, failedMarkdown(failures, outDir, opt.slug ? ` Client slug: \`${opt.slug}\`.` : ''));
  } else if (fs.existsSync(failedPath)) {
    await fsp.rm(failedPath);
  }

  // ── report ───────────────────────────────────────────────────────────────────
  console.log('');
  console.log('═'.repeat(78));
  console.log(`${C.bold}requested ${counts.requested} / downloaded ${counts.downloaded} / failed ${counts.failed}${C.off}` +
    (counts.skipped ? `${C.dim} (+${counts.skipped} skipped: too small or over the size cap)${C.off}` : ''));
  console.log('═'.repeat(78));

  const bytes = downloaded.reduce((n, d) => n + d.probe.bytes, 0);
  console.log(`  raw/            ${downloaded.length} file(s), ${(bytes / 1048576).toFixed(2)} MB`);
  console.log(`  manifest.json   ${path.join(outDir, 'manifest.json')}`);
  if (failures.length) console.log(`  ${C.yel}FAILED.md       ${failedPath} — ${failures.length} copy-paste curl block(s) for the user${C.off}`);

  if (counts.downloaded === 0) {
    console.log('');
    console.log(`${C.red}${'█'.repeat(78)}${C.off}`);
    console.log(`${C.red}${C.bold}  ZERO ASSETS DOWNLOADED — SET CLASS AUTO-DOWNGRADED TO SET-F${C.off}`);
    console.log(`${C.red}${'█'.repeat(78)}${C.off}`);
    console.log('');
    console.log('  Pages may have parsed fine; that is irrelevant. Not one byte of imagery was');
    console.log('  obtained, so nothing can be classified and recipes R1–R5 and R7 are OFF THE');
    console.log('  TABLE. Do not proceed as if assets exist. Do not substitute stock silently.');
    console.log('');
    // Only offer remedies that exist. Pointing at a FAILED.md that was never written
    // (zero candidates => zero failures) or at --browser when Chromium already rendered
    // the page sends the next agent chasing a file and a flag that cannot help it.
    console.log('  In order, do this:');
    let n = 0;
    if (failures.length) {
      console.log(`   ${++n}. Open ${failedPath} and run the ${failures.length} curl block(s) — they usually work from a`);
      console.log('      normal machine even when they fail from here.');
    } else if (skipped.length) {
      // Do not say "nothing was found" when things were found, fetched and then
      // filtered. That sends the next agent to re-check the URLs — the one place the
      // problem is definitely not.
      const tooSmall = skipped.filter((s) => /min-bytes/.test(s.reason)).length;
      const tooBig = skipped.length - tooSmall;
      console.log(`   ${++n}. Nothing FAILED — ${skipped.length} asset(s) downloaded fine and were then FILTERED OUT`);
      console.log(`      by this script's own thresholds${tooSmall ? `: ${tooSmall} under --min-bytes (${opt.minBytes} B)` : ''}${tooBig ? `${tooSmall ? ',' : ':'} ${tooBig} over a size cap` : ''}.`);
      console.log('      The URLs are right and the network is fine. Look at the skipped list in');
      console.log('      manifest.json first, then re-run with --keep-small (or a lower --min-bytes)');
      console.log('      if those assets are real. Do NOT re-check the page URLs.');
      for (const s of skipped.slice(0, 6)) console.log(`        · ${s.url.slice(0, 88)} — ${s.reason}`);
    } else if (pageReports.length && pageReports.every((p) => !p.ok)) {
      // NOT the same failure as "the page parsed and had no images", and the remedy is
      // the opposite one. Every page was unreadable — DNS, connection refused, a timeout,
      // a 4xx — so nothing was ever parsed and there is nothing wrong with the imagery.
      // Saying "the pages parsed but reference no imagery" here sends the next agent to
      // audit a page it never actually reached. The reason was printed as it happened and
      // has scrolled off by now, so repeat it.
      console.log(`   ${++n}. NO PAGE WAS READ AT ALL — ${pageReports.length} of ${pageReports.length} URL(s) returned nothing.`);
      console.log('      This is a reachability failure, not an imagery failure: nothing was parsed, so');
      console.log('      "no images found" says nothing about the client\'s site. Fix the URL or the');
      console.log('      network first, then re-run.');
      // Truncated: the curl fallback echoes its whole command line into the reason, which
      // is 400 characters of flags nobody needs in a summary. Full text is in manifest.json.
      for (const p of pageReports.slice(0, 6)) {
        const why = String(p.reason).split(' | ')[0].slice(0, 120);
        console.log(`        · ${p.url.slice(0, 72)} — ${why}`);
      }
    } else {
      console.log(`   ${++n}. There is no FAILED.md: nothing failed, because no image URL was ever found.`);
      console.log('      The pages parsed but reference no imagery this script can reach — so the');
      console.log('      problem is upstream of the download ladder. Check that these URLs are the');
      console.log('      right pages, and look at the page in a browser yourself.');
    }
    if (opt.browser === 'off') {
      console.log(`   ${++n}. Re-run WITHOUT --no-browser so the Chromium rendered harvest can run.`);
    } else if (!renderedHarvestRan) {
      console.log(`   ${++n}. Re-run with --browser to force the Chromium rendered harvest (it did not run).`);
    } else {
      console.log(`   ${++n}. The Chromium rendered harvest ALREADY ran on this pass and still found`);
      console.log('      nothing — do not re-run with --browser expecting a different answer.');
    }
    console.log(`   ${++n}. Ask the client for the original files and drop them in ${rawDir}/`);
    console.log(`   ${++n}. Only if all of the above fail: build SET-F (R9 kinetic type + R6 over a shipped`);
    console.log('      trade path) or SET-G if a logo exists, and SAY SO OUT LOUD to the user.');
    console.log('');
  } else {
    console.log('');
    console.log(`${C.bold}suggested SET class: ${C.cyn}SET-${setClass.set}${C.off}  ${C.dim}(confidence: ${setClass.confidence})${C.off}`);
    console.log(`  ${setClass.reason}`);
    console.log(`  ${C.dim}hero-grade ${setClass.evidence.heroGrade} · usable ${setClass.evidence.usableStills} · logo/vector ${setClass.evidence.logosOrVectors} · video ${setClass.evidence.videos}${C.off}`);
    console.log('');
    if (heroShortlist.length) {
      console.log(`${C.bold}hero shortlist${C.off} ${C.dim}(rank · file · dims · subjectScore · luma · dominant)${C.off}`);
      heroShortlist.forEach((h, i) => {
        console.log(`  ${String(i + 1).padStart(2)}. ${h.file.padEnd(46)} ${String(h.dims || '?').padEnd(11)} s=${String(h.subjectScore ?? '?').padEnd(5)} L=${String(h.meanLuminance ?? '?').padEnd(5)} ${h.dominant || ''} ${h.heroGrade ? C.grn + 'HERO-GRADE' + C.off : C.dim + 'under threshold' + C.off}`);
      });
      console.log('');
    }
    const under = downloaded.filter((d) => d.kind === 'image' && d.probe.longEdge != null && d.probe.longEdge < T.USABLE_LONG_EDGE && d.classification.role !== 'logo');
    if (under.length) {
      console.log(`${C.yel}  ${under.length} image(s) are under ${T.USABLE_LONG_EDGE}px on the long edge. They will NOT survive a`);
      console.log(`  full-bleed hero. Use them small or not at all — never upscale.${C.off}`);
      console.log('');
    }
  }

  if (business && (business.name || business.telephone?.length)) {
    console.log(`${C.bold}client facts lifted from the page${C.off} ${C.dim}(feed these into step 1 instead of asking)${C.off}`);
    if (business.name) console.log(`  name       ${business.name}`);
    if (business.types?.length) console.log(`  schema     ${business.types.join(', ')}`);
    if (business.telephone?.length) console.log(`  telephone  ${business.telephone.join(', ')}`);
    if (business.lang || business.locale) console.log(`  language   ${[business.lang, business.locale].filter(Boolean).join(' ')}`);
    if (business.sameAs?.length) console.log(`  sameAs     ${business.sameAs.slice(0, 4).join(', ')}${business.sameAs.length > 4 ? ` (+${business.sameAs.length - 4})` : ''}`);
    console.log('');
  }

  console.log(`${C.dim}Next: step 4 triage — references/asset-pipeline.md §3. Confirm the SET class by`);
  console.log(`opening the top shortlist files with Read; the score is a filter, not a judgement.${C.off}`);
  console.log('');

  process.exit(counts.downloaded === 0 ? 3 : 0);
}

main().catch((e) => {
  console.error(`${C.red}fatal:${C.off} ${e.stack || e.message}`);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * premium-web / scripts/frames.mjs
 * ---------------------------------------------------------------------------
 * Step 7 of the skill, in one command: a source the CLIENT actually owns
 * (a video, a directory of stills, or a before/after pair) in, a budget-checked
 * two-width frame ladder out, plus a poster, a social card and a manifest that
 * the scrubber component and the verify step both read.
 *
 *   node frames.mjs from-video  <src.mp4>          --out public/hero/seq [--fps 12] [--max-frames 72]
 *   node frames.mjs from-stills <dir>              --out public/hero/gal [--stride 2]
 *   node frames.mjs from-pair   <before> <after>   --out public/hero/pair
 *
 * Output layout (matches the SequencePlus / ScrollScrubber src convention used
 * in references/animation-recipes.md — four-digit padding, 147+ frames is normal):
 *
 *   <out>/desktop/frame-0000.webp …      1600px wide by default (never upscaled)
 *   <out>/mobile/frame-0000.webp  …       960px wide
 *   <out>/poster.jpg                      JPEG fallback poster — the LCP element
 *   <out>/poster.webp                     same frame, modern format
 *   <out>/og-1200x630.jpg                 social card; without it every WhatsApp
 *                                         and Viber share renders blank
 *   <out>/manifest.json                   bytes, dedupe map, decoded-memory maths
 *
 * ===========================================================================
 * BUDGETS — this script REFUSES to emit a set that blows them.
 * ===========================================================================
 *   desktop ladder on disk      <=   4,000,000 B  (4.0 MB)
 *   mobile ladder on disk       <=   1,500,000 B  (1.5 MB)
 *   poster JPEG                 <=      81,920 B  (80 KB) — it is in the critical
 *                                                  path; at 1.6 Mbps 80 KB is 0.4 s
 *   keyframe subset (mobile)    <=     250,000 B  (250 KB) for at least 8 frames —
 *                                                  this is what makes the scrub
 *                                                  usable before the rest lands
 *   decoded MOBILE bitmap       <= 250,000,000 B  (250 MB) = W x H x 4 x frames.
 *                                                  Phones die here, and it is
 *                                                  invisible in any network panel.
 *   decoded DESKTOP bitmap      > 250 MB is allowed but sets
 *                               slidingWindowRequired:true in the manifest — the
 *                               component MUST run the ImageBitmap window, it is
 *                               no longer optional. (Reference: 60 frames at
 *                               1280x720 = 3.9 MB on disk, 221 MB live.)
 *
 * On a breach the script prints exactly which budget, by how much, and the
 * remedies with numbers — then exits 2 WITHOUT touching any previously good
 * output in <out>. `--auto-fit` searches quality/stride for you. If you have a
 * real reason to exceed a cap you must state the new number explicitly with
 * --budget-desktop / --budget-mobile; there is no --force.
 *
 * ===========================================================================
 * FRAME COUNT vs SMOOTHNESS — derive it from scroll distance, do not guess it.
 * ===========================================================================
 * frames per 100vh = frames / (scrollVh / 100), where scrollVh is the scroll
 * distance the frames are actually mapped over — NOT the section height. The
 * repo reference maps frames to progress 0.10-0.65 of a 500vh section with a
 * 100vh sticky child: 0.55 x 400vh = 220vh over 60 frames = 27.3 frames/100vh.
 *   < 12 frames total            -> reads steppy in sequence mode; use crossfade
 *                                   (R4), which hides the gaps between subjects
 *   < 12 frames/100vh            -> visible stepping; lengthen the section or
 *                                   switch to crossfade
 *   12-45 frames/100vh           -> fine. The widely-repeated "20-40" figure is
 *                                   an UNCITED heuristic; treat it as a range,
 *                                   not a spec
 *   > 45 frames/100vh            -> you are paying bytes nobody can perceive;
 *                                   decimate with --stride
 * Measured anchor instead of folklore: Apple's own sequence is 147 frames at
 * 1158x770, ~42.5 KB average, ~6.2 MB total — restrained in RESOLUTION, not in
 * payload.
 *
 * ===========================================================================
 * CONTAINER GROUND TRUTH
 * ===========================================================================
 *   - System ffmpeg is BROKEN (libcaca.so.0). This script only ever uses the
 *     binary from require('ffmpeg-static').
 *   - Extraction goes to PNG. Writing an ffmpeg sequence straight to .webp
 *     silently produces ONE animated webp, not N stills.
 *   - sharp does every resize/encode. @squoosh/cli is dead on Node 22.
 *   - No credentials are read, probed or required. This is a local pixel
 *     pipeline; it touches the network only if npm has to fetch sharp/ffmpeg-static.
 *
 * Exit codes: 0 emitted and within budget · 1 usage/input error · 2 budget
 * refusal (nothing was written) · 3 internal error.
 */

import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CWD = process.cwd();

/* =========================================================== budget table == */

const BUDGET = {
  desktopBytes: 4_000_000,
  mobileBytes: 1_500_000,
  posterBytes: 81_920,
  keyframeBytes: 250_000,
  keyframeMinCount: 8,
  decodedMobileBytes: 250_000_000,
  decodedWindowThresholdBytes: 250_000_000,
  ogBytesSoft: 300_000,
};

/* ================================================================== args === */

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { out._.push(a); continue; }
    const eq = a.indexOf('=');
    if (eq !== -1) { out[a.slice(2, eq)] = a.slice(eq + 1); continue; }
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) { out[key] = next; i++; } else { out[key] = true; }
  }
  return out;
}

const USAGE = `premium-web frames — source -> budget-checked two-width frame ladder

  node frames.mjs from-video  <video>            --out <dir>
  node frames.mjs from-stills <dir>              --out <dir>
  node frames.mjs from-pair   <before> <after>   --out <dir>

  --out <dir>            output root (required)
  --format webp|avif|jpeg  ladder format                     (default webp)
  --quality N            encoder quality                     (default webp 72 / avif 50 / jpeg 78)
  --widths D,M           desktop,mobile widths in px         (default 1600,960 — never upscaled)
  --aspect W:H           force output aspect                 (default: from the first source frame)
  --fit cover|contain    framing normalisation               (default cover, centre)
  --fps N                from-video sampling rate            (default 12)
  --start S / --duration S   from-video trim, seconds        (default whole clip)
  --max-frames N         hard cap on emitted frames          (default 96)
  --stride N             keep every Nth source frame         (default 1)
  --poster-frame N       index of the poster/LCP frame       (default 0)
  --scroll-vh N          scroll distance the frames map over (default 220)
  --auto-fit             search quality/stride until budgets pass
  --no-dedupe            keep byte-identical duplicate frames
  --keep-intermediates   keep extracted PNGs in <out>/.staging
  --budget-desktop N     explicit override, in bytes (you are stating a new number)
  --budget-mobile N      explicit override, in bytes
  --tools-dir <dir>      sharp/ffmpeg-static location        (default <cwd>/work/tools)
  --json                 print the manifest as JSON only
`;

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h) { console.log(USAGE); process.exit(0); }
if (args._.length === 0) { console.log(USAGE); process.exit(1); }

const MODE = args._[0];
const MODES = ['from-video', 'from-stills', 'from-pair'];
if (!MODES.includes(MODE)) die(1, `unknown subcommand "${MODE}" — expected one of ${MODES.join(', ')}`);
if (!args.out) die(1, 'missing --out <dir>');

const OUT = path.resolve(args.out);
const STAGING = path.join(OUT, '.staging');
const TOOLS_DIR = path.resolve(args['tools-dir'] || process.env.PREMIUM_WEB_TOOLS || path.join(CWD, 'work', 'tools'));
const FORMAT = String(args.format || 'webp').toLowerCase();
if (!['webp', 'avif', 'jpeg'].includes(FORMAT)) die(1, `--format must be webp, avif or jpeg (got "${FORMAT}")`);
const EXT = FORMAT === 'jpeg' ? 'jpg' : FORMAT;
const DEFAULT_Q = { webp: 72, avif: 50, jpeg: 78 }[FORMAT];
const QUALITY = clampInt(args.quality, DEFAULT_Q, 30, 100);
const [W_DESKTOP, W_MOBILE] = String(args.widths || '1600,960').split(',').map((s) => clampInt(s, 0, 240, 4096));
const FIT = args.fit === 'contain' ? 'contain' : 'cover';
const FPS = Number(args.fps || 12);
const MAX_FRAMES = clampInt(args['max-frames'], 96, 2, 600);
const STRIDE = clampInt(args.stride, 1, 1, 20);
const POSTER_FRAME = clampInt(args['poster-frame'], 0, 0, 10000);
const SCROLL_VH = clampInt(args['scroll-vh'], 220, 50, 2000);
const AUTO_FIT = Boolean(args['auto-fit']);
const DEDUPE = !args['no-dedupe'];
const KEEP = Boolean(args['keep-intermediates']);
const JSON_ONLY = Boolean(args.json);
if (args['budget-desktop']) BUDGET.desktopBytes = clampInt(args['budget-desktop'], BUDGET.desktopBytes, 1, 1e9);
if (args['budget-mobile']) BUDGET.mobileBytes = clampInt(args['budget-mobile'], BUDGET.mobileBytes, 1, 1e9);

function clampInt(v, dflt, lo, hi) {
  const n = Number(v);
  if (!Number.isFinite(n)) return dflt;
  return Math.max(lo, Math.min(hi, Math.round(n)));
}
function die(code, msg) { console.error(`frames: ${msg}`); process.exit(code); }

/* ====================================================== tool resolution ==== */
/* Build-time tools live in work/tools so they never leak into the CLIENT's
   package.json — sharp and ffmpeg-static must not ship as site dependencies. */

function globalNodeModules() { return path.resolve(path.dirname(process.execPath), '..', 'lib', 'node_modules'); }
const RESOLVE_BASES = [
  path.join(CWD, 'package.json'),
  path.join(TOOLS_DIR, 'package.json'),
  path.join(HERE, 'package.json'),
  path.join(globalNodeModules(), 'package.json'),
];
function tryRequire(name) {
  for (const base of RESOLVE_BASES) { try { return createRequire(base)(name); } catch { /* next */ } }
  return null;
}
function npmInstall(pkgs) {
  fs.mkdirSync(TOOLS_DIR, { recursive: true });
  const pj = path.join(TOOLS_DIR, 'package.json');
  if (!fs.existsSync(pj)) fs.writeFileSync(pj, JSON.stringify({ name: 'premium-web-tools', private: true, version: '0.0.0' }, null, 2) + '\n');
  const r = spawnSync('npm', ['install', '--no-audit', '--no-fund', '--loglevel=error', ...pkgs], { cwd: TOOLS_DIR, encoding: 'utf8', timeout: 300000 });
  return r.status === 0;
}
function requireOrInstall(name, spec) {
  const first = tryRequire(name);
  if (first) return first;
  process.stderr.write(`frames: installing ${spec} into ${TOOLS_DIR} …\n`);
  if (!npmInstall([spec])) die(3, `npm install ${spec} failed — run scripts/preflight.mjs first`);
  const second = tryRequire(name);
  if (!second) die(3, `installed ${spec} but still cannot resolve it`);
  return second;
}

const sharp = requireOrInstall('sharp', 'sharp@^0.34');

/* ================================================================ helpers == */

const evenInt = (n) => Math.max(2, Math.round(n / 2) * 2);
const kb = (n) => `${(n / 1000).toFixed(0)} KB`;
const mb = (n) => `${(n / 1e6).toFixed(1)} MB`;
const pct = (a, b) => `${((100 * a) / b).toFixed(1)}%`;
const pad4 = (i) => String(i).padStart(4, '0');
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

const USE_COLOR = !process.env.NO_COLOR && process.stdout.isTTY;
const c = (code, s) => (USE_COLOR ? `\x1b[${code}m${s}\x1b[0m` : s);
const green = (s) => c(32, s), red = (s) => c(31, s), yellow = (s) => c(33, s), dim = (s) => c(2, s), bold = (s) => c(1, s);

async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

const IMAGE_RE = /\.(png|jpe?g|webp|avif|tiff?)$/i;

/* ======================================================= source collection = */

/** from-video: ffmpeg-static -> PNG stills. Never straight to .webp — ffmpeg
 *  would write ONE animated webp instead of N files, silently. */
async function collectFromVideo() {
  const src = path.resolve(args._[1] || '');
  if (!src || !fs.existsSync(src)) die(1, `from-video needs a readable video file (got "${args._[1] || ''}")`);
  const ffmpeg = requireOrInstall('ffmpeg-static', 'ffmpeg-static@^5');
  try { fs.chmodSync(ffmpeg, 0o755); } catch { /* already executable */ }

  const probe = spawnSync(ffmpeg, ['-hide_banner', '-i', src], { encoding: 'utf8', timeout: 120000 });
  const info = (probe.stderr || '') + (probe.stdout || '');
  if (/Invalid data found|No such file/i.test(info)) die(1, `ffmpeg cannot read ${src}`);
  const dur = /Duration:\s*(\d+):(\d+):([\d.]+)/.exec(info);
  const durationSec = dur ? Number(dur[1]) * 3600 + Number(dur[2]) * 60 + Number(dur[3]) : null;
  const dims = /,\s*(\d{2,5})x(\d{2,5})[\s,]/.exec(info);
  const srcW = dims ? Number(dims[1]) : null, srcH = dims ? Number(dims[2]) : null;
  const srcFps = /([\d.]+)\s+fps/.exec(info) ? Number(/([\d.]+)\s+fps/.exec(info)[1]) : null;

  const extractDir = path.join(STAGING, 'extract');
  await fsp.rm(extractDir, { recursive: true, force: true });
  await fsp.mkdir(extractDir, { recursive: true });

  // Downscale during extraction so the PNG intermediates stay sane, but never
  // upscale: min(target, iw). The comma inside min() is escaped for the filter parser.
  const targetW = W_DESKTOP;
  const vf = `fps=${FPS},scale=w=min(${targetW}\\,iw):h=-2:flags=lanczos`;
  const cmd = ['-hide_banner', '-loglevel', 'error', '-y'];
  if (args.start) cmd.push('-ss', String(args.start));
  cmd.push('-i', src);
  if (args.duration) cmd.push('-t', String(args.duration));
  cmd.push('-vf', vf, '-vsync', '0', '-frames:v', String(MAX_FRAMES * STRIDE), '-start_number', '0',
    path.join(extractDir, 'frame_%04d.png'));

  const t0 = Date.now();
  const r = spawnSync(ffmpeg, cmd, { encoding: 'utf8', timeout: 600000 });
  if (r.status !== 0) die(3, `ffmpeg extraction failed:\n${(r.stderr || '').trim().slice(0, 600)}`);

  const files = (await fsp.readdir(extractDir)).filter((f) => f.endsWith('.png')).sort(collator.compare)
    .map((f) => path.join(extractDir, f));
  if (!files.length) die(3, 'ffmpeg produced no frames — check --start/--duration against the clip length');

  let intermediateBytes = 0;
  for (const f of files) intermediateBytes += (await fsp.stat(f)).size;

  return {
    kind: 'video',
    files,
    sourceBytes: (await fsp.stat(src)).size,
    // The honest compression baseline for video is the LOSSLESS extraction, not
    // the delivery-encoded mp4. An mp4 is also not a substitute deliverable:
    // reliable scrubbing needs a webm for Firefox AND an mp4 for iOS Safari,
    // which usually erases the container's apparent size advantage.
    intermediateBytes,
    baselineLabel: 'PNG intermediates (lossless extraction)',
    containerNote: 'mp4 container — not a like-for-like baseline; cross-browser scrub needs webm + mp4',
    describe: `${path.relative(CWD, src)} · ${srcW && srcH ? `${srcW}x${srcH}` : '?'}` +
      `${srcFps ? ` @${srcFps}fps` : ''}${durationSec ? ` · ${durationSec.toFixed(2)}s` : ''}` +
      ` -> ${files.length} PNG @${FPS}fps in ${((Date.now() - t0) / 1000).toFixed(1)}s`,
    ffmpegVersion: (/ffmpeg version (\S+)/.exec(info) || [])[1] || 'unknown',
  };
}

async function collectFromStills() {
  const dir = path.resolve(args._[1] || '');
  if (!dir || !fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) die(1, `from-stills needs a directory (got "${args._[1] || ''}")`);
  const files = (await fsp.readdir(dir)).filter((f) => IMAGE_RE.test(f)).sort(collator.compare).map((f) => path.join(dir, f));
  if (!files.length) die(1, `no images in ${dir}`);
  let sourceBytes = 0;
  for (const f of files) sourceBytes += (await fsp.stat(f)).size;
  return {
    kind: 'stills', files, sourceBytes, intermediateBytes: sourceBytes,
    baselineLabel: 'source stills',
    describe: `${files.length} stills from ${path.relative(CWD, dir)}`,
  };
}

async function collectFromPair() {
  const before = path.resolve(args._[1] || ''), after = path.resolve(args._[2] || '');
  if (!fs.existsSync(before) || !fs.existsSync(after)) die(1, 'from-pair needs <before> <after>, both readable image files');
  const sourceBytes = (await fsp.stat(before)).size + (await fsp.stat(after)).size;
  return {
    kind: 'pair', files: [before, after], sourceBytes, intermediateBytes: sourceBytes,
    baselineLabel: 'source pair',
    describe: `pair ${path.basename(before)} -> ${path.basename(after)} (frame 0 = before, frame 1 = after)`,
  };
}

/* ================================================================= dedupe == */
/* Hash a 160px greyscale RAW downsample. Raw pixels, not file bytes: two
   re-encodes of the same source frame have different file bytes but identical
   pixels, and a video with a static intro produces runs of those. Exact hash
   equality only — no perceptual fuzz, so a real sequence is never thinned by
   accident. Duplicates anywhere in the set collapse to their first occurrence,
   and the manifest records the mapping so nothing silently shifts index. */
async function dedupeFrames(files) {
  const hashes = await mapPool(files, 4, async (f) => {
    const buf = await sharp(f).resize(160, null, { fit: 'inside' }).greyscale().raw().toBuffer();
    return crypto.createHash('sha1').update(buf).digest('hex');
  });
  const seen = new Map();
  const kept = [];
  const map = [];
  files.forEach((f, i) => {
    const h = hashes[i];
    if (seen.has(h)) {
      map.push({ source: path.basename(f), duplicateOf: seen.get(h) });
    } else {
      seen.set(h, kept.length);
      map.push({ source: path.basename(f), frame: kept.length });
      kept.push(f);
    }
  });
  return { kept, map, dropped: files.length - kept.length };
}

/* ================================================================= encode == */

function encoder(pipeline, quality) {
  if (FORMAT === 'webp') return pipeline.webp({ quality, effort: 4 });
  if (FORMAT === 'avif') return pipeline.avif({ quality, effort: 4 });
  return pipeline.jpeg({ quality, mozjpeg: true });
}

async function encodeLadder(files, tier, quality) {
  const dir = path.join(STAGING, tier.name);
  await fsp.rm(dir, { recursive: true, force: true });
  await fsp.mkdir(dir, { recursive: true });
  const sizes = await mapPool(files, 4, async (src, i) => {
    const out = path.join(dir, `frame-${pad4(i)}.${EXT}`);
    await encoder(
      sharp(src).resize(tier.w, tier.h, { fit: FIT, position: 'centre', background: { r: 0, g: 0, b: 0, alpha: 0 } }),
      quality,
    ).toFile(out);
    return (await fsp.stat(out)).size;
  });
  return { dir, sizes, bytes: sizes.reduce((a, b) => a + b, 0) };
}

/** Poster: a REAL JPEG, because <canvas> is not an LCP candidate and the poster
 *  is the element that paints. Quality-search it under the 80 KB cap rather than
 *  shipping whatever q78 happens to produce. */
async function makePoster(srcFile, w, h) {
  // Guard the single most embarrassing failure: a poster that is a black lead-in
  // frame or a blown-out white one. It is the LCP element and the share preview.
  const stats = await sharp(srcFile).stats();
  const luma = stats.channels.slice(0, 3).reduce((a, ch) => a + ch.mean, 0) / 3;
  const flat = stats.channels.slice(0, 3).reduce((a, ch) => a + ch.stdev, 0) / 3;
  const posterWarning = luma < 14 ? `poster frame is nearly black (mean luma ${luma.toFixed(1)}/255)`
    : luma > 242 ? `poster frame is nearly blown out (mean luma ${luma.toFixed(1)}/255)`
      : flat < 8 ? `poster frame is almost featureless (stdev ${flat.toFixed(1)})` : null;

  const jpegPath = path.join(STAGING, 'poster.jpg');
  let chosen = null;
  for (const q of [78, 72, 66, 60, 54, 48, 42]) {
    await sharp(srcFile).resize(w, h, { fit: FIT, position: 'centre' }).jpeg({ quality: q, mozjpeg: true }).toFile(jpegPath);
    const bytes = (await fsp.stat(jpegPath)).size;
    chosen = { q, bytes };
    if (bytes <= BUDGET.posterBytes) break;
  }
  const webpPath = path.join(STAGING, 'poster.webp');
  await sharp(srcFile).resize(w, h, { fit: FIT, position: 'centre' }).webp({ quality: 70, effort: 4 }).toFile(webpPath);
  const ogPath = path.join(STAGING, 'og-1200x630.jpg');
  await sharp(srcFile).resize(1200, 630, { fit: 'cover', position: 'centre' }).jpeg({ quality: 80, mozjpeg: true }).toFile(ogPath);
  return {
    warning: posterWarning,
    meanLuma: Number(luma.toFixed(1)),
    jpeg: { file: 'poster.jpg', bytes: chosen.bytes, quality: chosen.q, width: w, height: h },
    webp: { file: 'poster.webp', bytes: (await fsp.stat(webpPath)).size },
    og: { file: 'og-1200x630.jpg', bytes: (await fsp.stat(ogPath)).size, width: 1200, height: 630 },
  };
}

/* ============================================================ public path == */

function publicHref(absDir) {
  const norm = absDir.split(path.sep).join('/');
  const i = norm.lastIndexOf('/public/');
  if (i !== -1) return norm.slice(i + '/public'.length);
  return '/' + path.relative(CWD, absDir).split(path.sep).join('/');
}

/* ==================================================================== main = */

async function main() {
  await fsp.mkdir(STAGING, { recursive: true });

  const source = MODE === 'from-video' ? await collectFromVideo()
    : MODE === 'from-stills' ? await collectFromStills()
      : await collectFromPair();

  // --stride before dedupe: it is an explicit sampling decision by the operator.
  let files = STRIDE > 1 ? source.files.filter((_, i) => i % STRIDE === 0) : source.files.slice();
  const strideDropped = source.files.length - files.length;
  if (files.length > MAX_FRAMES) {
    const step = Math.ceil(files.length / MAX_FRAMES);
    files = files.filter((_, i) => i % step === 0).slice(0, MAX_FRAMES);
  }

  const dedupe = DEDUPE ? await dedupeFrames(files) : { kept: files, map: files.map((f, i) => ({ source: path.basename(f), frame: i })), dropped: 0 };
  files = dedupe.kept;
  if (!files.length) die(3, 'no frames survived selection');
  if (MODE === 'from-pair' && files.length < 2) {
    die(1, 'from-pair: the before and after images are pixel-identical — there is no transformation to show. Check the inputs.');
  }

  // Dimensions. Never upscale: the ladder width is capped at the SMALLEST source
  // width in the set, because a 640px Facebook JPEG blown up to 1600 is mush.
  const metas = await mapPool(files, 4, (f) => sharp(f).metadata());
  const minSrcW = Math.min(...metas.map((m) => m.width));
  const first = metas[0];
  let aspect = first.width / first.height;
  if (args.aspect) {
    const [aw, ah] = String(args.aspect).split(':').map(Number);
    if (aw > 0 && ah > 0) aspect = aw / ah;
  }
  const capped = { desktop: false, mobile: false };
  const dW = Math.min(W_DESKTOP, minSrcW); capped.desktop = dW < W_DESKTOP;
  const mW = Math.min(W_MOBILE, minSrcW); capped.mobile = mW < W_MOBILE;
  const TIERS = [
    { name: 'desktop', w: evenInt(dW), h: evenInt(dW / aspect), cap: BUDGET.desktopBytes },
    { name: 'mobile', w: evenInt(mW), h: evenInt(mW / aspect), cap: BUDGET.mobileBytes },
  ];

  // Encode plans. Quality drops before frames do: for a scrub, cadence matters
  // more than per-frame fidelity. Only --auto-fit walks past the first plan.
  const q0 = QUALITY;
  const plans = AUTO_FIT
    ? [
      { stride: 1, q: q0 }, { stride: 1, q: Math.max(40, q0 - 10) }, { stride: 1, q: Math.max(40, q0 - 20) },
      { stride: 2, q: q0 }, { stride: 2, q: Math.max(40, q0 - 10) }, { stride: 2, q: Math.max(40, q0 - 20) },
      { stride: 3, q: Math.max(40, q0 - 10) }, { stride: 4, q: Math.max(40, q0 - 10) },
    ]
    : [{ stride: 1, q: q0 }];

  let attempt = null;
  const tried = [];
  for (const plan of plans) {
    const planFiles = plan.stride > 1 ? files.filter((_, i) => i % plan.stride === 0) : files;
    if (MODE === 'from-pair' && planFiles.length < 2) continue;
    const ladders = {};
    for (const tier of TIERS) ladders[tier.name] = await encodeLadder(planFiles, tier, plan.q);
    const over = TIERS.filter((t) => ladders[t.name].bytes > t.cap);
    tried.push({ ...plan, frames: planFiles.length, desktop: ladders.desktop.bytes, mobile: ladders.mobile.bytes, ok: over.length === 0 });
    attempt = { plan, files: planFiles, ladders, over };
    if (!over.length) break;
  }

  const { plan, files: finalFiles, ladders } = attempt;
  const N = finalFiles.length;

  // Decoded-memory arithmetic: W x H x 4 x frames. This is the figure that kills
  // an iOS tab and it is invisible in any network panel.
  const decoded = {};
  for (const t of TIERS) decoded[t.name] = { bytes: t.w * t.h * 4 * N, formula: `${t.w} x ${t.h} x 4 x ${N}` };
  const slidingWindowRequired = decoded.desktop.bytes > BUDGET.decodedWindowThresholdBytes;
  const mobileDecodedOver = decoded.mobile.bytes > BUDGET.decodedMobileBytes;

  // Keyframe subset: the every-Nth frames that must land before the scrub is
  // usable. Find the densest subset (>= 8 frames) that fits in 250 KB.
  let keyframes = null;
  for (let k = Math.max(1, Math.round(N / 16)); k <= Math.max(1, Math.floor(N / BUDGET.keyframeMinCount)); k++) {
    const idx = []; for (let i = 0; i < N; i += k) idx.push(i);
    if (idx.length < Math.min(BUDGET.keyframeMinCount, N)) break;
    const bytes = idx.reduce((a, i) => a + ladders.mobile.sizes[i], 0);
    if (bytes <= BUDGET.keyframeBytes) { keyframes = { stride: k, count: idx.length, indices: idx, mobileBytes: bytes }; break; }
  }
  if (!keyframes) {
    const k = Math.max(1, Math.floor(N / BUDGET.keyframeMinCount));
    const idx = []; for (let i = 0; i < N; i += k) idx.push(i);
    keyframes = { stride: k, count: idx.length, indices: idx, mobileBytes: idx.reduce((a, i) => a + ladders.mobile.sizes[i], 0), overBudget: true };
  }

  const poster = await makePoster(finalFiles[Math.min(POSTER_FRAME, N - 1)], TIERS[0].w, TIERS[0].h);

  /* ------------------------------------------------------- budget verdict -- */
  const breaches = [];
  for (const t of TIERS) {
    const b = ladders[t.name].bytes;
    if (b > t.cap) breaches.push({ what: `${t.name} ladder`, actual: b, cap: t.cap });
  }
  if (poster.jpeg.bytes > BUDGET.posterBytes) breaches.push({ what: 'poster.jpg', actual: poster.jpeg.bytes, cap: BUDGET.posterBytes });
  if (keyframes.overBudget) breaches.push({ what: `keyframe subset (${keyframes.count} mobile frames)`, actual: keyframes.mobileBytes, cap: BUDGET.keyframeBytes });
  if (mobileDecodedOver) breaches.push({ what: 'decoded mobile bitmap', actual: decoded.mobile.bytes, cap: BUDGET.decodedMobileBytes });

  const emittedBytes = ladders.desktop.bytes + ladders.mobile.bytes + poster.jpeg.bytes + poster.webp.bytes + poster.og.bytes;
  const framesPer100vh = N / (SCROLL_VH / 100);

  if (breaches.length) {
    printHeader(source, N, TIERS, capped, dedupe, strideDropped, plan);
    printLadder(TIERS, ladders, decoded, N, slidingWindowRequired);
    console.log('');
    console.log(red(bold('REFUSED — nothing was written.')) + ' The budget exists so a 7-second hero never ships:');
    for (const b of breaches) {
      console.log(red(`  x ${b.what}: ${b.actual.toLocaleString()} B vs cap ${b.cap.toLocaleString()} B ` +
        `(over by ${(b.actual - b.cap).toLocaleString()} B, ${pct(b.actual - b.cap, b.cap)})`));
    }
    console.log('');
    console.log(bold('Remedies, with the numbers:'));
    if (!AUTO_FIT) console.log(`  1. --auto-fit                 search quality then stride automatically (tries q${q0} -> q${Math.max(40, q0 - 20)}, stride 1 -> 4)`);
    for (const t of TIERS) {
      const b = ladders[t.name].bytes;
      if (b <= t.cap) continue;
      const perFrame = b / N;
      const maxFrames = Math.max(1, Math.floor(t.cap / perFrame));
      const strideNeeded = Math.max(2, Math.ceil(N / maxFrames));
      const widthScale = Math.sqrt(t.cap / b);
      console.log(`  - ${t.name}: --stride ${strideNeeded}  -> ~${Math.ceil(N / strideNeeded)} frames, ~${kb(perFrame * Math.ceil(N / strideNeeded))} (cap ${mb(t.cap)})`);
      console.log(`  - ${t.name}: --widths ${evenInt(TIERS[0].w * widthScale)},${evenInt(TIERS[1].w * widthScale)}  -> same frame count at ~${pct(t.cap, b)} of the bytes`);
      console.log(`  - ${t.name}: --quality ${Math.max(40, q0 - 15)}  or --format avif (avif q50 ~= jpeg q75 at about half the bytes, higher decode cost)`);
    }
    if (mobileDecodedOver) {
      const maxN = Math.floor(BUDGET.decodedMobileBytes / (TIERS[1].w * TIERS[1].h * 4));
      console.log(`  - decoded mobile: at ${TIERS[1].w}x${TIERS[1].h} the ceiling is ${maxN} frames (${decoded.mobile.formula} = ${mb(decoded.mobile.bytes)})`);
    }
    if (poster.jpeg.bytes > BUDGET.posterBytes) {
      console.log(`  - poster: pick a less detailed frame with --poster-frame N, or narrow the poster via --widths`);
    }
    console.log(dim(`  - if you have a real reason to exceed a cap, state the new number: --budget-desktop ${ladders.desktop.bytes} --budget-mobile ${ladders.mobile.bytes}`));
    console.log('');
    if (!KEEP) await fsp.rm(STAGING, { recursive: true, force: true });
    else console.log(dim(`staging kept at ${STAGING}`));
    process.exit(2);
  }

  /* ------------------------------------------------------------- promote -- */
  for (const t of TIERS) {
    const dest = path.join(OUT, t.name);
    await fsp.rm(dest, { recursive: true, force: true });
    await fsp.rename(ladders[t.name].dir, dest);
  }
  for (const f of ['poster.jpg', 'poster.webp', 'og-1200x630.jpg']) {
    await fsp.rename(path.join(STAGING, f), path.join(OUT, f));
  }

  const href = publicHref(OUT);
  const manifest = {
    tool: 'premium-web/frames',
    generatedAt: new Date().toISOString(),
    mode: MODE,
    recipeHint: MODE === 'from-pair' ? 'R3 wipe (mode:"wipe")' : MODE === 'from-stills' ? 'R2 sequence / R4 crossfade' : 'R7 sequence from client video',
    source: {
      kind: source.kind, describe: source.describe, bytes: source.sourceBytes,
      compressionBaseline: source.baselineLabel, baselineBytes: source.intermediateBytes,
      frameCountBeforeSelection: source.files.length,
    },
    selection: { stride: STRIDE * plan.stride, maxFrames: MAX_FRAMES, strideDropped, dedupeDropped: dedupe.dropped, map: dedupe.map },
    frameCount: N,
    format: FORMAT,
    quality: plan.q,
    fit: FIT,
    aspect: Number(aspect.toFixed(4)),
    neverUpscaled: { smallestSourceWidth: minSrcW, desktopCapped: capped.desktop, mobileCapped: capped.mobile },
    tiers: TIERS.map((t) => ({
      name: t.name, width: t.w, height: t.h,
      files: `${t.name}/frame-0000.${EXT} … frame-${pad4(N - 1)}.${EXT}`,
      bytes: ladders[t.name].bytes,
      bytesPerFrame: Math.round(ladders[t.name].bytes / N),
      budgetBytes: t.cap,
      largestFrameBytes: Math.max(...ladders[t.name].sizes),
    })),
    poster: { ...poster.jpeg, meanLuma: poster.meanLuma, warning: poster.warning }, posterWebp: poster.webp, og: poster.og,
    keyframes: { ...keyframes, budgetBytes: BUDGET.keyframeBytes, note: 'preload these first; in-betweens snap to the nearest loaded frame until the remainder lands at fetchpriority="low"' },
    decodedMemory: {
      formula: 'width x height x 4 bytes x frames',
      desktop: decoded.desktop, mobile: decoded.mobile,
      thresholdBytes: BUDGET.decodedWindowThresholdBytes,
      slidingWindowRequired,
      note: slidingWindowRequired
        ? 'desktop decoded set exceeds 250 MB — the component MUST run the ImageBitmap sliding window (current +/-12, evict beyond +/-20) and pin the keyframe subset permanently'
        : 'under threshold — the sliding window is optional',
    },
    scroll: {
      scrollVh: SCROLL_VH,
      framesPer100vh: Number(framesPer100vh.toFixed(1)),
      guidance: framesPer100vh < 12 ? 'below 12 frames/100vh will visibly step — lengthen the section or switch to crossfade'
        : framesPer100vh > 45 ? 'above 45 frames/100vh you are paying bytes nobody perceives — raise --stride'
          : 'within the 12-45 frames/100vh working range (the "20-40" figure is an uncited heuristic)',
    },
    totals: {
      emittedBytes,
      sourceBytes: source.sourceBytes,
      baselineBytes: source.intermediateBytes,
      savedBytes: source.intermediateBytes - emittedBytes,
      savedPct: Number((100 * (source.intermediateBytes - emittedBytes) / source.intermediateBytes).toFixed(1)),
    },
    component: {
      count: N,
      width: TIERS[0].w, height: TIERS[0].h,
      poster: `${href}/poster.jpg`,
      src: `(i, tier) => \`${href}/\${tier === 'full' ? 'desktop' : 'mobile'}/frame-\${String(i).padStart(4, '0')}.${EXT}\``,
      restFrame: MODE === 'from-pair' ? 1 : N - 1,
      preloadHead: `<link rel="preload" as="image" href="${href}/poster.jpg" fetchpriority="high">`,
    },
    budgets: BUDGET,
    verdict: 'PASS',
  };
  await fsp.writeFile(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  if (!KEEP) await fsp.rm(STAGING, { recursive: true, force: true });

  if (JSON_ONLY) { console.log(JSON.stringify(manifest, null, 2)); return 0; }

  printHeader(source, N, TIERS, capped, dedupe, strideDropped, plan);
  printLadder(TIERS, ladders, decoded, N, slidingWindowRequired);
  console.log('');
  console.log(`  poster   ${poster.jpeg.file.padEnd(16)} ${String(poster.jpeg.bytes).padStart(8)} B  q${poster.jpeg.quality}  (cap ${BUDGET.posterBytes} B)  ${green('OK')}   <- the LCP element, a real <img>`);
  console.log(`           ${'poster.webp'.padEnd(16)} ${String(poster.webp.bytes).padStart(8)} B`);
  console.log(`  social   ${poster.og.file.padEnd(16)} ${String(poster.og.bytes).padStart(8)} B  1200x630 ${poster.og.bytes > BUDGET.ogBytesSoft ? yellow('(heavy)') : ''}  <- without it every WhatsApp share is blank`);
  if (poster.warning) console.log(yellow(`  ! ${poster.warning} — pick another with --poster-frame N (currently ${POSTER_FRAME})`));
  else if (MODE === 'from-video' && POSTER_FRAME === 0) console.log(dim(`  poster = frame 0; the most informative frame is usually not the first — --poster-frame N`));
  console.log(`  first-paint keyframes: ${keyframes.stride === 1 ? 'every frame' : `every ${keyframes.stride}${keyframes.stride === 2 ? 'nd' : keyframes.stride === 3 ? 'rd' : 'th'} frame`} = ${keyframes.count} frames, ${kb(keyframes.mobileBytes)} mobile (cap ${kb(BUDGET.keyframeBytes)})  ${green('OK')}`);
  console.log('');
  console.log(bold('SAVINGS'));
  console.log(`  ${source.baselineLabel} ${source.intermediateBytes.toLocaleString()} B -> emitted ${emittedBytes.toLocaleString()} B ` +
    `(${pct(emittedBytes, source.intermediateBytes)}, saved ${(source.intermediateBytes - emittedBytes).toLocaleString()} B) ` +
    `for BOTH ladders + poster + social card`);
  console.log(`  desktop ladder alone ${ladders.desktop.bytes.toLocaleString()} B = ${pct(ladders.desktop.bytes, source.intermediateBytes)} of that baseline, ${(ladders.desktop.bytes / N / 1000).toFixed(1)} KB/frame`);
  if (source.containerNote) {
    console.log(dim(`  for reference the ${source.containerNote}: ${source.sourceBytes.toLocaleString()} B`));
  }
  console.log('');
  console.log(bold('SCROLL'));
  console.log(`  ${N} frames over ${SCROLL_VH}vh = ${framesPer100vh.toFixed(1)} frames/100vh — ${manifest.scroll.guidance}`);
  console.log(dim(`  anchors: repo reference 60 frames / 220vh = 27.3 · Apple 147 frames @1158x770, ~42.5 KB avg, ~6.2 MB total`));
  if (N < 12 && MODE !== 'from-pair') console.log(yellow(`  ${N} frames total reads steppy in sequence mode — use crossfade (R4), it hides the gaps between subjects`));
  console.log('');
  console.log(bold('WIRE IT'));
  console.log(`  head:  ${manifest.component.preloadHead}`);
  console.log(`  src:   ${manifest.component.src}`);
  console.log(`  count: ${N}   width: ${TIERS[0].w}   height: ${TIERS[0].h}   restFrame: ${manifest.component.restFrame}` +
    `${slidingWindowRequired ? red('   window: MANDATORY') : ''}`);
  console.log('');
  console.log(green(bold('PASS')) + ` — wrote ${OUT}`);
  console.log(dim(`  manifest: ${path.join(OUT, 'manifest.json')}`));
  console.log(dim('  Now open frames 0, mid and last with Read and confirm they are not black, duplicated or mis-cropped.'));
  console.log('');
  return 0;
}

function printHeader(source, N, TIERS, capped, dedupe, strideDropped, plan) {
  console.log('');
  console.log(bold('premium-web frames') + dim(` — ${MODE} · ${FORMAT} q${plan.q} · fit ${FIT}`));
  console.log(dim(`  source: ${source.describe}`));
  const notes = [];
  if (strideDropped) notes.push(`--stride ${STRIDE} dropped ${strideDropped}`);
  if (plan.stride > 1) notes.push(`auto-fit stride ${plan.stride}`);
  if (dedupe.dropped) notes.push(`${dedupe.dropped} byte-identical frame(s) deduped`);
  if (capped.desktop || capped.mobile) notes.push(`width capped to source (${capped.desktop ? 'desktop' : ''}${capped.desktop && capped.mobile ? '+' : ''}${capped.mobile ? 'mobile' : ''}) — never upscale`);
  console.log(dim(`  ${N} frames emitted${notes.length ? ' · ' + notes.join(' · ') : ''}`));
  console.log(dim('─'.repeat(96)));
}

function printLadder(TIERS, ladders, decoded, N, slidingWindowRequired) {
  console.log(bold('LADDER') + dim('   (bytes on disk, per tier)'));
  for (const t of TIERS) {
    const b = ladders[t.name].bytes;
    const ok = b <= t.cap;
    const flag = t.name === 'desktop' && slidingWindowRequired ? red('  <- SLIDING WINDOW MANDATORY') : '';
    console.log(`  ${(ok ? green('OK  ') : red('OVER'))} ${t.name.padEnd(7)} ${String(N).padStart(3)} frames  ${String(Math.round(b / 1000)).padStart(5)} KB ` +
      `(${(b / N / 1000).toFixed(1)} KB/frame, ${t.w}x${t.h}, cap ${mb(t.cap)})  decoded ${(decoded[t.name].bytes / 1e6).toFixed(0)} MB${flag}`);
  }
  console.log(dim(`  decoded = ${decoded.desktop.formula} (desktop) / ${decoded.mobile.formula} (mobile) — the figure that kills an iOS tab, invisible in any network panel`));
}

main().then((code) => process.exit(code)).catch((e) => {
  console.error(red('frames crashed:'), e);
  process.exit(3);
});

#!/usr/bin/env node
/**
 * premium-web / scripts/preflight.mjs
 * ---------------------------------------------------------------------------
 * Step 2 of the skill: prove the MEDIA TOOLCHAIN works before a single client
 * asset is touched. Fails fast and loudly, prints a one-screen PASS/FAIL table,
 * and writes a machine-readable report to work/preflight.json that later steps
 * (frames.mjs, the build, verify) read instead of re-probing.
 *
 * Run:
 *   node .claude/skills/premium-web/scripts/preflight.mjs
 *   node .claude/skills/premium-web/scripts/preflight.mjs --json
 *   node .claude/skills/premium-web/scripts/preflight.mjs --no-install   # never npm i
 *   node .claude/skills/premium-web/scripts/preflight.mjs --skip-browser
 *
 * ===========================================================================
 * SECURITY RULE — THIS SCRIPT CHECKS TOOLS, NEVER CREDENTIALS.
 * ===========================================================================
 * An earlier draft of this skill enumerated `process.env` looking for API keys
 * (PEXELS_API_KEY, HF_TOKEN, NVIDIA_API_KEY, GEMINI_API_KEY, CLOUDFLARE_*) and
 * fired live requests at third-party endpoints to see which ones happened to
 * be valid. That is credential harvesting. It is removed, permanently, and it
 * must not come back. Concretely, this file does not and must not:
 *   - iterate, dump, log or pattern-match process.env for anything key-shaped;
 *   - test ambient cloud/OAuth credentials (Google, AWS, Cloudflare, gh, HF)
 *     against any endpoint, "just to see" whether a tier is available;
 *   - read ~/.aws, ~/.config/gcloud, ~/.wrangler, ~/.netrc, git remotes,
 *     keychains or any other credential store.
 *
 * The only credential this skill may ever touch is one the END USER explicitly
 * supplies for their own task, at run time, for a named stage — e.g. the user
 * pastes a Pexels key and asks for stock fill. In that case the STAGE script
 * validates THAT ONE KEY at the point of use (`if (userSuppliedKey) { verify }`),
 * uses it, and probes nothing else. Absence of a key is never something to go
 * looking for; it just means that stage takes the no-key path.
 *
 * The one env var read below is PREMIUM_WEB_TOOLS / PREMIUM_WEB_CHROMIUM —
 * filesystem paths the operator sets to redirect this script's own scratch
 * install. Reading a named, documented, non-secret path variable is not
 * credential scanning; enumerating the environment is.
 *
 * ===========================================================================
 * GROUND TRUTH about this container (verified, do not re-litigate at runtime)
 * ===========================================================================
 *   - System /usr/bin/ffmpeg is BROKEN: `libcaca.so.0: cannot open shared
 *     object file`. Expected. Use npm ffmpeg-static via require('ffmpeg-static').
 *   - sharp works (libvips prebuilt), including AVIF. SVG is input-only, no JXL.
 *   - @squoosh/cli is DEAD under Node 22 (installs fine, `--help` prints fine,
 *     then ERR_INVALID_URL in createWasm on any real encode; upstream archived).
 *     This script REFUSES to install it and FAILS if it finds it in the tree.
 *   - Chromium is already installed at
 *     /opt/pw-browsers/chromium-1194/chrome-linux/chrome with playwright 1.62.1.
 *     Launch with { executablePath, args: ['--no-sandbox'] }.
 *     NEVER run `playwright install` — it is unnecessary and downloads ~150MB.
 *
 * Exit codes: 0 = every REQUIRED check passed. 1 = at least one required check
 * failed. 2 = the script itself blew up.
 */

import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CWD = process.cwd();

/* ------------------------------------------------------------------ args -- */

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

const args = parseArgs(process.argv.slice(2));

if (args.help || args.h) {
  console.log(`premium-web preflight — toolchain smoke test (tools only, never credentials)

  --tools-dir <dir>   where to install sharp/ffmpeg-static  (default: <cwd>/work/tools)
  --report <file>     machine-readable report               (default: <cwd>/work/preflight.json)
  --chromium <path>   chromium executable to test           (default: the known /opt path)
  --no-install        fail instead of npm-installing missing tools
  --skip-browser      skip the Playwright/Chromium check
  --fix-gitignore     append 'work/' to .gitignore if missing
  --json              print JSON only
`);
  process.exit(0);
}

const TOOLS_DIR = path.resolve(args['tools-dir'] || process.env.PREMIUM_WEB_TOOLS || path.join(CWD, 'work', 'tools'));
const REPORT = path.resolve(args.report || path.join(CWD, 'work', 'preflight.json'));
const NO_INSTALL = Boolean(args['no-install']);
const SKIP_BROWSER = Boolean(args['skip-browser']);
const JSON_ONLY = Boolean(args.json);

const CHROMIUM_CANDIDATES = [
  args.chromium,
  process.env.PREMIUM_WEB_CHROMIUM,
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/opt/pw-browsers/chromium/chrome-linux/chrome',
  '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
].filter(Boolean);

/* ------------------------------------------------------- module resolution -- */
/* Tools live in work/tools so they never end up in the CLIENT's package.json.
   sharp + ffmpeg-static are build-time only; shipping them as site dependencies
   is a real bug (critique S12). Resolution order: client project -> tools dir ->
   this skill's dir -> the global npm root. */

function globalNodeModules() {
  // /opt/node22/bin/node -> /opt/node22/lib/node_modules
  return path.resolve(path.dirname(process.execPath), '..', 'lib', 'node_modules');
}

const RESOLVE_BASES = [
  path.join(CWD, 'package.json'),
  path.join(TOOLS_DIR, 'package.json'),
  path.join(HERE, 'package.json'),
  path.join(globalNodeModules(), 'package.json'),
];

function resolveFrom(name) {
  for (const base of RESOLVE_BASES) {
    try { return createRequire(base).resolve(name); } catch { /* try next base */ }
  }
  return null;
}

function requireTool(name) {
  for (const base of RESOLVE_BASES) {
    try { return createRequire(base)(name); } catch { /* try next base */ }
  }
  throw new Error(`cannot resolve ${name} from any of:\n  ${RESOLVE_BASES.join('\n  ')}`);
}

function toolVersion(name) {
  const p = resolveFrom(`${name}/package.json`);
  if (!p) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')).version; } catch { return null; }
}

function npmInstall(pkgs) {
  fs.mkdirSync(TOOLS_DIR, { recursive: true });
  const pj = path.join(TOOLS_DIR, 'package.json');
  if (!fs.existsSync(pj)) {
    fs.writeFileSync(pj, JSON.stringify({
      name: 'premium-web-tools',
      private: true,
      version: '0.0.0',
      description: 'Build-time media tools for the premium-web skill. Deliberately OUTSIDE the client package.json.',
    }, null, 2) + '\n');
  }
  const r = spawnSync('npm', ['install', '--no-audit', '--no-fund', '--loglevel=error', ...pkgs], {
    cwd: TOOLS_DIR, encoding: 'utf8', timeout: 300000,
  });
  return { ok: r.status === 0, out: ((r.stdout || '') + (r.stderr || '')).trim().split('\n').slice(-3).join(' ') };
}

/* --------------------------------------------------------------- reporting -- */

const USE_COLOR = !process.env.NO_COLOR && process.stdout.isTTY;
const c = (code, s) => (USE_COLOR ? `[${code}m${s}[0m` : s);
const green = (s) => c(32, s), red = (s) => c(31, s), yellow = (s) => c(33, s), dim = (s) => c(2, s), bold = (s) => c(1, s);

const results = [];
function record(id, label, required, status, detail) {
  results.push({ id, label, required, status, detail: String(detail ?? '') });
  return status;
}

const paintStatus = (s) => ({
  PASS: green('PASS'), FAIL: red('FAIL'), WARN: yellow('WARN'),
  NOTE: dim('NOTE'), SKIP: dim('SKIP'), REFUSED: green('OK  '),
}[s] || s);

/* ------------------------------------------------------------------ checks -- */

async function checkNode() {
  const major = Number(process.versions.node.split('.')[0]);
  return major >= 20
    ? record('node', 'node runtime', true, 'PASS', `v${process.versions.node} (need >=20) · ${process.platform}/${process.arch}`)
    : record('node', 'node runtime', true, 'FAIL', `v${process.versions.node} — sharp prebuilds and this skill need Node >=20`);
}

async function checkNpm() {
  const r = spawnSync('npm', ['--version'], { encoding: 'utf8', timeout: 30000 });
  return r.status === 0
    ? record('npm', 'npm available', true, 'PASS', `v${r.stdout.trim()}`)
    : record('npm', 'npm available', true, 'FAIL', 'npm not on PATH — cannot bootstrap build tools');
}

async function checkSystemFfmpeg() {
  // EXPECTED TO FAIL on this box. We assert the failure so nobody "fixes" a
  // pipeline by reaching for the system binary later.
  const r = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8', timeout: 30000 });
  const blob = ((r.stdout || '') + (r.stderr || '')).trim();
  if (r.error && r.error.code === 'ENOENT') {
    return record('ffmpeg-system', 'system ffmpeg', false, 'NOTE', 'absent (as expected) — ffmpeg-static is the only supported path');
  }
  if (r.status !== 0) {
    const why = /libcaca/.test(blob) ? 'libcaca.so.0 missing (known)' : blob.split('\n')[0].slice(0, 60);
    return record('ffmpeg-system', 'system ffmpeg', false, 'NOTE', `broken as expected — ${why}`);
  }
  return record('ffmpeg-system', 'system ffmpeg', false, 'WARN',
    'system ffmpeg RUNS here — still use ffmpeg-static; scripts must not depend on it');
}

async function checkFfmpegStatic() {
  let bin = null;
  try { bin = requireTool('ffmpeg-static'); } catch { /* install below */ }
  if (!bin) {
    if (NO_INSTALL) return record('ffmpeg-static', 'ffmpeg-static binary', true, 'FAIL', 'missing and --no-install was passed');
    const i = npmInstall(['ffmpeg-static@^5']);
    if (!i.ok) return record('ffmpeg-static', 'ffmpeg-static binary', true, 'FAIL', `npm install failed: ${i.out}`);
    try { bin = requireTool('ffmpeg-static'); } catch (e) { return record('ffmpeg-static', 'ffmpeg-static binary', true, 'FAIL', e.message); }
  }
  if (!bin || !fs.existsSync(bin)) return record('ffmpeg-static', 'ffmpeg-static binary', true, 'FAIL', `resolved to ${bin} which does not exist`);
  try { fs.chmodSync(bin, 0o755); } catch { /* already executable */ }
  const r = spawnSync(bin, ['-hide_banner', '-version'], { encoding: 'utf8', timeout: 60000 });
  if (r.status !== 0) return record('ffmpeg-static', 'ffmpeg-static binary', true, 'FAIL', `executes but exits ${r.status}`);
  const ver = (r.stdout.split('\n')[0] || '').replace('ffmpeg version ', '').split(' ')[0];
  state.ffmpegPath = bin;
  return record('ffmpeg-static', 'ffmpeg-static binary', true, 'PASS', `${ver} · ${bin.replace(os.homedir(), '~')}`);
}

async function loadSharp() {
  try { return requireTool('sharp'); } catch { /* install below */ }
  if (NO_INSTALL) return null;
  const i = npmInstall(['sharp@^0.34']);
  if (!i.ok) return null;
  try { return requireTool('sharp'); } catch { return null; }
}

/** Deterministic test image: a gradient with structured noise, so encoders
 *  actually have to work and a decode comparison is meaningful. */
function syntheticRaw(W, H) {
  const buf = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 3;
      const checker = ((x >> 4) + (y >> 4)) % 2 ? 28 : 0;
      buf[o] = (x * 255 / W) | 0;
      buf[o + 1] = (y * 255 / H) | 0;
      buf[o + 2] = (((x * 7 + y * 13) % 256) * 0.5 + checker) | 0;
    }
  }
  return buf;
}

function meanAbsDiff(a, b) {
  const n = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < n; i++) sum += Math.abs(a[i] - b[i]);
  return sum / n;
}

/** A real round trip: encode from a JPEG source, then DECODE the result back to
 *  raw pixels and compare. An import test proves nothing — libvips can load and
 *  still lack a working encoder for a given codec. */
async function checkSharpRoundTrip(sharp, fmt, encodeOpts, tmpDir) {
  const id = `sharp-${fmt}`;
  const label = `sharp jpeg→${fmt} encode`;
  if (!sharp) return record(id, label, true, 'FAIL', 'sharp unavailable');
  const W = 320, H = 180;
  try {
    const t0 = Date.now();
    const srcRaw = syntheticRaw(W, H);
    const jpeg = await sharp(srcRaw, { raw: { width: W, height: H, channels: 3 } }).jpeg({ quality: 92 }).toBuffer();

    const outFile = path.join(tmpDir, `roundtrip.${fmt}`);
    await sharp(jpeg)[fmt](encodeOpts).toFile(outFile);          // exercise the toFile path the pipeline uses
    const encoded = await fsp.readFile(outFile);

    const meta = await sharp(encoded).metadata();
    // NOTE: libvips reports AVIF as format 'heif' with compression 'av1' — AVIF is
    // an HEIF brand. Asserting format === 'avif' fails on a perfectly good encode.
    const formatOk = fmt === 'avif'
      ? (meta.format === 'avif' || (meta.format === 'heif' && meta.compression === 'av1'))
      : meta.format === fmt;
    if (!formatOk || meta.width !== W || meta.height !== H) {
      return record(id, label, true, 'FAIL',
        `re-read as format=${meta.format}${meta.compression ? `/${meta.compression}` : ''} ${meta.width}x${meta.height}, expected ${fmt} ${W}x${H}`);
    }
    const decoded = await sharp(encoded).removeAlpha().raw().toBuffer();
    if (decoded.length !== W * H * 3) return record(id, label, true, 'FAIL', `decoded ${decoded.length} bytes, expected ${W * H * 3}`);
    const diff = meanAbsDiff(srcRaw, decoded);
    if (!(diff < 24)) return record(id, label, true, 'FAIL', `decoded pixels differ from source by ${diff.toFixed(1)}/255 mean — encoder is producing garbage`);

    const ms = Date.now() - t0;
    return record(id, label, true, 'PASS',
      `jpeg ${jpeg.length}B → ${fmt} ${encoded.length}B (${(100 * encoded.length / jpeg.length).toFixed(0)}%), decode Δ${diff.toFixed(1)}/255, ${ms}ms`);
  } catch (e) {
    return record(id, label, true, 'FAIL', e.message.split('\n')[0]);
  }
}

async function checkSharpLoad(sharp) {
  if (!sharp) {
    return record('sharp', 'sharp installed', true, 'FAIL',
      NO_INSTALL ? 'missing and --no-install was passed' : 'install failed — see npm output above');
  }
  const v = toolVersion('sharp') || 'unknown';
  const libvips = sharp.versions?.vips || '?';
  state.sharpVersion = v;
  return record('sharp', 'sharp installed', true, 'PASS', `v${v} · libvips ${libvips} · SVG input-only, no JXL`);
}

async function checkSquooshRefusal() {
  // Policy check, not a capability check. @squoosh/cli passes every smoke test
  // and then throws ERR_INVALID_URL in createWasm on a real encode under Node 22.
  // If it is in the tree, someone is about to ship a pipeline that dies in prod.
  const found = resolveFrom('@squoosh/cli/package.json') || resolveFrom('@squoosh/lib/package.json');
  if (found) {
    return record('squoosh', '@squoosh/cli refusal', true, 'FAIL',
      `PRESENT at ${found} — remove it; it dies with ERR_INVALID_URL on Node 22. sharp does webp+avif+mozjpeg.`);
  }
  return record('squoosh', '@squoosh/cli refusal', true, 'REFUSED', 'absent, and this skill never installs it (archived, broken on Node 22)');
}

async function checkPlaywrightModule() {
  const p = resolveFrom('playwright/package.json') || resolveFrom('playwright-core/package.json');
  if (!p) return record('playwright', 'playwright module', true, 'FAIL', 'not resolvable — do NOT run `playwright install`; ask the operator');
  const v = toolVersion('playwright') || toolVersion('playwright-core') || 'unknown';
  state.playwrightVersion = v;
  return record('playwright', 'playwright module', true, 'PASS', `v${v} · ${path.dirname(p).replace(os.homedir(), '~')}`);
}

async function checkChromium(sharp, tmpDir) {
  if (SKIP_BROWSER) return record('chromium', 'chromium launch + render', true, 'SKIP', '--skip-browser');
  const exe = CHROMIUM_CANDIDATES.find((p) => { try { return fs.statSync(p).isFile(); } catch { return false; } });
  if (!exe) {
    return record('chromium', 'chromium launch + render', true, 'FAIL',
      `no chromium at ${CHROMIUM_CANDIDATES.join(' | ')} — do NOT run \`playwright install\`, pass --chromium <path>`);
  }
  let pw;
  try { pw = requireTool('playwright'); } catch { try { pw = requireTool('playwright-core'); } catch { pw = null; } }
  if (!pw) return record('chromium', 'chromium launch + render', true, 'FAIL', 'playwright module unavailable');

  let browser = null;
  try {
    const t0 = Date.now();
    browser = await pw.chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
    const page = await browser.newPage({ viewport: { width: 400, height: 200 } });
    await page.setContent('<style>body{margin:0;background:#101418}h1{color:#e8b455;font:700 40px/200px system-ui;text-align:center}</style><h1 id="t">premium-web</h1>');
    const text = await page.evaluate(() => document.getElementById('t').textContent);
    // Prove the compositor path we depend on is actually queryable in this build.
    const supportsSDA = await page.evaluate(() => CSS.supports('animation-timeline', 'view()'));
    const shotPath = path.join(tmpDir, 'chromium-smoke.png');
    await page.screenshot({ path: shotPath });
    const ver = browser.version();
    await browser.close(); browser = null;

    const png = await fsp.readFile(shotPath);
    if (png.length < 500 || png[0] !== 0x89 || png[1] !== 0x50) throw new Error('screenshot is not a valid PNG');
    let dims = '';
    if (sharp) { const m = await sharp(png).metadata(); dims = ` ${m.width}x${m.height}`; }
    if (text !== 'premium-web') throw new Error('DOM evaluate returned unexpected text');

    state.chromiumPath = exe;
    return record('chromium', 'chromium launch + render', true, 'PASS',
      `${ver} · screenshot ${png.length}B${dims} · ${Date.now() - t0}ms · CSS scroll-timeline: ${supportsSDA ? 'yes' : 'no'}`);
  } catch (e) {
    if (browser) { try { await browser.close(); } catch { /* already gone */ } }
    return record('chromium', 'chromium launch + render', true, 'FAIL', e.message.split('\n')[0]);
  }
}

async function checkGitignore() {
  /* ASK GIT, DO NOT GREP ONE FILE.
   *
   * The question is "will work/ be committed", and only git can answer it: the rule
   * may live in the REPO ROOT's .gitignore, in a parent directory's, in
   * .git/info/exclude, or in core.excludesFile — none of which is `<cwd>/.gitignore`.
   * Reading that one path made this check report
   *
   *     WARN  work/ is gitignored   add "work/" to .gitignore ...
   *
   * for a tree where `git check-ignore -v .../work/preflight.json` answered
   * `.gitignore:26:work/` — the rule existed, at the repo root, and the file was
   * already ignored. Acting on that advice writes a SECOND .gitignore inside the
   * skill directory, and --fix-gitignore would have done exactly that unprompted.
   * A check that tells you to fix something already fixed teaches you to skip it. */
  const workDir = path.join(CWD, 'work');
  const probe = path.join(workDir, '.premium-web-ignore-probe');
  const git = spawnSync('git', ['check-ignore', '-q', '--no-index', probe], {
    cwd: CWD, encoding: 'utf8', timeout: 15000,
  });
  // exit 0 = ignored, 1 = not ignored, 128 = not a repo / git unavailable.
  if (git.status === 0) {
    return record('gitignore', 'work/ is gitignored', false, 'PASS', 'git confirms work/ is ignored — raw harvest + PNG intermediates stay out of git');
  }
  const inRepo = git.status === 1;
  if (!inRepo) {
    return record('gitignore', 'work/ is gitignored', false, 'NOTE', 'not a git repository (or git unavailable) — nothing to ignore yet');
  }
  const gi = path.join(CWD, '.gitignore');
  let body = '';
  try { body = fs.readFileSync(gi, 'utf8'); } catch { /* no .gitignore yet */ }
  if (args['fix-gitignore']) {
    fs.appendFileSync(gi, `${body && !body.endsWith('\n') ? '\n' : ''}# premium-web build scratch (raw harvest, PNG intermediates, tools)\nwork/\n`);
    return record('gitignore', 'work/ is gitignored', false, 'PASS', `appended "work/" to ${gi}`);
  }
  return record('gitignore', 'work/ is gitignored', false, 'WARN', 'git says work/ is NOT ignored — add "work/" to .gitignore (200MB+ of intermediates) or pass --fix-gitignore');
}

async function checkRembg() {
  // Informational only. No network, no credentials — just "is the local cutout
  // tool here". Absence downgrades the plan (R1/R2 cutouts), it does not stop it.
  const py = spawnSync('python3', ['-c', 'import importlib.util as u,sys;print(sys.version.split()[0], bool(u.find_spec("rembg")))'], { encoding: 'utf8', timeout: 60000 });
  if (py.status !== 0) return record('rembg', 'python3 + rembg (cutouts)', false, 'NOTE', 'python3 unavailable — R1/R2 cutout recipes need `pip install "rembg[cpu,cli]"`');
  const [ver, has] = py.stdout.trim().split(' ');
  return has === 'True'
    ? record('rembg', 'python3 + rembg (cutouts)', false, 'PASS', `python ${ver}, rembg present — use -m u2netp (Apache-2.0), NEVER bria-rmbg (non-commercial)`)
    : record('rembg', 'python3 + rembg (cutouts)', false, 'NOTE', `python ${ver}, rembg absent — \`pip install "rembg[cpu,cli]"\` when a cutout recipe is selected`);
}

/* -------------------------------------------------------------------- main -- */

const state = { ffmpegPath: null, sharpVersion: null, playwrightVersion: null, chromiumPath: null };

async function main() {
  const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'premium-web-preflight-'));
  try {
    await checkNode();
    await checkNpm();
    await checkSystemFfmpeg();
    await checkFfmpegStatic();

    const sharp = await loadSharp();
    await checkSharpLoad(sharp);
    await checkSharpRoundTrip(sharp, 'webp', { quality: 72, effort: 4 }, tmpDir);
    await checkSharpRoundTrip(sharp, 'avif', { quality: 50, effort: 4 }, tmpDir);

    await checkSquooshRefusal();
    await checkPlaywrightModule();
    await checkChromium(sharp, tmpDir);
    await checkGitignore();
    await checkRembg();
  } finally {
    await fsp.rm(tmpDir, { recursive: true, force: true });
  }

  const requiredFailed = results.filter((r) => r.required && r.status === 'FAIL');
  const warns = results.filter((r) => r.status === 'WARN');
  const ok = requiredFailed.length === 0;

  const report = {
    tool: 'premium-web/preflight',
    generatedAt: new Date().toISOString(),
    verdict: ok ? 'PASS' : 'FAIL',
    note: 'Toolchain only. This script never enumerates or probes credentials; a stage validates a user-supplied key at the point of use.',
    node: process.versions.node,
    platform: `${process.platform}/${process.arch}`,
    toolsDir: TOOLS_DIR,
    ffmpegPath: state.ffmpegPath,
    sharpVersion: state.sharpVersion,
    playwrightVersion: state.playwrightVersion,
    chromiumPath: state.chromiumPath,
    checks: results,
  };
  await fsp.mkdir(path.dirname(REPORT), { recursive: true });
  await fsp.writeFile(REPORT, JSON.stringify(report, null, 2) + '\n');

  if (JSON_ONLY) { console.log(JSON.stringify(report, null, 2)); return ok ? 0 : 1; }

  const W_LABEL = Math.max(...results.map((r) => r.label.length));
  console.log('');
  console.log(bold('premium-web preflight') + dim(' — toolchain only, no credentials are read or probed'));
  console.log(dim(`node v${process.versions.node} · ${process.platform}/${process.arch} · cwd ${CWD}`));
  console.log(dim('─'.repeat(96)));
  results.forEach((r, i) => {
    const num = String(i + 1).padStart(2, ' ');
    const req = r.required ? ' ' : dim('·');
    console.log(` ${num}${req} ${r.label.padEnd(W_LABEL)}  ${paintStatus(r.status)}  ${r.detail}`);
  });
  console.log(dim('─'.repeat(96)));
  const counts = results.reduce((m, r) => (m[r.status] = (m[r.status] || 0) + 1, m), {});
  console.log(`${ok ? green(bold('RESULT: PASS')) : red(bold('RESULT: FAIL'))} — ` +
    Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ') +
    dim(`  (rows marked · are advisory)`));
  if (!ok) {
    console.log(red(`blocked by: ${requiredFailed.map((r) => r.label).join(', ')}`));
    console.log(dim('Do NOT work around these. ffmpeg-static, sharp (webp+avif) and Chromium are load-bearing for steps 7 and 11.'));
  }
  if (warns.length) console.log(yellow(`warnings: ${warns.map((r) => r.label).join(', ')}`));
  console.log(dim(`report: ${REPORT}`));
  console.log(dim(`tools:  ${TOOLS_DIR}  (kept out of the client's package.json on purpose)`));
  console.log('');
  return ok ? 0 : 1;
}

main().then((code) => process.exit(code)).catch((e) => {
  console.error(red('preflight crashed:'), e);
  process.exit(2);
});

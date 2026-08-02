#!/usr/bin/env node
/**
 * distil-transcript.mjs — pretvara sirovi Claude Code transkript u kičmu razgovora.
 *
 * Zašto: transkript ove sesije je 61 MB. ~85% te mase je izlaz alata — sadržaj
 * fajlova, base64 slike, stdout. Kičma (šta je čovjek tražio i šta je agent
 * odgovorio) je red veličine manja i stane u jedan kontekstni prozor.
 *
 *   node distil-transcript.mjs <transkript.jsonl> [--out DIR]
 *
 * Izlazi:
 *   spine.md      — hronološki, čovjek + agent, bez izlaza alata
 *   spine.json    — isto, strukturirano, za graphify
 *   actions.json  — svaki poziv alata sveden na jedan red (alat + meta)
 *   stats.json    — mjere: mase, udjeli, broj poziva po alatu
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';

const args = process.argv.slice(2);
const SRC = args[0];
const OUT = (() => {
  const i = args.indexOf('--out');
  return i >= 0 && args[i + 1] ? args[i + 1] : path.join(path.dirname(SRC), 'distilled');
})();

if (!SRC || !fs.existsSync(SRC)) {
  console.error('upotreba: node distil-transcript.mjs <transkript.jsonl> [--out DIR]');
  process.exit(1);
}
fs.mkdirSync(OUT, { recursive: true });

/* ─────────────────────────────────────────────────────────────────────────
   REDAKCIJA TAJNI — ovo je prvo, prije svega ostalog.

   Transkript sadrži ono što je čovjek zalijepio u chat, a to uključuje
   API ključeve i tokene. Destilat ide na disk, u git i u Obsidian vault —
   svaka tajna koja prođe ovuda je objavljena. Zato se redakcija radi
   OVDJE, u alatu, a ne kao naknadno čišćenje koje se zaboravi.

   Pravilo: bolje redigovati previše nego premalo. Lažno pozitivan gubi
   jedan niz znakova; lažno negativan objavljuje ključ.
   ───────────────────────────────────────────────────────────────────────── */
const SECRET_PATTERNS = [
  [/\bAQ\.[A-Za-z0-9_\-]{20,}/g,            'GOOGLE-OAUTH'],
  [/\bAIza[0-9A-Za-z_\-]{30,}/g,            'GOOGLE-API'],
  [/\bsk-[A-Za-z0-9_\-]{20,}/g,             'OPENAI'],
  [/\bsk-ant-[A-Za-z0-9_\-]{20,}/g,         'ANTHROPIC'],
  [/\bgh[pousr]_[A-Za-z0-9]{20,}/g,         'GITHUB'],
  [/\bnvapi-[A-Za-z0-9_\-]{20,}/g,          'NVIDIA'],
  [/\bxox[baprs]-[A-Za-z0-9\-]{10,}/g,      'SLACK'],
  [/\beyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}/g, 'JWT'],
  [/\bBearer\s+[A-Za-z0-9._\-]{20,}/gi,     'BEARER'],
  [/\b[A-Za-z0-9_\-]{16,}(?=\s*['"]?\s*[,}]?\s*$)/gm, null], // kandidat, vidi ispod
];

let redactions = 0;
function redact(text) {
  let out = text;
  for (const [re, label] of SECRET_PATTERNS) {
    if (!label) continue;                       // generički kandidat se ne primjenjuje naslijepo
    out = out.replace(re, () => { redactions++; return `«REDIGOVANO:${label}»`; });
  }
  return out;
}

/* Blokovi koje NIKAD ne nosimo u kičmu — to je masa, ne značenje. */
const isNoise = (b) =>
  b?.type === 'tool_result' ||
  b?.type === 'image' ||
  b?.type === 'thinking' ||
  b?.type === 'redacted_thinking';

/* Sistemski umeci koje korisnik nije napisao — podsjetnici, hookovi, izlazi komandi. */
const SYSTEM_MARKERS = [
  '<system-reminder>', '<command-name>', '<local-command-stdout>',
  '<task-notification>', '<github-webhook-activity>', 'Caveat: The messages below',
  'This is how Claude Code surfaces messages', '[Request interrupted',
];
const isSystemInjected = (t) => SYSTEM_MARKERS.some((m) => t.includes(m));

const textOf = (content) => {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.filter((b) => b?.type === 'text' && !isNoise(b)).map((b) => b.text || '').join('\n');
};

const spine = [];
const actions = [];
const toolCounts = new Map();
let rawBytes = 0, spineBytes = 0, toolResultBytes = 0, records = 0;

const rl = readline.createInterface({
  input: fs.createReadStream(SRC, { encoding: 'utf8' }),
  crlfDelay: Infinity,
});

for await (const line of rl) {
  if (!line.trim()) continue;
  rawBytes += Buffer.byteLength(line);
  records++;
  let d;
  try { d = JSON.parse(line); } catch { continue; }

  const role = d?.message?.role;
  const content = d?.message?.content;
  const ts = d.timestamp || d.ts || null;

  /* koliko mase otpada na izlaz alata — mjerimo, ne pretpostavljamo */
  if (Array.isArray(content)) {
    for (const b of content) {
      if (b?.type === 'tool_result') {
        toolResultBytes += Buffer.byteLength(
          typeof b.content === 'string' ? b.content : JSON.stringify(b.content ?? ''));
      }
      if (b?.type === 'tool_use') {
        toolCounts.set(b.name, (toolCounts.get(b.name) || 0) + 1);
        actions.push({
          ts, tool: b.name,
          /* samo identifikujući trag, nikad cijeli argument */
          hint: summariseInput(b.name, b.input),
        });
      }
    }
  }

  if (d.type !== 'user' && d.type !== 'assistant') continue;

  const text = redact(textOf(content).trim());
  if (!text) continue;
  if (role === 'user' && isSystemInjected(text)) continue;

  spineBytes += Buffer.byteLength(text);
  spine.push({ ts, role, text });
}

/* Sažetak ulaza alata na jedan čitljiv trag.

   Sirovi tekst Bash komande se NAMJERNO ne uzima. Komande sadrže ono što je
   agent tog trenutka pretraživao — uključujući i prefikse tajni kad se
   provjerava da li je nešto procurilo. Opis komande nosi isto značenje
   bez tog rizika. */
function summariseInput(name, input) {
  if (!input || typeof input !== 'object') return '';
  const pick = (k) => (typeof input[k] === 'string' ? input[k] : '');
  const first = name === 'Bash'
    ? pick('description')
    : pick('file_path') || pick('path') || pick('pattern') ||
      pick('url') || pick('query') || pick('skill') ||
      pick('description') || pick('subject');
  /* redakcija PRIJE rezanja — rezanje na 160 znakova može odsjeći token
     ispod praga uzorka, pa bi neredigovan ostatak prošao dalje */
  return redact(first).slice(0, 160);
}

const stats = {
  izvor: SRC,
  zapisa: records,
  sirovo_bajtova: rawBytes,
  kicma_bajtova: spineBytes,
  izlaz_alata_bajtova: toolResultBytes,
  udio_kicme_pct: +(100 * spineBytes / rawBytes).toFixed(2),
  udio_izlaza_alata_pct: +(100 * toolResultBytes / rawBytes).toFixed(2),
  poruka_u_kicmi: spine.length,
  poziva_alata: actions.length,
  redigovanih_tajni: redactions,
  po_alatu: Object.fromEntries([...toolCounts.entries()].sort((a, b) => b[1] - a[1])),
};

fs.writeFileSync(path.join(OUT, 'spine.json'), JSON.stringify(spine, null, 1));
fs.writeFileSync(path.join(OUT, 'actions.json'), JSON.stringify(actions, null, 1));
fs.writeFileSync(path.join(OUT, 'stats.json'), JSON.stringify(stats, null, 2));

const md = [
  '# Kičma razgovora',
  '',
  `> Destilirano iz \`${path.basename(SRC)}\` — ${fmt(rawBytes)} sirovo → ${fmt(spineBytes)} kičme ` +
  `(**${stats.udio_kicme_pct}%**). Izlaz alata je ${stats.udio_izlaza_alata_pct}% mase i namjerno je izbačen.`,
  '',
  ...spine.map((m) => {
    const who = m.role === 'user' ? '🧑 ČOVJEK' : '🤖 AGENT';
    const when = m.ts ? ` · ${m.ts}` : '';
    return `\n---\n\n### ${who}${when}\n\n${m.text}\n`;
  }),
].join('\n');
fs.writeFileSync(path.join(OUT, 'spine.md'), md);

function fmt(b) {
  return b > 1e6 ? (b / 1e6).toFixed(1) + ' MB' : (b / 1e3).toFixed(0) + ' KB';
}

console.log(`zapisa: ${records}`);
console.log(`sirovo: ${fmt(rawBytes)}  →  kičma: ${fmt(spineBytes)} (${stats.udio_kicme_pct}%)`);
console.log(`izlaz alata: ${fmt(toolResultBytes)} (${stats.udio_izlaza_alata_pct}%)`);
console.log(`poruka: ${spine.length}   poziva alata: ${actions.length}`);
console.log(`izlaz → ${OUT}`);

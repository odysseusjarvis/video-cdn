#!/usr/bin/env node
/**
 * graphify.mjs — od zbirke markdown dokumenata pravi graf znanja i Obsidian vault.
 *
 * Zašto atomske bilješke: Obsidianov graf crta VEZE MEĐU FAJLOVIMA. Ako je svih
 * 15 pravila u jednom fajlu, graf ima jedan čvor i ništa ne pokazuje. Zato se
 * svaki `## ID — naslov` reže u vlastitu bilješku; tek tada graf ima smisao i
 * backlinkovi rade u oba smjera.
 *
 *   node graphify.mjs <ulazni-dir> --vault <izlazni-dir> [--title "Naziv"]
 *
 * Ulaz:  bilo koji .md sa sekcijama oblika `## OZNAKA-01 — naslov`
 * Izlaz: vault/ sa atomskim bilješkama, MOC-om, tagovima i graph.json
 */

import fs from 'fs';
import path from 'path';

const argv = process.argv.slice(2);
const SRC = argv[0];
const flag = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const VAULT = flag('vault', path.join(path.dirname(SRC || '.'), 'obsidian-vault'));
const TITLE = flag('title', 'Baza znanja');

if (!SRC || !fs.existsSync(SRC)) {
  console.error('upotreba: node graphify.mjs <ulazni-dir> --vault <izlazni-dir> [--title "Naziv"]');
  process.exit(1);
}

/* ── mapiranje prefiksa oznake na folder i tag ─────────────────────────────── */
const KINDS = {
  PRAVILO: { dir: 'Pravila',   tag: 'pravilo',  emoji: '📐' },
  GRESKA:  { dir: 'Greske',    tag: 'greska',   emoji: '🐞' },
  MJERA:   { dir: 'Mjerenja',  tag: 'mjera',    emoji: '📊' },
  OTV:     { dir: 'Otvoreno',  tag: 'otvoreno', emoji: '🚧' },
  ODLUKA:  { dir: 'Odluke',    tag: 'odluka',   emoji: '⚖️' },
};
const kindOf = (id) => KINDS[id.split('-')[0]] || { dir: 'Ostalo', tag: 'biljeska', emoji: '📄' };

/* ── skupljanje ────────────────────────────────────────────────────────────── */
const files = fs.readdirSync(SRC).filter((f) => f.endsWith('.md'));
const notes = new Map();   // ID -> {id, title, body, source}
const docs = [];           // dokumenti bez oznaka (npr. 00-NAJVAZNIJE, KORISNIK)

for (const f of files) {
  const raw = fs.readFileSync(path.join(SRC, f), 'utf8');
  const secRe = /^##\s+([A-ZČĆŽŠĐ]+-\d+)\s*[—–-]\s*(.+)$/gm;
  const hits = [...raw.matchAll(secRe)];

  if (!hits.length) { docs.push({ file: f, raw }); continue; }

  hits.forEach((m, i) => {
    const start = m.index + m[0].length;
    const end = i + 1 < hits.length ? hits[i + 1].index : raw.length;
    notes.set(m[1], {
      id: m[1],
      title: m[2].trim(),
      body: raw.slice(start, end).trim(),
      source: f,
    });
  });
}

/* ── veze: [[FAJL#ID]] i [[ID]] se svode na atomski [[ID]] ─────────────────── */
const edges = [];
const linkRe = /\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|[^\]]+)?\]\]/g;

function rewriteLinks(text, fromId) {
  let out = text.replace(linkRe, (whole, a, b) => {
    const target = (b || a).trim();
    if (notes.has(target)) {
      if (fromId) edges.push({ from: fromId, to: target });
      const k = kindOf(target);
      return `[[${target} ${notes.get(target).title}|${k.emoji} ${target}]]`;
    }
    return whole;   // veza na cijeli dokument ostaje kakva jeste
  });

  /* Gole oznake u tekstu su takođe veze. Čovjek koji piše "vidi GRESKA-04"
     misli na vezu; graf to ne smije propustiti samo zato što nema uglaste
     zagrade. Preskačemo pojavu u kodnim blokovima i vlastitu oznaku. */
  out = out.replace(/(^|[^\[\w`-])([A-ZČĆŽŠĐ]+-\d+)(?![\w-])/g, (whole, pre, id) => {
    if (!notes.has(id) || id === fromId) return whole;
    if (fromId) edges.push({ from: fromId, to: id });
    const k = kindOf(id);
    return `${pre}[[${id} ${notes.get(id).title}|${k.emoji} ${id}]]`;
  });
  return out;
}

/* ── pisanje vaulta ───────────────────────────────────────────────────────── */
fs.rmSync(VAULT, { recursive: true, force: true });
fs.mkdirSync(VAULT, { recursive: true });

const noteFile = (n) => `${n.id} ${n.title}`.replace(/[\\/:*?"<>|]/g, '-').slice(0, 110);

for (const n of notes.values()) {
  const k = kindOf(n.id);
  const dir = path.join(VAULT, k.dir);
  fs.mkdirSync(dir, { recursive: true });
  const body = rewriteLinks(n.body, n.id);
  const md = [
    '---',
    `tags: [${k.tag}]`,
    `oznaka: ${n.id}`,
    `izvor: "${n.source}"`,
    '---',
    '',
    `# ${k.emoji} ${n.id} — ${n.title}`,
    '',
    body,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(dir, noteFile(n) + '.md'), md);
}

/* dokumenti bez oznaka idu cijeli, ali im se veze prepisuju */
for (const d of docs) {
  const name = d.file.replace(/\.md$/, '');
  fs.writeFileSync(path.join(VAULT, name + '.md'), rewriteLinks(d.raw, null));
}

/* ── backlinkovi: dopiši "Vezano" u svaku bilješku na koju neko pokazuje ──── */
const incoming = new Map();
for (const e of edges) {
  if (!incoming.has(e.to)) incoming.set(e.to, new Set());
  incoming.get(e.to).add(e.from);
}
for (const [id, froms] of incoming) {
  const n = notes.get(id); if (!n) continue;
  const k = kindOf(id);
  const p = path.join(VAULT, k.dir, noteFile(n) + '.md');
  const links = [...froms].sort().map((f) => {
    const fn = notes.get(f); const fk = kindOf(f);
    return `- [[${f} ${fn.title}|${fk.emoji} ${f} — ${fn.title}]]`;
  }).join('\n');
  fs.appendFileSync(p, `\n---\n\n## Vezano\n\n${links}\n`);
}

/* ── MOC: ulazna tačka vaulta ─────────────────────────────────────────────── */
const byKind = new Map();
for (const n of notes.values()) {
  const k = kindOf(n.id).dir;
  if (!byKind.has(k)) byKind.set(k, []);
  byKind.get(k).push(n);
}
const moc = [
  '---', 'tags: [moc]', '---', '',
  `# 00 START HERE — ${TITLE}`, '',
  '> Ovo je ulaz. Otvori **Graph view** (Ctrl/Cmd+G) da vidiš kako je sve povezano.',
  '',
  '## Čitaj prvo', '',
  ...docs.map((d) => `- [[${d.file.replace(/\.md$/, '')}]]`),
  '',
  ...[...byKind.entries()].sort().flatMap(([dir, list]) => [
    `## ${dir} (${list.length})`, '',
    ...list.sort((a, b) => a.id.localeCompare(b.id)).map((n) => {
      const k = kindOf(n.id);
      return `- [[${n.id} ${n.title}|${k.emoji} ${n.id} — ${n.title}]]`;
    }),
    '',
  ]),
].join('\n');
fs.writeFileSync(path.join(VAULT, '00 START HERE.md'), moc);

/* ── Obsidian konfiguracija: vault se otvara upotrebljiv, ne prazan ───────── */
const cfg = path.join(VAULT, '.obsidian');
fs.mkdirSync(cfg, { recursive: true });
fs.writeFileSync(path.join(cfg, 'app.json'), JSON.stringify({
  attachmentFolderPath: 'Prilozi', alwaysUpdateLinks: true, newLinkFormat: 'shortest',
  useMarkdownLinks: false, showLineNumber: true,
}, null, 2));
fs.writeFileSync(path.join(cfg, 'appearance.json'), JSON.stringify({ theme: 'obsidian' }, null, 2));
fs.writeFileSync(path.join(cfg, 'core-plugins.json'), JSON.stringify([
  'file-explorer', 'global-search', 'switcher', 'graph', 'backlink', 'outgoing-link',
  'tag-pane', 'page-preview', 'templates', 'outline', 'word-count',
], null, 2));
fs.writeFileSync(path.join(cfg, 'graph.json'), JSON.stringify({
  collapse_filter: false, search: '', showTags: true, showAttachments: false,
  hideUnresolved: true, showOrphans: true,
  collapse_color_groups: false,
  colorGroups: [
    { query: 'tag:#pravilo',  color: { a: 1, rgb: 5431378  } },
    { query: 'tag:#greska',   color: { a: 1, rgb: 14701138 } },
    { query: 'tag:#mjera',    color: { a: 1, rgb: 5419488  } },
    { query: 'tag:#otvoreno', color: { a: 1, rgb: 14200723 } },
    { query: 'tag:#moc',      color: { a: 1, rgb: 16777215 } },
  ],
  collapse_display: false, showArrow: true, textFadeMultiplier: 0,
  nodeSizeMultiplier: 1.4, lineSizeMultiplier: 1,
  collapse_forces: false, centerStrength: 0.5, repelStrength: 12,
  linkStrength: 1, linkDistance: 220, scale: 1,
}, null, 2));

/* ── graf kao podatak ─────────────────────────────────────────────────────── */
const graph = {
  naslov: TITLE,
  cvorova: notes.size,
  veza: edges.length,
  dokumenata: docs.length,
  cvorovi: [...notes.values()].map((n) => ({
    id: n.id, naslov: n.title, vrsta: kindOf(n.id).tag, izvor: n.source,
    ulaznih: incoming.get(n.id)?.size || 0,
    izlaznih: edges.filter((e) => e.from === n.id).length,
  })),
  veze: edges,
};
fs.writeFileSync(path.join(VAULT, 'graph.json'), JSON.stringify(graph, null, 1));

/* siročići — čvorovi bez ijedne veze su znak da znanje nije povezano */
const orphans = graph.cvorovi.filter((n) => !n.ulaznih && !n.izlaznih).map((n) => n.id);

console.log(`čvorova: ${notes.size}   veza: ${edges.length}   dokumenata: ${docs.length}`);
console.log(`po vrsti: ${[...byKind.entries()].map(([d, l]) => `${d}=${l.length}`).join(' · ')}`);
if (orphans.length) console.log(`⚠ bez ijedne veze (${orphans.length}): ${orphans.join(', ')}`);
else console.log('sve bilješke su povezane');
console.log(`vault → ${VAULT}`);

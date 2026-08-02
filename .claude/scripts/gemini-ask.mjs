#!/usr/bin/env node
/**
 * gemini-ask.mjs — drive a long-context Gemini conversation from the CLI.
 *
 * Why this exists: Gemini's 1M-token window can hold an entire working session
 * that would never fit in a Claude context, which makes it useful as an outside
 * reviewer — it can read everything that happened and argue about it.
 *
 * CREDENTIALS: the key is read from GEMINI_API_KEY in the environment and is
 * never written anywhere. This file contains no key, the session file contains
 * no key, and nothing here scans the environment for other credentials.
 *
 *   export GEMINI_API_KEY='...'
 *   node gemini-ask.mjs --context bundle.md --session s.json "your question"
 *   node gemini-ask.mjs --session s.json "follow-up"          # context persists
 *   cat prompt.txt | node gemini-ask.mjs --session s.json -
 *
 * Flags:
 *   --context <file>   attach a file as the first user turn (once per session)
 *   --session <file>   conversation history; created if absent, appended after
 *   --model <name>     default gemini-3.1-pro-preview
 *   --max <n>          max output tokens, default 32768
 *   --temp <n>         temperature, default 0.7
 *   --json             print the raw response envelope instead of just the text
 */

import fs from 'fs';

const KEY = process.env.GEMINI_API_KEY;
if (!KEY) {
  console.error('gemini-ask: GEMINI_API_KEY is not set.\n' +
    "  export GEMINI_API_KEY='...'   (it is never written to disk by this script)");
  process.exit(2);
}

const argv = process.argv.slice(2);
const flag = (name, def) => {
  const i = argv.indexOf('--' + name);
  if (i === -1) return def;
  const v = argv[i + 1];
  argv.splice(i, 2);
  return v;
};
const has = (name) => {
  const i = argv.indexOf('--' + name);
  if (i === -1) return false;
  argv.splice(i, 1);
  return true;
};

const contextFile = flag('context', null);
const sessionFile = flag('session', null);
const model = flag('model', 'gemini-3.1-pro-preview');
const maxTokens = parseInt(flag('max', '32768'), 10);
const temperature = parseFloat(flag('temp', '0.7'));
const rawJson = has('json');

let prompt = argv.join(' ').trim();
if (prompt === '-' || !prompt) {
  prompt = fs.readFileSync(0, 'utf8').trim();
}
if (!prompt) {
  console.error('gemini-ask: no prompt given (pass as args, or "-" to read stdin)');
  process.exit(2);
}

// ---- conversation state (no credentials ever stored here) ----
let contents = [];
if (sessionFile && fs.existsSync(sessionFile)) {
  contents = JSON.parse(fs.readFileSync(sessionFile, 'utf8')).contents || [];
}

const parts = [];
if (contextFile) {
  if (contents.length) {
    console.error('gemini-ask: --context ignored, this session already has history');
  } else {
    const ctx = fs.readFileSync(contextFile, 'utf8');
    parts.push({ text: ctx });
    console.error(`gemini-ask: attached ${contextFile} (${(ctx.length / 1024).toFixed(0)}KB, ~${Math.round(ctx.length / 3.5 / 1000)}k tok)`);
  }
}
parts.push({ text: prompt });
contents.push({ role: 'user', parts });

// ---- call ----
const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(KEY)}`;

let res, body;
for (let attempt = 1; attempt <= 4; attempt++) {
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents, generationConfig: { maxOutputTokens: maxTokens, temperature } }),
    });
    body = await res.json();
    if (res.ok) break;
    // 429/500/503 are worth retrying; 400/401/403 are not
    if (![429, 500, 502, 503, 504].includes(res.status)) break;
    const wait = 2000 * 2 ** (attempt - 1);
    console.error(`gemini-ask: HTTP ${res.status}, retry ${attempt}/4 in ${wait / 1000}s`);
    await new Promise(r => setTimeout(r, wait));
  } catch (e) {
    if (attempt === 4) { console.error('gemini-ask: network failure —', e.message); process.exit(1); }
    await new Promise(r => setTimeout(r, 2000 * 2 ** (attempt - 1)));
  }
}

if (!res.ok) {
  console.error(`gemini-ask: HTTP ${res.status}`);
  console.error(JSON.stringify(body?.error || body, null, 2).slice(0, 1200));
  process.exit(1);
}

if (rawJson) { console.log(JSON.stringify(body, null, 2)); process.exit(0); }

const cand = body.candidates?.[0];
const text = (cand?.content?.parts || []).map(p => p.text || '').join('').trim();

if (!text) {
  console.error('gemini-ask: empty reply. finishReason=' + cand?.finishReason);
  console.error(JSON.stringify(body.usageMetadata || {}, null, 2));
  if (cand?.finishReason === 'MAX_TOKENS') {
    console.error('  the model spent its budget on reasoning — raise --max or narrow the question');
  }
  process.exit(1);
}

// persist AFTER a successful reply, so a failed call does not corrupt the session
if (sessionFile) {
  contents.push({ role: 'model', parts: [{ text }] });
  fs.writeFileSync(sessionFile, JSON.stringify({ model, contents }, null, 1));
}

const u = body.usageMetadata || {};
console.error(`gemini-ask: ${model} · in ${u.promptTokenCount ?? '?'} · think ${u.thoughtsTokenCount ?? 0} · out ${u.candidatesTokenCount ?? '?'} · ${cand?.finishReason}`);
console.log(text);

// Pre-generates MP3 audio files for every unique Japanese phrase in the
// flashcard vocab pool. Uses the Google Translate TTS endpoint via Node
// (not browser — no CORS/cross-origin restrictions at curl level).
//
// Output:
//   public/audio/{sha1}.mp3        — one file per unique phrase
//   public/audio/manifest.json     — { [text]: "sha1.mp3" }
//
// Idempotent: skips files that already exist. Safe to re-run.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const HTML_PATH = 'public/index.html';
const OUT_DIR = 'public/audio';
const MANIFEST_PATH = path.join(OUT_DIR, 'manifest.json');
const DELAY_MS = 120;  // polite delay between requests to avoid rate-limiting

// ─── Extract all Japanese vocab texts from public/index.html ──────────
const html = fs.readFileSync(HTML_PATH, 'utf8');

// 1. CHAPTER_DATA JSON (main vocab pool)
const chapterDataMatch = html.match(/const CHAPTER_DATA = (\{.*?\});/);
if (!chapterDataMatch) {
  console.error('Could not find CHAPTER_DATA in index.html');
  process.exit(1);
}
const chapterData = JSON.parse(chapterDataMatch[1]);

const texts = new Set();
for (const ch of Object.values(chapterData)) {
  if (!ch.vocab) continue;
  for (const v of ch.vocab) {
    if (v.japanese) {
      // Strip parenthetical warnings, (particle), etc.
      const clean = v.japanese.replace(/⚠️/g, '').replace(/[（()].*?[）)]/g, '').trim();
      if (clean) texts.add(clean);
    }
  }
}

// 2. Atlas vocab boxes — extract .oe-loc-jp text content
const atlasItemRe = /<div class="oe-loc-item[^"]*">.*?<div class="oe-loc-jp">([^<]+)<\/div>/gs;
let atlasMatch;
while ((atlasMatch = atlasItemRe.exec(html)) !== null) {
  const clean = atlasMatch[1].replace(/⚠️/g, '').replace(/[（()].*?[）)]/g, '').trim();
  if (clean) texts.add(clean);
}

console.log('Unique Japanese texts to generate:', texts.size);

// ─── Set up output ────────────────────────────────────────────────────
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

let manifest = {};
if (fs.existsSync(MANIFEST_PATH)) {
  try { manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')); }
  catch (_) { manifest = {}; }
}

function hashText(t) {
  return crypto.createHash('sha1').update(t).digest('hex').slice(0, 16);
}

function ttsUrl(t) {
  return 'https://translate.google.com/translate_tts?ie=UTF-8&tl=ja&client=tw-ob&q=' +
         encodeURIComponent(t);
}

async function fetchWithTimeout(url, ms = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'audio/mpeg,audio/*;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
        'Referer': 'https://translate.google.com/',
      },
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const buf = await res.arrayBuffer();
    return Buffer.from(buf);
  } finally {
    clearTimeout(timer);
  }
}

// ─── Generate ─────────────────────────────────────────────────────────
const list = Array.from(texts).sort();
let generated = 0, skipped = 0, failed = 0, failedList = [];

for (let i = 0; i < list.length; i++) {
  const text = list[i];
  const hash = hashText(text);
  const filename = hash + '.mp3';
  const filepath = path.join(OUT_DIR, filename);

  // Skip if file already exists and manifest is current
  if (fs.existsSync(filepath) && manifest[text] === filename) {
    skipped++;
    continue;
  }

  const url = ttsUrl(text);
  try {
    const buf = await fetchWithTimeout(url);
    if (buf.length < 500) throw new Error('suspiciously small: ' + buf.length + ' bytes');
    if (buf[0] !== 0xff || (buf[1] & 0xe0) !== 0xe0) {
      // Not an MP3 (no ADTS sync word)
      // Some Google responses start with ID3 tag — check for that
      if (buf.toString('ascii', 0, 3) !== 'ID3') {
        throw new Error('not an MP3 (first bytes: ' + buf.slice(0, 4).toString('hex') + ')');
      }
    }
    fs.writeFileSync(filepath, buf);
    manifest[text] = filename;
    generated++;
    process.stdout.write(`\r[${i + 1}/${list.length}] ${generated} new, ${skipped} cached, ${failed} failed  (${text.slice(0, 20)}${text.length > 20 ? '…' : ''})${' '.repeat(20)}`);
  } catch (err) {
    failed++;
    failedList.push({ text, error: err.message });
    process.stdout.write(`\r[${i + 1}/${list.length}] ${generated} new, ${skipped} cached, ${failed} failed  ${err.message.slice(0, 40)}${' '.repeat(20)}`);
  }

  // Polite delay
  if (i < list.length - 1) await new Promise(r => setTimeout(r, DELAY_MS));

  // Periodically save manifest so partial runs are recoverable
  if (i % 25 === 0) {
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  }
}

// Final manifest save
fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

console.log('\n\n=== AUDIO PACK GENERATION COMPLETE ===');
console.log('Total texts:', list.length);
console.log('Generated:  ', generated);
console.log('Cached:     ', skipped);
console.log('Failed:     ', failed);
console.log('Manifest:   ', MANIFEST_PATH);
console.log('Audio dir:  ', OUT_DIR);

if (failedList.length > 0) {
  console.log('\nFailed items (first 10):');
  for (const f of failedList.slice(0, 10)) {
    console.log('  -', f.text, '→', f.error);
  }
}

// Compute total size
let totalSize = 0;
for (const fn of fs.readdirSync(OUT_DIR)) {
  if (fn.endsWith('.mp3')) {
    totalSize += fs.statSync(path.join(OUT_DIR, fn)).size;
  }
}
console.log('\nTotal audio pack size:', (totalSize / 1024 / 1024).toFixed(2), 'MB');

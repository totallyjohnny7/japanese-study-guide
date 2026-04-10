// Extract every kanji that appears in CHAPTER_DATA in public/index.html
// along with the most common reading observed for it (from the
// `reading` field of the same vocab entry, when present).
//
// Output: JSON-like report sorted by frequency.

import fs from 'node:fs';

const html = fs.readFileSync('public/index.html', 'utf8');
const m = html.match(/const CHAPTER_DATA = (\{[\s\S]*?\});/);
if (!m) { console.error('CHAPTER_DATA not found'); process.exit(1); }
const data = JSON.parse(m[1]);

// CJK Unified Ideographs range — covers all Nakama 1 kanji
const KANJI_RE = /[\u4e00-\u9fff]/g;

const kanjiCount = new Map();          // kanji → frequency
const kanjiContext = new Map();        // kanji → Set of (japanese, reading) pairs

for (const [chapKey, ch] of Object.entries(data)) {
  if (!ch.vocab) continue;
  for (const v of ch.vocab) {
    const jp = v.japanese || '';
    const en = v.english || '';
    const rd = v.reading || '';
    const matches = jp.match(KANJI_RE);
    if (!matches) continue;
    for (const k of matches) {
      kanjiCount.set(k, (kanjiCount.get(k) || 0) + 1);
      if (!kanjiContext.has(k)) kanjiContext.set(k, new Set());
      kanjiContext.get(k).add(`${jp} (${rd}) — ${en}`);
    }
  }
}

const sorted = [...kanjiCount.entries()].sort((a, b) => b[1] - a[1]);

console.log(`Unique kanji in CHAPTER_DATA: ${sorted.length}`);
console.log(`Total kanji occurrences: ${[...kanjiCount.values()].reduce((a, b) => a + b, 0)}`);
console.log('\n─── KANJI BY FREQUENCY ───');
for (const [k, n] of sorted) {
  const examples = [...kanjiContext.get(k)].slice(0, 2).join(' / ');
  console.log(`${k}  (×${n})  ${examples}`);
}

// Also dump the raw set for grep
console.log('\n─── ALL KANJI (one line) ───');
console.log(sorted.map(([k]) => k).join(''));

// patch-add-missing-vaex.mjs
// NUMBERS and PREFIXES cards never had a va-ex block. This script inserts
// one for each, right before the closing </div></div> of the card body.

import fs from 'node:fs';
import path from 'node:path';

const FILE = path.join('public', 'index.html');
let html = fs.readFileSync(FILE, 'utf8');
const before = html.length;
const MARKER = 'VA-EX-ENRICHED-V1';

function row(label, ja, en) {
  return `<div class="va-row"><b>${label}</b><span class="oe-ja">${ja}</span><span class="oe-en">${en}</span></div>`;
}

function build(rows) {
  return `<div class="va-ex" data-enriched="${MARKER}">${rows.join('')}</div>\n`;
}

const NUMBERS_VAEX = build([
  row('SINO 1–5', 'いち, に, さん, し/よん, ご', '1, 2, 3, 4, 5'),
  row('SINO 6–10', 'ろく, しち/なな, はち, きゅう/く, じゅう', '6, 7, 8, 9, 10'),
  row('BIG NUMBERS', 'ひゃく (100), せん (1,000), まん (10,000)', '—'),
  row('NATIVE 1–5', 'ひとつ, ふたつ, みっつ, よっつ, いつつ', 'generic one-item counter'),
  row('NATIVE 6–10', 'むっつ, ななつ, やっつ, ここのつ, とお', '—'),
  row('EX: GENERIC', 'りんごを ふたつ ください。', 'Please give me two apples.'),
]);

const PREFIXES_VAEX = build([
  row('お～ POLITE', 'おなまえは なんですか。', 'What is your name?'),
  row('ご～ POLITE', 'ごりょうしんは おげんきですか。', 'Are your parents well?'),
  row('～さん DEFAULT', 'スミスさんは アメリカじんです。', 'Smith is American.'),
  row('～せんせい', 'たなかせんせいは にほんごの せんせいです。', 'Tanaka-sensei is a Japanese teacher.'),
  row('～ご LANGUAGE', 'にほんごと えいごを はなします。', 'I speak Japanese and English.'),
  row('～じん NATIONALITY', 'ブラウンさんは アメリカじんです。', 'Brown-san is American.'),
  row('～ねん YEAR', 'いちねんせいは じゅぎょうが たくさん あります。', 'First-years have a lot of classes.'),
  row('～や STORE', 'ほんやで ほんを かいました。', 'I bought a book at the bookstore.'),
  row('こん～ THIS', 'こんしゅうは いそがしいです。', 'This week is busy.'),
  row('まい～ EVERY', 'まいにち べんきょうします。', 'I study every day.'),
]);

// ── NUMBERS card: insert before "</div></div>" of NUMBERS (NOT COUNTERS!)
const numIdx = html.indexOf('すうし — NUMBERS');
if (numIdx !== -1) {
  const numClosing = html.indexOf('</div></div>', numIdx);
  // Scope the "already enriched?" check to THIS card only
  const thisCard = html.slice(numIdx, numClosing);
  if (!thisCard.includes(MARKER)) {
    html = html.slice(0, numClosing) + NUMBERS_VAEX + html.slice(numClosing);
    console.log('✓ NUMBERS card — inserted va-ex');
  } else {
    console.log('⊘ NUMBERS card — already enriched');
  }
} else {
  console.log('✗ NUMBERS card — not found');
}

// ── PREFIXES card: insert before "</div></div>" following its oe-warn
const prefIdx = html.indexOf('せっとうじ・じょすうじ');
if (prefIdx !== -1 && !html.slice(prefIdx, prefIdx + 3000).includes(MARKER)) {
  const closing = html.indexOf('</div></div>', prefIdx);
  html = html.slice(0, closing) + PREFIXES_VAEX + html.slice(closing);
  console.log('✓ PREFIXES card — inserted va-ex');
} else {
  console.log('⊘ PREFIXES card — already enriched or not found');
}

fs.writeFileSync(FILE, html);
console.log(`  Size: ${before} → ${html.length} bytes (+${html.length - before})`);

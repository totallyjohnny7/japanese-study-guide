// Phase 7 verification: extracts BANKS / SEEDS / generator / validator
// from public/reading.html and runs validation outside the browser.
// Reports per-variant pass/fail, total pass rate, uniqueness, and a
// preview of every generated passage.

import fs from 'node:fs';

const html = fs.readFileSync('public/reading.html', 'utf8');

// Find the main <script> block with our engine code (the one that
// declares BANKS). There are smaller inline scripts but only one has BANKS.
const scriptRe = /<script>([\s\S]*?)<\/script>/g;
let bodyJs = null;
let m;
while ((m = scriptRe.exec(html)) !== null) {
  if (m[1].includes('const BANKS') && m[1].includes('const SEEDS')) {
    bodyJs = m[1];
    break;
  }
}
if (!bodyJs) { console.error('FATAL: could not find engine <script> block'); process.exit(1); }

// Strip the bottom "BOOT + TEST PANEL" section — that's the part that
// touches the DOM (renderLanding, test-panel update). We only want the
// data structures and validation results.
const bootStart = bodyJs.indexOf('// ─── BOOT + TEST PANEL');
const enginePart = bootStart >= 0 ? bodyJs.slice(0, bootStart) : bodyJs;

const harness = `
  // Minimal stubs — these are referenced by the audio playback section
  // (which we keep, since it doesn't auto-run).
  const document = { getElementById: () => null, createElement: () => null, addEventListener: () => {} };
  const window = {
    AudioContext: null, webkitAudioContext: null, scrollTo: () => {},
    __rd: { live: [], audioCtx: null, bufferCache: new Map(), inflight: new Map(), manifest: null }
  };
  const fetch = async () => ({ ok: false });
  const alert = () => {};
  const confirm = () => true;
  const setTimeout = (fn) => fn;

  // ── Engine body (without DOM boot) ─────────────────────────────────
  ${enginePart}

  // ALL_VARIANTS and VALIDATION are already declared in the engine
  return {
    BANKS, SEEDS, ALL_VARIANTS, VALIDATION,
    stripHtml, generateVariant, validateVariant
  };
`;

let snapshot;
try {
  snapshot = (new Function(harness))();
} catch (err) {
  console.error('FATAL: engine body threw during eval:');
  console.error(err);
  process.exit(1);
}

const { BANKS, SEEDS, ALL_VARIANTS, VALIDATION, stripHtml } = snapshot;

// ─── REPORT ───────────────────────────────────────────────────────────
console.log('═══ READING.HTML VERIFICATION ═══');
console.log(`Banks defined: ${Object.keys(BANKS).length}`);
console.log(`Seed templates: ${SEEDS.length}`);
console.log(`Generated variants: ${ALL_VARIANTS.length}`);
console.log('');

// Per-category counts
const byCat = { A: 0, B: 0, C: 0 };
for (const v of ALL_VARIANTS) byCat[v.category]++;
console.log(`Variants by category: A=${byCat.A}, B=${byCat.B}, C=${byCat.C}`);

// Question count
let totalQs = 0, tfQs = 0, saQs = 0, stQs = 0;
for (const v of ALL_VARIANTS) {
  for (const q of v.questions) {
    totalQs++;
    if (q.type === 'tf') tfQs++;
    else if (q.type === 'sa') saQs++;
    else if (q.type === 'st') stQs++;
  }
}
console.log(`Total questions: ${totalQs}  (T/F: ${tfQs}, SA: ${saQs}, ST: ${stQs})`);
console.log('');

console.log('─── SCHEMA VALIDATION ───');
console.log(`Pass: ${VALIDATION.pass} / ${VALIDATION.total}   Fail: ${VALIDATION.fail}`);
if (VALIDATION.failures.length > 0) {
  console.log('\nFAILURES:');
  for (const f of VALIDATION.failures) {
    console.log(`  ✕ ${f.id}`);
    for (const e of f.errors) console.log(`     - ${e}`);
  }
}

console.log('');
console.log('─── KANJI USED ───');
const KANJI_RE = /[\u4e00-\u9fff]/g;
const allKanji = new Set();
for (const v of ALL_VARIANTS) {
  const matches = v.passage.match(KANJI_RE) || [];
  for (const k of matches) allKanji.add(k);
}
console.log(`Unique kanji across all 24 variants: ${allKanji.size}`);
console.log(`Kanji set: ${[...allKanji].sort().join('')}`);

// Check that every kanji we use is in the site's 60-kanji set
const SITE_KANJI = new Set('日曜週学今先校生月大山田水下中小何川木火土金上私末休漢字地毎手年明昨来人高長富士登口舎村花泳道台色見本野国身説立鉄語時夏');
const offSiteKanji = [...allKanji].filter(k => !SITE_KANJI.has(k));
if (offSiteKanji.length === 0) {
  console.log('✓ All kanji are in the site study guide (kanji.html) set');
} else {
  console.log(`✕ ${offSiteKanji.length} kanji NOT in site set: ${offSiteKanji.join('')}`);
}

console.log('');
console.log('─── VARIANT PREVIEWS ───');
for (const v of ALL_VARIANTS) {
  const plain = stripHtml(v.passage);
  console.log(`${v.id} (${v.category}) [${plain.length}c]: ${plain.slice(0, 70)}...`);
}

console.log('');
console.log('─── FINAL ───');
const pass = VALIDATION.pass === VALIDATION.total && offSiteKanji.length === 0;
console.log(pass ? '✓ READY TO DEPLOY' : '✕ FAILURES PRESENT');
process.exit(pass ? 0 : 1);

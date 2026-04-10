// Phase 2: IME test suite — validates romaji→kana conversion against the
// engine in patch-ime.mjs. Runs as a standalone Node script.
//
// Usage: node _work/test-ime.mjs
// Exit code: 0 if all pass, 1 if any fail.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IME_PATH = path.join(__dirname, '..', 'patch-ime.mjs');
const src = fs.readFileSync(IME_PATH, 'utf8');

// Extract the ROMAJI_MAP literal from patch-ime.mjs by isolating the
// const ROMAJI_MAP={...}; block. The block spans multiple lines so we
// match greedily up to the closing brace + semicolon.
const mapMatch = src.match(/const ROMAJI_MAP=\{([\s\S]*?)\};/);
if (!mapMatch) {
  console.error('FATAL: could not locate ROMAJI_MAP in patch-ime.mjs');
  process.exit(1);
}

// Strip JS comments inside the literal so eval doesn't choke
const mapBody = mapMatch[1].replace(/\/\/[^\n]*/g, '');
const ROMAJI_MAP = (new Function(`return {${mapBody}};`))();

// Reimplement the longest-match conversion loop from processIME, but
// pure (no DOM). Converts a full romaji string to kana.
function romajiToKana(input) {
  let out = '';
  let i = 0;
  const DOUBLE_CONSONANTS = 'ksztcgdbpfhjmnrwy';
  while (i < input.length) {
    let matched = false;
    // Double consonant: kk, tt, ss, etc → っ + next-letter cycle
    if (i + 1 < input.length
        && input[i] === input[i + 1]
        && DOUBLE_CONSONANTS.includes(input[i])
        && input[i] !== 'n') {
      out += 'っ';
      i += 1; // consume one of the doubled letters; the second restarts the cycle
      continue;
    }
    // Disambiguate "nn" followed by a vowel/y: it's n + n[vowel], NOT
    // "nn" → ん eating both n's. Critical for inputs like "konnichiwa"
    // → こんにちわ. Without this, naive longest-match would give こんいちわ.
    if (input[i] === 'n'
        && i + 2 < input.length
        && input[i + 1] === 'n'
        && 'aiueoy'.includes(input[i + 2])) {
      out += 'ん';
      i += 1;
      continue;
    }
    // Try longest-match (4..1)
    for (let len = Math.min(4, input.length - i); len >= 1; len--) {
      const chunk = input.substring(i, i + len);
      if (ROMAJI_MAP[chunk]) {
        out += ROMAJI_MAP[chunk];
        i += len;
        matched = true;
        break;
      }
    }
    if (matched) continue;
    // Lone n followed by non-vowel/y → ん (matches engine line 113)
    if (input[i] === 'n' && i + 1 < input.length && !'aiueony'.includes(input[i + 1])) {
      out += 'ん';
      i += 1;
      continue;
    }
    // Trailing 'n' at end of string → ん (common student input)
    if (input[i] === 'n' && i + 1 === input.length) {
      out += 'ん';
      i += 1;
      continue;
    }
    // Unmatched character — pass through (the live IME would just leave it pending)
    out += input[i];
    i += 1;
  }
  return out;
}

// ─── TEST CASES ────────────────────────────────────────────────────────
// Format: [romaji_input, expected_kana, label]
const TESTS = [
  // Basic gojuon
  ['a',     'あ',     'vowel a'],
  ['konnichiwa', 'こんにちわ', 'konnichiwa (note: は particle is wa→わ)'],
  ['ka',    'か',     'k-row'],
  ['shi',   'し',     'shi (sh-form)'],
  ['si',    'し',     'si (s-form alt)'],
  ['chi',   'ち',     'chi (ch-form)'],
  ['ti',    'ち',     'ti (t-form alt)'],
  ['tsu',   'つ',     'tsu'],
  ['fu',    'ふ',     'fu (f-form)'],
  ['hu',    'ふ',     'hu (h-form alt)'],

  // Voiced + plosive
  ['ga',    'が',     'g-row'],
  ['za',    'ざ',     'z-row'],
  ['ji',    'じ',     'ji (j-form)'],
  ['da',    'だ',     'd-row'],
  ['ba',    'ば',     'b-row'],
  ['pa',    'ぱ',     'p-row'],

  // Yoon (small ya/yu/yo combinations)
  ['kya',   'きゃ',   'kya'],
  ['shu',   'しゅ',   'shu'],
  ['cho',   'ちょ',   'cho'],
  ['nyu',   'にゅ',   'nyu'],
  ['ryo',   'りょ',   'ryo'],
  ['ja',    'じゃ',   'ja'],

  // Sokuon (っ - double consonant)
  ['kitte', 'きって', 'kitte (stamp)'],
  ['gakkou','がっこう','gakkou (school)'],
  ['matte', 'まって', 'matte (wait)'],
  ['kissaten','きっさてん','kissaten (cafe)'],

  // ん (n) handling
  ['nn',    'ん',     'nn → ん explicit'],
  ['hon',   'ほん',   'hon (book) — trailing n'],
  ['shinbun','しんぶん','shinbun (newspaper)'],
  ['onsen', 'おんせん','onsen (hot spring) — n before s'],
  ['kanji', 'かんじ', 'kanji — n before j'],

  // Long vowels
  ['ohayou','おはよう','ohayou (good morning)'],
  ['arigatou','ありがとう','arigatou (thanks)'],

  // Common Nakama 1 vocab
  ['watashi','わたし','watashi (I)'],
  ['anata', 'あなた', 'anata (you)'],
  ['sensei','せんせい','sensei (teacher)'],
  ['gakusei','がくせい','gakusei (student)'],
  ['daigaku','だいがく','daigaku (university)'],
  ['nihon', 'にほん', 'nihon (Japan)'],
  ['nihongo','にほんご','nihongo (Japanese language)'],

  // Adjectives + verbs
  ['ookii', 'おおきい','ookii (big)'],
  ['chiisai','ちいさい','chiisai (small)'],
  ['tabemasu','たべます','tabemasu (eat-polite)'],
  ['ikimasu','いきます','ikimasu (go-polite)'],
];

// ─── RUN TESTS ─────────────────────────────────────────────────────────
let pass = 0, fail = 0;
const failures = [];

for (const [input, expected, label] of TESTS) {
  const actual = romajiToKana(input);
  if (actual === expected) {
    pass++;
  } else {
    fail++;
    failures.push({ input, expected, actual, label });
  }
}

// ─── REPORT ────────────────────────────────────────────────────────────
console.log(`[IME] ${TESTS.length} tests: ${pass} PASS, ${fail} FAIL`);
if (fail > 0) {
  console.log('\nFAILURES:');
  for (const f of failures) {
    console.log(`  ✕ ${f.label}`);
    console.log(`    input:    "${f.input}"`);
    console.log(`    expected: "${f.expected}"`);
    console.log(`    actual:   "${f.actual}"`);
  }
  process.exit(1);
}
console.log('[IME] all PASS');
process.exit(0);

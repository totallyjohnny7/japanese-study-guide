import { readFileSync, writeFileSync } from 'fs';

const html = readFileSync('public/index.html', 'utf8');

// ─── VERB LOOKUP ───────────────────────────────────────────────────
// polite form → { dict, te, type }
const VERBS = {
  // Group 2 (ichidan / ru-verbs)
  'たべます':   { dict:'たべる',   te:'たべて',      grp:'G2' },
  'みます':     { dict:'みる',     te:'みて',        grp:'G2' },
  'ねます':     { dict:'ねる',     te:'ねて',        grp:'G2' },
  'おきます':   { dict:'おきる',   te:'おきて',      grp:'G2' },
  'でかけます': { dict:'でかける', te:'でかけて',    grp:'G2' },
  'います':     { dict:'いる',     te:'いて',        grp:'G2' },
  'あびます':   { dict:'あびる',   te:'あびて',      grp:'G2' },
  'かけます':   { dict:'かける',   te:'かけて',      grp:'G2' },
  // Group 1 (godan / u-verbs)
  'のみます':   { dict:'のむ',     te:'のんで',      grp:'G1' },
  'よみます':   { dict:'よむ',     te:'よんで',      grp:'G1' },
  'かきます':   { dict:'かく',     te:'かいて',      grp:'G1' },
  'ききます':   { dict:'きく',     te:'きいて',      grp:'G1' },
  'はなします': { dict:'はなす',   te:'はなして',    grp:'G1' },
  'あいます':   { dict:'あう',     te:'あって',      grp:'G1' },
  'いきます':   { dict:'いく',     te:'いって',      grp:'G1', note:'irregular て-form' },
  'かえります': { dict:'かえる',   te:'かえって',    grp:'G1', note:'looks る, is う' },
  'あります':   { dict:'ある',     te:'あって',      grp:'G1' },
  'はいります': { dict:'はいる',   te:'はいって',    grp:'G1', note:'looks る, is う' },
  'あそびます': { dict:'あそぶ',   te:'あそんで',    grp:'G1' },
  'あるきます': { dict:'あるく',   te:'あるいて',    grp:'G1' },
  'いいます':   { dict:'いう',     te:'いって',      grp:'G1' },
  'およぎます': { dict:'およぐ',   te:'およいで',    grp:'G1' },
  'まちます':   { dict:'まつ',     te:'まって',      grp:'G1' },
  'よびます':   { dict:'よぶ',     te:'よんで',      grp:'G1' },
  'かかります': { dict:'かかる',   te:'かかって',    grp:'G1' },
  'よびます':   { dict:'よぶ',     te:'よんで',      grp:'G1' },
  // Group 3 (irregular)
  'します':     { dict:'する',     te:'して',        grp:'G3' },
  'きます':     { dict:'くる',     te:'きて',        grp:'G3', note:'くる irregular' },
};

// Suru compound verbs (ends in します/をします) → te = replace します with して
function isSuruCompound(jp) {
  return jp.endsWith('します') && !(jp in VERBS);
}

function getVerbForms(jp) {
  const v = VERBS[jp];
  if (v) {
    const stem = jp.slice(0, -2); // remove ます
    return {
      type: 'verb-' + v.grp.toLowerCase(),
      dict: v.dict,
      neg: stem + 'ません',
      past: stem + 'ました',
      pastNeg: stem + 'ませんでした',
      te: v.te,
      ...(v.note ? { note: v.note } : {})
    };
  }
  if (isSuruCompound(jp)) {
    const stem = jp.slice(0, -2); // remove ます
    const te = stem.endsWith('し') ? stem + 'て' : jp.replace('します', 'して');
    return {
      type: 'verb-suru',
      dict: jp.replace('ます', 'する').replace('をします','をする'),
      neg: stem + 'ません',
      past: stem + 'ました',
      pastNeg: stem + 'ませんでした',
      te
    };
  }
  return null;
}

// ─── I-ADJ ─────────────────────────────────────────────────────────
const I_ADJ = new Set([
  'いい',
  'たかい','やすい','おおきい','ちいさい','あたらしい','ふるい',
  'あかるい','くらい','せまい','ひろい','はやい','きたない',
  'いそがしい','うれしい','おもしろい','かなしい','さびしい',
  'たのしい','つまらない','むずかしい','やさしい',
  'あおい','あかい','きいろい','くろい','しろい','ちゃいろい',
]);

function getIAdjForms(jp) {
  if (!I_ADJ.has(jp)) return null;
  if (jp === 'いい') {
    return { type:'i-adj-irreg',
      past:'よかった', neg:'よくない', pastNeg:'よくなかった',
      politePast:'よかったです', politeNeg:'よくないです', politeNeg2:'よくありません'
    };
  }
  const stem = jp.slice(0, -1); // remove い
  return { type:'i-adj',
    past: stem + 'かった',
    neg: stem + 'くない',
    pastNeg: stem + 'くなかった',
    politePast: stem + 'かったです',
    politeNeg: stem + 'くないです',
    politeNeg2: stem + 'くありません'
  };
}

// ─── NA-ADJ ────────────────────────────────────────────────────────
// Stored without な suffix in CHAPTER_DATA
const NA_ADJ = new Set([
  'しずか','にぎやか','ゆうめい','げんき','きれい',
  'りっぱ','ひま','べんり','ざんねん','だいじょうぶ','たいへん',
  // with な already attached in some entries
  'しずかな','にぎやかな','ゆうめいな','げんきな','きれいな',
  'りっぱな','ひまな','べんりな',
]);

function getNaAdjForms(jp) {
  // Handle （な） and (な) suffixes stored in CHAPTER_DATA
  const base = jp.replace(/[（(]な[）)]/,'').replace(/な$/,'').trim();
  if (!NA_ADJ.has(jp) && !NA_ADJ.has(base) && !NA_ADJ.has(base+'な')) return null;
  return { type:'na-adj',
    prenominal: base + 'な',
    past: base + 'でした',
    neg: base + 'じゃありません',
    pastNeg: base + 'じゃありませんでした',
    politeNeg: base + 'じゃないです',
  };
}

// ─── PATCH CHAPTER_DATA ────────────────────────────────────────────
const start = html.indexOf('const CHAPTER_DATA = {');
let depth=0, i=start+'const CHAPTER_DATA = '.length, end=-1;
for(;i<html.length;i++){
  if(html[i]==='{')depth++;
  else if(html[i]==='}'){depth--;if(depth===0){end=i+1;break;}}
}

const data = JSON.parse(html.substring(start+'const CHAPTER_DATA = '.length, end));

let verbCount=0, iAdjCount=0, naAdjCount=0;

for (const ch of Object.values(data)) {
  if (!ch.vocab) continue;
  for (const v of ch.vocab) {
    const jp = v.japanese.trim();
    // Skip complex phrases (contain spaces, kanji with particles, or are already tagged)
    if (v.forms) continue;
    
    const isVerbEnglish = v.english.toLowerCase().startsWith('to ');
    const endsInMasu = jp.endsWith('ます');

    if (isVerbEnglish && endsInMasu) {
      const forms = getVerbForms(jp);
      if (forms) { v.forms = forms; verbCount++; }
    } else {
      const iAdj = getIAdjForms(jp);
      if (iAdj) { v.forms = iAdj; iAdjCount++; continue; }
      const naAdj = getNaAdjForms(jp);
      if (naAdj) { v.forms = naAdj; naAdjCount++; }
    }
  }
}

console.log(`Tagged: ${verbCount} verbs, ${iAdjCount} i-adj, ${naAdjCount} na-adj`);

// Serialize back with compact JSON (no extra spaces)
const newChapterData = JSON.stringify(data);

// Replace in HTML
const newHtml = html.slice(0, start + 'const CHAPTER_DATA = '.length)
  + newChapterData
  + html.slice(end);

writeFileSync('public/index.html', newHtml);
console.log('Done — public/index.html updated');

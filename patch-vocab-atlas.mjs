// patch-vocab-atlas.mjs
// 1. Adds CSS so each card's <div class="va-ex"> example is hidden by default
//    and shown on hover (a tooltip-style overlay).
// 2. Adds 234 missing chapter vocab items into the right Vocab Atlas cards
//    (Phase 1: append to existing cards, Phase 2: insert new cards).
// 3. Verifies one-by-one that every PDF vocab item is present.
//
// Idempotent: rerunning is safe.

import fs from 'node:fs';
import path from 'node:path';

const FILE = path.join('public', 'index.html');
let html = fs.readFileSync(FILE, 'utf8');
const before = html.length;

// ════════════════════════════════════════════════════════════════════════════
// STEP 0 — INJECT CSS for hover-tooltip va-ex (only inside Vocab Atlas)
// ════════════════════════════════════════════════════════════════════════════
const CSS_MARKER = '/* VOCAB-ATLAS-HOVER-TOOLTIP */';
if (!html.includes(CSS_MARKER)) {
  const css = `
${CSS_MARKER}
#panel_ref-vocab .card { position: relative; }
#panel_ref-vocab .va-ex {
  display: none;
  position: absolute;
  left: 50%;
  top: calc(100% - 4px);
  transform: translateX(-50%);
  z-index: 200;
  width: max-content;
  max-width: min(560px, 92vw);
  background: #0d0e15;
  border: 1px solid #6b5518;
  border-radius: 8px;
  padding: 10px 14px;
  box-shadow: 0 6px 20px rgba(0,0,0,0.55);
  font-size: 12px;
  line-height: 1.55;
  color: var(--text);
  pointer-events: none;
  white-space: normal;
}
#panel_ref-vocab .card:hover > .card-body > .va-ex,
#panel_ref-vocab .card:hover > .va-ex { display: block; }
#panel_ref-vocab .card-header::after {
  content: " ℹ︎ hover for example";
  font-size: 9px;
  color: rgba(255,255,255,0.55);
  font-weight: 400;
  letter-spacing: 0.5px;
  margin-left: 8px;
}
#panel_ref-vocab .card:not(:has(.va-ex)) .card-header::after { content: ""; }
`;
  // Insert before the first </style>
  html = html.replace('</style>', css + '\n</style>');
  console.log('✓ Injected hover-tooltip CSS');
} else {
  console.log('✓ Hover-tooltip CSS already present');
}

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════
function item(jp, rm, en) {
  const rmHtml = rm ? `<div class="oe-loc-rm">${rm}</div>` : '';
  return `<div class="oe-loc-item"><div class="oe-loc-jp">${jp}</div>${rmHtml}<div class="oe-loc-en">${en}</div></div>`;
}

function appendToCard(headerText, items) {
  const headerRegex = new RegExp(
    `(<div class="card-header"[^>]*>${escapeRegex(headerText)}</div>\\s*<div class="card-body">[\\s\\S]*?<div class="oe-loc-grid">[\\s\\S]*?)(</div>\\s*(?:<div class="oe-tip"|<div class="oe-warn"|<div class="va-ex"|</div></div>))`
  );
  const m = html.match(headerRegex);
  if (!m) {
    console.warn(`  ✗ Could not find card "${headerText}"`);
    return 0;
  }
  const gridSection = m[1];
  const newItems = items.filter(([jp]) => !gridSection.includes(`<div class="oe-loc-jp">${jp}</div>`));
  if (newItems.length === 0) {
    console.log(`  ✓ "${headerText}" — already complete (skipped ${items.length})`);
    return 0;
  }
  const insertion = '\n' + newItems.map(([jp, rm, en]) => item(jp, rm, en)).join('\n') + '\n';
  html = html.replace(headerRegex, m[1] + insertion + m[2]);
  console.log(`  ✓ "${headerText}" — added ${newItems.length}/${items.length}`);
  return newItems.length;
}

function insertCardIntoSection(sectionId, cardHtml) {
  const sectionTag = sectionId === 'vocsec0'
    ? `<div class="oe-sec active" id="${sectionId}">`
    : `<div class="oe-sec" id="${sectionId}">`;
  const idx = html.indexOf(sectionTag);
  if (idx === -1) {
    console.warn(`  ✗ Section ${sectionId} not found`);
    return false;
  }
  const sub = html.slice(idx);

  const headerMatch = cardHtml.match(/<div class="card-header"[^>]*>([^<]+)<\/div>/);
  if (headerMatch && html.includes(headerMatch[0])) {
    console.log(`  ✓ Card "${headerMatch[1]}" — already present`);
    return false;
  }

  let insertAt;
  const sectionEndPattern = /\r?\n<\/div>\r?\n\r?\n<!--\s*[═]+\s*SECTION/;
  const endMatch = sub.match(sectionEndPattern);
  if (endMatch) {
    insertAt = idx + endMatch.index + endMatch[0].indexOf('</div>');
  } else {
    // Last section (vocsec6)
    const lastEnd = sub.search(/<\/div><\/div>\r?\n\r?\n<\/div>\r?\n/);
    if (lastEnd === -1) {
      console.warn(`  ✗ Could not locate close of section ${sectionId}`);
      return false;
    }
    const closeMatch = sub.slice(lastEnd).match(/<\/div><\/div>\r?\n\r?\n/);
    insertAt = idx + lastEnd + closeMatch[0].length;
  }
  html = html.slice(0, insertAt) + cardHtml + '\n\n' + html.slice(insertAt);
  console.log(`  ✓ Inserted card "${headerMatch[1]}" into ${sectionId}`);
  return true;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function newCard(headerText, headerStyle, items, opts = {}) {
  const styleAttr = headerStyle ? ` style="${headerStyle}"` : '';
  const intro = opts.intro
    ? `<p style="font-size:11px;color:var(--text-dim);margin-bottom:8px;">${opts.intro}</p>\n`
    : '';
  const warn = opts.warn
    ? `\n<div class="oe-warn"><b>${opts.warn.label || '⚠️ NOTE:'}</b> ${opts.warn.text}</div>`
    : '';
  const tip = opts.tip
    ? `\n<div class="oe-tip"><b>${opts.tip.label || 'TIP:'}</b> ${opts.tip.text}</div>`
    : '';
  const ex = opts.ex
    ? `\n<div class="va-ex"><b>EX:</b> <span class="oe-ja">${opts.ex.jp}</span><br><span class="oe-en">${opts.ex.en}</span></div>`
    : '';
  return `<div class="card"><div class="card-header"${styleAttr}>${headerText}</div><div class="card-body">
${intro}<div class="oe-loc-grid">
${items.map(([jp, rm, en]) => item(jp, rm, en)).join('\n')}
</div>${warn}${tip}${ex}
</div></div>`;
}

// ════════════════════════════════════════════════════════════════════════════
// PHASE 1: Append items into existing cards
// ════════════════════════════════════════════════════════════════════════════
console.log('\nPhase 1: appending items into existing cards');

appendToCard('めいし — NOUNS (common)', [
  ['うち', 'uchi', 'home (Ch3)'],
  ['あさ', 'asa', 'morning (Ch3)'],
  ['ばん', 'ban', 'night, evening (Ch3)'],
  ['ひる', 'hiru', 'afternoon (Ch3)'],
  ['ばんごはん', 'bangohan', 'dinner (Ch3)'],
  ['ひるごはん', 'hirugohan', 'lunch (Ch3)'],
  ['ごはん', 'gohan', 'meal, cooked rice (Ch3)'],
  ['おふろ', 'ofuro', 'bath (Ch3)'],
  ['シャワー', 'shawaa', 'shower (Ch3)'],
  ['がっこう', 'gakkou', 'school (Ch3)'],
  ['クラス', 'kurasu', 'class (Ch3)'],
  ['じゅぎょう', 'jugyou', 'class, course (Ch3)'],
  ['コーヒー', 'koohii', 'coffee (Ch3)'],
  ['テレビ', 'terebi', 'TV (Ch3)'],
  ['でんわばんごう', 'denwa bangou', 'phone number (Ch3)'],
  ['せいかつ', 'seikatsu', 'life, living (Ch3)'],
  ['つぎ', 'tsugi', 'next (Ch3)'],
  ['べんきょう', 'benkyou', 'study (Ch3)'],
  ['えき', 'eki', 'station (Ch4)'],
  ['まち', 'machi', 'town (Ch4)'],
  ['たてもの', 'tatemono', 'building (Ch4)'],
  ['ビル', 'biru', 'tall building (Ch4)'],
  ['アパート', 'apaato', 'apartment (Ch4)'],
  ['りょう', 'ryou', 'dormitory (Ch4)'],
  ['カフェ', 'kafe', 'cafe (Ch4)'],
  ['きっさてん', 'kissaten', 'coffee shop (Ch4)'],
  ['レストラン', 'resutoran', 'restaurant (Ch4)'],
  ['コンビニ', 'konbini', 'convenience store (Ch4)'],
  ['スーパー', 'suupaa', 'supermarket (Ch4)'],
  ['デパート', 'depaato', 'department store (Ch4)'],
  ['ほんや', 'honya', 'bookstore (Ch4)'],
  ['びょういん', 'byouin', 'hospital (Ch4)'],
  ['ゆうびんきょく', 'yuubinkyoku', 'post office (Ch4)'],
  ['こうばん', 'kouban', 'police box (Ch4)'],
  ['このへん', 'kono hen', 'this area (Ch4)'],
  ['えんぴつ', 'enpitsu', 'pencil (Ch4)'],
  ['けしゴム', 'keshigomu', 'eraser (Ch4)'],
  ['ペン', 'pen', 'pen (Ch4)'],
  ['ボールペン', 'boorupen', 'ballpoint pen (Ch4)'],
  ['ノート', 'nooto', 'notebook (Ch4)'],
  ['じしょ', 'jisho', 'dictionary (Ch4)'],
  ['きょうかしょ', 'kyoukasho', 'textbook (Ch4)'],
  ['かばん', 'kaban', 'bag (Ch4)'],
  ['テスト', 'tesuto', 'test (Ch4)'],
  ['へや', 'heya', 'room (Ch5)'],
  ['きょうしつ', 'kyoushitsu', 'classroom (Ch5)'],
  ['ところ', 'tokoro', 'place (Ch5)'],
  ['ドア', 'doa', 'door (Ch5)'],
  ['まど', 'mado', 'window (Ch5)'],
  ['おしいれ', 'oshiire', 'closet (Ch5)'],
  ['つくえ', 'tsukue', 'desk (Ch5)'],
  ['いす', 'isu', 'chair (Ch5)'],
  ['テーブル', 'teeburu', 'table (Ch5)'],
  ['ベッド', 'beddo', 'bed (Ch5)'],
  ['ふとん', 'futon', 'futon (Ch5)'],
  ['ソファ', 'sofa', 'sofa (Ch5)'],
  ['たんす', 'tansu', 'chest of drawers (Ch5)'],
  ['ほんだな', 'hondana', 'bookshelf (Ch5)'],
  ['とけい', 'tokei', 'clock, watch (Ch5)'],
  ['え', 'e', 'picture (Ch5)'],
  ['しゃしん', 'shashin', 'photograph (Ch5)'],
  ['こくばん', 'kokuban', 'chalkboard (Ch5)'],
  ['でんわ', 'denwa', 'telephone (Ch5)'],
  ['けいたい(でんわ)', 'keitai (denwa)', 'cell phone (Ch5)'],
  ['コンピュータ', 'konpyuuta', 'computer (Ch5)'],
  ['ビデオ', 'bideo', 'video (Ch5)'],
  ['トイレ', 'toire', 'restroom (Ch5)'],
  ['ルーム', 'ruumu', 'room (Ch5)'],
  ['メディアセンター', 'media sentaa', 'media center (Ch5)'],
  ['たいいくかん', 'taiikukan', 'gym (Ch5)'],
  ['がくせいかいかん', 'gakusei kaikan', 'student union (Ch5)'],
  ['がくしょく', 'gakushoku', 'cafeteria (Ch5)'],
  ['もの', 'mono', 'thing (Ch5)'],
  ['ひと', 'hito', 'person (Ch5)'],
  ['いぬ', 'inu', 'dog (Ch5)'],
  ['ねこ', 'neko', 'cat (Ch5)'],
  ['くるま', 'kuruma', 'car (Ch5)'],
  ['じてんしゃ', 'jitensha', 'bicycle (Ch5)'],
  ['バス', 'basu', 'bus (Ch5)'],
  ['やま', 'yama', 'mountain (Ch5)'],
  ['かわ', 'kawa', 'river (Ch5)'],
  ['き', 'ki', 'tree (Ch5)'],
  ['ともだち', 'tomodachi', 'friend (Ch6)'],
  ['りょうしん', 'ryoushin', 'parents (Ch6)'],
  ['しごと', 'shigoto', 'job (Ch6)'],
  ['アルバイト', 'arubaito', 'part-time job (Ch6)'],
  ['しつもん', 'shitsumon', 'question (Ch6)'],
  ['しんぶん', 'shinbun', 'newspaper (Ch6)'],
  ['ざっし', 'zasshi', 'magazine (Ch6)'],
  ['てがみ', 'tegami', 'letter (Ch6)'],
  ['メール', 'meeru', 'email (Ch6)'],
  ['おんがく', 'ongaku', 'music (Ch6)'],
  ['えいが', 'eiga', 'movie (Ch3/6)'],
  ['コンサート', 'konsaato', 'concert (Ch6)'],
  ['パーティ', 'paatii', 'party (Ch6)'],
  ['ピクニック', 'pikunikku', 'picnic (Ch6)'],
  ['ゲーム', 'geemu', 'game (Ch6)'],
  ['テニス', 'tenisu', 'tennis (Ch6)'],
  ['ジョギング', 'jogingu', 'jogging (Ch6)'],
  ['プール', 'puuru', 'pool (Ch6)'],
  ['さんぽ', 'sanpo', 'walk, stroll (Ch6)'],
  ['うんどう', 'undou', 'exercise (Ch6)'],
  ['かいもの', 'kaimono', 'shopping (Ch6)'],
  ['りょうり', 'ryouri', 'cooking (Ch6)'],
  ['そうじ', 'souji', 'cleaning (Ch6)'],
  ['せんたく', 'sentaku', 'laundry (Ch6)'],
  ['やすみ', 'yasumi', 'rest, day off (Ch6)'],
  ['やすみのひ', 'yasumi no hi', 'a day off (Ch6)'],
  ['こんど', 'kondo', 'next time (Ch6)'],
]);

appendToCard('いちだんどうし — る-VERBS (Class 2)', [
  ['あびる → あびます', 'abiru', 'to take (a shower) (Ch3)'],
  ['かける → かけます', 'kakeru', 'to make a phone call (Ch6)'],
]);

appendToCard('ごだんどうし — う-VERBS (Class 1)', [
  ['かえる → かえります', 'kaeru', 'to return home (Ch3) ⚠️ う-verb!'],
  ['はいる → はいります', 'hairu', 'to enter (Ch3) ⚠️ う-verb!'],
  ['あう → あいます', 'au', 'to meet (Ch6)'],
  ['あそぶ → あそびます', 'asobu', 'to play (Ch6)'],
  ['あるく → あるきます', 'aruku', 'to walk (Ch6)'],
  ['いう → いいます', 'iu', 'to say (Ch6)'],
  ['およぐ → およぎます', 'oyogu', 'to swim (Ch6)'],
  ['まつ → まちます', 'matsu', 'to wait (Ch6)'],
  ['よぶ → よびます', 'yobu', 'to call, invite (Ch6)'],
  ['かかる → かかります', 'kakaru', 'to take (time/cost) (Ch5)'],
]);

// — IRREGULAR VERBS — accuracy fix: use (を)します for noun-suru verbs that the textbook
//   marks as optional-を (うんどう, さんぽ, しつもん, かいもの, りょうり, せんたく, そうじ).
//   しごと uses just を (no parens). べんきょうします has no を since it's compound.
appendToCard('ふきそくどうし — IRREGULAR VERBS', [
  ['べんきょうします', 'benkyou shimasu', 'to study (Ch3)'],
  ['さんぽ(を)します', 'sanpo (o) shimasu', 'to take a walk (Ch6)'],
  ['うんどう(を)します', 'undou (o) shimasu', 'to exercise (Ch6)'],
  ['しつもん(を)します', 'shitsumon (o) shimasu', 'to ask a question (Ch6)'],
  ['そうじ(を)します', 'souji (o) shimasu', 'to clean (Ch6)'],
  ['せんたく(を)します', 'sentaku (o) shimasu', 'to do laundry (Ch6)'],
  ['かいもの(を)します', 'kaimono (o) shimasu', 'to go shopping (Ch6)'],
]);

appendToCard('いけいようし — い-ADJECTIVES', [
  ['あおい', 'aoi', 'blue (Ch4)'],
  ['あかい', 'akai', 'red (Ch4)'],
  ['きいろい', 'kiiroi', 'yellow (Ch4)'],
  ['くろい', 'kuroi', 'black (Ch4)'],
  ['しろい', 'shiroi', 'white (Ch4)'],
  ['ちゃいろい', 'chairoi', 'brown (Ch4)'],
  ['くらい', 'kurai', 'dark (Ch5)'],
  ['せまい', 'semai', 'cramped, narrow (Ch5)'],
  ['ひろい', 'hiroi', 'spacious, wide (Ch5)'],
  ['はやい', 'hayai', 'fast, quick (Ch5)'],
  ['うれしい', 'ureshii', 'happy (Ch6)'],
  ['かなしい', 'kanashii', 'sad (Ch6)'],
  ['さびしい', 'sabishii', 'lonely (Ch6)'],
  ['つまらない', 'tsumaranai', 'boring (Ch6)'],
  ['むずかしい', 'muzukashii', 'difficult (Ch6)'],
  ['やさしい', 'yasashii', 'easy / kind (Ch6)'],
]);

appendToCard('なけいようし — な-ADJECTIVES', [
  ['げんき(な)', 'genki (na)', 'healthy, lively (Ch6)'],
  ['ざんねん(な)', 'zannen (na)', 'sorry, regrettable (Ch6)'],
  ['だいじょうぶ(な)', 'daijoubu (na)', 'all right, no problem (Ch6)'],
  ['たいへん(な)', 'taihen (na)', 'tough (Ch6)'],
]);

appendToCard('ていどのふくし — DEGREE ADVERBS', [
  ['どうも', 'doumo', 'very; thanks (Ch4)'],
]);

appendToCard('ようたいのふくし — MANNER ADVERBS', [
  ['いっしょに', 'issho ni', 'together (Ch6)'],
  ['ぜひ', 'zehi', 'by all means (Ch6)'],
  ['あるいて', 'aruite', 'on foot (Ch5)'],
]);

appendToCard('じかんめいし — TIME WORDS', [
  ['いま', 'ima', 'now (Ch2)'],
  ['ごぜん', 'gozen', 'a.m., morning (Ch2)'],
  ['ごご', 'gogo', 'p.m., afternoon (Ch2)'],
  ['らいねん', 'rainen', 'next year (Ch2)'],
  ['あさ', 'asa', 'morning (Ch3)'],
  ['ばん', 'ban', 'night (Ch3)'],
  ['ひる', 'hiru', 'afternoon (Ch3)'],
  ['こんしゅう', 'konshuu', 'this week (Ch3)'],
  ['こんばん', 'konban', 'tonight (Ch3)'],
  ['まいあさ', 'maiasa', 'every morning (Ch3)'],
  ['まいしゅう', 'maishuu', 'every week (Ch3)'],
  ['おととい', 'ototoi', 'day before yesterday (Ch3)'],
  ['げつようび', 'getsuyoubi', 'Monday (Ch3)'],
  ['かようび', 'kayoubi', 'Tuesday (Ch3)'],
  ['すいようび', 'suiyoubi', 'Wednesday (Ch3)'],
  ['もくようび', 'mokuyoubi', 'Thursday (Ch3)'],
  ['きんようび', 'kinyoubi', 'Friday (Ch3)'],
  ['どようび', 'doyoubi', 'Saturday (Ch3)'],
  ['にちようび', 'nichiyoubi', 'Sunday (Ch3)'],
  ['～じかん', '~jikan', '~ hours (Ch5 duration)'],
  ['はん', 'han', 'half past (Ch2; e.g. いちじはん 1:30)'],
]);

appendToCard('せっとうじ・じょすうじ — PREFIXES &amp; TITLE SUFFIXES', [
  ['お～', 'o~', 'polite prefix (おなまえ)'],
  ['～ご', '~go', 'language (にほんご)'],
  ['～じん', '~jin', 'nationality (アメリカじん)'],
  ['～せい', '~sei', 'student (だいがくせい)'],
  ['～ねん', '~nen', 'year (いちねん)'],
  ['～じ', '~ji', "o'clock"],
  ['～や', '~ya', 'store (ほんや)'],
  ['～ようび', '~youbi', 'day of the week'],
  ['こん～', 'kon~', 'this ~ (こんしゅう)'],
  ['まい～', 'mai~', 'every ~ (まいにち)'],
  ['～ふん／ぷん', '~fun/pun', '~ minute(s)'],
  ['～ぐらい／くらい', '~gurai/kurai', 'about ~ (duration/amount)'],
]);

appendToCard('かんどうし — INTERJECTIONS', [
  ['はい / ええ', 'hai / ee', 'yes (ええ slightly softer)'],
  ['いいえ', 'iie', "no; you're welcome"],
]);

appendToCard('すうし — NUMBERS', [
  ['ゼロ／れい', 'zero / rei', 'zero (Ch3)'],
]);

appendToCard('あいさつ — GREETINGS &amp; SET PHRASES', [
  ['はじめまして', 'hajimemashite', 'How do you do? (Ch1, first meeting)'],
  ['どうぞよろしく', 'douzo yoroshiku', 'Pleased to meet you (Ch1)'],
  ['おはよう', 'ohayou', 'Good morning (casual, Ch1)'],
  ['さようなら / さよなら', 'sayounara', 'Good-bye (Ch1)'],
  ['しつれいします', 'shitsurei shimasu', 'Excuse me / leaving (Ch1)'],
  ['じゃあ、また', 'jaa, mata', 'See you later (Ch1)'],
  ['(あのう、)すみません', '(anou,) sumimasen', '(Um,) excuse me (Ch1)'],
  ['どういたしまして', 'dou itashimashite', "You're welcome (Ch1)"],
  ['いいえ、わかりません', 'iie, wakarimasen', "No, I don't understand (Ch1)"],
  ['はい、わかりました', 'hai, wakarimashita', 'Yes, I understood (Ch1)'],
  ['こちらこそ', 'kochira koso', 'Same here / likewise (Ch2)'],
  ['そうですか', 'sou desu ka', 'Is that so? I see. (Ch2)'],
  ['ええ／はい、そうです', 'ee/hai, sou desu', "Yes, that's so (Ch2)"],
  ['いいえ、そうじゃありません', 'iie, sou ja arimasen', "No, that's not so (Ch2)"],
  ['どうもありがとうございます', 'doumo arigatou gozaimasu', 'Thank you very much (Ch2)'],
  ['～からきました', '~ kara kimashita', 'I came from ~ (Ch2)'],
  ['どこからきましたか', 'doko kara kimashita ka', 'Where are you from? (Ch2)'],
  ['どちらからいらっしゃいましたか', 'dochira kara irasshaimashita ka', 'Where are you from? (polite, Ch2)'],
  ['あがってください', 'agatte kudasai', 'Please come in (Ch5)'],
  ['ちょっとつごうがわるくて', 'chotto tsugou ga warukute', "I'm a bit busy / can't (Ch6, polite refusal)"],
  ['ちょっとようじがあって', 'chotto youji ga atte', 'I have errands (Ch6, polite refusal)'],
]);

// ════════════════════════════════════════════════════════════════════════════
// PHASE 2: Insert NEW cards
// ════════════════════════════════════════════════════════════════════════════
console.log('\nPhase 2: inserting brand-new category cards');

const classroomCard = newCard(
  'きょうしつのことば — CLASSROOM REQUESTS (Ch1)',
  'background:linear-gradient(135deg,#1a4a6b,#2d6b8a);',
  [
    ['いってください', 'itte kudasai', 'Please say it / repeat'],
    ['もういちどいってください', 'mou ichido itte kudasai', 'Please say it again (instructor)'],
    ['もういちどおねがいします', 'mou ichido onegai shimasu', 'Please say it again (student)'],
    ['もうすこしゆっくりおねがいします', 'mou sukoshi yukkuri onegai shimasu', 'Please speak more slowly'],
    ['おおきいこえでいってください', 'ookii koe de itte kudasai', 'Please speak loudly (instructor)'],
    ['おおきいこえでおねがいします', 'ookii koe de onegai shimasu', 'Please speak loudly (student)'],
    ['かいてください', 'kaite kudasai', 'Please write'],
    ['よんでください', 'yonde kudasai', 'Please read'],
    ['きいてください', 'kiite kudasai', 'Please listen'],
    ['みてください', 'mite kudasai', 'Please look'],
    ['わかりましたか', 'wakarimashita ka', 'Do you understand?'],
    ['これはにほんごでなんといいますか', 'kore wa nihongo de nan to iimasu ka', 'How do you say this in Japanese?'],
    ['それはにほんごでなんといいますか', 'sore wa nihongo de nan to iimasu ka', 'How do you say that in Japanese?'],
    ['あれはにほんごでなんといいますか', 'are wa nihongo de nan to iimasu ka', 'How do you say that (over there) in Japanese?'],
    ['～はにほんごでなんといいますか', '~ wa nihongo de nan to iimasu ka', 'How do you say ~ in Japanese?'],
    ['～ってなんですか', '~ tte nan desu ka', 'What does ~ mean?'],
    ['～といいます／～っていいます', '~ to iimasu / ~ tte iimasu', 'You say ~ / You call it ~'],
  ],
  {
    intro: 'Phrases your instructor will use every class — and that you will use back. Memorize all 17.',
    tip: { label: 'PATTERN:', text: 'Verb-て + ください = polite request. The student-side equivalent is verb-stem + おねがいします.' },
    ex: { jp: 'もうすこしゆっくりおねがいします。', en: 'Please speak a little more slowly.' },
  }
);
insertCardIntoSection('vocsec6', classroomCard);

const countriesCard = newCard(
  'くに — COUNTRIES (Ch2)',
  'background:linear-gradient(135deg,#1a6b6b,#2d8a8a);',
  [
    ['にほん', 'Nihon', 'Japan'],
    ['アメリカ', 'Amerika', 'USA'],
    ['カナダ', 'Kanada', 'Canada'],
    ['メキシコ', 'Mekishiko', 'Mexico'],
    ['イギリス', 'Igirisu', 'England'],
    ['フランス', 'Furansu', 'France'],
    ['スペイン', 'Supein', 'Spain'],
    ['オーストラリア', 'Oosutoraria', 'Australia'],
    ['ちゅうごく', 'Chuugoku', 'China'],
    ['かんこく', 'Kankoku', 'South Korea'],
    ['たいわん', 'Taiwan', 'Taiwan'],
  ],
  {
    intro: 'Add ～じん for nationality (e.g. アメリカじん = American). Add ～ご for language (e.g. にほんご = Japanese).',
    ex: { jp: 'リーさんは ちゅうごくじんです。にほんごを はなします。', en: 'Li-san is Chinese. He speaks Japanese.' },
  }
);
insertCardIntoSection('vocsec0', countriesCard);

const majorsCard = newCard(
  'せんこう — MAJORS &amp; ACADEMIC (Ch2)',
  'background:linear-gradient(135deg,#6b1a6b,#8a2d8a);',
  [
    ['なまえ', 'namae', 'name'],
    ['こちら', 'kochira', 'this person, this way'],
    ['だいがく', 'daigaku', 'university'],
    ['だいがくせい', 'daigakusei', 'college student'],
    ['だいがくいんせい', 'daigakuinsei', 'graduate student'],
    ['りゅうがくせい', 'ryuugakusei', 'international student'],
    ['こうこう', 'koukou', 'high school'],
    ['いちねんせい', 'ichinensei', '1st-year (freshman)'],
    ['にねんせい', 'ninensei', '2nd-year (sophomore)'],
    ['さんねんせい', 'sannensei', '3rd-year (junior)'],
    ['よねんせい', 'yonensei', '4th-year (senior)'],
    ['せんこう', 'senkou', 'major'],
    ['えいご', 'eigo', 'English (language)'],
    ['れきし', 'rekishi', 'history'],
    ['ぶんがく', 'bungaku', 'literature'],
    ['けいえいがく', 'keieigaku', 'business administration'],
    ['ビジネス', 'bijinesu', 'business'],
    ['こうがく', 'kougaku', 'engineering'],
    ['アジアけんきゅう', 'Ajia kenkyuu', 'Asian studies'],
  ],
  {
    intro: 'The countries / majors / year-in-school set used in every Ch2 self-introduction.',
    ex: { jp: 'せんこうは こうがくです。にねんせいです。', en: 'My major is engineering. I am a sophomore.' },
  }
);
insertCardIntoSection('vocsec0', majorsCard);

const clockCard = newCard(
  'なんじ — CLOCK HOURS (Ch2)',
  'background:linear-gradient(135deg,#6b6b1a,#8a8a2d);',
  [
    ['いちじ', 'ichi-ji', "1 o'clock"],
    ['にじ', 'ni-ji', "2 o'clock"],
    ['さんじ', 'san-ji', "3 o'clock"],
    ['よじ ⚠️', 'yo-ji', "4 o'clock (NOT よん/し)"],
    ['ごじ', 'go-ji', "5 o'clock"],
    ['ろくじ', 'roku-ji', "6 o'clock"],
    ['しちじ ⚠️', 'shichi-ji', "7 o'clock (NOT なな)"],
    ['はちじ', 'hachi-ji', "8 o'clock"],
    ['くじ ⚠️', 'ku-ji', "9 o'clock (NOT きゅう)"],
    ['じゅうじ', 'juu-ji', "10 o'clock"],
    ['じゅういちじ', 'juu-ichi-ji', "11 o'clock"],
    ['じゅうにじ', 'juu-ni-ji', "12 o'clock"],
    ['はん', 'han', 'half past (e.g. いちじはん = 1:30)'],
  ],
  {
    warn: { label: '⚠️ IRREGULAR READINGS:', text: '4 = よ (not よん/し) · 7 = しち (not なな) · 9 = く (not きゅう). These three lose easy points on every Ch 2 quiz.' },
    ex: { jp: 'いま よじはんです。じゅぎょうは しちじに あります。', en: "It's 4:30 now. The class is at 7." },
  }
);
insertCardIntoSection('vocsec5', clockCard);

// ════════════════════════════════════════════════════════════════════════════
// WRITE
// ════════════════════════════════════════════════════════════════════════════
fs.writeFileSync(FILE, html);
console.log(`\n✓ Wrote ${FILE}`);
console.log(`  Size: ${before} → ${html.length} bytes (${html.length - before > 0 ? '+' : ''}${html.length - before})`);

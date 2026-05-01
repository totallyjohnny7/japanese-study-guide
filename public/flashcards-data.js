/* ===========================================================
   Nakama 1 — Leitner Flashcard Deck (Ch 1–6)
   Card schema:
     { id, type, ch, prompt, answer, kana, en,
       options?, why?, ctx?, mnem: {chain, kanji, sentence, related, trap} }
   Types: recall | recognition | listening | particle | wa_ga
        | verb_conj | adj_conj | counter | kana | demo | i_na
        | te_form | te_chain | ni_de | freq | goro_gurai
        | dbl_particle | masenka | qword | greeting
        | cloze | transform | adj_noun
   =========================================================== */
(function(){
'use strict';

const CARDS = [];
const push = c => CARDS.push(c);

/* =========================================================
   1) VOCAB — recall (En→Ja), recognition (Ja→En), listening (kana→En)
   Each base word becomes 3 cards (one per direction).
   ========================================================= */
const VOCAB = [
  // CH1 — basics
  { ch:1, en:'I (neutral)', ja:'わたし', kana:'わたし' },
  { ch:1, en:'yes', ja:'はい', kana:'はい' },
  { ch:1, en:'no', ja:'いいえ', kana:'いいえ' },
  { ch:1, en:'university student', ja:'だいがくせい', kana:'だいがくせい' },
  // CH2 — identity / countries / language
  { ch:2, en:'student', ja:'学生', kana:'がくせい', kanjiNote:'学 = learn / 生 = life' },
  { ch:2, en:'teacher', ja:'先生', kana:'せんせい', kanjiNote:'先 = ahead / 生 = born' },
  { ch:2, en:'Japanese (person)', ja:'日本人', kana:'にほんじん', kanjiNote:'日 = sun / 本 = origin / 人 = person' },
  { ch:2, en:'Japan', ja:'日本', kana:'にほん' },
  { ch:2, en:'America', ja:'アメリカ', kana:'アメリカ' },
  { ch:2, en:'Japanese language', ja:'日本語', kana:'にほんご', kanjiNote:'語 = language' },
  { ch:2, en:'name', ja:'なまえ', kana:'なまえ' },
  { ch:2, en:'major / specialty', ja:'せんもん', kana:'せんもん' },
  { ch:2, en:'this person (polite)', ja:'こちら', kana:'こちら' },
  { ch:2, en:'who?', ja:'だれ', kana:'だれ' },
  { ch:2, en:'what?', ja:'なに / なん', kana:'なに / なん' },
  // CH3 — time / school / activities
  { ch:3, en:'now', ja:'いま', kana:'いま' },
  { ch:3, en:'morning', ja:'あさ', kana:'あさ' },
  { ch:3, en:'evening', ja:'ばん', kana:'ばん' },
  { ch:3, en:'every day', ja:'まいにち', kana:'まいにち' },
  { ch:3, en:'school', ja:'学校', kana:'がっこう', kanjiNote:'校 = school building' },
  { ch:3, en:'home', ja:'うち', kana:'うち' },
  { ch:3, en:'to eat', ja:'食べる', kana:'たべる', kanjiNote:'食 = food/eat' },
  { ch:3, en:'to drink', ja:'飲む', kana:'のむ', kanjiNote:'飲 = drink' },
  { ch:3, en:'to read', ja:'読む', kana:'よむ', kanjiNote:'読 = read' },
  { ch:3, en:'to see / watch', ja:'見る', kana:'みる', kanjiNote:'見 = see' },
  { ch:3, en:'to study', ja:'べんきょうする', kana:'べんきょうする' },
  { ch:3, en:'to wake up / get up', ja:'おきる', kana:'おきる' },
  { ch:3, en:'to sleep / go to bed', ja:'ねる', kana:'ねる' },
  { ch:3, en:'often', ja:'よく', kana:'よく' },
  { ch:3, en:'sometimes', ja:'ときどき', kana:'ときどき' },
  { ch:3, en:'not much (+neg)', ja:'あまり', kana:'あまり' },
  { ch:3, en:'not at all (+neg)', ja:'ぜんぜん', kana:'ぜんぜん' },
  // CH4 — places / location
  { ch:4, en:'station', ja:'駅', kana:'えき', kanjiNote:'駅 = station' },
  { ch:4, en:'library', ja:'図書館', kana:'としょかん' },
  { ch:4, en:'bank', ja:'銀行', kana:'ぎんこう' },
  { ch:4, en:'hospital', ja:'病院', kana:'びょういん' },
  { ch:4, en:'restaurant', ja:'レストラン', kana:'レストラン' },
  { ch:4, en:'park', ja:'公園', kana:'こうえん' },
  { ch:4, en:'in front of', ja:'まえ', kana:'まえ' },
  { ch:4, en:'behind', ja:'うしろ', kana:'うしろ' },
  { ch:4, en:'on / above', ja:'上', kana:'うえ', kanjiNote:'上 = up' },
  { ch:4, en:'under / below', ja:'下', kana:'した', kanjiNote:'下 = down' },
  { ch:4, en:'inside', ja:'中', kana:'なか', kanjiNote:'中 = middle' },
  { ch:4, en:'next to (same kind)', ja:'となり', kana:'となり' },
  { ch:4, en:'beside (any direction)', ja:'よこ', kana:'よこ' },
  { ch:4, en:'right', ja:'右', kana:'みぎ', kanjiNote:'右 = right' },
  { ch:4, en:'left', ja:'左', kana:'ひだり', kanjiNote:'左 = left' },
  // CH5 — home / things / adjectives
  { ch:5, en:'house / room', ja:'うち / へや', kana:'うち / へや' },
  { ch:5, en:'apartment', ja:'アパート', kana:'アパート' },
  { ch:5, en:'bed', ja:'ベッド', kana:'ベッド' },
  { ch:5, en:'desk', ja:'机', kana:'つくえ', kanjiNote:'机 = desk' },
  { ch:5, en:'window', ja:'窓', kana:'まど' },
  { ch:5, en:'big', ja:'大きい', kana:'おおきい', kanjiNote:'大 = big' },
  { ch:5, en:'small', ja:'小さい', kana:'ちいさい', kanjiNote:'小 = small' },
  { ch:5, en:'expensive / tall', ja:'高い', kana:'たかい', kanjiNote:'高 = high' },
  { ch:5, en:'cheap / inexpensive', ja:'安い', kana:'やすい', kanjiNote:'安 = peaceful/cheap' },
  { ch:5, en:'new', ja:'新しい', kana:'あたらしい', kanjiNote:'新 = new' },
  { ch:5, en:'old (not new)', ja:'古い', kana:'ふるい', kanjiNote:'古 = old' },
  { ch:5, en:'pretty / clean (na-adj)', ja:'きれい', kana:'きれい' },
  { ch:5, en:'quiet (na-adj)', ja:'しずか', kana:'しずか' },
  { ch:5, en:'lively (na-adj)', ja:'にぎやか', kana:'にぎやか' },
  { ch:5, en:'famous (na-adj)', ja:'ゆうめい', kana:'ゆうめい' },
  { ch:5, en:'good', ja:'いい', kana:'いい', kanjiNote:'irregular conjugation — uses よ-stem' },
  // CH6 — weekend / weather / activities
  { ch:6, en:'weekend', ja:'しゅうまつ', kana:'しゅうまつ' },
  { ch:6, en:'weather', ja:'天気', kana:'てんき', kanjiNote:'天 = sky / 気 = spirit' },
  { ch:6, en:'movie', ja:'えいが', kana:'えいが' },
  { ch:6, en:'friend', ja:'ともだち', kana:'ともだち' },
  { ch:6, en:'to listen', ja:'聞く', kana:'きく', kanjiNote:'聞 = listen' },
  { ch:6, en:'to write', ja:'書く', kana:'かく', kanjiNote:'書 = write' },
  { ch:6, en:'to speak', ja:'話す', kana:'はなす', kanjiNote:'話 = talk' },
  { ch:6, en:'to play (have fun)', ja:'あそぶ', kana:'あそぶ' },
  { ch:6, en:'to swim', ja:'およぐ', kana:'およぐ' },
  { ch:6, en:'to wait', ja:'まつ', kana:'まつ' },
  { ch:6, en:'to buy', ja:'かう', kana:'かう' },
  { ch:6, en:'to take (photo)', ja:'とる', kana:'とる' },
  { ch:6, en:'fun (na-adj)', ja:'たのしい', kana:'たのしい' },
  { ch:6, en:'hot (weather, i-adj)', ja:'あつい', kana:'あつい' },
  { ch:6, en:'cold (weather, i-adj)', ja:'さむい', kana:'さむい' },
];
VOCAB.forEach((v,i)=>{
  const slug = 'v'+(i+1).toString().padStart(3,'0');
  // Recall: English → Japanese (production)
  push({
    id: slug+'_recall', type:'recall', ch:v.ch,
    prompt: v.en,
    answer: v.ja, kana: v.kana, en: v.en,
    mnem: {
      sentence: v.ja + ' ('+v.en+')',
      kanji: v.kanjiNote || null,
    },
    weight: 1.0,
  });
  // Recognition: Japanese → English
  push({
    id: slug+'_recog', type:'recognition', ch:v.ch,
    prompt: v.ja, promptKana: v.kana,
    answer: v.en, kana: v.kana,
    mnem: {
      sentence: v.ja + ' = '+v.en,
      kanji: v.kanjiNote || null,
    },
    weight: 0.6,
  });
  // Listening prep: kana-only → meaning. Kanji output optional Ch1-4, required Ch5+.
  push({
    id: slug+'_listen', type:'listening', ch:v.ch,
    prompt: v.kana,
    answer: (v.ch>=5 && v.ja!==v.kana) ? (v.ja+' / '+v.en) : v.en,
    en: v.en, kana: v.kana, ja: v.ja,
    mnem: {
      sentence: v.kana + ' ('+v.en+')',
      kanji: v.kanjiNote || null,
    },
    weight: 0.7,
  });
});

/* =========================================================
   2) PARTICLE INSERTION — fill-in-the-blank
   ========================================================= */
const PARTICLES = [
  { ch:3, prompt:'7じ___おきます。', answer:'に', why:'Specific clock time → に', particles:['に','で','を','と','の','も','へ'] },
  { ch:3, prompt:'がっこう___いきます。', answer:'に', why:'Goal/destination of motion → に (へ also OK)', alt:['へ'] },
  { ch:3, prompt:'うち___ばんごはん___たべます。', answer:'で を', multi:true, parts:[
    {blank:'1', answer:'で', why:'Place of action → で'},
    {blank:'2', answer:'を', why:'Direct object marker → を'}
  ] },
  { ch:3, prompt:'バス___がっこう___いきます。', answer:'で に', multi:true, parts:[
    {blank:'1', answer:'で', why:'Means/method → で'},
    {blank:'2', answer:'に', why:'Goal of motion → に'}
  ] },
  { ch:3, prompt:'コーヒー___のみます。', answer:'を', why:'Direct object → を', particles:['に','で','を','と','の','も'] },
  { ch:4, prompt:'えき___まえ___ぎんこう___あります。', multi:true, parts:[
    {blank:'1', answer:'の', why:'Modifier (location noun) → の'},
    {blank:'2', answer:'に', why:'Existence location → に'},
    {blank:'3', answer:'が', why:'New info subject (with あります) → が'},
  ] },
  { ch:4, prompt:'ともだち___あいました。', answer:'に', why:'Recipient/target (one-way) → に. と would mean a mutual prearranged meeting.', particles:['に','で','を','と'] },
  { ch:4, prompt:'はし___たべます。', answer:'で', why:'Tool/means → で', particles:['に','で','を','と'] },
  { ch:5, prompt:'つくえ___上___本___あります。', multi:true, parts:[
    {blank:'1', answer:'の', why:'Modifier (X の Y) → の'},
    {blank:'2', answer:'に', why:'Existence location → に'},
    {blank:'3', answer:'が', why:'New info subject → が'},
  ] },
  { ch:5, prompt:'ねこ___います。', answer:'が', why:'New info / existence → が (います always takes が)', particles:['に','で','を','と','の','も','が','は'] },
  { ch:6, prompt:'えいが___みませんか。', answer:'を', why:'Direct object → を (みる takes を)', particles:['に','で','を','と'] },
  { ch:6, prompt:'ともだち___いっしょに あそびました。', answer:'と', why:'"Together with" mutual partner → と', particles:['に','で','を','と'] },
  { ch:5, prompt:'スミスさん___本です。', answer:'の', why:'Possession → の', particles:['に','で','を','と','の','も'] },
  { ch:3, prompt:'9じ___5じ___べんきょうします。', multi:true, parts:[
    {blank:'1', answer:'から', why:'From (start) → から'},
    {blank:'2', answer:'まで', why:'Until (end) → まで'},
  ] },
  { ch:5, prompt:'わたし___アメリカじん___です。', multi:true, parts:[
    {blank:'1', answer:'は', why:'Topic (already known: I) → は'},
    {blank:'2', answer:'(none — just です)', why:'No particle before です in copula', skip:true},
  ] },
  { ch:6, prompt:'にほんご___はなしました。', answer:'で', why:'Means (using Japanese to speak) → で', particles:['に','で','を','と'] },
  { ch:5, prompt:'スーパー___あります。', answer:'に', why:'Location of existence → に', particles:['に','で','を','と'] },
  { ch:3, prompt:'ともだち___はなします。', answer:'と', why:'Mutual conversation → と (に would mean speaking AT them)', particles:['に','で','を','と'] },
  { ch:5, prompt:'つくえ___上に ペン___あります。', multi:true, parts:[
    {blank:'1', answer:'の', why:'Position word always preceded by の → つくえの 上'},
    {blank:'2', answer:'が', why:'New info subject → が'},
  ] },
  { ch:5, prompt:'これ___わたし___ほんです。', multi:true, parts:[
    {blank:'1', answer:'は', why:'Topic → は'},
    {blank:'2', answer:'の', why:'Possession → の'},
  ] },
];
PARTICLES.forEach((p,i)=>{
  const id = 'p'+(i+1).toString().padStart(3,'0');
  push({
    id, type:'particle', ch:p.ch,
    prompt: p.prompt, answer: p.answer, why: p.why,
    multi: p.multi, parts: p.parts || null,
    mnem: {
      trap: 'Frequency adverbs (よく/ときどき/あまり/ぜんぜん) NEVER take a particle.',
      sentence: 'Octopus に: time / goal / existence / recipient / purpose / into. Toolbox で: place of action / means / duration to complete.',
    },
    weight: 1.1,
  });
});

/* =========================================================
   3) は vs が — context discrimination
   ========================================================= */
const WAGA = [
  { ch:2, ctx:'You are introducing yourself for the first time.', prompt:'わたし___ジョンです。', answer:'は', why:'Topic-marking — introducing self (already known referent → は).' },
  { ch:4, ctx:'You suddenly spot a cat.', prompt:'あ、ねこ___います!', answer:'が', why:'New info / sudden spotting → が. Plus います always takes が.' },
  { ch:2, ctx:'Asking who is going.', prompt:'だれ___いきますか。', answer:'が', why:'Question word as subject → ALWAYS が (never は).' },
  { ch:5, ctx:'You like Japanese (preferences).', prompt:'にほんご___すきです。', answer:'が', why:'GAS-WAD verbs (すき・きらい・あります・います・わかる・できる) take が.' },
  { ch:3, ctx:'Speaking about yourself as the topic again.', prompt:'わたし___まいにち べんきょうします。', answer:'は', why:'Already-established topic → は.' },
  { ch:5, ctx:'Identifying which one it is.', prompt:'これ___わたしの ほんです。', answer:'は', why:'Topic ("as for this") → は.' },
  { ch:4, ctx:'Pointing out what exists in a place.', prompt:'えきの まえに ぎんこう___あります。', answer:'が', why:'New info appearing on the scene + あります → が.' },
  { ch:5, ctx:'Contrasting two things.', prompt:'コーヒー___すきですが、おちゃ___きらいです。', answer:'は…は', why:'Both clauses use は for contrast: コーヒー<strong>は</strong>…おちゃ<strong>は</strong>…' },
  { ch:6, ctx:'Asking what was good.', prompt:'なに___よかったですか。', answer:'が', why:'Question word as subject → が.' },
  { ch:5, ctx:'Describing your room as the topic.', prompt:'わたしの へや___きれいです。', answer:'は', why:'Topic statement → は.' },
  { ch:5, ctx:'Saying your friend is good at Japanese.', prompt:'ともだち___にほんご___じょうずです。', answer:'は…が', why:'Topic は + ability subject が (じょうず is GAS-WAD adjacent).' },
  { ch:6, ctx:'You had a fun weekend (telling someone).', prompt:'しゅうまつ___たのしかったです。', answer:'は', why:'Topic of conversation → は (referencing already known time period).' },
];
WAGA.forEach((w,i)=>{
  const id='wg'+(i+1).toString().padStart(3,'0');
  push({
    id, type:'wa_ga', ch:w.ch,
    ctx: w.ctx, prompt:w.prompt, answer:w.answer, why:w.why,
    mnem: {
      trap: 'Question word as subject → が ALWAYS (never は).',
      sentence: 'は = "Here\'s the topic" (known) · が = "Got new info" (new/spotted/identifies).',
      related: ['GAS-WAD: あります・います・すき・きらい・わかる・できる all take が']
    },
    weight: 1.2,
  });
});

/* =========================================================
   4) VERB CONJUGATION — ます ⇄ ません ⇄ ました ⇄ ませんでした
   ========================================================= */
const VERB_CONJ = [
  { ch:3, dict:'たべる (eat)', target:'present affirmative polite', answer:'たべます' },
  { ch:3, dict:'たべる (eat)', target:'present negative polite', answer:'たべません' },
  { ch:3, dict:'たべる (eat)', target:'past affirmative polite', answer:'たべました' },
  { ch:3, dict:'たべる (eat)', target:'past negative polite', answer:'たべませんでした' },
  { ch:3, dict:'のむ (drink)', target:'present negative polite', answer:'のみません' },
  { ch:3, dict:'のむ (drink)', target:'past affirmative polite', answer:'のみました' },
  { ch:3, dict:'いく (go)', target:'past negative polite', answer:'いきませんでした' },
  { ch:3, dict:'みる (see)', target:'past affirmative polite', answer:'みました' },
  { ch:3, dict:'する (do)', target:'present affirmative polite', answer:'します' },
  { ch:3, dict:'くる (come)', target:'past affirmative polite', answer:'きました' },
  { ch:3, dict:'よむ (read)', target:'past negative polite', answer:'よみませんでした' },
  { ch:3, dict:'おきる (wake up)', target:'present negative polite', answer:'おきません' },
  { ch:3, dict:'ねる (sleep)', target:'past affirmative polite', answer:'ねました' },
  { ch:6, dict:'かく (write)', target:'past affirmative polite', answer:'かきました' },
  { ch:6, dict:'はなす (speak)', target:'past affirmative polite', answer:'はなしました' },
  { ch:6, dict:'まつ (wait)', target:'present negative polite', answer:'まちません' },
  { ch:6, dict:'あそぶ (play)', target:'past affirmative polite', answer:'あそびました' },
  { ch:6, dict:'およぐ (swim)', target:'past negative polite', answer:'およぎませんでした' },
];
VERB_CONJ.forEach((v,i)=>{
  const id='vc'+(i+1).toString().padStart(3,'0');
  push({
    id, type:'verb_conj', ch:v.ch,
    prompt: v.dict + '\n→ ' + v.target,
    answer: v.answer,
    mnem: {
      chain: 'たべる → たべます → たべました → たべません → たべませんでした',
      trap: 'Past negative is ～ませんでした (not ませんかった!)',
      sentence: 'Same swap pattern works for ALL polite verbs.',
    },
    weight: 1.3,
  });
});

/* =========================================================
   5) ADJECTIVE CONJUGATION — i-adj + na-adj 4-form
   ========================================================= */
const ADJ_CONJ = [
  { ch:5, base:'たかい (expensive)', type:'i', target:'present negative', answer:'たかくないです / たかくありません' },
  { ch:5, base:'たかい (expensive)', type:'i', target:'past affirmative', answer:'たかかったです' },
  { ch:5, base:'たかい (expensive)', type:'i', target:'past negative', answer:'たかくなかったです / たかくありませんでした' },
  { ch:5, base:'おおきい (big)', type:'i', target:'past affirmative', answer:'おおきかったです' },
  { ch:5, base:'あたらしい (new)', type:'i', target:'past negative', answer:'あたらしくなかったです' },
  { ch:5, base:'いい (good)', type:'i', target:'past affirmative', answer:'よかったです', irreg:true },
  { ch:5, base:'いい (good)', type:'i', target:'present negative', answer:'よくないです', irreg:true },
  { ch:5, base:'いい (good)', type:'i', target:'past negative', answer:'よくなかったです', irreg:true },
  { ch:5, base:'しずか (quiet, na)', type:'na', target:'present negative', answer:'しずかじゃないです / しずかじゃありません' },
  { ch:5, base:'しずか (quiet, na)', type:'na', target:'past affirmative', answer:'しずかでした' },
  { ch:5, base:'しずか (quiet, na)', type:'na', target:'past negative', answer:'しずかじゃなかったです' },
  { ch:5, base:'きれい (pretty, na)', type:'na', target:'past affirmative', answer:'きれいでした' },
  { ch:5, base:'きれい (pretty, na)', type:'na', target:'past negative', answer:'きれいじゃなかったです' },
  { ch:6, base:'たのしい (fun, i)', type:'i', target:'past affirmative', answer:'たのしかったです' },
];
ADJ_CONJ.forEach((a,i)=>{
  const id='ac'+(i+1).toString().padStart(3,'0');
  push({
    id, type:'adj_conj', ch:a.ch,
    prompt: a.base + '\n→ ' + a.target,
    answer: a.answer,
    mnem: {
      chain: a.type==='i'
        ? 'い-adj: drop い + (くない / かった / くなかった). Keep です unchanged.'
        : 'な-adj: conjugate です itself: です / じゃないです / でした / じゃなかったです.',
      trap: a.irreg ? 'いい uses よ-stem: よかった / よくない / よくなかった. NEVER いかった ❌' : (a.type==='i' ? 'Past negative is くなかった, NOT くないでした.' : 'NA-ninja: きれい・ゆうめい・りっぱ look い, conjugate な.'),
      sentence: a.type==='i' ? 'Modifies noun directly: たかい ほん.' : 'Modifies noun with な: しずかな へや.',
    },
    weight: 1.3,
  });
});

/* =========================================================
   6) COUNTERS — focus on irregular sound changes
   ========================================================= */
const COUNTERS = [
  { ch:3, prompt:'1 minute', answer:'いっぷん', counter:'分', irreg:true },
  { ch:3, prompt:'3 minutes', answer:'さんぷん', counter:'分', irreg:true },
  { ch:3, prompt:'6 minutes', answer:'ろっぷん', counter:'分', irreg:true },
  { ch:3, prompt:'8 minutes', answer:'はっぷん', counter:'分', irreg:true },
  { ch:3, prompt:'10 minutes', answer:'じゅっぷん (or じっぷん)', counter:'分', irreg:true },
  { ch:3, prompt:'4 o\'clock', answer:'よじ', counter:'時', irreg:true },
  { ch:3, prompt:'7 o\'clock', answer:'しちじ', counter:'時', irreg:true },
  { ch:3, prompt:'9 o\'clock', answer:'くじ', counter:'時', irreg:true },
  { ch:5, prompt:'1 person', answer:'ひとり', counter:'人', irreg:true },
  { ch:5, prompt:'2 people', answer:'ふたり', counter:'人', irreg:true },
  { ch:5, prompt:'3 people', answer:'さんにん', counter:'人' },
  { ch:5, prompt:'4 people', answer:'よにん', counter:'人' },
  { ch:5, prompt:'1 long-thin object (本)', answer:'いっぽん', counter:'本', irreg:true },
  { ch:5, prompt:'3 long-thin objects', answer:'さんぼん', counter:'本', irreg:true },
  { ch:5, prompt:'6 long-thin objects', answer:'ろっぽん', counter:'本', irreg:true },
  { ch:5, prompt:'8 long-thin objects', answer:'はっぽん', counter:'本', irreg:true },
];
COUNTERS.forEach((c,i)=>{
  const id='ct'+(i+1).toString().padStart(3,'0');
  push({
    id, type:'counter', ch:c.ch,
    prompt: c.prompt, answer: c.answer,
    counter: c.counter,
    mnem: {
      chain: c.counter==='分' ? '1ぷん・3ぷん・6ぷん・8ぷん・10ぷん all become ぷん (small つ + ぷ)'
            : c.counter==='時' ? 'Time uses し/しち/く NOT よん/なな/きゅう for 4・7・9'
            : c.counter==='人' ? 'ひとり・ふたり are unique. From 3+, regular: さんにん, よにん…'
            : c.counter==='本' ? '1・3・6・8・10 trigger sound shifts: いっぽん・さんぼん・ろっぽん・はっぽん・じゅっぽん'
            : '',
      trap: 'Don\'t default to "regular" reading. Counter sound shifts are tested heavily on the exam.',
    },
    weight: 1.4,
  });
});

/* =========================================================
   7) HIRAGANA / KATAKANA recognition
   ========================================================= */
const KANA = [
  // Hiragana basics
  { ch:1, prompt:'は', answer:'ha', script:'hiragana' },
  { ch:1, prompt:'を', answer:'wo (always particle)', script:'hiragana' },
  { ch:1, prompt:'へ', answer:'he (or "e" as particle)', script:'hiragana' },
  // Dakuten
  { ch:2, prompt:'が', answer:'ga (dakuten)', script:'hiragana' },
  { ch:2, prompt:'ざ', answer:'za (dakuten)', script:'hiragana' },
  { ch:2, prompt:'だ', answer:'da (dakuten)', script:'hiragana' },
  // Handakuten
  { ch:2, prompt:'ぱ', answer:'pa (handakuten)', script:'hiragana' },
  { ch:2, prompt:'ぴ', answer:'pi (handakuten)', script:'hiragana' },
  // Glides
  { ch:2, prompt:'きゃ', answer:'kya (glide)', script:'hiragana' },
  { ch:2, prompt:'しゅ', answer:'shu (glide)', script:'hiragana' },
  { ch:2, prompt:'ちょ', answer:'cho (glide)', script:'hiragana' },
  // Small つ
  { ch:2, prompt:'がっこう', answer:'gakkou (small っ doubles next consonant)', script:'hiragana' },
  // Katakana — confusion pairs
  { ch:2, prompt:'シ', answer:'shi (strokes sweep ↗ UP)', script:'katakana' },
  { ch:2, prompt:'ツ', answer:'tsu (strokes sweep ↘ DOWN)', script:'katakana' },
  { ch:2, prompt:'ソ', answer:'so (single stroke ↘ down)', script:'katakana' },
  { ch:2, prompt:'ン', answer:'n (single stroke ↗ up)', script:'katakana' },
  { ch:2, prompt:'コーヒー', answer:'koohii (long ー dash = long vowel)', script:'katakana' },
  { ch:2, prompt:'スーパー', answer:'suupaa', script:'katakana' },
];
KANA.forEach((k,i)=>{
  const id='kn'+(i+1).toString().padStart(3,'0');
  push({
    id, type:'kana', ch:k.ch,
    prompt: k.prompt, answer: k.answer, script: k.script,
    mnem: {
      trap: k.script==='katakana' ? 'シ vs ツ — angle of strokes is the only tell. ソ vs ン — ソ goes down, ン goes up.' : 'Particles は/を/へ keep their kana spelling but pronounce as wa/o/e.',
      sentence: k.script==='katakana' ? 'Long vowels: katakana uses ー dash. Hiragana doubles the vowel (おかあさん) or uses い/う (せんせい/がっこう).' : null,
    },
    weight: 0.9,
  });
});

/* =========================================================
   8) DEMONSTRATIVES こ/そ/あ/ど
   ========================================================= */
const DEMO = [
  { ch:4, prompt:'Near me, alone ("this one")', answer:'これ' },
  { ch:4, prompt:'Near you, alone ("that one")', answer:'それ' },
  { ch:4, prompt:'Over there, alone', answer:'あれ' },
  { ch:4, prompt:'Which one?', answer:'どれ' },
  { ch:4, prompt:'Near me + noun ("this book")', answer:'この本' },
  { ch:4, prompt:'Near you + noun ("that book")', answer:'その本' },
  { ch:4, prompt:'Over there + noun', answer:'あの本' },
  { ch:4, prompt:'Place near me', answer:'ここ' },
  { ch:4, prompt:'Place over there', answer:'あそこ' },
  { ch:4, prompt:'Where? (place)', answer:'どこ' },
];
DEMO.forEach((d,i)=>{
  const id='dm'+(i+1).toString().padStart(3,'0');
  push({
    id, type:'demo', ch:d.ch,
    prompt: d.prompt, answer: d.answer,
    mnem: {
      sentence: 'これ/それ/あれ stand alone. この/その/あの MUST be followed by a noun. ここ/そこ/あそこ are places.',
      trap: '❌ あこ → ✅ あそこ (irregular). And: ❌ あのの ❌ — pronoun の cannot follow この/その/あの.',
    },
    weight: 1.1,
  });
});

/* =========================================================
   9) i-adj vs na-adj classifier
   ========================================================= */
const I_NA = [
  { ch:5, word:'たかい (expensive)', answer:'i', why:'Ends in い after consonant — true い-adj.' },
  { ch:5, word:'おおきい (big)', answer:'i', why:'Ends in い — true い-adj.' },
  { ch:5, word:'いい (good)', answer:'i', why:'い-adj (irregular: uses よ-stem when conjugating).' },
  { ch:5, word:'しずか (quiet)', answer:'na', why:'No い ending → な-adj. Modifies as: しずかな へや.' },
  { ch:5, word:'にぎやか (lively)', answer:'na', why:'な-adj. Modifies as: にぎやかな まち.' },
  { ch:5, word:'きれい (pretty)', answer:'na', why:'⚠ NA-NINJA: ends in い but is な-adj. Cucumber crew きゆり.' },
  { ch:5, word:'ゆうめい (famous)', answer:'na', why:'⚠ NA-NINJA: ends in い but is な-adj. (きゆり)' },
  { ch:5, word:'りっぱ (splendid)', answer:'na', why:'⚠ NA-NINJA: looks like a な-adj that ends in い? Actually ends in ぱ. Final cucumber.' },
  { ch:6, word:'たのしい (fun)', answer:'i', why:'Ends in い — true い-adj.' },
  { ch:6, word:'げんき (healthy)', answer:'na', why:'な-adj. Modifies: げんきな ひと.' },
];
I_NA.forEach((x,i)=>{
  const id='in'+(i+1).toString().padStart(3,'0');
  push({
    id, type:'i_na', ch:x.ch,
    prompt: x.word + '\n→ い-adj or な-adj?',
    answer: x.answer==='i' ? 'い-adjective' : 'な-adjective',
    why: x.why,
    options: ['い-adjective', 'な-adjective'],
    correctIdx: x.answer==='i' ? 0 : 1,
    mnem: {
      trap: 'きゆり = cucumber: きれい・ゆうめい・りっぱ look い, conjugate な.',
      sentence: 'い-adj attaches raw (大きいうち). な-adj inserts な (きれいなうち).',
    },
    weight: 1.2,
  });
});

/* =========================================================
  10) て-form CONVERSION
   ========================================================= */
const TE_FORM = [
  { ch:6, dict:'たべる (eat)', answer:'たべて', rule:'る-verb: drop る + て' },
  { ch:6, dict:'みる (see)', answer:'みて', rule:'る-verb: drop る + て' },
  { ch:6, dict:'のむ (drink)', answer:'のんで', rule:'む/ぶ/ぬ → んで' },
  { ch:6, dict:'よむ (read)', answer:'よんで', rule:'む/ぶ/ぬ → んで' },
  { ch:6, dict:'あそぶ (play)', answer:'あそんで', rule:'む/ぶ/ぬ → んで' },
  { ch:6, dict:'かう (buy)', answer:'かって', rule:'う/つ/る → って' },
  { ch:6, dict:'まつ (wait)', answer:'まって', rule:'う/つ/る → って' },
  { ch:6, dict:'とる (take)', answer:'とって', rule:'う/つ/る → って' },
  { ch:6, dict:'かく (write)', answer:'かいて', rule:'く → いて' },
  { ch:6, dict:'きく (listen)', answer:'きいて', rule:'く → いて' },
  { ch:6, dict:'およぐ (swim)', answer:'およいで', rule:'ぐ → いで' },
  { ch:6, dict:'はなす (speak)', answer:'はなして', rule:'す → して' },
  { ch:6, dict:'する (do)', answer:'して', rule:'irregular: する → して' },
  { ch:6, dict:'くる (come)', answer:'きて', rule:'irregular: くる → きて' },
  { ch:6, dict:'いく (go)', answer:'いって ⚠', rule:'EXCEPTION: いく → いって (NOT いいて). Forced into う/つ/る pattern.' },
];
TE_FORM.forEach((t,i)=>{
  const id='te'+(i+1).toString().padStart(3,'0');
  push({
    id, type:'te_form', ch:t.ch,
    prompt: t.dict + '\n→ て-form',
    answer: t.answer, why: t.rule,
    mnem: {
      chain: 'う/つ/る → って · む/ぶ/ぬ → んで · く → いて · ぐ → いで · す → して · る-verb: drop+て',
      trap: '⚠ いく → いって (only exception). する → して. くる → きて.',
      sentence: 'Mnemonic: "Utter" = う/つ/る all become って.  "MooBNoo" = む/ぶ/ぬ all become んで.',
    },
    weight: 1.4,
  });
});

/* =========================================================
  11) て-form CHAINING
   ========================================================= */
const TE_CHAIN = [
  { ch:6, prompt:'Connect: たべる + ねる ("eat, then sleep")', answer:'たべて、ねます', why:'First verb in て-form, last verb conjugates.' },
  { ch:6, prompt:'Connect: べんきょうする + テレビをみる', answer:'べんきょうして、テレビを みます', why:'する → して chains forward.' },
  { ch:6, prompt:'Connect: おおきい (big) + あたらしい (new) → "big and new"', answer:'おおきくて、あたらしいです', why:'い-adj → drop い + くて.' },
  { ch:6, prompt:'Connect: しずか (quiet, na) + きれい (pretty, na)', answer:'しずかで、きれいです', why:'な-adj → adj + で chain.' },
  { ch:6, prompt:'Connect: いい (good) + やすい (cheap)', answer:'よくて、やすいです', why:'いい is irregular → よくて (NOT いくて).' },
  { ch:6, prompt:'Connect: 学生 (student, noun) + アメリカ人', answer:'学生で、アメリカ人です', why:'Noun + で chain (same as な-adj).' },
];
TE_CHAIN.forEach((t,i)=>{
  const id='tc'+(i+1).toString().padStart(3,'0');
  push({
    id, type:'te_chain', ch:t.ch,
    prompt: t.prompt, answer: t.answer, why: t.why,
    mnem: {
      chain: 'Verb て-form · い-adj → くて · な-adj/noun → で',
      trap: 'いい → よくて (NEVER いくて). Last clause carries the tense — others stay neutral.',
    },
    weight: 1.3,
  });
});

/* =========================================================
  12) に vs で — location particle
   ========================================================= */
const NI_DE = [
  { ch:3, prompt:'I study at the library.', sentence:'としょかん___べんきょうします。', answer:'で', why:'Action happening at place → で.' },
  { ch:4, prompt:'There\'s a book on the desk.', sentence:'つくえの 上___本___あります。', answer:'に・が', why:'Existence/location → に. Subject of あります → が.' },
  { ch:3, prompt:'I eat at home.', sentence:'うち___ごはんを たべます。', answer:'で', why:'Action location → で.' },
  { ch:4, prompt:'A cat is in the park.', sentence:'こうえん___ねこが います。', answer:'に', why:'Existence with います → に.' },
  { ch:3, prompt:'I go to school.', sentence:'がっこう___いきます。', answer:'に (or へ)', why:'Goal/destination → に.' },
  { ch:6, prompt:'I drink coffee at the cafe.', sentence:'カフェ___コーヒーを のみます。', answer:'で', why:'Action location → で.' },
  { ch:4, prompt:'My desk is in my room.', sentence:'わたしの へや___つくえが あります。', answer:'に', why:'Static existence → に.' },
  { ch:6, prompt:'I bought a book at the bookstore.', sentence:'ほんや___本を かいました。', answer:'で', why:'Action location → で.' },
];
NI_DE.forEach((n,i)=>{
  const id='nd'+(i+1).toString().padStart(3,'0');
  push({
    id, type:'ni_de', ch:n.ch,
    prompt: n.prompt + '\n' + n.sentence,
    answer: n.answer, why: n.why,
    options: ['に', 'で'],
    correctIdx: n.answer.startsWith('に') ? 0 : 1,
    mnem: {
      sentence: 'Action happening? → で. Just existing? → に. (Plus motion goal → に.)',
      trap: 'あります/います take に for location. Action verbs (たべる/のむ/する/かう) take で for location.',
    },
    weight: 1.3,
  });
});

/* =========================================================
  13) Frequency adverb negative trap
   ========================================================= */
const FREQ = [
  { ch:3, sentence:'あまり テレビを みます。', answer:'WRONG', fix:'あまり みません', why:'あまり requires a negative verb.' },
  { ch:3, sentence:'ぜんぜん おさけを のみません。', answer:'CORRECT', why:'ぜんぜん + negative verb = grammatical.' },
  { ch:3, sentence:'よく テレビを みます。', answer:'CORRECT', why:'よく works with any verb form.' },
  { ch:3, sentence:'ぜんぜん べんきょうします。', answer:'WRONG', fix:'ぜんぜん べんきょうしません', why:'ぜんぜん requires negative.' },
  { ch:3, sentence:'よくに がっこうへ いきます。', answer:'WRONG', fix:'よく がっこうへ いきます (drop に)', why:'Frequency adverbs NEVER take a particle.' },
  { ch:3, sentence:'ときどき コーヒーを のみます。', answer:'CORRECT', why:'ときどき + any verb form is fine.' },
];
FREQ.forEach((f,i)=>{
  const id='fr'+(i+1).toString().padStart(3,'0');
  push({
    id, type:'freq', ch:f.ch,
    prompt: f.sentence + '\n→ Grammatical?',
    answer: f.answer + (f.fix ? ' — fix: '+f.fix : ''),
    why: f.why,
    options: ['CORRECT', 'WRONG'],
    correctIdx: f.answer==='CORRECT' ? 0 : 1,
    mnem: {
      trap: 'あまり / ぜんぜん REQUIRE negative verb form.',
      sentence: 'Frequency adverbs (よく・ときどき・たいてい・あまり・ぜんぜん) take NO particle.',
    },
    weight: 1.2,
  });
});

/* =========================================================
  14) ごろ vs ぐらい/くらい
   ========================================================= */
const GORO = [
  { ch:3, prompt:'7じ___おきます。 (around 7 o\'clock)', answer:'ごろ', why:'Point in time (clock) → ごろ.', options:['ごろ','ぐらい'], correctIdx:0 },
  { ch:5, prompt:'3じかん___べんきょうしました。 (about 3 hours)', answer:'ぐらい/くらい', why:'Duration → ぐらい (interchangeable with くらい).', options:['ごろ','ぐらい/くらい'], correctIdx:1 },
  { ch:5, prompt:'えきまで 30ぷん___かかります。 (about 30 min)', answer:'ぐらい/くらい', why:'Duration of time → ぐらい.', options:['ごろ','ぐらい/くらい'], correctIdx:1 },
  { ch:3, prompt:'12じ___ひるごはんを たべます。 (around noon)', answer:'ごろ', why:'Clock time point → ごろ.', options:['ごろ','ぐらい'], correctIdx:0 },
  { ch:5, prompt:'5にん___きました。 (about 5 people)', answer:'ぐらい/くらい', why:'Quantity → ぐらい.', options:['ごろ','ぐらい/くらい'], correctIdx:1 },
  { ch:3, prompt:'2じかん___ですか? (around 2 o\'clock?)', answer:'ごろ', why:'Trick: 2じ (point) needs ごろ. NOT 2じかん (duration).', options:['ごろ','ぐらい'], correctIdx:0 },
];
GORO.forEach((g,i)=>{
  const id='gg'+(i+1).toString().padStart(3,'0');
  push({
    id, type:'goro_gurai', ch:g.ch,
    prompt: g.prompt, answer: g.answer, why: g.why,
    options: g.options, correctIdx: g.correctIdx,
    mnem: {
      sentence: 'ごろ = approx POINT in time (clock). ぐらい/くらい = approx DURATION or QUANTITY.',
      trap: '❌ 3じかんごろ ❌ ❌ 7じぐらいに ❌ — distinguish duration vs point.',
    },
    weight: 1.2,
  });
});

/* =========================================================
  15) Double particle (にも・では・までは…)
   ========================================================= */
const DBL = [
  { ch:5, base:'コーヒーを のみます。', op:'change "を" focus to "は" (topic)', answer:'コーヒーは のみます。', why:'は REPLACES を/が (kicks them out).' },
  { ch:5, base:'ラボで べんきょうしました。', op:'add も "also at the lab"', answer:'ラボでも べんきょうしました。', why:'も STACKS after で → でも.' },
  { ch:5, base:'ともだちから でんわが ありました。', op:'add も "also from a friend"', answer:'ともだちからも でんわが ありました。', why:'も STACKS after から → からも.' },
  { ch:5, base:'がっこうに いきます。', op:'add は (topic)', answer:'がっこうには いきます (or がっこうは)', why:'に + は STACKS as には (or に may drop).' },
  { ch:5, base:'えきまで あるきます。', op:'add も', answer:'えきまでも あるきます。', why:'まで + も → までも.' },
];
DBL.forEach((d,i)=>{
  const id='dp'+(i+1).toString().padStart(3,'0');
  push({
    id, type:'dbl_particle', ch:d.ch,
    prompt: d.base + '\nTransform: ' + d.op,
    answer: d.answer, why: d.why,
    mnem: {
      sentence: 'は/も REPLACE を/が. They STACK AFTER に/で/から/まで.',
      trap: 'は/も = "top-layer paint." Covers を/が, sits on top of others.',
    },
    weight: 1.3,
  });
});

/* =========================================================
  16) ませんか — invitation discriminator
   ========================================================= */
const MASENKA = [
  { ch:6, prompt:'いっしょに えいがを みませんか。\n(spoken to a friend on Friday)', answer:'invitation', why:'いっしょに ("together") + ませんか = INVITATION → "Won\'t you watch a movie with me?"' },
  { ch:6, prompt:'コーヒーを のみませんか?\n(at a cafe with someone)', answer:'invitation', why:'Polite invitation → "Won\'t you have coffee?"' },
  { ch:6, prompt:'おさけを のみませんか?\n(asking if they DON\'T drink alcohol)', answer:'real negative question', why:'Without context, ますか-form polite negative question. Real situations rare — usually invitation.' },
  { ch:6, prompt:'A: しゅうまつ なにを しますか?\nB: ともだちと あそびませんか?', answer:'invitation', why:'B is responding with a counter-invitation: "Why don\'t we hang out together?"' },
  { ch:6, prompt:'たべませんか — said while pointing at food on the table', answer:'invitation', why:'Polite offer/invitation: "Won\'t you eat (some)?"' },
];
MASENKA.forEach((m,i)=>{
  const id='mk'+(i+1).toString().padStart(3,'0');
  push({
    id, type:'masenka', ch:m.ch,
    prompt: m.prompt, answer: m.answer, why: m.why,
    options: ['invitation', 'real negative question'],
    correctIdx: m.answer==='invitation' ? 0 : 1,
    mnem: {
      sentence: 'ませんか most often = polite invitation ("won\'t you…"). Translation tells: friendly context → invite. Hostile context → real negative question.',
      trap: 'Don\'t translate as "you don\'t eat?" — translate as "won\'t you eat (with me)?"',
    },
    weight: 1.1,
  });
});

/* =========================================================
  17) Question word match
   ========================================================= */
const QWORD = [
  { ch:2, prompt:'なに / なん', answer:'thing / topic (what?)', why:'Asks for an inanimate or general "what."' },
  { ch:2, prompt:'だれ', answer:'person (who?)', why:'Question word for people. Can be subject (だれが) or object (だれを/に).' },
  { ch:4, prompt:'どこ', answer:'place (where?)', why:'Asks about location/place.' },
  { ch:4, prompt:'どれ', answer:'pick from a set ("which one?")', why:'Stand-alone — choose among several.' },
  { ch:5, prompt:'どんな', answer:'description / what kind?', why:'どんな + noun = "what kind of [noun]?"' },
  { ch:3, prompt:'いつ', answer:'time / when?', why:'Asks for a time. NO particle に on いつ.' },
  { ch:3, prompt:'なんじ', answer:'what time? (clock)', why:'Asks specifically for clock time. Often + に: なんじに?' },
  { ch:6, prompt:'どう', answer:'how / how was it?', why:'Asks for opinion/manner. e.g., 週末は どうでしたか。' },
];
QWORD.forEach((q,i)=>{
  const id='qw'+(i+1).toString().padStart(3,'0');
  push({
    id, type:'qword', ch:q.ch,
    prompt: q.prompt + '\n→ asks for what kind of answer?',
    answer: q.answer, why: q.why,
    mnem: {
      sentence: 'なに → thing · だれ → person · どこ → place · どれ → pick from set · どんな → kind/type · いつ → time · なんじ → clock time · どう → how/manner.',
      trap: 'Question word as subject → ALWAYS が (never は). Plus いつ/きょう/あした NEVER take に.',
    },
    weight: 1.0,
  });
});

/* =========================================================
  18) Greetings / set phrases by situation
   ========================================================= */
const GREET = [
  { ch:1, situation:'Meeting someone for the first time', answer:'はじめまして。' },
  { ch:1, situation:'Closing a first introduction (formal request to be friends/colleagues)', answer:'よろしく おねがいします。' },
  { ch:1, situation:'Before eating', answer:'いただきます。' },
  { ch:1, situation:'After finishing a meal', answer:'ごちそうさまでした。' },
  { ch:1, situation:'Leaving someone\'s house / office (formal)', answer:'しつれいします。' },
  { ch:1, situation:'Going to bed / saying goodnight', answer:'おやすみなさい。' },
  { ch:1, situation:'Saying "I\'m sorry / excuse me"', answer:'すみません。' },
  { ch:1, situation:'Thanking someone (polite)', answer:'ありがとうございます。' },
];
GREET.forEach((g,i)=>{
  const id='gr'+(i+1).toString().padStart(3,'0');
  push({
    id, type:'greeting', ch:g.ch,
    prompt: 'Situation: ' + g.situation,
    answer: g.answer,
    mnem: {
      trap: 'はじめまして = ONLY first meeting. よろしく = follow-up to はじめまして OR end of self-intro.',
      sentence: 'Set phrases — function-based, not vocabulary. Match the social context.',
    },
    weight: 0.9,
  });
});

/* =========================================================
  19) Dialogue cloze — pulled from chapter dialogues
   ========================================================= */
const CLOZE = [
  { ch:5, prompt:'リーさんの アパートは ___ですか。', context:'(asking what kind of apartment)', answer:'どんな', why:'どんな + noun asks "what kind of."' },
  { ch:6, prompt:'A: 週末は ___でしたか。\nB: たのしかったです。', answer:'どう', why:'どう = how was it?' },
  { ch:4, prompt:'A: このへんに ぎんこう___ありますか。', answer:'が', why:'New info subject + あります → が.' },
  { ch:5, prompt:'うちの まえ___くるまが あります。', answer:'に', why:'Existence location → に.' },
  { ch:3, prompt:'A: なんじに おきますか。\nB: 7じ___おきます。', answer:'に', why:'Specific clock time → に.' },
  { ch:6, prompt:'いっしょに ___ませんか。 (eat together)', answer:'たべ', why:'Verb stem + ませんか = invitation.' },
  { ch:5, prompt:'これは わたし___本です。', answer:'の', why:'Possession → の.' },
  { ch:4, prompt:'えきの まえに こうばん___あります。', answer:'が', why:'New info subject of あります → が.' },
];
CLOZE.forEach((c,i)=>{
  const id='cl'+(i+1).toString().padStart(3,'0');
  push({
    id, type:'cloze', ch:c.ch,
    prompt: c.prompt + (c.context ? '\n'+c.context : ''),
    answer: c.answer, why: c.why,
    mnem: {
      sentence: 'Pulled from chapter dialogues — high-yield. Pay attention to topic vs new info, location particles, and te-form chains.',
    },
    weight: 1.3,
  });
});

/* =========================================================
  20) Sentence transformation
   ========================================================= */
const TRANSFORM = [
  { ch:3, base:'たべます。', op:'past affirmative polite', answer:'たべました。', why:'ます → ました.' },
  { ch:3, base:'いきます。', op:'past negative polite', answer:'いきませんでした。', why:'ます → ませんでした.' },
  { ch:5, base:'たかいです。', op:'past affirmative', answer:'たかかったです。', why:'い-adj past: drop い + かった.' },
  { ch:5, base:'しずかです。', op:'past negative', answer:'しずかじゃなかったです (or じゃありませんでした)', why:'な-adj: で-adj past negative.' },
  { ch:5, base:'いいです。', op:'past affirmative', answer:'よかったです。', why:'いい → よ-stem (irregular). よかった!' },
  { ch:6, base:'たべて、ねます。', op:'change last verb to past', answer:'たべて、ねました。', why:'In て-chain only the last verb carries tense.' },
  { ch:6, base:'のむ。', op:'te-form', answer:'のんで', why:'む → んで.' },
  { ch:6, base:'いく。', op:'te-form', answer:'いって ⚠', why:'EXCEPTION: いく → いって.' },
];
TRANSFORM.forEach((t,i)=>{
  const id='tr'+(i+1).toString().padStart(3,'0');
  push({
    id, type:'transform', ch:t.ch,
    prompt: t.base + '\n→ ' + t.op,
    answer: t.answer, why: t.why,
    mnem: {
      chain: 'verb: ます↔ません↔ました↔ませんでした · い-adj: い→かった/くない/くなかった · な-adj: です→でした/じゃない/じゃなかった',
      trap: 'いい → よかった (NEVER いかった). いく → いって (NEVER いいて).',
    },
    weight: 1.4,
  });
});

/* =========================================================
  21) Adjective + noun ordering
   ========================================================= */
const ADJ_NOUN = [
  { ch:5, prompt:'big house', en:'big + うち', answer:'おおきい うち', why:'い-adj attaches RAW to noun.' },
  { ch:5, prompt:'pretty room', en:'きれい (na) + へや', answer:'きれいな へや', why:'な-adj inserts な before noun.' },
  { ch:5, prompt:'expensive book', en:'たかい + 本', answer:'たかい 本', why:'い-adj attaches raw.' },
  { ch:5, prompt:'quiet park', en:'しずか (na) + こうえん', answer:'しずかな こうえん', why:'な-adj + な + noun.' },
  { ch:5, prompt:'famous restaurant', en:'ゆうめい (na) + レストラン', answer:'ゆうめいな レストラン', why:'⚠ NA-NINJA: ゆうめい looks い but uses な.' },
  { ch:6, prompt:'fun weekend', en:'たのしい + しゅうまつ', answer:'たのしい しゅうまつ', why:'い-adj attaches raw.' },
];
ADJ_NOUN.forEach((a,i)=>{
  const id='an'+(i+1).toString().padStart(3,'0');
  push({
    id, type:'adj_noun', ch:a.ch,
    prompt: 'Build the phrase: ' + a.prompt + '\n('+a.en+')',
    answer: a.answer, why: a.why,
    mnem: {
      sentence: 'い-adj: raw attach (おおきい うち). な-adj: insert な (きれいな へや).',
      trap: 'きゆり cucumber crew (きれい・ゆうめい・りっぱ) attach with な, NOT raw.',
    },
    weight: 1.2,
  });
});

/* =========================================================
  Type metadata — used for reporting + filtering
   ========================================================= */
const TYPE_INFO = {
  recall: { label:'Recall (En→Ja)', color:'#d4af37' },
  recognition: { label:'Recognition (Ja→En)', color:'#5b9bd5' },
  listening: { label:'Listening (kana→meaning)', color:'#b08fd4' },
  particle: { label:'Particle insertion', color:'#f0a040' },
  wa_ga: { label:'は vs が', color:'#e57373' },
  verb_conj: { label:'Verb conjugation', color:'#66bb6a' },
  adj_conj: { label:'Adjective conjugation', color:'#ec9a6f' },
  counter: { label:'Counters', color:'#5dc1c5' },
  kana: { label:'Hiragana / Katakana', color:'#a8c97e' },
  demo: { label:'Demonstratives こ/そ/あ/ど', color:'#9ec0e5' },
  i_na: { label:'い vs な classifier', color:'#e8c84a' },
  te_form: { label:'て-form conversion', color:'#ff8a65' },
  te_chain: { label:'て-form chaining', color:'#ce93d8' },
  ni_de: { label:'に vs で location', color:'#90caf9' },
  freq: { label:'Frequency adverbs', color:'#ffb74d' },
  goro_gurai: { label:'ごろ vs ぐらい', color:'#aed581' },
  dbl_particle: { label:'Double particles', color:'#f48fb1' },
  masenka: { label:'ませんか invitation', color:'#80cbc4' },
  qword: { label:'Question words', color:'#bcaaa4' },
  greeting: { label:'Greetings / set phrases', color:'#fff176' },
  cloze: { label:'Dialogue cloze', color:'#b39ddb' },
  transform: { label:'Sentence transformation', color:'#ffab91' },
  adj_noun: { label:'Adjective + noun ordering', color:'#c5e1a5' },
};

// Normalize: ensure every card has a non-empty `answer` field so the
// renderer + trap generator + TTS always have something to apply.
CARDS.forEach(c => {
  if(c.multi && c.parts && (!c.answer || !c.answer.trim())){
    c.answer = c.parts.map(p => p.blank ? p.blank+':'+p.answer : p.answer).join(' · ');
  }
  if(!c.answer && c.options && typeof c.correctIdx === 'number'){
    c.answer = c.options[c.correctIdx];
  }
  if(!c.answer) c.answer = '(see mnemonic)';
});

window.NAKAMA_CARDS = CARDS;
window.NAKAMA_TYPE_INFO = TYPE_INFO;
})();

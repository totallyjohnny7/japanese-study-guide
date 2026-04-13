// patch-enrich-examples.mjs  (v3 — safe boundaries + rich depth content)
//
// Per-card Vocab Atlas enrichment:
//  • Replaces each card's existing <div class="va-ex"> with a multi-row block
//    showing variations/templates for that grammatical category
//  • For cards with NO existing va-ex (NUMBERS, PREFIXES), inserts a new
//    va-ex in the correct place (end of card-body, before closing </div></div>)
//  • Includes at least one "COMBO" row per card — a rich sentence that weaves
//    multiple parts of speech (nouns + verbs + adjectives + particles) into a
//    single realistic sentence, so students see how the pieces connect.
//
// Uses depth-counted card boundaries so insertions never spill across cards.
// All example sentences are original compositions written using only Nakama 1
// Ch1-6 active vocabulary. Idempotent.

import fs from 'node:fs';
import path from 'node:path';

const FILE = path.join('public', 'index.html');
let html = fs.readFileSync(FILE, 'utf8');
const beforeSize = html.length;
const MARKER = 'VA-EX-ENRICHED-V3';

// ────────────────────────────────────────────────────────────────────────────
// CSS for the enriched tooltip rows (idempotent)
// ────────────────────────────────────────────────────────────────────────────
const TIP_CSS_MARKER = '/* VA-EX-ENRICHED-CSS */';
if (!html.includes(TIP_CSS_MARKER)) {
  const extraCss = `${TIP_CSS_MARKER}
#va-cursor-tip { max-height: 72vh; max-width: min(520px, 92vw); overflow: hidden; }
#va-cursor-tip .va-row { margin: 6px 0; padding: 6px 8px; background: rgba(158,204,255,0.04); border-left: 2px solid #6b5518; border-radius: 4px; }
#va-cursor-tip .va-row.combo { border-left-color: #e2b449; background: rgba(226,180,73,0.08); }
#va-cursor-tip .va-row:first-child { margin-top: 0; }
#va-cursor-tip .va-row b { color: #e2b449; font-size: 9px; letter-spacing: 0.8px; display: block; margin-bottom: 3px; }
#va-cursor-tip .va-row .oe-ja { color: var(--white); font-size: 12px; line-height: 1.5; display: block; }
#va-cursor-tip .va-row .oe-en { color: var(--text-dim); font-size: 10px; display: block; margin-top: 2px; line-height: 1.4; }
`;
  html = html.replace('</style>', extraCss + '</style>');
  console.log('✓ Injected enriched-tooltip CSS (v3)');
}

// ────────────────────────────────────────────────────────────────────────────
// Enriched content per card header. Each entry is an array of rows.
// A row is [label, japanese, english, optional: 'combo' flag].
// COMBO rows are highlighted and show a single rich sentence combining
// multiple parts of speech to demonstrate how the category's items connect
// with the rest of the sentence.
// ────────────────────────────────────────────────────────────────────────────
const ENRICHED = {
  'めいし — NOUNS (common)': [
    ['IDENTIFY', 'わたしは ネブラスカだいがくの がくせいです。', "I'm a student at Nebraska University."],
    ['TOPIC + MAJOR', 'せんこうは けいえいがくです。', 'My major is business administration.'],
    ['NEGATE', 'これは ほんじゃありません。ノートです。', "This isn't a book. It's a notebook."],
    ['POSSESSIVE', 'スミスさんの かばんは くろいです。', "Smith-san's bag is black."],
    ['EXISTENCE', 'へやに つくえと いすが あります。', 'There is a desk and a chair in the room.'],
    ['COMBO — noun + adj + verb', 'あたらしい アパートの おおきい へやに きれいな つくえと くろい いすが あります。', 'In the big room of my new apartment there is a clean desk and a black chair.', 'combo'],
  ],
  'こゆうめいし — PROPER NOUNS': [
    ['PERSON + さん', 'うえださんは にほんじんです。', 'Ueda-san is Japanese.'],
    ['LOCATION + に', 'うえださんは しぶやえきの まえに いました。', 'Ueda was in front of Shibuya Station.'],
    ['ORIGIN', 'わたしは アメリカから きました。', 'I came from America.'],
    ['UNIVERSITY', 'じょうとうだいがくの いちねんせいです。', "I'm a first-year student at Joto University."],
    ['⚠️ NEVER さん TO SELF', '❌ わたしは ブラウンさんです  ✅ わたしは ブラウンです', 'Never attach さん to your own name.'],
    ['COMBO — proper + verb + place', 'リーさんは あした しぶやの あたらしい カフェで うえださんに あいます。', 'Lee-san will meet Ueda-san tomorrow at a new cafe in Shibuya.', 'combo'],
  ],
  'にんしょうだいめいし — PERSONAL PRONOUNS': [
    ['NEUTRAL I', 'わたしは リーです。ちゅうごくじんです。', "I'm Lee. I'm Chinese."],
    ['MALE CASUAL I', 'ぼくは たいてい じてんしゃで いきますよ。', 'I usually go by bicycle.'],
    ['DROP SUBJECT', '(わたしは) がくせいです。', "(I'm) a student. — subject usually dropped."],
    ['⚠️ NEVER あなた', '❌ あなたは どこから きましたか  ✅ [name]さんは どこから きましたか', 'Use name+さん instead of あなた.'],
    ['COMBO — pronoun + time + action', 'ぼくは まいあさ ろくじに おきて、あたらしい しんぶんを よみます。', 'I get up at 6 every morning and read a new newspaper.', 'combo'],
  ],
  'しじだいめいし — DEMONSTRATIVE PRONOUNS (こ・そ・あ・ど)': [
    ['THING NEAR ME', 'これは ほんです。', 'This is a book.'],
    ['THING NEAR YOU', 'それは なんですか。', 'What is that (by you)?'],
    ['THING FAR', 'あれは だいがくですか。', 'Is that (over there) a university?'],
    ['PLACE NEAR ME', 'ここは としょかんです。', 'This (place) is the library.'],
    ['PLACE FAR', 'あそこに たかい ビルが ありますね。', "There's a tall building over there."],
    ['POLITE WHERE', 'おてあらいは どちらですか。', 'Where is the restroom? (polite)'],
    ['WHICH ONE', 'リーさんの かばんは どれですか。', "Which one is Lee-san's bag?"],
    ['COMBO — demo + adj + noun + verb', 'あそこに ある おおきい たてものは ゆうめいな だいがくの としょかんです。', 'The big building over there is the library of a famous university.', 'combo'],
  ],
  'れんたいし — DEMONSTRATIVE ADJECTIVES (この／その／あの／どの)': [
    ['THIS + NOUN', 'この ほんは おもしろいです。', 'This book is interesting.'],
    ['THAT + NOUN (near you)', 'その じしょは だれのですか。', 'Whose dictionary is that (by you)?'],
    ['THAT + NOUN (far)', 'あの アパートは たかい ところに あります。', 'That apartment over there is up high.'],
    ['WHICH + NOUN', 'どの くるまが リーさんのですか。', "Which car is Lee-san's?"],
    ['⚠️ TRAP', '❌ この は ほんです  ✅ これは ほんです / このほんです', 'この needs a noun; これ stands alone.'],
    ['COMBO — demo + adj + noun + predicate', 'この あかるい へやは しずかで、きれいな つくえも あります。', 'This bright room is quiet and also has a clean desk.', 'combo'],
  ],
  'いちめいし — LOCATION NOUNS (Ch5 core)': [
    ['ABOVE', 'つくえの うえに ほんが あります。', 'There is a book on the desk.'],
    ['UNDER', 'ソファの したに ねこが います。', 'There is a cat under the sofa.'],
    ['IN FRONT', 'えきの まえに ぎんこうが あります。', 'There is a bank in front of the station.'],
    ['BEHIND', 'うちの うしろに やまが あります。', 'There is a mountain behind the house.'],
    ['INSIDE', 'かばんの なかに なにが ありますか。', 'What is inside the bag?'],
    ['OUTSIDE', 'まどの そとに きが あります。', 'There is a tree outside the window.'],
    ['NEXT TO (same kind)', 'こうえんの となりに がっこうが あります。', 'There is a school next to the park.'],
    ['BESIDE', 'ベッドの よこに たんすが あります。', 'There is a dresser beside the bed.'],
    ['NEAR', 'アパートは だいがくの ちかくに あります。', 'The apartment is near the university.'],
    ['RIGHT / LEFT', 'ドアの みぎに まどが、ひだりに とけいが あります。', 'A window is right of the door, a clock to the left.'],
    ['COMBO — multi-location', 'つくえの うえに あたらしい ほんが、したに くろい かばんが、となりに ちいさい いすが あります。', 'On the desk is a new book, under it a black bag, and next to it a small chair.', 'combo'],
  ],
  'せっとうじ・じょすうじ — PREFIXES & TITLE SUFFIXES': [
    ['お～ POLITE', 'おなまえは なんですか。', 'What is your name?'],
    ['ご～ POLITE', 'ごりょうしんは おげんきですか。', 'Are your parents well?'],
    ['～さん DEFAULT', 'スミスさんは アメリカじんです。', 'Smith is American.'],
    ['～せんせい', 'たなかせんせいは にほんごの せんせいです。', 'Tanaka-sensei is a Japanese teacher.'],
    ['～ご LANGUAGE', 'リーさんは にほんごと ちゅうごくごを はなします。', 'Lee-san speaks Japanese and Chinese.'],
    ['～じん NATIONALITY', 'ブラウンさんは アメリカじんです。', 'Brown-san is American.'],
    ['～ねん YEAR', 'いちねんせいは じゅぎょうが たくさん あります。', 'First-years have a lot of classes.'],
    ['～や STORE', 'ほんやで あたらしい ほんを かいました。', 'I bought a new book at the bookstore.'],
    ['こん～ THIS', 'こんしゅうは とても いそがしいです。', 'This week is very busy.'],
    ['まい～ EVERY', 'まいにち にほんごを べんきょうします。', 'I study Japanese every day.'],
    ['COMBO — title + nationality + action', 'たなかせんせいは にほんじんで、まいにち りゅうがくせいに にほんごを おしえます。', 'Tanaka-sensei is Japanese and teaches Japanese to international students every day.', 'combo'],
  ],
  'いちだんどうし — る-VERBS (Class 2)': [
    ['PRESENT', 'まいあさ ろくじに おきます。', 'Every morning I wake up at 6.'],
    ['NEGATIVE', 'あさごはんを たべません。', "I don't eat breakfast."],
    ['PAST', 'きのう じゅうじに ねました。', 'Yesterday I went to bed at 10.'],
    ['PAST NEG', 'せんしゅう テレビを みませんでした。', "I didn't watch TV last week."],
    ['て-FORM (connect)', 'ろくじに おきて、あさごはんを たべます。', 'I wake up at 6 and eat breakfast.'],
    ['INVITATION', 'あした えいがを みませんか。', "Won't you watch a movie tomorrow?"],
    ['LET US', 'いっしょに たべましょう。', "Let's eat together."],
    ['EXISTENCE (animate)', 'きょうしつに がくせいが います。', 'There are students in the classroom.'],
    ['COMBO — noun + adj + multiple verbs', 'まいばん じゅうじごろに うちで おいしい ばんごはんを たべて、あたらしい えいがを みて、じゅうにじに ねます。', 'Every night around 10 I eat a delicious dinner at home, watch a new movie, and go to bed at 12.', 'combo'],
  ],
  'ごだんどうし — う-VERBS (Class 1)': [
    ['PRESENT', 'まいばん ほんを よみます。', 'I read a book every night.'],
    ['NEGATIVE', 'コーヒーを のみません。', "I don't drink coffee."],
    ['PAST', 'きのう ぎんこうに いきました。', 'I went to the bank yesterday.'],
    ['て-FORM (regular)', 'うちに かえって、しゅくだいを します。', 'I return home and do homework.'],
    ['⚠️ いく → いって', 'しぶやに いって、コンサートへ いきました。', 'I went to Shibuya and then to a concert.'],
    ['⚠️ FALSE る-verbs', 'かえる, はいる, はしる, きる(切る) are う-verbs', 'Looks る, is う.'],
    ['EXISTENCE (inanimate)', 'つくえの うえに ほんが あります。', 'There is a book on the desk.'],
    ['MEET', 'あした ともだちに あいます。', "I'll meet a friend tomorrow."],
    ['WRITE + LISTEN', 'てがみを かいて、おんがくを ききます。', 'I write a letter and listen to music.'],
    ['COMBO — rich day', 'どようびの あさ、ともだちと しぶやに いって、ちいさい きっさてんで あたらしい ざっしを よんで、あつい コーヒーを のみました。', 'Saturday morning I went to Shibuya with a friend, read a new magazine at a small cafe, and drank hot coffee.', 'combo'],
  ],
  'ふきそくどうし — IRREGULAR VERBS': [
    ['する DO', 'まいにち うんどうを します。', 'I exercise every day.'],
    ['くる COME', 'ともだちが うちに きます。', 'A friend is coming to my house.'],
    ['STUDY', 'しゅうまつは としょかんで べんきょうします。', 'On weekends I study at the library.'],
    ['SHOPPING', 'デパートで かいものを しました。', 'I went shopping at the department store.'],
    ['CLEAN', 'どようびに へやの そうじを します。', 'I clean my room on Saturday.'],
    ['LAUNDRY', 'にちようびに せんたくを します。', 'I do laundry on Sunday.'],
    ['COOK', 'うちで おいしい りょうりを します。', 'I cook delicious food at home.'],
    ['TE-FORM', 'きょうしつに きて、じゅぎょうを します。', 'I come to the classroom and attend class.'],
    ['COMBO — weekend routine', 'しゅうまつは はやく おきて、へやの そうじを して、せんたくを して、ともだちと かいものを しました。', 'This weekend I woke up early, cleaned my room, did laundry, and went shopping with a friend.', 'combo'],
  ],
  'CONJUGATED FORMS — quick reference': [
    ['PRESENT POLITE', 'まいにち にほんごを べんきょうします。', 'I study Japanese every day.'],
    ['NEGATIVE', 'あまり テレビを みません。', "I don't watch TV much."],
    ['PAST', 'きのう おいしい コーヒーを のみました。', 'I drank delicious coffee yesterday.'],
    ['PAST NEG', 'せんしゅう ぜんぜん うんどうを しませんでした。', "I didn't exercise at all last week."],
    ['て + CONNECT', 'しちじに おきて、あさごはんを たべて、がっこうに いきます。', 'I get up at 7, eat breakfast, and go to school.'],
    ['INVITATION', 'こんばん いっしょに ばんごはんを たべませんか。', "Won't you have dinner with me tonight?"],
    ['LET US', 'しゅうまつに あたらしい えいがを みましょう。', "Let's watch a new movie this weekend."],
    ['REQUEST', 'もういちど ゆっくり いってください。', 'Please say it slowly one more time.'],
    ['COMBO — full day', 'きょうは しちじに おきて、あさごはんを たべて、としょかんで べんきょうして、よる ともだちと あたらしい レストランで ばんごはんを たべました。', 'Today I got up at 7, ate breakfast, studied at the library, and had dinner at a new restaurant with a friend in the evening.', 'combo'],
  ],
  'いけいようし — い-ADJECTIVES': [
    ['NON-PAST +', 'この へやは ひろいです。', 'This room is spacious.'],
    ['NON-PAST −', 'この へやは ひろくないです / ひろくありません。', "This room isn't spacious."],
    ['PAST +', 'しゅうまつは とても たのしかったです。', 'The weekend was very fun.'],
    ['PAST −', 'えいがは ぜんぜん おもしろくなかったです。', "The movie wasn't interesting at all."],
    ['BEFORE NOUN', 'おおきい あかい ほんを かいました。', 'I bought a big red book.'],
    ['て-FORM (connect)', 'この へやは ひろくて、あかるくて、あたらしいです。', 'This room is spacious, bright, and new.'],
    ['ADVERB (く)', 'はやく おきて、おそく ねます。', 'I wake up early and go to bed late.'],
    ['⚠️ いい IRREGULAR', 'いい → よかった / よくない / よくて', '"good" uses よ-stem, not い-stem.'],
    ['COMBO — multi-adjective description', 'わたしの あたらしい アパートは ちいさいですが、あかるくて、しずかで、まどから やまが みえる とても いい ところです。', 'My new apartment is small, but it is bright, quiet, and a very good place where you can see mountains from the window.', 'combo'],
  ],
  'なけいようし — な-ADJECTIVES': [
    ['PREDICATE +', 'この としょかんは しずかです。', 'This library is quiet.'],
    ['PREDICATE −', 'この としょかんは しずかじゃありません。', "This library isn't quiet."],
    ['PAST +', 'パーティは とても にぎやかでした。', 'The party was very lively.'],
    ['PAST −', 'しごとは たいへんじゃありませんでした。', "Work wasn't tough."],
    ['BEFORE NOUN (な)', 'しずかな へやで べんきょうします。', 'I study in a quiet room.'],
    ['⚠️ きれい TRAP', '✅ きれいな へや / ✅ きれいでした  ❌ きれかった', 'きれい looks い but is な-adj.'],
    ['FAMOUS', 'ゆうめいな だいがくに いきます。', "I'll go to a famous university."],
    ['COMBO — な-adj + noun + verb', 'リーさんは げんきで、まじめな がくせいで、まいにち しずかな としょかんで にほんごを べんきょうします。', 'Lee-san is energetic and a serious student, and studies Japanese every day at a quiet library.', 'combo'],
  ],
  'コピュラ — COPULA (です family)': [
    ['PRESENT', 'わたしは がくせいです。', "I'm a student."],
    ['PRESENT NEG', 'わたしは せんせいじゃありません。', "I'm not a teacher."],
    ['PAST', 'きのうは にちようびでした。', 'Yesterday was Sunday.'],
    ['PAST NEG', 'しゅうまつは ひまじゃありませんでした。', "The weekend wasn't free."],
    ['WITH NOUN', 'せんこうは こうがくです。', 'My major is engineering.'],
    ['WITH な-ADJ', 'この へやは きれいでした。', 'This room was clean.'],
    ['⚠️ NEVER AFTER い-ADJ', '❌ たかいでした  ✅ たかかったです', 'Use past-い-adj, not です after い-adj.'],
    ['COMBO — chain copula', 'リーさんは ちゅうごくから きた りゅうがくせいで、せんこうは こうがくで、とても げんきな がくせいです。', 'Lee-san is an international student from China; her major is engineering and she is a very energetic student.', 'combo'],
  ],
  'かくじょし — CASE PARTICLES': [
    ['が SUBJECT', 'へやに ねこが います。', 'There is a cat in the room.'],
    ['を OBJECT', 'まいにち しんぶんを よみます。', 'I read the newspaper every day.'],
    ['に TIME', 'しちじに おきます。', 'I get up at 7.'],
    ['に DESTINATION', 'がっこうに いきます。', "I'm going to school."],
    ['に EXISTENCE', 'つくえの うえに ほんが あります。', 'There is a book on the desk.'],
    ['で ACTION LOC', 'としょかんで べんきょうします。', 'I study at the library.'],
    ['で MEANS', 'バスで がっこうに いきます。', 'I go to school by bus.'],
    ['へ DIRECTION', 'うちへ かえります。', "I'm going home."],
    ['と WITH', 'ともだちと えいがを みました。', 'I watched a movie with a friend.'],
    ['と AND (full)', 'ほんと ノートが あります。', 'There are a book and a notebook.'],
    ['から FROM', 'ここから だいがくまで バスで いきます。', 'From here to the university I go by bus.'],
    ['まで UNTIL', 'くじから じゅうじまで じゅぎょうが あります。', 'I have class from 9 to 10.'],
    ['の OF', 'リーさんの かばんは あかいです。', "Lee-san's bag is red."],
    ['⚠️ に vs で', 'へやに います (exist) vs へやで べんきょうします (action)', 'に = where X exists; で = where action happens.'],
    ['COMBO — many particles', 'どようびに ともだちと しぶやの あたらしい カフェで おいしい コーヒーを のんで、さんじから ごじまで ほんを よみました。', 'On Saturday I drank delicious coffee with a friend at a new cafe in Shibuya and read a book from 3 to 5.', 'combo'],
  ],
  'とりたてじょし — TOPIC / FOCUS PARTICLES': [
    ['は TOPIC', 'わたしは がくせいです。', 'As for me, I am a student.'],
    ['は CONTRAST', 'にほんごは やさしいです。ちゅうごくごは むずかしいです。', 'Japanese is easy. Chinese is hard.'],
    ['も ALSO', 'リーさんも だいがくせいです。', 'Lee-san is also a college student.'],
    ['には STACK', 'つくえの うえには ほんが あります。', 'On the desk, there are books.'],
    ['では STACK', 'じてんしゃでは どのくらい かかりますか。', 'By bicycle, how long does it take?'],
    ['にも STACK', 'しゅうまつにも しごとが あります。', 'On weekends too I have work.'],
    ['でも STACK', 'うちでも べんきょうします。', 'At home too I study.'],
    ['⚠️ RULE', 'を/が are REPLACED by は/も; other particles STACK', 'を→は, が→は; に→には, で→では.'],
    ['COMBO — contrast + also', 'わたしは にほんごを べんきょうします。リーさんも にほんごを べんきょうしますが、ちゅうごくごは はなしません。', 'I study Japanese. Lee-san also studies Japanese but does not speak Chinese.', 'combo'],
  ],
  'せつぞくじょし — CONJUNCTIVE PARTICLES': [
    ['が BUT', 'うれしかったですが、いそがしくて たいへんでした。', 'I was happy, but it was busy and tough.'],
    ['から BECAUSE', 'じかんが なかったから、べんきょうしませんでした。', "I didn't have time, so I didn't study."],
    ['て AND (verb)', 'あさ はやく おきて、そうじと せんたくを しました。', 'I got up early and did cleaning and laundry.'],
    ['て AND (い-adj)', 'この へやは ひろくて、あかるいです。', 'This room is spacious and bright.'],
    ['て AND (な-adj)', 'この としょかんは しずかで、きれいです。', 'This library is quiet and clean.'],
    ['て AND (noun)', 'リーさんは がくせいで、ちゅうごくじんです。', 'Lee-san is a student and is Chinese.'],
    ['COMBO — chain everything', 'しゅうまつは しゅくだいが たくさん あったから、あさ はやく おきて、としょかんに いって、ひるまで べんきょうして、ともだちと ごはんを たべました。', 'There was a lot of homework this weekend, so I got up early, went to the library, studied until noon, and ate with a friend.', 'combo'],
  ],
  'しゅうじょし — SENTENCE-FINAL PARTICLES': [
    ['か QUESTION', 'あれは だいがくですか。', 'Is that a university?'],
    ['ね AGREEMENT', 'きょうは いい てんきですね。', "It's nice weather today, isn't it?"],
    ['よ NEW INFO', 'リーさんは ちゅうごくじんですよ。', "Lee-san is Chinese, you know."],
    ['よね CONFIRM', 'じゅぎょうは しちじからですよね。', 'Class is from 7, right?'],
    ['COMBO — in dialogue', '— あの あたらしい レストランは おいしいですね。 — そうですね。でも ちょっと たかいですよ。', '— That new restaurant is delicious, isn\'t it? — Yeah. But it\'s a bit expensive, you know.', 'combo'],
  ],
  'QUOTATION & LISTING': [
    ['と QUOTE', '「はじめまして」と いいます。', 'You say "hajimemashite".'],
    ['と AND (full)', 'つくえの うえに ほんと ノートが あります。', 'On the desk there are a book and a notebook.'],
    ['や PARTIAL', 'スーパーで くだものや やさいを かいました。', 'At the supermarket I bought fruits, vegetables (etc.).'],
    ['⚠️ と vs や', 'AとB = exactly A and B · AやB = A, B, and others', 'と is exhaustive; や is partial.'],
    ['COMBO — list in context', 'きのう デパートで あたらしい ほんや くろい かばんや きれいな ペンを かいました。', 'Yesterday at the department store I bought a new book, a black bag, a pretty pen, and so on.', 'combo'],
  ],
  'ていどのふくし — DEGREE ADVERBS': [
    ['とても + (affirm)', 'この ほんは とても おもしろいです。', 'This book is very interesting.'],
    ['ちょっと A BIT', 'ちょっと いそがしいです。', "I'm a bit busy."],
    ['すこし A LITTLE', 'すこし つかれました。', "I'm a little tired."],
    ['⚠️ あまり + neg', 'あまり テレビを みません。', "I don't watch TV much."],
    ['⚠️ ぜんぜん + neg', 'ぜんぜん わかりません。', "I don't understand at all."],
    ['たくさん A LOT', 'しゅくだいが たくさん あります。', 'I have a lot of homework.'],
    ['COMBO — multiple degrees', 'この あたらしい レストランは とても おいしいですが、ちょっと たかくて、あまり しずかじゃありません。', 'This new restaurant is very delicious, but it\'s a bit expensive and not very quiet.', 'combo'],
  ],
  'ひんどのふくし — FREQUENCY ADVERBS': [
    ['いつも ALWAYS', 'いつも しちじに おきます。', 'I always get up at 7.'],
    ['よく OFTEN', 'よく としょかんで べんきょうします。', 'I often study at the library.'],
    ['たいてい USUALLY', 'たいてい じてんしゃで いきます。', 'I usually go by bicycle.'],
    ['ときどき SOMETIMES', 'ときどき ともだちと えいがを みます。', 'Sometimes I watch movies with a friend.'],
    ['あまり + neg', 'あまり コーヒーを のみません。', "I don't drink coffee much."],
    ['ぜんぜん + neg', 'ぜんぜん テレビを みません。', "I never watch TV."],
    ['⚠️ NO PARTICLE', 'Frequency adverbs sit naked — no は/が/を attached', '—'],
    ['COMBO — daily rhythm', 'わたしは いつも ろくじに おきて、よく としょかんで べんきょうして、ときどき ともだちと ごはんを たべますが、あまり テレビは みません。', 'I always wake up at 6, often study at the library, sometimes eat with friends, but don\'t watch TV much.', 'combo'],
  ],
  'ようたいのふくし — MANNER ADVERBS': [
    ['ゆっくり SLOWLY', 'もうすこし ゆっくり おねがいします。', 'Please speak a little more slowly.'],
    ['はやく EARLY/FAST', 'あさ はやく おきます。', 'I get up early in the morning.'],
    ['おそく LATE', 'きのうは おそく ねました。', 'Yesterday I went to bed late.'],
    ['HOW TO BUILD', 'い-adj drop い → add く: たかい → たかく, おそい → おそく', 'Derive from い-adjectives.'],
    ['COMBO — manner + action', 'きのうは しゅくだいが たくさん あったから、おそく ねて、きょうは おそく おきて、ゆっくり あさごはんを たべました。', 'Yesterday I had a lot of homework so I went to bed late, today I got up late and ate breakfast slowly.', 'combo'],
  ],
  'ぎもんし — QUESTION WORDS': [
    ['なに WHAT', 'あれは なんですか。', 'What is that?'],
    ['だれ WHO', 'あの ひとは だれですか。', 'Who is that person?'],
    ['どこ WHERE', 'ぎんこうは どこに ありますか。', 'Where is the bank?'],
    ['いつ WHEN', 'しけんは いつですか。', 'When is the exam?'],
    ['どう HOW', 'しゅうまつは どうでしたか。', 'How was your weekend?'],
    ['どうして WHY', 'どうして べんきょうしませんでしたか。', "Why didn't you study?"],
    ['いくら HOW $$', 'この ほんは いくらですか。', 'How much is this book?'],
    ['いくつ HOW MANY', 'りんごは いくつ ありますか。', 'How many apples are there?'],
    ['どのくらい DURATION', 'バスで どのくらい かかりますか。', 'How long does it take by bus?'],
    ['どんな WHAT KIND', 'どんな おんがくが すきですか。', 'What kind of music do you like?'],
    ['なんじ WHAT TIME', 'いま なんじですか。', 'What time is it now?'],
    ['⚠️ なに vs なん', 'なに before most particles; なん before で/と/の and counters', 'なんじ, なんにん, なんですか.'],
    ['COMBO — interview', 'あのう すみません、おなまえは なんですか。せんこうは なんですか。どこから きましたか。', 'Um excuse me, what is your name? What is your major? Where did you come from?', 'combo'],
  ],
  'すうし — NUMBERS': [
    ['SINO 1–5', 'いち, に, さん, し/よん, ご', '1, 2, 3, 4, 5'],
    ['SINO 6–10', 'ろく, しち/なな, はち, きゅう/く, じゅう', '6, 7, 8, 9, 10'],
    ['BIG NUMBERS', 'ひゃく (100), せん (1,000), まん (10,000)', '—'],
    ['NATIVE 1–5', 'ひとつ, ふたつ, みっつ, よっつ, いつつ', 'generic one-item counter'],
    ['NATIVE 6–10', 'むっつ, ななつ, やっつ, ここのつ, とお', '—'],
    ['EX: GENERIC', 'りんごを ふたつ ください。', 'Please give me two apples.'],
    ['COMBO — numbers in a sentence', 'この ちいさい きっさてんには いすが ろくつ、つくえが よっつ あって、コーヒーは ごひゃくえんです。', 'This small coffee shop has six chairs and four tables, and coffee is 500 yen.', 'combo'],
  ],
  'じょすうし — COUNTERS': [
    ['PEOPLE', 'ひとり, ふたり, さんにん, よにん, ごにん…', '1, 2 irregular; 3+ regular.'],
    ["O'CLOCK", 'いちじ, よじ⚠️, しちじ⚠️, くじ⚠️', '4/7/9 are irregular.'],
    ['MINUTES', 'いっぷん, にふん, さんぷん, よんぷん, ごふん, ろっぷん, じゅっぷん', 'ぷ sound changes on 1/3/4/6/10.'],
    ['LONG THIN', 'いっぽん, にほん, さんぼん, よんほん, ろっぽん, はっぽん, じゅっぽん', 'ほ/ぼ/ぽ alternation.'],
    ['BOOKS', 'いっさつ, にさつ, さんさつ…', 'counter for books/magazines.'],
    ['YEARS OLD', 'なんさいですか → にじゅっさいです。', 'How old? — I am 20.'],
    ['YEN', 'ごひゃくえんです。', "It's 500 yen."],
    ['EX DURATION', 'バスで にじゅっぷん かかります。', 'It takes 20 minutes by bus.'],
    ['COMBO — counters combined', 'あした さんにんの ともだちと くじに あって、バスで にじゅっぷん いきます。', 'Tomorrow I\'ll meet three friends at 9 and travel 20 minutes by bus.', 'combo'],
  ],
  'じかんめいし — TIME WORDS': [
    ['RELATIVE (no に)', 'きょう, あした, きのう, こんしゅう', 'No particle — sit bare.'],
    ['EVERY (no に)', 'まいにち, まいあさ, まいばん', 'No particle.'],
    ['DAYS OF WEEK (に)', 'げつようびに じゅぎょうが あります。', 'I have class on Monday.'],
    ['SPECIFIC TIME (に)', 'しちじに おきます。', 'I get up at 7.'],
    ['⚠️ ごろ vs ぐらい', 'しちじごろ (point: ~7) · にじかんぐらい (span: ~2 hrs)', "Don't mix."],
    ['EX POINT', 'じゅうにじごろに りょうしんが きました。', 'My parents came around 12.'],
    ['EX SPAN', 'バスで にじゅっぷんぐらい かかります。', 'It takes about 20 minutes by bus.'],
    ['COMBO — weekly rhythm', 'まいしゅう げつようびと すいようびと きんようびの ろくじに ともだちと うんどうを します。', 'Every week on Monday, Wednesday, and Friday at 6 I exercise with friends.', 'combo'],
  ],
  'なんじ — CLOCK HOURS (Ch2)': [
    ['ASK', 'いま なんじですか。', 'What time is it now?'],
    ['ON THE HOUR', 'いま しちじです。', "It's 7 o'clock now."],
    ['HALF PAST', 'いま よじはんです。', "It's 4:30 now."],
    ['TIME + に + ACTION', 'くじに じゅぎょうが あります。', 'I have class at 9.'],
    ['TIME RANGE', 'くじから じゅうじまで じゅぎょうが あります。', 'Class is from 9 to 10.'],
    ['AM / PM', 'ごぜん しちじに おきて、ごご じゅうじに ねます。', 'I wake up at 7 a.m. and go to bed at 10 p.m.'],
    ['⚠️ IRREGULAR', '4=よじ (not よん/し) · 7=しちじ (not なな) · 9=くじ (not きゅう)', 'Memorize these three.'],
    ['COMBO — schedule', 'まいにち ごぜん しちじに おきて、くじから じゅうにじまで じゅぎょうが あって、ごご さんじに うちに かえります。', 'Every day I get up at 7 a.m., have class from 9 to 12, and return home at 3 p.m.', 'combo'],
  ],
  'せつぞくし — CONJUNCTIONS (sentence-starters)': [
    ['そして AND THEN', 'あさごはんを たべました。そして、がっこうに いきました。', 'I ate breakfast. And then I went to school.'],
    ['それから AFTER THAT', 'うちで べんきょうしました。それから、テレビを みました。', 'I studied at home. After that, I watched TV.'],
    ['でも BUT (casual)', 'いそがしかったです。でも、たのしかったです。', 'It was busy. But it was fun.'],
    ['しかし HOWEVER (formal)', 'テストは むずかしかったです。しかし、できました。', 'The test was hard. However, I was able to do it.'],
    ['じゃあ / では', 'じゃあ、また あした。', 'Well then, see you tomorrow.'],
    ['だから / ですから', 'あしたは しけんです。だから、べんきょうします。', "Tomorrow is the exam. So I'll study."],
    ['COMBO — chained story', 'どようびに はやく おきました。そして、としょかんで べんきょうしました。それから、ともだちに あいました。でも、よる いそがしかったから、はやく ねました。', 'Saturday I got up early. Then I studied at the library. After that, I met a friend. But I was busy at night, so I went to bed early.', 'combo'],
  ],
  'かんどうし — INTERJECTIONS': [
    ['はい YES (formal)', 'はい、わかりました。', 'Yes, I understand.'],
    ['いいえ NO (formal)', 'いいえ、わかりません。', "No, I don't understand."],
    ['ええ YES (softer)', 'ええ、そうです。', "Yes, that's right."],
    ['あのう UM/EXCUSE', 'あのう、すみませんが、じかんは ありますか。', 'Um, excuse me — do you have time?'],
    ['えーと THINKING', 'えーと、じゃあ、ろくじに あいましょう。', "Uh, well, let's meet at 6."],
    ['へえ OH WOW', 'へえ、はやいですね。', "Oh wow, that's fast."],
    ['そうですか I SEE', '— リーさんは ちゅうごくじんです。— そうですか。', '— Lee-san is Chinese. — I see.'],
    ['COMBO — natural dialogue', '— あのう、すみません、えきは どこですか。 — ええ、あそこですよ。 — へえ、ちかいですね。どうも ありがとうございます。', '— Um, excuse me, where is the station? — It\'s right over there. — Oh wow, it\'s close. Thank you very much.', 'combo'],
  ],
  'あいさつ — GREETINGS & SET PHRASES': [
    ['MORNING (formal)', 'おはようございます。', 'Good morning.'],
    ['AFTERNOON / HI', 'こんにちは。', 'Good afternoon / Hello.'],
    ['EVENING', 'こんばんは。', 'Good evening.'],
    ['GOODBYE', 'さようなら。', 'Good-bye.'],
    ['SEE YOU LATER', 'じゃあ、また。', 'See you later.'],
    ['EXCUSE ME / LEAVING', 'しつれいします。', "Excuse me. / I'll be going now."],
    ['SORRY / ATTENTION', 'すみません。', "Excuse me / I'm sorry."],
    ['THANK YOU (formal)', 'どうも ありがとう ございます。', 'Thank you very much.'],
    ["YOU'RE WELCOME", 'どういたしまして。', "You're welcome."],
    ['FIRST MEETING', 'はじめまして。リーです。どうぞ よろしく。', "How do you do? I'm Lee. Pleased to meet you."],
    ['AT MEALTIME', 'いただきます。／ごちそうさまでした。', 'Thanks for the meal (before / after).'],
    ['VISITING (Ch5)', 'ごめんください。— いらっしゃい。どうぞ あがってください。— おじゃまします。', 'Anyone home? — Welcome, please come in. — Thank you.'],
    ['COMBO — full introduction', 'はじめまして。わたしは アメリカから きた りゅうがくせいの ブラウンです。せんこうは にほんごです。どうぞ よろしく おねがいします。', 'How do you do? I\'m Brown, an international student from America. My major is Japanese. Pleased to meet you.', 'combo'],
  ],
  'きょうしつのことば — CLASSROOM REQUESTS (Ch1)': [
    ['PLEASE SAY IT', 'もういちど いってください。', 'Please say it again.'],
    ['PLEASE SLOWLY', 'もうすこし ゆっくり おねがいします。', 'Please speak a little more slowly.'],
    ['PLEASE WRITE', 'かいてください。', 'Please write.'],
    ['PLEASE READ', 'よんでください。', 'Please read.'],
    ['PLEASE LISTEN', 'きいてください。', 'Please listen.'],
    ['PLEASE LOOK', 'みてください。', 'Please look.'],
    ['DO YOU UNDERSTAND', 'わかりましたか。', 'Do you understand?'],
    ['HOW DO YOU SAY', 'これは にほんごで なんと いいますか。', 'How do you say this in Japanese?'],
    ['WHAT DOES ~ MEAN', '「〜」って なんですか。', 'What does "~" mean?'],
    ['PATTERN', 'Verb-て + ください = polite request; verb-stem + おねがいします = student-side form', '—'],
    ['COMBO — classroom moment', 'あのう、すみません、せんせい。「しゅくだい」って なんですか。もういちど ゆっくり いってください。', 'Um, excuse me, sensei. What does "shukudai" mean? Please say it slowly one more time.', 'combo'],
  ],
  'くに — COUNTRIES (Ch2)': [
    ['I AM X NATIONALITY', 'わたしは アメリカじんです。', 'I am American.'],
    ['CAME FROM X', 'わたしは カナダから きました。', 'I came from Canada.'],
    ['WHERE FROM', 'スミスさんは どこから きましたか。', 'Where did Smith-san come from?'],
    ['POLITE WHERE FROM', 'どちらから いらっしゃいましたか。', 'Where are you from? (polite)'],
    ['LANGUAGE', 'にほんごと えいごを はなします。', 'I speak Japanese and English.'],
    ['PROFILE', 'リーさんは ちゅうごくじんです。じょうとうだいがくの さんねんせいです。', 'Lee-san is Chinese. She is a junior at Joto University.'],
    ['COMBO — full profile', 'わたしは アメリカから きた いちねんせいで、せんこうは にほんごです。まいにち ちゅうごくごも べんきょうします。', 'I am a first-year student from America and my major is Japanese. I also study Chinese every day.', 'combo'],
  ],
  'せんこう — MAJORS & ACADEMIC (Ch2)': [
    ['ASK NAME', 'おなまえは なんですか。', 'What is your name?'],
    ['ASK MAJOR', 'せんこうは なんですか。', 'What is your major?'],
    ['TELL MAJOR', 'せんこうは こうがくです。', 'My major is engineering.'],
    ['YEAR IN SCHOOL', 'いちねんせいです。', 'I am a freshman.'],
    ['UNIVERSITY + YEAR', 'じょうとうだいがくの にねんせいです。', 'I am a sophomore at Joto University.'],
    ['INTERNATIONAL STUDENT', 'わたしは りゅうがくせいです。', 'I am an international student.'],
    ['INTRODUCE', 'こちらは リーさんです。だいがくいんせいです。', 'This is Lee-san. She is a graduate student.'],
    ['COMBO — full academic profile', 'こちらは リーさんです。じょうとうだいがくの さんねんせいで、せんこうは けいえいがくです。ちゅうごくから きた りゅうがくせいです。', 'This is Lee-san. She is a junior at Joto University majoring in business administration. She is an international student from China.', 'combo'],
  ],
};

// ────────────────────────────────────────────────────────────────────────────
// Safe per-card boundary helpers
// ────────────────────────────────────────────────────────────────────────────

/** Find the end of a <div class="card"> block that starts at cardStart, by counting depth. Returns the index AT the closing tag of the card. */
function findCardEndIdx(s, cardStart) {
  const openPat = /<div\b[^>]*>/g;
  const closePat = /<\/div>/g;
  let i = cardStart + '<div class="card">'.length;
  let depth = 1;
  while (depth > 0) {
    openPat.lastIndex = i;
    closePat.lastIndex = i;
    const o = openPat.exec(s);
    const c = closePat.exec(s);
    if (!c) return -1;
    if (o && o.index < c.index) { depth++; i = o.index + o[0].length; }
    else { depth--; i = c.index + c[0].length; if (depth === 0) return c.index; }
  }
  return -1;
}

/** Within [start,end), find the FIRST <div class="va-ex"> and its matching closing </div>. Returns [openStart, closeEnd] or null. */
function findVaExRange(s, start, end) {
  const openIdx = s.indexOf('<div class="va-ex"', start);
  if (openIdx === -1 || openIdx >= end) return null;
  const openTagEnd = s.indexOf('>', openIdx) + 1;
  let i = openTagEnd;
  let depth = 1;
  const openPat = /<div\b[^>]*>/g;
  const closePat = /<\/div>/g;
  while (depth > 0) {
    openPat.lastIndex = i;
    closePat.lastIndex = i;
    const o = openPat.exec(s);
    const c = closePat.exec(s);
    if (!c || c.index >= end) return null;
    if (o && o.index < c.index && o.index < end) { depth++; i = o.index + o[0].length; }
    else { depth--; i = c.index + c[0].length; }
  }
  return [openIdx, i];
}

/** Find the end of the card-body (the closing </div> of <div class="card-body">) within a card. */
function findCardBodyEndIdx(s, cardStart, cardEnd) {
  const bodyStart = s.indexOf('<div class="card-body">', cardStart);
  if (bodyStart === -1 || bodyStart >= cardEnd) return -1;
  const bodyTagEnd = bodyStart + '<div class="card-body">'.length;
  let i = bodyTagEnd;
  let depth = 1;
  const openPat = /<div\b[^>]*>/g;
  const closePat = /<\/div>/g;
  while (depth > 0 && i < cardEnd + 20) {
    openPat.lastIndex = i;
    closePat.lastIndex = i;
    const o = openPat.exec(s);
    const c = closePat.exec(s);
    if (!c) return -1;
    if (o && o.index < c.index) { depth++; i = o.index + o[0].length; }
    else { depth--; i = c.index + c[0].length; if (depth === 0) return c.index; }
  }
  return -1;
}

function buildRichVaEx(rows) {
  const inner = rows.map(row => {
    const [label, ja, en, flag] = row;
    const cls = flag === 'combo' ? 'va-row combo' : 'va-row';
    return `<div class="${cls}"><b>${label}</b><span class="oe-ja">${ja}</span><span class="oe-en">${en}</span></div>`;
  }).join('');
  return `<div class="va-ex" data-enriched="${MARKER}">${inner}</div>`;
}

// ────────────────────────────────────────────────────────────────────────────
// Iterate cards within the Vocab Atlas panel, last-to-first, enriching or
// inserting va-ex as needed
// ────────────────────────────────────────────────────────────────────────────
const panelStart = html.indexOf('<div class="chapter-panel" id="panel_ref-vocab">');
const panelEndScan = html.indexOf('<div class="chapter-panel"', panelStart + 100);
const panelEnd = panelEndScan === -1 ? html.length : panelEndScan;

const cardStarts = [];
let scan = panelStart;
while (true) {
  const idx = html.indexOf('<div class="card">', scan);
  if (idx === -1 || idx >= panelEnd) break;
  cardStarts.push(idx);
  scan = idx + 1;
}
console.log(`Found ${cardStarts.length} cards in Vocab Atlas`);

let enriched = 0, inserted = 0, skipped = 0, notFound = 0;

for (let k = cardStarts.length - 1; k >= 0; k--) {
  const cardStart = cardStarts[k];
  const cardCloseIdx = findCardEndIdx(html, cardStart);
  if (cardCloseIdx === -1) continue;
  const cardSlice = html.slice(cardStart, cardCloseIdx);
  const headerMatch = cardSlice.match(/<div class="card-header"[^>]*>([^<]+)<\/div>/);
  if (!headerMatch) continue;
  const header = headerMatch[1].replace(/&amp;/g, '&').trim();
  if (!(header in ENRICHED)) continue;
  const rows = ENRICHED[header];
  const richVaEx = buildRichVaEx(rows);

  // Try to REPLACE an existing va-ex inside this card
  const vaRange = findVaExRange(html, cardStart, cardCloseIdx);
  if (vaRange) {
    const [vaStart, vaEnd] = vaRange;
    const existing = html.slice(vaStart, vaEnd);
    if (existing.includes(`data-enriched="${MARKER}"`)) {
      skipped++;
      console.log(`  ⊘ "${header}" — already enriched`);
      continue;
    }
    html = html.slice(0, vaStart) + richVaEx + html.slice(vaEnd);
    enriched++;
    console.log(`  ✓ "${header}" — enriched (${rows.length} rows)`);
  } else {
    // INSERT: place the new va-ex right before the closing </div> of card-body
    const bodyEnd = findCardBodyEndIdx(html, cardStart, cardCloseIdx);
    if (bodyEnd === -1) {
      notFound++;
      console.warn(`  ✗ "${header}" — could not find card-body end`);
      continue;
    }
    html = html.slice(0, bodyEnd) + '\n' + richVaEx + '\n' + html.slice(bodyEnd);
    inserted++;
    console.log(`  + "${header}" — inserted (${rows.length} rows)`);
  }
}

fs.writeFileSync(FILE, html);
console.log(`\n✓ Wrote ${FILE}`);
console.log(`  Enriched: ${enriched}, Inserted: ${inserted}, Skipped: ${skipped}, Not found: ${notFound}`);
console.log(`  Size: ${beforeSize} → ${html.length} bytes (${html.length - beforeSize > 0 ? '+' : ''}${html.length - beforeSize})`);

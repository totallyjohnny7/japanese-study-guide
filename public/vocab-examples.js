/* ============================================================
   VOCAB EXAMPLES DATABASE — Nakama 1 Ch 1–6
   - Single source of truth for: per-word example sentences
     (Vocab Atlas tooltips) + particle-finder vocab.
   - Each entry: {jp, h, r, e, ch, t, ex_jp, ex_en}
     jp  = headword (kanji or kana)
     h   = hiragana reading
     r   = romaji
     e   = english
     ch  = chapter
     t   = type for particle rules
            (noun-person | noun-place | noun-thing | noun-food
           | noun-time   | noun-abstract | noun-language
           | noun-means  | verb-motion | verb-trans | verb-comm
           | verb-exist  | verb-cog    | verb-emotion | verb-intrans
           | adj-i | adj-na | expr | demonstr | counter | particle
           | suffix | adv | qword)
     ex_jp = example sentence in Japanese
     ex_en = English translation
   ============================================================ */
(function(){
'use strict';
if(window.VOCAB_DB) return;

const V = [
/* ─── PEOPLE / PRONOUNS ─────────────────────────────────────── */
{jp:'がくせい',h:'がくせい',r:'gakusei',e:'student',ch:2,t:'noun-person',ex_jp:'わたしは大学のがくせいです。',ex_en:'I am a university student.'},
{jp:'せんせい',h:'せんせい',r:'sensei',e:'teacher',ch:2,t:'noun-person',ex_jp:'たなかせんせいはやさしいです。',ex_en:'Tanaka-sensei is kind.'},
{jp:'だいがくせい',h:'だいがくせい',r:'daigakusei',e:'university student',ch:2,t:'noun-person',ex_jp:'スミスさんはだいがくせいです。',ex_en:'Smith is a university student.'},
{jp:'だいがくいんせい',h:'だいがくいんせい',r:'daigakuinsei',e:'graduate student',ch:2,t:'noun-person',ex_jp:'あにはだいがくいんせいです。',ex_en:'My older brother is a graduate student.'},
{jp:'りゅうがくせい',h:'りゅうがくせい',r:'ryuugakusei',e:'international student',ch:2,t:'noun-person',ex_jp:'リーさんはちゅうごくからのりゅうがくせいです。',ex_en:'Lee-san is an international student from China.'},
{jp:'いちねんせい',h:'いちねんせい',r:'ichinensei',e:'1st-year (freshman)',ch:2,t:'noun-person',ex_jp:'わたしはいちねんせいです。',ex_en:'I am a freshman.'},
{jp:'にねんせい',h:'にねんせい',r:'ninensei',e:'2nd-year (sophomore)',ch:2,t:'noun-person',ex_jp:'たなかさんはにねんせいです。',ex_en:'Tanaka is a sophomore.'},
{jp:'さんねんせい',h:'さんねんせい',r:'sannensei',e:'3rd-year (junior)',ch:2,t:'noun-person',ex_jp:'あには大学のさんねんせいです。',ex_en:'My brother is a university junior.'},
{jp:'よねんせい',h:'よねんせい',r:'yonensei',e:'4th-year (senior)',ch:2,t:'noun-person',ex_jp:'あねはよねんせいです。',ex_en:'My sister is a senior.'},
{jp:'ともだち',h:'ともだち',r:'tomodachi',e:'friend',ch:6,t:'noun-person',ex_jp:'ともだちといっしょにえいがをみました。',ex_en:'I watched a movie with a friend.'},
{jp:'りょうしん',h:'りょうしん',r:'ryoushin',e:'parents',ch:6,t:'noun-person',ex_jp:'らいしゅうりょうしんがきます。',ex_en:'My parents are coming next week.'},
{jp:'ひと',h:'ひと',r:'hito',e:'person',ch:5,t:'noun-person',ex_jp:'あのひとはだれですか。',ex_en:'Who is that person?'},
{jp:'こ',h:'こ',r:'ko',e:'child',ch:5,t:'noun-person',ex_jp:'こうえんに小さいこがいます。',ex_en:'There is a small child in the park.'},
{jp:'いぬ',h:'いぬ',r:'inu',e:'dog',ch:5,t:'noun-person',ex_jp:'うちにいぬがいます。',ex_en:'There is a dog at my house.'},
{jp:'ねこ',h:'ねこ',r:'neko',e:'cat',ch:5,t:'noun-person',ex_jp:'ねこがすきです。',ex_en:'I like cats.'},
{jp:'わたし',h:'わたし',r:'watashi',e:'I (neutral)',ch:1,t:'noun-person',ex_jp:'わたしはアメリカ人です。',ex_en:'I am American.'},
{jp:'ぼく',h:'ぼく',r:'boku',e:'I (male, casual)',ch:2,t:'noun-person',ex_jp:'ぼくはがくせいです。',ex_en:"I'm a student."},
{jp:'あなた',h:'あなた',r:'anata',e:'you',ch:2,t:'noun-person',ex_jp:'あなたのなまえはなんですか。',ex_en:'What is your name? (avoid — use name+さん)'},
{jp:'かれ',h:'かれ',r:'kare',e:'he / boyfriend',ch:2,t:'noun-person',ex_jp:'かれはせんせいです。',ex_en:'He is a teacher.'},
{jp:'かのじょ',h:'かのじょ',r:'kanojo',e:'she / girlfriend',ch:2,t:'noun-person',ex_jp:'かのじょはがくせいです。',ex_en:'She is a student.'},
{jp:'こちら',h:'こちら',r:'kochira',e:'this person, this way',ch:2,t:'noun-person',ex_jp:'こちらはたなかさんです。',ex_en:'This is Tanaka-san.'},
/* ─── PROPER NAMES ─────────────────────────────────────── */
{jp:'たなかさん',h:'たなかさん',r:'tanaka-san',e:'Tanaka',ch:2,t:'noun-person',ex_jp:'たなかさんはにほん人です。',ex_en:'Tanaka is Japanese.'},
{jp:'スミスさん',h:'スミスさん',r:'sumisu-san',e:'Mr/Ms Smith',ch:2,t:'noun-person',ex_jp:'スミスさんはアメリカからきました。',ex_en:'Smith came from America.'},
{jp:'うえださん',h:'うえださん',r:'ueda-san',e:'Ms Ueda',ch:2,t:'noun-person',ex_jp:'うえださんはしぶやでまっています。',ex_en:'Ueda is waiting in Shibuya.'},
{jp:'リーさん',h:'リーさん',r:'rii-san',e:'Mr Li',ch:2,t:'noun-person',ex_jp:'リーさんはちゅうごくのりゅうがくせいです。',ex_en:'Lee is an international student from China.'},
{jp:'にほん',h:'にほん',r:'nihon',e:'Japan',ch:2,t:'noun-place',ex_jp:'らいねんにほんへ行きたいです。',ex_en:'I want to go to Japan next year.'},
{jp:'にほんじん',h:'にほんじん',r:'nihonjin',e:'Japanese (person)',ch:2,t:'noun-person',ex_jp:'たなかさんはにほんじんです。',ex_en:'Tanaka is Japanese.'},
{jp:'とうきょう',h:'とうきょう',r:'toukyou',e:'Tokyo',ch:2,t:'noun-place',ex_jp:'とうきょうはとてもにぎやかです。',ex_en:'Tokyo is very lively.'},
{jp:'アメリカ',h:'アメリカ',r:'amerika',e:'America',ch:2,t:'noun-place',ex_jp:'アメリカからきました。',ex_en:'I came from America.'},
{jp:'カナダ',h:'カナダ',r:'kanada',e:'Canada',ch:2,t:'noun-place',ex_jp:'かれはカナダ人です。',ex_en:'He is Canadian.'},
{jp:'メキシコ',h:'メキシコ',r:'mekishiko',e:'Mexico',ch:2,t:'noun-place',ex_jp:'メキシコのりょうりがすきです。',ex_en:'I like Mexican cuisine.'},
{jp:'イギリス',h:'イギリス',r:'igirisu',e:'England',ch:2,t:'noun-place',ex_jp:'イギリスにすんでいます。',ex_en:'I live in England.'},
{jp:'フランス',h:'フランス',r:'furansu',e:'France',ch:2,t:'noun-place',ex_jp:'フランスご(語)をべんきょうします。',ex_en:'I study French.'},
{jp:'スペイン',h:'スペイン',r:'supein',e:'Spain',ch:2,t:'noun-place',ex_jp:'スペインへ行きました。',ex_en:'I went to Spain.'},
{jp:'オーストラリア',h:'オーストラリア',r:'oosutoraria',e:'Australia',ch:2,t:'noun-place',ex_jp:'オーストラリアはおおきいです。',ex_en:'Australia is big.'},
{jp:'ちゅうごく',h:'ちゅうごく',r:'chuugoku',e:'China',ch:2,t:'noun-place',ex_jp:'ちゅうごくのりゅうがくせいです。',ex_en:"I'm an international student from China."},
{jp:'かんこく',h:'かんこく',r:'kankoku',e:'South Korea',ch:2,t:'noun-place',ex_jp:'かんこくりょうりがすきです。',ex_en:'I like Korean food.'},
{jp:'たいわん',h:'たいわん',r:'taiwan',e:'Taiwan',ch:2,t:'noun-place',ex_jp:'たいわんからきました。',ex_en:'I came from Taiwan.'},
{jp:'じょうとうだいがく',h:'じょうとうだいがく',r:'jootoo-daigaku',e:'Joto University',ch:2,t:'noun-place',ex_jp:'じょうとうだいがくのいちねんせいです。',ex_en:'I am a freshman at Joto University.'},
{jp:'しぶや',h:'しぶや',r:'shibuya',e:'Shibuya',ch:4,t:'noun-place',ex_jp:'しぶやでかいものをします。',ex_en:'I shop in Shibuya.'},
{jp:'なまえ',h:'なまえ',r:'namae',e:'name',ch:2,t:'noun-thing',ex_jp:'おなまえはなんですか。',ex_en:'What is your name?'},
/* ─── PLACES ─────────────────────────────────────── */
{jp:'だいがく',h:'だいがく',r:'daigaku',e:'university',ch:2,t:'noun-place',ex_jp:'まいにちだいがくへ行きます。',ex_en:'I go to university every day.'},
{jp:'がっこう',h:'がっこう',r:'gakkou',e:'school',ch:3,t:'noun-place',ex_jp:'7じにがっこうへ行きます。',ex_en:'I go to school at 7.'},
{jp:'こうこう',h:'こうこう',r:'koukou',e:'high school',ch:2,t:'noun-place',ex_jp:'いもうとはこうこうのいちねんせいです。',ex_en:'My sister is a high-school freshman.'},
{jp:'うち',h:'うち',r:'uchi',e:'home',ch:3,t:'noun-place',ex_jp:'5じにうちへかえります。',ex_en:'I return home at 5.'},
{jp:'いえ',h:'いえ',r:'ie',e:'house',ch:5,t:'noun-place',ex_jp:'おおきいいえにすんでいます。',ex_en:'I live in a big house.'},
{jp:'へや',h:'へや',r:'heya',e:'room',ch:5,t:'noun-place',ex_jp:'わたしのへやはひろくてきれいです。',ex_en:'My room is spacious and pretty.'},
{jp:'アパート',h:'アパート',r:'apaato',e:'apartment',ch:5,t:'noun-place',ex_jp:'あたらしいアパートはきれいです。',ex_en:'The new apartment is pretty.'},
{jp:'りょう',h:'りょう',r:'ryou',e:'dormitory',ch:4,t:'noun-place',ex_jp:'だいがくのりょうにすんでいます。',ex_en:'I live in the university dorm.'},
{jp:'きょうしつ',h:'きょうしつ',r:'kyoushitsu',e:'classroom',ch:5,t:'noun-place',ex_jp:'9じにきょうしつへ行きます。',ex_en:'I go to the classroom at 9.'},
{jp:'としょかん',h:'としょかん',r:'toshokan',e:'library',ch:4,t:'noun-place',ex_jp:'としょかんでべんきょうします。',ex_en:'I study at the library.'},
{jp:'ぎんこう',h:'ぎんこう',r:'ginkou',e:'bank',ch:4,t:'noun-place',ex_jp:'えきのまえにぎんこうがあります。',ex_en:'There is a bank in front of the station.'},
{jp:'こうえん',h:'こうえん',r:'kouen',e:'park',ch:4,t:'noun-place',ex_jp:'こうえんでさんぽをします。',ex_en:'I take a walk in the park.'},
{jp:'びょういん',h:'びょういん',r:'byouin',e:'hospital',ch:4,t:'noun-place',ex_jp:'びょういんはどこですか。',ex_en:'Where is the hospital?'},
{jp:'えき',h:'えき',r:'eki',e:'station',ch:4,t:'noun-place',ex_jp:'えきまであるいて10ぷんです。',ex_en:'It is 10 minutes on foot to the station.'},
{jp:'まち',h:'まち',r:'machi',e:'town',ch:4,t:'noun-place',ex_jp:'このまちはとてもしずかです。',ex_en:'This town is very quiet.'},
{jp:'たてもの',h:'たてもの',r:'tatemono',e:'building',ch:4,t:'noun-place',ex_jp:'あのたてものはなんですか。',ex_en:'What is that building?'},
{jp:'ビル',h:'ビル',r:'biru',e:'tall building',ch:4,t:'noun-place',ex_jp:'あのビルはたかいです。',ex_en:'That building is tall.'},
{jp:'カフェ',h:'カフェ',r:'kafe',e:'cafe',ch:4,t:'noun-place',ex_jp:'カフェでコーヒーをのみます。',ex_en:'I drink coffee at the cafe.'},
{jp:'きっさてん',h:'きっさてん',r:'kissaten',e:'coffee shop',ch:4,t:'noun-place',ex_jp:'きっさてんでともだちにあいました。',ex_en:'I met a friend at the coffee shop.'},
{jp:'レストラン',h:'レストラン',r:'resutoran',e:'restaurant',ch:4,t:'noun-place',ex_jp:'レストランでばんごはんをたべます。',ex_en:'I eat dinner at a restaurant.'},
{jp:'コンビニ',h:'コンビニ',r:'konbini',e:'convenience store',ch:4,t:'noun-place',ex_jp:'コンビニでパンをかいます。',ex_en:'I buy bread at the convenience store.'},
{jp:'スーパー',h:'スーパー',r:'suupaa',e:'supermarket',ch:4,t:'noun-place',ex_jp:'スーパーでかいものをします。',ex_en:'I shop at the supermarket.'},
{jp:'デパート',h:'デパート',r:'depaato',e:'department store',ch:4,t:'noun-place',ex_jp:'デパートでかいものに行きます。',ex_en:'I go to the department store to shop.'},
{jp:'ほんや',h:'ほんや',r:'honya',e:'bookstore',ch:4,t:'noun-place',ex_jp:'ほんやであたらしい本をかいました。',ex_en:'I bought a new book at the bookstore.'},
{jp:'ゆうびんきょく',h:'ゆうびんきょく',r:'yuubinkyoku',e:'post office',ch:4,t:'noun-place',ex_jp:'ゆうびんきょくでてがみをだします。',ex_en:'I mail a letter at the post office.'},
{jp:'こうばん',h:'こうばん',r:'kouban',e:'police box',ch:4,t:'noun-place',ex_jp:'えきのよこにこうばんがあります。',ex_en:'There is a police box next to the station.'},
{jp:'このへん',h:'このへん',r:'kono-hen',e:'this area',ch:4,t:'noun-place',ex_jp:'このへんにぎんこうがありますか。',ex_en:'Is there a bank around here?'},
{jp:'ホテル',h:'ホテル',r:'hoteru',e:'hotel',ch:4,t:'noun-place',ex_jp:'ホテルにとまります。',ex_en:'I stay at a hotel.'},
{jp:'たいいくかん',h:'たいいくかん',r:'taiikukan',e:'gym',ch:5,t:'noun-place',ex_jp:'たいいくかんにおよぎに行きます。',ex_en:'I go to the gym to swim.'},
{jp:'がくせいかいかん',h:'がくせいかいかん',r:'gakusei-kaikan',e:'student union',ch:5,t:'noun-place',ex_jp:'がくせいかいかんでべんきょうします。',ex_en:'I study at the student union.'},
{jp:'がくしょく',h:'がくしょく',r:'gakushoku',e:'cafeteria',ch:5,t:'noun-place',ex_jp:'がくしょくでひるごはんをたべます。',ex_en:'I eat lunch at the cafeteria.'},
{jp:'メディアセンター',h:'メディアセンター',r:'media-sentaa',e:'media center',ch:5,t:'noun-place',ex_jp:'メディアセンターでビデオをみました。',ex_en:'I watched a video at the media center.'},
{jp:'プール',h:'プール',r:'puuru',e:'pool',ch:6,t:'noun-place',ex_jp:'なつにプールでおよぎます。',ex_en:'I swim at the pool in summer.'},
{jp:'ところ',h:'ところ',r:'tokoro',e:'place',ch:5,t:'noun-place',ex_jp:'しずかなところがすきです。',ex_en:'I like quiet places.'},
{jp:'やま',h:'やま',r:'yama',e:'mountain',ch:5,t:'noun-place',ex_jp:'やまはきれいです。',ex_en:'The mountains are pretty.'},
{jp:'かわ',h:'かわ',r:'kawa',e:'river',ch:5,t:'noun-place',ex_jp:'かわでさかなをみました。',ex_en:'I saw a fish in the river.'},
{jp:'トイレ',h:'トイレ',r:'toire',e:'restroom',ch:5,t:'noun-place',ex_jp:'トイレはどこですか。',ex_en:'Where is the restroom?'},
/* ─── THINGS / OBJECTS ─────────────────────────────────────── */
{jp:'ほん',h:'ほん',r:'hon',e:'book',ch:2,t:'noun-thing',ex_jp:'まいばんほんをよみます。',ex_en:'I read a book every night.'},
{jp:'じしょ',h:'じしょ',r:'jisho',e:'dictionary',ch:4,t:'noun-thing',ex_jp:'じしょでことばをしらべます。',ex_en:'I look up words in the dictionary.'},
{jp:'きょうかしょ',h:'きょうかしょ',r:'kyoukasho',e:'textbook',ch:4,t:'noun-thing',ex_jp:'きょうかしょをよんでください。',ex_en:'Please read the textbook.'},
{jp:'ノート',h:'ノート',r:'nooto',e:'notebook',ch:4,t:'noun-thing',ex_jp:'ノートにかきます。',ex_en:'I write in the notebook.'},
{jp:'ペン',h:'ペン',r:'pen',e:'pen',ch:4,t:'noun-thing',means:1,ex_jp:'ペンでなまえをかきます。',ex_en:'I write my name with a pen.'},
{jp:'ボールペン',h:'ボールペン',r:'boorupen',e:'ballpoint pen',ch:4,t:'noun-thing',means:1,ex_jp:'ボールペンでてがみをかきました。',ex_en:'I wrote a letter with a ballpoint pen.'},
{jp:'えんぴつ',h:'えんぴつ',r:'enpitsu',e:'pencil',ch:4,t:'noun-thing',means:1,ex_jp:'あたらしいえんぴつがあります。',ex_en:'There is a new pencil.'},
{jp:'けしゴム',h:'けしゴム',r:'keshigomu',e:'eraser',ch:4,t:'noun-thing',ex_jp:'けしゴムをかしてください。',ex_en:'Please lend me an eraser.'},
{jp:'かばん',h:'かばん',r:'kaban',e:'bag',ch:4,t:'noun-thing',ex_jp:'かばんのなかにほんがあります。',ex_en:'There is a book in the bag.'},
{jp:'テスト',h:'テスト',r:'tesuto',e:'test',ch:4,t:'noun-thing',ex_jp:'あしたテストがあります。',ex_en:'There is a test tomorrow.'},
{jp:'つくえ',h:'つくえ',r:'tsukue',e:'desk',ch:5,t:'noun-thing',ex_jp:'つくえの上にほんがあります。',ex_en:'There is a book on the desk.'},
{jp:'いす',h:'いす',r:'isu',e:'chair',ch:5,t:'noun-thing',ex_jp:'あたらしいいすをかいました。',ex_en:'I bought a new chair.'},
{jp:'テーブル',h:'テーブル',r:'teeburu',e:'table',ch:5,t:'noun-thing',ex_jp:'テーブルの上にりょうりがあります。',ex_en:'There is food on the table.'},
{jp:'ベッド',h:'ベッド',r:'beddo',e:'bed',ch:5,t:'noun-thing',ex_jp:'ベッドの下にねこがいます。',ex_en:'There is a cat under the bed.'},
{jp:'ふとん',h:'ふとん',r:'futon',e:'futon',ch:5,t:'noun-thing',ex_jp:'ふとんでねます。',ex_en:'I sleep on a futon.'},
{jp:'ソファ',h:'ソファ',r:'sofa',e:'sofa',ch:5,t:'noun-thing',ex_jp:'ソファでテレビをみます。',ex_en:'I watch TV on the sofa.'},
{jp:'たんす',h:'たんす',r:'tansu',e:'chest of drawers',ch:5,t:'noun-thing',ex_jp:'たんすのなかにふくがあります。',ex_en:'There are clothes in the chest of drawers.'},
{jp:'ほんだな',h:'ほんだな',r:'hondana',e:'bookshelf',ch:5,t:'noun-thing',ex_jp:'ほんだなにたくさんほんがあります。',ex_en:'There are many books on the bookshelf.'},
{jp:'おしいれ',h:'おしいれ',r:'oshiire',e:'closet',ch:5,t:'noun-thing',ex_jp:'おしいれのなかにふとんがあります。',ex_en:'There is a futon in the closet.'},
{jp:'ドア',h:'ドア',r:'doa',e:'door',ch:5,t:'noun-thing',ex_jp:'ドアをあけてください。',ex_en:'Please open the door.'},
{jp:'まど',h:'まど',r:'mado',e:'window',ch:5,t:'noun-thing',ex_jp:'まどのよこにつくえがあります。',ex_en:'There is a desk next to the window.'},
{jp:'とけい',h:'とけい',r:'tokei',e:'clock, watch',ch:5,t:'noun-thing',ex_jp:'あたらしいとけいをかいました。',ex_en:'I bought a new watch.'},
{jp:'え',h:'え',r:'e',e:'picture',ch:5,t:'noun-thing',ex_jp:'かべにえがあります。',ex_en:'There is a picture on the wall.'},
{jp:'しゃしん',h:'しゃしん',r:'shashin',e:'photograph',ch:5,t:'noun-thing',ex_jp:'りょうしんのしゃしんがあります。',ex_en:'I have a photo of my parents.'},
{jp:'こくばん',h:'こくばん',r:'kokuban',e:'chalkboard',ch:5,t:'noun-thing',ex_jp:'こくばんにかきます。',ex_en:'I write on the chalkboard.'},
{jp:'でんわ',h:'でんわ',r:'denwa',e:'telephone',ch:5,t:'noun-thing',ex_jp:'でんわをかけます。',ex_en:'I make a phone call.'},
{jp:'けいたい',h:'けいたい',r:'keitai',e:'cell phone',ch:5,t:'noun-thing',ex_jp:'けいたいをわすれました。',ex_en:'I forgot my cell phone.'},
{jp:'コンピュータ',h:'コンピュータ',r:'konpyuuta',e:'computer',ch:5,t:'noun-thing',ex_jp:'コンピュータでメールをかきます。',ex_en:'I write email on the computer.'},
{jp:'ビデオ',h:'ビデオ',r:'bideo',e:'video',ch:5,t:'noun-thing',ex_jp:'ビデオをみます。',ex_en:'I watch a video.'},
{jp:'テレビ',h:'テレビ',r:'terebi',e:'TV',ch:3,t:'noun-thing',ex_jp:'まいばんテレビをみます。',ex_en:'I watch TV every night.'},
{jp:'でんわばんごう',h:'でんわばんごう',r:'denwa-bangou',e:'phone number',ch:3,t:'noun-thing',ex_jp:'でんわばんごうはなんばんですか。',ex_en:'What is your phone number?'},
{jp:'もの',h:'もの',r:'mono',e:'thing',ch:5,t:'noun-thing',ex_jp:'これはなんのものですか。',ex_en:'What thing is this?'},
{jp:'き',h:'き',r:'ki',e:'tree',ch:5,t:'noun-thing',ex_jp:'こうえんに大きい木があります。',ex_en:'There is a big tree in the park.'},
{jp:'はな',h:'はな',r:'hana',e:'flower',ch:5,t:'noun-thing',ex_jp:'テーブルの上にはながあります。',ex_en:'There are flowers on the table.'},
{jp:'しんぶん',h:'しんぶん',r:'shinbun',e:'newspaper',ch:6,t:'noun-thing',ex_jp:'まいあさしんぶんをよみます。',ex_en:'I read the newspaper every morning.'},
{jp:'ざっし',h:'ざっし',r:'zasshi',e:'magazine',ch:6,t:'noun-thing',ex_jp:'コンビニでざっしをかいました。',ex_en:'I bought a magazine at the convenience store.'},
{jp:'てがみ',h:'てがみ',r:'tegami',e:'letter',ch:6,t:'noun-thing',ex_jp:'ともだちにてがみをかきました。',ex_en:'I wrote a letter to my friend.'},
{jp:'メール',h:'メール',r:'meeru',e:'email',ch:6,t:'noun-thing',ex_jp:'まいにちメールをかきます。',ex_en:'I write emails every day.'},
/* ─── FOOD / DRINK ─────────────────────────────────────── */
{jp:'コーヒー',h:'コーヒー',r:'koohii',e:'coffee',ch:3,t:'noun-food',ex_jp:'まいあさコーヒーをのみます。',ex_en:'I drink coffee every morning.'},
{jp:'おちゃ',h:'おちゃ',r:'ocha',e:'tea',ch:3,t:'noun-food',ex_jp:'おちゃはあついです。',ex_en:'The tea is hot.'},
{jp:'みず',h:'みず',r:'mizu',e:'water',ch:3,t:'noun-food',ex_jp:'みずをのみます。',ex_en:'I drink water.'},
{jp:'ごはん',h:'ごはん',r:'gohan',e:'meal, cooked rice',ch:3,t:'noun-food',ex_jp:'ごはんをたべます。',ex_en:'I eat a meal.'},
{jp:'あさごはん',h:'あさごはん',r:'asagohan',e:'breakfast',ch:3,t:'noun-food',ex_jp:'7じにあさごはんをたべます。',ex_en:'I eat breakfast at 7.'},
{jp:'ひるごはん',h:'ひるごはん',r:'hirugohan',e:'lunch',ch:3,t:'noun-food',ex_jp:'がくしょくでひるごはんをたべます。',ex_en:'I eat lunch at the cafeteria.'},
{jp:'ばんごはん',h:'ばんごはん',r:'bangohan',e:'dinner',ch:3,t:'noun-food',ex_jp:'ばんごはんはステーキです。',ex_en:'Dinner is steak.'},
/* ─── TIME ─────────────────────────────────────── */
{jp:'いま',h:'いま',r:'ima',e:'now',ch:2,t:'noun-time',ex_jp:'いまなんじですか。',ex_en:'What time is it now?'},
{jp:'きょう',h:'きょう',r:'kyou',e:'today',ch:3,t:'noun-time',daypoint:1,ex_jp:'きょうはいいてんきです。',ex_en:'The weather is good today.'},
{jp:'あした',h:'あした',r:'ashita',e:'tomorrow',ch:3,t:'noun-time',daypoint:1,ex_jp:'あしたはやすみです。',ex_en:'Tomorrow is a day off.'},
{jp:'きのう',h:'きのう',r:'kinou',e:'yesterday',ch:3,t:'noun-time',daypoint:1,ex_jp:'きのうえいがをみました。',ex_en:'I watched a movie yesterday.'},
{jp:'おととい',h:'おととい',r:'ototoi',e:'day before yesterday',ch:3,t:'noun-time',daypoint:1,ex_jp:'おとといりょうしんにあいました。',ex_en:'I met my parents the day before yesterday.'},
{jp:'こんしゅう',h:'こんしゅう',r:'konshuu',e:'this week',ch:3,t:'noun-time',daypoint:1,ex_jp:'こんしゅうはいそがしいです。',ex_en:'This week is busy.'},
{jp:'せんしゅう',h:'せんしゅう',r:'senshuu',e:'last week',ch:3,t:'noun-time',daypoint:1,ex_jp:'せんしゅうテストがありました。',ex_en:'There was a test last week.'},
{jp:'らいしゅう',h:'らいしゅう',r:'raishuu',e:'next week',ch:3,t:'noun-time',daypoint:1,ex_jp:'らいしゅうあいましょう。',ex_en:'Let’s meet next week.'},
{jp:'らいねん',h:'らいねん',r:'rainen',e:'next year',ch:2,t:'noun-time',daypoint:1,ex_jp:'らいねんにほんへ行きます。',ex_en:'I will go to Japan next year.'},
{jp:'こんばん',h:'こんばん',r:'konban',e:'tonight',ch:3,t:'noun-time',daypoint:1,ex_jp:'こんばんパーティがあります。',ex_en:'There is a party tonight.'},
{jp:'しゅうまつ',h:'しゅうまつ',r:'shuumatsu',e:'weekend',ch:6,t:'noun-time',daypoint:1,ex_jp:'しゅうまつになにをしますか。',ex_en:'What will you do on the weekend?'},
{jp:'まいにち',h:'まいにち',r:'mainichi',e:'every day',ch:3,t:'noun-time',freq:1,ex_jp:'まいにちにほんごをべんきょうします。',ex_en:'I study Japanese every day.'},
{jp:'まいあさ',h:'まいあさ',r:'maiasa',e:'every morning',ch:3,t:'noun-time',freq:1,ex_jp:'まいあさコーヒーをのみます。',ex_en:'I drink coffee every morning.'},
{jp:'まいばん',h:'まいばん',r:'maiban',e:'every night',ch:3,t:'noun-time',freq:1,ex_jp:'まいばんほんをよみます。',ex_en:'I read a book every night.'},
{jp:'まいしゅう',h:'まいしゅう',r:'maishuu',e:'every week',ch:3,t:'noun-time',freq:1,ex_jp:'まいしゅうりょうしんにでんわします。',ex_en:'I phone my parents every week.'},
{jp:'あさ',h:'あさ',r:'asa',e:'morning',ch:3,t:'noun-time',daypoint:1,ex_jp:'あさはいそがしいです。',ex_en:'Mornings are busy.'},
{jp:'ひる',h:'ひる',r:'hiru',e:'afternoon',ch:3,t:'noun-time',daypoint:1,ex_jp:'ひるごはんはサンドイッチです。',ex_en:'Lunch is a sandwich.'},
{jp:'ばん',h:'ばん',r:'ban',e:'night, evening',ch:3,t:'noun-time',daypoint:1,ex_jp:'ばんはしずかです。',ex_en:'Evenings are quiet.'},
{jp:'よる',h:'よる',r:'yoru',e:'night',ch:3,t:'noun-time',daypoint:1,ex_jp:'よるはやくねます。',ex_en:'I sleep early at night.'},
{jp:'ごぜん',h:'ごぜん',r:'gozen',e:'a.m., morning',ch:2,t:'noun-time',ex_jp:'ごぜん10じにじゅぎょうがあります。',ex_en:'I have class at 10 a.m.'},
{jp:'ごご',h:'ごご',r:'gogo',e:'p.m., afternoon',ch:2,t:'noun-time',ex_jp:'ごご3じにあいましょう。',ex_en:'Let’s meet at 3 p.m.'},
{jp:'はん',h:'はん',r:'han',e:'half past',ch:2,t:'counter',ex_jp:'7じはんにおきます。',ex_en:'I wake up at 7:30.'},
{jp:'こんど',h:'こんど',r:'kondo',e:'next time',ch:6,t:'noun-time',ex_jp:'こんどいっしょに行きましょう。',ex_en:'Let’s go together next time.'},
{jp:'つぎ',h:'つぎ',r:'tsugi',e:'next',ch:3,t:'noun-time',ex_jp:'つぎのバスは10ぷんごです。',ex_en:'The next bus is in 10 minutes.'},
/* days of the week */
{jp:'げつようび',h:'げつようび',r:'getsuyoubi',e:'Monday',ch:3,t:'noun-time',clock:1,ex_jp:'げつようびにテストがあります。',ex_en:'There is a test on Monday.'},
{jp:'かようび',h:'かようび',r:'kayoubi',e:'Tuesday',ch:3,t:'noun-time',clock:1,ex_jp:'かようびはいそがしいです。',ex_en:'Tuesday is busy.'},
{jp:'すいようび',h:'すいようび',r:'suiyoubi',e:'Wednesday',ch:3,t:'noun-time',clock:1,ex_jp:'すいようびにとしょかんへ行きます。',ex_en:'I go to the library on Wednesday.'},
{jp:'もくようび',h:'もくようび',r:'mokuyoubi',e:'Thursday',ch:3,t:'noun-time',clock:1,ex_jp:'もくようびにテニスをします。',ex_en:'I play tennis on Thursday.'},
{jp:'きんようび',h:'きんようび',r:'kinyoubi',e:'Friday',ch:3,t:'noun-time',clock:1,ex_jp:'きんようびのよるはたのしいです。',ex_en:'Friday nights are fun.'},
{jp:'どようび',h:'どようび',r:'doyoubi',e:'Saturday',ch:3,t:'noun-time',clock:1,ex_jp:'どようびにかいものに行きます。',ex_en:'I go shopping on Saturday.'},
{jp:'にちようび',h:'にちようび',r:'nichiyoubi',e:'Sunday',ch:3,t:'noun-time',clock:1,ex_jp:'にちようびはやすみです。',ex_en:'Sunday is a day off.'},
/* hours */
{jp:'いちじ',h:'いちじ',r:'ichi-ji',e:"1 o'clock",ch:2,t:'noun-time',clock:1,ex_jp:'いちじにひるごはんをたべます。',ex_en:'I eat lunch at 1.'},
{jp:'にじ',h:'にじ',r:'ni-ji',e:"2 o'clock",ch:2,t:'noun-time',clock:1,ex_jp:'にじにじゅぎょうがあります。',ex_en:'I have class at 2.'},
{jp:'さんじ',h:'さんじ',r:'san-ji',e:"3 o'clock",ch:2,t:'noun-time',clock:1,ex_jp:'さんじごろあいましょう。',ex_en:'Let’s meet around 3.'},
{jp:'よじ',h:'よじ',r:'yo-ji',e:"4 o'clock",ch:2,t:'noun-time',clock:1,ex_jp:'よじにかえります。',ex_en:'I return at 4.'},
{jp:'ごじ',h:'ごじ',r:'go-ji',e:"5 o'clock",ch:2,t:'noun-time',clock:1,ex_jp:'ごじまではたらきます。',ex_en:'I work until 5.'},
{jp:'ろくじ',h:'ろくじ',r:'roku-ji',e:"6 o'clock",ch:2,t:'noun-time',clock:1,ex_jp:'ろくじにおきます。',ex_en:'I wake up at 6.'},
{jp:'しちじ',h:'しちじ',r:'shichi-ji',e:"7 o'clock",ch:2,t:'noun-time',clock:1,ex_jp:'しちじにあさごはんをたべます。',ex_en:'I eat breakfast at 7.'},
{jp:'はちじ',h:'はちじ',r:'hachi-ji',e:"8 o'clock",ch:2,t:'noun-time',clock:1,ex_jp:'はちじにじゅぎょうがあります。',ex_en:'I have class at 8.'},
{jp:'くじ',h:'くじ',r:'ku-ji',e:"9 o'clock",ch:2,t:'noun-time',clock:1,ex_jp:'くじにとしょかんへ行きます。',ex_en:'I go to the library at 9.'},
{jp:'じゅうじ',h:'じゅうじ',r:'juu-ji',e:"10 o'clock",ch:2,t:'noun-time',clock:1,ex_jp:'じゅうじにねます。',ex_en:'I sleep at 10.'},
{jp:'じゅういちじ',h:'じゅういちじ',r:'juu-ichi-ji',e:"11 o'clock",ch:2,t:'noun-time',clock:1,ex_jp:'じゅういちじにねます。',ex_en:'I sleep at 11.'},
{jp:'じゅうにじ',h:'じゅうにじ',r:'juu-ni-ji',e:"12 o'clock",ch:2,t:'noun-time',clock:1,ex_jp:'じゅうにじにひるごはんです。',ex_en:'Lunch is at 12.'},
/* ─── ABSTRACT / SUBJECTS / ACTIVITIES ─────────────────────────────────────── */
{jp:'にほんご',h:'にほんご',r:'nihongo',e:'Japanese language',ch:2,t:'noun-language',ex_jp:'にほんごをべんきょうします。',ex_en:'I study Japanese.'},
{jp:'えいご',h:'えいご',r:'eigo',e:'English (language)',ch:2,t:'noun-language',ex_jp:'えいごではなしてください。',ex_en:'Please speak in English.'},
{jp:'せんこう',h:'せんこう',r:'senkou',e:'major',ch:2,t:'noun-abstract',ex_jp:'わたしのせんこうはぶんがくです。',ex_en:'My major is literature.'},
{jp:'れきし',h:'れきし',r:'rekishi',e:'history',ch:2,t:'noun-abstract',ex_jp:'にほんのれきしをべんきょうします。',ex_en:'I study Japanese history.'},
{jp:'ぶんがく',h:'ぶんがく',r:'bungaku',e:'literature',ch:2,t:'noun-abstract',ex_jp:'ぶんがくがすきです。',ex_en:'I like literature.'},
{jp:'けいえいがく',h:'けいえいがく',r:'keieigaku',e:'business administration',ch:2,t:'noun-abstract',ex_jp:'けいえいがくのがくせいです。',ex_en:'I’m a business administration student.'},
{jp:'ビジネス',h:'ビジネス',r:'bijinesu',e:'business',ch:2,t:'noun-abstract',ex_jp:'ビジネスのクラスはむずかしいです。',ex_en:'Business class is difficult.'},
{jp:'こうがく',h:'こうがく',r:'kougaku',e:'engineering',ch:2,t:'noun-abstract',ex_jp:'あにのせんこうはこうがくです。',ex_en:"My brother's major is engineering."},
{jp:'アジアけんきゅう',h:'アジアけんきゅう',r:'ajia-kenkyuu',e:'Asian studies',ch:2,t:'noun-abstract',ex_jp:'アジアけんきゅうのクラスをとります。',ex_en:'I take Asian studies classes.'},
{jp:'クラス',h:'クラス',r:'kurasu',e:'class',ch:3,t:'noun-abstract',ex_jp:'9じにクラスがあります。',ex_en:'I have class at 9.'},
{jp:'じゅぎょう',h:'じゅぎょう',r:'jugyou',e:'class, course',ch:3,t:'noun-abstract',ex_jp:'にほんごのじゅぎょうはたのしいです。',ex_en:'Japanese class is fun.'},
{jp:'べんきょう',h:'べんきょう',r:'benkyou',e:'study',ch:3,t:'noun-abstract',ex_jp:'べんきょうはたいへんです。',ex_en:'Studying is tough.'},
{jp:'しゅくだい',h:'しゅくだい',r:'shukudai',e:'homework',ch:6,t:'noun-abstract',ex_jp:'しゅくだいがたくさんあります。',ex_en:'I have a lot of homework.'},
{jp:'しつもん',h:'しつもん',r:'shitsumon',e:'question',ch:6,t:'noun-abstract',ex_jp:'せんせいにしつもんします。',ex_en:'I ask the teacher a question.'},
{jp:'しごと',h:'しごと',r:'shigoto',e:'job',ch:6,t:'noun-abstract',ex_jp:'ちちのしごとはせんせいです。',ex_en:'My father’s job is teacher.'},
{jp:'アルバイト',h:'アルバイト',r:'arubaito',e:'part-time job',ch:6,t:'noun-abstract',ex_jp:'カフェでアルバイトをします。',ex_en:'I work part-time at a cafe.'},
{jp:'えいが',h:'えいが',r:'eiga',e:'movie',ch:3,t:'noun-thing',ex_jp:'しゅうまつにえいがをみます。',ex_en:'I watch a movie on the weekend.'},
{jp:'おんがく',h:'おんがく',r:'ongaku',e:'music',ch:6,t:'noun-thing',ex_jp:'おんがくをききます。',ex_en:'I listen to music.'},
{jp:'コンサート',h:'コンサート',r:'konsaato',e:'concert',ch:6,t:'noun-abstract',ex_jp:'らいしゅうコンサートに行きます。',ex_en:'I’ll go to a concert next week.'},
{jp:'パーティ',h:'パーティ',r:'paatii',e:'party',ch:6,t:'noun-abstract',ex_jp:'ともだちのうちでパーティがあります。',ex_en:"There's a party at my friend's place."},
{jp:'ピクニック',h:'ピクニック',r:'pikunikku',e:'picnic',ch:6,t:'noun-abstract',ex_jp:'こうえんでピクニックをしました。',ex_en:'We had a picnic in the park.'},
{jp:'ゲーム',h:'ゲーム',r:'geemu',e:'game',ch:6,t:'noun-abstract',ex_jp:'ゲームがすきです。',ex_en:'I like games.'},
{jp:'テニス',h:'テニス',r:'tenisu',e:'tennis',ch:6,t:'noun-abstract',ex_jp:'いっしょにテニスをしませんか。',ex_en:'Won’t you play tennis with me?'},
{jp:'ジョギング',h:'ジョギング',r:'jogingu',e:'jogging',ch:6,t:'noun-abstract',ex_jp:'まいあさジョギングをします。',ex_en:'I jog every morning.'},
{jp:'さんぽ',h:'さんぽ',r:'sanpo',e:'walk, stroll',ch:6,t:'noun-abstract',ex_jp:'こうえんでさんぽをします。',ex_en:'I take a walk in the park.'},
{jp:'うんどう',h:'うんどう',r:'undou',e:'exercise',ch:6,t:'noun-abstract',ex_jp:'まいにちうんどうをします。',ex_en:'I exercise every day.'},
{jp:'かいもの',h:'かいもの',r:'kaimono',e:'shopping',ch:6,t:'noun-abstract',ex_jp:'デパートにかいものに行きます。',ex_en:'I go to the department store to shop.'},
{jp:'りょうり',h:'りょうり',r:'ryouri',e:'cooking',ch:6,t:'noun-abstract',ex_jp:'りょうりをするのがすきです。',ex_en:'I like cooking.'},
{jp:'そうじ',h:'そうじ',r:'souji',e:'cleaning',ch:6,t:'noun-abstract',ex_jp:'しゅうまつにそうじをします。',ex_en:'I clean on the weekend.'},
{jp:'せんたく',h:'せんたく',r:'sentaku',e:'laundry',ch:6,t:'noun-abstract',ex_jp:'にちようびにせんたくをします。',ex_en:'I do laundry on Sunday.'},
{jp:'やすみ',h:'やすみ',r:'yasumi',e:'rest, day off',ch:6,t:'noun-time',daypoint:1,ex_jp:'あしたはやすみです。',ex_en:'Tomorrow is a day off.'},
{jp:'やすみのひ',h:'やすみのひ',r:'yasumi-no-hi',e:'a day off',ch:6,t:'noun-time',daypoint:1,ex_jp:'やすみのひになにをしますか。',ex_en:'What do you do on your day off?'},
{jp:'おふろ',h:'おふろ',r:'ofuro',e:'bath',ch:3,t:'noun-thing',ex_jp:'おふろにはいります。',ex_en:'I take a bath.'},
{jp:'シャワー',h:'シャワー',r:'shawaa',e:'shower',ch:3,t:'noun-thing',ex_jp:'まいあさシャワーをあびます。',ex_en:'I take a shower every morning.'},
{jp:'せいかつ',h:'せいかつ',r:'seikatsu',e:'life, living',ch:3,t:'noun-abstract',ex_jp:'にほんでのせいかつはたのしいです。',ex_en:'Life in Japan is fun.'},
/* ─── MEANS / TRANSPORT ─────────────────────────────────────── */
{jp:'くるま',h:'くるま',r:'kuruma',e:'car',ch:5,t:'noun-means',ex_jp:'くるまでだいがくに行きます。',ex_en:'I go to university by car.'},
{jp:'じてんしゃ',h:'じてんしゃ',r:'jitensha',e:'bicycle',ch:5,t:'noun-means',ex_jp:'じてんしゃでがっこうへ行きます。',ex_en:'I go to school by bicycle.'},
{jp:'バス',h:'バス',r:'basu',e:'bus',ch:5,t:'noun-means',ex_jp:'バスでうちにかえります。',ex_en:'I return home by bus.'},
{jp:'でんしゃ',h:'でんしゃ',r:'densha',e:'train',ch:5,t:'noun-means',ex_jp:'でんしゃでとうきょうへ行きます。',ex_en:'I go to Tokyo by train.'},
/* ─── VERBS — motion ─────────────────────────────────────── */
{jp:'いきます',h:'いきます',r:'ikimasu',e:'go (polite)',ch:3,t:'verb-motion',ex_jp:'まいあさだいがくに行きます。',ex_en:'I go to university every morning.'},
{jp:'いく',h:'いく',r:'iku',e:'go',ch:3,t:'verb-motion',ex_jp:'こうえんに行く。',ex_en:'I go to the park.'},
{jp:'きます',h:'きます',r:'kimasu',e:'come (polite)',ch:3,t:'verb-motion',ex_jp:'ともだちがうちにきます。',ex_en:'My friend comes to my house.'},
{jp:'くる',h:'くる',r:'kuru',e:'come',ch:3,t:'verb-motion',ex_jp:'バスがくる。',ex_en:'The bus is coming.'},
{jp:'かえります',h:'かえります',r:'kaerimasu',e:'return (polite)',ch:3,t:'verb-motion',ex_jp:'5じにうちにかえります。',ex_en:'I return home at 5.'},
{jp:'かえる',h:'かえる',r:'kaeru',e:'return',ch:3,t:'verb-motion',ex_jp:'はやくかえる。',ex_en:'I return early.'},
{jp:'あるきます',h:'あるきます',r:'arukimasu',e:'walk (polite)',ch:6,t:'verb-motion',ex_jp:'こうえんをあるきます。',ex_en:'I walk through the park.'},
{jp:'あるく',h:'あるく',r:'aruku',e:'walk',ch:6,t:'verb-motion',ex_jp:'えきまであるく。',ex_en:'I walk to the station.'},
{jp:'でかけます',h:'でかけます',r:'dekakemasu',e:'go out (polite)',ch:3,t:'verb-motion',ex_jp:'しゅうまつにでかけます。',ex_en:'I go out on the weekend.'},
{jp:'でかける',h:'でかける',r:'dekakeru',e:'go out',ch:3,t:'verb-motion',ex_jp:'ともだちとでかける。',ex_en:'I go out with a friend.'},
/* ─── VERBS — transitive (action on object) ─────────────────────────────────────── */
{jp:'たべます',h:'たべます',r:'tabemasu',e:'eat (polite)',ch:3,t:'verb-trans',ex_jp:'まいあさあさごはんをたべます。',ex_en:'I eat breakfast every morning.'},
{jp:'たべる',h:'たべる',r:'taberu',e:'eat',ch:3,t:'verb-trans',ex_jp:'パンをたべる。',ex_en:'I eat bread.'},
{jp:'のみます',h:'のみます',r:'nomimasu',e:'drink (polite)',ch:3,t:'verb-trans',ex_jp:'コーヒーをのみます。',ex_en:'I drink coffee.'},
{jp:'のむ',h:'のむ',r:'nomu',e:'drink',ch:3,t:'verb-trans',ex_jp:'みずをのむ。',ex_en:'I drink water.'},
{jp:'よみます',h:'よみます',r:'yomimasu',e:'read (polite)',ch:3,t:'verb-trans',ex_jp:'まいばんほんをよみます。',ex_en:'I read a book every night.'},
{jp:'よむ',h:'よむ',r:'yomu',e:'read',ch:3,t:'verb-trans',ex_jp:'しんぶんをよむ。',ex_en:'I read the newspaper.'},
{jp:'かきます',h:'かきます',r:'kakimasu',e:'write (polite)',ch:3,t:'verb-trans',ex_jp:'てがみをかきます。',ex_en:'I write a letter.'},
{jp:'かく',h:'かく',r:'kaku',e:'write',ch:3,t:'verb-trans',ex_jp:'なまえをかく。',ex_en:'I write my name.'},
{jp:'みます',h:'みます',r:'mimasu',e:'see/watch (polite)',ch:3,t:'verb-trans',ex_jp:'ともだちとえいがをみます。',ex_en:'I watch a movie with a friend.'},
{jp:'みる',h:'みる',r:'miru',e:'see/watch',ch:3,t:'verb-trans',ex_jp:'テレビをみる。',ex_en:'I watch TV.'},
{jp:'ききます',h:'ききます',r:'kikimasu',e:'listen/ask (polite)',ch:3,t:'verb-trans',ex_jp:'おんがくをききます。',ex_en:'I listen to music.'},
{jp:'きく',h:'きく',r:'kiku',e:'listen/ask',ch:3,t:'verb-trans',ex_jp:'せんせいにきく。',ex_en:'I ask the teacher.'},
{jp:'かいます',h:'かいます',r:'kaimasu',e:'buy (polite)',ch:6,t:'verb-trans',ex_jp:'コンビニでパンをかいます。',ex_en:'I buy bread at the convenience store.'},
{jp:'かう',h:'かう',r:'kau',e:'buy',ch:6,t:'verb-trans',ex_jp:'あたらしい本をかう。',ex_en:'I buy a new book.'},
{jp:'まちます',h:'まちます',r:'machimasu',e:'wait (polite)',ch:6,t:'verb-trans',ex_jp:'えきでともだちをまちます。',ex_en:'I wait for my friend at the station.'},
{jp:'まつ',h:'まつ',r:'matsu',e:'wait',ch:6,t:'verb-trans',ex_jp:'バスをまつ。',ex_en:'I wait for the bus.'},
{jp:'よびます',h:'よびます',r:'yobimasu',e:'call/invite (polite)',ch:6,t:'verb-trans',ex_jp:'ともだちをパーティによびます。',ex_en:'I invite my friend to the party.'},
{jp:'よぶ',h:'よぶ',r:'yobu',e:'call, invite',ch:6,t:'verb-trans',ex_jp:'ともだちをよぶ。',ex_en:'I call my friend.'},
{jp:'します',h:'します',r:'shimasu',e:'do (polite)',ch:3,t:'verb-trans',ex_jp:'うんどうをします。',ex_en:'I exercise.'},
{jp:'する',h:'する',r:'suru',e:'do',ch:3,t:'verb-trans',ex_jp:'にほんごのべんきょうをする。',ex_en:'I study Japanese.'},
{jp:'べんきょうします',h:'べんきょうします',r:'benkyoushimasu',e:'study (polite)',ch:3,t:'verb-trans',ex_jp:'まいばんにほんごをべんきょうします。',ex_en:'I study Japanese every night.'},
{jp:'さんぽをします',h:'さんぽをします',r:'sanpo-o-shimasu',e:'take a walk (polite)',ch:6,t:'verb-trans',ex_jp:'こうえんでさんぽをします。',ex_en:'I take a walk in the park.'},
{jp:'うんどうをします',h:'うんどうをします',r:'undou-o-shimasu',e:'exercise (polite)',ch:6,t:'verb-trans',ex_jp:'まいあさうんどうをします。',ex_en:'I exercise every morning.'},
{jp:'しつもんをします',h:'しつもんをします',r:'shitsumon-o-shimasu',e:'ask a question (polite)',ch:6,t:'verb-trans',ex_jp:'せんせいにしつもんをします。',ex_en:'I ask the teacher a question.'},
{jp:'そうじをします',h:'そうじをします',r:'souji-o-shimasu',e:'clean (polite)',ch:6,t:'verb-trans',ex_jp:'へやのそうじをします。',ex_en:'I clean my room.'},
{jp:'せんたくをします',h:'せんたくをします',r:'sentaku-o-shimasu',e:'do laundry (polite)',ch:6,t:'verb-trans',ex_jp:'どようびにせんたくをします。',ex_en:'I do laundry on Saturday.'},
{jp:'かいものをします',h:'かいものをします',r:'kaimono-o-shimasu',e:'go shopping (polite)',ch:6,t:'verb-trans',ex_jp:'デパートでかいものをします。',ex_en:'I shop at the department store.'},
/* ─── VERBS — communication ─────────────────────────────────────── */
{jp:'はなします',h:'はなします',r:'hanashimasu',e:'speak (polite)',ch:3,t:'verb-comm',ex_jp:'にほんごではなします。',ex_en:'I speak in Japanese.'},
{jp:'はなす',h:'はなす',r:'hanasu',e:'speak',ch:3,t:'verb-comm',ex_jp:'ともだちとはなす。',ex_en:'I talk with my friend.'},
{jp:'おしえます',h:'おしえます',r:'oshiemasu',e:'teach (polite)',ch:3,t:'verb-comm',ex_jp:'にほんごをおしえます。',ex_en:'I teach Japanese.'},
{jp:'おしえる',h:'おしえる',r:'oshieru',e:'teach',ch:3,t:'verb-comm',ex_jp:'がくせいにおしえる。',ex_en:'I teach the students.'},
{jp:'あいます',h:'あいます',r:'aimasu',e:'meet (polite)',ch:6,t:'verb-comm',ex_jp:'ともだちにあいます。',ex_en:'I meet my friend.'},
{jp:'あう',h:'あう',r:'au',e:'meet',ch:6,t:'verb-comm',ex_jp:'えきでうえださんにあう。',ex_en:'I meet Ueda at the station.'},
{jp:'いいます',h:'いいます',r:'iimasu',e:'say (polite)',ch:6,t:'verb-comm',ex_jp:'なんといいますか。',ex_en:'How do you say it?'},
{jp:'いう',h:'いう',r:'iu',e:'say',ch:6,t:'verb-comm',ex_jp:'せんせいにいう。',ex_en:'I tell the teacher.'},
{jp:'かけます',h:'かけます',r:'kakemasu',e:'make a phone call (polite)',ch:6,t:'verb-comm',ex_jp:'ともだちにでんわをかけます。',ex_en:'I call my friend on the phone.'},
{jp:'かける',h:'かける',r:'kakeru',e:'make a phone call',ch:6,t:'verb-comm',ex_jp:'りょうしんにでんわをかける。',ex_en:'I call my parents.'},
/* ─── VERBS — existence / cognition / emotion ─────────────────────────────────────── */
{jp:'あります',h:'あります',r:'arimasu',e:'exist (inanimate, polite)',ch:4,t:'verb-exist',ex_jp:'つくえの上に本があります。',ex_en:'There is a book on the desk.'},
{jp:'ある',h:'ある',r:'aru',e:'exist (inanimate)',ch:4,t:'verb-exist',ex_jp:'いえにねこがある。',ex_en:'(used for objects only)'},
{jp:'います',h:'います',r:'imasu',e:'exist (animate, polite)',ch:4,t:'verb-exist',ex_jp:'こうえんにいぬがいます。',ex_en:'There is a dog in the park.'},
{jp:'いる',h:'いる',r:'iru',e:'exist (animate)',ch:4,t:'verb-exist',ex_jp:'へやにねこがいる。',ex_en:'There is a cat in the room.'},
{jp:'わかります',h:'わかります',r:'wakarimasu',e:'understand (polite)',ch:1,t:'verb-cog',ga:1,ex_jp:'にほんごがわかります。',ex_en:'I understand Japanese.'},
{jp:'わかる',h:'わかる',r:'wakaru',e:'understand',ch:1,t:'verb-cog',ga:1,ex_jp:'こたえがわかる。',ex_en:'I understand the answer.'},
{jp:'できます',h:'できます',r:'dekimasu',e:'be able (polite)',ch:6,t:'verb-cog',ga:1,ex_jp:'にほんごができます。',ex_en:'I can speak Japanese.'},
{jp:'できる',h:'できる',r:'dekiru',e:'be able',ch:6,t:'verb-cog',ga:1,ex_jp:'りょうりができる。',ex_en:'I can cook.'},
{jp:'すき',h:'すき',r:'suki',e:'like',ch:6,t:'adj-na',ga:1,ex_jp:'ねこがすきです。',ex_en:'I like cats.'},
{jp:'きらい',h:'きらい',r:'kirai',e:'dislike',ch:6,t:'adj-na',ga:1,ex_jp:'おちゃがきらいです。',ex_en:'I dislike tea.'},
{jp:'ほしい',h:'ほしい',r:'hoshii',e:'want',ch:6,t:'adj-i',ga:1,ex_jp:'あたらしいくるまがほしいです。',ex_en:'I want a new car.'},
/* ─── VERBS — intransitive ─────────────────────────────────────── */
{jp:'おきます',h:'おきます',r:'okimasu',e:'wake up (polite)',ch:3,t:'verb-intrans',ex_jp:'まいあさ7じにおきます。',ex_en:'I wake up at 7 every morning.'},
{jp:'おきる',h:'おきる',r:'okiru',e:'wake up',ch:3,t:'verb-intrans',ex_jp:'はやくおきる。',ex_en:'I wake up early.'},
{jp:'ねます',h:'ねます',r:'nemasu',e:'sleep (polite)',ch:3,t:'verb-intrans',ex_jp:'まいばん11じにねます。',ex_en:'I go to sleep at 11 every night.'},
{jp:'ねる',h:'ねる',r:'neru',e:'sleep',ch:3,t:'verb-intrans',ex_jp:'はやくねる。',ex_en:'I sleep early.'},
{jp:'はいります',h:'はいります',r:'hairimasu',e:'enter (polite)',ch:3,t:'verb-intrans',ex_jp:'おふろにはいります。',ex_en:'I take a bath.'},
{jp:'はいる',h:'はいる',r:'hairu',e:'enter',ch:3,t:'verb-intrans',ex_jp:'へやにはいる。',ex_en:'I enter the room.'},
{jp:'およぎます',h:'およぎます',r:'oyogimasu',e:'swim (polite)',ch:6,t:'verb-intrans',ex_jp:'プールでおよぎます。',ex_en:'I swim at the pool.'},
{jp:'およぐ',h:'およぐ',r:'oyogu',e:'swim',ch:6,t:'verb-intrans',ex_jp:'うみでおよぐ。',ex_en:'I swim in the sea.'},
{jp:'はしります',h:'はしります',r:'hashirimasu',e:'run (polite)',ch:6,t:'verb-intrans',ex_jp:'こうえんではしります。',ex_en:'I run in the park.'},
{jp:'はしる',h:'はしる',r:'hashiru',e:'run',ch:6,t:'verb-intrans',ex_jp:'まいあさはしる。',ex_en:'I run every morning.'},
{jp:'あそびます',h:'あそびます',r:'asobimasu',e:'play (polite)',ch:6,t:'verb-intrans',ex_jp:'ともだちとあそびます。',ex_en:'I hang out with my friends.'},
{jp:'あそぶ',h:'あそぶ',r:'asobu',e:'play',ch:6,t:'verb-intrans',ex_jp:'こうえんであそぶ。',ex_en:'I play in the park.'},
{jp:'あびます',h:'あびます',r:'abimasu',e:'take (a shower) (polite)',ch:3,t:'verb-trans',ex_jp:'シャワーをあびます。',ex_en:'I take a shower.'},
{jp:'あびる',h:'あびる',r:'abiru',e:'take (a shower)',ch:3,t:'verb-trans',ex_jp:'シャワーをあびる。',ex_en:'I take a shower.'},
{jp:'かかります',h:'かかります',r:'kakarimasu',e:'take (time/cost) (polite)',ch:5,t:'verb-intrans',ex_jp:'えきまで10ぷんかかります。',ex_en:'It takes 10 minutes to the station.'},
{jp:'かかる',h:'かかる',r:'kakaru',e:'take (time/cost)',ch:5,t:'verb-intrans',ex_jp:'いちじかんかかる。',ex_en:'It takes one hour.'},
/* ─── ADJECTIVES — i ─────────────────────────────────────── */
{jp:'おおきい',h:'おおきい',r:'ookii',e:'big',ch:4,t:'adj-i',ex_jp:'おおきいいぬがいます。',ex_en:'There is a big dog.'},
{jp:'ちいさい',h:'ちいさい',r:'chiisai',e:'small',ch:4,t:'adj-i',ex_jp:'ちいさいへやです。',ex_en:'It is a small room.'},
{jp:'たかい',h:'たかい',r:'takai',e:'expensive/tall',ch:4,t:'adj-i',ex_jp:'このビルはたかいです。',ex_en:'This building is tall.'},
{jp:'やすい',h:'やすい',r:'yasui',e:'cheap',ch:4,t:'adj-i',ex_jp:'コンビニのパンはやすいです。',ex_en:'Convenience-store bread is cheap.'},
{jp:'あたらしい',h:'あたらしい',r:'atarashii',e:'new',ch:4,t:'adj-i',ex_jp:'あたらしいくるまをかいました。',ex_en:'I bought a new car.'},
{jp:'ふるい',h:'ふるい',r:'furui',e:'old (things)',ch:4,t:'adj-i',ex_jp:'このいえはふるいです。',ex_en:'This house is old.'},
{jp:'いい',h:'いい',r:'ii',e:'good',ch:4,t:'adj-i',ex_jp:'きょうはいいてんきです。',ex_en:'The weather is good today.'},
{jp:'たのしい',h:'たのしい',r:'tanoshii',e:'fun',ch:4,t:'adj-i',ex_jp:'パーティはたのしかったです。',ex_en:'The party was fun.'},
{jp:'おもしろい',h:'おもしろい',r:'omoshiroi',e:'interesting',ch:4,t:'adj-i',ex_jp:'この本はおもしろいです。',ex_en:'This book is interesting.'},
{jp:'むずかしい',h:'むずかしい',r:'muzukashii',e:'difficult',ch:6,t:'adj-i',ex_jp:'にほんごはむずかしいです。',ex_en:'Japanese is difficult.'},
{jp:'やさしい',h:'やさしい',r:'yasashii',e:'easy / kind',ch:6,t:'adj-i',ex_jp:'せんせいはやさしいです。',ex_en:'The teacher is kind.'},
{jp:'あつい',h:'あつい',r:'atsui',e:'hot (weather)',ch:4,t:'adj-i',ex_jp:'なつはあついです。',ex_en:'Summer is hot.'},
{jp:'さむい',h:'さむい',r:'samui',e:'cold (weather)',ch:4,t:'adj-i',ex_jp:'ふゆはさむいです。',ex_en:'Winter is cold.'},
{jp:'あおい',h:'あおい',r:'aoi',e:'blue',ch:4,t:'adj-i',ex_jp:'あおいそらがきれいです。',ex_en:'The blue sky is pretty.'},
{jp:'あかい',h:'あかい',r:'akai',e:'red',ch:4,t:'adj-i',ex_jp:'あかいかばんをかいました。',ex_en:'I bought a red bag.'},
{jp:'きいろい',h:'きいろい',r:'kiiroi',e:'yellow',ch:4,t:'adj-i',ex_jp:'きいろいはなです。',ex_en:'It’s a yellow flower.'},
{jp:'くろい',h:'くろい',r:'kuroi',e:'black',ch:4,t:'adj-i',ex_jp:'くろいねこがいます。',ex_en:'There is a black cat.'},
{jp:'しろい',h:'しろい',r:'shiroi',e:'white',ch:4,t:'adj-i',ex_jp:'しろいいぬをかっています。',ex_en:'I have a white dog.'},
{jp:'ちゃいろい',h:'ちゃいろい',r:'chairoi',e:'brown',ch:4,t:'adj-i',ex_jp:'ちゃいろいかばんです。',ex_en:'It’s a brown bag.'},
{jp:'くらい',h:'くらい',r:'kurai',e:'dark',ch:5,t:'adj-i',ex_jp:'このへやはくらいです。',ex_en:'This room is dark.'},
{jp:'せまい',h:'せまい',r:'semai',e:'cramped, narrow',ch:5,t:'adj-i',ex_jp:'へやはせまいです。',ex_en:'The room is cramped.'},
{jp:'ひろい',h:'ひろい',r:'hiroi',e:'spacious, wide',ch:5,t:'adj-i',ex_jp:'こうえんはひろいです。',ex_en:'The park is spacious.'},
{jp:'はやい',h:'はやい',r:'hayai',e:'fast, quick',ch:5,t:'adj-i',ex_jp:'でんしゃははやいです。',ex_en:'The train is fast.'},
{jp:'うれしい',h:'うれしい',r:'ureshii',e:'happy',ch:6,t:'adj-i',ex_jp:'てがみをもらってうれしいです。',ex_en:'I’m happy to receive the letter.'},
{jp:'かなしい',h:'かなしい',r:'kanashii',e:'sad',ch:6,t:'adj-i',ex_jp:'かなしいえいがでした。',ex_en:'It was a sad movie.'},
{jp:'さびしい',h:'さびしい',r:'sabishii',e:'lonely',ch:6,t:'adj-i',ex_jp:'ともだちがいなくてさびしいです。',ex_en:'I’m lonely without my friends.'},
{jp:'つまらない',h:'つまらない',r:'tsumaranai',e:'boring',ch:6,t:'adj-i',ex_jp:'このえいがはつまらないです。',ex_en:'This movie is boring.'},
/* ─── ADJECTIVES — na ─────────────────────────────────────── */
{jp:'げんき',h:'げんき',r:'genki',e:'energetic',ch:1,t:'adj-na',ex_jp:'おげんきですか。',ex_en:'Are you well?'},
{jp:'しずか',h:'しずか',r:'shizuka',e:'quiet',ch:5,t:'adj-na',ex_jp:'このまちはしずかです。',ex_en:'This town is quiet.'},
{jp:'にぎやか',h:'にぎやか',r:'nigiyaka',e:'lively',ch:5,t:'adj-na',ex_jp:'しぶやはにぎやかです。',ex_en:'Shibuya is lively.'},
{jp:'ゆうめい',h:'ゆうめい',r:'yuumei',e:'famous',ch:4,t:'adj-na',ex_jp:'このカフェはゆうめいです。',ex_en:'This cafe is famous.'},
{jp:'きれい',h:'きれい',r:'kirei',e:'pretty',ch:5,t:'adj-na',ex_jp:'にわはきれいです。',ex_en:'The garden is pretty.'},
{jp:'たいへん',h:'たいへん',r:'taihen',e:'tough',ch:6,t:'adj-na',ex_jp:'しゅくだいはたいへんでした。',ex_en:'The homework was tough.'},
{jp:'かんたん',h:'かんたん',r:'kantan',e:'easy',ch:6,t:'adj-na',ex_jp:'このテストはかんたんです。',ex_en:'This test is easy.'},
{jp:'ざんねん',h:'ざんねん',r:'zannen',e:'sorry, regrettable',ch:6,t:'adj-na',ex_jp:'いけなくてざんねんです。',ex_en:"I'm sorry I can't go."},
{jp:'だいじょうぶ',h:'だいじょうぶ',r:'daijoubu',e:'all right, no problem',ch:6,t:'adj-na',ex_jp:'だいじょうぶですか。',ex_en:'Are you all right?'},
/* ─── ADVERBS / ADV PHRASES ─────────────────────────────────────── */
{jp:'いっしょに',h:'いっしょに',r:'issho-ni',e:'together',ch:6,t:'adv',ex_jp:'いっしょにえいがをみませんか。',ex_en:'Won’t you watch a movie together?'},
{jp:'ぜひ',h:'ぜひ',r:'zehi',e:'by all means',ch:6,t:'adv',ex_jp:'ぜひあそびにきてください。',ex_en:'Please come over by all means.'},
{jp:'あるいて',h:'あるいて',r:'aruite',e:'on foot',ch:5,t:'adv',ex_jp:'えきまであるいて10ぷんです。',ex_en:'It is 10 minutes on foot to the station.'},
{jp:'どうも',h:'どうも',r:'doumo',e:'very; thanks',ch:4,t:'adv',ex_jp:'どうもありがとうございます。',ex_en:'Thank you very much.'},
/* ─── DEMONSTRATIVES ─────────────────────────────────────── */
{jp:'これ',h:'これ',r:'kore',e:'this (thing)',ch:2,t:'demonstr',ex_jp:'これは本です。',ex_en:'This is a book.'},
{jp:'それ',h:'それ',r:'sore',e:'that (thing)',ch:2,t:'demonstr',ex_jp:'それはノートですか。',ex_en:'Is that a notebook?'},
{jp:'あれ',h:'あれ',r:'are',e:'that over there',ch:2,t:'demonstr',ex_jp:'あれはなんですか。',ex_en:'What is that over there?'},
{jp:'どれ',h:'どれ',r:'dore',e:'which one',ch:2,t:'qword',ex_jp:'どれがあなたのほんですか。',ex_en:'Which one is your book?'},
{jp:'ここ',h:'ここ',r:'koko',e:'here',ch:4,t:'noun-place',ex_jp:'ここはとしょかんです。',ex_en:'This is the library.'},
{jp:'そこ',h:'そこ',r:'soko',e:'there',ch:4,t:'noun-place',ex_jp:'そこはレストランです。',ex_en:'That is the restaurant.'},
{jp:'あそこ',h:'あそこ',r:'asoko',e:'over there',ch:4,t:'noun-place',ex_jp:'あそこにこうえんがあります。',ex_en:'There is a park over there.'},
{jp:'どこ',h:'どこ',r:'doko',e:'where',ch:4,t:'qword',ex_jp:'えきはどこですか。',ex_en:'Where is the station?'},
{jp:'うえ',h:'うえ',r:'ue',e:'on / above',ch:5,t:'noun-place',ex_jp:'つくえのうえに本があります。',ex_en:'There is a book on the desk.'},
{jp:'した',h:'した',r:'shita',e:'under',ch:5,t:'noun-place',ex_jp:'いすのしたにねこがいます。',ex_en:'There is a cat under the chair.'},
{jp:'まえ',h:'まえ',r:'mae',e:'in front of',ch:5,t:'noun-place',ex_jp:'えきのまえにぎんこうがあります。',ex_en:'There is a bank in front of the station.'},
{jp:'うしろ',h:'うしろ',r:'ushiro',e:'behind',ch:5,t:'noun-place',ex_jp:'いえのうしろにきがあります。',ex_en:'There is a tree behind the house.'},
{jp:'なか',h:'なか',r:'naka',e:'inside',ch:5,t:'noun-place',ex_jp:'はこのなかになにがありますか。',ex_en:'What is inside the box?'},
{jp:'そと',h:'そと',r:'soto',e:'outside',ch:5,t:'noun-place',ex_jp:'そとはさむいです。',ex_en:'It is cold outside.'},
{jp:'となり',h:'となり',r:'tonari',e:'next to (same kind)',ch:5,t:'noun-place',ex_jp:'ぎんこうのとなりにコンビニがあります。',ex_en:'There is a convenience store next to the bank.'},
{jp:'よこ',h:'よこ',r:'yoko',e:'beside',ch:5,t:'noun-place',ex_jp:'まどのよこにつくえがあります。',ex_en:'There is a desk beside the window.'},
{jp:'ちかく',h:'ちかく',r:'chikaku',e:'near',ch:5,t:'noun-place',ex_jp:'がっこうのちかくにカフェがあります。',ex_en:'There is a cafe near the school.'},
{jp:'あいだ',h:'あいだ',r:'aida',e:'between',ch:5,t:'noun-place',ex_jp:'AとBのあいだにCがあります。',ex_en:'C is between A and B.'},
{jp:'みぎ',h:'みぎ',r:'migi',e:'right',ch:5,t:'noun-place',ex_jp:'みぎがわをみてください。',ex_en:'Please look on the right side.'},
{jp:'ひだり',h:'ひだり',r:'hidari',e:'left',ch:5,t:'noun-place',ex_jp:'ひだりがわはトイレです。',ex_en:'The left side is the restroom.'},
/* ─── EXPRESSIONS / GREETINGS ─────────────────────────────────────── */
{jp:'はじめまして',h:'はじめまして',r:'hajimemashite',e:'How do you do?',ch:1,t:'expr',ex_jp:'はじめまして。たなかです。',ex_en:'Nice to meet you. I’m Tanaka.'},
{jp:'どうぞよろしく',h:'どうぞよろしく',r:'douzo-yoroshiku',e:'Pleased to meet you',ch:1,t:'expr',ex_jp:'どうぞよろしくおねがいします。',ex_en:'Pleased to meet you.'},
{jp:'おはよう',h:'おはよう',r:'ohayou',e:'Good morning (casual)',ch:1,t:'expr',ex_jp:'おはよう、げんき？',ex_en:'Morning, you good?'},
{jp:'おはようございます',h:'おはようございます',r:'ohayou-gozaimasu',e:'Good morning (formal)',ch:1,t:'expr',ex_jp:'せんせい、おはようございます。',ex_en:'Good morning, sensei.'},
{jp:'こんにちは',h:'こんにちは',r:'konnichiwa',e:'Good afternoon / Hello',ch:1,t:'expr',ex_jp:'こんにちは、たなかさん。',ex_en:'Hello, Tanaka.'},
{jp:'こんばんは',h:'こんばんは',r:'konbanwa',e:'Good evening',ch:1,t:'expr',ex_jp:'こんばんは。きょうはさむいですね。',ex_en:'Good evening. It’s cold today, isn’t it?'},
{jp:'さようなら',h:'さようなら',r:'sayounara',e:'Goodbye',ch:1,t:'expr',ex_jp:'さようなら、また あした。',ex_en:'Goodbye, see you tomorrow.'},
{jp:'じゃあ、また',h:'じゃあ、また',r:'jaa-mata',e:'See you later',ch:1,t:'expr',ex_jp:'じゃあ、また あした。',ex_en:'See you tomorrow.'},
{jp:'しつれいします',h:'しつれいします',r:'shitsurei-shimasu',e:'Excuse me / leaving',ch:1,t:'expr',ex_jp:'では、しつれいします。',ex_en:'Well, please excuse me.'},
{jp:'すみません',h:'すみません',r:'sumimasen',e:'Excuse me / I am sorry',ch:1,t:'expr',ex_jp:'すみません、トイレはどこですか。',ex_en:'Excuse me, where is the restroom?'},
{jp:'ありがとうございます',h:'ありがとうございます',r:'arigatou-gozaimasu',e:'Thank you',ch:1,t:'expr',ex_jp:'たすけてくれて、ありがとうございます。',ex_en:'Thank you for helping.'},
{jp:'どういたしまして',h:'どういたしまして',r:'dou-itashimashite',e:'You’re welcome',ch:1,t:'expr',ex_jp:'A: ありがとう。 B: どういたしまして。',ex_en:'A: Thanks. B: You’re welcome.'},
{jp:'はい',h:'はい',r:'hai',e:'yes',ch:1,t:'expr',ex_jp:'はい、わかりました。',ex_en:'Yes, I understand.'},
{jp:'いいえ',h:'いいえ',r:'iie',e:'no',ch:1,t:'expr',ex_jp:'いいえ、ちがいます。',ex_en:'No, that’s not right.'},
{jp:'わかりません',h:'わかりません',r:'wakarimasen',e:"I don't understand",ch:1,t:'expr',ex_jp:'すみません、わかりません。',ex_en:'Sorry, I don’t understand.'},
{jp:'わかりました',h:'わかりました',r:'wakarimashita',e:'I understood',ch:1,t:'expr',ex_jp:'はい、わかりました。',ex_en:'Yes, I understood.'},
{jp:'こちらこそ',h:'こちらこそ',r:'kochira-koso',e:'Same here / likewise',ch:2,t:'expr',ex_jp:'こちらこそ、よろしくおねがいします。',ex_en:'Likewise, pleased to meet you.'},
{jp:'そうですか',h:'そうですか',r:'sou-desu-ka',e:'Is that so? / I see',ch:2,t:'expr',ex_jp:'A: あした、テストです。 B: そうですか。',ex_en:'A: There’s a test tomorrow. B: I see.'},
{jp:'ええ',h:'ええ',r:'ee',e:'yes (softer)',ch:2,t:'expr',ex_jp:'ええ、そうです。',ex_en:'Yes, that’s right.'},
{jp:'いってください',h:'いってください',r:'itte-kudasai',e:'Please say it',ch:1,t:'expr',ex_jp:'もういちどいってください。',ex_en:'Please say it again.'},
{jp:'もういちどいってください',h:'もういちどいってください',r:'mou-ichido-itte-kudasai',e:'Please say it again',ch:1,t:'expr',ex_jp:'すみません、もういちどいってください。',ex_en:'Sorry, please say it again.'},
{jp:'もうすこしゆっくりおねがいします',h:'もうすこしゆっくりおねがいします',r:'mou-sukoshi-yukkuri-onegai-shimasu',e:'Please speak more slowly',ch:1,t:'expr',ex_jp:'すみません、もうすこしゆっくりおねがいします。',ex_en:'Sorry, please speak a little more slowly.'},
{jp:'かいてください',h:'かいてください',r:'kaite-kudasai',e:'Please write',ch:1,t:'expr',ex_jp:'なまえをかいてください。',ex_en:'Please write your name.'},
{jp:'よんでください',h:'よんでください',r:'yonde-kudasai',e:'Please read',ch:1,t:'expr',ex_jp:'本をよんでください。',ex_en:'Please read the book.'},
{jp:'きいてください',h:'きいてください',r:'kiite-kudasai',e:'Please listen',ch:1,t:'expr',ex_jp:'よくきいてください。',ex_en:'Please listen carefully.'},
{jp:'みてください',h:'みてください',r:'mite-kudasai',e:'Please look',ch:1,t:'expr',ex_jp:'こくばんをみてください。',ex_en:'Please look at the chalkboard.'},
{jp:'ちょっとつごうがわるくて',h:'ちょっとつごうがわるくて',r:'chotto-tsugou-ga-warukute',e:"I'm a bit busy / can't",ch:6,t:'expr',ex_jp:'すみません、ちょっとつごうがわるくて…',ex_en:'Sorry, I’m a bit busy…'},
{jp:'ちょっとようじがあって',h:'ちょっとようじがあって',r:'chotto-youji-ga-atte',e:'I have errands',ch:6,t:'expr',ex_jp:'すみません、ちょっとようじがあって…',ex_en:'Sorry, I have errands…'},
{jp:'あがってください',h:'あがってください',r:'agatte-kudasai',e:'Please come in',ch:5,t:'expr',ex_jp:'どうぞ、あがってください。',ex_en:'Please come in.'},
/* ─── COUNTERS / SUFFIXES ─────────────────────────────────────── */
{jp:'～じ',h:'～じ',r:'~ji',e:"o'clock",ch:2,t:'counter',ex_jp:'7じにおきます。',ex_en:'I wake up at 7.'},
{jp:'～ふん',h:'～ふん',r:'~fun',e:'~ minute(s)',ch:2,t:'counter',ex_jp:'10ぷんかかります。',ex_en:'It takes 10 minutes.'},
{jp:'～じかん',h:'～じかん',r:'~jikan',e:'~ hours',ch:5,t:'counter',ex_jp:'にじかんべんきょうしました。',ex_en:'I studied for two hours.'},
{jp:'～ねん',h:'～ねん',r:'~nen',e:'year',ch:2,t:'counter',ex_jp:'らいねんは2026ねんです。',ex_en:'Next year is 2026.'},
{jp:'～ようび',h:'～ようび',r:'~youbi',e:'day of the week',ch:3,t:'suffix',ex_jp:'なんようびですか。',ex_en:'What day is it?'},
{jp:'～ぐらい',h:'～ぐらい',r:'~gurai',e:'about ~',ch:5,t:'suffix',ex_jp:'にじかんぐらいかかりました。',ex_en:'It took about 2 hours.'},
{jp:'～ご',h:'～ご',r:'~go',e:'language',ch:2,t:'suffix',ex_jp:'にほんごをはなします。',ex_en:'I speak Japanese.'},
{jp:'～じん',h:'～じん',r:'~jin',e:'nationality',ch:2,t:'suffix',ex_jp:'アメリカ人です。',ex_en:'I am American.'},
{jp:'～せい',h:'～せい',r:'~sei',e:'student',ch:2,t:'suffix',ex_jp:'りゅうがくせいです。',ex_en:'I am an international student.'},
{jp:'～や',h:'～や',r:'~ya',e:'store',ch:4,t:'suffix',ex_jp:'ほんやで本をかいました。',ex_en:'I bought a book at the bookstore.'},
{jp:'こん～',h:'こん',r:'kon-',e:'this ~',ch:3,t:'suffix',ex_jp:'こんしゅうはいそがしいです。',ex_en:'This week is busy.'},
{jp:'まい～',h:'まい',r:'mai-',e:'every ~',ch:3,t:'suffix',ex_jp:'まいにちがっこうへ行きます。',ex_en:'I go to school every day.'},
/* ─── PARTICLES (just for tooltip lookup; particle finder uses its own) ─────── */
{jp:'は',h:'は',r:'wa',e:'topic — "as for ___"',ch:2,t:'particle',ex_jp:'わたしはがくせいです。',ex_en:'As for me, I am a student.'},
{jp:'が',h:'が',r:'ga',e:'subject (existence/Q-words)',ch:4,t:'particle',ex_jp:'こうえんにいぬがいます。',ex_en:'There is a dog in the park.'},
{jp:'を',h:'を',r:'wo',e:'direct object',ch:3,t:'particle',ex_jp:'本をよみます。',ex_en:'I read a book.'},
{jp:'に',h:'に',r:'ni',e:'time / destination / location',ch:3,t:'particle',ex_jp:'7じにおきます。',ex_en:'I wake up at 7.'},
{jp:'で',h:'で',r:'de',e:'action location / means',ch:3,t:'particle',ex_jp:'としょかんでべんきょうします。',ex_en:'I study at the library.'},
{jp:'へ',h:'へ',r:'e',e:'direction toward',ch:3,t:'particle',ex_jp:'にほんへ行きます。',ex_en:'I go to Japan.'},
{jp:'と',h:'と',r:'to',e:'and / with',ch:6,t:'particle',ex_jp:'ともだちといきます。',ex_en:'I go with my friend.'},
{jp:'も',h:'も',r:'mo',e:'also / too',ch:2,t:'particle',ex_jp:'わたしもがくせいです。',ex_en:'I am also a student.'},
{jp:'の',h:'の',r:'no',e:'possession / "of"',ch:2,t:'particle',ex_jp:'わたしの本です。',ex_en:'It is my book.'},
{jp:'から',h:'から',r:'kara',e:'from',ch:2,t:'particle',ex_jp:'9じからじゅぎょうです。',ex_en:'Class is from 9.'},
{jp:'まで',h:'まで',r:'made',e:'until/to',ch:5,t:'particle',ex_jp:'5じまではたらきます。',ex_en:'I work until 5.'},
{jp:'か',h:'か',r:'ka',e:'question marker',ch:1,t:'particle',ex_jp:'がくせいですか。',ex_en:'Are you a student?'},
{jp:'ね',h:'ね',r:'ne',e:'agreement-seeking',ch:4,t:'particle',ex_jp:'いいてんきですね。',ex_en:'Nice weather, isn’t it?'},
{jp:'よ',h:'よ',r:'yo',e:'new info / FYI',ch:4,t:'particle',ex_jp:'あそこにぎんこうがありますよ。',ex_en:'There’s a bank over there, FYI.'},
/* ─── NUMBERS 1–10 ─────────────────────────────────────── */
{jp:'いち',h:'いち',r:'ichi',e:'one (1)',ch:2,t:'counter',ex_jp:'いちじにあいましょう。',ex_en:'Let’s meet at 1.'},
{jp:'に',h:'に',r:'ni',e:'two (2)',ch:2,t:'counter',ex_jp:'にじかんかかります。',ex_en:'It takes 2 hours.'},
{jp:'さん',h:'さん',r:'san',e:'three (3)',ch:2,t:'counter',ex_jp:'さんがついです。',ex_en:'It is March.'},
{jp:'よん',h:'よん',r:'yon',e:'four (4)',ch:2,t:'counter',ex_jp:'よんねんせいです。',ex_en:'I am a 4th-year.'},
{jp:'し',h:'し',r:'shi',e:'four (4, alt)',ch:2,t:'counter',ex_jp:'しがつにはじまります。',ex_en:'It starts in April.'},
{jp:'ご',h:'ご',r:'go',e:'five (5)',ch:2,t:'counter',ex_jp:'ごじにかえります。',ex_en:'I return at 5.'},
{jp:'ろく',h:'ろく',r:'roku',e:'six (6)',ch:2,t:'counter',ex_jp:'ろくじにおきます。',ex_en:'I wake up at 6.'},
{jp:'なな',h:'なな',r:'nana',e:'seven (7)',ch:2,t:'counter',ex_jp:'ななひゃくえんです。',ex_en:'It is 700 yen.'},
{jp:'はち',h:'はち',r:'hachi',e:'eight (8)',ch:2,t:'counter',ex_jp:'はちじにじゅぎょうです。',ex_en:'Class is at 8.'},
{jp:'きゅう',h:'きゅう',r:'kyuu',e:'nine (9)',ch:2,t:'counter',ex_jp:'きゅうじからはじまります。',ex_en:'It starts at 9.'},
{jp:'く',h:'く',r:'ku',e:'nine (9, alt)',ch:2,t:'counter',ex_jp:'くじにあいます。',ex_en:'We meet at 9.'},
{jp:'じゅう',h:'じゅう',r:'juu',e:'ten (10)',ch:2,t:'counter',ex_jp:'じゅうじにねます。',ex_en:'I sleep at 10.'},
{jp:'ひゃく',h:'ひゃく',r:'hyaku',e:'hundred',ch:2,t:'counter',ex_jp:'ひゃくえんです。',ex_en:'It is 100 yen.'},
{jp:'せん',h:'せん',r:'sen',e:'thousand',ch:2,t:'counter',ex_jp:'せんえんかります。',ex_en:'I borrow 1000 yen.'},
{jp:'まん',h:'まん',r:'man',e:'ten thousand',ch:2,t:'counter',ex_jp:'いちまんえんです。',ex_en:'It is 10,000 yen.'},
{jp:'ゼロ',h:'ぜろ',r:'zero',e:'zero',ch:3,t:'counter',ex_jp:'ゼロからはじめます。',ex_en:'I start from zero.'},
{jp:'れい',h:'れい',r:'rei',e:'zero (alt)',ch:3,t:'counter',ex_jp:'れいてんごです。',ex_en:'It is 0.5.'},
/* ─── COUNTERS ─────────────────────────────────────── */
{jp:'～にん',h:'～にん',r:'~nin',e:'~ people',ch:5,t:'counter',ex_jp:'4にんかぞくです。',ex_en:'My family has 4 people.'},
{jp:'～まい',h:'～まい',r:'~mai',e:'~ flat objects',ch:5,t:'counter',ex_jp:'きっぷを2まいかいました。',ex_en:'I bought 2 tickets.'},
{jp:'～ほん',h:'～ほん',r:'~hon',e:'~ long objects',ch:5,t:'counter',ex_jp:'ペンが3ぼんあります。',ex_en:'There are 3 pens.'},
{jp:'～さつ',h:'～さつ',r:'~satsu',e:'~ books / volumes',ch:5,t:'counter',ex_jp:'本を5さつかいました。',ex_en:'I bought 5 books.'},
{jp:'～えん',h:'～えん',r:'~en',e:'~ yen (currency)',ch:4,t:'counter',ex_jp:'500えんです。',ex_en:'It is 500 yen.'},
{jp:'～さい',h:'～さい',r:'~sai',e:'~ years old',ch:5,t:'counter',ex_jp:'いもうとは10さいです。',ex_en:'My sister is 10 years old.'},
{jp:'～ご',h:'～ご',r:'~go-time',e:'~ later (time)',ch:5,t:'counter',ex_jp:'10ぷんごにきます。',ex_en:'I will come in 10 minutes.'},
{jp:'～ごろ',h:'～ごろ',r:'~goro',e:'around (time point)',ch:5,t:'suffix',ex_jp:'3じごろにあいましょう。',ex_en:'Let’s meet around 3.'},
{jp:'あさって',h:'あさって',r:'asatte',e:'day after tomorrow',ch:3,t:'noun-time',daypoint:1,ex_jp:'あさってじゅぎょうがあります。',ex_en:'I have class the day after tomorrow.'},
/* ─── EXPRESSIONS — meals, polite ─────────────────────────────────────── */
{jp:'いただきます',h:'いただきます',r:'itadakimasu',e:'(before eating)',ch:3,t:'expr',ex_jp:'いただきます！',ex_en:'(Said before a meal.)'},
{jp:'ごちそうさまでした',h:'ごちそうさまでした',r:'gochisousama-deshita',e:'(after eating)',ch:3,t:'expr',ex_jp:'ごちそうさまでした。',ex_en:'(Said after a meal.)'},
{jp:'ごめんください',h:'ごめんください',r:'gomenkudasai',e:'(at someone’s door)',ch:5,t:'expr',ex_jp:'ごめんください、たなかさんいますか。',ex_en:'Hello, is Tanaka home?'},
{jp:'からきました',h:'からきました',r:'kara-kimashita',e:'I came from ~',ch:2,t:'expr',ex_jp:'アメリカからきました。',ex_en:'I came from America.'},
{jp:'どこからきましたか',h:'どこからきましたか',r:'doko-kara-kimashita-ka',e:'Where are you from?',ch:2,t:'expr',ex_jp:'どこからきましたか。',ex_en:'Where are you from?'},
{jp:'どちらからいらっしゃいましたか',h:'どちらからいらっしゃいましたか',r:'dochira-kara-irasshaimashita-ka',e:'Where are you from? (polite)',ch:2,t:'expr',ex_jp:'どちらからいらっしゃいましたか。',ex_en:'Where are you from? (polite)'},
{jp:'もういちどおねがいします',h:'もういちどおねがいします',r:'mou-ichido-onegai-shimasu',e:'Please say it again (student)',ch:1,t:'expr',ex_jp:'もういちどおねがいします。',ex_en:'Please say it again.'},
{jp:'おおきいこえでいってください',h:'おおきいこえでいってください',r:'ookii-koe-de-itte-kudasai',e:'Please speak loudly (instructor)',ch:1,t:'expr',ex_jp:'おおきいこえでいってください。',ex_en:'Please speak loudly.'},
{jp:'おおきいこえでおねがいします',h:'おおきいこえでおねがいします',r:'ookii-koe-de-onegai-shimasu',e:'Please speak loudly (student)',ch:1,t:'expr',ex_jp:'おおきいこえでおねがいします。',ex_en:'Please speak loudly.'},
{jp:'わかりましたか',h:'わかりましたか',r:'wakarimashita-ka',e:'Do you understand?',ch:1,t:'expr',ex_jp:'わかりましたか。',ex_en:'Do you understand?'},
{jp:'これはにほんごでなんといいますか',h:'これはにほんごでなんといいますか',r:'kore-wa-nihongo-de-nan-to-iimasu-ka',e:'How do you say this in Japanese?',ch:1,t:'expr',ex_jp:'これはにほんごでなんといいますか。',ex_en:'How do you say this in Japanese?'},
/* ─── Q-WORDS ─────────────────────────────────────── */
{jp:'なに',h:'なに',r:'nani',e:'what',ch:2,t:'qword',ex_jp:'なにをたべますか。',ex_en:'What will you eat?'},
{jp:'なん',h:'なん',r:'nan',e:'what (alt)',ch:2,t:'qword',ex_jp:'なんですか。',ex_en:'What is it?'},
{jp:'だれ',h:'だれ',r:'dare',e:'who',ch:2,t:'qword',ex_jp:'だれがきましたか。',ex_en:'Who came?'},
{jp:'いつ',h:'いつ',r:'itsu',e:'when',ch:3,t:'qword',ex_jp:'いつ いきますか。',ex_en:'When will you go?'},
{jp:'どうして',h:'どうして',r:'doushite',e:'why',ch:6,t:'qword',ex_jp:'どうしてですか。',ex_en:'Why?'},
{jp:'いくら',h:'いくら',r:'ikura',e:'how much',ch:4,t:'qword',ex_jp:'これはいくらですか。',ex_en:'How much is this?'},
{jp:'いくつ',h:'いくつ',r:'ikutsu',e:'how many',ch:5,t:'qword',ex_jp:'いくつありますか。',ex_en:'How many are there?'},
{jp:'どんな',h:'どんな',r:'donna',e:'what kind of',ch:5,t:'qword',ex_jp:'どんな本がすきですか。',ex_en:'What kind of books do you like?'},
/* ─── ADVERBS ─────────────────────────────────────── */
{jp:'ちょっと',h:'ちょっと',r:'chotto',e:'a little',ch:6,t:'adv',ex_jp:'ちょっとまってください。',ex_en:'Please wait a moment.'},
{jp:'すこし',h:'すこし',r:'sukoshi',e:'a little',ch:6,t:'adv',ex_jp:'すこしわかります。',ex_en:'I understand a little.'},
{jp:'いつも',h:'いつも',r:'itsumo',e:'always',ch:3,t:'adv',ex_jp:'いつもコーヒーをのみます。',ex_en:'I always drink coffee.'},
{jp:'ときどき',h:'ときどき',r:'tokidoki',e:'sometimes',ch:3,t:'adv',ex_jp:'ときどき えいがをみます。',ex_en:'I sometimes watch a movie.'},
{jp:'よく',h:'よく',r:'yoku',e:'often',ch:3,t:'adv',ex_jp:'よくとしょかんへ行きます。',ex_en:'I often go to the library.'},
{jp:'あまり',h:'あまり',r:'amari',e:'not much',ch:3,t:'adv',ex_jp:'あまりたべません。',ex_en:'I don’t eat much.'},
{jp:'ぜんぜん',h:'ぜんぜん',r:'zenzen',e:'not at all',ch:3,t:'adv',ex_jp:'ぜんぜんわかりません。',ex_en:'I don’t understand at all.'},
{jp:'ゆっくり',h:'ゆっくり',r:'yukkuri',e:'slowly',ch:1,t:'adv',ex_jp:'ゆっくりはなしてください。',ex_en:'Please speak slowly.'},
{jp:'はやく',h:'はやく',r:'hayaku',e:'quickly, early',ch:5,t:'adv',ex_jp:'はやくおきます。',ex_en:'I wake up early.'},
{jp:'おそく',h:'おそく',r:'osoku',e:'late',ch:5,t:'adv',ex_jp:'おそくねます。',ex_en:'I sleep late.'},
/* ─── HONORIFIC PREFIXES / SUFFIXES ─────────────────────────────────────── */
{jp:'お',h:'お',r:'o-',e:'(honorific prefix)',ch:1,t:'suffix',ex_jp:'おなまえはなんですか。',ex_en:'What is your name?'},
{jp:'ご',h:'ご',r:'go-',e:'(honorific prefix)',ch:1,t:'suffix',ex_jp:'ごりょうしんはおげんきですか。',ex_en:'Are your parents well?'},
{jp:'～さん',h:'～さん',r:'~san',e:'Mr/Ms (suffix)',ch:1,t:'suffix',ex_jp:'たなかさんはがくせいです。',ex_en:'Tanaka is a student.'},
{jp:'～せんせい',h:'～せんせい',r:'~sensei',e:'Professor ~',ch:1,t:'suffix',ex_jp:'やまだせんせいはやさしいです。',ex_en:'Professor Yamada is kind.'},
{jp:'～くん',h:'～くん',r:'~kun',e:'~ (boy/junior)',ch:1,t:'suffix',ex_jp:'たろうくんはともだちです。',ex_en:'Tarou is my friend.'},
{jp:'～ちゃん',h:'～ちゃん',r:'~chan',e:'~ (cute/child)',ch:1,t:'suffix',ex_jp:'はなちゃんはかわいいです。',ex_en:'Hana-chan is cute.'},
{jp:'～たち',h:'～たち',r:'~tachi',e:'plural marker (people)',ch:5,t:'suffix',ex_jp:'がくせいたちは こうえんに います。',ex_en:'The students are in the park.'},
/* ─── ADDITIONAL ADJECTIVES ─────────────────────────────────────── */
{jp:'きたない',h:'きたない',r:'kitanai',e:'dirty',ch:5,t:'adj-i',ex_jp:'このへやはきたないです。',ex_en:'This room is dirty.'},
{jp:'りっぱ',h:'りっぱ',r:'rippa',e:'splendid',ch:5,t:'adj-na',ex_jp:'りっぱなビルですね。',ex_en:'It is a splendid building.'},
{jp:'ひま',h:'ひま',r:'hima',e:'free (time)',ch:6,t:'adj-na',ex_jp:'こんしゅうはひまです。',ex_en:'I am free this week.'},
{jp:'べんり',h:'べんり',r:'benri',e:'convenient',ch:6,t:'adj-na',ex_jp:'コンビニはべんりです。',ex_en:'Convenience stores are convenient.'},
/* ─── CONJUNCTIONS ─────────────────────────────────────── */
{jp:'それから',h:'それから',r:'sorekara',e:'and then',ch:6,t:'expr',ex_jp:'あさごはんをたべます。それからがっこうへ行きます。',ex_en:'I eat breakfast. Then I go to school.'},
{jp:'しかし',h:'しかし',r:'shikashi',e:'however',ch:6,t:'expr',ex_jp:'にほんごはむずかしいです。しかし、おもしろいです。',ex_en:'Japanese is difficult. However, it is interesting.'},
{jp:'じゃあ',h:'じゃあ',r:'jaa',e:'well then',ch:6,t:'expr',ex_jp:'じゃあ、また あした。',ex_en:'Well then, see you tomorrow.'},
{jp:'では',h:'では',r:'dewa',e:'well then (formal)',ch:6,t:'expr',ex_jp:'では、はじめましょう。',ex_en:'Well then, let’s begin.'},
{jp:'だから',h:'だから',r:'dakara',e:'so / therefore',ch:6,t:'expr',ex_jp:'いそがしいです。だから、いきません。',ex_en:'I am busy. So I will not go.'},
{jp:'ですから',h:'ですから',r:'desukara',e:'so / therefore (polite)',ch:6,t:'expr',ex_jp:'たかいです。ですから、かいません。',ex_en:'It is expensive. So I will not buy it.'},
/* ─── FILLER / HESITATION ─────────────────────────────────────── */
{jp:'あのう',h:'あのう',r:'anou',e:'um, excuse me',ch:1,t:'expr',ex_jp:'あのう、すみません。',ex_en:'Um, excuse me.'},
{jp:'あの',h:'あの',r:'ano',e:'um (filler)',ch:1,t:'expr',ex_jp:'あの、ちょっとしつもんがあります。',ex_en:'Um, I have a question.'},
{jp:'えーと',h:'えーと',r:'eeto',e:'um, let me think',ch:1,t:'expr',ex_jp:'えーと、なんでしたっけ。',ex_en:'Um, what was it again?'},
/* ─── DEMONSTRATIVE PREFIXES ─────────────────────────────────────── */
{jp:'この',h:'この',r:'kono',e:'this (+ noun)',ch:2,t:'demonstr',ex_jp:'このほんはおもしろいです。',ex_en:'This book is interesting.'},
{jp:'その',h:'その',r:'sono',e:'that (+ noun)',ch:2,t:'demonstr',ex_jp:'そのペンはあなたのですか。',ex_en:'Is that pen yours?'},
{jp:'あの',h:'あの-d',r:'ano-d',e:'that over there (+ noun)',ch:2,t:'demonstr',ex_jp:'あのひとはだれですか。',ex_en:'Who is that person over there?'},
{jp:'どの',h:'どの',r:'dono',e:'which (+ noun)',ch:2,t:'demonstr',ex_jp:'どのほんがいいですか。',ex_en:'Which book is good?'},
{jp:'そちら',h:'そちら',r:'sochira',e:'that way (polite)',ch:2,t:'demonstr',ex_jp:'そちらはどなたですか。',ex_en:'Who is that (you)?'},
{jp:'あちら',h:'あちら',r:'achira',e:'that way (far, polite)',ch:2,t:'demonstr',ex_jp:'あちらにございます。',ex_en:'It is over there.'},
{jp:'どちら',h:'どちら',r:'dochira',e:'which way / where',ch:2,t:'demonstr',ex_jp:'どちらからきましたか。',ex_en:'Where are you from?'}
];

window.VOCAB_DB = V;

/* =====================================================
   Build a fast lookup map (any of jp / hira / romaji / english).
   ===================================================== */
const norm = s => (s||'').trim().toLowerCase().replace(/\s+/g,'');
const map = new Map();
V.forEach(w=>{
  [w.jp, w.h, w.r, w.e].forEach(k=>{
    if(!k) return;
    const n = norm(k);
    if(!map.has(n)) map.set(n, w);
  });
  // Also map common hiragana variants of romaji-only entries
  if(w.h && w.h !== w.jp){
    const n2 = norm(w.h);
    if(!map.has(n2)) map.set(n2, w);
  }
});
window.VOCAB_LOOKUP = map;
window.lookupVocabExample = function(headword){
  if(!headword) return null;
  const w = map.get(norm(headword));
  if(!w || !w.ex_jp) return null;
  return w.ex_jp + ' — ' + w.ex_en;
};

/* =====================================================
   PATCH the existing tooltip system: override findExample
   so that when a vocab item is hovered, our manually-curated
   example beats the dialogue-search fallback.
   ===================================================== */
function installFindExamplePatch(){
  // Defer until the original findExample is defined on the page.
  if(typeof window.findExample !== 'function'){
    return setTimeout(installFindExamplePatch, 80);
  }
  const original = window.findExample;
  window.findExample = function(jp){
    if(!jp) return '';
    // 1. Direct lookup
    let ex = window.lookupVocabExample(jp);
    if(ex) return ex;

    // 2. Strip ⚠️ + parenthetical chapter labels
    const cleaned = jp.replace(/⚠️/g,'').replace(/\([^)]*\)/g,'').replace(/\s+/g,'').trim();
    if(cleaned !== jp){
      ex = window.lookupVocabExample(cleaned);
      if(ex) return ex;
    }

    // 3. Compound headwords — try each part split by / ／ ・ → 、 ,
    //    e.g. 'たべる → たべます' → ['たべる','たべます']
    //    e.g. 'これ／それ／あれ／どれ' → ['これ','それ','あれ','どれ']
    //    e.g. 'おおきい / ちいさい' → ['おおきい','ちいさい']
    const parts = jp.split(/[\s　]*[\/／・→、,]+[\s　]*/).map(s=>s.replace(/⚠️/g,'').replace(/\([^)]*\)/g,'').trim()).filter(Boolean);
    for(const p of parts){
      ex = window.lookupVocabExample(p);
      if(ex) return ex;
    }

    // 4. Strip leading/trailing tildes (suffix headwords ～さん etc.)
    const tildeStripped = jp.replace(/[～~]/g,'').trim();
    if(tildeStripped && tildeStripped !== jp){
      ex = window.lookupVocabExample(tildeStripped);
      if(ex) return ex;
      // also try with ～ added back to either end
      ex = window.lookupVocabExample('～'+tildeStripped) || window.lookupVocabExample(tildeStripped+'～');
      if(ex) return ex;
    }

    // 5. Fall through to the original (CHAPTER_DATA dialogue search)
    return original(jp);
  };
}
installFindExamplePatch();

/* =====================================================
   Extend particle-finder vocab list when it loads.
   The widget exposes window.__PF_LOADED__ and stores its W
   array internally; we expose VOCAB_DB so the widget can
   merge it on init.
   ===================================================== */
})();

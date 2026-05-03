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

const WORD_NOTES = {
  "わたし": "1st-person, gender-neutral, polite-default. In class always safe.",
  "はい": "Affirmative. Can also mean \"here\" (presenting something).",
  "いいえ": "Negative. Slightly longer/firmer than ううん (casual).",
  "だいがくせい": "だい(big) + がく(study) + せい(student) = university student. ねんせい variants for year.",
  "えいご": "えい(England) + ご(language). All \"language\" words use ～ご suffix.",
  "学生": "がく(study) + せい(born/raw). Generic \"student\" — for college specifically use 大学生.",
  "先生": "せん(ahead) + せい(born) = \"born before\" = elder/teacher. Never use for yourself.",
  "日本人": "にほん(Japan) + じん(person). All nationalities use ～じん suffix.",
  "日本": "に(sun) + ほん(origin) = \"origin of the sun\" = land of the rising sun.",
  "アメリカ": "Loanword from \"America.\" Note long ア at end.",
  "日本語": "にほん + ご(language). Same pattern: えいご, ちゅうごくご.",
  "なまえ": "な(name) + まえ(front) = \"the name in front [of you].\" Honorific お+なまえ when asking.",
  "せんもん": "せん(specialty) + もん(gate/area) = academic specialty. ⚠ Note: the live deck also lists せんこう as \"major\" — these are interchangeable in Nakama.",
  "こちら": "Polite form of こっち. Uses こ (near me) + ちら (direction). Polite intro: こちらは～さんです.",
  "だれ": "Question word for people. ⚠ Subject-position always takes が (だれが), never は.",
  "なに / なん": "なん before です/の/counters · なに before を/が/は. ⚠ Same word, different reading by context.",
  "いま": "kanji 今 = now. Standalone OR prefix (今しゅう = this week). No particle に on bare いま.",
  "あさ": "morning. ⚠ NO に when used alone. Compounds: あさごはん, まいあさ.",
  "ばん": "evening/night. Compounds: ばんごはん, こんばん, まいばん. Synonym よる (later evening).",
  "まいにち": "まい(every) + にち(day). NO に — bare time-word. Pattern: まい+あさ/ばん/しゅう.",
  "学校": "がく(study) + こう(school). ⚠ small っ — がっこう, not がくこう.",
  "うち": "home/inside-group. うち も means \"(among) us.\" Synonym いえ (more physical building).",
  "食べる": "る-verb (Group 2). たべます/たべて/たべた. Direct object takes を.",
  "飲む": "u-verb (Group 1, む-stem). のみます/のんで/のんだ. Liquids + medicine + cigarettes use のむ.",
  "読む": "u-verb (む-stem). よみます/よんで/よんだ. Books, newspapers, magazines.",
  "見る": "る-verb. みます/みて/みた. Use for TV/movies/passive watching. ⚠ あう = meet a person uses に.",
  "べんきょうする": "べんきょう (study, noun) + する. Object marker を: にほんごをべんきょうします.",
  "おきる": "る-verb. おきます/おきて/おきた. ⚠ Bare time daypoints (きょう/あした) take NO に, but specific times (7じ) take に.",
  "ねる": "る-verb. ねます/ねて/ねた. \"Go to bed/sleep.\" Synonym やすむ = take a rest.",
  "よく": "(1) often. (2) Adverb form of いい/よい = \"well/skillfully.\" Context tells which. NO particle.",
  "ときどき": "sometimes. Reduplicated とき(time)+とき = \"time-times.\" Works with any verb form.",
  "あまり": "⚠ REQUIRES negative verb. あまりたべません = \"don't eat much.\" NEVER あまりたべます.",
  "ぜんぜん": "⚠ REQUIRES negative verb. ぜんぜんわかりません = \"don't understand at all.\" (0% on freq scale.)",
  "駅": "えき (kanji 駅). Train/subway station. Compounds: 駅前 = \"in front of station.\"",
  "図書館": "と(chart) + しょ(book) + かん(building) = library.",
  "銀行": "ぎん(silver) + こう(go) = \"where silver flows\" = bank.",
  "病院": "びょう(illness) + いん(institution) = hospital. ⚠ Note い not 員.",
  "レストラン": "Loanword from \"restaurant.\" Western-style; for traditional JP food use しょくじどころ.",
  "公園": "こう(public) + えん(garden) = park.",
  "まえ": "(1) in front of. (2) before (time): 3じのまえ. Position word — use の anchor: つくえのまえ.",
  "うしろ": "behind. Position word. Anchor with の: いえのうしろ.",
  "上": "うえ — kanji 上. Above/on top. ⚠ Always anchored: つくえのうえ, NOT つくえうえ.",
  "下": "した — kanji 下. Below/under. Anchored with の.",
  "中": "なか — kanji 中. Inside/middle. Anchored with の: かばんのなか.",
  "となり": "next to (SAME category — house next to house). Different from よこ (any side).",
  "よこ": "beside (any direction, any category). Less specific than となり.",
  "右": "みぎ — kanji 右. Right side.",
  "左": "ひだり — kanji 左. Left side.",
  "うち / へや": "うち = home/house · へや = a single room. Different scope.",
  "アパート": "Loanword from \"apartment.\" Smaller than マンション (which is also a loanword for higher-end condo).",
  "ベッド": "Loanword from \"bed.\" Note small ッ doubles d.",
  "机": "つくえ — kanji 机. Desk. Standalone kanji.",
  "窓": "まど — kanji 窓 = window. Standalone kanji not part of common compounds in Ch.5-6.",
  "大きい": "おおきい — i-adj. ⚠ Note long oo: おおきい, NOT おきい.",
  "小さい": "ちいさい — i-adj. ⚠ Note long ii: ちいさい, NOT ちさい.",
  "高い": "たかい — i-adj. Same word for \"tall\" AND \"expensive\" — context tells which.",
  "安い": "やすい — i-adj. \"Cheap/inexpensive.\" Antonym of たかい(expensive).",
  "新しい": "あたらしい — i-adj. Opposite of ふるい.",
  "古い": "ふるい — i-adj. ⚠ For PEOPLE use としうえ/としより — ふるい is for objects only.",
  "きれい": "⚠ NA-adj despite ending in い! Use な before noun: きれいなはな. \"Pretty\" AND \"clean.\"",
  "しずか": "na-adj. Modifies: しずかなへや. te-form: しずかで. Adv: しずかに.",
  "にぎやか": "na-adj. \"Lively\" — for places/atmospheres, not people.",
  "ゆうめい": "⚠ NA-adj despite ending in い! きゆり-cucumber crew (きれい・ゆうめい・りっぱ).",
  "いい": "⚠ Irregular i-adj. Plain dict form is also よい (formal). All non-affirmative-non-past forms use よ-stem: よくない, よかった, よくなかった, よくて.",
  "しゅうまつ": "しゅう(week) + まつ(end) = weekend. ⚠ NO に (relative time word).",
  "天気": "てん(sky) + き(spirit) = weather.",
  "えいが": "movie. Watching: えいがをみる (object を). Going to see: えいがにいく (purpose に).",
  "ともだち": "とも(friend) + だち (plural-ish suffix). Always treated as a friendly noun.",
  "聞く": "u-verb (く-stem). きく can mean \"listen\" OR \"ask.\" Context disambiguates.",
  "書く": "u-verb (く-stem). かく = \"write\" AND \"draw\" (same word).",
  "話す": "u-verb (す-stem). はなす. ⚠ vs に: と-はなす = mutual conversation; に-はなす = speak TO them.",
  "あそぶ": "u-verb (ぶ-stem). \"Play/have fun\" — used for adults too, not childish.",
  "およぐ": "u-verb (ぐ-stem). て-form: およいで.",
  "まつ": "u-verb (つ-stem). Direct object takes を: ともだちをまちます.",
  "かう": "u-verb (う-stem). て-form: かって.",
  "とる": "⚠ Group 1 る-IMPOSTOR (despite -る ending). Conjugates as u-verb: とります, とって, とった.",
  "たのしい": "⚠ Listed here as na-adj but actually i-adj. Past: たのしかった. Modifies: たのしいしゅうまつ.",
  "あつい": "i-adj. Note: 暑い = hot weather, 熱い = hot to touch — same kana spelling.",
  "さむい": "i-adj. Cold weather. For objects/feelings cold use つめたい.",
  "イギリス": "Loanword from Portuguese \"Inglês.\"",
  "カナダ": "Loanword from \"Canada.\"",
  "オーストラリア": "Loanword from \"Australia.\" ⚠ Note ー extends ō.",
  "かんこく": "かん(Han) + こく(country) = South Korea. Kanji: 韓国.",
  "スペイン": "Loanword from \"Spain.\" Note ペ has handakuten.",
  "たいわん": "Phonetic kanji 台湾 (Taiwan). たい(platform) + わん(bay).",
  "ちゅうごく": "ちゅう(middle) + ごく(country) = China = \"Middle Kingdom.\" Kanji: 中国.",
  "フランス": "Loanword from \"France.\"",
  "メキシコ": "Loanword from \"Mexico.\"",
  "せんこう": "せん(specialty) + こう(focus). Academic major. Synonym せんもん.",
  "りゅうがくせい": "りゅう(stay) + がく(study) + せい(student) = international student.",
  "だいがくいんせい": "だいがく(college) + いん(institute) + せい = grad student.",
  "こうこう": "こう(high) + こう(school) — same kanji 校 twice. Full: 高等学校 (こうとうがっこう).",
  "ぼく": "Male, casual 1st-person. Younger/peer contexts. In class default to わたし.",
  "ごご": "ご(noon) + ご(after) = P.M. Used before clock time: ごご3じ.",
  "ごぜん": "ご(noon) + ぜん(before) = A.M. Used before clock: ごぜん10じ.",
  "らいねん": "らい(coming) + ねん(year) = next year. Pattern: らい + しゅう/げつ/ねん.",
  "いちねんせい": "1st-year. Pattern: number + ねんせい. ⚠ よねんせい (NOT よんねんせい).",
  "にねんせい": "2nd-year. Pattern: number + ねんせい.",
  "さんねんせい": "3rd-year (junior). Pattern: number + ねんせい. Regular reading さん.",
  "よねんせい": "4th-year. ⚠ よ NOT よん before ねんせい.",
  "いがく": "い(medical) + がく(study) = medicine.",
  "おんがく": "おん(sound) + がく(pleasure) = music.",
  "かがく": "か(change) + がく = chemistry. ⚠ Different from しゃかいがく (sociology) and すうがく (math).",
  "きょういくがく": "きょう(teach) + いく(raise) + がく = education.",
  "けいざいがく": "けい(govern) + ざい(wealth) + がく = economics.",
  "けいえいがく": "けい(manage) + えい(operate) + がく = business administration.",
  "けんちくがく": "けんちく(construction) + がく = architecture.",
  "こうがく": "こう(skill/work) + がく = engineering.",
  "こくさいかんけい": "こくさい(international) + かんけい(relations) = IR.",
  "しゃかいがく": "しゃかい(society) + がく = sociology.",
  "しんりがく": "しんり(mental principle) + がく = psychology.",
  "じんるいがく": "じんるい(humankind) + がく = anthropology.",
  "すうがく": "すう(number) + がく = mathematics.",
  "せいぶつがく": "せいぶつ(living thing) + がく = biology.",
  "せいじがく": "せいじ(politics) + がく = political science.",
  "びじゅつ": "び(beauty) + じゅつ(art) = fine arts.",
  "ぶつりがく": "ぶつり(physical principle) + がく = physics.",
  "ぶんがく": "ぶん(writing) + がく = literature.",
  "れきし": "history. Standalone — no がく suffix.",
  "ビジネス": "Loanword. Used like a noun: ビジネスのべんきょう.",
  "コンピュータこうがく": "Mixed loan + kanji. Computer engineering.",
  "アジアけんきゅう": "アジア (loan) + けんきゅう(research) = Asian studies.",
  "きょう": "⚠ Irregular: 今日 reads きょう (NOT こんにち). NO particle に — bare time word.",
  "あした": "⚠ Irregular: 明日 reads あした (NOT みょうにち). NO に.",
  "きのう": "⚠ Irregular: 昨日 reads きのう (NOT さくじつ). NO に.",
  "おととい": "day before yesterday. NO に.",
  "あさって": "day after tomorrow. NO に.",
  "こんばん": "こん(this) + ばん(eve) = tonight. NO に.",
  "こんしゅう": "こん(this) + しゅう(week) = this week. ⚠ Reads こんしゅう, NOT こんしゅう (irregular). NO に.",
  "せんしゅう": "せん(before) + しゅう(week) = last week. NO に.",
  "まいあさ": "まい(every) + あさ(morning). NO に.",
  "まいしゅう": "まい(every) + しゅう(week). NO に.",
  "まいばん": "まい(every) + ばん(eve). NO に.",
  "つぎ": "next (in sequence). つぎのバス = next bus.",
  "あさごはん": "あさ(morning) + ごはん(meal). Breakfast.",
  "ひるごはん": "ひる(noon/midday) + ごはん(meal) = lunch. Same pattern as あさごはん, ばんごはん.",
  "ばんごはん": "ばん(eve) + ごはん. Dinner.",
  "ごはん": "ご (honorific) + はん(rice/meal). Both \"cooked rice\" AND general \"meal.\"",
  "コーヒー": "Loanword from English \"coffee.\" Note ー lengthens vowels.",
  "おちゃ": "お (honorific) + ちゃ(tea). Default to green tea unless specified.",
  "おふろ": "お (honorific) + ふろ(bath). Verb: おふろにはいる (に, not で — entering).",
  "シャワー": "Loanword. Verb: シャワーをあびる (あびる = bathe in/take).",
  "じゅぎょう": "じゅ(give) + ぎょう(work) = \"lecture/class session.\" Different from クラス (group).",
  "クラス": "Loanword. Refers to the GROUP of classmates, not the lecture itself.",
  "しゅくだい": "しゅく(home) + だい(topic) = \"home-topic\" = homework.",
  "せいかつ": "せい(life) + かつ(active) = daily life/living.",
  "テレビ": "Loanword, short for \"television.\"",
  "でんわばんごう": "でんわ(phone) + ばんごう(number). Asking: でんわばんごうはなんですか.",
  "本": "ほん — kanji 本 = origin/main → book. Counter: ～さつ (一冊, NOT ～本 which is for long-thin objects).",
  "げつようび": "げつ(月=moon) + ようび(day-of-week) = Monday. Kanji: 月曜日.",
  "かようび": "か(火=fire) + ようび = Tuesday.",
  "すいようび": "すい(水=water) + ようび = Wednesday.",
  "もくようび": "もく(木=tree) + ようび = Thursday.",
  "きんようび": "きん(金=gold) + ようび = Friday.",
  "どようび": "ど(土=earth) + ようび = Saturday.",
  "にちようび": "にち(日=sun) + ようび = Sunday.",
  "なんようび": "なん(what) + ようび = \"what day-of-week?\"",
  "いく": "⚠ Irregular u-verb. ます: いきます. Te-form: いって (NOT いいて).",
  "くる": "⚠ Irregular. ます: きます. Plain neg: こない.",
  "する": "⚠ Irregular. ます: します. Compound: べんきょうする, さんぽする.",
  "かえる": "⚠ Group 1 る-IMPOSTOR (looks like ru-verb, conjugates as u-verb). ます: かえります (NOT かえます).",
  "はいる": "⚠ Group 1 る-IMPOSTOR. ます: はいります. Use for entering bath/room.",
  "あびる": "Group 2 (true ru-verb). ます: あびます. シャワーをあびる.",
  "いつも": "always (100%). Means \"anytime\" literally (いつ+も). NO particle.",
  "たいてい": "usually (~80%). NO particle.",
  "そして": "sentence-initial connector. \"And then…\" Sequential link.",
  "ですから": "です + から(because) = \"so/therefore.\" Sentence-initial conclusion.",
  "えんぴつ": "えん(lead) + ぴつ(brush) = pencil. Kanji 鉛筆 rare in Ch.1-6.",
  "ペン": "Loanword from \"pen.\"",
  "ボールペン": "ball + pen. Ballpoint pen.",
  "けしゴム": "けし(erase) + ゴム(gum/rubber loan). Eraser.",
  "ノート": "Loanword. Notebook.",
  "きょうかしょ": "きょう(teach) + か(subject) + しょ(book) = textbook.",
  "じしょ": "じ(word) + しょ(book) = dictionary.",
  "かばん": "general \"bag.\" More specific: ハンドバッグ, リュック (backpack).",
  "テスト": "Loanword. Test.",
  "たてもの": "たてる(build) + もの(thing) = structure/building. Generic term.",
  "ビル": "Loanword, short for \"building.\" Specifically tall/multi-story.",
  "カフェ": "Loanword from French \"café.\" Western-style.",
  "きっさてん": "きっさ(drink-tea) + てん(shop). Traditional JP coffee shop, often older clientele.",
  "コンビニ": "Loanword, short for \"convenience store\" (コンビニエンスストア).",
  "スーパー": "Loanword, short for \"supermarket.\"",
  "デパート": "Loanword, short for \"department store.\"",
  "ほんや": "ほん(book) + や(shop) = bookstore. Pattern: パンや, さかなや.",
  "ゆうびんきょく": "ゆうびん(mail) + きょく(bureau) = post office.",
  "こうばん": "こう(exchange) + ばん(watch) = small police box. JP institution.",
  "りょう": "kanji 寮 = dormitory. Short standalone word.",
  "まち": "kanji 町 = town/neighborhood. Smaller than し(city).",
  "このへん": "この(this) + へん(vicinity) = \"this area, around here.\"",
  "ホテル": "Loanword.",
  "あおい": "i-adj. Also \"green\" for traffic lights / fresh produce / young people.",
  "あかい": "i-adj. Red.",
  "きいろい": "きいろ(yellow) + い. Yellow.",
  "くろい": "i-adj. Black.",
  "しろい": "i-adj. White.",
  "ちゃいろい": "ちゃ(tea) + いろ(color) + い = tea-colored = brown.",
  "どうも": "(1) \"very (much)\" with thanks: どうもありがとう. (2) \"Hello\" casual. Versatile filler.",
  "とても": "very (used with adjectives in affirmative). NO particle.",
  "りっぱ": "⚠ NA-adj despite ending in ぱ-row. \"Splendid/imposing/fine.\"",
  "外": "そと — kanji 外. Outside. Anchor with の: いえのそと.",
  "近く": "ちかく — adv form of ちかい(near). \"Nearby.\" Anchor with の: いえのちかく.",
  "あいだ": "between (two reference points). Pattern: AとBのあいだ.",
  "いす": "chair. Standalone kanji 椅子 rare in Ch.1-6.",
  "犬": "いぬ — kanji 犬. Dog.",
  "ねこ": "cat. Standalone.",
  "テーブル": "Loanword from \"table.\" Western-style. Traditional: ちゃぶだい (low table).",
  "ソファ": "Loanword.",
  "ふとん": "JP floor bedding (mattress + duvet). Distinct from ベッド.",
  "おしいれ": "おす(push) + いれる(insert) = JP closet (sliding doors, hides futon).",
  "たんす": "standalone — chest of drawers.",
  "ドア": "Loanword. Western-style hinged door. Traditional: と.",
  "トイレ": "Loanword, short for \"toilet.\" Polite alternatives: おてあらい, けしょうしつ.",
  "時計": "と(time) + けい(measure). Clock OR watch — context.",
  "本棚": "ほん(book) + たな(shelf) = bookshelf.",
  "写真": "しゃ(copy) + しん(truth) = photograph. Verb: しゃしんをとる.",
  "けいたい": "short for けいたいでんわ (carry-belt + telephone) = cell phone.",
  "電話": "でん(electric) + わ(talk) = telephone.",
  "コンピュータ": "Loanword from \"computer.\"",
  "ビデオ": "Loanword from \"video.\"",
  "自転車": "じ(self) + てん(rotate) + しゃ(vehicle) = self-rotating-vehicle = bicycle.",
  "車": "くるま — kanji 車 = vehicle, but defaults to \"car.\"",
  "バス": "Loanword. Bus.",
  "もの": "kanji 物 = thing (tangible object). Different from こと (intangible).",
  "ところ": "kanji 所 = generic \"place.\"",
  "教室": "きょう(teach) + しつ(room) = classroom.",
  "キッチン": "Loanword. Western kitchen. Traditional: だいどころ.",
  "がくせいかいかん": "がくせい(student) + かい(meeting) + かん(hall) = student union.",
  "がくしょく": "short for がくせいしょくどう (student dining hall) = cafeteria.",
  "体育館": "たい(body) + いく(raise) + かん(building) = gymnasium.",
  "こくばん": "こく(black) + ばん(board). Chalkboard/blackboard.",
  "山": "やま — kanji 山. Mountain. Visual mnemonic: 3 peaks.",
  "川": "かわ — kanji 川. River. Visual: 3 wavy lines.",
  "木": "き — kanji 木. Tree. Two trees → 林(woods); three → 森(forest).",
  "絵": "え — kanji 絵. Picture/drawing/painting.",
  "人": "ひと — kanji 人. Person. Counter: ～にん (ひとり, ふたり irreg).",
  "あのかた": "あの(that-far) + かた(polite for hito). \"That person (polite).\"",
  "明るい": "あか(red/bright base) + るい. ⚠ Same root as あかい(red).",
  "暗い": "くら(dark) + い. Antonym of あかるい.",
  "広い": "ひろ(wide). Spacious. Antonym せまい.",
  "せまい": "narrow/cramped. Antonym ひろい.",
  "はやい": "fast (速い) OR early (早い) — same kana, different kanji.",
  "たくさん": "⚠ NEVER takes a particle. Used adverbially: しゅくだいがたくさんあります.",
  "あるいて": "⚠ Te-form of あるく (walk). \"On foot.\" NEVER takes で as transport (no バスで equivalent).",
  "かかります": "u-verb (る-impostor in dict form かかる). \"Takes time/cost.\" Pattern: バスで20ぷんかかります.",
  "アルバイト": "From German \"Arbeit\" (work). Part-time job. Short form バイト.",
  "買い物": "かい(buy) + もの(thing). Shopping. Verb: かいものにいく (purpose に).",
  "さんぽ": "さん(scatter) + ぽ(step) = walk/stroll. Verb: さんぽする / さんぽにいく.",
  "うんどう": "うん(carry/move) + どう(move) = exercise.",
  "ジョギング": "Loanword from \"jogging.\"",
  "テニス": "Loanword. Verb: テニスをする (を + する).",
  "ゲーム": "Loanword. Verb: ゲームをする.",
  "コンサート": "Loanword. Going: コンサートにいく.",
  "パーティ": "Loanword from \"party.\"",
  "ピクニック": "Loanword.",
  "プール": "Loanword from \"pool.\" Swimming: プールでおよぐ (で = action location).",
  "仕事": "し(serve) + ごと(act). Job/work. Verb: しごとをする.",
  "しつもん": "しつ(quality) + もん(ask) = question. Verb: しつもんする (asking) / しつもんにこたえる (answering).",
  "ざっし": "ざつ(misc) + し(record) = magazine. ⚠ small っ.",
  "新聞": "しん(new) + ぶん(hear) = newspaper.",
  "手紙": "て(hand) + がみ(paper) = letter (mail).",
  "メール": "Loanword. E-mail or text message.",
  "そうじ": "そう(sweep) + じ(eliminate) = cleaning. Verb: そうじをする / そうじする.",
  "せんたく": "せん(wash) + たく(rinse) = laundry.",
  "りょうり": "りょう(material) + り(logic) = cooking/cuisine.",
  "りょうしん": "りょう(both) + しん(parent) = parents (both).",
  "やすみ": "verb stem of やすむ(rest) = a rest/day off.",
  "こんど": "こん(this) + ど(occasion) = next time / this occasion.",
  "会う": "u-verb (う-stem). ⚠ Always takes に for the person met: ともだちにあう (NEVER ともだちとあう except specific contexts).",
  "歩く": "u-verb (く-stem). Te-form あるいて = \"on foot\" (special use, no で).",
  "言う": "u-verb (う-stem). ます: いいます. Te-form: いって.",
  "よぶ": "u-verb (ぶ-stem). \"Call/invite (someone over).\" Te-form: よんで.",
  "かける": "る-verb. でんわをかける = make a phone call. でを mark of object.",
  "でかける": "で(out) + かける. Te-form: でかけて. Go out.",
  "いそがしい": "busy (with work/tasks). Past: いそがしかった.",
  "うれしい": "happy (situational, specific moment). Different from しあわせ (overall well-being).",
  "おもしろい": "おもて(face) + しろ(white) = \"bright face\" → interesting/funny.",
  "かなしい": "sad. Past: かなしかった.",
  "さびしい": "lonely. Variant さみしい.",
  "つまらない": "⚠ Already in negative form structurally. Means \"boring.\" Past: つまらなかった.",
  "むずかしい": "difficult. Antonym やさしい.",
  "やさしい": "easy (易しい) OR kind (優しい) — same kana, different kanji.",
  "きたない": "dirty. Antonym きれい.",
  "げんき": "げん(origin) + き(spirit) = healthy/lively. Greeting: おげんきですか.",
  "ひま": "free/unscheduled. ⚠ Antonym is いそがしい (i-adj), but ひま is na-adj.",
  "だいじょうぶ": "だい(great) + じょうぶ(sturdy) = \"all right/no problem.\"",
  "たいへん": "たい(great) + へん(change) = \"tough/serious.\" Often opens sympathy: たいへんですね.",
  "ざんねん": "ざん(remain) + ねん(thought) = regrettable.",
  "べんり": "べん(convenient) + り(advantage) = convenient.",
  "ぜひ": "ぜ(right) + ひ(wrong) = \"by all means / definitely.\" Polite eagerness.",
  "ゆっくり": "slowly/leisurely. NO particle.",
  "いっしょに": "⚠ Already contains に — never add another. \"Together.\"",
  "どう": "how/how about. どうですか = \"How is it?\" / どうでしたか = \"How was it?\"",
  "あなた": "⚠ Avoid — sounds confrontational. Use name+さん instead.",
  "かれ": "he / boyfriend (context).",
  "かのじょ": "she / girlfriend (context).",
  "どちら": "polite \"which/where/who.\" こちら/そちら/あちら/どちら series.",
  "東京": "とう(east) + きょう(capital) = Tokyo. Note long とう, きょう.",
  "いちじ": "1:00. Pattern: number + じ. ⚠ Note 4=よ, 7=しち, 9=く (irregular before じ).",
  "にじ": "2:00.",
  "さんじ": "3:00.",
  "ごじ": "5:00.",
  "ろくじ": "6:00.",
  "はちじ": "8:00.",
  "じゅうじ": "10:00.",
  "じゅういちじ": "11:00.",
  "じゅうにじ": "12:00.",
  "はん": "half past. 7じはん = 7:30. Always after the hour.",
  "そのあと": "その(that) + あと(after) = \"after that.\"",
  "らいしゅう": "らい(coming) + しゅう(week) = next week. NO に.",
  "どうして": "どう(how) + して(do-te) = \"why/how come?\"",
  "ゼロ / れい": "ゼロ (loanword) OR れい (Sino). Both used. れい more formal.",
  "にふん": "2 minutes. Regular reading.",
  "よんぷん": "4 minutes. ⚠ Sound shift: よん + ふん → よんぷん (handakuten).",
  "ごふん": "5 minutes. Regular.",
  "ななふん": "7 minutes. Regular.",
  "きゅうふん": "9 minutes. Regular.",
  "なんぷん": "⚠ Sound shift: なん + ふん → なんぷん. \"How many minutes?\"",
  "いくら": "how much (money/cost)?",
  "いくつ": "how many (generic items)? OR \"how old?\" (informal).",
  "奥": "おく — kanji 奥 = interior/inner. Anchor with の.",
  "手前": "て(hand) + まえ(front) = \"this side / closer (to me).\"",
  "どのぐらい / どのくらい": "how long/much/many. Both readings standard.",
  "あがってください": "あがる(rise/step up) + て + ください. JP floor is elevated — said when inviting in.",
  "いらっしゃい": "casual short form of いらっしゃいませ. Said by host when visitor arrives.",
  "おじゃまします": "お(pol) + じゃま(intrusion) + します = \"Pardon the intrusion.\" Said upon entering.",
  "ごめんください": "ご(pol) + めん(pardon) + ください = \"Anyone home?\" Said at the door.",
  "やすみのひ": "やすみ(rest) + の + ひ(day) = \"a day off / holiday.\"",
  "ちょっとつごうがわるくて": "ちょっと(a bit) + つごう(situation) + が + わるい(bad) + te. Trails off — polite refusal.",
  "ちょっとようじがあって": "ちょっと + ようじ(errand) + が + ある + te. \"I have errands…\" — polite refusal.",
  "ちょっと": "a little. Versatile softener: ちょっとまって = wait a sec.",
  "すこし": "a little (more formal than ちょっと). Often before quantities.",
  "はやく": "adv form of はやい. \"Quickly/early.\" NO particle.",
  "おそく": "adv form of おそい(late/slow). \"Late.\" NO particle.",
  "～くん": "For junior males / male peers in casual contexts.",
  "～ちゃん": "Cute/familiar suffix — children, close friends, pets.",
  "～たち": "Pluralizing suffix for people: わたしたち (we), がくせいたち (students).",
  "いち": "1. Sino-Japanese reading. With counters: いっぷん, いちじ.",
  "に": "2. Same word as the particle に, but context distinguishes.",
  "さん": "3. Triggers handakuten in some counters: さんぷん, さんぼん.",
  "よん / し": "4. ⚠ し avoided (homophone with 死=death) in many contexts. Default よん.",
  "ご": "5.",
  "ろく": "6. Triggers small っ: ろっぷん, ろっぽん.",
  "なな / しち": "7. ⚠ Both used. Counter-dependent: しちじ for time, ななふん for minutes.",
  "はち": "8. Triggers small っ: はっぷん, はっぽん.",
  "きゅう / く": "9. ⚠ く used before じ (くじ); きゅう elsewhere.",
  "じゅう": "10. Triggers small っ: じゅっぷん.",
  "ひゃく": "100. Sound shifts: 300=さんびゃく, 600=ろっぴゃく, 800=はっぴゃく.",
  "せん": "1000. Sound shifts: 3000=さんぜん, 8000=はっせん.",
  "まん": "10,000. Numbers count by 10K, not 1M (e.g. 100,000 = じゅうまん)."
};


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
  { ch:2, en:'specialty / area of expertise', ja:'せんもん', kana:'せんもん' },
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
  { ch:6, en:'to listen / to ask', ja:'聞く', kana:'きく', kanjiNote:'聞 = listen/hear/ask' },
  { ch:6, en:'to write', ja:'書く', kana:'かく', kanjiNote:'書 = write' },
  { ch:6, en:'to speak', ja:'話す', kana:'はなす', kanjiNote:'話 = talk' },
  { ch:6, en:'to play (have fun)', ja:'あそぶ', kana:'あそぶ' },
  { ch:6, en:'to swim', ja:'およぐ', kana:'およぐ' },
  { ch:6, en:'to wait', ja:'まつ', kana:'まつ' },
  { ch:6, en:'to buy', ja:'かう', kana:'かう' },
  { ch:6, en:'to take (photo)', ja:'とる', kana:'とる' },
  { ch:6, en:'fun (i-adj)', ja:'たのしい', kana:'たのしい' },
  { ch:6, en:'hot (weather, i-adj)', ja:'あつい', kana:'あつい' },
  { ch:6, en:'cold (weather, i-adj)', ja:'さむい', kana:'さむい' },

  // === BACKFILL FROM FSRS DECK — every word in CHAPTER_DATA not yet covered ===
  // CH 1 — set phrases that aren't already in greetings
  { ch:1, en:'English language', ja:'えいご', kana:'えいご' },

  // CH 2 — countries, subjects, identity, time
  { ch:2, en:'England', ja:'イギリス', kana:'イギリス' },
  { ch:2, en:'Canada', ja:'カナダ', kana:'カナダ' },
  { ch:2, en:'Australia', ja:'オーストラリア', kana:'オーストラリア' },
  { ch:2, en:'South Korea', ja:'かんこく', kana:'かんこく' },
  { ch:2, en:'Spain', ja:'スペイン', kana:'スペイン' },
  { ch:2, en:'Taiwan', ja:'たいわん', kana:'たいわん' },
  { ch:2, en:'China', ja:'ちゅうごく', kana:'ちゅうごく' },
  { ch:2, en:'France', ja:'フランス', kana:'フランス' },
  { ch:2, en:'Mexico', ja:'メキシコ', kana:'メキシコ' },
  { ch:2, en:'major (academic concentration)', ja:'せんこう', kana:'せんこう' },
  { ch:2, en:'international student', ja:'りゅうがくせい', kana:'りゅうがくせい' },
  { ch:2, en:'graduate student', ja:'だいがくいんせい', kana:'だいがくいんせい' },
  { ch:2, en:'high school', ja:'こうこう', kana:'こうこう' },
  { ch:2, en:'I (male, casual)', ja:'ぼく', kana:'ぼく' },
  { ch:2, en:'P.M., afternoon', ja:'ごご', kana:'ごご' },
  { ch:2, en:'A.M., morning', ja:'ごぜん', kana:'ごぜん' },
  { ch:2, en:'next year', ja:'らいねん', kana:'らいねん' },
  { ch:2, en:'1st-year (freshman)', ja:'いちねんせい', kana:'いちねんせい' },
  { ch:2, en:'2nd-year (sophomore)', ja:'にねんせい', kana:'にねんせい' },
  { ch:2, en:'3rd-year (junior)', ja:'さんねんせい', kana:'さんねんせい' },
  { ch:2, en:'4th-year (senior)', ja:'よねんせい', kana:'よねんせい' },
  // School subjects (Ch 2 vocab)
  { ch:2, en:'medicine (medical science)', ja:'いがく', kana:'いがく' },
  { ch:2, en:'music', ja:'おんがく', kana:'おんがく' },
  { ch:2, en:'chemistry', ja:'かがく', kana:'かがく' },
  { ch:2, en:'education', ja:'きょういくがく', kana:'きょういくがく' },
  { ch:2, en:'economics', ja:'けいざいがく', kana:'けいざいがく' },
  { ch:2, en:'business administration', ja:'けいえいがく', kana:'けいえいがく' },
  { ch:2, en:'architecture', ja:'けんちくがく', kana:'けんちくがく' },
  { ch:2, en:'engineering', ja:'こうがく', kana:'こうがく' },
  { ch:2, en:'international relations', ja:'こくさいかんけい', kana:'こくさいかんけい' },
  { ch:2, en:'sociology', ja:'しゃかいがく', kana:'しゃかいがく' },
  { ch:2, en:'psychology', ja:'しんりがく', kana:'しんりがく' },
  { ch:2, en:'anthropology', ja:'じんるいがく', kana:'じんるいがく' },
  { ch:2, en:'mathematics', ja:'すうがく', kana:'すうがく' },
  { ch:2, en:'biology', ja:'せいぶつがく', kana:'せいぶつがく' },
  { ch:2, en:'political science', ja:'せいじがく', kana:'せいじがく' },
  { ch:2, en:'fine arts', ja:'びじゅつ', kana:'びじゅつ' },
  { ch:2, en:'physics', ja:'ぶつりがく', kana:'ぶつりがく' },
  { ch:2, en:'literature', ja:'ぶんがく', kana:'ぶんがく' },
  { ch:2, en:'history', ja:'れきし', kana:'れきし' },
  { ch:2, en:'business', ja:'ビジネス', kana:'ビジネス' },
  { ch:2, en:'computer engineering', ja:'コンピュータこうがく', kana:'コンピュータこうがく' },
  { ch:2, en:'Asian studies', ja:'アジアけんきゅう', kana:'アジアけんきゅう' },

  // CH 3 — daily life / time / activities
  { ch:3, en:'today', ja:'きょう', kana:'きょう' },
  { ch:3, en:'tomorrow', ja:'あした', kana:'あした' },
  { ch:3, en:'yesterday', ja:'きのう', kana:'きのう' },
  { ch:3, en:'day before yesterday', ja:'おととい', kana:'おととい' },
  { ch:3, en:'day after tomorrow', ja:'あさって', kana:'あさって' },
  { ch:3, en:'tonight', ja:'こんばん', kana:'こんばん' },
  { ch:3, en:'this week', ja:'こんしゅう', kana:'こんしゅう' },
  { ch:3, en:'last week', ja:'せんしゅう', kana:'せんしゅう' },
  { ch:3, en:'every morning', ja:'まいあさ', kana:'まいあさ' },
  { ch:3, en:'every week', ja:'まいしゅう', kana:'まいしゅう' },
  { ch:3, en:'every night', ja:'まいばん', kana:'まいばん' },
  { ch:3, en:'next', ja:'つぎ', kana:'つぎ' },
  { ch:3, en:'breakfast', ja:'あさごはん', kana:'あさごはん' },
  { ch:3, en:'lunch', ja:'ひるごはん', kana:'ひるごはん' },
  { ch:3, en:'dinner', ja:'ばんごはん', kana:'ばんごはん' },
  { ch:3, en:'meal / cooked rice', ja:'ごはん', kana:'ごはん' },
  { ch:3, en:'coffee', ja:'コーヒー', kana:'コーヒー' },
  { ch:3, en:'tea', ja:'おちゃ', kana:'おちゃ' },
  { ch:3, en:'bath', ja:'おふろ', kana:'おふろ' },
  { ch:3, en:'shower', ja:'シャワー', kana:'シャワー' },
  { ch:3, en:'class / course', ja:'じゅぎょう', kana:'じゅぎょう' },
  { ch:3, en:'class (group)', ja:'クラス', kana:'クラス' },
  { ch:3, en:'homework', ja:'しゅくだい', kana:'しゅくだい' },
  { ch:3, en:'life / living', ja:'せいかつ', kana:'せいかつ' },
  { ch:3, en:'television', ja:'テレビ', kana:'テレビ' },
  { ch:3, en:'telephone number', ja:'でんわばんごう', kana:'でんわばんごう' },
  { ch:3, en:'book', ja:'本', kana:'ほん', kanjiNote:'本 = book / origin' },
  // Days of week (Ch 3)
  { ch:3, en:'Monday', ja:'げつようび', kana:'げつようび' },
  { ch:3, en:'Tuesday', ja:'かようび', kana:'かようび' },
  { ch:3, en:'Wednesday', ja:'すいようび', kana:'すいようび' },
  { ch:3, en:'Thursday', ja:'もくようび', kana:'もくようび' },
  { ch:3, en:'Friday', ja:'きんようび', kana:'きんようび' },
  { ch:3, en:'Saturday', ja:'どようび', kana:'どようび' },
  { ch:3, en:'Sunday', ja:'にちようび', kana:'にちようび' },
  { ch:3, en:'what day of the week?', ja:'なんようび', kana:'なんようび' },
  // Ch 3 verbs not yet covered (dictionary form for vocab consistency; verb_conj cards drill the ます forms)
  { ch:3, en:'to go', ja:'いく', kana:'いく' },
  { ch:3, en:'to come', ja:'くる', kana:'くる' },
  { ch:3, en:'to do', ja:'する', kana:'する' },
  { ch:3, en:'to return / go home', ja:'かえる', kana:'かえる' },
  { ch:3, en:'to enter (bath)', ja:'はいる', kana:'はいる' },
  { ch:3, en:'to take a shower', ja:'あびる', kana:'あびる' },
  // Ch 3 adverbs / connectors
  { ch:3, en:'always', ja:'いつも', kana:'いつも' },
  { ch:3, en:'usually', ja:'たいてい', kana:'たいてい' },
  { ch:3, en:'and then', ja:'そして', kana:'そして' },
  { ch:3, en:'so / therefore', ja:'ですから', kana:'ですから' },

  // CH 4 — places + things + colors + adjectives
  { ch:4, en:'pencil', ja:'えんぴつ', kana:'えんぴつ' },
  { ch:4, en:'pen', ja:'ペン', kana:'ペン' },
  { ch:4, en:'ballpoint pen', ja:'ボールペン', kana:'ボールペン' },
  { ch:4, en:'eraser', ja:'けしゴム', kana:'けしゴム' },
  { ch:4, en:'notebook', ja:'ノート', kana:'ノート' },
  { ch:4, en:'textbook', ja:'きょうかしょ', kana:'きょうかしょ' },
  { ch:4, en:'dictionary', ja:'じしょ', kana:'じしょ' },
  { ch:4, en:'bag / luggage', ja:'かばん', kana:'かばん' },
  { ch:4, en:'test', ja:'テスト', kana:'テスト' },
  { ch:4, en:'building', ja:'たてもの', kana:'たてもの' },
  { ch:4, en:'tall building', ja:'ビル', kana:'ビル' },
  { ch:4, en:'cafe', ja:'カフェ', kana:'カフェ' },
  { ch:4, en:'coffee shop (traditional)', ja:'きっさてん', kana:'きっさてん' },
  { ch:4, en:'convenience store', ja:'コンビニ', kana:'コンビニ' },
  { ch:4, en:'supermarket', ja:'スーパー', kana:'スーパー' },
  { ch:4, en:'department store', ja:'デパート', kana:'デパート' },
  { ch:4, en:'bookstore', ja:'ほんや', kana:'ほんや' },
  { ch:4, en:'post office', ja:'ゆうびんきょく', kana:'ゆうびんきょく' },
  { ch:4, en:'police box', ja:'こうばん', kana:'こうばん' },
  { ch:4, en:'dormitory', ja:'りょう', kana:'りょう' },
  { ch:4, en:'town', ja:'まち', kana:'まち' },
  { ch:4, en:'this area / around here', ja:'このへん', kana:'このへん' },
  { ch:4, en:'hotel', ja:'ホテル', kana:'ホテル' },
  // Ch 4 colors
  { ch:4, en:'blue', ja:'あおい', kana:'あおい' },
  { ch:4, en:'red', ja:'あかい', kana:'あかい' },
  { ch:4, en:'yellow', ja:'きいろい', kana:'きいろい' },
  { ch:4, en:'black', ja:'くろい', kana:'くろい' },
  { ch:4, en:'white', ja:'しろい', kana:'しろい' },
  { ch:4, en:'brown', ja:'ちゃいろい', kana:'ちゃいろい' },
  // Ch 4 adverbs
  { ch:4, en:'very (with thanks)', ja:'どうも', kana:'どうも' },
  { ch:4, en:'very (affirmative)', ja:'とても', kana:'とても' },
  { ch:4, en:'splendid / fine (na-adj)', ja:'りっぱ', kana:'りっぱ' },

  // CH 5 — home / things / location / adjectives
  { ch:5, en:'outside', ja:'外', kana:'そと', kanjiNote:'外 = outside' },
  { ch:5, en:'near / nearby', ja:'近く', kana:'ちかく', kanjiNote:'近 = near' },
  { ch:5, en:'between', ja:'あいだ', kana:'あいだ' },
  // Things
  { ch:5, en:'chair', ja:'いす', kana:'いす' },
  { ch:5, en:'dog', ja:'犬', kana:'いぬ', kanjiNote:'犬 = dog' },
  { ch:5, en:'cat', ja:'ねこ', kana:'ねこ' },
  { ch:5, en:'table', ja:'テーブル', kana:'テーブル' },
  { ch:5, en:'sofa', ja:'ソファ', kana:'ソファ' },
  { ch:5, en:'futon', ja:'ふとん', kana:'ふとん' },
  { ch:5, en:'Japanese-style closet', ja:'おしいれ', kana:'おしいれ' },
  { ch:5, en:'chest / drawers', ja:'たんす', kana:'たんす' },
  { ch:5, en:'door', ja:'ドア', kana:'ドア' },
  { ch:5, en:'restroom / toilet', ja:'トイレ', kana:'トイレ' },
  { ch:5, en:'clock / watch', ja:'時計', kana:'とけい', kanjiNote:'時 = time / 計 = measure' },
  { ch:5, en:'bookshelf', ja:'本棚', kana:'ほんだな' },
  { ch:5, en:'photograph', ja:'写真', kana:'しゃしん', kanjiNote:'写 = copy / 真 = truth' },
  { ch:5, en:'cell phone', ja:'けいたい', kana:'けいたい' },
  { ch:5, en:'telephone', ja:'電話', kana:'でんわ', kanjiNote:'電 = electric / 話 = talk' },
  { ch:5, en:'computer', ja:'コンピュータ', kana:'コンピュータ' },
  { ch:5, en:'video', ja:'ビデオ', kana:'ビデオ' },
  { ch:5, en:'bicycle', ja:'自転車', kana:'じてんしゃ' },
  { ch:5, en:'car', ja:'車', kana:'くるま', kanjiNote:'車 = car/vehicle' },
  { ch:5, en:'bus', ja:'バス', kana:'バス' },
  { ch:5, en:'thing (tangible)', ja:'もの', kana:'もの' },
  { ch:5, en:'place', ja:'ところ', kana:'ところ' },
  // Ch 5 places (rooms)
  { ch:5, en:'classroom', ja:'教室', kana:'きょうしつ', kanjiNote:'教 = teach / 室 = room' },
  { ch:5, en:'kitchen', ja:'キッチン', kana:'キッチン' },
  { ch:5, en:'student union', ja:'がくせいかいかん', kana:'がくせいかいかん' },
  { ch:5, en:'cafeteria', ja:'がくしょく', kana:'がくしょく' },
  { ch:5, en:'gym', ja:'体育館', kana:'たいいくかん' },
  { ch:5, en:'chalkboard', ja:'こくばん', kana:'こくばん' },
  { ch:5, en:'mountain', ja:'山', kana:'やま', kanjiNote:'山 = mountain' },
  { ch:5, en:'river', ja:'川', kana:'かわ', kanjiNote:'川 = river' },
  { ch:5, en:'tree', ja:'木', kana:'き', kanjiNote:'木 = tree/wood' },
  { ch:5, en:'picture / painting', ja:'絵', kana:'え' },
  { ch:5, en:'person', ja:'人', kana:'ひと', kanjiNote:'人 = person' },
  { ch:5, en:'that person (polite)', ja:'あのかた', kana:'あのかた' },
  // Ch 5 adjectives
  { ch:5, en:'bright', ja:'明るい', kana:'あかるい', kanjiNote:'明 = bright' },
  { ch:5, en:'dark', ja:'暗い', kana:'くらい', kanjiNote:'暗 = dark' },
  { ch:5, en:'spacious / wide', ja:'広い', kana:'ひろい', kanjiNote:'広 = wide' },
  { ch:5, en:'cramped / narrow', ja:'せまい', kana:'せまい' },
  { ch:5, en:'fast / quick', ja:'はやい', kana:'はやい' },
  { ch:5, en:'a lot / many', ja:'たくさん', kana:'たくさん' },
  { ch:5, en:'on foot', ja:'あるいて', kana:'あるいて' },
  { ch:5, en:'to take (time/cost)', ja:'かかります', kana:'かかります' },

  // CH 6 — activities / verbs / adjectives / na-adjs
  { ch:6, en:'part-time job', ja:'アルバイト', kana:'アルバイト' },
  { ch:6, en:'shopping', ja:'買い物', kana:'かいもの', kanjiNote:'買 = buy / 物 = thing' },
  { ch:6, en:'walk / stroll', ja:'さんぽ', kana:'さんぽ' },
  { ch:6, en:'exercise', ja:'うんどう', kana:'うんどう' },
  { ch:6, en:'jogging', ja:'ジョギング', kana:'ジョギング' },
  { ch:6, en:'tennis', ja:'テニス', kana:'テニス' },
  { ch:6, en:'game', ja:'ゲーム', kana:'ゲーム' },
  { ch:6, en:'concert', ja:'コンサート', kana:'コンサート' },
  { ch:6, en:'party', ja:'パーティ', kana:'パーティ' },
  { ch:6, en:'picnic', ja:'ピクニック', kana:'ピクニック' },
  { ch:6, en:'pool', ja:'プール', kana:'プール' },
  { ch:6, en:'job / work', ja:'仕事', kana:'しごと', kanjiNote:'仕 = serve / 事 = matter' },
  { ch:6, en:'question', ja:'しつもん', kana:'しつもん' },
  { ch:6, en:'magazine', ja:'ざっし', kana:'ざっし' },
  { ch:6, en:'newspaper', ja:'新聞', kana:'しんぶん', kanjiNote:'新 = new / 聞 = hear' },
  { ch:6, en:'letter', ja:'手紙', kana:'てがみ', kanjiNote:'手 = hand / 紙 = paper' },
  { ch:6, en:'e-mail', ja:'メール', kana:'メール' },
  { ch:6, en:'cleaning', ja:'そうじ', kana:'そうじ' },
  { ch:6, en:'laundry', ja:'せんたく', kana:'せんたく' },
  { ch:6, en:'cooking / cuisine', ja:'りょうり', kana:'りょうり' },
  { ch:6, en:'parents', ja:'りょうしん', kana:'りょうしん' },
  { ch:6, en:'rest / day off', ja:'やすみ', kana:'やすみ' },
  { ch:6, en:'next time', ja:'こんど', kana:'こんど' },
  // Ch 6 verbs (dictionary form; only words NOT already in original VOCAB above)
  { ch:6, en:'to meet', ja:'会う', kana:'あう', kanjiNote:'会 = meet' },
  { ch:6, en:'to walk', ja:'歩く', kana:'あるく', kanjiNote:'歩 = walk' },
  { ch:6, en:'to say', ja:'言う', kana:'いう', kanjiNote:'言 = say' },
  { ch:6, en:'to call / invite (someone)', ja:'よぶ', kana:'よぶ' },
  { ch:6, en:'to make (a phone call)', ja:'かける', kana:'かける' },
  { ch:6, en:'to go out', ja:'でかける', kana:'でかける' },
  // Ch 6 i-adjectives
  { ch:6, en:'busy', ja:'いそがしい', kana:'いそがしい' },
  { ch:6, en:'happy', ja:'うれしい', kana:'うれしい' },
  { ch:6, en:'interesting', ja:'おもしろい', kana:'おもしろい' },
  { ch:6, en:'sad', ja:'かなしい', kana:'かなしい' },
  { ch:6, en:'lonely', ja:'さびしい', kana:'さびしい' },
  { ch:6, en:'boring', ja:'つまらない', kana:'つまらない' },
  { ch:6, en:'difficult', ja:'むずかしい', kana:'むずかしい' },
  { ch:6, en:'easy / kind', ja:'やさしい', kana:'やさしい' },
  { ch:6, en:'dirty', ja:'きたない', kana:'きたない' },
  // Ch 6 na-adjectives
  { ch:6, en:'healthy / lively (na-adj)', ja:'げんき', kana:'げんき' },
  { ch:6, en:'free / unscheduled (na-adj)', ja:'ひま', kana:'ひま' },
  { ch:6, en:"all right / no problem (na-adj)", ja:'だいじょうぶ', kana:'だいじょうぶ' },
  { ch:6, en:'tough (na-adj)', ja:'たいへん', kana:'たいへん' },
  { ch:6, en:'sorry / regrettable (na-adj)', ja:'ざんねん', kana:'ざんねん' },
  { ch:6, en:'convenient (na-adj)', ja:'べんり', kana:'べんり' },
  // Ch 6 adverbs
  { ch:6, en:'by all means / I\'d love to', ja:'ぜひ', kana:'ぜひ' },
  { ch:6, en:'slowly / to relax', ja:'ゆっくり', kana:'ゆっくり' },
  { ch:6, en:'together', ja:'いっしょに', kana:'いっしょに' },
  { ch:6, en:'how?', ja:'どう', kana:'どう' },

  // === FINAL BACKFILL — names, numbers, suffixes, time readings, misc ===
  // Ch 2 — pronouns + names
  { ch:2, en:'you (avoid — use name+さん)', ja:'あなた', kana:'あなた' },
  { ch:2, en:'he / boyfriend', ja:'かれ', kana:'かれ' },
  { ch:2, en:'she / girlfriend', ja:'かのじょ', kana:'かのじょ' },
  { ch:2, en:'where? (polite)', ja:'どちら', kana:'どちら' },
  { ch:2, en:'Tokyo', ja:'東京', kana:'とうきょう', kanjiNote:'東 = east / 京 = capital' },
  // Basic clock times (commonly-tested)
  { ch:2, en:"1 o'clock", ja:'いちじ', kana:'いちじ' },
  { ch:2, en:"2 o'clock", ja:'にじ', kana:'にじ' },
  { ch:2, en:"3 o'clock", ja:'さんじ', kana:'さんじ' },
  { ch:2, en:"5 o'clock", ja:'ごじ', kana:'ごじ' },
  { ch:2, en:"6 o'clock", ja:'ろくじ', kana:'ろくじ' },
  { ch:2, en:"8 o'clock", ja:'はちじ', kana:'はちじ' },
  { ch:2, en:"10 o'clock", ja:'じゅうじ', kana:'じゅうじ' },
  { ch:2, en:"11 o'clock", ja:"じゅういちじ", kana:"じゅういちじ" },
  { ch:2, en:"12 o'clock", ja:"じゅうにじ", kana:"じゅうにじ" },
  { ch:2, en:'half past', ja:'はん', kana:'はん' },

  // Ch 3 — connectors / misc
  { ch:3, en:'after that', ja:'そのあと', kana:'そのあと' },
  { ch:3, en:'next week', ja:'らいしゅう', kana:'らいしゅう' },
  { ch:3, en:'why?', ja:'どうして', kana:'どうして' },
  { ch:3, en:'zero', ja:'ゼロ / れい', kana:'ゼロ / れい' },
  // Ch 3 minute readings (regular forms — irregulars are in counter cards)
  { ch:3, en:'2 minutes', ja:'にふん', kana:'にふん' },
  { ch:3, en:'4 minutes', ja:'よんぷん', kana:'よんぷん' },
  { ch:3, en:'5 minutes', ja:'ごふん', kana:'ごふん' },
  { ch:3, en:'7 minutes', ja:'ななふん', kana:'ななふん' },
  { ch:3, en:'9 minutes', ja:'きゅうふん', kana:'きゅうふん' },
  { ch:3, en:'how many minutes?', ja:'なんぷん', kana:'なんぷん' },

  // Ch 4 — wh-questions about quantity
  { ch:4, en:'how much (money)?', ja:'いくら', kana:'いくら' },
  { ch:4, en:'how many?', ja:'いくつ', kana:'いくつ' },

  // Ch 5 — position words + greetings + how-much
  { ch:5, en:'inner part of building', ja:'奥', kana:'おく', kanjiNote:'奥 = interior' },
  { ch:5, en:'this side / closer', ja:'手前', kana:'てまえ', kanjiNote:'手 = hand / 前 = front' },
  { ch:5, en:'how long / how much / how many', ja:'どのぐらい / どのくらい', kana:'どのぐらい / どのくらい' },
  { ch:5, en:'please come in', ja:'あがってください', kana:'あがってください' },
  { ch:5, en:"welcome (host says)", ja:'いらっしゃい', kana:'いらっしゃい' },
  { ch:5, en:"sorry to intrude (entering)", ja:'おじゃまします', kana:'おじゃまします' },
  { ch:5, en:'is anyone home? / excuse me', ja:'ごめんください', kana:'ごめんください' },

  // Ch 6 — combined-noun activities (fix-a-meal etc) + holiday + decline
  { ch:6, en:'a day off / holiday', ja:'やすみのひ', kana:'やすみのひ' },
  { ch:6, en:"I'm a little busy (polite refusal)", ja:'ちょっとつごうがわるくて', kana:'ちょっとつごうがわるくて' },
  { ch:6, en:'sorry, I have errands (polite refusal)', ja:'ちょっとようじがあって', kana:'ちょっとようじがあって' },
  { ch:6, en:'a little', ja:'ちょっと', kana:'ちょっと' },
  { ch:6, en:'a little (formal)', ja:'すこし', kana:'すこし' },
  { ch:6, en:'quickly / early', ja:'はやく', kana:'はやく' },
  { ch:6, en:'late', ja:'おそく', kana:'おそく' },

  // Honorifics / suffixes
  { ch:2, en:'~kun (junior male)', ja:'～くん', kana:'～くん' },
  { ch:2, en:'~chan (cute / child)', ja:'～ちゃん', kana:'～ちゃん' },
  { ch:2, en:'~tachi (plural)', ja:'～たち', kana:'～たち' },

  // Basic number names (1-10 readings)
  { ch:2, en:'one', ja:'いち', kana:'いち' },
  { ch:2, en:'two', ja:'に', kana:'に' },
  { ch:2, en:'three', ja:'さん', kana:'さん' },
  { ch:2, en:'four', ja:'よん / し', kana:'よん / し' },
  { ch:2, en:'five', ja:'ご', kana:'ご' },
  { ch:2, en:'six', ja:'ろく', kana:'ろく' },
  { ch:2, en:'seven', ja:'なな / しち', kana:'なな / しち' },
  { ch:2, en:'eight', ja:'はち', kana:'はち' },
  { ch:2, en:'nine', ja:'きゅう / く', kana:'きゅう / く' },
  { ch:2, en:'ten', ja:'じゅう', kana:'じゅう' },
  { ch:2, en:'hundred', ja:'ひゃく', kana:'ひゃく' },
  { ch:2, en:'thousand', ja:'せん', kana:'せん' },
  { ch:2, en:'ten thousand', ja:'まん', kana:'まん' },
];
VOCAB.forEach((v,i)=>{
  const slug = 'v'+(i+1).toString().padStart(3,'0');
  const explain = WORD_NOTES[v.ja] || (v.ja + ' = ' + v.en);
  // Recall: English → Japanese (production)
  push({
    id: slug+'_recall', type:'recall', ch:v.ch,
    prompt: v.en,
    answer: v.ja, kana: v.kana, en: v.en,
    mnem: {
      sentence: explain,
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
      sentence: explain,
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
      sentence: explain,
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
  { ch:5, ctx:'Contrasting two things.', prompt:'コーヒー___すきですが、おちゃ___きらいです。', answer:'は…は', why:'Both clauses use は for explicit CONTRAST. Pattern: Aは…が、Bは…(not). は kicks out が/を to mark each contrasted item.' },
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
      sentence: c.counter==='分' ? 'Counter ～ふん/ぷん attaches to numbers for "X minutes." Sound shifts on 1/3/6/8/10 turn ふ → ぷ + small っ.'
              : c.counter==='時' ? 'Counter ～じ attaches to numbers for "X o\'clock." 4=よ, 7=しち, 9=く are irregular readings.'
              : c.counter==='人' ? 'Counter ～にん counts people. 1 person and 2 people are SUPPLETIVE: ひとり, ふたり (not いちにん/ににん). From 3+ regular.'
              : c.counter==='本' ? 'Counter ～本 counts long thin objects (pencils, bottles, umbrellas). Sound shifts on 1/3/6/8/10.'
              : 'Counter card — memorize the irregular reading.',
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
      sentence: k.script==='katakana' ? 'Katakana = loanwords / emphasis. Long vowels use ー dash (コーヒー). Watch the ↗↘ stroke direction on confusion pairs シ/ツ and ソ/ン.' : 'Hiragana = native words, grammar, particles. Particles は/を/へ keep spelling but PRONOUNCE as wa/o/e. Long vowels: double vowel or い/う (せんせい/がっこう).',
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
  { ch:5, word:'りっぱ (splendid)', answer:'na', why:'⚠ NA-adj despite ending in ぱ. Cucumber crew (きれい・ゆうめい・りっぱ) all use な before nouns.' },
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
  { ch:3, prompt:'2じ___ですか? (around 2 o\'clock?)', answer:'ごろ', why:'Trick: 2じ (point) needs ごろ. NOT 2じかん (duration).', options:['ごろ','ぐらい'], correctIdx:0 },
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

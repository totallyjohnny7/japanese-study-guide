/* ============================================================
   PARTICLE FINDER WIDGET — drop-in modal launcher
   - Adds a small "助詞" chip near the global search.
   - Click → opens centered modal with full particle-finder UI.
   - Closes on Esc / backdrop click / × button.
   - Self-contained: no external CSS or assets needed.
   ============================================================ */
(function(){
  'use strict';
  if(window.__PF_LOADED__) return;
  window.__PF_LOADED__ = true;

  /* =========================================
     VOCABULARY (compact — categorized for rules)
     ========================================= */
  const W = [
    // people
    {k:'私',h:'わたし',r:'watashi',e:'i',t:'noun-person'},
    {k:'学生',h:'がくせい',r:'gakusei',e:'student',t:'noun-person'},
    {k:'大学生',h:'だいがくせい',r:'daigakusei',e:'university student',t:'noun-person'},
    {k:'先生',h:'せんせい',r:'sensei',e:'teacher',t:'noun-person'},
    {k:'田中さん',h:'たなかさん',r:'tanaka-san',e:'tanaka',t:'noun-person'},
    {k:'山田さん',h:'やまださん',r:'yamada-san',e:'yamada',t:'noun-person'},
    {k:'ともだち',h:'ともだち',r:'tomodachi',e:'friend',t:'noun-person'},
    {k:'人',h:'ひと',r:'hito',e:'person',t:'noun-person'},
    {k:'日本人',h:'にほんじん',r:'nihonjin',e:'japanese (person)',t:'noun-person'},
    {k:'子',h:'こ',r:'ko',e:'child',t:'noun-person'},
    {k:'ねこ',h:'ねこ',r:'neko',e:'cat',t:'noun-person'},
    {k:'いぬ',h:'いぬ',r:'inu',e:'dog',t:'noun-person'},
    // places
    {k:'学校',h:'がっこう',r:'gakkou',e:'school',t:'noun-place'},
    {k:'大学',h:'だいがく',r:'daigaku',e:'university',t:'noun-place'},
    {k:'としょかん',h:'としょかん',r:'toshokan',e:'library',t:'noun-place'},
    {k:'ぎんこう',h:'ぎんこう',r:'ginkou',e:'bank',t:'noun-place'},
    {k:'こうえん',h:'こうえん',r:'kouen',e:'park',t:'noun-place'},
    {k:'うち',h:'うち',r:'uchi',e:'home',t:'noun-place'},
    {k:'家',h:'いえ',r:'ie',e:'house',t:'noun-place'},
    {k:'へや',h:'へや',r:'heya',e:'room',t:'noun-place'},
    {k:'日本',h:'にほん',r:'nihon',e:'japan',t:'noun-place'},
    {k:'東京',h:'とうきょう',r:'toukyou',e:'tokyo',t:'noun-place'},
    {k:'たいいくかん',h:'たいいくかん',r:'taiikukan',e:'gym',t:'noun-place'},
    {k:'デパート',h:'デパート',r:'depaato',e:'department store',t:'noun-place'},
    {k:'レストラン',h:'レストラン',r:'resutoran',e:'restaurant',t:'noun-place'},
    {k:'コンビニ',h:'コンビニ',r:'konbini',e:'convenience store',t:'noun-place'},
    {k:'アパート',h:'アパート',r:'apaato',e:'apartment',t:'noun-place'},
    {k:'ホテル',h:'ホテル',r:'hoteru',e:'hotel',t:'noun-place'},
    {k:'山',h:'やま',r:'yama',e:'mountain',t:'noun-place'},
    {k:'川',h:'かわ',r:'kawa',e:'river',t:'noun-place'},
    // things
    {k:'本',h:'ほん',r:'hon',e:'book',t:'noun-thing'},
    {k:'ペン',h:'ペン',r:'pen',e:'pen',t:'noun-thing',means:1},
    {k:'えんぴつ',h:'えんぴつ',r:'enpitsu',e:'pencil',t:'noun-thing',means:1},
    {k:'ノート',h:'ノート',r:'nooto',e:'notebook',t:'noun-thing'},
    {k:'つくえ',h:'つくえ',r:'tsukue',e:'desk',t:'noun-thing'},
    {k:'いす',h:'いす',r:'isu',e:'chair',t:'noun-thing'},
    {k:'テレビ',h:'テレビ',r:'terebi',e:'tv',t:'noun-thing'},
    {k:'でんわ',h:'でんわ',r:'denwa',e:'telephone',t:'noun-thing'},
    {k:'とけい',h:'とけい',r:'tokei',e:'clock',t:'noun-thing'},
    {k:'花',h:'はな',r:'hana',e:'flower',t:'noun-thing'},
    // food
    {k:'コーヒー',h:'コーヒー',r:'koohii',e:'coffee',t:'noun-food'},
    {k:'お茶',h:'おちゃ',r:'ocha',e:'tea',t:'noun-food'},
    {k:'水',h:'みず',r:'mizu',e:'water',t:'noun-food'},
    {k:'あさごはん',h:'あさごはん',r:'asagohan',e:'breakfast',t:'noun-food'},
    {k:'ひるごはん',h:'ひるごはん',r:'hirugohan',e:'lunch',t:'noun-food'},
    {k:'ばんごはん',h:'ばんごはん',r:'bangohan',e:'dinner',t:'noun-food'},
    {k:'ごはん',h:'ごはん',r:'gohan',e:'rice/meal',t:'noun-food'},
    // time
    {k:'今日',h:'きょう',r:'kyou',e:'today',t:'noun-time',daypoint:1},
    {k:'あした',h:'あした',r:'ashita',e:'tomorrow',t:'noun-time',daypoint:1},
    {k:'きのう',h:'きのう',r:'kinou',e:'yesterday',t:'noun-time',daypoint:1},
    {k:'今週',h:'こんしゅう',r:'konshuu',e:'this week',t:'noun-time',daypoint:1},
    {k:'先週',h:'せんしゅう',r:'senshuu',e:'last week',t:'noun-time',daypoint:1},
    {k:'らいしゅう',h:'らいしゅう',r:'raishuu',e:'next week',t:'noun-time',daypoint:1},
    {k:'まいにち',h:'まいにち',r:'mainichi',e:'every day',t:'noun-time',freq:1},
    {k:'まいあさ',h:'まいあさ',r:'maiasa',e:'every morning',t:'noun-time',freq:1},
    {k:'7じ',h:'しちじ',r:'shichiji',e:"7 o'clock",t:'noun-time',clock:1},
    {k:'9じ',h:'くじ',r:'kuji',e:"9 o'clock",t:'noun-time',clock:1},
    {k:'5じ',h:'ごじ',r:'goji',e:"5 o'clock",t:'noun-time',clock:1},
    {k:'月曜日',h:'げつようび',r:'getsuyoubi',e:'monday',t:'noun-time',clock:1},
    {k:'火曜日',h:'かようび',r:'kayoubi',e:'tuesday',t:'noun-time',clock:1},
    {k:'水曜日',h:'すいようび',r:'suiyoubi',e:'wednesday',t:'noun-time',clock:1},
    {k:'木曜日',h:'もくようび',r:'mokuyoubi',e:'thursday',t:'noun-time',clock:1},
    {k:'金曜日',h:'きんようび',r:"kin'youbi",e:'friday',t:'noun-time',clock:1},
    {k:'土曜日',h:'どようび',r:'doyoubi',e:'saturday',t:'noun-time',clock:1},
    {k:'日曜日',h:'にちようび',r:'nichiyoubi',e:'sunday',t:'noun-time',clock:1},
    {k:'週末',h:'しゅうまつ',r:'shuumatsu',e:'weekend',t:'noun-time',daypoint:1},
    {k:'あさ',h:'あさ',r:'asa',e:'morning',t:'noun-time',daypoint:1},
    {k:'ばん',h:'ばん',r:'ban',e:'evening',t:'noun-time',daypoint:1},
    {k:'よる',h:'よる',r:'yoru',e:'night',t:'noun-time',daypoint:1},
    // language / abstract
    {k:'にほんご',h:'にほんご',r:'nihongo',e:'japanese language',t:'noun-language'},
    {k:'えいご',h:'えいご',r:'eigo',e:'english',t:'noun-language'},
    {k:'べんきょう',h:'べんきょう',r:'benkyou',e:'study',t:'noun-abstract'},
    {k:'しゅくだい',h:'しゅくだい',r:'shukudai',e:'homework',t:'noun-abstract'},
    {k:'じゅぎょう',h:'じゅぎょう',r:'jugyou',e:'class',t:'noun-abstract'},
    {k:'しつもん',h:'しつもん',r:'shitsumon',e:'question',t:'noun-abstract'},
    {k:'えいが',h:'えいが',r:'eiga',e:'movie',t:'noun-thing'},
    {k:'おんがく',h:'おんがく',r:'ongaku',e:'music',t:'noun-thing'},
    {k:'てがみ',h:'てがみ',r:'tegami',e:'letter',t:'noun-thing'},
    {k:'かいもの',h:'かいもの',r:'kaimono',e:'shopping',t:'noun-abstract'},
    {k:'りょうり',h:'りょうり',r:'ryouri',e:'cooking',t:'noun-abstract'},
    {k:'テニス',h:'テニス',r:'tenisu',e:'tennis',t:'noun-abstract'},
    // means
    {k:'バス',h:'バス',r:'basu',e:'bus',t:'noun-means'},
    {k:'車',h:'くるま',r:'kuruma',e:'car',t:'noun-means'},
    {k:'でんしゃ',h:'でんしゃ',r:'densha',e:'train',t:'noun-means'},
    {k:'じてんしゃ',h:'じてんしゃ',r:'jitensha',e:'bicycle',t:'noun-means'},
    // verbs - motion
    {k:'いく',h:'いく',r:'iku',e:'go',t:'verb-motion'},
    {k:'いきます',h:'いきます',r:'ikimasu',e:'go (polite)',t:'verb-motion'},
    {k:'くる',h:'くる',r:'kuru',e:'come',t:'verb-motion'},
    {k:'きます',h:'きます',r:'kimasu',e:'come (polite)',t:'verb-motion'},
    {k:'かえる',h:'かえる',r:'kaeru',e:'return',t:'verb-motion'},
    {k:'かえります',h:'かえります',r:'kaerimasu',e:'return (polite)',t:'verb-motion'},
    {k:'あるく',h:'あるく',r:'aruku',e:'walk',t:'verb-motion'},
    // verbs - transitive
    {k:'たべる',h:'たべる',r:'taberu',e:'eat',t:'verb-trans'},
    {k:'たべます',h:'たべます',r:'tabemasu',e:'eat (polite)',t:'verb-trans'},
    {k:'のむ',h:'のむ',r:'nomu',e:'drink',t:'verb-trans'},
    {k:'のみます',h:'のみます',r:'nomimasu',e:'drink (polite)',t:'verb-trans'},
    {k:'よむ',h:'よむ',r:'yomu',e:'read',t:'verb-trans'},
    {k:'よみます',h:'よみます',r:'yomimasu',e:'read (polite)',t:'verb-trans'},
    {k:'かく',h:'かく',r:'kaku',e:'write',t:'verb-trans'},
    {k:'かきます',h:'かきます',r:'kakimasu',e:'write (polite)',t:'verb-trans'},
    {k:'みる',h:'みる',r:'miru',e:'see/watch',t:'verb-trans'},
    {k:'みます',h:'みます',r:'mimasu',e:'see/watch (polite)',t:'verb-trans'},
    {k:'きく',h:'きく',r:'kiku',e:'listen/ask',t:'verb-trans'},
    {k:'ききます',h:'ききます',r:'kikimasu',e:'listen/ask (polite)',t:'verb-trans'},
    {k:'かう',h:'かう',r:'kau',e:'buy',t:'verb-trans'},
    {k:'かいます',h:'かいます',r:'kaimasu',e:'buy (polite)',t:'verb-trans'},
    {k:'まつ',h:'まつ',r:'matsu',e:'wait',t:'verb-trans'},
    {k:'まちます',h:'まちます',r:'machimasu',e:'wait (polite)',t:'verb-trans'},
    {k:'する',h:'する',r:'suru',e:'do',t:'verb-trans'},
    {k:'します',h:'します',r:'shimasu',e:'do (polite)',t:'verb-trans'},
    {k:'べんきょうする',h:'べんきょうする',r:'benkyousuru',e:'study',t:'verb-trans'},
    {k:'べんきょうします',h:'べんきょうします',r:'benkyoushimasu',e:'study (polite)',t:'verb-trans'},
    // verbs - communication
    {k:'はなす',h:'はなす',r:'hanasu',e:'speak',t:'verb-comm'},
    {k:'はなします',h:'はなします',r:'hanashimasu',e:'speak (polite)',t:'verb-comm'},
    {k:'おしえる',h:'おしえる',r:'oshieru',e:'teach',t:'verb-comm'},
    {k:'おしえます',h:'おしえます',r:'oshiemasu',e:'teach (polite)',t:'verb-comm'},
    {k:'あう',h:'あう',r:'au',e:'meet',t:'verb-comm'},
    {k:'あいます',h:'あいます',r:'aimasu',e:'meet (polite)',t:'verb-comm'},
    // verbs - existence
    {k:'ある',h:'ある',r:'aru',e:'exist (inanimate)',t:'verb-exist'},
    {k:'あります',h:'あります',r:'arimasu',e:'exist (inanimate, polite)',t:'verb-exist'},
    {k:'いる',h:'いる',r:'iru',e:'exist (animate)',t:'verb-exist'},
    {k:'います',h:'います',r:'imasu',e:'exist (animate, polite)',t:'verb-exist'},
    // verbs - emotion / cognition / intransitive
    {k:'好き',h:'すき',r:'suki',e:'like',t:'adj-na',ga:1},
    {k:'すき',h:'すき',r:'suki',e:'like',t:'adj-na',ga:1},
    {k:'きらい',h:'きらい',r:'kirai',e:'dislike',t:'adj-na',ga:1},
    {k:'わかる',h:'わかる',r:'wakaru',e:'understand',t:'verb-cog',ga:1},
    {k:'わかります',h:'わかります',r:'wakarimasu',e:'understand (polite)',t:'verb-cog',ga:1},
    {k:'できる',h:'できる',r:'dekiru',e:'be able',t:'verb-cog',ga:1},
    {k:'ほしい',h:'ほしい',r:'hoshii',e:'want',t:'adj-i',ga:1},
    {k:'おきる',h:'おきる',r:'okiru',e:'wake up',t:'verb-intrans'},
    {k:'おきます',h:'おきます',r:'okimasu',e:'wake up (polite)',t:'verb-intrans'},
    {k:'ねる',h:'ねる',r:'neru',e:'sleep',t:'verb-intrans'},
    {k:'ねます',h:'ねます',r:'nemasu',e:'sleep (polite)',t:'verb-intrans'},
    {k:'はいる',h:'はいる',r:'hairu',e:'enter',t:'verb-intrans'},
    {k:'およぐ',h:'およぐ',r:'oyogu',e:'swim',t:'verb-intrans'},
    {k:'はしる',h:'はしる',r:'hashiru',e:'run',t:'verb-intrans'},
    {k:'あそぶ',h:'あそぶ',r:'asobu',e:'play',t:'verb-intrans'},
    // adjectives
    {k:'大きい',h:'おおきい',r:'ookii',e:'big',t:'adj-i'},
    {k:'小さい',h:'ちいさい',r:'chiisai',e:'small',t:'adj-i'},
    {k:'たかい',h:'たかい',r:'takai',e:'expensive/tall',t:'adj-i'},
    {k:'やすい',h:'やすい',r:'yasui',e:'cheap',t:'adj-i'},
    {k:'あたらしい',h:'あたらしい',r:'atarashii',e:'new',t:'adj-i'},
    {k:'ふるい',h:'ふるい',r:'furui',e:'old',t:'adj-i'},
    {k:'たのしい',h:'たのしい',r:'tanoshii',e:'fun',t:'adj-i'},
    {k:'おもしろい',h:'おもしろい',r:'omoshiroi',e:'interesting',t:'adj-i'},
    {k:'むずかしい',h:'むずかしい',r:'muzukashii',e:'difficult',t:'adj-i'},
    {k:'いい',h:'いい',r:'ii',e:'good',t:'adj-i'},
    {k:'あつい',h:'あつい',r:'atsui',e:'hot',t:'adj-i'},
    {k:'さむい',h:'さむい',r:'samui',e:'cold',t:'adj-i'},
    {k:'げんき',h:'げんき',r:'genki',e:'energetic',t:'adj-na'},
    {k:'しずか',h:'しずか',r:'shizuka',e:'quiet',t:'adj-na'},
    {k:'にぎやか',h:'にぎやか',r:'nigiyaka',e:'lively',t:'adj-na'},
    {k:'ゆうめい',h:'ゆうめい',r:'yuumei',e:'famous',t:'adj-na'},
    {k:'きれい',h:'きれい',r:'kirei',e:'pretty',t:'adj-na'},
    {k:'たいへん',h:'たいへん',r:'taihen',e:'tough',t:'adj-na'},
    {k:'かんたん',h:'かんたん',r:'kantan',e:'easy',t:'adj-na'}
  ];

  /* =========================================
     LOOKUP — supports kanji/hira/kata/romaji/English
     ========================================= */
  function norm(s){ return (s||'').trim().toLowerCase().replace(/\s+/g,''); }
  const idx = new Map();
  W.forEach(w=>{
    [w.k, w.h, w.r, w.e].forEach(key=>{
      if(!key) return;
      const n = norm(key);
      if(!idx.has(n)) idx.set(n, w);
    });
  });
  function findWord(input){
    if(!input) return null;
    const n = norm(input);
    if(idx.has(n)) return idx.get(n);
    for(const w of W){
      const fields = [w.k, w.h, w.r, w.e].filter(Boolean).map(norm);
      if(fields.some(f => f === n)) return w;
    }
    for(const w of W){
      const fields = [w.k, w.h, w.r, w.e].filter(Boolean).map(norm);
      if(fields.some(f => f.startsWith(n) && n.length >= 2)) return w;
    }
    return null;
  }

  /* Polite-form helper for verbs */
  function getPol(v){
    if(!v) return '';
    if(v.k.endsWith('ます')||v.k.endsWith('です')) return v.k;
    if(!v.t.startsWith('verb')) return v.k;
    const polite = W.find(w => w !== v && w.t === v.t && w.e === v.e + ' (polite)');
    if(polite) return polite.k;
    const k = v.k;
    if(k === 'する') return 'します';
    if(k === 'くる') return 'きます';
    if(k.endsWith('する')) return k.slice(0,-2) + 'します';
    const lastChar = k.charAt(k.length-1);
    const secondLast = k.charAt(k.length-2);
    const eRow = ['え','け','せ','て','ね','へ','め','れ','げ','ぜ','で','べ','ぺ'];
    const iRow = ['い','き','し','ち','に','ひ','み','り','ぎ','じ','び','ぴ'];
    if(lastChar === 'く') return k.slice(0,-1) + 'きます';
    if(lastChar === 'ぐ') return k.slice(0,-1) + 'ぎます';
    if(lastChar === 'す') return k.slice(0,-1) + 'します';
    if(lastChar === 'つ') return k.slice(0,-1) + 'ちます';
    if(lastChar === 'む') return k.slice(0,-1) + 'みます';
    if(lastChar === 'ぶ') return k.slice(0,-1) + 'びます';
    if(lastChar === 'ぬ') return k.slice(0,-1) + 'にます';
    if(lastChar === 'う') return k.slice(0,-1) + 'います';
    if(lastChar === 'る'){
      const impostors = ['かえる','はいる','しる','きる','はしる'];
      if(impostors.includes(k)) return k.slice(0,-1) + 'ります';
      if(eRow.includes(secondLast) || iRow.includes(secondLast)) return k.slice(0,-1) + 'ます';
      return k.slice(0,-1) + 'ります';
    }
    return k + 'ます';
  }
  function cap(s){ return s ? s.charAt(0).toUpperCase()+s.slice(1) : ''; }

  /* =========================================
     PARTICLE RULES
     ========================================= */
  const PARTICLES = [
    {p:'は',name:'wa',fn:'Topic marker — "as for X..."',
      test:(a,b)=>{
        if(!a||!b) return false;
        if(!a.t.startsWith('noun')) return {ok:false, why:'は marks the topic — requires a noun before it.'};
        if(b.t.startsWith('noun')||b.t.startsWith('adj')||b.t.startsWith('verb'))
          return {ok:true, mean:'Topic — introduces "'+a.e+'" as what the sentence is about.'};
        return false;
      },
      ex:(a,b)=>{
        if(b.t.startsWith('verb')) return {jp:a.k+'は'+getPol(b)+'。', en:cap(a.e)+' '+b.e+'.'};
        if(b.t.startsWith('adj')) return {jp:a.k+'は'+b.k+'です。', en:cap(a.e)+' is '+b.e+'.'};
        return {jp:a.k+'は'+b.k+'です。', en:cap(a.e)+' is a '+b.e+'.'};
      }
    },
    {p:'が',name:'ga',fn:'Subject marker — for existence, desire, ability, Q-words, 好き/嫌い/わかる',
      test:(a,b)=>{
        if(!a||!b) return false;
        if(!a.t.startsWith('noun')) return {ok:false, why:'が marks a subject — requires a noun before it.'};
        if(b.t==='verb-exist') return {ok:true, mean:'Subject of existence — "'+a.e+'" exists / is here.'};
        if(b.ga) return {ok:true, mean:'Object of liking/understanding/wanting — Japanese marks this with が, not を.'};
        if(b.t==='verb-cog') return {ok:true, mean:'が pairs with cognition verbs (わかる/できる).'};
        return {ok:false, why:'が is for specific cases (existence, 好き/嫌い, わかる, Q-words). For "X is Y" use は.'};
      },
      ex:(a,b)=>{
        if(b.t==='verb-exist') return {jp:a.k+'が'+getPol(b)+'。', en:'There is/are '+a.e+'.'};
        if(b.ga) return {jp:a.k+'が'+b.k+'です。', en:'I '+b.e+' '+a.e+'.'};
        return {jp:a.k+'が…', en:'(restricted use)'};
      }
    },
    {p:'を',name:'wo (o)',fn:'Direct object — what the action is done TO',
      test:(a,b)=>{
        if(!a||!b) return false;
        if(!a.t.startsWith('noun')) return {ok:false, why:'を marks an object — requires a noun before it.'};
        if(b.t==='verb-trans') return {ok:true, mean:'Direct object — "'+a.e+'" is what gets '+b.e+'n.'};
        return {ok:false, why:'を only marks the object of a transitive verb. '+(b.e||'Word 2')+' is '+(b.t==='verb-motion'?'a motion verb (use に/へ for destination)':b.t==='verb-exist'?'an existence verb (use が)':'not transitive')+'.'};
      },
      ex:(a,b)=>({jp:a.k+'を'+getPol(b)+'。', en:'I '+b.e+' '+a.e+'.'})
    },
    {p:'に',name:'ni',fn:'Time / Destination / Existence-location / Target',
      test:(a,b)=>{
        if(!a||!b) return false;
        if(!a.t.startsWith('noun')) return {ok:false, why:'に attaches to a noun.'};
        if(a.t==='noun-time' && a.clock && b.t.startsWith('verb')) return {ok:true, mean:'Specific time point — "at '+a.e+'".'};
        if(a.t==='noun-place' && b.t==='verb-motion') return {ok:true, mean:'Destination — "to '+a.e+'".'};
        if(a.t==='noun-place' && b.t==='verb-exist') return {ok:true, mean:'Location of existence — "'+a.e+'" is where something is.'};
        if(a.t==='noun-person' && b.t==='verb-comm') return {ok:true, mean:'Target — speak/teach/meet TO this person.'};
        if(a.t==='noun-time' && a.daypoint) return {ok:false, why:"Daypoint times (today/tomorrow/yesterday) don't take に — they go bare."};
        if(a.t==='noun-time' && a.freq) return {ok:false, why:"Frequency adverbs (毎日/毎朝) don't take に — they go bare."};
        return {ok:false, why:'に is for: specific time, destination of motion, location of existence, or target of communication.'};
      },
      ex:(a,b)=>{
        if(a.t==='noun-time' && a.clock) return {jp:a.k+'に'+getPol(b)+'。', en:'I '+b.e+' at '+a.e+'.'};
        if(a.t==='noun-place' && b.t==='verb-motion') return {jp:a.k+'に'+getPol(b)+'。', en:'I go to '+a.e+'.'};
        if(a.t==='noun-place' && b.t==='verb-exist') return {jp:a.k+'に'+b.k+'。', en:'There is ... in '+a.e+'.'};
        if(a.t==='noun-person' && b.t==='verb-comm') return {jp:a.k+'に'+getPol(b)+'。', en:'I '+b.e+' to '+a.e+'.'};
        return {jp:a.k+'に…', en:'...'};
      }
    },
    {p:'で',name:'de',fn:'Action location / Means / Language',
      test:(a,b)=>{
        if(!a||!b) return false;
        if(!a.t.startsWith('noun')) return {ok:false, why:'で attaches to a noun.'};
        if(a.t==='noun-place' && (b.t==='verb-trans'||b.t==='verb-intrans'||b.t==='verb-comm'))
          return {ok:true, mean:'Location of action — "'+a.e+'" is where the action happens.'};
        if((a.t==='noun-means'||a.means) && b.t.startsWith('verb'))
          return {ok:true, mean:'Means / by — using '+a.e+' to do something.'};
        if(a.t==='noun-language' && (b.t==='verb-comm'||b.t==='verb-trans'))
          return {ok:true, mean:'Means/language — "in '+a.e+'".'};
        if(a.t==='noun-place' && b.t==='verb-exist')
          return {ok:false, why:'で marks WHERE an action happens. For existence (ある/いる), use に instead.'};
        return {ok:false, why:'で marks action location, means, or language. Combo not standard.'};
      },
      ex:(a,b)=>{
        if(a.t==='noun-place') return {jp:a.k+'で'+getPol(b)+'。', en:'I '+b.e+' at '+a.e+'.'};
        if(a.t==='noun-means'||a.means) return {jp:a.k+'で'+getPol(b)+'。', en:'I '+b.e+' by '+a.e+'.'};
        if(a.t==='noun-language') return {jp:a.k+'で'+getPol(b)+'。', en:'I '+b.e+' in '+a.e+'.'};
        return {jp:a.k+'で…', en:'...'};
      }
    },
    {p:'へ',name:'e',fn:'Direction toward (interchangeable with に for destinations)',
      test:(a,b)=>{
        if(!a||!b) return false;
        if(a.t==='noun-place' && b.t==='verb-motion') return {ok:true, mean:'Direction — "toward '+a.e+'". Largely interchangeable with に.'};
        return {ok:false, why:'へ marks direction of movement. Need: place + motion verb.'};
      },
      ex:(a,b)=>({jp:a.k+'へ'+getPol(b)+'。', en:'I head toward '+a.e+'.'})
    },
    {p:'と',name:'to',fn:'And (between nouns) / With (mutual action)',
      test:(a,b)=>{
        if(!a||!b) return false;
        if(a.t.startsWith('noun') && b.t.startsWith('noun'))
          return {ok:true, mean:'"And" — listing: '+a.e+' and '+b.e+'.'};
        if(a.t==='noun-person' && (b.t==='verb-comm'||b.t==='verb-trans'||b.t==='verb-intrans'))
          return {ok:true, mean:'"With" — doing the action together with '+a.e+'.'};
        return {ok:false, why:'と links nouns ("and") or marks a person you do something WITH.'};
      },
      ex:(a,b)=>{
        if(a.t.startsWith('noun') && b.t.startsWith('noun')) return {jp:a.k+'と'+b.k, en:cap(a.e)+' and '+b.e};
        return {jp:a.k+'と'+getPol(b)+'。', en:'I '+b.e+' with '+a.e+'.'};
      }
    },
    {p:'も',name:'mo',fn:'Also/too — replaces は or が',
      test:(a,b)=>{
        if(!a||!b) return false;
        if(!a.t.startsWith('noun')) return {ok:false, why:'も attaches to a noun.'};
        if(b.t.startsWith('noun')||b.t.startsWith('adj')||b.t.startsWith('verb'))
          return {ok:true, mean:'"'+cap(a.e)+' too / also" — implies a parallel statement.'};
        return false;
      },
      ex:(a,b)=>{
        if(b.t.startsWith('verb')) return {jp:a.k+'も'+getPol(b)+'。', en:cap(a.e)+' also '+b.e+'s.'};
        if(b.t.startsWith('adj')) return {jp:a.k+'も'+b.k+'です。', en:cap(a.e)+' is also '+b.e+'.'};
        return {jp:a.k+'も'+b.k+'です。', en:cap(a.e)+' is also a '+b.e+'.'};
      }
    },
    {p:'の',name:'no',fn:'Possession / "of" — links two nouns',
      test:(a,b)=>{
        if(!a||!b) return false;
        if(a.t.startsWith('noun') && b.t.startsWith('noun'))
          return {ok:true, mean:'"'+cap(a.e)+"'s "+b.e+'" / "'+cap(b.e)+' of '+a.e+'".'};
        return {ok:false, why:'の links two nouns (possession or "of"). Both must be nouns.'};
      },
      ex:(a,b)=>({jp:a.k+'の'+b.k, en:cap(a.e)+"'s "+b.e})
    },
    {p:'から',name:'kara',fn:'From — starting point (time or place)',
      test:(a,b)=>{
        if(!a||!b) return false;
        if((a.t==='noun-time'||a.t==='noun-place') && (b.t.startsWith('verb')||b.t.startsWith('noun')))
          return {ok:true, mean:'Starting point — "from '+a.e+'".'};
        return {ok:false, why:'から marks a starting point — needs time/place noun before it.'};
      },
      ex:(a,b)=>{
        if(b.t.startsWith('verb')) return {jp:a.k+'から'+getPol(b)+'。', en:'(...) from '+a.e+'.'};
        return {jp:a.k+'から'+b.k+'まで', en:'from '+a.e+' to '+b.e};
      }
    },
    {p:'まで',name:'made',fn:'Until/to — endpoint (time or place)',
      test:(a,b)=>{
        if(!a||!b) return false;
        if((a.t==='noun-time'||a.t==='noun-place') && (b.t.startsWith('verb')||b.t.startsWith('noun')))
          return {ok:true, mean:'Endpoint — "until/to '+a.e+'".'};
        return {ok:false, why:'まで marks an endpoint — needs time/place noun before it.'};
      },
      ex:(a,b)=>{
        if(b.t.startsWith('verb')) return {jp:a.k+'まで'+getPol(b)+'。', en:'(...) until '+a.e+'.'};
        return {jp:a.k+'から'+b.k+'まで', en:'from '+a.e+' to '+b.e};
      }
    }
  ];

  /* Merge any external VOCAB_DB (vocab-examples.js) into our W array */
  function mergeExternalVocab(){
    const ext = window.VOCAB_DB;
    if(!Array.isArray(ext)) return;
    ext.forEach(v=>{
      if(!v.jp || !v.t) return;
      // Skip if already in W (by hira match)
      if(W.some(w => w.h === (v.h||v.jp) || w.k === v.jp)) return;
      const entry = {
        k: v.jp,
        h: v.h || v.jp,
        r: (v.r||'').replace(/^~/, '').replace(/-/g, ''),
        e: (v.e||'').toLowerCase(),
        t: v.t
      };
      if(v.ga) entry.ga = 1;
      if(v.means) entry.means = 1;
      if(v.daypoint) entry.daypoint = 1;
      if(v.freq) entry.freq = 1;
      if(v.clock) entry.clock = 1;
      W.push(entry);
      // Update lookup index
      [entry.k, entry.h, entry.r, entry.e].forEach(key=>{
        if(!key) return;
        const n = norm(key);
        if(!idx.has(n)) idx.set(n, entry);
      });
    });
  }

  /* =========================================
     CSS — injected once
     ========================================= */
  const css = `
  #pf-toggle{
    display:inline-flex;align-items:center;gap:6px;
    background:rgba(78,207,122,0.1);
    border:1.5px solid rgba(78,207,122,0.4);
    color:#4ecf7a;font-family:'Klee One','Noto Sans JP',sans-serif;
    font-size:13px;padding:7px 14px;border-radius:20px;
    cursor:pointer;transition:all 0.15s;
    margin:6px auto 0;
  }
  #pf-toggle:hover{
    background:rgba(78,207,122,0.18);
    border-color:#4ecf7a;
    box-shadow:0 0 16px rgba(78,207,122,0.25);
  }
  #pf-toggle .pf-tg-jp{font-size:16px;font-weight:600;}
  #pf-toggle .pf-tg-en{font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#4ecf7a;opacity:0.85}

  /* Floating Action Button — visible while scrolling, mirrors the global search FAB pattern */
  #pf-fab{
    position:fixed;
    right:14px;
    bottom:104px;
    width:54px;height:54px;
    border-radius:50%;
    background:linear-gradient(135deg,#4ecf7a 0%,#2a9d8f 100%);
    color:#0a0a0a;
    border:none;cursor:pointer;
    z-index:480;
    box-shadow:0 6px 20px rgba(78,207,122,0.45),0 0 0 1px rgba(0,0,0,0.6);
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    font-family:'Klee One','Noto Sans JP',sans-serif;
    transition:transform 0.15s ease, box-shadow 0.15s ease;
  }
  #pf-fab:hover{transform:scale(1.08);box-shadow:0 8px 28px rgba(78,207,122,0.6),0 0 0 1px rgba(0,0,0,0.6);}
  #pf-fab:active{transform:scale(0.96);}
  #pf-fab .pf-fab-jp{font-size:18px;font-weight:700;line-height:1;}
  #pf-fab .pf-fab-en{font-size:7.5px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;line-height:1;margin-top:2px;}
  @media(max-width:540px){
    #pf-fab{width:48px;height:48px;right:10px;bottom:96px;}
    #pf-fab .pf-fab-jp{font-size:16px;}
    #pf-fab .pf-fab-en{font-size:6.5px;}
  }

  #pf-launch-row{
    display:flex;justify-content:center;
    max-width:600px;margin:0 auto 8px;padding:0 16px;
    position:relative;z-index:101;
  }

  #pf-modal{
    position:fixed;inset:0;z-index:9999;
    display:none;align-items:flex-start;justify-content:center;
    padding:30px 12px;overflow-y:auto;
  }
  #pf-modal.open{display:flex;}
  #pf-modal .pf-bd{
    position:fixed;inset:0;
    background:rgba(0,0,0,0.85);
    backdrop-filter:blur(6px);
  }
  #pf-modal .pf-card{
    position:relative;z-index:1;
    background:#0f0f14;
    border:1px solid rgba(78,207,122,0.3);
    border-radius:14px;
    width:100%;max-width:1000px;
    box-shadow:0 16px 64px rgba(0,0,0,0.7), 0 0 40px rgba(78,207,122,0.08);
    color:#e0ddd5;font-family:'DM Sans',sans-serif;
    padding:18px 18px 22px;
  }
  #pf-modal .pf-close{
    position:absolute;top:10px;right:14px;
    background:none;border:none;color:#8a8578;
    font-size:28px;cursor:pointer;line-height:1;padding:4px 8px;
    border-radius:8px;transition:all 0.1s;
  }
  #pf-modal .pf-close:hover{background:rgba(232,84,84,0.15);color:#e85454;}
  #pf-modal .pf-h{
    font-family:'Klee One',serif;font-size:24px;
    color:#f0c85a;letter-spacing:2px;margin-bottom:4px;
  }
  #pf-modal .pf-sub{font-size:11px;color:#8a8578;letter-spacing:2px;text-transform:uppercase;margin-bottom:14px;}
  #pf-modal .pf-grid{
    display:grid;grid-template-columns:1fr 90px 1fr;gap:8px;align-items:end;
    margin-bottom:8px;
  }
  @media(max-width:680px){#pf-modal .pf-grid{grid-template-columns:1fr;}}
  #pf-modal .pf-grid label{display:block;font-size:10px;color:#d4a843;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:3px;font-weight:600;}
  #pf-modal .pf-grid input{
    width:100%;background:#161616;border:1.5px solid #2a2a2a;
    border-radius:8px;color:#f5f2ea;padding:9px 11px;font-size:14.5px;
    font-family:'Noto Sans JP','DM Sans',sans-serif;outline:none;
  }
  #pf-modal .pf-grid input:focus{border-color:#7a6320;box-shadow:0 0 12px rgba(212,168,67,0.15);}
  #pf-modal .pf-pin{
    width:80px;text-align:center;font-size:18px!important;
    border-style:dashed!important;border-color:#7a6320!important;
    color:#f0c85a!important;
  }
  #pf-modal .pf-help{font-size:10.5px;color:#8a8578;display:flex;flex-wrap:wrap;gap:12px;margin:6px 0 8px;line-height:1.5;}
  #pf-modal .pf-help b{color:#d4a843}
  #pf-modal .pf-det{
    margin-top:6px;padding:7px 11px;background:#161616;
    border-radius:6px;font-size:11.5px;color:#8a8578;
    border:1px solid #2a2a2a;min-height:26px;
  }
  #pf-modal .pf-det .ok{color:#4ecf7a;font-weight:600}
  #pf-modal .pf-det .bad{color:#e85454;font-weight:600}
  #pf-modal .pf-vbox{
    margin:10px 0;padding:11px 13px;border-radius:9px;border:2px solid #2a2a2a;
  }
  #pf-modal .pf-vbox.v-ok{border-color:#4ecf7a;background:rgba(78,207,122,0.05);}
  #pf-modal .pf-vbox.v-bad{border-color:#e85454;background:rgba(232,84,84,0.05);}
  #pf-modal .pf-vbox .vh{font-size:15px;font-weight:600;display:flex;gap:8px;align-items:center;margin-bottom:4px;}
  #pf-modal .pf-vbox.v-ok .vh{color:#4ecf7a}
  #pf-modal .pf-vbox.v-bad .vh{color:#e85454}
  #pf-modal .pf-vbox .vs{font-family:'Noto Sans JP',sans-serif;font-size:17px;color:#f5f2ea;padding:5px 0;}
  #pf-modal .pf-vbox .ve{font-size:12px;color:#8a8578;line-height:1.5;}
  #pf-modal .pf-results{margin-top:6px;}
  #pf-modal .pf-pgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:8px;}
  #pf-modal .pf-pcard{
    background:#161616;border:1px solid #2a2a2a;border-radius:9px;padding:10px 12px;
    transition:all 0.15s;
  }
  #pf-modal .pf-pcard.ok{border-color:rgba(78,207,122,0.5);background:linear-gradient(180deg,rgba(78,207,122,0.04) 0%,#161616 100%);}
  #pf-modal .pf-pcard.bad{opacity:0.55;}
  #pf-modal .pf-pcard .ph{display:flex;align-items:center;gap:9px;margin-bottom:5px;}
  #pf-modal .pf-pcard .psy{font-family:'Noto Sans JP';font-size:28px;color:#f0c85a;line-height:1;width:36px;text-align:center;}
  #pf-modal .pf-pcard.ok .psy{color:#4ecf7a;}
  #pf-modal .pf-pcard.bad .psy{color:#5a5548;}
  #pf-modal .pf-pcard .pn{flex:1;font-size:10px;letter-spacing:1.4px;color:#d4a843;text-transform:uppercase;font-weight:600;}
  #pf-modal .pf-pcard .pst{font-size:16px;font-weight:700;}
  #pf-modal .pf-pcard.ok .pst{color:#4ecf7a;}
  #pf-modal .pf-pcard.bad .pst{color:#e85454;}
  #pf-modal .pf-pcard .pe{
    font-family:'Noto Sans JP',sans-serif;font-size:13.5px;color:#f5f2ea;
    background:#0f0f14;padding:6px 9px;border-radius:5px;border-left:2px solid #7a6320;margin-top:4px;
  }
  #pf-modal .pf-pcard .pen{font-size:10.5px;color:#8a8578;font-style:italic;margin-top:2px;line-height:1.4;}
  #pf-modal .pf-pcard .pm{font-size:10.5px;color:#8a8578;margin-top:3px;line-height:1.4;}
  #pf-modal .pf-pcard .pm b{color:#d4a843}
  #pf-modal .pf-empty{
    text-align:center;padding:30px 14px;color:#5a5548;font-size:12px;
    border:1px dashed #2a2a2a;border-radius:9px;
  }
  #pf-modal .pf-empty .em{font-size:32px;margin-bottom:8px;color:#7a6320;font-family:'Noto Sans JP'}
  #pf-modal .pf-rh{font-size:14px;color:#f0c85a;margin:14px 0 6px;border-left:3px solid #d4a843;padding-left:8px;font-weight:600;}
  #pf-modal .pf-rs{font-size:11px;color:#8a8578;margin-bottom:10px;}
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  /* =========================================
     DOM injection
     ========================================= */
  let modal = null, w1in = null, w2in = null, pin = null;

  function buildModal(){
    modal = document.createElement('div');
    modal.id = 'pf-modal';
    modal.innerHTML = `
      <div class="pf-bd"></div>
      <div class="pf-card">
        <button class="pf-close" aria-label="Close">×</button>
        <div class="pf-h">助詞 Particle Finder</div>
        <div class="pf-sub">11 PARTICLES · LIVE VERIFICATION · ALL SCRIPTS</div>
        <div class="pf-grid">
          <div>
            <label>Word 1 (subject/topic/place)</label>
            <input type="text" id="pf-w1" placeholder="e.g. 私 / watashi / I" autocomplete="off">
          </div>
          <div>
            <label>&nbsp;</label>
            <input type="text" id="pf-pt" class="pf-pin" placeholder="は" maxlength="3" autocomplete="off">
          </div>
          <div>
            <label>Word 2 (predicate/verb/place)</label>
            <input type="text" id="pf-w2" placeholder="e.g. 学生 / iku / book" autocomplete="off">
          </div>
        </div>
        <div class="pf-help">
          <span>📝 <b>Accepts:</b> Kanji · Hiragana · Katakana · Romaji · English</span>
          <span>⚡ <b>Live</b> as you type</span>
          <span>✏️ Particle slot optional</span>
        </div>
        <div class="pf-det" id="pf-det">Type two words to see which particles can connect them...</div>
        <div id="pf-verify"></div>
        <div id="pf-results"></div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('.pf-bd').addEventListener('click', closeModal);
    modal.querySelector('.pf-close').addEventListener('click', closeModal);

    w1in = document.getElementById('pf-w1');
    w2in = document.getElementById('pf-w2');
    pin  = document.getElementById('pf-pt');
    [w1in, w2in, pin].forEach(el => el.addEventListener('input', render));
  }

  function openModal(){
    if(!modal) buildModal();
    modal.classList.add('open');
    setTimeout(()=>{ w1in && w1in.focus(); }, 60);
  }
  function closeModal(){ modal && modal.classList.remove('open'); }

  document.addEventListener('keydown', e => {
    if(e.key === 'Escape' && modal && modal.classList.contains('open')) closeModal();
  });

  /* =========================================
     RENDER
     ========================================= */
  function render(){
    const w1 = findWord(w1in.value);
    const w2 = findWord(w2in.value);
    const pTest = pin.value.trim();
    const det = document.getElementById('pf-det');
    const ver = document.getElementById('pf-verify');
    const res = document.getElementById('pf-results');

    let detTxt = '';
    if(w1in.value || w2in.value){
      detTxt += '<b>Detected:</b> ';
      detTxt += w1in.value ? (w1 ? '<span class="ok">[Word 1] '+w1.k+' ('+w1.h+', '+w1.e+') ['+w1.t+']</span>' : '<span class="bad">[Word 1] "'+w1in.value+'" — not in vocabulary</span>') : '';
      if(w1in.value && w2in.value) detTxt += ' &nbsp; ';
      detTxt += w2in.value ? (w2 ? '<span class="ok">[Word 2] '+w2.k+' ('+w2.h+', '+w2.e+') ['+w2.t+']</span>' : '<span class="bad">[Word 2] "'+w2in.value+'" — not in vocabulary</span>') : '';
    } else {
      detTxt = 'Type two words to see which particles can connect them...';
    }
    det.innerHTML = detTxt;

    if(w1 && w2 && pTest){
      const matchPart = PARTICLES.find(P => P.p === pTest || P.name === pTest.toLowerCase());
      if(matchPart){
        const result = matchPart.test(w1, w2);
        const ok = result === true ? {ok:true} : (result || {ok:false, why:'No applicable rule.'});
        const ex = matchPart.ex(w1, w2);
        const valid = ok.ok;
        ver.innerHTML = '<div class="pf-vbox '+(valid?'v-ok':'v-bad')+'">'
          +'<div class="vh">'+(valid?'✓ Valid':'✗ Not valid')+' — '+matchPart.p+' ('+matchPart.name+')</div>'
          +'<div class="vs">'+(valid?ex.jp:'<span style="text-decoration:line-through">'+ex.jp+'</span>')+'</div>'
          +'<div class="ve"><b>'+(valid?'Why it works:':"Why it doesn't:")+'</b> '+(valid?(ok.mean||matchPart.fn):ok.why)+'</div>'
          +'</div>';
      } else {
        ver.innerHTML = '<div class="pf-vbox v-bad"><div class="vh">⚠ Unknown particle: "'+pTest+'"</div><div class="ve">Try one of: '+PARTICLES.map(p=>p.p).join(' · ')+'</div></div>';
      }
    } else {
      ver.innerHTML = '';
    }

    if(w1 && w2){
      let html = '<div class="pf-rh">Particle Compatibility for "'+w1.k+'" + "'+w2.k+'"</div>';
      html += '<div class="pf-rs">All 11 particles checked. ✓ = grammatical · ✗ = not used here</div>';
      html += '<div class="pf-pgrid">';
      PARTICLES.forEach(P=>{
        const r = P.test(w1, w2);
        const ok = r === true ? {ok:true, mean:P.fn} : (r || {ok:false, why:'No applicable rule.'});
        const valid = ok.ok;
        const ex = P.ex(w1, w2);
        html += '<div class="pf-pcard '+(valid?'ok':'bad')+'">'
          +'<div class="ph"><div class="psy">'+P.p+'</div>'
          +'<div class="pn">'+P.name+' · '+P.fn.split('—')[0].trim()+'</div>'
          +'<div class="pst">'+(valid?'✓':'✗')+'</div></div>'
          +'<div class="pe">'+(valid?ex.jp:'<span style="text-decoration:line-through;color:#5a5548">'+ex.jp+'</span>')+'</div>'
          +'<div class="pen">'+(valid?ex.en:'Not grammatical')+'</div>'
          +'<div class="pm"><b>'+(valid?'Meaning:':'Why ✗:')+'</b> '+(valid?(ok.mean||P.fn):ok.why)+'</div>'
          +'</div>';
      });
      html += '</div>';
      res.innerHTML = html;
    } else {
      res.innerHTML = '<div class="pf-empty"><div class="em">は · が · を · に · で · へ · と · も · の · から · まで</div>'
        +'Enter two words above to check all 11 particles.<br>'
        +'<span style="color:#8a8578;margin-top:8px;display:block">Try: 私 + 学生 · としょかん + いく · 本 + よむ · ねこ + すき · 7じ + おきる</span></div>';
    }
  }

  /* =========================================
     Inject toggle chip BELOW the global search
     PLUS a floating-action button (FAB) that
     stays visible while scrolling — works like
     the global-search FAB.
     ========================================= */
  function injectToggle(){
    const btn = document.createElement('button');
    btn.id = 'pf-toggle';
    btn.title = 'Open Particle Finder (helps you pick the right は/が/を/に/で/へ/と/も/の/から/まで)';
    btn.innerHTML = '<span class="pf-tg-jp">助詞</span><span class="pf-tg-en">Particle Finder</span>';
    btn.addEventListener('click', openModal);

    const searchWrap = document.getElementById('searchWrap');
    if(searchWrap){
      const row = document.createElement('div');
      row.id = 'pf-launch-row';
      row.appendChild(btn);
      searchWrap.parentNode.insertBefore(row, searchWrap.nextSibling);
    }

    // Always inject the floating FAB so the widget is reachable while scrolling
    const fab = document.createElement('button');
    fab.id = 'pf-fab';
    fab.title = 'Particle Finder — open from anywhere';
    fab.setAttribute('aria-label','Open Particle Finder');
    fab.innerHTML = '<span class="pf-fab-jp">助詞</span><span class="pf-fab-en">PARTICLE</span>';
    fab.addEventListener('click', openModal);
    document.body.appendChild(fab);
  }

  /* =========================================
     INIT
     ========================================= */
  function init(){
    mergeExternalVocab();
    injectToggle();
    buildModal();
    // Re-merge any vocab-examples.js that loads later
    if(!window.VOCAB_DB){
      const retry = setInterval(()=>{
        if(window.VOCAB_DB){
          mergeExternalVocab();
          clearInterval(retry);
        }
      }, 200);
      setTimeout(()=>clearInterval(retry), 5000);
    }
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

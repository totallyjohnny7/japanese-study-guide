/* ===========================================================
   Mastery decks — derive from existing window.NAKAMA_CARDS
   (loaded by flashcards-data.js) plus data/cards.json for
   translation drill. Pure data layer; no UI here.

   Exposes window.MASTERY_DECKS = { metaList, byId, allCards }
     metaList: [{id,title,subtitle,deckType,count,color,emoji}]
     byId    : { deckId: { meta, cards: [...] } }
     allCards: every card across all decks (for cross-deck run)

   Card shape (Mastery-internal):
     { id, deckId, deckType, ch, front, back,
       answerCanonical,        // normalized for fuzzy match
       answerVariants?,        // alt accepted forms (kana ⇄ kanji)
       answerLang,             // 'ja' | 'en'
       mustContain?, requiredParticles?, forbiddenParticles?,
       why?, sourceTag,
       // runtime persistence appended by mastery-app:
       //   status, lapseCount, matchTime[], matchMisses[],
       //   FSRS{due,stab,diff}, blockHistory[], lastSeen
     }
   =========================================================== */
(function(){
'use strict';

const NK = (typeof window !== 'undefined' && window.NAKAMA_CARDS) ? window.NAKAMA_CARDS : [];

// Kanji range test
function hasKanji(s){
  if(!s) return false;
  for(const ch of s){
    const cp = ch.codePointAt(0);
    if((cp>=0x3400 && cp<=0x4DBF) || (cp>=0x4E00 && cp<=0x9FFF) || (cp>=0xF900 && cp<=0xFAFF)) return true;
  }
  return false;
}

// Strip surrounding parens for cleaner display ("たべる (eat)" → "たべる")
function stripParens(s){
  return (s||'').replace(/\s*[\(（][^)）]*[\)）]\s*/g,'').trim();
}

// Pick first alternate before slash / em-dash (for canonical normalization)
function firstAlt(s){
  if(!s) return s;
  return s.split(/\s*\/\s*|\s+or\s+|\s*—\s*/)[0].trim();
}

// =========================================================
//   1) Particle Usage deck
//   Pulls particle, dbl_particle, cloze types
// =========================================================
function buildParticleUsage(){
  const out = [];
  NK.forEach(c => {
    if(c.type === 'particle' || c.type === 'dbl_particle' || c.type === 'cloze'){
      // Skip cloze cards whose answer isn't a particle (e.g. どんな, どう, たべ)
      if(c.type === 'cloze'){
        const ans = (c.answer||'').trim();
        const particleSet = ['は','が','を','に','で','へ','と','から','まで','の','も','や','か','ね','よ','まで','より'];
        if(!particleSet.includes(ans)) return;
      }
      out.push({
        id: 'pu_'+c.id,
        deckId: 'particle-usage',
        deckType: 'particle',
        ch: c.ch,
        front: c.prompt + (c.ctx ? '\n('+c.ctx+')' : ''),
        back: c.answer + (c.why ? '\n— '+c.why : ''),
        answerCanonical: (c.answer||'').replace(/\s+/g,' ').trim(),
        answerVariants: [],
        answerLang: 'ja',
        why: c.why || '',
        sourceTag: c.type+':'+c.id,
      });
    }
  });
  return out;
}

// =========================================================
//   2) Conjugation deck
//   verb_conj, adj_conj, te_form, te_chain, transform
// =========================================================
function buildConjugation(){
  const out = [];
  NK.forEach(c => {
    if(['verb_conj','adj_conj','te_form','te_chain','transform'].includes(c.type)){
      const front = (c.prompt||'').replace(/\\n/g,'\n');
      const back = c.answer + (c.why ? '\n— '+c.why : '');
      // Build accepted variants: split "X / Y" answers, strip "⚠"
      const cleaned = (c.answer||'').replace(/⚠/g,'').replace(/\s*\(NOT [^)]*\)/g,'').trim();
      const variants = cleaned.split(/\s*\/\s*|\s+or\s+/).map(s=>s.trim()).filter(Boolean);
      out.push({
        id: 'cj_'+c.id,
        deckId: 'conjugation',
        deckType: c.type,
        ch: c.ch,
        front,
        back,
        answerCanonical: variants[0] || cleaned,
        answerVariants: variants.slice(1),
        answerLang: 'ja',
        why: c.why || '',
        sourceTag: c.type+':'+c.id,
      });
    }
  });
  return out;
}

// =========================================================
//   3) Translation E→J deck (from data/cards.json — fetched
//      lazily, see loadTranslationDeck below)
//   4) Translation J→E deck (flipped from same source)
// =========================================================
let translationCardsRaw = null;
async function loadTranslationCards(){
  if(translationCardsRaw) return translationCardsRaw;
  try {
    const res = await fetch('data/cards.json', {cache:'force-cache'});
    if(!res.ok) throw new Error('HTTP '+res.status);
    const data = await res.json();
    translationCardsRaw = (data && Array.isArray(data.cards)) ? data.cards : [];
  } catch(e){
    console.warn('[mastery] translation cards unavailable:', e);
    translationCardsRaw = [];
  }
  return translationCardsRaw;
}

function buildTranslationEJ(rawCards){
  return rawCards.map(c => {
    const va = (c.valid_answers && c.valid_answers[0]) || {};
    return {
      id: 'tej_'+c.id,
      deckId: 'translation-ej',
      deckType: 'translation_ej',
      ch: c.chapter,
      front: c.prompt_en + (c.prompt_ja_hint ? '\n💡 '+c.prompt_ja_hint : ''),
      back: va.canonical || '',
      answerCanonical: va.canonical || '',
      answerVariants: [],
      answerLang: 'ja',
      mustContain: va.must_contain || [],
      requiredParticles: va.required_particles || [],
      forbiddenParticles: va.forbidden_particles || [],
      sourceTag: 'translation_ej:'+c.id,
    };
  });
}
function buildTranslationJE(rawCards){
  return rawCards.map(c => {
    const va = (c.valid_answers && c.valid_answers[0]) || {};
    return {
      id: 'tje_'+c.id,
      deckId: 'translation-je',
      deckType: 'translation_je',
      ch: c.chapter,
      front: va.canonical || '',
      back: c.prompt_en,
      answerCanonical: c.prompt_en,
      answerVariants: [],
      answerLang: 'en',
      sourceTag: 'translation_je:'+c.id,
    };
  });
}

// =========================================================
//   5) Sentence Pattern deck
//   masenka, goro_gurai, adj_noun, demo, qword, greeting
// =========================================================
function buildSentencePattern(){
  const out = [];
  NK.forEach(c => {
    if(['masenka','goro_gurai','adj_noun','demo','qword','greeting'].includes(c.type)){
      const front = (c.prompt||'').replace(/\\n/g,'\n');
      const back = c.answer + (c.why ? '\n— '+c.why : '');
      const cleaned = (c.answer||'').replace(/⚠/g,'').trim();
      const variants = cleaned.split(/\s*\/\s*|\s+or\s+/).map(s=>s.trim()).filter(Boolean);
      out.push({
        id: 'sp_'+c.id,
        deckId: 'sentence-pattern',
        deckType: c.type,
        ch: c.ch,
        front,
        back,
        answerCanonical: variants[0] || cleaned,
        answerVariants: variants.slice(1),
        answerLang: c.type==='qword' ? 'en' : 'ja',
        why: c.why || '',
        sourceTag: c.type+':'+c.id,
      });
    }
  });
  return out;
}

// =========================================================
//   6) Kanji Reading deck
//   Derived from `recall` cards where answer !== kana and
//   the answer contains kanji.
// =========================================================
function buildKanjiReading(){
  const seen = new Set();
  const out = [];
  NK.forEach(c => {
    if(c.type !== 'recall') return;
    const ja = c.answer || '';
    const kana = c.kana || '';
    if(!ja || !kana || ja === kana) return;
    if(!hasKanji(ja)) return;
    // Skip mixed answers like "うち / へや" — front would be ambiguous
    if(/[\/／]/.test(ja)) return;
    if(seen.has(ja)) return;
    seen.add(ja);
    out.push({
      id: 'kr_'+c.id,
      deckId: 'kanji-reading',
      deckType: 'kanji_reading',
      ch: c.ch,
      front: ja,
      back: kana + '\n' + (c.en || c.prompt),
      answerCanonical: kana,
      answerVariants: [],
      answerLang: 'ja',
      en: c.en || c.prompt,
      sourceTag: 'kanji_reading:'+c.id,
    });
  });
  return out;
}

// =========================================================
//   7) Counter deck (passthrough of type='counter')
// =========================================================
function buildCounter(){
  return NK.filter(c => c.type==='counter').map(c => {
    const cleaned = (c.answer||'').replace(/⚠/g,'').replace(/\s*\([^)]*\)\s*/g,'').trim();
    const variants = cleaned.split(/\s*\/\s*|\s+or\s+/).map(s=>s.trim()).filter(Boolean);
    return {
      id: 'co_'+c.id,
      deckId: 'counter',
      deckType: 'counter',
      ch: c.ch,
      front: c.prompt + (c.counter ? '\n[counter: '+c.counter+']' : ''),
      back: c.answer + (c.mnem && c.mnem.chain ? '\n— '+c.mnem.chain : ''),
      answerCanonical: variants[0] || cleaned,
      answerVariants: variants.slice(1),
      answerLang: 'ja',
      sourceTag: 'counter:'+c.id,
    };
  });
}

// =========================================================
//   8) Compare/Contrast deck
//   wa_ga, i_na, ni_de, freq
// =========================================================
function buildCompareContrast(){
  const out = [];
  NK.forEach(c => {
    if(['wa_ga','i_na','ni_de','freq'].includes(c.type)){
      let front, answerLang='ja';
      if(c.type === 'wa_ga'){
        front = (c.ctx ? c.ctx+'\n' : '') + c.prompt + '\n→ は or が?';
      } else if(c.type === 'i_na'){
        front = (c.prompt||'').replace(/\\n/g,'\n');
        answerLang = 'en';
      } else if(c.type === 'ni_de'){
        front = (c.prompt||'').replace(/\\n/g,'\n') + '\n→ に or で?';
      } else { // freq
        front = (c.prompt||'').replace(/\\n/g,'\n');
        answerLang = 'en';
      }
      const back = c.answer + (c.why ? '\n— '+c.why : '');
      const cleaned = (c.answer||'').replace(/⚠/g,'').trim();
      const variants = cleaned.split(/\s*\/\s*|\s+or\s+/).map(s=>s.trim()).filter(Boolean);
      out.push({
        id: 'cc_'+c.id,
        deckId: 'compare-contrast',
        deckType: c.type,
        ch: c.ch,
        front,
        back,
        answerCanonical: variants[0] || cleaned,
        answerVariants: variants.slice(1),
        answerLang,
        why: c.why || '',
        sourceTag: c.type+':'+c.id,
      });
    }
  });
  return out;
}

// =========================================================
//   Deck metadata catalog
// =========================================================
const DECK_META = [
  { id:'particle-usage',   title:'Particle Usage',   subtitle:'Fill the blank: は・が・を・に・で・へ・と・から・まで・の・も',
    color:'#f0a040', emoji:'助' },
  { id:'conjugation',      title:'Conjugation',      subtitle:'Verb・i-adj・na-adj・て-form・transformation',
    color:'#66bb6a', emoji:'活' },
  { id:'translation-ej',   title:'Translation E→J',  subtitle:'Produce Japanese from English. Fuzzy match — accepts kana, kanji, or romaji.',
    color:'#5b9bd5', emoji:'訳' },
  { id:'translation-je',   title:'Translation J→E',  subtitle:'Produce English from Japanese.',
    color:'#9ec0e5', emoji:'英' },
  { id:'sentence-pattern', title:'Sentence Pattern', subtitle:'こ/そ/あ/ど・ませんか・ごろ vs ぐらい・adj+noun・question words・greetings',
    color:'#b08fd4', emoji:'文' },
  { id:'kanji-reading',    title:'Kanji Reading',    subtitle:'Read each kanji compound. Type the reading.',
    color:'#d4af37', emoji:'漢' },
  { id:'counter',          title:'Counters',         subtitle:'分・時・人・本 — drill irregular sound shifts',
    color:'#5dc1c5', emoji:'数' },
  { id:'compare-contrast', title:'Compare / Contrast', subtitle:'は vs が・い vs な-adj・に vs で・あまり/ぜんぜん traps',
    color:'#e57373', emoji:'比' },
];

// =========================================================
//   Build all decks (translation decks need async fetch)
// =========================================================
async function buildAll(){
  const decks = {
    'particle-usage':   { meta: DECK_META[0], cards: buildParticleUsage() },
    'conjugation':      { meta: DECK_META[1], cards: buildConjugation() },
    'translation-ej':   { meta: DECK_META[2], cards: [] },
    'translation-je':   { meta: DECK_META[3], cards: [] },
    'sentence-pattern': { meta: DECK_META[4], cards: buildSentencePattern() },
    'kanji-reading':    { meta: DECK_META[5], cards: buildKanjiReading() },
    'counter':          { meta: DECK_META[6], cards: buildCounter() },
    'compare-contrast': { meta: DECK_META[7], cards: buildCompareContrast() },
  };

  const trCards = await loadTranslationCards();
  decks['translation-ej'].cards = buildTranslationEJ(trCards);
  decks['translation-je'].cards = buildTranslationJE(trCards);

  const metaList = DECK_META.map(m => ({ ...m, count: decks[m.id].cards.length }));
  const allCards = [];
  for(const id of Object.keys(decks)){
    decks[id].cards.forEach(c => allCards.push(c));
  }

  return { metaList, byId: decks, allCards };
}

window.MASTERY_DECKS_READY = buildAll().then(d => {
  window.MASTERY_DECKS = d;
  // Dispatch ready event so app can render once decks are populated
  window.dispatchEvent(new CustomEvent('mastery-decks-ready', { detail: d }));
  return d;
});

})();

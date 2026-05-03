/* ===========================================================
   Mastery — block-based study engine.
   Uses window.MASTERY_DECKS (from mastery-decks.js).
   Persists into the `nakama_mastery_*` localStorage namespace
   so it does not collide with the existing flashcards system.
   =========================================================== */
(function(){
'use strict';

// ── LocalStorage keys
const LS_KEY = 'nakama_mastery_state';

// ── Block-type definitions (durations in seconds)
const BLOCKS = {
  encoding:      { label:'Encoding',       seconds: 30*60, color:'#d4a843', emoji:'⚡' },
  consolidation: { label:'Consolidation',  seconds: 25*60, color:'#5b9bd5', emoji:'🧱' },
  reactivation:  { label:'Reactivation',   seconds: 25*60, color:'#b08fd4', emoji:'🔄' },
  application:   { label:'Application',    seconds: 30*60, color:'#66bb6a', emoji:'🎯' },
  cloze:         { label:'Cloze',          seconds: 28*60, color:'#80cbc4', emoji:'空' },
  drill:         { label:'Drill',          seconds: 30*60, color:'#f0a040', emoji:'🏃' },
  lapse:         { label:'Lapse',          seconds: 20*60, color:'#e57373', emoji:'🩹' },
  warmup:        { label:'Warmup',         seconds: 15*60, color:'#fff176', emoji:'🌅' },
};
const BREAK_SECONDS = 10*60;
const HARD_DAILY_BLOCK_CAP = 5;

// 3-day suggested plan. Cloze Block slots into Day 1 / Day 2 alongside
// Application + Drill. Day 0 stays focused on initial encoding.
const PLAN_BY_DAY = {
  0: ['encoding','encoding','consolidation','application'],
  1: ['reactivation','application','cloze','drill'],
  2: ['lapse','cloze','application','drill'],
  3: ['warmup'],
};

// ── State
let state = null;
let decks = null;        // from MASTERY_DECKS
let allCards = null;     // flat list (from MASTERY_DECKS.allCards)
let currentBlock = null; // active block runtime, see startBlock()
let blockTimerHandle = null;
let breakTimerHandle = null;
let appRoot = null;

// =========================================================
// Persistence
// =========================================================
function lsGet(k){ try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch(e){ return null; } }
function lsSet(k,v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }

function defaultState(){
  return {
    firstStudyDate: null,     // ISO date of first block
    cardState: {},             // { cardId: { status, lapseCount, fsrs:{due,stab,diff}, lastSeen, blockHistory:[], hits:0 } }
    blockLog: [],              // { ts, dayIndex, blockType, deckId, cardsSeen, knownCount }
    lastBlockEndTs: 0,         // for break enforcement
    settings: { audio:true, breakEnforce:true, interleave:true },
  };
}

function loadState(){
  state = lsGet(LS_KEY) || defaultState();
  if(!state.cardState) state.cardState = {};
  if(!state.blockLog) state.blockLog = [];
  if(!state.settings) state.settings = { audio:true, breakEnforce:true, interleave:true };
}
function saveState(){ lsSet(LS_KEY, state); }

function getCardState(id){
  let s = state.cardState[id];
  if(!s){
    s = state.cardState[id] = {
      status: 'new',          // new | unknown | shaky | known | mastered
      lapseCount: 0,
      consecutiveKnown: 0,
      lastSeen: 0,
      fsrs: { due: 0, stab: 0, diff: 5 },
      blockHistory: [],
      hits: 0,
      slow: false,            // flagged for tomorrow
    };
  } else {
    // Migrate stale entries that pre-date later-added fields. Without this,
    // `st.fsrs.due = ...` writes throughout the engine throw on old saves.
    if(!s.fsrs) s.fsrs = { due: 0, stab: 0, diff: 5 };
    if(typeof s.consecutiveKnown !== 'number') s.consecutiveKnown = 0;
    if(typeof s.lapseCount !== 'number') s.lapseCount = 0;
    if(typeof s.lastSeen !== 'number') s.lastSeen = 0;
    if(!Array.isArray(s.blockHistory)) s.blockHistory = [];
  }
  return s;
}

// =========================================================
// Day index, block availability, plan
// =========================================================
function todayKey(d){
  d = d || new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function dayIndex(){
  if(!state.firstStudyDate) return 0;
  const start = new Date(state.firstStudyDate);
  start.setHours(0,0,0,0);
  const today = new Date();
  today.setHours(0,0,0,0);
  return Math.floor((today.getTime()-start.getTime())/86400000);
}

function blocksToday(){
  const k = todayKey();
  return state.blockLog.filter(b => todayKey(new Date(b.ts)) === k);
}

function todayPlan(){
  const di = Math.min(dayIndex(), 3);
  const planned = PLAN_BY_DAY[di] || ['drill'];
  const done = blocksToday().map(b => b.blockType);
  // Mark each plan slot done if a block of that type has been done today
  // (consume one slot per matching block).
  const remaining = [...planned];
  done.forEach(t => {
    const idx = remaining.indexOf(t);
    if(idx >= 0) remaining.splice(idx, 1);
  });
  return { dayIndex: di, planned, done, remaining };
}

function nextSuggestedBlock(){
  const p = todayPlan();
  if(p.remaining.length){
    return p.remaining[0];
  }
  // Fallback: if past planned, suggest application (highest leverage)
  return 'application';
}

function breakRemainingMs(){
  if(!state.settings.breakEnforce) return 0;
  if(!state.lastBlockEndTs) return 0;
  const elapsed = Date.now() - state.lastBlockEndTs;
  return Math.max(0, BREAK_SECONDS*1000 - elapsed);
}

function diversityRouteCheck(blockType){
  // No more than 2 of the same block type per day. Cloze counts separately
  // from Application so Application + Cloze + Drill on the same day is fine.
  const today = blocksToday();
  const count = today.filter(b => b.blockType === blockType).length;
  if(count >= 2){
    if(blockType === 'drill') return { reroute:'application', reason:'2 Drill blocks already today — switching to Application for variety.' };
    if(blockType === 'application') return { reroute:'cloze',  reason:'2 Application blocks already today — switching to Cloze.' };
    if(blockType === 'cloze') return { reroute:'application', reason:'2 Cloze blocks already today — switching to Application.' };
    if(blockType === 'encoding') return { reroute:'consolidation', reason:'2 Encoding blocks already today — switching to Consolidation.' };
  }
  return null;
}

function fatigueCheck(){
  const today = blocksToday();
  if(today.length >= HARD_DAILY_BLOCK_CAP){
    return { stop:true, reason:`You've completed ${today.length} blocks today (~${(today.length*30)} min). Diminishing returns past this point. Consider stopping for the day.` };
  }
  if(today.length >= 3){
    const first = today[0]; const last = today[today.length-1];
    const fk = first.knownCount/Math.max(1,first.cardsSeen);
    const lk = last.knownCount/Math.max(1,last.cardsSeen);
    if(fk - lk > 0.15) return { stop:true, reason:'Block accuracy has dropped 15%+ since this morning — fatigue is showing. Consider a break.' };
  }
  return null;
}

// =========================================================
// Card selection logic
// =========================================================
function shuffle(a){
  for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}

function selectForCycle(deckCards, n, opts){
  opts = opts || {};
  const exclude = opts.exclude || new Set();
  const todayK = todayKey();
  const due = [];
  const flaggedSlow = [];
  const unknown = [];
  const shaky = [];
  const fresh = [];
  const fallback = [];
  const now = Date.now();
  deckCards.forEach(c => {
    if(exclude.has(c.id)) return;
    const st = getCardState(c.id);
    if(st.slow) flaggedSlow.push(c);
    if(st.fsrs.due && st.fsrs.due <= now) due.push(c);
    if(st.status === 'unknown' && todayKey(new Date(st.lastSeen||0)) !== todayK) unknown.push(c);
    if(st.status === 'shaky' && todayKey(new Date(st.lastSeen||0)) !== todayK) shaky.push(c);
    if(st.status === 'new') fresh.push(c);
    fallback.push(c);
  });
  const order = [];
  function push(arr){ shuffle(arr); arr.forEach(c => { if(order.length<n && !order.includes(c)) order.push(c); }); }
  push(flaggedSlow);
  push(due);
  push(unknown);
  push(shaky);
  push(fresh);
  push(fallback);
  return order.slice(0, n);
}

// Cross-deck weighted selection: pull weakest cards from every deck
function selectCrossDeck(n){
  const buckets = decks.metaList.map(m => decks.byId[m.id].cards);
  const weighted = [];
  buckets.forEach(cards => {
    cards.forEach(c => {
      const st = getCardState(c.id);
      const w = (st.lapseCount*3) + (st.status==='unknown'?5:0) + (st.status==='shaky'?2:0) + (st.status==='new'?1:0);
      if(w > 0) weighted.push({ c, w });
    });
  });
  weighted.sort((a,b)=>b.w-a.w);
  // Shuffle within top 3*n then pick n
  const top = weighted.slice(0, n*3);
  shuffle(top);
  return top.slice(0,n).map(x => x.c);
}

// Weakest cards across whole pool for warmup
function selectAllReviewed(){
  return allCards.filter(c => {
    const st = getCardState(c.id);
    return st.lastSeen > 0;
  });
}

function selectLapsed(){
  return allCards.filter(c => getCardState(c.id).lapseCount > 0);
}

// =========================================================
// Japanese-aware fuzzy match
// =========================================================
const KANA_MAP = (function(){
  // Katakana → Hiragana code-shift
  const m = {};
  for(let i=0x30A1;i<=0x30F6;i++){ m[String.fromCodePoint(i)] = String.fromCodePoint(i-0x60); }
  return m;
})();

// Minimal Hepburn romaji → hiragana lookup, used when wanakana is
// unavailable (offline, blocked CDN, etc.). Covers the standard syllabary
// + small つ + common digraphs. Not perfect — wanakana is preferred — but
// good enough that "tabe" still matches たべる.
const ROMAJI_HIRA = (function(){
  const m = {
    a:'あ', i:'い', u:'う', e:'え', o:'お',
    ka:'か', ki:'き', ku:'く', ke:'け', ko:'こ',
    ga:'が', gi:'ぎ', gu:'ぐ', ge:'げ', go:'ご',
    sa:'さ', shi:'し', si:'し', su:'す', se:'せ', so:'そ',
    za:'ざ', ji:'じ', zi:'じ', zu:'ず', ze:'ぜ', zo:'ぞ',
    ta:'た', chi:'ち', ti:'ち', tsu:'つ', tu:'つ', te:'て', to:'と',
    da:'だ', di:'ぢ', du:'づ', de:'で', 'do':'ど',
    na:'な', ni:'に', nu:'ぬ', ne:'ね', no:'の',
    ha:'は', hi:'ひ', fu:'ふ', hu:'ふ', he:'へ', ho:'ほ',
    ba:'ば', bi:'び', bu:'ぶ', be:'べ', bo:'ぼ',
    pa:'ぱ', pi:'ぴ', pu:'ぷ', pe:'ぺ', po:'ぽ',
    ma:'ま', mi:'み', mu:'む', me:'め', mo:'も',
    ya:'や', yu:'ゆ', yo:'よ',
    ra:'ら', ri:'り', ru:'る', re:'れ', ro:'ろ',
    wa:'わ', wo:'を', n:'ん', "n'":'ん',
    kya:'きゃ', kyu:'きゅ', kyo:'きょ',
    gya:'ぎゃ', gyu:'ぎゅ', gyo:'ぎょ',
    sha:'しゃ', shu:'しゅ', sho:'しょ',
    sya:'しゃ', syu:'しゅ', syo:'しょ',
    ja:'じゃ', ju:'じゅ', jo:'じょ',
    cha:'ちゃ', chu:'ちゅ', cho:'ちょ',
    nya:'にゃ', nyu:'にゅ', nyo:'にょ',
    hya:'ひゃ', hyu:'ひゅ', hyo:'ひょ',
    bya:'びゃ', byu:'びゅ', byo:'びょ',
    pya:'ぴゃ', pyu:'ぴゅ', pyo:'ぴょ',
    mya:'みゃ', myu:'みゅ', myo:'みょ',
    rya:'りゃ', ryu:'りゅ', ryo:'りょ',
  };
  return m;
})();

function romajiToHiragana(input){
  if(!input) return '';
  // Pure-ASCII fast-path; if it has any non-latin char, skip naive convert
  if(!/[a-zA-Z]/.test(input)) return input;
  const s = input.toLowerCase();
  let out = '';
  let i = 0;
  while(i < s.length){
    const c = s[i];
    // Small-tsu doubling: kk → っk, tt → っt, etc. (not vowels, not n)
    if(c === s[i+1] && /[a-z]/.test(c) && c !== 'n' && !'aiueo'.includes(c)){
      out += 'っ'; i++; continue;
    }
    // Try 3-char digraph, then 2-char, then 1-char
    let matched = false;
    for(const len of [3,2,1]){
      const slice = s.slice(i, i+len);
      if(ROMAJI_HIRA[slice]){ out += ROMAJI_HIRA[slice]; i += len; matched = true; break; }
    }
    if(!matched){
      // Standalone 'n' before consonant or end
      if(c === 'n'){ out += 'ん'; i++; continue; }
      out += s[i]; i++;
    }
  }
  return out;
}

function toHiragana(s){
  if(!s) return '';
  if(window.wanakana && typeof window.wanakana.toHiragana === 'function'){
    try { return window.wanakana.toHiragana(s); } catch(e){}
  }
  let out = s.replace(/[ァ-ヶ]/g, ch => KANA_MAP[ch] || ch);
  if(/[a-zA-Z]/.test(out)) out = romajiToHiragana(out);
  return out;
}

function normalizeJa(s){
  if(!s) return '';
  let out = String(s);
  // Convert fullwidth ASCII / latin to halfwidth (just spaces and punctuation we care about)
  out = out.replace(/　/g, ' ');
  // Strip punctuation, spaces
  out = out.replace(/[\s。、・「」『』,.!?！？／/]/g, '');
  // Convert katakana → hiragana, romaji → hiragana via wanakana
  out = toHiragana(out);
  return out.toLowerCase();
}

function normalizeEn(s){
  if(!s) return '';
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOPWORDS = new Set(['the','a','an','is','are','was','were','am','of','to','in','on','at','for','i','you','my','we','they','it','this','that','these','those']);

function gradeAnswer(card, userInput){
  if(!userInput || !userInput.trim()) return { ok:false, reason:'empty' };
  if(card.answerLang === 'en'){
    const u = normalizeEn(userInput);
    const c = normalizeEn(card.answerCanonical);
    if(u === c) return { ok:true };
    // Loose match on significant words
    const cWords = c.split(' ').filter(w => w.length>2 && !STOPWORDS.has(w));
    const uWords = new Set(u.split(' '));
    if(cWords.length === 0){
      // Short answer (≤2 chars or all stopwords) — must match exactly
      return { ok:false, reason:'wrong' };
    }
    const hit = cWords.filter(w => uWords.has(w)).length;
    if(hit / cWords.length >= 0.7) return { ok:true };
    return { ok:false, reason:'wrong' };
  }
  // Japanese answer
  const u = normalizeJa(userInput);
  const variants = [card.answerCanonical, ...(card.answerVariants||[])];
  for(const v of variants){
    const nv = normalizeJa(v);
    if(nv && (u === nv)) return { ok:true };
  }
  // Strip parens then re-test
  for(const v of variants){
    const stripped = String(v||'').replace(/\s*[\(（][^)）]*[\)）]\s*/g,'');
    if(normalizeJa(stripped) === u) return { ok:true };
  }
  // Translation E→J extra checks
  if(card.deckType === 'translation_ej' && card.mustContain){
    const allTokens = (card.mustContain||[]).every(group =>
      group.some(form => u.includes(normalizeJa(form))));
    if(!allTokens) return { ok:false, reason:'missing-tokens' };
    const reqP = card.requiredParticles||[];
    if(!reqP.every(p => u.includes(normalizeJa(p)))) return { ok:false, reason:'missing-particle' };
    const fbP = card.forbiddenParticles||[];
    if(fbP.some(p => u.includes(normalizeJa(p)))) return { ok:false, reason:'forbidden-particle' };
    return { ok:true, partial:true };
  }
  return { ok:false, reason:'wrong' };
}

// =========================================================
// Card classification (after Match round)
// =========================================================
function classifyMatch(timeMs, misses){
  if(timeMs < 2000 && misses === 0) return 'known';
  if(timeMs < 5000 && misses <= 1) return 'shaky';
  return 'unknown';
}

function applyClassification(card, klass, blockType){
  const st = getCardState(card.id);
  st.lastSeen = Date.now();
  st.blockHistory.push({ ts: Date.now(), type: blockType, klass });
  if(klass === 'known'){
    st.consecutiveKnown = (st.consecutiveKnown||0) + 1;
    st.status = 'known';
    if(st.consecutiveKnown >= 2){
      st.status = 'mastered';
      // Park for 3 days via FSRS
      st.fsrs.stab = Math.max(st.fsrs.stab, 3);
      st.fsrs.due = Date.now() + 3*86400000;
    }
  } else if(klass === 'shaky'){
    st.consecutiveKnown = 0;
    st.status = 'shaky';
    st.fsrs.due = Date.now() + 6*3600000;
  } else { // unknown
    st.consecutiveKnown = 0;
    st.lapseCount = (st.lapseCount||0) + 1;
    st.status = 'unknown';
    st.fsrs.due = Date.now() + 30*60000;
  }
}

// =========================================================
// HTML helpers
// =========================================================
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function escMulti(s){ return esc(s).replace(/\n/g,'<br>'); }

function el(html){ const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }

function deckMastery(deckId){
  const d = decks.byId[deckId];
  if(!d) return { pct: 0, mastered:0, known:0, shaky:0, unknown:0, total:0 };
  let mastered=0, known=0, shaky=0, unknown=0, newC=0;
  d.cards.forEach(c => {
    const st = getCardState(c.id);
    if(st.status==='mastered') mastered++;
    else if(st.status==='known') known++;
    else if(st.status==='shaky') shaky++;
    else if(st.status==='unknown') unknown++;
    else newC++;
  });
  const total = d.cards.length;
  const pct = total ? Math.round( (mastered + known*0.7 + shaky*0.3) / total * 100 ) : 0;
  return { pct, mastered, known, shaky, unknown, new: newC, total };
}

// =========================================================
// HOME SCREEN
// =========================================================
function renderHome(){
  const plan = todayPlan();
  const next = nextSuggestedBlock();
  const breakMs = breakRemainingMs();
  const fatigue = fatigueCheck();

  const dayLabel = plan.dayIndex >= 3 ? 'Day 3 — Test Day'
                : 'Day '+plan.dayIndex+(plan.dayIndex===0?' (Learning)':'');
  const planHtml = plan.planned.map((bt,i) => {
    const consumed = i < plan.planned.length - plan.remaining.length;
    const isNext = !consumed && bt === next;
    return `<div class="plan-block ${consumed?'done':isNext?'next':''}">
      <span class="pb-emoji">${BLOCKS[bt].emoji}</span>
      <span class="pb-label">${BLOCKS[bt].label}</span>
      <span class="pb-min">~${Math.round(BLOCKS[bt].seconds/60)}min</span>
      ${consumed?'<span class="pb-tick">✓</span>':''}
    </div>`;
  }).join('');

  const deckTiles = decks.metaList.map(m => {
    const st = deckMastery(m.id);
    return `<button class="deck-tile" data-deck="${esc(m.id)}" style="--accent:${esc(m.color)}">
      <div class="dt-top">
        <span class="dt-emoji">${m.emoji}</span>
        <span class="dt-title">${esc(m.title)}</span>
        <span class="dt-pct">${st.pct}%</span>
      </div>
      <div class="dt-sub">${esc(m.subtitle)}</div>
      <div class="dt-bar"><div class="dt-fill" style="width:${st.pct}%;background:${m.color}"></div></div>
      <div class="dt-meta">
        <span>${st.mastered+st.known} learned</span>
        <span>${st.shaky+st.unknown} shaky</span>
        <span>${st.new} new</span>
        <span>${st.total} total</span>
      </div>
    </button>`;
  }).join('');

  const breakHtml = breakMs > 0 ? `<div class="break-banner">
    <strong>Break in progress.</strong> Mastery enforces a 10-minute break between blocks.
    Resume in <strong id="breakCountdown">${formatTime(Math.ceil(breakMs/1000))}</strong>.
    Eyes 20+ ft away. Water. Walk.
  </div>` : '';

  const fatigueHtml = fatigue ? `<div class="fatigue-banner"><strong>${esc(fatigue.reason)}</strong></div>` : '';

  appRoot.innerHTML = `
    <div class="m-home">
      <div class="m-header">
        <div class="m-title">Mastery</div>
        <div class="m-subtitle">${esc(dayLabel)} · ${plan.done.length} of ${plan.planned.length} blocks done</div>
      </div>
      ${breakHtml}
      ${fatigueHtml}
      <div class="m-section">
        <h3>Today's plan</h3>
        <div class="plan-row">${planHtml}</div>
      </div>
      <div class="m-section">
        <h3>Decks</h3>
        <div class="deck-grid">${deckTiles}</div>
      </div>
      <div class="m-section m-cross">
        <h3>Cross-deck Mastery Run</h3>
        <p>Pulls 30 cards across all decks weighted toward your weakest. Recommended for Day 3 warmup.</p>
        <button class="big-btn" id="crossRunBtn">Start Mastery Run →</button>
      </div>
      <div class="m-section">
        <h3>Standalone Cloze Mode</h3>
        <p>Run cloze cards as a continuous flow — same selection logic as the Cloze Block, no timer pressure. Great between blocks or for a quick warmup.</p>
        <button class="big-btn alt" id="clozeStandaloneBtn">Start Cloze Mode →</button>
      </div>
      <div class="m-section">
        <h3>Custom Block</h3>
        <p>Pick a deck, chapters, and block type. Drill exactly what you need.</p>
        <button class="big-btn alt" id="customBtn">Custom block →</button>
      </div>
      <div class="m-section">
        <h3>Browse cards</h3>
        <p>See every card in every deck. Filter by status, chapter, deck. Search across all scripts.</p>
        <button class="big-btn alt" id="browseBtn">Open browser →</button>
      </div>
      <div class="m-section m-foot">
        <h3>Settings</h3>
        <label class="m-toggle"><input type="checkbox" id="setAudio" ${state.settings.audio?'checked':''}> Audio (TTS) on misses</label>
        <label class="m-toggle"><input type="checkbox" id="setBreak" ${state.settings.breakEnforce?'checked':''}> Enforce 10-min break</label>
        <label class="m-toggle"><input type="checkbox" id="setInterleave" ${state.settings.interleave?'checked':''}> Interleave decks from Day 1+</label>
      </div>
    </div>
  `;

  // Wire deck tiles
  appRoot.querySelectorAll('.deck-tile').forEach(btn => {
    btn.onclick = () => showDeckMenu(btn.dataset.deck);
  });
  document.getElementById('crossRunBtn').onclick = () => offerStartBlock('reactivation', null, true);
  const clozeStandaloneBtn = document.getElementById('clozeStandaloneBtn');
  if(clozeStandaloneBtn){
    clozeStandaloneBtn.onclick = () => {
      if(!decks.byId['cloze']){
        alert('Cloze deck is still loading — try again in a moment.');
        return;
      }
      offerStartBlock('cloze', 'cloze', false);
    };
  }
  document.getElementById('customBtn').onclick = () => showCustomBlock();
  document.getElementById('browseBtn').onclick = () => showBrowser();
  document.getElementById('setAudio').onchange = e => { state.settings.audio = e.target.checked; saveState(); };
  document.getElementById('setBreak').onchange = e => { state.settings.breakEnforce = e.target.checked; saveState(); };
  document.getElementById('setInterleave').onchange = e => { state.settings.interleave = e.target.checked; saveState(); };

  // Break countdown tick
  if(breakMs > 0){
    if(breakTimerHandle) clearInterval(breakTimerHandle);
    breakTimerHandle = setInterval(() => {
      const left = breakRemainingMs();
      const cd = document.getElementById('breakCountdown');
      if(!cd){ clearInterval(breakTimerHandle); return; }
      cd.textContent = formatTime(Math.ceil(left/1000));
      if(left <= 0){ clearInterval(breakTimerHandle); renderHome(); }
    }, 1000);
  }
}

function showDeckMenu(deckId){
  const m = decks.byId[deckId].meta;
  const st = deckMastery(deckId);
  const next = nextSuggestedBlock();
  const breakMs = breakRemainingMs();
  appRoot.innerHTML = `
    <div class="m-deck-menu">
      <button class="m-back" id="backToHome">← Mastery home</button>
      <div class="m-header" style="--accent:${esc(m.color)}">
        <span class="m-emoji">${m.emoji}</span>
        <div class="m-title" style="color:${m.color}">${esc(m.title)}</div>
        <div class="m-subtitle">${esc(m.subtitle)}</div>
      </div>
      <div class="m-deck-stats">
        <div><strong>${st.total}</strong>cards</div>
        <div><strong>${st.mastered}</strong>mastered</div>
        <div><strong>${st.known}</strong>known</div>
        <div><strong>${st.shaky+st.unknown}</strong>shaky</div>
        <div><strong>${st.new}</strong>new</div>
      </div>
      <div class="dt-bar big"><div class="dt-fill" style="width:${st.pct}%;background:${m.color}"></div></div>
      <div class="m-section">
        <h3>Pick a block</h3>
        <div class="block-row">
          ${Object.keys(BLOCKS).map(bt => `<button class="block-btn ${bt===next?'recommended':''}" data-bt="${bt}">
            <span class="bb-emoji">${BLOCKS[bt].emoji}</span>
            <span class="bb-name">${BLOCKS[bt].label}</span>
            <span class="bb-min">${Math.round(BLOCKS[bt].seconds/60)}m</span>
            ${bt===next?'<span class="bb-rec">RECOMMENDED</span>':''}
          </button>`).join('')}
        </div>
      </div>
      ${breakMs>0?`<div class="break-banner small">Break still active: ${formatTime(Math.ceil(breakMs/1000))} remaining. (Toggleable in settings.)</div>`:''}
      <div class="m-section">
        <h3>Browse this deck</h3>
        <button class="big-btn alt" id="browseThis">Show all ${st.total} cards →</button>
      </div>
    </div>
  `;
  document.getElementById('backToHome').onclick = renderHome;
  document.getElementById('browseThis').onclick = () => showBrowser(deckId);
  appRoot.querySelectorAll('.block-btn').forEach(btn => {
    btn.onclick = () => offerStartBlock(btn.dataset.bt, deckId, false);
  });
}

function showCustomBlock(){
  const chapters = [1,2,3,4,5,6];
  appRoot.innerHTML = `
    <div class="m-custom">
      <button class="m-back" id="backToHome">← Mastery home</button>
      <div class="m-header"><div class="m-title">Custom block</div></div>
      <div class="m-section">
        <h3>Deck</h3>
        <div class="chip-row" id="cust-decks">
          ${decks.metaList.map(m => `<button class="chip" data-deck="${esc(m.id)}">${m.emoji} ${esc(m.title)}</button>`).join('')}
        </div>
      </div>
      <div class="m-section">
        <h3>Chapters</h3>
        <div class="chip-row" id="cust-chs">
          ${chapters.map(ch => `<button class="chip on" data-ch="${ch}">Ch ${ch}</button>`).join('')}
        </div>
      </div>
      <div class="m-section">
        <h3>Block type</h3>
        <div class="chip-row" id="cust-bt">
          ${Object.keys(BLOCKS).map(bt => `<button class="chip" data-bt="${bt}">${BLOCKS[bt].emoji} ${BLOCKS[bt].label}</button>`).join('')}
        </div>
      </div>
      <button class="big-btn" id="custStart" disabled>Start →</button>
    </div>
  `;
  document.getElementById('backToHome').onclick = renderHome;
  let pickDeck = null, pickBt = null;
  const pickChs = new Set(chapters);
  function refresh(){
    document.getElementById('custStart').disabled = !(pickDeck && pickBt && pickChs.size > 0);
  }
  appRoot.querySelectorAll('#cust-decks .chip').forEach(c => c.onclick = () => {
    appRoot.querySelectorAll('#cust-decks .chip').forEach(x=>x.classList.remove('on'));
    c.classList.add('on'); pickDeck = c.dataset.deck; refresh();
  });
  appRoot.querySelectorAll('#cust-chs .chip').forEach(c => c.onclick = () => {
    const n = +c.dataset.ch;
    if(pickChs.has(n)){ pickChs.delete(n); c.classList.remove('on'); }
    else { pickChs.add(n); c.classList.add('on'); }
    refresh();
  });
  appRoot.querySelectorAll('#cust-bt .chip').forEach(c => c.onclick = () => {
    appRoot.querySelectorAll('#cust-bt .chip').forEach(x=>x.classList.remove('on'));
    c.classList.add('on'); pickBt = c.dataset.bt; refresh();
  });
  document.getElementById('custStart').onclick = () => {
    startBlock(pickBt, pickDeck, { chapters: Array.from(pickChs), custom:true });
  };
  refresh();
}

// =========================================================
// Pre-flight: confirm or warn before starting a block
// =========================================================
function offerStartBlock(bt, deckId, isCrossDeck){
  const reroute = diversityRouteCheck(bt);
  const fatigue = fatigueCheck();
  const breakMs = breakRemainingMs();
  if(breakMs > 0){
    if(!confirm('You\'re inside the 10-minute break window ('+formatTime(Math.ceil(breakMs/1000))+' left). Recommend waiting. Start anyway?')){
      return;
    }
  }
  if(fatigue && fatigue.stop){
    if(!confirm(fatigue.reason+'\n\nStart this block anyway?')) return;
  }
  if(reroute){
    if(confirm(reroute.reason+'\n\nSwitch to '+BLOCKS[reroute.reroute].label+'?')){
      bt = reroute.reroute;
    }
  }
  if(bt === 'consolidation' && dayIndex() === 0){
    // 3-hr gap suggestion
    const last = state.blockLog.filter(b => b.blockType==='encoding').slice(-1)[0];
    if(last){
      const gap = Date.now() - last.ts;
      if(gap < 3*3600000){
        if(!confirm('Consolidation works best with a 3+ hour gap from your last Encoding block (currently '+Math.round(gap/60000)+' min). Start anyway?')) return;
      }
    }
  }
  startBlock(bt, deckId, { crossDeck: !!isCrossDeck });
}

// =========================================================
// BLOCK ENGINE
// =========================================================
function startBlock(blockType, deckId, opts){
  opts = opts || {};
  if(!state.firstStudyDate) state.firstStudyDate = new Date().toISOString();

  // Card pool
  let pool;
  if(opts.crossDeck){
    pool = selectCrossDeck(60); // bigger pool to allow cycling
  } else if(blockType === 'lapse'){
    pool = selectLapsed();
    if(deckId) pool = pool.filter(c => c.deckId === deckId);
  } else if(blockType === 'warmup'){
    pool = selectAllReviewed();
  } else if(deckId){
    pool = decks.byId[deckId].cards;
  } else {
    pool = allCards;
  }
  if(opts.chapters){
    pool = pool.filter(c => opts.chapters.includes(c.ch));
  }
  // Interleave from Day 1+ if multiple decks active and not custom-deck-locked
  if(state.settings.interleave && dayIndex() >= 1 && !opts.crossDeck && !deckId){
    pool = shuffle([...pool]);
  }
  if(pool.length === 0){
    alert('No cards qualify for this block (try a different deck or block type).');
    return;
  }

  currentBlock = {
    blockType,
    deckId: opts.crossDeck ? null : deckId,
    pool,
    cards: [], // current cycle
    cycleIdx: 0,
    knownCount: 0,
    cardsSeen: 0,
    seenIds: new Set(),
    startTs: Date.now(),
    endTs: Date.now() + BLOCKS[blockType].seconds*1000,
    paused: false,
    crossDeck: !!opts.crossDeck,
    chapters: opts.chapters || null,
  };
  if(blockTimerHandle) clearInterval(blockTimerHandle);
  blockTimerHandle = setInterval(() => {
    if(!currentBlock || currentBlock.paused) return;
    const left = currentBlock.endTs - Date.now();
    const t = document.getElementById('blockTimer');
    if(t) t.textContent = formatTime(Math.max(0, Math.floor(left/1000)));
    if(left <= 0){ endBlock(); }
  }, 1000);
  routeBlockStart();
}

function routeBlockStart(){
  const bt = currentBlock.blockType;
  if(['encoding','reactivation','drill'].includes(bt)){
    runPipelineCycle();
  } else if(bt === 'consolidation' || bt === 'lapse'){
    runFlashcardsRound(filterByStatus(currentBlock.pool, ['shaky','unknown','new']), 9999);
  } else if(bt === 'application'){
    runApplicationRound();
  } else if(bt === 'cloze'){
    runClozeBlock();
  } else if(bt === 'warmup'){
    runMatchRound(currentBlock.pool.slice(0,30), 75, () => {
      runSpeedRecall(currentBlock.pool.slice(0,40), 5*60);
    });
  }
}

// =========================================================
// CLOZE BLOCK — calls the cloze runner from mastery-cloze.js
// =========================================================
function runClozeBlock(){
  if(!window.MASTERY_CLOZE){
    console.warn('[mastery] cloze module not loaded');
    endBlock();
    return;
  }
  // Pool selection: prefer cloze-deck cards, but if user picked a non-cloze
  // deck for a Cloze block, fall back to any card in the pool that has
  // deckType==='cloze'.
  let pool = currentBlock.pool || [];
  pool = pool.filter(c => c && (c.deckType === 'cloze' || c.deckId === 'cloze'));
  if(!pool.length){
    // fallback: pull from the global cloze deck if available
    const clozeDeck = decks && decks.byId && decks.byId['cloze'];
    if(clozeDeck && clozeDeck.cards.length){
      pool = clozeDeck.cards;
      // honor chapter filter from custom block
      if(currentBlock.chapters){
        pool = pool.filter(c => currentBlock.chapters.includes(c.ch));
      }
    }
  }
  if(!pool.length){
    alert('No cloze cards available for this selection.');
    endBlock();
    return;
  }
  // 30-card sequence with weakness-weighted ordering
  const ordered = selectForCycle(pool, 30, {});
  const finalPool = ordered.length ? ordered : pool.slice(0,30);
  window.MASTERY_CLOZE.runClozeRound({
    pool: finalPool,
    max: 30,
    header: ({ idx, total }) => blockHeader('Cloze — fill the blanks', `${idx+1} / ${total} · Type each blank · 2 right in a row → graduate · +5 re-queue on miss`),
    onDone: () => {
      saveState();
      endBlock();
    },
  });
}

function filterByStatus(pool, statuses){
  return pool.filter(c => statuses.includes(getCardState(c.id).status || 'new'));
}

// =========================================================
// ROUND 1 — MATCH (90s)
// =========================================================
function runMatchRound(cardSet, seconds, onDone){
  if(!cardSet || !cardSet.length){ onDone && onDone(); return; }
  // Limit to 30 cards, batch into groups of 10 on small screens
  const set = cardSet.slice(0, 30);
  const isMobile = window.innerWidth < 700;
  const batchSize = isMobile ? 10 : 30;
  let batchStart = 0;

  function startBatch(){
    const batch = set.slice(batchStart, batchStart + batchSize);
    if(!batch.length){ onDone && onDone(); return; }
    const tiles = [];
    batch.forEach(c => {
      tiles.push({ key:'F-'+c.id, cardId:c.id, side:'F', text:c.front });
      tiles.push({ key:'B-'+c.id, cardId:c.id, side:'B', text:c.back });
    });
    shuffle(tiles);
    const startTs = Date.now();
    const matched = new Set();
    const cardTimers = {}; // cardId → { firstTouch, misses }
    let firstSelected = null;
    appRoot.innerHTML = `
      <div class="m-block">
        ${blockHeader('Round 1 — Match', `${seconds}s · ${batch.length} pairs · Tap matching front ↔ back`)}
        <div class="match-grid ${batch.length<=10?'small':''}" id="matchGrid">
          ${tiles.map((t,i) => `<button class="match-tile" data-i="${i}" data-key="${esc(t.key)}" data-cid="${esc(t.cardId)}">${escMulti(truncate(t.text,90))}</button>`).join('')}
        </div>
        <div class="match-foot">
          <span id="matchTimer">${seconds}s</span>
          <span>Matched <strong id="matchCount">0</strong> / ${batch.length}</span>
          <button class="lnk" id="skipMatch">Skip round →</button>
        </div>
      </div>
    `;
    let timeLeft = seconds;
    const ti = setInterval(() => {
      timeLeft--;
      const t = document.getElementById('matchTimer');
      if(t) t.textContent = timeLeft+'s';
      if(timeLeft <= 0){ finish(); }
    }, 1000);
    function finish(){
      clearInterval(ti);
      // Anything not matched is unknown
      batch.forEach(c => {
        if(!matched.has(c.id)){
          const t = cardTimers[c.id] ? Date.now()-cardTimers[c.id].firstTouch : 99999;
          applyClassification(c, 'unknown', currentBlock.blockType);
          if(!currentBlock.seenIds.has(c.id)){ currentBlock.seenIds.add(c.id); currentBlock.cardsSeen++; }
        }
      });
      batchStart += batchSize;
      if(batchStart < set.length) startBatch();
      else { saveState(); onDone && onDone(); }
    }
    document.getElementById('skipMatch').onclick = finish;
    appRoot.querySelectorAll('.match-tile').forEach(btn => {
      btn.onclick = () => {
        if(matched.has(btn.dataset.cid)) return;
        if(!cardTimers[btn.dataset.cid]) cardTimers[btn.dataset.cid] = { firstTouch: Date.now(), misses: 0 };
        if(!firstSelected){
          firstSelected = btn;
          btn.classList.add('sel');
        } else if(firstSelected === btn){
          firstSelected.classList.remove('sel');
          firstSelected = null;
        } else {
          if(firstSelected.dataset.cid === btn.dataset.cid && firstSelected.dataset.key !== btn.dataset.key){
            // Match!
            const cid = btn.dataset.cid;
            matched.add(cid);
            firstSelected.classList.add('hit');
            btn.classList.add('hit');
            const card = batch.find(c => c.id===cid);
            const tm = cardTimers[cid];
            const dur = Date.now() - tm.firstTouch;
            const klass = classifyMatch(dur, tm.misses);
            applyClassification(card, klass, currentBlock.blockType);
            if(!currentBlock.seenIds.has(cid)){ currentBlock.seenIds.add(cid); currentBlock.cardsSeen++; }
            if(klass === 'known') currentBlock.knownCount++;
            const mc = document.getElementById('matchCount');
            if(mc) mc.textContent = matched.size;
            firstSelected = null;
            if(matched.size === batch.length){ finish(); }
          } else {
            cardTimers[firstSelected.dataset.cid].misses++;
            cardTimers[btn.dataset.cid] = cardTimers[btn.dataset.cid] || { firstTouch: Date.now(), misses: 0 };
            cardTimers[btn.dataset.cid].misses++;
            firstSelected.classList.remove('sel');
            btn.classList.add('miss');
            setTimeout(()=>btn.classList.remove('miss'), 350);
            firstSelected = null;
          }
        }
      };
    });
  }
  startBatch();
}

// =========================================================
// ROUND 2 — FLASHCARDS (type the answer)
// =========================================================
function runFlashcardsRound(cardSet, maxCards, onDone){
  let queue = cardSet.slice(0, maxCards);
  if(!queue.length){ onDone && onDone(); return; }
  // Weight unknown 2x: duplicate unknown cards in queue (limit duplicates)
  const dup = [];
  queue.forEach(c => { if(getCardState(c.id).status === 'unknown') dup.push(c); });
  queue = shuffle([...queue, ...dup.slice(0,Math.min(dup.length, queue.length))]);
  const consec = {};
  let idx = 0;
  function done(){ saveState(); onDone && onDone(); }
  function step(){
    if(currentBlock && Date.now() >= currentBlock.endTs){ endBlock(); return; }
    if(idx >= queue.length){ done(); return; }
    const card = queue[idx];
    if((consec[card.id]||0) >= 2){ idx++; return step(); }
    // If this is a cloze card, render via the cloze viewer.
    if(card.deckType === 'cloze' && window.MASTERY_CLOZE){
      appRoot.innerHTML = `
        <div class="m-block">
          ${blockHeader('Type the answer', `${idx+1} / ${queue.length} · 2 right in a row → graduate`)}
          <div class="cloze-host"></div>
        </div>
      `;
      const host = appRoot.querySelector('.cloze-host');
      window.MASTERY_CLOZE.renderClozeCard({
        container: host,
        card,
        autoFocus: true,
        submitLabel: 'Check (Enter)',
        showSkip: true,
        showEnd: true,
        onEnd: () => endBlock(),
        onResult: ({ ok, skipped, shown }) => {
          if(skipped){ idx++; step(); return; }
          const st = getCardState(card.id);
          st.lastSeen = Date.now();
          const isFirstSeen = !currentBlock.seenIds.has(card.id);
          if(isFirstSeen){ currentBlock.seenIds.add(card.id); currentBlock.cardsSeen++; }
          if(ok){
            consec[card.id] = (consec[card.id]||0)+1;
            st.consecutiveKnown++;
            if(consec[card.id] >= 2 && st.status !== 'mastered'){
              st.status = 'mastered';
              st.fsrs.due = Date.now() + 3*86400000;
            } else if(st.status === 'unknown'){
              st.status = 'shaky';
            } else if(st.status === 'shaky'){
              st.status = 'known';
            }
            // Gate knownCount with first-seen so block accuracy never exceeds 100%
            if(isFirstSeen) currentBlock.knownCount++;
            setTimeout(()=>{ idx++; step(); }, 350);
          } else {
            consec[card.id] = 0;
            st.consecutiveKnown = 0;
            st.lapseCount = (st.lapseCount||0)+1;
            st.status = 'unknown';
            if(!shown) speakIf(card.answers && card.answers[0]);
            queue.splice(Math.min(idx+5, queue.length), 0, card);
            const fb = host.querySelector('.cloze-feedback');
            if(fb){
              const next = el('<button class="big-btn">Continue (Enter) →</button>');
              next.onclick = () => { idx++; step(); };
              fb.appendChild(document.createElement('br'));
              fb.appendChild(next);
              const onKey = e => {
                if(e.key === 'Enter'){
                  e.preventDefault();
                  document.removeEventListener('keydown', onKey);
                  next.click();
                }
              };
              document.addEventListener('keydown', onKey, { once:true });
              next.focus();
            }
          }
        },
      });
      return;
    }
    appRoot.innerHTML = `
      <div class="m-block">
        ${blockHeader('Type the answer', `${idx+1} / ${queue.length} · 2 right in a row → graduate`)}
        <div class="card-prompt">${escMulti(card.front)}</div>
        <input class="card-input" id="ansInput" autocomplete="off" autocapitalize="off" autocorrect="off" placeholder="Type the answer">
        <div class="card-actions">
          <button class="big-btn" id="submitAns">Check (Enter)</button>
          <button class="lnk" id="showAns">Show answer</button>
          <button class="lnk" id="skipCard">Skip card →</button>
          <button class="lnk" id="endBlockBtn">End block</button>
        </div>
        <div class="card-feedback" id="cardFb"></div>
      </div>
    `;
    const inp = document.getElementById('ansInput');
    inp.focus();
    // wanakana IME for Japanese answers
    if(card.answerLang === 'ja' && window.wanakana && typeof window.wanakana.bind === 'function'){
      try { window.wanakana.bind(inp, { IMEMode:'toHiragana' }); } catch(e){}
    }
    function submit(){
      const v = inp.value.trim();
      if(!v) return;
      const r = gradeAnswer(card, v);
      const fb = document.getElementById('cardFb');
      if(r.ok){
        consec[card.id] = (consec[card.id]||0) + 1;
        const st = getCardState(card.id);
        st.lastSeen = Date.now();
        st.consecutiveKnown++;
        if(consec[card.id] >= 2 && st.status !== 'mastered'){
          if(st.consecutiveKnown >= 2) st.status='mastered';
          else st.status='known';
          st.fsrs.due = Date.now() + 3*86400000;
        } else if(st.status === 'unknown'){
          st.status = 'shaky';
        }
        if(!currentBlock.seenIds.has(card.id)){ currentBlock.seenIds.add(card.id); currentBlock.cardsSeen++; currentBlock.knownCount++; }
        fb.innerHTML = '<div class="ok">✓ Correct'+(r.partial?' (partial — see canonical)':'')+'</div><div class="canonical">'+escMulti(card.back)+'</div>';
        setTimeout(()=>{ idx++; step(); }, 350);
      } else {
        consec[card.id] = 0;
        const st = getCardState(card.id);
        st.lastSeen = Date.now();
        st.consecutiveKnown = 0;
        st.lapseCount = (st.lapseCount||0)+1;
        st.status = 'unknown';
        // Re-queue at +5
        queue.splice(Math.min(idx+5, queue.length), 0, card);
        speakIf(card.answerCanonical);
        fb.innerHTML = '<div class="bad">✗ Try again — answer:</div><div class="canonical">'+escMulti(card.back)+'</div>';
        if(!currentBlock.seenIds.has(card.id)){ currentBlock.seenIds.add(card.id); currentBlock.cardsSeen++; }
        // Show "Continue" button to advance
        const next = el('<button class="big-btn">Continue (Enter) →</button>');
        next.onclick = () => { idx++; step(); };
        fb.appendChild(next);
        next.focus();
      }
    }
    document.getElementById('submitAns').onclick = submit;
    document.getElementById('showAns').onclick = () => {
      consec[card.id] = 0;
      const st = getCardState(card.id);
      st.lastSeen = Date.now(); st.lapseCount = (st.lapseCount||0)+1; st.status='unknown';
      if(!currentBlock.seenIds.has(card.id)){ currentBlock.seenIds.add(card.id); currentBlock.cardsSeen++; }
      const fb = document.getElementById('cardFb');
      fb.innerHTML = '<div class="canonical">'+escMulti(card.back)+'</div>';
      const next = el('<button class="big-btn">Next →</button>');
      next.onclick = () => { idx++; step(); };
      fb.appendChild(next);
    };
    document.getElementById('skipCard').onclick = () => { idx++; step(); };
    document.getElementById('endBlockBtn').onclick = () => endBlock();
    inp.onkeydown = e => { if(e.key === 'Enter'){ e.preventDefault(); submit(); } };
  }
  step();
}

// =========================================================
// ROUND 3 — MINI-MATCH (45s)
// =========================================================
function runMiniMatch(cardSet, onDone){
  // Add 2 distractor pairs (random other cards)
  const distractors = shuffle([...allCards].filter(c => !cardSet.find(s => s.id===c.id))).slice(0,2);
  const set = [...cardSet.slice(0,8), ...distractors];
  runMatchRound(set, 45, onDone);
}

// =========================================================
// PIPELINE CYCLE: Match → Flashcards → Mini-Match
// =========================================================
function runPipelineCycle(){
  if(Date.now() >= currentBlock.endTs){ endBlock(); return; }
  const exclude = currentBlock.seenIds;
  const cardSet = selectForCycle(currentBlock.pool, 30, { exclude });
  if(!cardSet.length){
    // Recycle: if pool exhausted, reuse pool
    if(currentBlock.pool.length){
      const reuse = shuffle([...currentBlock.pool]).slice(0,30);
      cardSet.push(...reuse);
    } else { endBlock(); return; }
  }
  currentBlock.cards = cardSet;
  currentBlock.cycleIdx++;
  // Round 1: Match
  runMatchRound(cardSet, 90, () => {
    // Round 2: Flashcards on shaky/unknown only
    const r2 = cardSet.filter(c => ['shaky','unknown'].includes(getCardState(c.id).status));
    if(!r2.length){
      // Round 3 still
      runMiniMatch(cardSet.slice(0,8), () => runPipelineCycle());
      return;
    }
    runFlashcardsRound(r2, 9999, () => {
      // Round 3: Mini-Match on r2 cards + 2 distractors
      runMiniMatch(r2.slice(0,8), () => runPipelineCycle());
    });
  });
}

// =========================================================
// APPLICATION ROUND — production prompts, free text, fuzzy grade
// On-the-fly cloze: vocab / mechanism / compare-contrast cards are
// re-cast as cloze prompts when MASTERY_CLOZE.buildOTFCloze returns one.
// =========================================================
function runApplicationRound(){
  const pool = currentBlock.pool;
  let prompts = shuffle([...pool]).slice(0, 20);
  let idx = 0;
  function done(){ saveState(); endBlock(); }
  function step(){
    if(Date.now() >= currentBlock.endTs){ endBlock(); return; }
    if(idx >= prompts.length){ done(); return; }
    const card = prompts[idx];

    // Try on-the-fly cloze for select deck types
    let renderAsCloze = card.deckType === 'cloze';
    let displayCard = card;
    if(!renderAsCloze && window.MASTERY_CLOZE && typeof window.MASTERY_CLOZE.buildOTFCloze === 'function'){
      const otf = window.MASTERY_CLOZE.buildOTFCloze(card);
      if(otf){ renderAsCloze = true; displayCard = otf; }
    }
    if(renderAsCloze){
      appRoot.innerHTML = `
        <div class="m-block">
          ${blockHeader('Application — fill the blanks', `${idx+1} / ${prompts.length} · ${BLOCKS.application.label}`)}
          <div class="cloze-host"></div>
        </div>
      `;
      const host = appRoot.querySelector('.cloze-host');
      window.MASTERY_CLOZE.renderClozeCard({
        container: host,
        card: displayCard,
        autoFocus: true,
        submitLabel: 'Check (Enter)',
        showSkip: true,
        showEnd: true,
        onEnd: () => endBlock(),
        onResult: ({ ok, skipped, shown }) => {
          if(skipped){ idx++; step(); return; }
          const st = getCardState(card.id);
          st.lastSeen = Date.now();
          const isFirstSeen = !currentBlock.seenIds.has(card.id);
          if(isFirstSeen){ currentBlock.seenIds.add(card.id); currentBlock.cardsSeen++; }
          if(ok){
            st.consecutiveKnown = (st.consecutiveKnown||0) + 1;
            if(st.consecutiveKnown >= 2) st.status = 'mastered';
            else if(st.status === 'unknown' || st.status === 'new') st.status = 'shaky';
            else if(st.status === 'shaky') st.status = 'known';
            if(isFirstSeen) currentBlock.knownCount++;
          } else {
            st.consecutiveKnown = 0;
            st.lapseCount = (st.lapseCount||0)+1;
            st.status = 'unknown';
            if(!shown) speakIf(displayCard.answers && displayCard.answers[0]);
          }
          // Show "Next" button after grading
          const fb = host.querySelector('.cloze-feedback');
          if(fb){
            const next = el('<button class="big-btn" autofocus>Next →</button>');
            next.onclick = () => { idx++; step(); };
            fb.appendChild(document.createElement('br'));
            fb.appendChild(next);
            next.focus();
          }
        },
      });
      return;
    }
    appRoot.innerHTML = `
      <div class="m-block">
        ${blockHeader('Application — produce the answer', `${idx+1} / ${prompts.length} · ${BLOCKS.application.label}`)}
        <div class="card-prompt big">${escMulti(card.front)}</div>
        <textarea class="card-input area" id="appIn" rows="2" autocomplete="off" autocapitalize="off" autocorrect="off" placeholder="Type your answer (romaji auto-converts to kana)"></textarea>
        <div class="card-actions">
          <button class="big-btn" id="appSub">Check</button>
          <button class="lnk" id="appShow">Show answer</button>
          <button class="lnk" id="appSkip">Skip →</button>
          <button class="lnk" id="appEnd">End block</button>
        </div>
        <div class="card-feedback" id="appFb"></div>
      </div>
    `;
    const inp = document.getElementById('appIn');
    inp.focus();
    if(card.answerLang === 'ja' && window.wanakana && typeof window.wanakana.bind === 'function'){
      try { window.wanakana.bind(inp, { IMEMode:'toHiragana' }); } catch(e){}
    }
    function submit(){
      const v = inp.value.trim();
      if(!v) return;
      const r = gradeAnswer(card, v);
      const fb = document.getElementById('appFb');
      const st = getCardState(card.id);
      st.lastSeen = Date.now();
      const isFirstSeen = !currentBlock.seenIds.has(card.id);
      if(isFirstSeen){ currentBlock.seenIds.add(card.id); currentBlock.cardsSeen++; }
      if(r.ok){
        st.consecutiveKnown = (st.consecutiveKnown||0) + 1;
        if(st.consecutiveKnown >= 2) st.status = 'mastered';
        else if(st.status === 'unknown' || st.status === 'new') st.status = 'shaky';
        else if(st.status === 'shaky') st.status = 'known';
        if(isFirstSeen) currentBlock.knownCount++;
        fb.innerHTML = '<div class="ok">✓ Accepted'+(r.partial?' (partial)':'')+'</div><div class="canonical">'+escMulti(card.back)+'</div>';
      } else {
        st.consecutiveKnown = 0;
        st.lapseCount = (st.lapseCount||0)+1;
        st.status = 'unknown';
        speakIf(card.answerCanonical);
        const reasonLabel = ({
          'missing-tokens':'Missing required word(s)',
          'missing-particle':'Missing required particle',
          'forbidden-particle':'Used a forbidden particle',
          'wrong':'Did not match',
          'empty':'Empty answer'
        })[r.reason] || 'Did not match';
        fb.innerHTML = '<div class="bad">✗ '+esc(reasonLabel)+'</div><div class="canonical">'+escMulti(card.back)+'</div>';
      }
      const next = el('<button class="big-btn" autofocus>Next →</button>');
      next.onclick = () => { idx++; step(); };
      fb.appendChild(next);
      next.focus();
    }
    document.getElementById('appSub').onclick = submit;
    document.getElementById('appShow').onclick = () => {
      const fb = document.getElementById('appFb');
      const st = getCardState(card.id);
      st.lapseCount = (st.lapseCount||0)+1;
      st.status='unknown';
      if(!currentBlock.seenIds.has(card.id)){ currentBlock.seenIds.add(card.id); currentBlock.cardsSeen++; }
      fb.innerHTML = '<div class="canonical">'+escMulti(card.back)+'</div>';
      const next = el('<button class="big-btn">Next →</button>');
      next.onclick = () => { idx++; step(); };
      fb.appendChild(next);
    };
    document.getElementById('appSkip').onclick = () => { idx++; step(); };
    document.getElementById('appEnd').onclick = () => endBlock();
    inp.onkeydown = e => {
      if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); submit(); }
    };
  }
  step();
}

// =========================================================
// SPEED RECALL — used in Drill blocks and warmup tail
// =========================================================
function runSpeedRecall(cardSet, totalSeconds){
  let queue = shuffle([...cardSet]);
  let idx = 0;
  const lapsedQueue = [];
  const start = Date.now();
  function step(){
    if(currentBlock && Date.now() >= currentBlock.endTs){ endBlock(); return; }
    if(Date.now() - start > totalSeconds*1000){ endBlock(); return; }
    if(idx >= queue.length){
      // Cycle lapsed back in
      if(lapsedQueue.length){ queue = queue.concat(lapsedQueue.splice(0,lapsedQueue.length)); }
      else { idx = 0; queue = shuffle([...queue]); }
    }
    const card = queue[idx];
    // Cloze cards in Speed Recall: render via cloze viewer (no flash bar)
    if(card.deckType === 'cloze' && window.MASTERY_CLOZE){
      appRoot.innerHTML = `
        <div class="m-block">
          ${blockHeader('Drill — Cloze', `Fill the blanks fast · auto-advance`)}
          <div class="cloze-host"></div>
        </div>
      `;
      const host = appRoot.querySelector('.cloze-host');
      window.MASTERY_CLOZE.renderClozeCard({
        container: host,
        card,
        autoFocus: true,
        submitLabel: 'Check (Enter)',
        showSkip: true,
        showEnd: true,
        onEnd: () => endBlock(),
        onResult: ({ ok, shown }) => {
          const st = getCardState(card.id);
          st.lastSeen = Date.now();
          const isFirstSeen = !currentBlock.seenIds.has(card.id);
          if(isFirstSeen){ currentBlock.seenIds.add(card.id); currentBlock.cardsSeen++; }
          if(ok){
            st.consecutiveKnown = (st.consecutiveKnown||0)+1;
            if(st.consecutiveKnown >= 2) st.status='mastered';
            else if(st.status==='unknown' || st.status==='new') st.status='shaky';
            else st.status='known';
            if(isFirstSeen) currentBlock.knownCount++;
            idx++;
            setTimeout(step, 400);
          } else {
            st.consecutiveKnown = 0;
            st.lapseCount=(st.lapseCount||0)+1;
            st.status='unknown';
            lapsedQueue.push(card);
            const fb = host.querySelector('.cloze-feedback');
            if(fb){
              const next = el('<button class="big-btn">Continue →</button>');
              next.onclick = () => { idx++; step(); };
              fb.appendChild(document.createElement('br'));
              fb.appendChild(next);
              next.focus();
            } else {
              idx++;
              setTimeout(step, 1200);
            }
          }
        },
      });
      return;
    }
    appRoot.innerHTML = `
      <div class="m-block">
        ${blockHeader('Drill — Speed Recall', `Card flashes · type the answer · auto-advance`)}
        <div class="card-prompt big" id="srPrompt">${escMulti(card.front)}</div>
        <div class="sr-bar"><div class="sr-fill" id="srFill"></div></div>
        <input class="card-input" id="srIn" autocomplete="off" autocapitalize="off" autocorrect="off">
        <div class="card-actions">
          <button class="lnk" id="srShow">Show answer</button>
          <button class="lnk" id="srEnd">End block</button>
        </div>
        <div class="card-feedback" id="srFb"></div>
      </div>
    `;
    const inp = document.getElementById('srIn');
    inp.focus();
    if(card.answerLang === 'ja' && window.wanakana && typeof window.wanakana.bind === 'function'){
      try { window.wanakana.bind(inp, { IMEMode:'toHiragana' }); } catch(e){}
    }
    let timer = null;
    let frame = 0;
    function tickBar(){
      frame++;
      const f = document.getElementById('srFill');
      if(f){ f.style.width = Math.min(100, frame*100/30)+'%'; }
      if(frame >= 30){ // 3 seconds at 100ms tick
        const f2 = document.getElementById('srPrompt');
        if(f2) f2.classList.add('faded');
      }
    }
    timer = setInterval(tickBar, 100);
    function submit(force){
      clearInterval(timer);
      const v = inp.value.trim();
      const r = v ? gradeAnswer(card, v) : { ok:false, reason:'empty' };
      const fb = document.getElementById('srFb');
      const st = getCardState(card.id);
      st.lastSeen = Date.now();
      const isFirstSeen = !currentBlock.seenIds.has(card.id);
      if(isFirstSeen){ currentBlock.seenIds.add(card.id); currentBlock.cardsSeen++; }
      if(r.ok){
        st.consecutiveKnown = (st.consecutiveKnown||0)+1;
        if(st.consecutiveKnown >= 2) st.status='mastered';
        else if(st.status==='unknown' || st.status==='new') st.status='shaky';
        else st.status='known';
        if(isFirstSeen) currentBlock.knownCount++;
        if(fb) fb.innerHTML = '<div class="ok">✓</div>';
        idx++;
        setTimeout(step, 250);
      } else {
        st.consecutiveKnown = 0;
        st.lapseCount=(st.lapseCount||0)+1;
        st.status='unknown';
        if(fb) fb.innerHTML = '<div class="bad">✗ '+esc(card.answerCanonical||'')+'</div>';
        // Re-queue 30s later
        lapsedQueue.push(card);
        idx++;
        setTimeout(step, 1200);
      }
    }
    document.getElementById('srShow').onclick = () => submit(true);
    document.getElementById('srEnd').onclick = () => endBlock();
    inp.onkeydown = e => { if(e.key === 'Enter'){ e.preventDefault(); submit(); } };
  }
  step();
}

// =========================================================
// SHARED block UI
// =========================================================
function blockHeader(title, sub){
  const bt = currentBlock ? currentBlock.blockType : '';
  const meta = bt ? BLOCKS[bt] : null;
  return `<div class="m-block-head">
    <button class="m-back" id="endBlockTopBtn" title="End block">← End block</button>
    <div class="bh-title">${meta?meta.emoji+' ':''}${esc(title)}</div>
    <span class="m-timer" id="blockTimer">${meta?formatTime(Math.max(0,Math.floor((currentBlock.endTs-Date.now())/1000))):''}</span>
  </div>
  ${sub?`<div class="bh-sub">${esc(sub)}</div>`:''}`;
}
document.addEventListener('click', e => {
  if(e.target && e.target.id === 'endBlockTopBtn') endBlock();
});

function formatTime(sec){
  sec = Math.max(0, Math.floor(sec));
  const m = Math.floor(sec/60), s = sec%60;
  return m+':'+String(s).padStart(2,'0');
}

function truncate(s, n){
  s = String(s||''); return s.length>n ? s.slice(0,n-1)+'…' : s;
}

function speakIf(txt){
  if(!state.settings.audio || !txt) return;
  if(typeof speechSynthesis === 'undefined') return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(txt);
    u.lang = 'ja-JP';
    u.rate = 0.95;
    speechSynthesis.speak(u);
  } catch(e){}
}

// =========================================================
// END OF BLOCK — log + report + break
// =========================================================
function endBlock(){
  if(!currentBlock) return renderHome();
  if(blockTimerHandle){ clearInterval(blockTimerHandle); blockTimerHandle = null; }
  state.blockLog.push({
    ts: Date.now(),
    dayIndex: dayIndex(),
    blockType: currentBlock.blockType,
    deckId: currentBlock.deckId,
    cardsSeen: currentBlock.cardsSeen,
    knownCount: currentBlock.knownCount,
    durationSec: Math.round((Date.now()-currentBlock.startTs)/1000),
  });
  state.lastBlockEndTs = Date.now();
  saveState();
  showBlockReport(currentBlock);
}

function showBlockReport(block){
  const minutes = Math.round((Date.now()-block.startTs)/60000);
  const accuracy = block.cardsSeen ? Math.round(block.knownCount*100/block.cardsSeen) : 0;
  const next = nextSuggestedBlock();
  appRoot.innerHTML = `
    <div class="m-report">
      <div class="m-header">
        <div class="m-title">Block complete</div>
        <div class="m-subtitle">${BLOCKS[block.blockType].emoji} ${BLOCKS[block.blockType].label}${block.deckId?' · '+esc(decks.byId[block.deckId].meta.title):''}</div>
      </div>
      <div class="report-grid">
        <div class="rt"><div class="lab">Cards</div><div class="val">${block.cardsSeen}</div></div>
        <div class="rt"><div class="lab">Accuracy</div><div class="val">${accuracy}%</div></div>
        <div class="rt"><div class="lab">Time</div><div class="val">${minutes}m</div></div>
        <div class="rt"><div class="lab">Day</div><div class="val">${block.dayIndex||0}</div></div>
      </div>
      <div class="m-section">
        <h3>Next recommended</h3>
        <p>${BLOCKS[next].emoji} ${BLOCKS[next].label} · 10-min break first.</p>
      </div>
      <button class="big-btn" id="reportHome">← Mastery home</button>
    </div>
  `;
  document.getElementById('reportHome').onclick = () => {
    currentBlock = null;
    renderHome();
  };
  currentBlock = null;
}

// =========================================================
// DECK BROWSER
// =========================================================
function showBrowser(initialDeckId){
  let pageSize = 50;
  let page = 0;
  let filterDeck = initialDeckId || '';
  let filterCh = '';
  let filterStatus = '';
  let search = '';

  function render(){
    let pool = allCards;
    if(filterDeck) pool = pool.filter(c => c.deckId === filterDeck);
    if(filterCh) pool = pool.filter(c => String(c.ch) === filterCh);
    if(filterStatus) pool = pool.filter(c => (getCardState(c.id).status||'new') === filterStatus);
    if(search){
      const q = normalizeJa(search);
      const qe = normalizeEn(search);
      pool = pool.filter(c => {
        const haystackJa = normalizeJa(c.front) + normalizeJa(c.back)
          + (c.deckType === 'cloze' && c.sentence ? normalizeJa(c.sentence) : '')
          + (Array.isArray(c.answers) ? c.answers.map(normalizeJa).join('') : '')
          + normalizeJa(c.answerCanonical||'');
        const haystackEn = normalizeEn(
          (c.front||'') + ' ' + (c.back||'') + ' ' +
          (c.en||'') + ' ' +
          (Array.isArray(c.hints) ? c.hints.filter(Boolean).join(' ') : '')
        );
        return haystackJa.includes(q) || haystackEn.includes(qe);
      });
    }
    const total = pool.length;
    const pages = Math.max(1, Math.ceil(total/pageSize));
    if(page >= pages) page = pages-1;
    const slice = pool.slice(page*pageSize, (page+1)*pageSize);
    appRoot.innerHTML = `
      <div class="m-browser">
        <button class="m-back" id="backToHome">← Mastery home</button>
        <div class="m-header"><div class="m-title">Browse cards</div><div class="m-subtitle">${total} match · page ${page+1}/${pages}</div></div>
        <div class="filter-row">
          <select id="bDeck"><option value="">All decks</option>${decks.metaList.map(m => `<option value="${esc(m.id)}" ${m.id===filterDeck?'selected':''}>${esc(m.title)}</option>`).join('')}</select>
          <select id="bCh"><option value="">All chapters</option>${[1,2,3,4,5,6].map(n => `<option value="${n}" ${String(n)===filterCh?'selected':''}>Ch ${n}</option>`).join('')}</select>
          <select id="bSt"><option value="">All status</option>${['new','unknown','shaky','known','mastered'].map(s => `<option value="${s}" ${s===filterStatus?'selected':''}>${s}</option>`).join('')}</select>
          <input id="bSearch" placeholder="Search across all scripts" value="${esc(search)}">
        </div>
        <table class="b-table">
          <thead><tr><th>Front</th><th>Back</th><th>Deck</th><th>Ch</th><th>Status</th><th>Lapses</th><th>Last</th></tr></thead>
          <tbody>
            ${slice.map(c => {
              const st = getCardState(c.id);
              const last = st.lastSeen ? new Date(st.lastSeen).toLocaleDateString() : '—';
              return `<tr>
                <td>${escMulti(truncate(c.front,80))}</td>
                <td>${escMulti(truncate(c.back,80))}</td>
                <td>${esc(decks.byId[c.deckId].meta.title)}</td>
                <td>${esc(c.ch||'')}</td>
                <td><span class="st-${esc(st.status||'new')}">${esc(st.status||'new')}</span></td>
                <td>${st.lapseCount||0}</td>
                <td>${last}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
        <div class="paginator">
          <button id="prevPage" ${page===0?'disabled':''}>← Prev</button>
          <span>Page ${page+1} / ${pages}</span>
          <button id="nextPage" ${page>=pages-1?'disabled':''}>Next →</button>
        </div>
      </div>
    `;
    document.getElementById('backToHome').onclick = renderHome;
    document.getElementById('bDeck').onchange = e => { filterDeck = e.target.value; page=0; render(); };
    document.getElementById('bCh').onchange = e => { filterCh = e.target.value; page=0; render(); };
    document.getElementById('bSt').onchange = e => { filterStatus = e.target.value; page=0; render(); };
    document.getElementById('bSearch').oninput = e => { search = e.target.value; page=0; render(); };
    document.getElementById('prevPage').onclick = () => { if(page>0){page--; render();} };
    document.getElementById('nextPage').onclick = () => { if(page<pages-1){page++; render();} };
  }
  render();
}

// =========================================================
// BOOT
// =========================================================
function boot(){
  appRoot = document.getElementById('mastery-root');
  if(!appRoot){ console.warn('[mastery] no root element'); return; }
  loadState();

  function installClozeHooksOnce(){
    if(window.MASTERY_CLOZE && typeof window.MASTERY_CLOZE.installHooks === 'function'){
      window.MASTERY_CLOZE.installHooks({
        getAppRoot: () => appRoot,
        getCardState,
        applyClassification,
        gradeAnswer,
        normalizeJa,
        normalizeEn,
        toHiragana,
        saveState,
        speakIf,
        currentBlock: () => currentBlock,
        shouldEndBlock: () => currentBlock && Date.now() >= currentBlock.endTs,
        endBlockNow: () => endBlock(),
        esc, escMulti,
      });
    }
  }

  function whenDecksReady(){
    decks = window.MASTERY_DECKS;
    if(!decks){
      appRoot.innerHTML = '<div class="m-loading">Loading decks…</div>';
      return;
    }
    allCards = decks.allCards;
    installClozeHooksOnce();
    renderHome();
  }

  function rerenderForCloze(){
    if(!decks) return;
    // Cloze module appended to decks already; refresh references and home
    decks = window.MASTERY_DECKS || decks;
    allCards = decks.allCards;
    installClozeHooksOnce();
    // Re-render the home if currently showing it (or the deck menu)
    const root = appRoot;
    if(root && /m-home|m-deck-menu/.test(root.innerHTML)){
      renderHome();
    }
  }

  window.addEventListener('cloze-deck-ready', rerenderForCloze);

  if(window.MASTERY_DECKS){ whenDecksReady(); }
  else {
    window.addEventListener('mastery-decks-ready', whenDecksReady);
    setTimeout(() => { if(!decks) whenDecksReady(); }, 4000);
  }
}
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

// Expose for debugging + verification
window.__MASTERY__ = {
  get state(){return state;},
  get current(){return currentBlock;},
  // Pure helpers, exposed for tests / verification only:
  gradeAnswer, normalizeJa, normalizeEn, toHiragana, romajiToHiragana,
  classifyMatch, dayIndex, breakRemainingMs, todayPlan, nextSuggestedBlock,
};

})();

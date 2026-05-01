/* ===========================================================
   Nakama 1 — Leitner Flashcards engine
   - In-session compressed Leitner: miss=~4, shaky=~12, got=remove
   - 3-button grade · keys 1/2/3 · Space flip · U undo · J skip · A audio
   - Trap injection on rolling miss rate
   - Triple-miss rescue with sub-card breakdown
   - Pacing breaks at 8 min · streak counter
   - Persistence: session save + tomorrow deck builder
   =========================================================== */
(function(){
'use strict';

const CARDS = window.NAKAMA_CARDS || [];
const TYPE_INFO = window.NAKAMA_TYPE_INFO || {};

// ── Persistence keys
const LS = {
  inProgress: 'nakama_fc_inprogress',     // saved active session state
  tomorrow:   'nakama_fc_tomorrow',       // queued cards for next session
  history:    'nakama_fc_history',        // long-running misses/shakies log
  prefs:      'nakama_fc_prefs',          // user prefs (audio, last filters)
  log:        'nakama_fc_log',            // per-session activity log for the planner
  liveSession:'nakama_fc_live',           // tiny "I'm-actively-studying" heartbeat
};

// ── State
const state = {
  // Setup
  chapters: new Set([1,2,3,4,5,6]),
  types: new Set(Object.keys(TYPE_INFO)),
  durationMin: 20,
  // Runtime
  queue: [],            // upcoming cards (objects)
  parked: [],           // cards parked for tomorrow (got-it from this session)
  current: null,        // current card
  flipped: false,
  startedAt: null,
  endsAt: null,
  paused: false,
  pausedAt: 0,
  pausedTotal: 0,
  // Stats
  seen: 0,
  firstTry: { right:0, total:0 },
  cardStats: new Map(),   // id → {seen, missed, shaky, gotit, missesInRow}
  miss: [],               // [{id, prompt, type}]
  rollingMisses: [],      // last 12 grades for trap rate
  streak: 0,
  bestStreak: 0,
  trapsSinceLast: 0,
  audioOn: true,
  brokeAlready: false,
  // Undo
  lastAction: null,       // {card, prevQueue, prevStats}
  // Active screen
  screen: 'setup',        // setup | session | report
  resumeAvailable: false,
};

// ── Utilities
function clone(o){ return JSON.parse(JSON.stringify(o)); }
function fmtTime(sec){
  sec = Math.max(0, Math.floor(sec));
  const m = Math.floor(sec/60), s = sec%60;
  return m+':'+s.toString().padStart(2,'0');
}
function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]] = [arr[j],arr[i]];
  }
  return arr;
}
function pickN(arr, n, exclude){
  const pool = arr.filter(x => !exclude || !exclude.has(x));
  shuffle(pool);
  return pool.slice(0, n);
}
function getCardStat(id){
  if(!state.cardStats.has(id)){
    state.cardStats.set(id, { seen:0, missed:0, shaky:0, gotit:0, missesInRow:0 });
  }
  return state.cardStats.get(id);
}

// Save/load wrappers (silently no-op on storage errors)
function lsGet(k){ try { const v=localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch(e){ return null; } }
function lsSet(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){ /* noop */ } }
function lsDel(k){ try { localStorage.removeItem(k); } catch(e){} }

// ── Audio (TTS via SpeechSynthesis if available)
let voiceJP = null;
function pickVoice(){
  try {
    const voices = speechSynthesis.getVoices();
    voiceJP = voices.find(v => /ja|Japanese/i.test(v.lang)) || null;
  } catch(e){ voiceJP = null; }
}
if(typeof speechSynthesis !== 'undefined'){
  pickVoice();
  speechSynthesis.onvoiceschanged = pickVoice;
}
function speak(txt){
  if(!state.audioOn) return;
  if(typeof speechSynthesis === 'undefined') return;
  if(!txt) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(txt);
    u.lang = 'ja-JP';
    if(voiceJP) u.voice = voiceJP;
    u.rate = 0.95;
    speechSynthesis.speak(u);
  } catch(e){}
}
function audibleTextFor(card){
  // What to play when audio fires.
  if(card.type === 'recall') return card.kana || card.answer;
  if(card.type === 'recognition') return card.promptKana || card.prompt;
  if(card.type === 'listening') return card.prompt;
  if(card.kana) return card.kana;
  // For sentence-style cards, play the answer (kanji/kana mix is fine for TTS)
  return card.answer || card.prompt || '';
}

/* =========================================================
   Embedded plan / live widget (top of setup screen)
   ========================================================= */
let _widgetTickHandle = null;
function renderPlanWidget(){
  if(!window.PlanCore) return '';
  const PC = window.PlanCore;
  const now = new Date();
  const exam = PC.getExamDate();
  const blocks = PC.buildBlocks(now, exam);
  const pick = PC.pickDoNow(blocks, now);

  // Header (clock + countdown)
  let diff = exam.getTime() - now.getTime();
  let cdHtml = '';
  let cdCls = '';
  if(diff <= 0){ cdHtml = 'EXAM TIME'; cdCls = 'crit'; }
  else {
    const days = Math.floor(diff/86400000);
    const hrs = Math.floor((diff%86400000)/3600000);
    const mins = Math.floor((diff%3600000)/60000);
    const secs = Math.floor((diff%60000)/1000);
    cdHtml = (days>0?days+'d ':'') + PC.pad(hrs)+'h '+PC.pad(mins)+'m '+PC.pad(secs)+'s';
    if(days < 1) cdCls = 'crit';
    else if(days < 2) cdCls = 'urgent';
  }
  const clockStr = PC.pad(now.getHours())+':'+PC.pad(now.getMinutes())+':'+PC.pad(now.getSeconds());

  // Body changes by mode
  let cls = '';
  let badge = 'DO NOW';
  let title = '';
  let detail = '';
  let metaTags = [];
  let progressPct = 0;
  let cta = { text:'Start this block →', url:'#', preset:null, dur:null };
  let altCta = { text:'Plain start', show:true };

  if(pick.mode === 'live'){
    cls = 'live';
    badge = 'STUDYING NOW';
    const liveStart = pick.live.startTs;
    const inBlock = blocks.find(b => b.start.getTime() <= liveStart && liveStart < b.end.getTime());
    if(inBlock){
      title = inBlock.label;
      detail = inBlock.subtitle;
      const target = inBlock.targetWithCarry || inBlock.count || 0;
      const seen = pick.live.seen || 0;
      metaTags.push(PC.fmtTime(inBlock.start)+'–'+PC.fmtTime(inBlock.end));
      metaTags.push(seen+' / '+target+' cards');
      progressPct = target ? Math.min(100, Math.round(seen/target*100)) : Math.min(100, seen*2);
    } else {
      title = 'Flashcard session in progress';
      const elapsed = Math.round((Date.now() - liveStart)/60000);
      detail = elapsed+' min elapsed';
      metaTags.push((pick.live.seen||0)+' cards seen');
      progressPct = Math.min(100, (pick.live.seen||0)*2);
    }
    cta = { text:'Resume current →', url:'#', resume:true };
    altCta.show = false;
  } else if(pick.mode === 'idle'){
    cls = 'idle';
    const examPassed = exam.getTime() < now.getTime();
    if(examPassed){
      badge = 'EXAM PASSED';
      title = 'Set a new exam date in the planner';
      detail = '';
    } else {
      badge = 'ALL CLEAR';
      title = "No more blocks today — rest well.";
      detail = 'Tomorrow\'s plan kicks in at midnight.';
    }
    cta = { text:'Open full planner →', url:'plan.html', external:true };
    altCta.show = false;
  } else {
    const b = pick.block;
    if(pick.mode === 'now'){ badge = 'DO NOW'; }
    else { cls = 'upcoming'; badge = PC.sameDay(b.date, now) ? 'UP NEXT' : 'TOMORROW'; }
    title = b.label;
    detail = b.subtitle || '';
    metaTags.push(PC.fmtTime(b.start)+'–'+PC.fmtTime(b.end));
    metaTags.push(b.dur+' min');
    const target = b.targetWithCarry || b.count;
    if(target) metaTags.push(target+' cards');
    if(b.carry > 0) metaTags.push({carry:true, text:'+'+b.carry+' carryover'});
    const done = b.cardsDone || 0;
    progressPct = target ? Math.min(100, Math.round(done/target*100)) : 0;
    if(b.link){
      cta = { text:'Open simulator →', url:b.link, external:true };
    } else if(b.preset){
      cta = { text:(pick.mode==='now'?'Start this block →':'Apply preset →'), preset:b.preset, dur:b.dur };
    } else {
      cta = { text:'Open flashcards', url:'flashcards.html', external:true };
    }
  }

  const tagHtml = metaTags.map(t => {
    if(typeof t === 'object') return '<span class="pw-tag carry">'+escapeHtml(t.text)+'</span>';
    return '<span class="pw-tag">'+escapeHtml(t)+'</span>';
  }).join('');

  return `
    <div class="plan-widget ${cls}">
      <div class="pw-top">
        <span class="pw-clock">🕒 ${clockStr}</span>
        <span class="pw-countdown ${cdCls}"><span class="lbl">Exam in</span>${cdHtml}</span>
      </div>
      <span class="pw-badge">${badge}</span>
      <div class="pw-title">${escapeHtml(title)}</div>
      ${detail ? `<div class="pw-detail">${escapeHtml(detail)}</div>` : ''}
      ${tagHtml ? `<div class="pw-meta">${tagHtml}</div>` : ''}
      ${progressPct > 0 ? `<div class="pw-progressbar"><div class="fill" style="width:${progressPct}%"></div></div>` : ''}
      <div class="pw-actions">
        <button class="pw-cta" id="planWidgetCta"${cta.preset ? ' data-preset="'+escapeHtml(cta.preset)+'" data-dur="'+(cta.dur||25)+'"' : ''}${cta.url ? ' data-url="'+escapeHtml(cta.url)+'"' : ''}${cta.resume ? ' data-resume="1"' : ''}>${escapeHtml(cta.text)}</button>
        ${altCta.show ? `<a class="pw-cta alt" href="plan.html">Full plan →</a>` : ''}
      </div>
    </div>
  `;
}

// Event-delegated handler attached once on the stable wrapper. The widget HTML
// rebuilds every second, so per-button onclick wiring would race with the timer.
let _planWrapDelegated = false;
function wirePlanWidget(){
  if(_planWrapDelegated) return;
  const wrap = document.getElementById('planWidgetWrap');
  if(!wrap) return;
  _planWrapDelegated = true;
  wrap.addEventListener('click', (e) => {
    const btn = e.target.closest('#planWidgetCta');
    if(!btn) return;
    e.preventDefault();
    if(btn.dataset.resume === '1'){
      if(state.resumeAvailable){ startSession(true); }
      else { startSession(false); }
      return;
    }
    if(btn.dataset.url){
      window.location.href = btn.dataset.url;
      return;
    }
    if(btn.dataset.preset){
      const presetName = btn.dataset.preset;
      const dur = parseInt(btn.dataset.dur) || 25;
      const presets = {
        particles: { types:['particle','wa_ga','ni_de'], chs:[3,4,5,6] },
        conj: { types:['verb_conj','adj_conj','te_form','transform'], chs:[3,5,6] },
        countersKana: { types:['counter','kana','i_na'], chs:[1,2,3,4,5] },
        warmup: { types:['recall'], chs:[1,2,3,4,5,6] },
        weakSpot: { types:'auto', chs:[1,2,3,4,5,6] },
        dialogTransform: { types:['cloze','transform','dbl_particle','adj_noun'], chs:[3,4,5,6] },
        lightReview: { types:['recognition','listening'], chs:[1,2,3,4,5,6] },
        examWarmup: { types:['recall','recognition'], chs:[1,2,3,4,5,6] },
        mixed: { types:Object.keys(TYPE_INFO), chs:[1,2,3,4,5,6] },
      };
      const p = presets[presetName];
      if(!p) return;
      let typesSel = p.types;
      if(typesSel === 'auto'){
        const log = lsGet(LS.log) || [];
        const typeMisses = {};
        log.slice(-10).forEach(s => {
          if(s.types){
            const ftMissRate = s.ftTotal ? (1 - s.ftRight/s.ftTotal) : 0.5;
            for(const t of Object.keys(s.types)){
              typeMisses[t] = (typeMisses[t] || 0) + s.types[t] * ftMissRate;
            }
          }
        });
        const sorted = Object.entries(typeMisses).sort((a,b)=>b[1]-a[1]).slice(0,4).map(x=>x[0]);
        typesSel = sorted.length ? sorted : ['particle','verb_conj','adj_conj','te_form'];
      }
      state.types = new Set(typesSel.filter(t => TYPE_INFO[t]));
      state.chapters = new Set(p.chs);
      state.durationMin = dur;
      startSession(false);
    }
  });
}

function startWidgetTick(){
  if(_widgetTickHandle) clearInterval(_widgetTickHandle);
  _widgetTickHandle = setInterval(() => {
    if(state.screen !== 'setup') { clearInterval(_widgetTickHandle); _widgetTickHandle = null; return; }
    const wrap = document.getElementById('planWidgetWrap');
    if(!wrap) return;
    wrap.innerHTML = renderPlanWidget();
    wirePlanWidget();
  }, 1000);
}

/* =========================================================
   Setup screen
   ========================================================= */
function renderSetup(){
  // Setup root is replaced — re-attach the widget click delegation
  _planWrapDelegated = false;
  const root = document.getElementById('root');
  const tomorrow = lsGet(LS.tomorrow);
  const inProgress = lsGet(LS.inProgress);
  state.resumeAvailable = !!(inProgress && inProgress.queue && inProgress.queue.length);

  let totalCards = CARDS.filter(c => state.chapters.has(c.ch) && state.types.has(c.type)).length;

  let html = `
  <div class="setup-wrap">
    <div id="planWidgetWrap">${renderPlanWidget()}</div>
    <h1>なかま1 ・ Leitner Deck</h1>
    <div class="sub">All Ch 1–6 card types · in-session compressed Leitner · 3-button grading</div>
  `;

  if(state.resumeAvailable){
    const ip = inProgress;
    const ipMin = Math.round((ip.durationSec || 1200)/60);
    html += `
    <div class="resume-banner">
      <div class="label">Resume in-progress session</div>
      <div class="desc">${ip.queue.length} cards left · ${ipMin}-min budget · ${ip.seen||0} seen so far</div>
      <div class="btnrow">
        <button id="resumeStart" class="primary">Resume</button>
        <button id="resumeDiscard">Start over</button>
      </div>
    </div>`;
  }

  html += `
    <div class="stats-summary">
      <div class="stat-tile">Cards available<strong>${totalCards}</strong><div class="sub">filtered</div></div>
      <div class="stat-tile">Tomorrow's queue<strong>${tomorrow && tomorrow.cards ? tomorrow.cards.length : 0}</strong><div class="sub">parked from prior sessions</div></div>
    </div>

    <div class="setup-section">
      <h3>Chapter filter</h3>
      <div class="chip-row" id="chapChips">
        ${[1,2,3,4,5,6].map(ch =>
          `<div class="chip ${state.chapters.has(ch)?'on':''}" data-ch="${ch}">Ch ${ch}</div>`
        ).join('')}
      </div>
    </div>

    <div class="setup-section">
      <h3>Card-type filter</h3>
      <div class="chip-row" id="typeChips">
        ${Object.keys(TYPE_INFO).map(t =>
          `<div class="chip ${state.types.has(t)?'on':''}" data-type="${t}">${TYPE_INFO[t].label}</div>`
        ).join('')}
      </div>
      <div style="display:flex;gap:6px;margin-top:8px;">
        <button class="chip" id="allTypes">All</button>
        <button class="chip" id="noneTypes">None</button>
        <button class="chip" id="examFocus">Exam essentials</button>
      </div>
    </div>

    <div class="setup-section">
      <h3>Session timer</h3>
      <div class="timer-row">
        <div class="chip ${state.durationMin===10?'on':''}" data-dur="10">10 min</div>
        <div class="chip ${state.durationMin===15?'on':''}" data-dur="15">15 min</div>
        <div class="chip ${state.durationMin===20?'on':''}" data-dur="20">20 min</div>
        <div class="chip ${state.durationMin===25?'on':''}" data-dur="25">25 min</div>
        <div class="chip ${state.durationMin===30?'on':''}" data-dur="30">30 min</div>
      </div>
    </div>

    <button class="start-btn" id="startBtn">Start session →</button>

    <div style="text-align:center;font-size:11px;color:#666;margin-top:14px;">
      Keys: <strong>1</strong> miss · <strong>2</strong> shaky · <strong>3</strong> got it · <strong>Space</strong> flip · <strong>U</strong> undo · <strong>J</strong> skip · <strong>A</strong> audio
    </div>
  </div>
  `;
  root.innerHTML = html;

  // Wire chip handlers
  document.getElementById('chapChips').addEventListener('click', e => {
    const t = e.target.closest('.chip[data-ch]');
    if(!t) return;
    const ch = parseInt(t.dataset.ch);
    if(state.chapters.has(ch)) state.chapters.delete(ch);
    else state.chapters.add(ch);
    renderSetup();
  });
  document.getElementById('typeChips').addEventListener('click', e => {
    const t = e.target.closest('.chip[data-type]');
    if(!t) return;
    const tp = t.dataset.type;
    if(state.types.has(tp)) state.types.delete(tp);
    else state.types.add(tp);
    renderSetup();
  });
  document.getElementById('allTypes').onclick = () => { state.types = new Set(Object.keys(TYPE_INFO)); renderSetup(); };
  document.getElementById('noneTypes').onclick = () => { state.types = new Set(); renderSetup(); };
  document.getElementById('examFocus').onclick = () => {
    state.types = new Set(['recall','particle','wa_ga','verb_conj','adj_conj','counter','i_na','te_form','goro_gurai','freq','transform']);
    renderSetup();
  };
  document.querySelectorAll('.timer-row .chip').forEach(el => {
    el.onclick = () => { state.durationMin = parseInt(el.dataset.dur); renderSetup(); };
  });
  document.getElementById('startBtn').onclick = () => startSession(false);
  if(state.resumeAvailable){
    document.getElementById('resumeStart').onclick = () => startSession(true);
    document.getElementById('resumeDiscard').onclick = () => { lsDel(LS.inProgress); state.resumeAvailable=false; renderSetup(); };
  }
  wirePlanWidget();
  startWidgetTick();
}

/* =========================================================
   Session start
   ========================================================= */
function startSession(resume){
  if(resume){
    const saved = lsGet(LS.inProgress);
    if(!saved){ alert('No saved session.'); return; }
    state.queue = saved.queue || [];
    state.parked = saved.parked || [];
    state.seen = saved.seen || 0;
    state.firstTry = saved.firstTry || {right:0,total:0};
    state.miss = saved.miss || [];
    state.cardStats = new Map(saved.cardStatsArr || []);
    state.streak = saved.streak || 0;
    state.bestStreak = saved.bestStreak || 0;
    state.startedAt = Date.now() - (saved.elapsedSec||0)*1000;
    // saved.durationSec is in SECONDS, durationMin*60 is also seconds → multiply by 1000
    state.endsAt = state.startedAt + ((saved.durationSec || state.durationMin*60) * 1000);
    state.pausedTotal = 0;
    state.rollingMisses = saved.rollingMisses || [];
    state.trapsSinceLast = 0;
    state.brokeAlready = false;
  } else {
    // Build queue
    const tomorrow = lsGet(LS.tomorrow);
    let pool = CARDS.filter(c => state.chapters.has(c.ch) && state.types.has(c.type));

    // Pull tomorrow-queued cards first (parked + misses + shakies)
    if(tomorrow && tomorrow.cards && tomorrow.cards.length){
      const carryIds = new Set(tomorrow.cards.map(x => x.id));
      const carryCards = pool.filter(c => carryIds.has(c.id));
      const fresh = pool.filter(c => !carryIds.has(c.id));
      shuffle(carryCards); shuffle(fresh);
      // Mix unseen and reviewed continuously - interleave
      pool = [];
      let i=0,j=0;
      while(i<carryCards.length || j<fresh.length){
        if(i<carryCards.length) pool.push(carryCards[i++]);
        if(j<fresh.length) pool.push(fresh[j++]);
      }
    } else {
      shuffle(pool);
    }

    // Cap initial queue at a reasonable size for the timer budget
    // Queue cap by duration. ~7 cards/min target so 30 min → 200. Supports 15/25 min from plan presets.
    const cap = state.durationMin <= 10 ? 80 :
                state.durationMin <= 15 ? 110 :
                state.durationMin <= 20 ? 140 :
                state.durationMin <= 25 ? 170 :
                state.durationMin <= 30 ? 200 :
                Math.round(state.durationMin * 7);
    pool = pool.slice(0, cap);

    if(pool.length === 0){
      alert('No cards match these filters. Pick more chapters or types.');
      return;
    }

    state.queue = pool;
    state.parked = [];
    state.seen = 0;
    state.firstTry = { right:0, total:0 };
    state.cardStats = new Map();
    state.miss = [];
    state.rollingMisses = [];
    state.streak = 0;
    state.bestStreak = 0;
    state.trapsSinceLast = 0;
    state.brokeAlready = false;
    state.startedAt = Date.now();
    state.endsAt = state.startedAt + state.durationMin*60*1000;
    state.pausedTotal = 0;
  }

  state.screen = 'session';
  state.flipped = false;
  state.current = null;
  state.lastAction = null;
  document.getElementById('progressIndicator').style.display='inline';
  document.getElementById('streakIndicator').style.display='inline';
  document.getElementById('timerIndicator').style.display='inline';
  document.getElementById('pauseBtn').classList.remove('hidden');
  document.getElementById('audioToggle').classList.toggle('on', state.audioOn);
  nextCard();
  startTimer();
}

/* =========================================================
   Timer
   ========================================================= */
let timerHandle = null;
function startTimer(){
  if(timerHandle) clearInterval(timerHandle);
  timerHandle = setInterval(() => {
    if(state.paused){ return; }
    if(state.screen !== 'session') { clearInterval(timerHandle); return; }
    const remaining = (state.endsAt - Date.now())/1000;
    const el = document.getElementById('timerIndicator');
    el.textContent = fmtTime(remaining);
    el.classList.toggle('low', remaining < 120);
    el.classList.toggle('crit', remaining < 30);
    if(remaining <= 0){
      endSession('timer');
    }
    // Pacing check at ~8 min mark
    const elapsedMin = (Date.now() - state.startedAt - state.pausedTotal)/60000;
    if(!state.brokeAlready && elapsedMin >= 8 && elapsedMin < 8.2){
      checkPacing();
    }
    // Auto-save every ~10s (throttled — saveProgress checks lastSaveAt itself)
    saveProgress();
  }, 250);
}
let _lastSaveAt = 0;

function checkPacing(){
  state.brokeAlready = true;
  const total = state.firstTry.total || 1;
  const rate = state.firstTry.right / total;
  if(rate >= 0.6 && rate <= 0.75){
    // soft offer
    showBreak('You\'re grinding — want a 30s breather?', false);
  } else if(rate < 0.6){
    // forced break
    showBreak('Miss rate is high — taking a 30s breather.', true);
  }
}

function showBreak(msg, forced){
  const el = document.getElementById('breakToast');
  document.getElementById('breakMsg').textContent = msg;
  el.classList.remove('hidden');
  if(forced){
    document.getElementById('breakAccept').textContent = 'OK';
    document.getElementById('breakDismiss').style.display = 'none';
    pauseSession();
    setTimeout(() => {
      el.classList.add('hidden');
      resumeSession();
    }, 30000);
    document.getElementById('breakAccept').onclick = () => {
      el.classList.add('hidden');
      resumeSession();
    };
  } else {
    document.getElementById('breakDismiss').style.display = 'inline-block';
    document.getElementById('breakAccept').onclick = () => {
      el.classList.add('hidden');
      pauseSession();
      setTimeout(() => resumeSession(), 30000);
    };
    document.getElementById('breakDismiss').onclick = () => el.classList.add('hidden');
  }
}

function pauseSession(){
  if(state.paused) return;
  state.paused = true;
  state.pausedAt = Date.now();
  document.getElementById('pauseOverlay').classList.remove('hidden');
}
function resumeSession(){
  if(!state.paused) return;
  state.paused = false;
  const dur = Date.now() - state.pausedAt;
  state.pausedTotal += dur;
  state.endsAt += dur;
  document.getElementById('pauseOverlay').classList.add('hidden');
}

/* =========================================================
   Card render
   ========================================================= */
function nextCard(){
  if(state.queue.length === 0){
    endSession('queue-empty');
    return;
  }
  state.current = state.queue.shift();
  state.flipped = false;
  state.seen += 1;

  // Auto-trap check every ~12 cards based on rolling miss rate
  state.trapsSinceLast += 1;
  if(state.trapsSinceLast >= 12 && state.miss.length > 0){
    const rate = recentMissRate();
    if(rate >= 0.35){
      state.trapsSinceLast = 0;
      const trapCard = buildTrapFromRecentMiss();
      if(trapCard){
        renderTrap(trapCard);
        return;
      }
    }
  }

  renderCard();
  updateTopbar();
  if(state.audioOn && (state.current.type === 'listening')){
    setTimeout(() => speak(audibleTextFor(state.current)), 200);
  }
}

function renderCard(){
  const c = state.current;
  if(!c){ return; }
  const root = document.getElementById('root');
  const typeLabel = TYPE_INFO[c.type] ? TYPE_INFO[c.type].label : c.type;
  const promptHtml = formatPrompt(c);
  const answerHtml = formatAnswer(c);
  const mnemHtml = formatMnemonic(c);
  const ctxHtml = c.ctx ? `<div class="ctx-hint">📍 ${escapeHtml(c.ctx)}</div>` : '';
  const isJpPrompt = c.type==='recognition' || c.type==='listening' || c.type==='kana' || (c.prompt && /[぀-ヿ一-鿿]/.test(c.prompt));

  root.innerHTML = `
  <div class="session-wrap">
    <div class="card" id="theCard">
      <div>
        <span class="type-tag">${typeLabel}</span>
        <span class="type-tag ch">Ch ${c.ch}</span>
      </div>
      ${ctxHtml}
      <div class="prompt ${isJpPrompt ? 'jp' : ''}">${promptHtml}</div>
      <div class="answer">${answerHtml}</div>
      <div class="mnemonic-block">${mnemHtml}</div>
      <div class="flip-hint">▶ Tap card or press SPACE to flip</div>
    </div>
    <div class="grade-row">
      <button class="grade-btn miss" data-grade="1" disabled><span class="key">1</span><span class="lab">Miss</span></button>
      <button class="grade-btn shaky" data-grade="2" disabled><span class="key">2</span><span class="lab">Shaky</span></button>
      <button class="grade-btn got" data-grade="3" disabled><span class="key">3</span><span class="lab">Got it</span></button>
    </div>
    <div class="session-toolbar">
      <button id="undoBtn">↶ Undo (U)</button>
      <button id="skipBtn">⏭ Skip (J)</button>
      <button id="endBtn">End session</button>
    </div>
  </div>
  `;

  document.getElementById('theCard').addEventListener('click', flipCard);
  document.querySelectorAll('.grade-btn').forEach(b => {
    b.onclick = () => grade(parseInt(b.dataset.grade));
  });
  document.getElementById('undoBtn').onclick = undo;
  document.getElementById('skipBtn').onclick = skipCard;
  document.getElementById('endBtn').onclick = () => {
    if(confirm('End this session early?')) endSession('manual');
  };
}

function escapeHtml(s){
  if(s==null) return '';
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function nl2br(s){ return escapeHtml(s).replace(/\n/g,'<br>'); }

function formatPrompt(c){
  if(c.type==='particle' || c.type==='cloze'){
    // Replace ___ with the styled blank
    return nl2br(c.prompt).replace(/_{2,}/g,'<span class="blank">　　</span>');
  }
  if(c.type==='ni_de' || c.type==='goro_gurai' || c.type==='wa_ga'){
    return nl2br(c.prompt).replace(/_{2,}/g,'<span class="blank">　　</span>');
  }
  if(c.type==='freq'){
    // Sentence at top, question at bottom
    return nl2br(c.prompt);
  }
  return nl2br(c.prompt);
}

function formatAnswer(c){
  let out = '';
  if(c.type === 'recall'){
    out += `<div class="ja">${escapeHtml(c.answer)}</div>`;
    if(c.kana && c.kana !== c.answer) out += `<div class="kana">${escapeHtml(c.kana)}</div>`;
    out += `<div class="en">${escapeHtml(c.en)}</div>`;
  } else if(c.type === 'recognition'){
    out += `<div class="en">${escapeHtml(c.answer)}</div>`;
    if(c.kana && c.kana !== c.prompt) out += `<div class="kana">${escapeHtml(c.kana)}</div>`;
  } else if(c.type === 'listening'){
    out += `<div class="ja">${escapeHtml(c.answer)}</div>`;
    if(c.en && c.en !== c.answer) out += `<div class="en">${escapeHtml(c.en)}</div>`;
  } else if(c.type === 'kana'){
    out += `<div class="en">${escapeHtml(c.answer)}</div>`;
  } else if(c.type === 'particle' && c.multi && c.parts){
    // Multi-blank particle: list each blank with its answer + reason
    out += `<div class="ja" style="font-size:18px;">`;
    out += c.parts.map(p => `Blank ${p.blank}: <strong>${escapeHtml(p.answer)}</strong>`).join(' &nbsp;·&nbsp; ');
    out += `</div>`;
    out += `<div class="why" style="margin-top:8px;">`;
    out += c.parts.map(p => `<div><span class="ja">${escapeHtml(p.answer)}</span> — ${escapeHtml(p.why)}</div>`).join('');
    out += `</div>`;
    return out; // skip the generic why-line below
  } else if((c.type === 'i_na' || c.type === 'ni_de' || c.type === 'goro_gurai' || c.type === 'freq' || c.type === 'masenka') && c.options && c.options.length){
    // MC-style cards: highlight the right option
    out += `<div class="ja" style="font-size:20px;">${escapeHtml(c.answer)}</div>`;
    out += `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">`;
    c.options.forEach((opt, i) => {
      const right = (i === c.correctIdx);
      out += `<span style="display:inline-block;font-size:13px;padding:4px 10px;border-radius:14px;border:1px solid ${right?'var(--green)':'var(--border-soft)'};color:${right?'var(--green-soft)':'var(--text2)'};background:${right?'rgba(39,174,96,0.10)':'transparent'};">${right?'✓ ':''}${escapeHtml(opt)}</span>`;
    });
    out += `</div>`;
  } else if(c.type === 'wa_ga'){
    out += `<div class="ja" style="font-size:22px;">${escapeHtml(c.answer)}</div>`;
  } else if(c.type === 'verb_conj' || c.type === 'adj_conj' || c.type === 'te_form' || c.type === 'transform' || c.type === 'te_chain' || c.type === 'adj_noun' || c.type === 'dbl_particle'){
    out += `<div class="ja">${escapeHtml(c.answer)}</div>`;
  } else if(c.type === 'counter' || c.type === 'demo' || c.type === 'qword' || c.type === 'greeting' || c.type === 'cloze'){
    out += `<div class="ja">${escapeHtml(c.answer)}</div>`;
  } else {
    // Generic fallback
    out += `<div class="ja">${escapeHtml(c.answer || '(see mnemonic)')}</div>`;
  }
  if(c.why){
    out += `<div class="why">${escapeHtml(c.why)}</div>`;
  }
  return out;
}

function formatMnemonic(c){
  const m = c.mnem || {};
  let rows = [];
  if(m.chain) rows.push(`<div class="mnem-row chain">⟲ ${escapeHtml(m.chain)}</div>`);
  if(m.kanji) rows.push(`<div class="mnem-row">📝 <strong>Kanji:</strong> ${escapeHtml(m.kanji)}</div>`);
  if(m.sentence) rows.push(`<div class="mnem-row">💡 ${escapeHtml(m.sentence)}</div>`);
  if(m.related && m.related.length){
    rows.push(`<div class="mnem-row">🔗 ${m.related.map(r => '<span class="ja">'+escapeHtml(r)+'</span>').join(' · ')}</div>`);
  }
  if(m.trap) rows.push(`<div class="mnem-row trap">⚠ ${escapeHtml(m.trap)}</div>`);
  if(rows.length === 0) rows.push(`<div class="mnem-row">💡 ${escapeHtml(c.why || c.answer || '')}</div>`);
  return `<div class="mnem-label">★ Mnemonic</div>` + rows.join('');
}

function flipCard(){
  if(state.flipped) return;
  state.flipped = true;
  document.getElementById('theCard').classList.add('flipped');
  document.querySelectorAll('.grade-btn').forEach(b => b.disabled = false);
  if(state.audioOn) speak(audibleTextFor(state.current));
}

function updateTopbar(){
  document.getElementById('progCur').textContent = state.seen;
  document.getElementById('progTot').textContent = state.seen + state.queue.length;
  document.getElementById('streakNum').textContent = state.streak;
  const sEl = document.getElementById('streakIndicator');
  sEl.classList.toggle('hot', state.streak >= 5);
}

/* =========================================================
   Grading + queue mutation
   ========================================================= */
function grade(g){
  if(!state.current || !state.flipped) return;
  const c = state.current;
  const stat = getCardStat(c.id);
  stat.seen += 1;

  // Save undo snapshot
  state.lastAction = {
    card: c,
    queue: state.queue.slice(),
    parked: state.parked.slice(),
    seen: state.seen,
    miss: state.miss.slice(),
    rollingMisses: state.rollingMisses.slice(),
    firstTry: clone(state.firstTry),
    streak: state.streak,
    statBefore: clone({...stat}),
  };

  // First-try stat — only record this card's outcome the FIRST time it appears
  if(stat.seen === 1){
    state.firstTry.total += 1;
    if(g === 3) state.firstTry.right += 1;
  }

  // Rolling miss tracker (last 12)
  state.rollingMisses.push(g === 1 ? 1 : 0);
  if(state.rollingMisses.length > 12) state.rollingMisses.shift();

  if(g === 1){ // miss
    stat.missed += 1;
    stat.missesInRow += 1;
    state.miss.push({ id:c.id, prompt: trimText(c.prompt, 60), type:c.type });
    state.streak = 0;
    // Check triple-miss rescue BEFORE re-queueing
    if(stat.missesInRow >= 3){
      stat.missesInRow = 0;
      offerRescue(c);
      return;
    }
    // Requeue ~4 later (but minimum 2 so it's not the very next card)
    const insertAt = Math.min(state.queue.length, 4 + Math.floor(Math.random()*2));
    state.queue.splice(Math.max(2, insertAt), 0, c);
  } else if(g === 2){ // shaky
    stat.shaky += 1;
    stat.missesInRow = 0;
    state.streak = 0;
    const insertAt = Math.min(state.queue.length, 12 + Math.floor(Math.random()*3) - 1);
    state.queue.splice(Math.max(6, insertAt), 0, c);
  } else if(g === 3){ // got it
    stat.gotit += 1;
    stat.missesInRow = 0;
    state.streak += 1;
    if(state.streak > state.bestStreak) state.bestStreak = state.streak;
    state.parked.push(c);
  }

  saveProgress({force:true});
  nextCard();
}

function trimText(s, n){ s = String(s||''); return s.length>n ? s.slice(0,n)+'…' : s; }

function recentMissRate(){
  const arr = state.rollingMisses;
  if(arr.length < 6) return 0;
  return arr.reduce((a,b)=>a+b,0) / arr.length;
}

function undo(){
  if(!state.lastAction) return;
  const a = state.lastAction;
  state.queue = a.queue;
  state.parked = a.parked;
  state.seen = a.seen;
  state.miss = a.miss;
  state.rollingMisses = a.rollingMisses;
  state.firstTry = a.firstTry;
  state.streak = a.streak;
  // Restore the card's stat snapshot
  state.cardStats.set(a.card.id, a.statBefore);
  state.current = a.card;
  state.lastAction = null;
  state.flipped = true;
  renderCard();
  // Show flipped state
  setTimeout(() => {
    document.getElementById('theCard').classList.add('flipped');
    document.querySelectorAll('.grade-btn').forEach(b => b.disabled = false);
  }, 10);
}

function skipCard(){
  if(!state.current) return;
  // Park the skipped card at the end
  state.queue.push(state.current);
  state.lastAction = null;
  nextCard();
}

/* =========================================================
   Triple-miss rescue
   ========================================================= */
function offerRescue(card){
  const overlay = document.getElementById('rescueOverlay');
  const breakdownEl = document.getElementById('rescueBreakdown');
  const rows = breakdownForCard(card);
  breakdownEl.innerHTML = rows.map(r => `<div class="breakdown-row">${r}</div>`).join('');
  overlay.classList.remove('hidden');
  document.getElementById('rescueGotit').onclick = () => {
    overlay.classList.add('hidden');
    // Treat as "shaky" so it'll resurface in 12 cards
    const stat = getCardStat(card.id);
    stat.shaky += 1;
    state.streak = 0;
    const insertAt = Math.min(state.queue.length, 12);
    state.queue.splice(Math.max(6, insertAt), 0, card);
    nextCard();
  };
  document.getElementById('rescueSkip').onclick = () => {
    overlay.classList.add('hidden');
    // Park the card at the end
    state.queue.push(card);
    nextCard();
  };
}

function breakdownForCard(c){
  const rows = [];
  const m = c.mnem || {};
  if(c.type === 'verb_conj' || c.type === 'transform' || c.type === 'te_form'){
    if(m.chain) rows.push('Conjugation chain: <span class="ja">'+escapeHtml(m.chain)+'</span>');
    rows.push('Identify verb group first: る-verb (drop る + ending) vs う-verb (last syllable rule).');
    if(c.answer) rows.push('Target form: <span class="ja">'+escapeHtml(c.answer)+'</span>');
  } else if(c.type === 'particle' || c.type === 'wa_ga' || c.type === 'ni_de'){
    rows.push('Identify the verb first — its requirements drive the particle.');
    rows.push('GAS-WAD (あります・います・すき・きらい・わかる・できる) all take <span class="ja">が</span>.');
    if(c.why) rows.push('Why: '+escapeHtml(c.why));
  } else if(c.type === 'recall' || c.type === 'recognition' || c.type === 'listening'){
    if(m.kanji) rows.push('Kanji: '+escapeHtml(m.kanji));
    rows.push('Use it in a sentence: <span class="ja">'+escapeHtml(c.answer || c.kana || c.prompt)+'…</span>');
    if(m.related && m.related.length) rows.push('Word family: '+m.related.map(r=>'<span class="ja">'+escapeHtml(r)+'</span>').join(' · '));
  } else if(c.type === 'adj_conj') {
    rows.push('Identify い-adj vs な-adj first. Cucumber crew きゆり (きれい・ゆうめい・りっぱ) are な-adj.');
    if(m.chain) rows.push('Chain: '+escapeHtml(m.chain));
    if(c.answer) rows.push('Target: <span class="ja">'+escapeHtml(c.answer)+'</span>');
  } else if(c.type === 'counter') {
    rows.push('Counter sound shifts trigger on 1・3・6・8・10 (small つ + ぷ/ぽ/べ).');
    if(m.chain) rows.push('Pattern: '+escapeHtml(m.chain));
    if(c.answer) rows.push('Target: <span class="ja">'+escapeHtml(c.answer)+'</span>');
  } else {
    if(c.why) rows.push('Why: '+escapeHtml(c.why));
    if(m.sentence) rows.push(escapeHtml(m.sentence));
    if(m.trap) rows.push('Trap: '+escapeHtml(m.trap));
  }
  return rows;
}

/* =========================================================
   Trap card injection
   ========================================================= */
function buildTrapFromRecentMiss(){
  // Pull a recent missed card to base the trap on
  const recent = state.miss.slice(-6);
  if(!recent.length) return null;
  const pick = recent[Math.floor(Math.random()*recent.length)];
  const card = CARDS.find(x => x.id === pick.id);
  if(!card) return null;
  return generateTrap(card);
}

function generateTrap(card){
  const t = card.type;
  let prompt = '', correct = '', distractors = [], explain = '';
  const ans = (card.answer||'').trim();

  if(t === 'particle' || t === 'wa_ga' || t === 'ni_de' || t === 'goro_gurai'){
    prompt = (card.prompt||'').replace(/_{2,}/g, '____');
    correct = ans;
    if(t === 'particle'){
      const candidates = ['に','で','を','と','の','も','が','は','へ'];
      distractors = candidates.filter(x => x !== ans).slice(0,3);
    } else if(t === 'wa_ga'){
      // Swap は/が
      distractors = ans === 'は' ? ['が', 'を', 'も'] : ['は', 'を', 'も'];
    } else if(t === 'ni_de'){
      distractors = ans.startsWith('に') ? ['で', 'を', 'と'] : ['に', 'を', 'と'];
    } else if(t === 'goro_gurai'){
      distractors = ans.startsWith('ご') ? ['ぐらい','くらい','まで'] : ['ごろ','まで','ぐらい'];
    }
    explain = card.why || '';
  } else if(t === 'verb_conj' || t === 'adj_conj' || t === 'transform' || t === 'te_form'){
    prompt = (card.prompt||'').replace(/\n/g,' · ');
    correct = ans;
    distractors = generateConjDistractors(card);
    explain = card.why || (card.mnem && card.mnem.trap) || '';
  } else if(t === 'i_na'){
    prompt = (card.prompt||'').replace(/\n/g,' ');
    correct = ans;
    distractors = ['い-adjective','な-adjective'].filter(x => x !== ans);
    // Add a tempting cucumber-like distractor
    if(distractors.length === 1) distractors.push('Both / depends on context');
    explain = card.why || '';
  } else if(t === 'counter'){
    prompt = card.prompt;
    correct = ans;
    distractors = generateCounterDistractors(card);
    explain = card.why || (card.mnem && card.mnem.trap) || '';
  } else if(t === 'demo'){
    prompt = card.prompt;
    correct = ans;
    const pool = ['これ','それ','あれ','どれ','この','その','あの','どの','ここ','そこ','あそこ','どこ'];
    distractors = pool.filter(x => x !== ans).slice(0,3);
    explain = card.why || '';
  } else if(t === 'recall'){
    prompt = card.prompt;
    correct = card.answer;
    // Pick distractors from same chapter / similar pool
    distractors = pickN(
      CARDS.filter(c => c.type === 'recall' && c.ch === card.ch && c.id !== card.id).map(c => c.answer),
      3, new Set([correct])
    );
    explain = card.mnem && card.mnem.kanji ? card.mnem.kanji : (card.mnem && card.mnem.sentence) || '';
  } else if(t === 'kana'){
    prompt = card.prompt;
    correct = card.answer;
    const pool = CARDS.filter(c => c.type === 'kana' && c.id !== card.id).map(c => c.answer);
    distractors = pickN(pool, 3, new Set([correct]));
    explain = (card.mnem && card.mnem.trap) || '';
  } else {
    return null; // skip cards we can't generate distractors for
  }

  if(distractors.length < 2) return null;
  const all = shuffle([{txt:correct, right:true}, ...distractors.slice(0,3).map(d => ({txt:d, right:false}))]);
  return { prompt, options: all, explain, card };
}

function generateConjDistractors(card){
  const ans = card.answer || '';
  const distractors = [];
  // Verb conjugation: shift politeness/tense
  if(card.type === 'verb_conj'){
    const stem = ans.replace(/(ます|ません|ました|ませんでした)$/, '');
    const forms = [stem+'ます', stem+'ません', stem+'ました', stem+'ませんでした'];
    forms.forEach(f => { if(f !== ans && !distractors.includes(f)) distractors.push(f); });
  } else if(card.type === 'adj_conj'){
    // Generic wrong adjective endings
    if(ans.includes('かった')){
      distractors.push(ans.replace('かった','かったでした'));
      distractors.push(ans.replace('かった','くないでした'));
    }
    if(ans.includes('じゃない')){
      distractors.push(ans.replace('じゃない','くない'));
    }
    if(ans.includes('よ')){
      // いい traps
      distractors.push(ans.replace('よ','い'));
    }
  } else if(card.type === 'te_form'){
    // Common te-form mistakes
    if(ans.endsWith('って')) distractors.push(ans.replace('って','んで'));
    if(ans.endsWith('んで')) distractors.push(ans.replace('んで','って'));
    if(ans.endsWith('いて')) distractors.push(ans.replace('いて','って'));
    if(ans.endsWith('いで')) distractors.push(ans.replace('いで','んで'));
    // いく → いいて trap
    if(ans === 'いって ⚠') distractors.push('いいて','いきて');
  }
  // Pad with siblings
  if(distractors.length < 3){
    const sibs = CARDS.filter(c => c.type === card.type && c.id !== card.id).map(c => c.answer);
    pickN(sibs, 3, new Set([card.answer, ...distractors])).forEach(s => distractors.push(s));
  }
  return distractors.filter(d => d && d !== card.answer).slice(0,3);
}

function generateCounterDistractors(card){
  const ans = card.answer || '';
  const distractors = [];
  // Swap in the regular form where irregular is required
  if(/っぷ/.test(ans)) distractors.push(ans.replace('っぷ','ふ'));
  if(/っぽ/.test(ans)) distractors.push(ans.replace('っぽ','ほ'));
  if(/ぼ/.test(ans)) distractors.push(ans.replace('ぼ','ほ'));
  if(/ぷ/.test(ans)) distractors.push(ans.replace('ぷ','ふ'));
  if(ans === 'よじ') distractors.push('よんじ','しじ');
  if(ans === 'しちじ') distractors.push('ななじ','しちじかん');
  if(ans === 'くじ') distractors.push('きゅうじ','くじかん');
  if(ans === 'ひとり') distractors.push('いちにん','ひとにん');
  if(ans === 'ふたり') distractors.push('ににん','ふたにん');
  // Pad with siblings
  if(distractors.length < 3){
    const sibs = CARDS.filter(c => c.type === 'counter' && c.id !== card.id).map(c => c.answer);
    pickN(sibs, 3, new Set([card.answer, ...distractors])).forEach(s => distractors.push(s));
  }
  return distractors.filter(d => d && d !== card.answer).slice(0,3);
}

let activeTrap = null;
function renderTrap(trap){
  activeTrap = trap;
  const overlay = document.getElementById('trapOverlay');
  const card = document.getElementById('trapCard');
  document.getElementById('trapPrompt').innerHTML = nl2br(trap.prompt);
  const optsEl = document.getElementById('trapOptions');
  optsEl.innerHTML = '';
  trap.options.forEach((opt) => {
    const b = document.createElement('button');
    b.className = 'trap-option';
    b.textContent = opt.txt;
    b.dataset.right = opt.right ? '1' : '0';
    b.onclick = () => {
      Array.from(optsEl.children).forEach(c => { c.disabled = true; });
      if(opt.right){
        b.classList.add('right');
        document.getElementById('trapExplain').innerHTML = '✅ Correct! ' + escapeHtml(trap.explain || '');
        card.classList.add('shown');
        setTimeout(() => closeTrap(true), 1200);
      } else {
        b.classList.add('wrong');
        Array.from(optsEl.children).forEach(c => {
          if(c.dataset.right === '1') c.classList.add('right');
        });
        document.getElementById('trapExplain').innerHTML = '✗ ' + escapeHtml(trap.explain || 'See mnemonic on the source card.');
        card.classList.add('shown');
      }
    };
    optsEl.appendChild(b);
  });
  document.getElementById('trapExplain').innerHTML = '';
  card.classList.remove('shown');
  document.getElementById('trapContinue').onclick = () => closeTrap(false);
  overlay.classList.remove('hidden');
}

function closeTrap(rightAnswer){
  document.getElementById('trapOverlay').classList.add('hidden');
  // If user got the trap wrong, re-queue the source card ~4 later so the
  // weak point gets drilled directly (not just via the MC trap).
  if(!rightAnswer && activeTrap && activeTrap.card){
    const src = activeTrap.card;
    const insertAt = Math.min(state.queue.length, 4 + Math.floor(Math.random()*2));
    state.queue.splice(Math.max(2, insertAt), 0, src);
  }
  activeTrap = null;
  renderCard();
}

/* =========================================================
   End of session report
   ========================================================= */
function endSession(reason){
  state.screen = 'report';
  if(timerHandle) clearInterval(timerHandle);
  document.getElementById('progressIndicator').style.display='none';
  document.getElementById('streakIndicator').style.display='none';
  document.getElementById('timerIndicator').style.display='none';
  document.getElementById('pauseBtn').classList.add('hidden');

  // Append to the activity log so the study planner can read it
  try {
    const log = lsGet(LS.log) || [];
    const elapsedSec = Math.round((Date.now() - state.startedAt - state.pausedTotal)/1000);
    // Per-type breakdown for the planner
    const typeCounts = {};
    state.cardStats.forEach((s, id) => {
      const card = CARDS.find(c => c.id === id);
      if(!card) return;
      typeCounts[card.type] = (typeCounts[card.type] || 0) + 1;
    });
    log.push({
      startTs: state.startedAt,
      endTs: Date.now(),
      durationSec: elapsedSec,
      seen: state.seen,
      uniqueCards: state.cardStats.size,
      ftRight: state.firstTry.right,
      ftTotal: state.firstTry.total,
      misses: state.miss.length,
      bestStreak: state.bestStreak,
      reason,
      types: typeCounts,
      chapters: Array.from(state.chapters),
    });
    // Keep last 200 sessions
    if(log.length > 200) log.splice(0, log.length - 200);
    lsSet(LS.log, log);
    lsDel(LS.liveSession);
  } catch(e){ /* noop */ }

  // Tomorrow's deck = today's misses + shakies + a fresh batch
  const carryIds = new Set();
  state.cardStats.forEach((s, id) => {
    if(s.missed > 0 || s.shaky > 0) carryIds.add(id);
  });
  const carry = CARDS.filter(c => carryIds.has(c.id));
  // Pick fresh cards from filters that weren't already gotten today
  const seenIds = new Set();
  state.cardStats.forEach((_, id) => seenIds.add(id));
  const fresh = CARDS.filter(c =>
    state.chapters.has(c.ch) && state.types.has(c.type) && !seenIds.has(c.id)
  );
  shuffle(fresh);
  // Weight tomorrow toward worst type
  const typeRates = computeTypeRates();
  let worstType = null, worstRate = 1;
  for(const [t, r] of Object.entries(typeRates)){
    if(r.total >= 3 && r.right/r.total < worstRate){
      worstRate = r.right/r.total; worstType = t;
    }
  }
  let freshWeighted = fresh;
  if(worstType){
    const ofType = fresh.filter(c => c.type === worstType);
    const ofOther = fresh.filter(c => c.type !== worstType);
    freshWeighted = [...ofType, ...ofOther];
  }
  const tomorrow = {
    builtAt: Date.now(),
    cards: [...carry.map(c=>({id:c.id})), ...freshWeighted.slice(0,40).map(c=>({id:c.id}))],
    worstType,
  };
  lsSet(LS.tomorrow, tomorrow);
  // Discard in-progress save (session is done)
  lsDel(LS.inProgress);

  renderReport(reason, tomorrow);
}

function computeTypeRates(){
  const rates = {};
  state.cardStats.forEach((s, id) => {
    const card = CARDS.find(c => c.id === id);
    if(!card) return;
    if(!rates[card.type]) rates[card.type] = { right:0, total:0 };
    rates[card.type].total += 1;
    if(s.gotit > 0 && s.missed === 0 && s.shaky === 0) rates[card.type].right += 1;
  });
  return rates;
}

function renderReport(reason, tomorrow){
  const root = document.getElementById('root');
  const elapsedSec = Math.round((Date.now() - state.startedAt - state.pausedTotal) / 1000);
  const ftRate = state.firstTry.total > 0 ? Math.round(state.firstTry.right/state.firstTry.total*100) : 0;

  // Top misses
  const missCounts = {};
  state.miss.forEach(m => {
    if(!missCounts[m.id]) missCounts[m.id] = { ct:0, prompt:m.prompt, type:m.type };
    missCounts[m.id].ct += 1;
  });
  const topMisses = Object.values(missCounts).sort((a,b) => b.ct - a.ct).slice(0,8);

  // Type rates
  const typeRates = computeTypeRates();
  const typeRows = Object.entries(typeRates).sort((a,b) => {
    return (b[1].total - b[1].right) - (a[1].total - a[1].right);
  });

  let msg = '';
  if(reason === 'timer') msg = '⏰ Time\'s up — session ended.';
  else if(reason === 'queue-empty') msg = '🎉 Queue cleared!';
  else msg = '✅ Session ended.';

  let html = `
  <div class="report-wrap">
    <h2>${msg}</h2>
    <div class="report-grid">
      <div class="report-tile"><div class="label">Time</div><div class="val">${fmtTime(elapsedSec)}</div><div class="sub">elapsed</div></div>
      <div class="report-tile"><div class="label">Cards seen</div><div class="val">${state.seen}</div><div class="sub">${state.cardStats.size} unique</div></div>
      <div class="report-tile"><div class="label">First-try rate</div><div class="val">${ftRate}%</div><div class="sub">${state.firstTry.right}/${state.firstTry.total} got it cold</div></div>
      <div class="report-tile"><div class="label">Best streak</div><div class="val">🔥 ${state.bestStreak}</div><div class="sub">consecutive Got-its</div></div>
    </div>
  `;

  if(topMisses.length){
    html += `
    <div class="report-section">
      <h3>Top misses</h3>
      ${topMisses.map(m => `
        <div class="miss-row">
          <span class="q ${/[぀-ヿ一-鿿]/.test(m.prompt)?'ja':''}">${escapeHtml(m.prompt)}</span>
          <span class="ct">×${m.ct}</span>
        </div>`).join('')}
    </div>`;
  }

  if(typeRows.length){
    html += `
    <div class="report-section">
      <h3>By card type</h3>
      ${typeRows.map(([t, r]) => {
        const rate = r.total > 0 ? r.right/r.total : 0;
        const pct = Math.round(rate*100);
        const cls = rate < 0.5 ? 'bad' : rate < 0.75 ? 'mid' : '';
        const label = TYPE_INFO[t] ? TYPE_INFO[t].label : t;
        return `
          <div class="type-bar">
            <span class="ttl">${escapeHtml(label)}</span>
            <span class="bar-bg"><span class="bar-fill ${cls}" style="width:${pct}%"></span></span>
            <span class="pct">${pct}%</span>
          </div>`;
      }).join('')}
    </div>`;
  }

  html += `
    <div class="report-section">
      <h3>Tomorrow's deck</h3>
      <div style="font-size:13px;color:var(--text);margin-bottom:6px;">
        <strong>${tomorrow.cards.length}</strong> cards queued: today's misses + shakies + a fresh batch.
      </div>
      ${tomorrow.worstType ? `<div style="font-size:12px;color:var(--text2);">Tomorrow weighted toward <strong>${escapeHtml(TYPE_INFO[tomorrow.worstType].label)}</strong> (your weakest today).</div>`:''}
    </div>

    <div class="report-actions">
      <button id="newSession">New session</button>
      <button id="reviewMisses" class="primary">Drill misses now</button>
    </div>
  </div>
  `;

  root.innerHTML = html;
  document.getElementById('newSession').onclick = () => { state.screen='setup'; renderSetup(); };
  document.getElementById('reviewMisses').onclick = () => {
    if(topMisses.length === 0){ alert('No misses to drill — nice work!'); return; }
    // Build a focused queue from misses
    const ids = new Set(Object.keys(missCounts));
    state.queue = CARDS.filter(c => ids.has(c.id));
    shuffle(state.queue);
    state.parked = [];
    state.seen = 0;
    state.firstTry = { right:0, total:0 };
    state.cardStats = new Map();
    state.miss = [];
    state.rollingMisses = [];
    state.streak = 0;
    state.startedAt = Date.now();
    state.endsAt = state.startedAt + state.durationMin*60*1000;
    state.pausedTotal = 0;
    state.brokeAlready = false;
    state.screen = 'session';
    document.getElementById('progressIndicator').style.display='inline';
    document.getElementById('streakIndicator').style.display='inline';
    document.getElementById('timerIndicator').style.display='inline';
    document.getElementById('pauseBtn').classList.remove('hidden');
    nextCard();
    startTimer();
  };
}

/* =========================================================
   Persistence
   ========================================================= */
function saveProgress(opts){
  if(state.screen !== 'session') return;
  const nowMs = Date.now();
  // Throttle non-forced calls to once per 5s. grade() / visibilitychange / unload pass {force:true}.
  if(!(opts && opts.force) && nowMs - _lastSaveAt < 5000) return;
  _lastSaveAt = nowMs;
  const elapsedSec = Math.round((nowMs - state.startedAt - state.pausedTotal)/1000);
  const durationSec = state.durationMin*60;
  lsSet(LS.inProgress, {
    queue: state.queue,
    parked: state.parked,
    seen: state.seen,
    firstTry: state.firstTry,
    miss: state.miss,
    cardStatsArr: Array.from(state.cardStats.entries()),
    rollingMisses: state.rollingMisses,
    streak: state.streak,
    bestStreak: state.bestStreak,
    elapsedSec,
    durationSec,
    chapters: Array.from(state.chapters),
    types: Array.from(state.types),
  });
  // Heartbeat — the study planner uses this to mark a block as "in progress"
  lsSet(LS.liveSession, {
    startTs: state.startedAt,
    lastBeat: Date.now(),
    seen: state.seen,
  });
}

/* =========================================================
   Keyboard handlers
   ========================================================= */
document.addEventListener('keydown', e => {
  if(state.screen !== 'session') return;
  // Ignore typing in inputs (none here, but safety)
  if(e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if(state.paused){ if(e.key === 'Escape' || e.code==='Space') { e.preventDefault(); resumeSession(); } return; }
  // Trap overlay open?
  if(!document.getElementById('trapOverlay').classList.contains('hidden')) return;
  if(!document.getElementById('rescueOverlay').classList.contains('hidden')) return;

  if(e.code === 'Space'){
    e.preventDefault();
    if(!state.flipped) flipCard();
    return;
  }
  if(e.key === '1' && state.flipped){ e.preventDefault(); grade(1); return; }
  if(e.key === '2' && state.flipped){ e.preventDefault(); grade(2); return; }
  if(e.key === '3' && state.flipped){ e.preventDefault(); grade(3); return; }
  if(e.key.toLowerCase() === 'u'){ e.preventDefault(); undo(); return; }
  if(e.key.toLowerCase() === 'j'){ e.preventDefault(); skipCard(); return; }
  if(e.key.toLowerCase() === 'a'){ e.preventDefault(); toggleAudio(); return; }
});

function toggleAudio(){
  state.audioOn = !state.audioOn;
  const btn = document.getElementById('audioToggle');
  btn.classList.toggle('on', state.audioOn);
  btn.textContent = state.audioOn ? '🔊' : '🔇';
  lsSet(LS.prefs, { audioOn: state.audioOn });
}

/* =========================================================
   Wire static UI
   ========================================================= */
document.getElementById('audioToggle').onclick = toggleAudio;
document.getElementById('pauseBtn').onclick = pauseSession;
document.getElementById('resumeBtn').onclick = resumeSession;

// Persist prefs
const prefs = lsGet(LS.prefs);
if(prefs && typeof prefs.audioOn === 'boolean'){
  state.audioOn = prefs.audioOn;
  const btn = document.getElementById('audioToggle');
  btn.classList.toggle('on', state.audioOn);
  btn.textContent = state.audioOn ? '🔊' : '🔇';
} else {
  document.getElementById('audioToggle').classList.toggle('on', state.audioOn);
}

// Save on visibility change so unload doesn't lose progress
document.addEventListener('visibilitychange', () => {
  if(document.hidden) saveProgress({force:true});
});
window.addEventListener('beforeunload', () => saveProgress({force:true}));

// ── Deep-link preset support
// e.g. flashcards.html#preset=particles&dur=25  or  #ch=3,4,5,6&types=verb_conj,te_form&dur=30&autostart=1
function applyHashPreset(){
  const h = (location.hash || '').replace(/^#/,'');
  if(!h) return false;
  const params = {};
  h.split('&').forEach(kv => {
    const [k, v] = kv.split('=');
    if(k) params[k] = decodeURIComponent(v || '');
  });
  // Named preset → expand to ch + types
  const presets = {
    particles:        { types:['particle','wa_ga','ni_de'], chs:[3,4,5,6], dur:25 },
    conj:             { types:['verb_conj','adj_conj','te_form','transform'], chs:[3,5,6], dur:30 },
    countersKana:     { types:['counter','kana','i_na'], chs:[1,2,3,4,5], dur:20 },
    warmup:           { types:['recall'], chs:[1,2,3,4,5,6], dur:15 },
    weakSpot:         { types:'auto', chs:[1,2,3,4,5,6], dur:25 },
    dialogTransform:  { types:['cloze','transform','dbl_particle','adj_noun'], chs:[3,4,5,6], dur:25 },
    lightReview:      { types:['recognition','listening'], chs:[1,2,3,4,5,6], dur:15 },
    examWarmup:       { types:['recall','recognition'], chs:[1,2,3,4,5,6], dur:20 },
    mixed:            { types:Object.keys(TYPE_INFO), chs:[1,2,3,4,5,6], dur:30 },
  };
  let typesSel = null, chsSel = null, durSel = null;
  if(params.preset && presets[params.preset]){
    const p = presets[params.preset];
    typesSel = p.types;
    chsSel = p.chs;
    durSel = p.dur;
  }
  if(params.types) typesSel = params.types.split(',');
  if(params.ch)    chsSel   = params.ch.split(',').map(x => parseInt(x)).filter(Boolean);
  if(params.dur)   durSel   = parseInt(params.dur);

  if(typesSel === 'auto'){
    // Pull worst types from the activity log
    const log = lsGet(LS.log) || [];
    const typeMisses = {};
    log.slice(-10).forEach(s => {
      // We don't have miss-by-type but we can use seen-by-type as proxy and weight by 1-ftRate
      if(s.types){
        const ftMissRate = s.ftTotal ? (1 - s.ftRight/s.ftTotal) : 0.5;
        for(const t of Object.keys(s.types)){
          typeMisses[t] = (typeMisses[t] || 0) + s.types[t] * ftMissRate;
        }
      }
    });
    const sorted = Object.entries(typeMisses).sort((a,b)=>b[1]-a[1]).slice(0,4).map(x=>x[0]);
    typesSel = sorted.length ? sorted : ['particle','verb_conj','adj_conj','te_form'];
  }
  let mutated = false;
  if(typesSel){ state.types = new Set(typesSel.filter(t => TYPE_INFO[t])); mutated = true; }
  if(chsSel){ state.chapters = new Set(chsSel.filter(n => n>=1 && n<=6)); mutated = true; }
  if(durSel && durSel >= 5 && durSel <= 60){
    state.durationMin = durSel;
    mutated = true;
  }

  if(params.autostart === '1'){
    setTimeout(() => {
      const btn = document.getElementById('startBtn');
      if(btn) btn.click();
    }, 50);
    return true;
  }
  // Re-render setup so chip selections reflect the preset
  if(mutated && state.screen === 'setup') renderSetup();
  return false;
}

// Initial render
renderSetup();
applyHashPreset();
window.addEventListener('hashchange', () => { applyHashPreset(); });
})();

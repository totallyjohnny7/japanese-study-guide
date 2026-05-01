/* ===========================================================
   Nakama 1 — Shared plan & live-widget logic
   Used by both plan.html (full-page view) and flashcards.html (embedded).
   Exposes window.PlanCore = { ... }
   =========================================================== */
(function(){
'use strict';

const LS_PLAN_PREFS  = 'nakama_plan_prefs';
const LS_FC_LOG      = 'nakama_fc_log';
const LS_FC_LIVE     = 'nakama_fc_live';

const DEFAULT_EXAM_ISO = '2026-05-04T09:00';

const BLOCK_TYPES = {
  warmup:          { label:'Recall warmup',          subtitle:'easy En→Ja vocab to wake up', preset:'warmup', dur:15, count:25 },
  particles:       { label:'Particles + は/が drill', subtitle:'particle insertion · は vs が · に vs で', preset:'particles', dur:25, count:30 },
  conj:            { label:'Verb + adj conjugation',  subtitle:'ます-form · て-form · adjective 4-form · transformations', preset:'conj', dur:30, count:35 },
  countersKana:    { label:'Counters + kana traps',   subtitle:'分/時/人/本 sound shifts · katakana confusion pairs', preset:'countersKana', dur:20, count:25 },
  mixed:           { label:'Full mixed Leitner',      subtitle:'all 23 card types — exam-realistic mix', preset:'mixed', dur:30, count:40 },
  weakSpot:        { label:'Weak-spot drill',         subtitle:'auto-targets your worst types from logs', preset:'weakSpot', dur:25, count:30 },
  dialogTransform: { label:'Dialogue + sentence transform', subtitle:'cloze passages · te-form chains · adj+noun ordering', preset:'dialogTransform', dur:25, count:25 },
  lightReview:     { label:'Light recognition review', subtitle:'low-effort Ja→En + listening prep', preset:'lightReview', dur:15, count:30 },
  examSim:         { label:'Exam simulator',          subtitle:'full timed mock exam (separate page)', preset:null, dur:60, count:0, link:'exam-ch456.html' },
  examWarmup:      { label:'Exam-morning warmup',     subtitle:'high-confidence recall only — no new traps', preset:'examWarmup', dur:20, count:20 },
};

const TEMPLATES = {
  4: [[10,0,'warmup'],  [14,0,'particles'], [18,0,'conj'],         [21,30,'lightReview']],
  3: [[9,0,'warmup'],   [11,0,'particles'], [15,0,'conj'],         [18,30,'countersKana'], [21,30,'lightReview']],
  2: [[9,0,'warmup'],   [11,0,'conj'],      [14,0,'dialogTransform'], [17,0,'particles'],  [20,0,'mixed'],       [22,0,'lightReview']],
  1: [[9,0,'mixed'],    [11,30,'weakSpot'], [15,0,'examSim'],      [18,30,'dialogTransform'], [21,30,'lightReview']],
  0: [[8,0,'examWarmup']],
};

const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DOW_LONG = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function pad(n){ return String(n).padStart(2,'0'); }
function localDateKey(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function parseLocalDateKey(k){ const [y,m,d] = k.split('-').map(Number); return new Date(y, m-1, d); }
function lsGet(k){ try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch(e) { return null; } }
function lsSet(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
function startOfDay(d){ const x = new Date(d); x.setHours(0,0,0,0); return x; }
function sameDay(a, b){ return startOfDay(a).getTime() === startOfDay(b).getTime(); }
function daysBetween(a, b){ return Math.round((startOfDay(b) - startOfDay(a)) / 86400000); }
function fmtTime(d){ return pad(d.getHours()) + ':' + pad(d.getMinutes()); }

function getExamDate(){
  const prefs = lsGet(LS_PLAN_PREFS) || {};
  const iso = prefs.examIso || DEFAULT_EXAM_ISO;
  return new Date(iso);
}
function setExamDate(iso){
  const prefs = lsGet(LS_PLAN_PREFS) || {};
  prefs.examIso = iso;
  lsSet(LS_PLAN_PREFS, prefs);
}

function getLive(){
  const live = lsGet(LS_FC_LIVE);
  if(!live) return null;
  if(Date.now() - (live.lastBeat || 0) > 90000) return null;
  return live;
}

function countCardsInWindow(start, end){
  const log = lsGet(LS_FC_LOG) || [];
  let total = log
    .filter(s => {
      const ts = s.startTs || s.endTs;
      return ts >= start.getTime() && ts < end.getTime();
    })
    .reduce((sum, s) => sum + (s.seen || 0), 0);
  const live = getLive();
  if(live && live.startTs >= start.getTime() && live.startTs < end.getTime()){
    total += live.seen || 0;
  }
  return total;
}

function buildBlocks(now, examDate){
  const blocks = [];
  let cursor = startOfDay(now);
  const examDay = startOfDay(examDate);
  let safety = 14;
  while(cursor.getTime() <= examDay.getTime() && safety-- > 0){
    const daysOut = Math.max(0, daysBetween(cursor, examDay));
    const tplKey = daysOut >= 4 ? 4 : daysOut;
    let tpl = TEMPLATES[tplKey] || TEMPLATES[1];
    if(daysOut === 0) tpl = TEMPLATES[0];
    for(const [h, m, type] of tpl){
      const start = new Date(cursor); start.setHours(h, m, 0, 0);
      const meta = BLOCK_TYPES[type];
      if(!meta) continue;
      const end = new Date(start.getTime() + meta.dur * 60000);
      blocks.push({
        id: localDateKey(cursor) + '_' + pad(h) + pad(m),
        date: new Date(cursor),
        start, end,
        type, ...meta,
        daysOut,
      });
    }
    cursor = new Date(cursor.getTime() + 86400000);
  }
  computeCarryover(blocks, now);
  return blocks;
}

function computeCarryover(blocks, now){
  blocks.forEach(b => {
    b.cardsDone = countCardsInWindow(b.start, b.end);
    if(b.start.getTime() > now.getTime()) b.status = 'upcoming';
    else if(b.end.getTime() <= now.getTime()) {
      b.status = (b.cardsDone >= b.count) ? 'done' : 'missed';
    } else {
      b.status = 'now';
    }
  });
  let carryByType = {};
  blocks.forEach(b => {
    const carry = carryByType[b.type] || 0;
    b.carry = carry;
    b.targetWithCarry = b.count + carry;
    if(b.status === 'missed'){
      const deficit = Math.max(0, b.count + carry - b.cardsDone);
      carryByType[b.type] = (carryByType[b.type] || 0) + deficit;
      b.carryForward = deficit;
    } else {
      carryByType[b.type] = 0;
    }
  });
}

function pickDoNow(blocks, now){
  const live = getLive();
  if(live){ return { mode:'live', live }; }
  const cur = blocks.find(b => b.start.getTime() <= now.getTime() && now.getTime() < b.end.getTime());
  if(cur) return { mode:'now', block: cur };
  const today = blocks.filter(b => sameDay(b.date, now));
  const upcoming = today.find(b => b.start.getTime() > now.getTime());
  if(upcoming) return { mode:'upcoming', block: upcoming };
  const next = blocks.find(b => b.start.getTime() > now.getTime());
  if(next) return { mode:'upcoming', block: next };
  return { mode:'idle' };
}

function presetUrlFor(block){
  if(!block) return 'flashcards.html';
  if(block.link) return block.link;
  if(!block.preset) return 'flashcards.html';
  return 'flashcards.html#preset=' + encodeURIComponent(block.preset) + '&dur=' + block.dur + '&autostart=1';
}

window.PlanCore = {
  // Constants
  BLOCK_TYPES, TEMPLATES, DOW, DOW_LONG, MONTHS,
  LS_PLAN_PREFS, LS_FC_LOG, LS_FC_LIVE,
  DEFAULT_EXAM_ISO,
  // Helpers
  pad, localDateKey, parseLocalDateKey, lsGet, lsSet,
  startOfDay, sameDay, daysBetween, fmtTime,
  getExamDate, setExamDate,
  getLive, countCardsInWindow,
  // Plan logic
  buildBlocks, computeCarryover, pickDoNow, presetUrlFor,
};
})();

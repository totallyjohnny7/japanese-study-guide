/* ===========================================================
   Mastery — Cloze deck + Cloze viewer + Cloze Block runner.

   Cloze cards are derived from existing in-repo content only:
     1) window.VOCAB_DB    — vocab-examples.js (per-vocab ex_jp sentences)
     2) window.NAKAMA_CARDS — flashcards-data.js
        (cloze, particle, dbl_particle, ni_de, counter — anything that
         already has a sentence-with-blank shape)
     3) data/cards.json     — translation drill canonical sentences

   Cloze sentence markup uses Anki-style {{c1::answer}} tokens.
   The renderer parses tokens and shows inline inputs.

   Public surface (window.MASTERY_CLOZE):
     ready                    Promise that resolves with { meta, cards }
     buildOTFCloze(card)      Synthesize a one-shot cloze prompt for an
                              Application card if its deckType supports it
                              (vocab/mechanism/compare-contrast). Returns null
                              when no good blank is available.
     renderClozeCard(opts)    Render a cloze card into a container.
                              opts: { container, card, onResult, autoFocus,
                                      submitLabel }
                              onResult({ ok, perBlank, userInputs })
     runClozeRound(opts)      Run a 30-card cloze flow with +5 re-queue
                              and 2-correct-graduation. opts: { pool, max,
                              onCardGraded, onDone, header(getEl) }
     installHooks(api)        Called by mastery-app.js once it boots, to
                              receive a small API surface (saveState,
                              gradeAnswer, getCardState, applyClassification,
                              currentBlock, normalizeJa, esc helpers).

   Persistence: piggybacks on the existing nakama_mastery_state shape via
   the api passed in installHooks.
   =========================================================== */
(function(){
'use strict';

// ============================================================
//   Source: in-repo data
// ============================================================
const NK = (typeof window !== 'undefined' && window.NAKAMA_CARDS) ? window.NAKAMA_CARDS : [];

function getVocabDb(){
  return (typeof window !== 'undefined' && window.VOCAB_DB) ? window.VOCAB_DB : [];
}

// ============================================================
//   Cloze markup parsing — {{c1::answer::hint?}}
// ============================================================
const CLOZE_TOKEN_RE = /\{\{c(\d+)::([^}|]*?)(?:\|\|([^}]*?))?\}\}/g;

function parseCloze(sentence){
  if(!sentence) return { segments:[], blanks:[] };
  const segments = [];
  const blanks = [];
  let lastIdx = 0;
  let m;
  CLOZE_TOKEN_RE.lastIndex = 0;
  while((m = CLOZE_TOKEN_RE.exec(sentence)) !== null){
    const beforeText = sentence.slice(lastIdx, m.index);
    if(beforeText) segments.push({ kind:'text', text: beforeText });
    const blankIdx = blanks.length;
    blanks.push({
      slot: parseInt(m[1],10),
      answer: m[2],
      hint: m[3] || null,
    });
    segments.push({ kind:'blank', index: blankIdx });
    lastIdx = m.index + m[0].length;
  }
  if(lastIdx < sentence.length) segments.push({ kind:'text', text: sentence.slice(lastIdx) });
  return { segments, blanks };
}

// Used by deck browser preview (inline ___ for each blank)
function clozePreview(sentence){
  if(!sentence) return '';
  return sentence.replace(CLOZE_TOKEN_RE, '___');
}

// ============================================================
//   Build cloze cards — Phase 1
// ============================================================

function escRegExp(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function blankFirstOccurrence(sentence, target){
  if(!sentence || !target) return null;
  // Try exact match first; fall back to looser kana-only match
  const re = new RegExp(escRegExp(target));
  const m = re.exec(sentence);
  if(!m) return null;
  return sentence.slice(0, m.index) + '{{c1::' + target + '}}' + sentence.slice(m.index + target.length);
}

// (1) Vocab example sentences — blank the headword
function buildFromVocab(){
  const out = [];
  const db = getVocabDb();
  const seenSentences = new Set();
  db.forEach(v => {
    if(!v || !v.ex_jp || !v.jp) return;
    // Skip the trivial copula entries that wouldn't teach much (です alone)
    if(v.jp === 'です' || v.jp === 'ね' || v.jp === 'よ' || v.jp === 'か') return;
    // Skip multi-form headwords like "うち / へや" — too ambiguous to blank
    if(/[\/／]/.test(v.jp)) return;
    // Skip very short headwords (single-char particles tracked by particle deck)
    if(v.jp.length <= 1) return;
    const target = v.jp;
    const sentence = v.ex_jp;
    const sigKey = sentence + '|' + target;
    if(seenSentences.has(sigKey)) return;
    if(!sentence.includes(target)) return;
    seenSentences.add(sigKey);
    const cloze = blankFirstOccurrence(sentence, target);
    if(!cloze) return;
    // Variants: kana + romaji + kanji form. answers stays the canonical form.
    const variants = [];
    if(v.h && v.h !== target) variants.push(v.h);
    if(v.r) variants.push(v.r);
    out.push({
      id: 'cz_v_' + v.r,
      deckId: 'cloze',
      deckType: 'cloze',
      ch: v.ch,
      sentence: cloze,
      answers: [target],
      hints: [v.e || null],
      answerVariants: [variants],
      answerLang: 'ja',
      front: clozePreview(cloze),                    // match grid + browser show ___
      back: sentence + '\n— ' + (v.e || ''),
      answerCanonical: target,
      sourceTag: 'vocab:' + v.r,
      en: v.ex_en || '',
    });
  });
  return out;
}

// (2) NAKAMA_CARDS that already have the sentence-with-blank shape.
//     The existing source uses ___ as the blank slot. We replace the first
//     ___ with {{c1::answer}}; for `multi`+parts, replace each one.
function buildFromNakamaCloze(){
  const out = [];
  const seen = new Set();
  function blankSentence(prompt, parts){
    // parts: [{blank, answer, why, skip?}]; replace each ___ in order.
    const tokens = [];
    let p = String(prompt||'');
    let i = 0;
    while(p.indexOf('___') !== -1 && i < parts.length){
      const part = parts[i++];
      if(part.skip){
        p = p.replace('___', ''); // remove the slot if marked skip (rare)
        continue;
      }
      const slot = tokens.length + 1;
      tokens.push({ slot, answer: part.answer, hint: part.why || null });
      p = p.replace('___', '{{c'+slot+'::'+part.answer+(part.why?'||'+escHint(part.why):'')+'}}');
    }
    return { sentence: p, blanks: tokens };
  }
  function escHint(h){
    return String(h||'').replace(/\}\}/g,'} }').replace(/::/g, ': :');
  }
  NK.forEach(c => {
    if(!['cloze','particle','dbl_particle','ni_de','counter'].includes(c.type)) return;
    if(seen.has(c.id)) return;
    seen.add(c.id);
    let sentence, blanks, hintsArr;
    if(c.multi && Array.isArray(c.parts)){
      const r = blankSentence(c.prompt, c.parts);
      sentence = r.sentence;
      blanks = r.blanks;
    } else {
      // Single-blank: replace first ___ with the answer token.
      const ans = (c.answer||'').trim();
      if(!ans) return;
      const why = c.why || '';
      if(c.type === 'counter'){
        // counter cards have prompt like "1 minute [counter: 分]" — synth a sentence
        // For now, present the bare prompt as a "reading" cloze with the answer blanked.
        sentence = (c.prompt||'') + '\n→ {{c1::' + ans + (why?'||'+escHint(why):'') + '}}';
      } else {
        sentence = (c.prompt||'').replace('___', '{{c1::' + ans + (why?'||'+escHint(why):'') + '}}');
        // If no ___ existed, append the answer slot at end
        if(!sentence.includes('{{c1::')){
          sentence = (c.prompt||'') + ' → {{c1::' + ans + (why?'||'+escHint(why):'') + '}}';
        }
      }
      blanks = [{ slot:1, answer: ans, hint: why || null }];
    }
    if(!blanks.length) return;
    hintsArr = blanks.map(b => b.hint);
    out.push({
      id: 'cz_n_' + c.id,
      deckId: 'cloze',
      deckType: 'cloze',
      ch: c.ch,
      sentence,
      answers: blanks.map(b => b.answer),
      hints: hintsArr,
      answerVariants: blanks.map(()=>[]),
      answerLang: 'ja',
      front: clozePreview(sentence),
      back: (c.answer || blanks.map(b=>b.answer).join(' · ')) + (c.why?'\n— '+c.why:''),
      answerCanonical: blanks.map(b=>b.answer).join(' · '),
      sourceTag: c.type+':'+c.id,
    });
  });
  return out;
}

// (3) data/cards.json — generate one cloze per canonical, blank the most
// teachable token (the verb, noun, or pattern that distinguishes the card).
async function buildFromTranslationCards(){
  let raw = null;
  try {
    const res = await fetch('data/cards.json', {cache:'force-cache'});
    if(!res.ok) throw new Error('HTTP '+res.status);
    const data = await res.json();
    raw = (data && Array.isArray(data.cards)) ? data.cards : [];
  } catch(e){
    console.warn('[mastery-cloze] translation cards unavailable:', e);
    raw = [];
  }
  const out = [];
  raw.forEach(c => {
    const va = (c.valid_answers && c.valid_answers[0]) || {};
    const canon = va.canonical || '';
    const must = va.must_contain || [];
    if(!canon || !must.length) return;
    // Pick the longest must_contain group's first form (most specific token).
    let target = null;
    let maxLen = 0;
    must.forEach(group => {
      if(!Array.isArray(group)) return;
      // Skip generic copula/particle-only groups.
      const first = group[0];
      if(!first) return;
      if(first === 'です' || first === 'ですか' || first === 'は' || first === 'を') return;
      // Find the form that actually appears in the canonical sentence
      for(const form of group){
        if(canon.includes(form) && form.length > maxLen){
          target = form;
          maxLen = form.length;
          break;
        }
      }
    });
    if(!target){
      // Fallback: pick any must_contain[0][0] that appears
      for(const group of must){
        if(Array.isArray(group) && group[0] && canon.includes(group[0])){
          target = group[0];
          break;
        }
      }
    }
    if(!target) return;
    const cloze = blankFirstOccurrence(canon, target);
    if(!cloze) return;
    // Variants = remaining forms in the same group
    let variants = [];
    must.forEach(group => {
      if(Array.isArray(group) && group.includes(target)){
        variants = group.filter(f => f !== target);
      }
    });
    out.push({
      id: 'cz_t_' + c.id,
      deckId: 'cloze',
      deckType: 'cloze',
      ch: c.chapter,
      sentence: cloze,
      answers: [target],
      hints: [c.prompt_en || null],
      answerVariants: [variants],
      answerLang: 'ja',
      front: clozePreview(cloze),
      back: canon + '\n— ' + (c.prompt_en||''),
      answerCanonical: target,
      sourceTag: 'translation_cloze:' + c.id,
      en: c.prompt_en || '',
    });
  });
  return out;
}

// Build all cloze cards (async because of fetch)
async function buildAllClozeCards(){
  const a = buildFromVocab();
  const b = buildFromNakamaCloze();
  const c = await buildFromTranslationCards();
  const all = [...a, ...b, ...c];
  // Deduplicate by sentence + answer
  const seen = new Set();
  const out = [];
  all.forEach(card => {
    const key = (card.sentence||'') + '||' + (card.answers||[]).join('|');
    if(seen.has(key)) return;
    seen.add(key);
    out.push(card);
  });
  return out;
}

// ============================================================
//   Cloze viewer — renderClozeCard({container, card, onResult})
// ============================================================
function escHTML(s){
  return String(s==null?'':s).replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));
}

function isMobile(){
  // Fallback: if innerWidth is 0 (some headless environments), trust media query
  const w = window.innerWidth || document.documentElement.clientWidth || 0;
  if(w === 0){
    if(typeof window.matchMedia === 'function'){
      try { return window.matchMedia('(max-width: 600px)').matches; } catch(e){}
    }
    return false;
  }
  return w < 600;
}

// width estimate: ch units. Real char width depends on font / kanji vs kana,
// so we add headroom (×1.5 for ASCII/romaji, ×1.3 for JP).
function inputWidthCh(answer){
  const len = String(answer || '').length;
  const isAscii = /^[\x00-\x7F]*$/.test(String(answer||''));
  const factor = isAscii ? 1.5 : 1.5;
  const ch = Math.max(4, Math.round(len * factor));
  return Math.min(20, ch);
}

function renderClozeCard(opts){
  const container = opts.container;
  const card = opts.card;
  const onResult = opts.onResult || function(){};
  const submitLabel = opts.submitLabel || 'Check (Enter)';
  if(!container || !card) return;
  const parsed = parseCloze(card.sentence || card.front || '');
  const blanks = parsed.blanks;
  const layout = isMobile() && blanks.length > 1 ? 'stack' : 'inline';

  // Build sentence HTML with inline inputs (or stacked if mobile multi-blank)
  let bodyHTML = '';
  if(layout === 'inline'){
    bodyHTML = '<div class="cloze-sentence">';
    parsed.segments.forEach(seg => {
      if(seg.kind === 'text'){
        bodyHTML += '<span class="cloze-text">'+escHTML(seg.text).replace(/\n/g,'<br>')+'</span>';
      } else {
        const b = blanks[seg.index];
        const w = inputWidthCh(b.answer);
        bodyHTML += '<input class="cloze-blank" type="text" inputmode="text" '
          + 'autocomplete="off" autocapitalize="off" autocorrect="off" '
          + 'spellcheck="false" '
          + 'data-blank-index="'+seg.index+'" '
          + 'style="width:'+w+'ch" '
          + 'aria-label="Blank '+(seg.index+1)+'">';
      }
    });
    bodyHTML += '</div>';
  } else {
    // Stack: show sentence with placeholder boxes ___, then list inputs below.
    bodyHTML = '<div class="cloze-sentence stack">';
    parsed.segments.forEach(seg => {
      if(seg.kind === 'text'){
        bodyHTML += '<span class="cloze-text">'+escHTML(seg.text).replace(/\n/g,'<br>')+'</span>';
      } else {
        const num = '①②③④⑤'.charAt(seg.index) || ('('+(seg.index+1)+')');
        bodyHTML += '<span class="cloze-placeholder">'+num+'</span>';
      }
    });
    bodyHTML += '</div>';
    bodyHTML += '<div class="cloze-stack">';
    blanks.forEach((b, i) => {
      const num = '①②③④⑤'.charAt(i) || ('('+(i+1)+')');
      bodyHTML += '<div class="cloze-row"><span class="cloze-label">'+num+'</span>'
        + '<input class="cloze-blank stacked" type="text" inputmode="text" '
        + 'autocomplete="off" autocapitalize="off" autocorrect="off" '
        + 'spellcheck="false" '
        + 'data-blank-index="'+i+'" '
        + 'aria-label="Blank '+(i+1)+'"></div>';
    });
    bodyHTML += '</div>';
  }

  container.innerHTML = ''
    + '<div class="cloze-card">'
    +   bodyHTML
    +   '<div class="cloze-actions">'
    +     '<button class="big-btn cloze-submit" type="button">'+escHTML(submitLabel)+'</button>'
    +     '<button class="lnk cloze-show" type="button">Show answer</button>'
    +     (opts.showSkip!==false ? '<button class="lnk cloze-skip" type="button">Skip →</button>' : '')
    +     (opts.showEnd ? '<button class="lnk cloze-end" type="button">End block</button>' : '')
    +   '</div>'
    +   '<div class="cloze-feedback" aria-live="polite"></div>'
    + '</div>';

  const inputs = Array.from(container.querySelectorAll('input.cloze-blank'));
  const fb = container.querySelector('.cloze-feedback');
  const submitBtn = container.querySelector('.cloze-submit');
  const showBtn = container.querySelector('.cloze-show');
  const skipBtn = container.querySelector('.cloze-skip');
  const endBtn = container.querySelector('.cloze-end');

  // Bind wanakana for inline JP cloze. Skip for explicit non-JP cards.
  if(card.answerLang !== 'en' && window.wanakana && typeof window.wanakana.bind === 'function'){
    inputs.forEach(inp => {
      try { window.wanakana.bind(inp, { IMEMode:'toHiragana' }); } catch(e){}
    });
  }

  // Mobile: scroll prompt into view on focus so keyboard doesn't hide it
  inputs.forEach(inp => {
    inp.addEventListener('focus', () => {
      try { inp.scrollIntoView({ block:'center', behavior:'smooth' }); } catch(e){}
    });
  });

  // Tab between blanks (browser default), Enter submits whole card
  inputs.forEach((inp, i) => {
    inp.addEventListener('keydown', e => {
      if(e.key === 'Enter'){
        e.preventDefault();
        // Move to next empty blank if any; otherwise submit
        const nextEmpty = inputs.find((x, j) => j > i && !x.value.trim());
        if(nextEmpty) nextEmpty.focus();
        else doSubmit();
      }
    });
  });

  let resolved = false;

  function getApi(){ return window.MASTERY_CLOZE.__api || null; }
  function gradeBlank(answer, variants, userInput){
    const api = getApi();
    if(!api){
      // Last-resort exact compare
      return String(userInput).trim() === String(answer).trim();
    }
    // Build a synthetic card and call the existing fuzzy matcher
    const syn = {
      answerLang: card.answerLang || 'ja',
      answerCanonical: answer,
      answerVariants: variants || [],
      deckType: card.deckType,
    };
    const r = api.gradeAnswer(syn, userInput);
    return !!r.ok;
  }

  function doSubmit(){
    if(resolved) return;
    const userInputs = inputs.map(inp => inp.value);
    const perBlank = inputs.map((inp, i) => {
      const b = blanks[i];
      const variants = (card.answerVariants && card.answerVariants[i]) ? card.answerVariants[i] : [];
      const ok = gradeBlank(b.answer, variants, inp.value);
      inp.classList.remove('ok','bad');
      inp.classList.add(ok?'ok':'bad');
      inp.disabled = true;
      return { ok, answer: b.answer, hint: b.hint, userInput: inp.value };
    });
    const allOk = perBlank.every(p => p.ok);
    resolved = true;

    // Build feedback HTML
    let fbHTML = '';
    if(allOk){
      fbHTML = '<div class="cloze-fb ok">✓ Correct</div>';
    } else {
      fbHTML = '<div class="cloze-fb bad">✗ Did not match</div>';
      perBlank.forEach((p, i) => {
        if(p.ok) return;
        fbHTML += '<div class="cloze-correction">'
          + '<span class="cloze-cor-lab">Blank '+(i+1)+':</span> '
          + '<span class="cloze-cor-bad">'+escHTML(p.userInput || '∅')+'</span>'
          + ' → <span class="cloze-cor-good">'+escHTML(p.answer)+'</span>'
          + (p.hint ? ' <span class="cloze-cor-hint">('+escHTML(p.hint)+')</span>' : '')
          + '</div>';
      });
    }
    if(card.en){
      fbHTML += '<div class="cloze-en">'+escHTML(card.en)+'</div>';
    }
    fb.innerHTML = fbHTML;
    onResult({ ok: allOk, perBlank, userInputs });
  }

  function doShow(){
    if(resolved) return;
    inputs.forEach((inp, i) => {
      const b = blanks[i];
      inp.value = b.answer;
      inp.classList.add('shown');
      inp.disabled = true;
    });
    resolved = true;
    let fbHTML = '<div class="cloze-fb">Answer revealed.</div>';
    blanks.forEach((b, i) => {
      if(b.hint){
        fbHTML += '<div class="cloze-correction"><span class="cloze-cor-lab">Blank '+(i+1)+':</span> <span class="cloze-cor-hint">'+escHTML(b.hint)+'</span></div>';
      }
    });
    if(card.en) fbHTML += '<div class="cloze-en">'+escHTML(card.en)+'</div>';
    fb.innerHTML = fbHTML;
    // Treat as wrong/lapse for state
    onResult({ ok:false, perBlank: blanks.map(b => ({ ok:false, answer:b.answer, hint:b.hint, userInput:'' })), userInputs:[], shown:true });
  }

  submitBtn.addEventListener('click', doSubmit);
  showBtn.addEventListener('click', doShow);
  if(skipBtn) skipBtn.addEventListener('click', () => {
    if(resolved) return;
    resolved = true;
    onResult({ ok:false, skipped:true, perBlank:[], userInputs:[] });
  });
  if(endBtn && opts.onEnd) endBtn.addEventListener('click', opts.onEnd);

  if(opts.autoFocus !== false && inputs.length){
    setTimeout(() => { try { inputs[0].focus(); } catch(e){} }, 50);
  }
}

// ============================================================
//   Cloze Block runner — 30 cards, +5 re-queue, 2-correct graduate
// ============================================================
function runClozeRound(opts){
  const api = window.MASTERY_CLOZE.__api;
  if(!api){
    console.warn('[mastery-cloze] runClozeRound called before installHooks');
    if(opts && opts.onDone) opts.onDone();
    return;
  }
  const max = opts.max || 30;
  let queue = (opts.pool || []).slice(0, max);
  if(!queue.length){
    if(opts.onDone) opts.onDone();
    return;
  }
  const consec = {};
  let idx = 0;
  let cardIndex = 0;

  function done(){ api.saveState(); if(opts.onDone) opts.onDone(); }

  function step(){
    if(api.shouldEndBlock && api.shouldEndBlock()){ api.endBlockNow && api.endBlockNow(); return; }
    if(idx >= queue.length){ done(); return; }
    const card = queue[idx];
    if((consec[card.id]||0) >= 2){ idx++; return step(); }
    cardIndex++;
    const root = api.getAppRoot();
    if(!root){ done(); return; }
    const headerHTML = (typeof opts.header === 'function') ?
      opts.header({ idx, total: queue.length, queueLen: queue.length, cardIndex }) :
      '';
    root.innerHTML = ''
      + '<div class="m-block">'
      +   headerHTML
      +   '<div class="cloze-host"></div>'
      + '</div>';
    const host = root.querySelector('.cloze-host');
    renderClozeCard({
      container: host,
      card,
      autoFocus: true,
      submitLabel: 'Check (Enter)',
      showSkip: true,
      showEnd: true,
      onEnd: () => api.endBlockNow && api.endBlockNow(),
      onResult: ({ ok, shown }) => {
        const st = api.getCardState(card.id);
        st.lastSeen = Date.now();
        const cb = api.currentBlock();
        let isFirstSeen = false;
        if(cb){
          isFirstSeen = !cb.seenIds.has(card.id);
          if(isFirstSeen){ cb.seenIds.add(card.id); cb.cardsSeen++; }
        }
        if(ok){
          consec[card.id] = (consec[card.id]||0) + 1;
          st.consecutiveKnown = (st.consecutiveKnown||0) + 1;
          if(consec[card.id] >= 2){
            st.status = 'mastered';
            st.fsrs.due = Date.now() + 3*86400000;
          } else if(st.status === 'unknown' || st.status === 'new'){
            st.status = 'shaky';
          } else if(st.status === 'shaky') {
            st.status = 'known';
          }
          // Gate knownCount with first-seen so block accuracy never exceeds 100%
          if(cb && isFirstSeen) cb.knownCount++;
          if(opts.onCardGraded) opts.onCardGraded(card, true);
          // Auto-advance after a beat to show the green tick
          setTimeout(() => { idx++; step(); }, 350);
        } else {
          consec[card.id] = 0;
          st.consecutiveKnown = 0;
          st.lapseCount = (st.lapseCount||0) + 1;
          st.status = 'unknown';
          if(!shown) api.speakIf && api.speakIf(card.answers && card.answers[0]);
          // Re-queue +5
          queue.splice(Math.min(idx+5, queue.length), 0, card);
          if(opts.onCardGraded) opts.onCardGraded(card, false);
          // Show "Continue" button
          const fb = host.querySelector('.cloze-feedback');
          if(fb){
            const next = document.createElement('button');
            next.className = 'big-btn cloze-next';
            next.textContent = 'Continue (Enter) →';
            next.addEventListener('click', () => { idx++; step(); });
            fb.appendChild(document.createElement('br'));
            fb.appendChild(next);
            // Enter advances
            const onKey = e => {
              if(e.key === 'Enter'){
                e.preventDefault();
                document.removeEventListener('keydown', onKey);
                next.click();
              }
            };
            document.addEventListener('keydown', onKey, { once:true });
            next.focus();
          } else {
            setTimeout(() => { idx++; step(); }, 1200);
          }
        }
      },
    });
  }

  step();
}

// ============================================================
//   On-the-fly cloze for the Application Block — Phase 5
// ============================================================
//
// Synthesize a cloze prompt from an existing Application card when:
//   - Vocabulary card (kanji_reading deck) → embed in vocab example sentence
//   - Conjugation step → use the dictionary form's vocab example with the
//     conjugated form swapped in (best-effort)
//   - Compare/Contrast (wa_ga, ni_de) → already a cloze sentence, render as
//     such instead of as a flashcard
function buildOTFCloze(card){
  if(!card) return null;
  // Compare-Contrast wa_ga / ni_de — front already has ___ slot
  if(card.deckId === 'compare-contrast' && (card.deckType === 'wa_ga' || card.deckType === 'ni_de')){
    const front = (card.front||'').replace(/→ は or が\?|→ に or で\?/g,'');
    if(front.includes('___')){
      const sentence = front.replace('___', '{{c1::' + (card.answerCanonical||'') + (card.why?'||'+(card.why||''):'') + '}}');
      return {
        id: 'otf_'+card.id,
        deckId: card.deckId,
        deckType: 'cloze',
        ch: card.ch,
        sentence,
        answers: [card.answerCanonical],
        hints: [card.why || null],
        answerVariants: [card.answerVariants || []],
        answerLang: 'ja',
        front: sentence,
        back: card.back,
        answerCanonical: card.answerCanonical,
        sourceTag: 'otf:'+card.sourceTag,
      };
    }
  }
  // Kanji Reading: blank the headword in the vocab example sentence; the
  // user types the reading. VOCAB_DB stores headwords by their canonical
  // form (often kana even when a kanji exists in NAKAMA_CARDS), so look up
  // by kana reading first, then by surface form.
  if(card.deckId === 'kanji-reading'){
    const db = getVocabDb();
    const reading = card.answerCanonical;     // kana reading
    const surface = card.front;                // usually kanji
    const found = db.find(v => v.h === reading) || db.find(v => v.jp === surface);
    if(found && found.ex_jp){
      let target = null;
      if(surface && found.ex_jp.includes(surface)) target = surface;
      else if(found.jp && found.ex_jp.includes(found.jp)) target = found.jp;
      else if(found.h && found.ex_jp.includes(found.h)) target = found.h;
      if(target){
        const sentence = blankFirstOccurrence(found.ex_jp, target);
        if(sentence){
          return {
            id: 'otf_'+card.id,
            deckId: card.deckId,
            deckType: 'cloze',
            ch: card.ch,
            // For kanji-reading, the answer is the *reading*, not the surface
            // form found in the sentence. Swap the canonical inside the c1 token.
            sentence: sentence.replace('{{c1::'+target+'}}', '{{c1::'+found.h+'}}'),
            answers: [found.h],
            hints: [found.e || null],
            answerVariants: [target !== found.h ? [target] : []],
            answerLang: 'ja',
            front: sentence,
            back: found.ex_jp + '\n— ' + (found.e||''),
            answerCanonical: found.h,
            sourceTag: 'otf:'+card.sourceTag,
            en: found.ex_en,
          };
        }
      }
    }
  }
  // Vocabulary recall (front == English, answerCanonical == JP) — find the
  // vocab example sentence and blank the JP form.
  if((card.deckId === 'particle-usage' || card.deckType === 'particle' || card.deckType === 'dbl_particle')){
    // these already have the blank-shape — render as cloze
    const front = card.front || '';
    if(front.includes('___')){
      const sentence = front.replace('___', '{{c1::'+(card.answerCanonical||'')+'}}');
      return {
        id: 'otf_'+card.id,
        deckId: card.deckId,
        deckType: 'cloze',
        ch: card.ch,
        sentence,
        answers: [card.answerCanonical],
        hints: [card.why || null],
        answerVariants: [card.answerVariants || []],
        answerLang: 'ja',
        front: sentence,
        back: card.back,
        answerCanonical: card.answerCanonical,
        sourceTag: 'otf:'+card.sourceTag,
      };
    }
  }
  return null;
}

// ============================================================
//   Hook installation: receive api from mastery-app on boot
// ============================================================
function installHooks(api){
  window.MASTERY_CLOZE.__api = api;
}

// ============================================================
//   Public surface
// ============================================================
const READY = (async function(){
  // Wait for the existing decks to finish first so we can append our deck.
  if(window.MASTERY_DECKS_READY){
    try { await window.MASTERY_DECKS_READY; } catch(e){}
  }
  const cards = await buildAllClozeCards();
  // Group counts per source for the build report
  const byTag = {};
  cards.forEach(c => {
    const k = (c.sourceTag||'').split(':')[0];
    byTag[k] = (byTag[k]||0)+1;
  });
  const meta = {
    id: 'cloze',
    title: 'Cloze',
    subtitle: 'Fill the blank in context — pulls from vocab examples, particle drills, and translation canonicals.',
    color: '#80cbc4',
    emoji: '空',
    count: cards.length,
  };
  // Inject into the existing decks registry if present.
  if(window.MASTERY_DECKS){
    const md = window.MASTERY_DECKS;
    if(!md.byId.cloze){
      md.byId.cloze = { meta, cards };
      md.metaList.push({ ...meta });
      cards.forEach(c => md.allCards.push(c));
    }
  }
  // Notify mastery-app so it can re-render home with the new tile.
  window.dispatchEvent(new CustomEvent('cloze-deck-ready', { detail: { meta, cards, byTag } }));
  return { meta, cards, byTag };
})();

window.MASTERY_CLOZE = {
  ready: READY,
  parseCloze,
  clozePreview,
  buildOTFCloze,
  renderClozeCard,
  runClozeRound,
  installHooks,
  __api: null,
};

})();

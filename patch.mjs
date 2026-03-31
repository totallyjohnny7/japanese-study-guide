import { readFileSync, writeFileSync } from 'fs';

const file = 'public/index.html';
let html = readFileSync(file, 'utf-8');

// ═══ 1. ADD CSS before </style> ═══
const newCSS = `
/* ═══ PRACTICE LAB TAB ═══ */
.nav-tab.practice-tab { color: var(--green); }
.nav-tab.practice-tab.active { color: var(--green); border-bottom-color: var(--green); }
.nav-tab.practice-tab .kanji { color: var(--green); }

.practice-lab-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
  margin-top: 20px;
}
.plab-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.25s;
  position: relative;
  overflow: hidden;
}
.plab-card:hover {
  border-color: var(--gold-dark);
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(212,168,67,0.12);
}
.plab-card .plab-icon { font-size: 28px; margin-bottom: 10px; }
.plab-card .plab-title { font-size: 15px; font-weight: 700; color: var(--white); margin-bottom: 4px; }
.plab-card .plab-desc { font-size: 12px; color: var(--text-dim); line-height: 1.5; }
.plab-card .plab-tag {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 5px;
  font-size: 9px;
  font-weight: 700;
  margin-top: 10px;
  background: var(--gold-glow);
  color: var(--gold);
  letter-spacing: 0.5px;
}

/* ═══ AUTO-PLAY BAR ═══ */
.autoplay-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.autoplay-bar label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-dim);
  letter-spacing: 1px;
  text-transform: uppercase;
  white-space: nowrap;
}
.autoplay-toggle {
  position: relative;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
}
.autoplay-toggle input { opacity: 0; width: 0; height: 0; }
.autoplay-toggle .slider {
  position: absolute;
  inset: 0;
  background: var(--border);
  border-radius: 24px;
  cursor: pointer;
  transition: 0.3s;
}
.autoplay-toggle .slider::before {
  content: '';
  position: absolute;
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background: var(--text-dim);
  border-radius: 50%;
  transition: 0.3s;
}
.autoplay-toggle input:checked + .slider { background: var(--green); }
.autoplay-toggle input:checked + .slider::before { transform: translateX(20px); background: var(--white); }

.speed-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100px;
  height: 4px;
  background: var(--border);
  border-radius: 4px;
  outline: none;
}
.speed-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--gold);
  cursor: pointer;
}
.speed-val {
  font-size: 12px;
  color: var(--gold);
  font-weight: 700;
  min-width: 32px;
}
.autoplay-hint {
  font-size: 10px;
  color: var(--muted);
  margin-left: auto;
}

/* ═══ COUNTDOWN RING ═══ */
.countdown-ring-wrap {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 48px;
  height: 48px;
  z-index: 10;
}
.countdown-ring-wrap svg { width: 48px; height: 48px; transform: rotate(-90deg); }
.countdown-ring-wrap .ring-bg { fill: none; stroke: var(--border); stroke-width: 3; }
.countdown-ring-wrap .ring-fg { fill: none; stroke-width: 3; stroke-linecap: round; transition: stroke-dashoffset 0.1s linear; }
.countdown-ring-wrap .ring-front { stroke: #9b59b6; }
.countdown-ring-wrap .ring-back { stroke: var(--green); }
.countdown-num {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: var(--white);
}

/* ═══ HOVER TOOLTIP ═══ */
.jp-tooltip {
  position: fixed;
  z-index: 9999;
  background: #1a1a2e;
  border: 1px solid var(--gold-dark);
  border-radius: 10px;
  padding: 14px 16px;
  max-width: 320px;
  min-width: 200px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.6);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s;
  font-family: 'DM Sans', sans-serif;
}
.jp-tooltip.visible { opacity: 1; pointer-events: auto; }
.jp-tooltip .tt-jp { font-size: 26px; font-family: 'Klee One', cursive; color: var(--gold); font-weight: 600; }
.jp-tooltip .tt-reading { font-size: 13px; color: var(--text-dim); margin-top: 2px; }
.jp-tooltip .tt-en { font-size: 13px; color: var(--white); margin-top: 6px; font-weight: 600; }
.jp-tooltip .tt-katakana { font-size: 12px; color: var(--blue); margin-top: 4px; }
.jp-tooltip .tt-example { font-size: 11px; color: var(--text-dim); margin-top: 6px; font-style: italic; line-height: 1.5; }
.jp-tooltip .tt-speak {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  padding: 4px 10px;
  background: var(--gold-dark);
  color: var(--white);
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  pointer-events: auto;
  border: none;
  font-family: 'DM Sans';
}
.jp-tooltip .tt-speak:hover { filter: brightness(1.2); }

/* ═══ MOBILE IMPROVEMENTS ═══ */
@media (max-width: 600px) {
  .masthead { padding: 24px 12px 14px; }
  .masthead h1 { font-size: 24px; letter-spacing: 1px; }
  .masthead .sub { font-size: 9px; letter-spacing: 3px; }
  .nav-tab { padding: 10px 10px 8px; font-size: 10px; }
  .nav-tab .kanji { font-size: 14px; }
  .main-container { padding: 0 10px 40px; }
  .ch-title { font-size: 22px; }
  .practice-lab-grid { grid-template-columns: 1fr; }
  .autoplay-bar { gap: 8px; padding: 8px 12px; }
  .speed-slider { width: 70px; }
  .autoplay-hint { display: none; }
  .pcard { padding: 14px; }
  .handwritten { font-size: 40px; min-height: 70px; }
  .draw-canvas { height: 180px; }
  .study-content .pl { font-size: 12px; padding: 10px 12px; }
  .jp-tooltip { max-width: 280px; min-width: 180px; padding: 10px 12px; }
  .jp-tooltip .tt-jp { font-size: 22px; }
  .countdown-ring-wrap { width: 40px; height: 40px; }
  .countdown-ring-wrap svg { width: 40px; height: 40px; }
  .countdown-num { font-size: 11px; }
}
`;

html = html.replace('</style>', newCSS + '\n</style>');

// ═══ 2. ADD PRACTICE LAB TAB to nav ═══
html = html.replace(
  `<button class="nav-tab ref-tab" onclick="showChapter('ref-numbers')"`,
  `<button class="nav-tab practice-tab" onclick="showChapter('practice-lab')" id="tab_practice-lab"><span class="kanji">練</span>Practice Lab</button><button class="nav-tab ref-tab" onclick="showChapter('ref-numbers')"`
);

// ═══ 3. ADD PRACTICE LAB PANEL before the script tag ═══
const practiceLabPanel = `
<div class="chapter-panel" id="panel_practice-lab">
  <div class="ch-title">練習ラボ — PRACTICE LAB</div>
  <div class="ch-subtitle">Interactive practice tools · Write · Listen · Read · Speak</div>

  <div style="text-align:center;color:var(--text-dim);font-size:12px;margin-bottom:20px">
    Choose a practice tool below. Each opens in a new tab with its own interactive exercises.
  </div>

  <div class="practice-lab-grid">
    <div class="plab-card" onclick="window.open('practice-ch1.html','_blank')">
      <div class="plab-icon">🔤</div>
      <div class="plab-title">Ch 1: Sounds & Hiragana</div>
      <div class="plab-desc">Writing, dictation, reading & oral practice for greetings, classroom expressions, and the sound system.</div>
      <div class="plab-tag">CHAPTER 1</div>
    </div>
    <div class="plab-card" onclick="window.open('practice-ch2.html','_blank')">
      <div class="plab-icon">🤝</div>
      <div class="plab-title">Ch 2: Introductions</div>
      <div class="plab-desc">Practice self-introductions, nationality, major, occupations, and demonstrative pronouns.</div>
      <div class="plab-tag">CHAPTER 2</div>
    </div>
    <div class="plab-card" onclick="window.open('practice-ch3.html','_blank')">
      <div class="plab-icon">📅</div>
      <div class="plab-title">Ch 3: Daily Routines</div>
      <div class="plab-desc">Time expressions, daily activities, verb conjugations, and frequency words.</div>
      <div class="plab-tag">CHAPTER 3</div>
    </div>
    <div class="plab-card" onclick="window.open('practice-ch4.html','_blank')">
      <div class="plab-icon">🏙️</div>
      <div class="plab-title">Ch 4: Japanese Cities</div>
      <div class="plab-desc">Locations, directions, transportation, and describing towns and buildings.</div>
      <div class="plab-tag">CHAPTER 4</div>
    </div>
    <div class="plab-card" onclick="window.open('practice-ch5.html','_blank')">
      <div class="plab-icon">🏠</div>
      <div class="plab-title">Ch 5: Japanese Homes</div>
      <div class="plab-desc">Furniture, rooms, location nouns (上/下/中), and describing spaces.</div>
      <div class="plab-tag">CHAPTER 5</div>
    </div>
    <div class="plab-card" onclick="window.open('practice-ch6.html','_blank')">
      <div class="plab-icon">🎮</div>
      <div class="plab-title">Ch 6: Leisure Time</div>
      <div class="plab-desc">Hobbies, invitations, past tense, and weekend activities vocabulary.</div>
      <div class="plab-tag">CHAPTER 6</div>
    </div>
    <div class="plab-card" onclick="window.open('quiz-katakana.html','_blank')">
      <div class="plab-icon">🎯</div>
      <div class="plab-title">Quiz: Katakana</div>
      <div class="plab-desc">Full katakana recognition quiz covering all basic, dakuten, and combination characters.</div>
      <div class="plab-tag">QUIZ</div>
    </div>
    <div class="plab-card" onclick="window.open('quiz-ch5-vocab.html','_blank')">
      <div class="plab-icon">📝</div>
      <div class="plab-title">Quiz: Ch5 Vocabulary</div>
      <div class="plab-desc">Focused vocabulary quiz for Chapter 5 — Japanese homes, location words, and descriptions.</div>
      <div class="plab-tag">QUIZ</div>
    </div>
    <div class="plab-card" onclick="window.open('week12-study-pack.html','_blank')">
      <div class="plab-icon">📦</div>
      <div class="plab-title">Week 12 Study Pack</div>
      <div class="plab-desc">Comprehensive review pack covering multiple chapters for week 12 preparation.</div>
      <div class="plab-tag">STUDY PACK</div>
    </div>
  </div>
</div>
`;

// Insert before the closing </div> that precedes <script>
html = html.replace('</div><script>const CHAPTER_DATA', practiceLabPanel + '</div><script>const CHAPTER_DATA');

// ═══ 4. ADD AUTO-PLAY + HOVER TOOLTIP JS before closing </script></body> ═══
const newJS = `

// ═══ AUTO-PLAY SYSTEM ═══
let autoPlay = { on: false, speed: 4.0, timer: null, phase: 'front', elapsed: 0 };

function getAutoPlayBarHTML() {
  return \`<div class="autoplay-bar" id="autoplayBar">
    <label>AUTO</label>
    <div class="autoplay-toggle">
      <input type="checkbox" id="autoToggle" onchange="toggleAutoPlay(this.checked)" \${autoPlay.on ? 'checked' : ''}>
      <span class="slider"></span>
    </div>
    <label>SPEED</label>
    <input type="range" class="speed-slider" id="speedSlider" min="1" max="10" step="0.5" value="\${autoPlay.speed}" oninput="setAutoSpeed(this.value)">
    <span class="speed-val" id="speedVal">\${autoPlay.speed.toFixed(1)}s</span>
    <span class="autoplay-hint">Press A to toggle</span>
  </div>\`;
}

function toggleAutoPlay(on) {
  autoPlay.on = on;
  clearAutoTimer();
  const toggle = document.getElementById('autoToggle');
  if (toggle && toggle.checked !== on) toggle.checked = on;
  if (on) startAutoTimer();
}

function setAutoSpeed(val) {
  autoPlay.speed = parseFloat(val);
  const sv = document.getElementById('speedVal');
  if (sv) sv.textContent = autoPlay.speed.toFixed(1) + 's';
  if (autoPlay.on) { clearAutoTimer(); startAutoTimer(); }
}

function clearAutoTimer() {
  if (autoPlay.timer) { clearInterval(autoPlay.timer); autoPlay.timer = null; }
  autoPlay.elapsed = 0;
  const ring = document.getElementById('countdownRing');
  if (ring) ring.remove();
}

function startAutoTimer() {
  if (!autoPlay.on) return;
  autoPlay.elapsed = 0;
  autoPlay.phase = 'front';
  showCountdownRing();
  autoPlay.timer = setInterval(() => {
    autoPlay.elapsed += 0.1;
    updateCountdownRing();
    if (autoPlay.elapsed >= autoPlay.speed) {
      autoPlay.elapsed = 0;
      autoAdvance();
    }
  }, 100);
}

function autoAdvance() {
  // Find any visible "Got it" / check / flip button and click it
  if (autoPlay.phase === 'front') {
    // Look for answer reveal buttons (Check, Show Answer, flip)
    const checkBtns = document.querySelectorAll('.pcard button, .card button');
    for (const btn of checkBtns) {
      const t = btn.textContent.toLowerCase();
      if (t.includes('check') || t.includes('show') || t.includes('reveal') || t.includes('flip')) {
        btn.click();
        autoPlay.phase = 'back';
        autoPlay.elapsed = 0;
        updateCountdownRing();
        return;
      }
    }
    // If no flip button, try advancing directly
    autoPlay.phase = 'back';
    autoPlay.elapsed = 0;
  }

  if (autoPlay.phase === 'back') {
    // Click "Got it" (grade 2 = Good)
    const btns = document.querySelectorAll('button');
    for (const btn of btns) {
      const t = btn.textContent.toLowerCase();
      if (t.includes('got it') || t.includes('good') || t.includes('next') || t.includes('correct')) {
        btn.click();
        autoPlay.phase = 'front';
        autoPlay.elapsed = 0;
        updateCountdownRing();
        return;
      }
    }
    autoPlay.phase = 'front';
    autoPlay.elapsed = 0;
  }
}

function showCountdownRing() {
  let ring = document.getElementById('countdownRing');
  if (ring) ring.remove();
  // Find the current practice card container
  const pcard = document.querySelector('.pcard') || document.querySelector('.card.center');
  if (!pcard) return;
  const parent = pcard.closest('.chapter-panel') || pcard.parentElement;
  if (!parent) return;
  parent.style.position = 'relative';

  ring = document.createElement('div');
  ring.id = 'countdownRing';
  ring.className = 'countdown-ring-wrap';
  const r = 19, c = 2 * Math.PI * r;
  ring.innerHTML = \`<svg viewBox="0 0 48 48">
    <circle class="ring-bg" cx="24" cy="24" r="\${r}"/>
    <circle class="ring-fg \${autoPlay.phase === 'front' ? 'ring-front' : 'ring-back'}" id="ringFg" cx="24" cy="24" r="\${r}" stroke-dasharray="\${c}" stroke-dashoffset="0"/>
  </svg><div class="countdown-num" id="ringNum">\${autoPlay.speed.toFixed(1)}</div>\`;
  parent.prepend(ring);
}

function updateCountdownRing() {
  const fg = document.getElementById('ringFg');
  const num = document.getElementById('ringNum');
  if (!fg || !num) { showCountdownRing(); return; }
  const r = 19, c = 2 * Math.PI * r;
  const pct = autoPlay.elapsed / autoPlay.speed;
  fg.setAttribute('stroke-dashoffset', (c * (1 - pct)).toString());
  fg.className.baseVal = 'ring-fg ' + (autoPlay.phase === 'front' ? 'ring-front' : 'ring-back');
  const remaining = Math.max(0, autoPlay.speed - autoPlay.elapsed);
  num.textContent = remaining.toFixed(1);
}

// Reset auto-timer on manual interaction
function resetAutoOnManual() {
  if (autoPlay.on) {
    clearAutoTimer();
    autoPlay.phase = 'front';
    startAutoTimer();
  }
}

// ═══ HOVER TOOLTIP SYSTEM ═══
let tooltipEl = null;
let tooltipTimeout = null;

function initTooltipSystem() {
  tooltipEl = document.createElement('div');
  tooltipEl.className = 'jp-tooltip';
  tooltipEl.id = 'jpTooltip';
  document.body.appendChild(tooltipEl);

  // Attach hover events to all Japanese text elements
  document.addEventListener('mouseover', handleJPHover);
  document.addEventListener('mouseout', handleJPOut);
  document.addEventListener('touchstart', handleJPTouch, { passive: true });
}

function handleJPHover(e) {
  const target = e.target.closest('.ja, [lang="ja"], .handwritten');
  if (!target) return;
  const text = target.textContent.trim();
  if (!text || text.length > 40) return;
  // Check if it contains Japanese characters
  if (!/[\\u3040-\\u309F\\u30A0-\\u30FF\\u4E00-\\u9FFF\\u3400-\\u4DBF]/.test(text)) return;

  clearTimeout(tooltipTimeout);
  tooltipTimeout = setTimeout(() => showTooltip(target, text, e), 300);
}

function handleJPOut(e) {
  clearTimeout(tooltipTimeout);
  // Don't hide if moving to tooltip itself
  const related = e.relatedTarget;
  if (related && (related.closest('.jp-tooltip') || related.closest('.tt-speak'))) return;
  tooltipTimeout = setTimeout(() => hideTooltip(), 200);
}

function handleJPTouch(e) {
  const target = e.target.closest('.ja, [lang="ja"], .handwritten');
  if (!target) { hideTooltip(); return; }
  const text = target.textContent.trim();
  if (!text || text.length > 40 || !/[\\u3040-\\u309F\\u30A0-\\u30FF\\u4E00-\\u9FFF\\u3400-\\u4DBF]/.test(text)) return;
  showTooltip(target, text, e.touches[0]);
}

function showTooltip(target, text, event) {
  const info = lookupWord(text);
  if (!info) return;

  let html = '<div class="tt-jp">' + escHTML(info.japanese) + '</div>';
  if (info.reading) html += '<div class="tt-reading">' + escHTML(info.reading) + '</div>';
  if (info.english) html += '<div class="tt-en">' + escHTML(info.english) + '</div>';
  if (info.katakana) html += '<div class="tt-katakana">カタカナ: ' + escHTML(info.katakana) + '</div>';
  if (info.example) html += '<div class="tt-example">' + escHTML(info.example) + '</div>';
  html += '<button class="tt-speak" onmousedown="event.stopPropagation();speakJP(\\''+info.japanese.replace(/'/g,"\\\\'")+'\\')">🔊 Listen</button>';

  tooltipEl.innerHTML = html;
  tooltipEl.classList.add('visible');

  // Position near the element
  const rect = target.getBoundingClientRect();
  let left = rect.left;
  let top = rect.bottom + 8;

  // Keep in viewport
  const tw = tooltipEl.offsetWidth || 280;
  const th = tooltipEl.offsetHeight || 200;
  if (left + tw > window.innerWidth - 10) left = window.innerWidth - tw - 10;
  if (left < 10) left = 10;
  if (top + th > window.innerHeight - 10) top = rect.top - th - 8;

  tooltipEl.style.left = left + 'px';
  tooltipEl.style.top = top + 'px';
}

function hideTooltip() {
  if (tooltipEl) tooltipEl.classList.remove('visible');
}

function escHTML(s) { return s.replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// Build a vocab lookup dictionary from all chapter data
let vocabDict = null;
function buildVocabDict() {
  vocabDict = {};
  if (typeof CHAPTER_DATA === 'undefined') return;
  for (const ch in CHAPTER_DATA) {
    const d = CHAPTER_DATA[ch];
    if (!d || !d.vocab) continue;
    d.vocab.forEach(v => {
      const key = v.japanese.replace(/[（）()～、]/g, '').trim();
      vocabDict[key] = v;
      // Also map partial matches
      if (key.length > 1) {
        for (let i = 1; i < key.length; i++) {
          const sub = key.substring(0, i + 1);
          if (!vocabDict[sub]) vocabDict[sub] = v;
        }
      }
    });
  }
}

function lookupWord(text) {
  if (!vocabDict) buildVocabDict();
  const clean = text.replace(/[（）()～、。！？\\s]/g, '').trim();
  if (!clean) return null;

  // Exact match
  if (vocabDict[clean]) {
    const v = vocabDict[clean];
    return {
      japanese: v.japanese,
      reading: v.reading || '',
      english: v.english || '',
      katakana: toKatakana(v.japanese),
      example: findExample(v.japanese)
    };
  }

  // Try longest prefix match
  for (let len = clean.length; len >= 2; len--) {
    const prefix = clean.substring(0, len);
    if (vocabDict[prefix]) {
      const v = vocabDict[prefix];
      return {
        japanese: v.japanese,
        reading: v.reading || '',
        english: v.english || '',
        katakana: toKatakana(v.japanese),
        example: findExample(v.japanese)
      };
    }
  }

  // Fallback: just show the text with TTS
  return {
    japanese: text,
    reading: '',
    english: '(not in vocabulary)',
    katakana: toKatakana(text),
    example: ''
  };
}

function toKatakana(str) {
  return [...str].map(ch => {
    const cp = ch.codePointAt(0);
    if (cp >= 0x3041 && cp <= 0x3096) return String.fromCodePoint(cp + 0x60);
    return ch;
  }).join('');
}

function findExample(jp) {
  if (typeof CHAPTER_DATA === 'undefined') return '';
  for (const ch in CHAPTER_DATA) {
    const d = CHAPTER_DATA[ch];
    if (!d || !d.dialogues) continue;
    for (const dlg of d.dialogues) {
      for (const line of dlg.lines || []) {
        if (line.jp && line.jp.includes(jp)) {
          return line.jp + ' — ' + line.en;
        }
      }
    }
  }
  return '';
}

// ═══ KEYBOARD SHORTCUTS ═══
document.addEventListener('keydown', function(e) {
  // A = toggle auto-play
  if (e.key === 'a' || e.key === 'A') {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    toggleAutoPlay(!autoPlay.on);
    e.preventDefault();
  }
  // Space = manual override (reset auto timer)
  if (e.key === ' ') {
    resetAutoOnManual();
  }
  // 1-4 grading keys reset timer
  if (['1','2','3','4'].includes(e.key)) {
    resetAutoOnManual();
  }
});

// Close tooltip on scroll or click elsewhere
document.addEventListener('scroll', hideTooltip, true);
document.addEventListener('click', function(e) {
  if (!e.target.closest('.jp-tooltip') && !e.target.closest('.ja') && !e.target.closest('[lang="ja"]')) {
    hideTooltip();
  }
});

// ═══ INIT ENHANCEMENTS ═══
setTimeout(initTooltipSystem, 500);

// Inject autoplay bar into practice panels when they activate
const origToggleView = toggleView;
toggleView = function(ch, view) {
  origToggleView(ch, view);
  if (view === 'practice') {
    setTimeout(() => {
      const area = document.getElementById('area_' + ch);
      if (area && !document.getElementById('autoplayBar')) {
        area.insertAdjacentHTML('beforebegin', getAutoPlayBarHTML());
      }
    }, 100);
  }
};
`;

// Insert before the closing </script>
html = html.replace(/showChapter\('ch1'\);\s*<\/script>/, "showChapter('ch1');\n" + newJS + '\n</script>');

writeFileSync(file, html, 'utf-8');
console.log('Patched successfully! File size:', (html.length / 1024).toFixed(0), 'KB');

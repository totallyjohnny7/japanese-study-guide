/**
 * Patch: Add missing flashcard mode + autoplay system to all quiz files,
 *        and extend autoplay speed range to 0.5–30s across all files.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { readdirSync } from 'fs';

const pubDir = join(import.meta.dirname, 'public');

// ─── CSS block for autoplay + countdown ring ───
const autoplayCSS = `
/* ═══ AUTOPLAY ═══ */
.autoplay-bar{display:flex;align-items:center;gap:10px;padding:9px 14px;background:var(--surface);border:1px solid var(--border);border-radius:10px;margin-bottom:14px;flex-wrap:wrap;}
.autoplay-bar label{font-size:11px;font-weight:700;color:var(--muted);letter-spacing:1px;text-transform:uppercase;}
.ap-toggle{position:relative;width:40px;height:22px;flex-shrink:0;}.ap-toggle input{opacity:0;width:0;height:0;}
.ap-toggle .ap-slider{position:absolute;inset:0;background:var(--border);border-radius:22px;cursor:pointer;transition:.3s;}
.ap-toggle .ap-slider::before{content:'';position:absolute;height:16px;width:16px;left:3px;bottom:3px;background:var(--muted);border-radius:50%;transition:.3s;}
.ap-toggle input:checked+.ap-slider{background:var(--green);}
.ap-toggle input:checked+.ap-slider::before{transform:translateX(18px);background:#fff;}
.ap-speed{-webkit-appearance:none;appearance:none;width:90px;height:4px;background:var(--border);border-radius:4px;outline:none;}
.ap-speed::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:var(--accent);cursor:pointer;}
.ap-val{font-size:12px;color:var(--accent);font-weight:700;min-width:30px;}
.ap-hint{font-size:10px;color:var(--dim);margin-left:auto;}
.cring{position:absolute;top:10px;right:10px;width:46px;height:46px;z-index:10;}
.cring svg{width:46px;height:46px;transform:rotate(-90deg);}
.cring .rbg{fill:none;stroke:var(--border);stroke-width:3;}
.cring .rfg{fill:none;stroke-width:3;stroke-linecap:round;transition:stroke-dashoffset .1s linear;}
.cring .rfg.rfront{stroke:#9b59b6;}.cring .rfg.rback{stroke:var(--green);}
.cring-num{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--text);}
@media(max-width:600px){.autoplay-bar{gap:8px;padding:8px 12px;}.ap-hint{display:none;}}
`;

// ─── JS block: autoplay state + flashcard mode + autoplay timer + keyboard shortcuts ───
const flashcardAndAutoplayJS = `
// ═══════════════════════════
// 🃏 FLASHCARD + AUTOPLAY
// ═══════════════════════════
let autoPlay={on:false,speed:4.0,timer:null,phase:'front',elapsed:0};
let fCards=[],fIdx=0,fScore=0,fResults=[];

function getAutoplayBarHTML(){
  return \`<div class="autoplay-bar">
    <label>AUTO</label>
    <label class="ap-toggle"><input type="checkbox" id="apToggle" onchange="toggleAutoPlay(this.checked)"\${autoPlay.on?' checked':''}><span class="ap-slider"></span></label>
    <label>SPEED</label>
    <input type="range" class="ap-speed" id="apSlider" min="0.5" max="30" step="0.5" value="\${autoPlay.speed}" oninput="setAutoSpeed(this.value)">
    <span class="ap-val" id="apVal">\${autoPlay.speed.toFixed(1)}s</span>
    <span class="ap-hint">A=auto · Space=flip · 1=✅ · 2=❌</span>
  </div>\`;
}

function renderFlash(el){fCards=shuffle(DATA.vocab);fIdx=0;fScore=0;fResults=[];showFlashFront(el);}

function showFlashFront(el){
  if(fIdx>=fCards.length)return showFlashResults(el);
  const c=fCards[fIdx];
  el.innerHTML=\`
    <div class="flex-between mb8">
      <span style="color:var(--muted);font-size:12px">\${fIdx+1}/\${fCards.length}</span>
      <span style="color:var(--green);font-size:12px;font-weight:700">\${fScore} correct</span>
    </div>
    <div class="progress-bar"><div class="progress-fill" style="width:\${((fIdx+1)/fCards.length)*100}%"></div></div>
    \${getAutoplayBarHTML()}
    <div class="card center" style="position:relative;min-height:160px">
      <div style="color:var(--muted);font-size:11px;margin-bottom:8px;letter-spacing:2px;text-transform:uppercase">What is the Japanese for:</div>
      <div style="font-size:34px;font-weight:700;color:#fff;margin-bottom:20px">\${esc(c.english)}</div>
      <button class="btn" style="background:linear-gradient(135deg,#8b6d1e,var(--accent))" onclick="showFlashBack($('mainArea'))">👁 Show Answer</button>
    </div>\`;
  clearAPTimer();if(autoPlay.on)startAPTimer();
}

function showFlashBack(el){
  autoPlay.phase='back';autoPlay.elapsed=0;
  const c=fCards[fIdx];
  speakJP(c.japanese);
  el.innerHTML=\`
    <div class="flex-between mb8">
      <span style="color:var(--muted);font-size:12px">\${fIdx+1}/\${fCards.length}</span>
      <span style="color:var(--green);font-size:12px;font-weight:700">\${fScore} correct</span>
    </div>
    <div class="progress-bar"><div class="progress-fill" style="width:\${((fIdx+1)/fCards.length)*100}%"></div></div>
    \${getAutoplayBarHTML()}
    <div class="card center slide-up" style="position:relative;min-height:160px">
      <div style="color:var(--muted);font-size:11px;margin-bottom:4px;letter-spacing:2px;text-transform:uppercase">Answer</div>
      <div class="handwritten" style="font-size:52px">\${c.japanese}</div>
      <div style="color:var(--accent2);font-size:13px;margin-top:8px">\${c.reading}</div>
    </div>
    <div class="gap8 mt8">
      <button class="btn" style="background:var(--green);padding:11px 28px" onclick="flashGrade(true)">✅ Got it</button>
      <button class="btn" style="background:var(--red);padding:11px 28px" onclick="flashGrade(false)">❌ Missed</button>
    </div>\`;
  if(autoPlay.on)showAPRing();
}

function flashGrade(ok){
  if(ok)fScore++;
  fResults.push({...fCards[fIdx],correct:ok});
  fIdx++;
  if(autoPlay.on){
    autoPlay.speed=ok?Math.max(0.5,parseFloat((autoPlay.speed-.5).toFixed(1))):Math.min(30.0,parseFloat((autoPlay.speed+.5).toFixed(1)));
    const sv=document.getElementById('apVal');if(sv)sv.textContent=autoPlay.speed.toFixed(1)+'s';
    const sl=document.getElementById('apSlider');if(sl)sl.value=autoPlay.speed;
  }
  showFlashFront($('mainArea'));
}

function showFlashResults(el){
  clearAPTimer();
  const pct=Math.round((fScore/fCards.length)*100);
  const missed=fResults.filter(r=>!r.correct);
  el.innerHTML=\`
    <div class="center" style="margin-bottom:20px">
      <div style="font-size:48px">\${pct>=80?'🎉':pct>=50?'📝':'💪'}</div>
      <div style="font-size:32px;font-weight:700">\${fScore}/\${fCards.length}</div>
      <div style="color:var(--muted);font-size:14px">\${pct}%</div>
    </div>
    \${fResults.map(r=>\`<div class="result-row" style="border-left:3px solid \${r.correct?'var(--green)':'var(--red)'}"><div><span style="color:#fff;font-size:13px">\${esc(r.english)}</span><span style="color:var(--dim);font-size:11px;margin-left:8px">→ \${r.japanese}</span></div><div style="color:\${r.correct?'var(--green)':'var(--red)'}">\${r.correct?'✓':'✗'}</div></div>\`).join('')}
    \${missed.length?\`<button class="btn w100 mt8" style="background:var(--red)" onclick="reReviewMissed($('mainArea'))">🔁 Re-review Missed (\${missed.length})</button>\`:''}
    <button class="btn w100 mt8" style="background:linear-gradient(135deg,#8b6d1e,var(--accent))" onclick="renderFlash($('mainArea'))">🔄 Restart All</button>\`;
}

function reReviewMissed(el){
  const missed=fResults.filter(r=>!r.correct).map(r=>({english:r.english,japanese:r.japanese,reading:r.reading}));
  fCards=shuffle(missed);fIdx=0;fScore=0;fResults=[];
  showFlashFront(el);
}

// ═══ AUTOPLAY TIMER ═══
function toggleAutoPlay(on){autoPlay.on=on;clearAPTimer();const t=document.getElementById('apToggle');if(t&&t.checked!==on)t.checked=on;if(on)startAPTimer();}
function setAutoSpeed(val){autoPlay.speed=parseFloat(val);const sv=document.getElementById('apVal');if(sv)sv.textContent=autoPlay.speed.toFixed(1)+'s';if(autoPlay.on){clearAPTimer();startAPTimer();}}
function clearAPTimer(){if(autoPlay.timer){clearInterval(autoPlay.timer);autoPlay.timer=null;}autoPlay.elapsed=0;const r=document.getElementById('apRing');if(r)r.remove();}
function startAPTimer(){if(!autoPlay.on)return;autoPlay.elapsed=0;autoPlay.phase='front';showAPRing();autoPlay.timer=setInterval(()=>{autoPlay.elapsed+=0.1;updateAPRing();if(autoPlay.elapsed>=autoPlay.speed){autoPlay.elapsed=0;apAdvance();}},100);}
function apAdvance(){
  if(autoPlay.phase==='front'){
    const btns=document.querySelectorAll('#mainArea button');
    for(const b of btns){const t=b.textContent.toLowerCase();if(t.includes('check')||t.includes('show')||t.includes('reveal')){if(b.disabled){const m=b.id&&b.id.match(/^wCheck_?(.*)$/);if(m&&typeof wCheckAnswer==='function')wCheckAnswer(m[1]||undefined);}else b.click();autoPlay.phase='back';autoPlay.elapsed=0;updateAPRing();return;}}
    autoPlay.phase='back';autoPlay.elapsed=0;
  }
  if(autoPlay.phase==='back'){
    const btns=document.querySelectorAll('button');
    for(const b of btns){const t=b.textContent.toLowerCase();if(t.includes('got it')||t.includes('next')||t.includes('correct')){b.click();autoPlay.phase='front';autoPlay.elapsed=0;updateAPRing();return;}}
    autoPlay.phase='front';autoPlay.elapsed=0;
  }
}
function showAPRing(){let r=document.getElementById('apRing');if(r)r.remove();const card=document.querySelector('.card.center');if(!card)return;card.style.position='relative';r=document.createElement('div');r.id='apRing';r.className='cring';const cr=19,cc=2*Math.PI*cr;r.innerHTML=\`<svg viewBox="0 0 48 48"><circle class="rbg" cx="24" cy="24" r="\${cr}"/><circle class="rfg \${autoPlay.phase==='front'?'rfront':'rback'}" id="ringFg" cx="24" cy="24" r="\${cr}" stroke-dasharray="\${cc}" stroke-dashoffset="0"/></svg><div class="cring-num" id="ringNum">\${autoPlay.speed.toFixed(1)}</div>\`;card.prepend(r);}
function updateAPRing(){const fg=document.getElementById('ringFg');const num=document.getElementById('ringNum');if(!fg||!num){showAPRing();return;}const cr=19,cc=2*Math.PI*cr;fg.setAttribute('stroke-dashoffset',(cc*(1-autoPlay.elapsed/autoPlay.speed)).toString());fg.className.baseVal='rfg '+(autoPlay.phase==='front'?'rfront':'rback');num.textContent=Math.max(0,autoPlay.speed-autoPlay.elapsed).toFixed(1);}

// Keyboard shortcuts for flashcard mode
document.addEventListener('keydown',e=>{
  if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')return;
  if(e.key==='a'||e.key==='A')toggleAutoPlay(!autoPlay.on);
  if(e.key==='1'){const b=document.querySelector('.btn[onclick*="flashGrade(true)"]');if(b)flashGrade(true);}
  if(e.key==='2'){const b=document.querySelector('.btn[onclick*="flashGrade(false)"]');if(b)flashGrade(false);}
  if(e.key===' '||e.key==='ArrowRight'){const b=document.querySelector('.btn[onclick*="showFlashBack"]');if(b){e.preventDefault();showFlashBack($('mainArea'));}}
});
`;

// ─── Patch quiz files ───
const quizFiles = readdirSync(pubDir).filter(f => f.startsWith('quiz-') && f.endsWith('.html'));
let patched = 0;

for (const file of quizFiles) {
  const path = join(pubDir, file);
  let html = readFileSync(path, 'utf8');

  // Skip if already patched
  if (html.includes('function renderFlash')) {
    console.log(`  SKIP ${file} — already has renderFlash`);
    continue;
  }

  // 1. Inject autoplay CSS before </style>
  if (!html.includes('.autoplay-bar')) {
    html = html.replace('</style>', autoplayCSS + '\n</style>');
  }

  // 2. Inject JS before the closing </script> tag (the last one)
  const lastScriptClose = html.lastIndexOf('</script>');
  if (lastScriptClose === -1) {
    console.log(`  WARN ${file} — no </script> found, skipping`);
    continue;
  }
  html = html.substring(0, lastScriptClose) + '\n' + flashcardAndAutoplayJS + '\n' + html.substring(lastScriptClose);

  writeFileSync(path, html, 'utf8');
  console.log(`  ✅ ${file} — patched (flashcard + autoplay added)`);
  patched++;
}

// ─── Extend speed range in practice files ───
const practiceFiles = readdirSync(pubDir).filter(f => f.startsWith('practice-') && f.endsWith('.html'));
let speedPatched = 0;

for (const file of [...practiceFiles, ...quizFiles]) {
  const path = join(pubDir, file);
  let html = readFileSync(path, 'utf8');
  let changed = false;

  // Update slider min from 1 to 0.5
  if (html.includes('min="1" max="10"')) {
    html = html.replaceAll('min="1" max="10"', 'min="0.5" max="30"');
    changed = true;
  }
  // Also catch the new quiz files that already got min="0.5" max="30" from the JS injection
  // but have old practice file ranges

  // Update speed clamp: max 8.0 → 30.0, min 1.0 → 0.5
  if (html.includes('Math.max(1.0,')) {
    html = html.replaceAll('Math.max(1.0,', 'Math.max(0.5,');
    changed = true;
  }
  if (html.includes('Math.min(8.0,')) {
    html = html.replaceAll('Math.min(8.0,', 'Math.min(30.0,');
    changed = true;
  }

  if (changed) {
    writeFileSync(path, html, 'utf8');
    console.log(`  🔧 ${file} — speed range extended to 0.5–30s`);
    speedPatched++;
  }
}

// ─── Also extend speed range in index.html ───
{
  const idxPath = join(pubDir, 'index.html');
  let html = readFileSync(idxPath, 'utf8');
  let changed = false;

  // Slider range
  if (html.includes('min="1" max="10"')) {
    html = html.replaceAll('min="1" max="10"', 'min="0.5" max="30"');
    changed = true;
  }
  // Speed clamps
  if (html.includes('Math.max(1.0,')) {
    html = html.replaceAll('Math.max(1.0,', 'Math.max(0.5,');
    changed = true;
  }
  if (html.includes('Math.min(8.0,')) {
    html = html.replaceAll('Math.min(8.0,', 'Math.min(30.0,');
    changed = true;
  }

  if (changed) {
    writeFileSync(idxPath, html, 'utf8');
    console.log(`  🔧 index.html — speed range extended to 0.5–30s`);
  }
}

console.log(`\nDone! Patched ${patched} quiz files, updated speed range in ${speedPatched} files + index.html`);

/**
 * Patch v2: Update flashcard swipe + UX
 *  - Front card: tap to reveal (no swipe)
 *  - Back card: swipe right=PASS (green), left=MISS (red)
 *  - Mobile: full-screen card via #mainArea.flash-active
 *  - fRound tracking: "redo missed" loops with round counter + "All mastered ✓"
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const pubDir = join(import.meta.dirname, 'public');

// ── Old swipe blocks to find and replace ──────────────────────────────────
const OLD_CSS_MARKER = '/* ═══ SWIPE ═══ */';
const OLD_JS_MARKER  = '// ═══ SWIPE GESTURES ═══';

// ── New swipe CSS ──────────────────────────────────────────────────────────
const NEW_SWIPE_CSS = `
/* ═══ SWIPE v2 ═══ */
.swipe-ov{position:absolute;inset:0;border-radius:inherit;opacity:0;pointer-events:none;display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:900;letter-spacing:2px;user-select:none;}
.swipe-pass{background:rgba(46,204,113,.28);color:#2ecc71;}
.swipe-fail{background:rgba(231,76,60,.28);color:#e74c3c;}
.swipe-hint{display:none;position:absolute;bottom:10px;left:0;right:0;text-align:center;font-size:11px;color:var(--dim,#555);letter-spacing:1.5px;pointer-events:none;}
@media(hover:none){
  .swipe-hint{display:block;}
  #mainArea.flash-active{position:fixed;inset:0;z-index:50;overflow-y:auto;background:var(--bg,#0d0d14);padding:12px 16px;box-sizing:border-box;}
  #mainArea.flash-active .card.center{min-height:58vh;cursor:pointer;border-radius:16px;}
}
`;

// ── New swipe JS ──────────────────────────────────────────────────────────
const NEW_SWIPE_JS = `
// ═══ SWIPE GESTURES v2 ═══
(function(){
  const THR=75;
  function attachSwipe(card){
    if(card._sw)return;card._sw=true;
    card.style.position='relative';card.style.overflow='hidden';
    const ov=document.createElement('div');ov.className='swipe-ov';card.appendChild(ov);
    const hint=document.createElement('div');hint.className='swipe-hint';card.appendChild(hint);
    const isBack=()=>!!document.querySelector('#mainArea .btn[onclick*="flashGrade"]');
    hint.textContent=isBack()?'← miss · pass →':'tap to reveal';

    // tap-to-reveal on front card
    card.addEventListener('click',e=>{
      if(e.target.closest('button'))return;
      if(!isBack()&&typeof showFlashBack==='function')showFlashBack(document.getElementById('mainArea'));
    });

    let sx=0,sy=0,dx=0,live=false;
    card.addEventListener('touchstart',e=>{sx=e.touches[0].clientX;sy=e.touches[0].clientY;dx=0;live=true;},{passive:true});
    card.addEventListener('touchmove',e=>{
      if(!live)return;
      dx=e.touches[0].clientX-sx;
      const dy=Math.abs(e.touches[0].clientY-sy);
      if(dy>Math.abs(dx)*1.3){live=false;card.style.transform='';ov.style.opacity=0;return;}
      if(!isBack()){live=false;return;} // front: tap only, no swipe
      card.style.transform='translateX('+dx+'px) rotate('+(dx*0.04)+'deg)';
      const p=Math.min(Math.abs(dx)/THR,1);ov.style.opacity=p;
      if(dx>0){ov.className='swipe-ov swipe-pass';ov.textContent='✓ PASS';}
      else{ov.className='swipe-ov swipe-fail';ov.textContent='✗ MISS';}
    },{passive:true});
    card.addEventListener('touchend',()=>{
      if(!live){dx=0;return;}live=false;
      if(isBack()&&Math.abs(dx)>=THR){
        card.style.transition='transform .18s ease';
        card.style.transform='translateX('+(dx>0?500:-500)+'px) rotate('+(dx>0?25:-25)+'deg)';
        const grade=dx>0;setTimeout(()=>flashGrade(grade),180);
      } else {
        card.style.transition='transform .22s ease';card.style.transform='';ov.style.opacity=0;
        setTimeout(()=>{if(card.style)card.style.transition='';},230);
      }
      dx=0;
    },{passive:true});
  }

  const obs=new MutationObserver(()=>{
    const c=document.querySelector('#mainArea .card.center');
    const m=document.getElementById('mainArea');
    if(c){attachSwipe(c);if(m)m.classList.add('flash-active');}
    else{if(m)m.classList.remove('flash-active');}
  });
  document.addEventListener('DOMContentLoaded',()=>{
    const m=document.getElementById('mainArea');
    if(m){
      obs.observe(m,{childList:true,subtree:true});
      const c=document.querySelector('#mainArea .card.center');
      if(c){attachSwipe(c);m.classList.add('flash-active');}
    }
  });
})();
`;

// ── fRound replacements ────────────────────────────────────────────────────
const fRoundPatches = [
  // 1. Add fRound to variable declaration
  {
    from: 'let fCards=[],fIdx=0,fScore=0,fResults=[];',
    to:   'let fCards=[],fIdx=0,fScore=0,fResults=[],fRound=1;',
  },
  // 2. Reset fRound in renderFlash
  {
    from: 'fResults=[];showFlashFront(el);}',
    to:   'fResults=[];fRound=1;showFlashFront(el);}',
    // Only the renderFlash one-liner ends this way; reReviewMissed ends with showFlashFront(el);\n}
  },
  // 3. Increment fRound in reReviewMissed (both inline and newline forms)
  {
    from: 'fCards=shuffle(missed);fIdx=0;fScore=0;fResults=[];\n  showFlashFront(el);',
    to:   'fCards=shuffle(missed);fIdx=0;fScore=0;fResults=[];fRound++;\n  showFlashFront(el);',
  },
  {
    from: 'fCards=shuffle(missed);fIdx=0;fScore=0;fResults=[];showFlashFront(el);}',
    to:   'fCards=shuffle(missed);fIdx=0;fScore=0;fResults=[];fRound++;showFlashFront(el);}',
  },
  // 4. Update showFlashResults: emoji + round label + all-mastered
  {
    from: `<div style="font-size:48px">\${pct>=80?'🎉':pct>=50?'📝':'💪'}</div>
      <div style="font-size:32px;font-weight:700">\${fScore}/\${fCards.length}</div>
      <div style="color:var(--muted);font-size:14px">\${pct}%</div>
    </div>`,
    to:   `<div style="font-size:48px">\${fRound>1&&!missed.length?'🏆':pct>=80?'🎉':pct>=50?'📝':'💪'}</div>
      \${fRound>1?'<div style="color:var(--muted);font-size:11px;margin-bottom:2px">Round '+fRound+'</div>':''}<div style="font-size:32px;font-weight:700">\${fScore}/\${fCards.length}</div>
      <div style="color:var(--muted);font-size:14px">\${pct}%</div>
      \${fRound>1&&!missed.length?'<div style="color:var(--green);font-weight:700;margin-top:6px">All mastered ✓</div>':''}
    </div>`,
  },
  // 5. Update re-review button label
  {
    from: `🔁 Re-review Missed (\${missed.length})`,
    to:   `🔁 Redo Missed (\${missed.length})`,
  },
];

// ── Process all HTML files ─────────────────────────────────────────────────
const allFiles = readdirSync(pubDir).filter(f => f.endsWith('.html'));
let updated = 0;

for (const file of allFiles) {
  const path = join(pubDir, file);
  let html = readFileSync(path, 'utf8');

  if (!html.includes('showFlashBack') && !html.includes('function renderFlash')) continue;

  let changed = false;

  // Replace old swipe CSS block
  if (html.includes(OLD_CSS_MARKER)) {
    // Find the block: from OLD_CSS_MARKER to the line ending .swipe-hint{...}
    const start = html.indexOf(OLD_CSS_MARKER);
    // Find a safe end: the first occurrence of '\n</style>' after the marker
    // We just need to excise everything from the marker up to (but not including) the closing tag.
    // Strategy: replace '\n' + OLD_CSS_MARKER + everything up to '.swipe-hint' last rule end
    // Simpler: use a regex
    html = html.replace(/\/\* ═══ SWIPE ═══ \*\/[\s\S]*?\.swipe-hint\{[^}]+\}\n/, NEW_SWIPE_CSS.trimStart() + '\n');
    changed = true;
  }

  // Replace old swipe JS block
  if (html.includes(OLD_JS_MARKER)) {
    html = html.replace(/\/\/ ═══ SWIPE GESTURES ═══\n[\s\S]*?\}\)\(\);\n/, NEW_SWIPE_JS.trimStart() + '\n');
    changed = true;
  }

  // Apply fRound patches (only if not already patched)
  if (!html.includes('fRound')) {
    for (const { from, to } of fRoundPatches) {
      if (html.includes(from)) {
        html = html.replace(from, to);
        changed = true;
      }
    }
  }

  if (changed) {
    writeFileSync(path, html, 'utf8');
    console.log(`  ✅ ${file}`);
    updated++;
  } else {
    console.log(`  -- ${file} (no changes)`);
  }
}

console.log(`\nDone! Updated ${updated} files.`);

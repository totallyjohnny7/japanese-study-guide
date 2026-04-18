/**
 * Patch: Add mobile swipe gestures to all flashcard HTML files.
 * Swipe right = PASS (green), swipe left = MISS (red).
 * Uses MutationObserver to auto-attach on every card render — no changes to existing render functions needed.
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const pubDir = join(import.meta.dirname, 'public');

const swipeCSS = `
/* ═══ SWIPE ═══ */
.swipe-ov{position:absolute;inset:0;border-radius:12px;opacity:0;pointer-events:none;display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:900;letter-spacing:2px;user-select:none;transition:opacity .05s;}
.swipe-pass{background:rgba(46,204,113,.28);color:#2ecc71;}
.swipe-fail{background:rgba(231,76,60,.28);color:#e74c3c;}
@media(hover:none){
  .card.center{touch-action:pan-y;user-select:none;}
  .swipe-hint{display:block!important;}
}
.swipe-hint{display:none;position:absolute;bottom:7px;left:0;right:0;text-align:center;font-size:10px;color:var(--dim,#555);letter-spacing:1.5px;pointer-events:none;}
`;

const swipeJS = `
// ═══ SWIPE GESTURES ═══
(function(){
  const THR=80;
  function attachSwipe(card){
    if(card._sw)return;
    card._sw=true;
    card.style.position='relative';
    card.style.overflow='hidden';
    // overlay
    const ov=document.createElement('div');
    ov.className='swipe-ov';
    card.appendChild(ov);
    // mobile hint
    const hint=document.createElement('div');
    hint.className='swipe-hint';
    hint.textContent='← miss · pass →';
    card.appendChild(hint);

    let sx=0,sy=0,dx=0,live=false;

    card.addEventListener('touchstart',e=>{
      sx=e.touches[0].clientX;sy=e.touches[0].clientY;dx=0;live=true;
    },{passive:true});

    card.addEventListener('touchmove',e=>{
      if(!live)return;
      dx=e.touches[0].clientX-sx;
      const dy=Math.abs(e.touches[0].clientY-sy);
      if(dy>Math.abs(dx)*1.5){live=false;card.style.transform='';ov.style.opacity=0;return;}
      card.style.transform='translateX('+dx+'px) rotate('+(dx*0.04)+'deg)';
      const p=Math.min(Math.abs(dx)/THR,1);
      ov.style.opacity=p;
      if(dx>0){ov.className='swipe-ov swipe-pass';ov.textContent='✓ PASS';}
      else{ov.className='swipe-ov swipe-fail';ov.textContent='✗ MISS';}
    },{passive:true});

    card.addEventListener('touchend',()=>{
      if(!live){dx=0;return;}
      live=false;
      if(Math.abs(dx)>=THR){
        const isBack=!!document.querySelector('#mainArea .btn[onclick*="flashGrade"]');
        if(isBack){
          // fly off screen, then grade
          card.style.transition='transform .18s ease';
          card.style.transform='translateX('+(dx>0?500:-500)+'px) rotate('+(dx>0?25:-25)+'deg)';
          const grade=dx>0;
          setTimeout(()=>flashGrade(grade),180);
        } else {
          // front side — swipe reveals answer regardless of direction
          card.style.transform='';ov.style.opacity=0;
          if(typeof showFlashBack==='function')showFlashBack(document.getElementById('mainArea'));
        }
      } else {
        card.style.transition='transform .22s ease';
        card.style.transform='';
        ov.style.opacity=0;
        setTimeout(()=>{if(card.style)card.style.transition='';},230);
      }
      dx=0;
    },{passive:true});
  }

  const obs=new MutationObserver(()=>{
    const c=document.querySelector('#mainArea .card.center');
    if(c)attachSwipe(c);
  });
  document.addEventListener('DOMContentLoaded',()=>{
    const m=document.getElementById('mainArea');
    if(m)obs.observe(m,{childList:true,subtree:true});
    // also try immediately in case card is already rendered
    const c=document.querySelector('#mainArea .card.center');
    if(c)attachSwipe(c);
  });
})();
`;

const allFiles = readdirSync(pubDir).filter(f => f.endsWith('.html'));
let patched = 0;

for (const file of allFiles) {
  const path = join(pubDir, file);
  let html = readFileSync(path, 'utf8');

  // Only touch files that have flashcard code
  if (!html.includes('showFlashBack') && !html.includes('function renderFlash')) continue;

  // Skip if already patched
  if (html.includes('swipe-ov') || html.includes('attachSwipe')) {
    console.log(`  SKIP ${file} — already has swipe`);
    continue;
  }

  // Inject CSS before </style>
  if (html.includes('</style>')) {
    html = html.replace('</style>', swipeCSS + '\n</style>');
  }

  // Inject JS before last </script>
  const lastClose = html.lastIndexOf('</script>');
  if (lastClose === -1) {
    console.log(`  WARN ${file} — no </script>, skipping`);
    continue;
  }
  html = html.substring(0, lastClose) + '\n' + swipeJS + '\n' + html.substring(lastClose);

  writeFileSync(path, html, 'utf8');
  console.log(`  ✅ ${file}`);
  patched++;
}

console.log(`\nDone! Added swipe to ${patched} files.`);

/**
 * Patch v3: Fix swipe for iOS Safari
 *  - Non-passive touchmove so e.preventDefault() works (required on Safari)
 *  - Direction detection before committing to horizontal vs vertical
 *  - touch-action:pan-y on card so iOS passes horizontal events to JS
 *  - Remove position:fixed (breaks iOS Safari touch handling)
 *  - Lower threshold + explicit -webkit- prefixes
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const pubDir = join(import.meta.dirname, 'public');

// ── Replace markers from v2 ───────────────────────────────────────────────
const OLD_CSS_RE = /\/\* ═══ SWIPE v2 ═══ \*\/[\s\S]*?(?=\n<\/style>|\n\n<\/style>)/;
const OLD_JS_RE  = /\/\/ ═══ SWIPE GESTURES v2 ═══\n[\s\S]*?\}\)\(\);\n/;

// ── New swipe CSS ─────────────────────────────────────────────────────────
const NEW_CSS = `/* ═══ SWIPE v3 ═══ */
.swipe-ov{position:absolute;top:0;right:0;bottom:0;left:0;border-radius:inherit;opacity:0;pointer-events:none;display:-webkit-flex;display:flex;-webkit-align-items:center;align-items:center;-webkit-justify-content:center;justify-content:center;font-size:36px;font-weight:900;letter-spacing:2px;-webkit-user-select:none;user-select:none;}
.swipe-pass{background:rgba(46,204,113,.3);color:#2ecc71;}
.swipe-fail{background:rgba(231,76,60,.3);color:#e74c3c;}
.swipe-hint{display:none;position:absolute;bottom:10px;left:0;right:0;text-align:center;font-size:11px;color:var(--dim,#555);letter-spacing:1.5px;pointer-events:none;-webkit-user-select:none;user-select:none;}
@media(hover:none){
  .swipe-hint{display:block;}
  #mainArea .card.center{min-height:62vh;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:pan-y;-webkit-user-select:none;user-select:none;}
}`;

// ── New swipe JS ──────────────────────────────────────────────────────────
const NEW_JS = `// ═══ SWIPE GESTURES v3 ═══
(function(){
  var THR=60,MIN=8;
  function attachSwipe(card){
    if(card._sw)return;card._sw=true;
    card.style.position='relative';card.style.overflow='hidden';
    var ov=document.createElement('div');ov.className='swipe-ov';card.appendChild(ov);
    var hint=document.createElement('div');hint.className='swipe-hint';card.appendChild(hint);
    function isBack(){return!!document.querySelector('#mainArea .btn[onclick*="flashGrade"]');}
    hint.textContent=isBack()?'← miss  ·  pass →':'tap to reveal';

    // tap reveals answer on front card
    card.addEventListener('click',function(e){
      if(e.target.closest&&e.target.closest('button'))return;
      if(!isBack()&&typeof showFlashBack==='function')showFlashBack(document.getElementById('mainArea'));
    });

    var sx=0,sy=0,dx=0,dy=0,dir=null,live=false;

    card.addEventListener('touchstart',function(e){
      var t=e.touches[0];sx=t.clientX;sy=t.clientY;dx=0;dy=0;dir=null;live=true;
    },{passive:true});

    // NON-PASSIVE so we can preventDefault for horizontal swipe on iOS Safari
    card.addEventListener('touchmove',function(e){
      if(!live)return;
      var t=e.touches[0];
      dx=t.clientX-sx;dy=t.clientY-sy;
      var adx=Math.abs(dx),ady=Math.abs(dy);
      if(!dir&&(adx>MIN||ady>MIN))dir=adx>=ady?'h':'v';
      if(dir==='v')return; // let browser scroll vertically
      if(dir==='h'){
        e.preventDefault(); // block vertical scroll during horizontal swipe
        if(!isBack())return; // front card — no swipe effect, handled by click
        card.style.webkitTransform='translateX('+dx+'px) rotate('+(dx*0.04)+'deg)';
        card.style.transform='translateX('+dx+'px) rotate('+(dx*0.04)+'deg)';
        var p=Math.min(adx/THR,1);ov.style.opacity=p;
        if(dx>0){ov.className='swipe-ov swipe-pass';ov.textContent='✓ PASS';}
        else{ov.className='swipe-ov swipe-fail';ov.textContent='✗ MISS';}
      }
    },{passive:false,capture:false});

    card.addEventListener('touchend',function(){
      if(!live)return;live=false;
      var adx=Math.abs(dx);
      if(dir==='h'&&isBack()&&adx>=THR){
        var grade=dx>0;
        card.style.webkitTransition='transform .18s ease';card.style.transition='transform .18s ease';
        card.style.webkitTransform='translateX('+(grade?500:-500)+'px) rotate('+(grade?25:-25)+'deg)';
        card.style.transform='translateX('+(grade?500:-500)+'px) rotate('+(grade?25:-25)+'deg)';
        setTimeout(function(){flashGrade(grade);},180);
      } else {
        card.style.webkitTransition='transform .22s ease';card.style.transition='transform .22s ease';
        card.style.webkitTransform='';card.style.transform='';
        ov.style.opacity=0;
        setTimeout(function(){if(card.style){card.style.webkitTransition='';card.style.transition='';}},230);
      }
      dx=0;dy=0;dir=null;
    },{passive:true});
  }

  var obs=new MutationObserver(function(){
    var c=document.querySelector('#mainArea .card.center');
    if(c)attachSwipe(c);
  });
  function init(){
    var m=document.getElementById('mainArea');
    if(m){obs.observe(m,{childList:true,subtree:true});var c=document.querySelector('#mainArea .card.center');if(c)attachSwipe(c);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
`;

// ── Process files ─────────────────────────────────────────────────────────
const allFiles = readdirSync(pubDir).filter(f => f.endsWith('.html'));
let updated = 0;

for (const file of allFiles) {
  const path = join(pubDir, file);
  let html = readFileSync(path, 'utf8');
  if (!html.includes('showFlashBack') && !html.includes('function renderFlash')) continue;

  let changed = false;

  // Replace old CSS block
  if (OLD_CSS_RE.test(html)) {
    html = html.replace(OLD_CSS_RE, NEW_CSS);
    changed = true;
  }

  // Replace old JS block
  if (OLD_JS_RE.test(html)) {
    html = html.replace(OLD_JS_RE, NEW_JS + '\n');
    changed = true;
  }

  if (changed) {
    writeFileSync(path, html, 'utf8');
    console.log('  ✅ ' + file);
    updated++;
  } else {
    console.log('  -- ' + file + ' (no match — check markers)');
  }
}

console.log('\nDone! Updated ' + updated + ' files.');

/**
 * Patch v4: Fix iOS Safari swipe (root cause: touch-action:pan-y unsupported on Safari)
 *
 * Root causes found:
 *  1. touch-action:pan-y is NOT supported on iOS Safari (WebKit bug #133112) — browser
 *     ignores it and handles all gestures natively, so horizontal swipes never reach JS.
 *     Fix: use touch-action:manipulation (IS supported on iOS).
 *  2. isBack() was re-queried on every touchmove — flaky if DOM changes mid-gesture.
 *     Fix: capture once at attach time.
 *  3. Front card had unnecessary touch listeners — now click-only (simpler, no interference).
 *  4. Back card: call e.preventDefault() as soon as |dx| >= 5px so iOS can't claim scroll.
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const pubDir = join(import.meta.dirname, 'public');

const OLD_CSS_RE = /\/\* ═══ SWIPE v3 ═══ \*\/[\s\S]*?(?=\n<\/style>|\n\n<\/style>)/;
const OLD_JS_RE  = /\/\/ ═══ SWIPE GESTURES v3 ═══\n[\s\S]*?\}\)\(\);\n/;

// ── New CSS ───────────────────────────────────────────────────────────────
const NEW_CSS = `/* ═══ SWIPE v4 ═══ */
.swipe-ov{position:absolute;top:0;right:0;bottom:0;left:0;border-radius:inherit;opacity:0;pointer-events:none;display:-webkit-flex;display:flex;-webkit-align-items:center;align-items:center;-webkit-justify-content:center;justify-content:center;font-size:36px;font-weight:900;letter-spacing:2px;-webkit-user-select:none;user-select:none;}
.swipe-pass{background:rgba(46,204,113,.3);color:#2ecc71;}
.swipe-fail{background:rgba(231,76,60,.3);color:#e74c3c;}
.swipe-hint{display:none;position:absolute;bottom:10px;left:0;right:0;text-align:center;font-size:11px;color:var(--dim,#555);letter-spacing:1.5px;pointer-events:none;-webkit-user-select:none;user-select:none;}
@media(hover:none){
  .swipe-hint{display:block;}
  #mainArea .card.center{
    min-height:62vh;
    cursor:pointer;
    -webkit-tap-highlight-color:transparent;
    touch-action:manipulation;
    -webkit-user-select:none;
    user-select:none;
    will-change:transform;
  }
}`;

// ── New JS ────────────────────────────────────────────────────────────────
const NEW_JS = `// ═══ SWIPE GESTURES v4 ═══
(function(){
  var THR=60, MOVE=5;

  function attachSwipe(card){
    if(card._sw)return; card._sw=true;
    card.style.position='relative';

    var ov=document.createElement('div'); ov.className='swipe-ov'; card.appendChild(ov);
    var hint=document.createElement('div'); hint.className='swipe-hint'; card.appendChild(hint);

    // Capture once — won't change while this card is in DOM
    var back=!!document.querySelector('#mainArea .btn[onclick*="flashGrade"]');
    hint.textContent=back?'← miss  ·  pass →':'tap to reveal';

    if(!back){
      // Front card: tap anywhere to reveal answer
      card.addEventListener('click',function(e){
        if(e.target.closest&&e.target.closest('button'))return;
        if(typeof showFlashBack==='function')showFlashBack(document.getElementById('mainArea'));
      });
      return; // no swipe on front
    }

    // Back card: horizontal swipe to grade (right=pass, left=miss)
    var sx=0, dx=0, active=false;

    card.addEventListener('touchstart',function(e){
      sx=e.touches[0].clientX; dx=0; active=true;
    },{passive:false});

    card.addEventListener('touchmove',function(e){
      if(!active)return;
      dx=e.touches[0].clientX-sx;
      if(Math.abs(dx)<MOVE)return; // wait for clear horizontal intent
      e.preventDefault(); // prevent iOS scroll as soon as we see horizontal motion
      var t='translateX('+dx+'px) rotate('+(dx*0.04)+'deg)';
      card.style.webkitTransform=t; card.style.transform=t;
      var p=Math.min(Math.abs(dx)/THR,1); ov.style.opacity=p;
      if(dx>0){ov.className='swipe-ov swipe-pass';ov.textContent='✓ PASS';}
      else{ov.className='swipe-ov swipe-fail';ov.textContent='✗ MISS';}
    },{passive:false});

    card.addEventListener('touchend',function(){
      if(!active)return; active=false;
      if(Math.abs(dx)>=THR){
        var grade=dx>0;
        var fly='translateX('+(grade?500:-500)+'px) rotate('+(grade?25:-25)+'deg)';
        card.style.webkitTransition='transform .18s ease'; card.style.transition='transform .18s ease';
        card.style.webkitTransform=fly; card.style.transform=fly;
        setTimeout(function(){flashGrade(grade);},180);
      } else {
        card.style.webkitTransition='transform .22s ease'; card.style.transition='transform .22s ease';
        card.style.webkitTransform=''; card.style.transform=''; ov.style.opacity=0;
        setTimeout(function(){if(card.style){card.style.webkitTransition='';card.style.transition='';}},230);
      }
      dx=0;
    },{passive:true});
  }

  var obs=new MutationObserver(function(){
    var c=document.querySelector('#mainArea .card.center');
    if(c)attachSwipe(c);
  });
  function init(){
    var m=document.getElementById('mainArea');
    if(!m)return;
    obs.observe(m,{childList:true,subtree:true});
    var c=document.querySelector('#mainArea .card.center');
    if(c)attachSwipe(c);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
`;

// ── Apply to all files ────────────────────────────────────────────────────
const files = readdirSync(pubDir).filter(f => f.endsWith('.html'));
let n = 0;

for (const file of files) {
  const path = join(pubDir, file);
  let html = readFileSync(path, 'utf8');
  if (!html.includes('showFlashBack') && !html.includes('function renderFlash')) continue;

  let changed = false;

  if (OLD_CSS_RE.test(html)) {
    html = html.replace(OLD_CSS_RE, NEW_CSS);
    changed = true;
  }
  if (OLD_JS_RE.test(html)) {
    html = html.replace(OLD_JS_RE, NEW_JS + '\n');
    changed = true;
  }

  if (changed) {
    writeFileSync(path, html, 'utf8');
    console.log('  ✅ ' + file);
    n++;
  } else {
    console.log('  !! ' + file + ' — markers not found, check manually');
  }
}
console.log('\nDone. Updated ' + n + ' files.');

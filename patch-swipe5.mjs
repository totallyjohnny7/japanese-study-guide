/**
 * Patch v5: Add vivid animated red/green feedback to flashcard swipe
 *  - Gradient color overlay (brighter, fuller)
 *  - Label bounces in with spring animation on each direction change
 *  - Card border glows green/red during swipe
 *  - Card entry animation (scale+fade in) on each new card
 *  - Clear transition in touchstart so card follows finger with zero lag
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const pubDir = join(import.meta.dirname, 'public');

const OLD_CSS_RE = /\/\* ═══ SWIPE v4 ═══ \*\/[\s\S]*?(?=\n<\/style>|\n\n<\/style>)/;
const OLD_JS_RE  = /\/\/ ═══ SWIPE GESTURES v4 ═══\n[\s\S]*?\}\)\(\);\n/;

// ── New CSS ───────────────────────────────────────────────────────────────
const NEW_CSS = `/* ═══ SWIPE v5 ═══ */
.swipe-ov{position:absolute;top:0;right:0;bottom:0;left:0;border-radius:inherit;opacity:0;pointer-events:none;display:-webkit-flex;display:flex;-webkit-align-items:center;align-items:center;-webkit-justify-content:center;justify-content:center;font-size:42px;font-weight:900;letter-spacing:3px;-webkit-user-select:none;user-select:none;}
.swipe-pass{background:linear-gradient(135deg,rgba(46,204,113,.45) 0%,rgba(39,174,96,.3) 100%);color:#2ecc71;text-shadow:0 0 20px rgba(46,204,113,.8);}
.swipe-fail{background:linear-gradient(135deg,rgba(231,76,60,.45) 0%,rgba(192,57,43,.3) 100%);color:#e74c3c;text-shadow:0 0 20px rgba(231,76,60,.8);}
.swipe-hint{display:none;position:absolute;bottom:10px;left:0;right:0;text-align:center;font-size:11px;color:var(--dim,#555);letter-spacing:1.5px;pointer-events:none;-webkit-user-select:none;user-select:none;}
@-webkit-keyframes sw-pop{0%{-webkit-transform:scale(0.4);transform:scale(0.4);opacity:0;}65%{-webkit-transform:scale(1.25);transform:scale(1.25);}100%{-webkit-transform:scale(1);transform:scale(1);opacity:1;}}
@keyframes sw-pop{0%{transform:scale(0.4);opacity:0;}65%{transform:scale(1.25);}100%{transform:scale(1);opacity:1;}}
@-webkit-keyframes sw-enter{from{opacity:0;-webkit-transform:scale(0.93) translateY(8px);transform:scale(0.93) translateY(8px);}to{opacity:1;-webkit-transform:none;transform:none;}}
@keyframes sw-enter{from{opacity:0;transform:scale(0.93) translateY(8px);}to{opacity:1;transform:none;}}
@-webkit-keyframes sw-gp{to{box-shadow:0 0 0 2px #2ecc71,0 0 28px rgba(46,204,113,.5);}}
@keyframes sw-gp{to{box-shadow:0 0 0 2px #2ecc71,0 0 28px rgba(46,204,113,.5);}}
@-webkit-keyframes sw-gf{to{box-shadow:0 0 0 2px #e74c3c,0 0 28px rgba(231,76,60,.5);}}
@keyframes sw-gf{to{box-shadow:0 0 0 2px #e74c3c,0 0 28px rgba(231,76,60,.5);}}
.sw-lbl{display:inline-block;-webkit-animation:sw-pop .22s cubic-bezier(.34,1.56,.64,1) both;animation:sw-pop .22s cubic-bezier(.34,1.56,.64,1) both;}
.sw-enter{-webkit-animation:sw-enter .24s ease both;animation:sw-enter .24s ease both;}
.sw-gp{-webkit-animation:sw-gp .14s ease forwards;animation:sw-gp .14s ease forwards;}
.sw-gf{-webkit-animation:sw-gf .14s ease forwards;animation:sw-gf .14s ease forwards;}
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
const NEW_JS = `// ═══ SWIPE GESTURES v5 ═══
(function(){
  var THR=60, MOVE=5;

  function attachSwipe(card){
    if(card._sw)return; card._sw=true;
    card.style.position='relative';
    card.classList.add('sw-enter'); // entry animation

    var ov=document.createElement('div'); ov.className='swipe-ov'; card.appendChild(ov);
    var hint=document.createElement('div'); hint.className='swipe-hint'; card.appendChild(hint);

    var back=!!document.querySelector('#mainArea .btn[onclick*="flashGrade"]');
    hint.textContent=back?'← miss  ·  pass →':'tap to reveal';

    if(!back){
      card.addEventListener('click',function(e){
        if(e.target.closest&&e.target.closest('button'))return;
        if(typeof showFlashBack==='function')showFlashBack(document.getElementById('mainArea'));
      });
      return;
    }

    var sx=0, dx=0, active=false, lastDir='';

    card.addEventListener('touchstart',function(e){
      card.style.webkitTransition=''; card.style.transition=''; // no lag following finger
      sx=e.touches[0].clientX; dx=0; active=true;
    },{passive:false});

    card.addEventListener('touchmove',function(e){
      if(!active)return;
      dx=e.touches[0].clientX-sx;
      if(Math.abs(dx)<MOVE)return;
      e.preventDefault();

      var dir=dx>0?'pass':'fail';
      var t='translateX('+dx+'px) rotate('+(dx*0.04)+'deg)';
      card.style.webkitTransform=t; card.style.transform=t;
      ov.style.opacity=Math.min(Math.abs(dx)/THR,1);

      if(dir!==lastDir){
        lastDir=dir;
        ov.className='swipe-ov swipe-'+dir;
        ov.innerHTML='<span class="sw-lbl">'+(dir==='pass'?'✓ PASS':'✗ MISS')+'</span>';
        card.classList.remove('sw-gp','sw-gf');
        // Force reflow so animation restarts cleanly
        void card.offsetWidth;
        card.classList.add(dir==='pass'?'sw-gp':'sw-gf');
      }
    },{passive:false});

    card.addEventListener('touchend',function(){
      if(!active)return; active=false;
      card.classList.remove('sw-gp','sw-gf');

      if(Math.abs(dx)>=THR){
        var grade=dx>0;
        ov.style.opacity=1;
        var fly='translateX('+(grade?500:-500)+'px) rotate('+(grade?25:-25)+'deg)';
        card.style.webkitTransition='transform .18s ease'; card.style.transition='transform .18s ease';
        card.style.webkitTransform=fly; card.style.transform=fly;
        setTimeout(function(){flashGrade(grade);},180);
      } else {
        card.style.webkitTransition='transform .22s ease'; card.style.transition='transform .22s ease';
        card.style.webkitTransform=''; card.style.transform='';
        ov.style.opacity=0; lastDir='';
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

// ── Apply ─────────────────────────────────────────────────────────────────
const files = readdirSync(pubDir).filter(f => f.endsWith('.html'));
let n = 0;
for (const file of files) {
  const path = join(pubDir, file);
  let html = readFileSync(path, 'utf8');
  if (!html.includes('showFlashBack') && !html.includes('function renderFlash')) continue;
  let changed = false;
  if (OLD_CSS_RE.test(html)) { html = html.replace(OLD_CSS_RE, NEW_CSS); changed = true; }
  if (OLD_JS_RE.test(html))  { html = html.replace(OLD_JS_RE,  NEW_JS + '\n'); changed = true; }
  if (changed) { writeFileSync(path, html, 'utf8'); console.log('  ✅ ' + file); n++; }
  else console.log('  !! ' + file + ' — markers not found');
}
console.log('\nDone. Updated ' + n + ' files.');

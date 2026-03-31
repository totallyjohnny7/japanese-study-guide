import { readFileSync, writeFileSync, readdirSync } from 'fs';

const IME_CSS = `
/* ═══ KANA IME ═══ */
.ime-bar{display:flex;align-items:center;gap:8px;padding:8px 14px;background:var(--surface);border:1px solid var(--border);border-radius:10px;margin-bottom:10px;flex-wrap:wrap;}
.ime-bar label{font-size:10px;font-weight:700;color:var(--muted);letter-spacing:1px;text-transform:uppercase;white-space:nowrap;}
.ime-toggle{display:flex;gap:0;border:1px solid var(--border);border-radius:8px;overflow:hidden;}
.ime-toggle button{padding:6px 12px;font-size:11px;font-weight:700;border:none;cursor:pointer;font-family:'DM Sans';transition:all .2s;color:var(--muted);background:var(--card);}
.ime-toggle button.active{background:var(--accent);color:#fff;}
.ime-preview{font-size:11px;color:var(--accent2);font-family:'Noto Sans JP';min-width:40px;text-align:center;}
.ime-hint{font-size:9px;color:var(--muted);margin-left:auto;}
.kana-pad{display:none;margin-bottom:10px;}
.kana-pad.open{display:block;}
.kana-pad-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;}
.kana-pad-header button{background:none;border:1px solid var(--border);color:var(--muted);padding:4px 10px;border-radius:6px;font-size:10px;font-weight:700;cursor:pointer;font-family:'DM Sans';}
.kana-pad-header button.active{background:var(--accent);color:#fff;border-color:var(--accent);}
.kana-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:4px;max-width:320px;margin:0 auto;}
.kana-key{padding:8px 2px;border-radius:6px;border:1px solid var(--border);background:var(--card);color:var(--text);font-size:16px;font-family:'Noto Sans JP';text-align:center;cursor:pointer;transition:all .15s;-webkit-tap-highlight-color:transparent;touch-action:manipulation;}
.kana-key:hover,.kana-key:active{background:var(--accent);color:#fff;border-color:var(--accent);}
.kana-key.small{font-size:13px;color:var(--muted);}
.kana-key.fn{font-size:11px;font-weight:700;font-family:'DM Sans';color:var(--accent2);}
@media(max-width:600px){
  .kana-grid{grid-template-columns:repeat(5,1fr);gap:3px;max-width:100%;}
  .kana-key{padding:10px 2px;font-size:18px;}
  .ime-bar{gap:6px;padding:6px 10px;}
  .ime-hint{display:none;}
}
`;

const IME_JS = `
// ═══ KANA IME ENGINE ═══
const ROMAJI_MAP={a:'あ',i:'い',u:'う',e:'え',o:'お',
ka:'か',ki:'き',ku:'く',ke:'け',ko:'こ',
sa:'さ',si:'し',shi:'し',su:'す',se:'せ',so:'そ',
ta:'た',ti:'ち',chi:'ち',tu:'つ',tsu:'つ',te:'て',to:'と',
na:'な',ni:'に',nu:'ぬ',ne:'ね',no:'の',
ha:'は',hi:'ひ',hu:'ふ',fu:'ふ',he:'へ',ho:'ほ',
ma:'ま',mi:'み',mu:'む',me:'め',mo:'も',
ya:'や',yu:'ゆ',yo:'よ',
ra:'ら',ri:'り',ru:'る',re:'れ',ro:'ろ',
wa:'わ',wi:'ゐ',we:'ゑ',wo:'を',
nn:'ん',
ga:'が',gi:'ぎ',gu:'ぐ',ge:'げ',go:'ご',
za:'ざ',zi:'じ',ji:'じ',zu:'ず',ze:'ぜ',zo:'ぞ',
da:'だ',di:'ぢ',du:'づ',de:'で',do:'ど',
ba:'ば',bi:'び',bu:'ぶ',be:'べ',bo:'ぼ',
pa:'ぱ',pi:'ぴ',pu:'ぷ',pe:'ぺ',po:'ぽ',
kya:'きゃ',kyu:'きゅ',kyo:'きょ',
sha:'しゃ',shu:'しゅ',sho:'しょ',
sya:'しゃ',syu:'しゅ',syo:'しょ',
cha:'ちゃ',chu:'ちゅ',cho:'ちょ',
tya:'ちゃ',tyu:'ちゅ',tyo:'ちょ',
nya:'にゃ',nyu:'にゅ',nyo:'にょ',
hya:'ひゃ',hyu:'ひゅ',hyo:'ひょ',
mya:'みゃ',myu:'みゅ',myo:'みょ',
rya:'りゃ',ryu:'りゅ',ryo:'りょ',
gya:'ぎゃ',gyu:'ぎゅ',gyo:'ぎょ',
ja:'じゃ',ju:'じゅ',jo:'じょ',
jya:'じゃ',jyu:'じゅ',jyo:'じょ',
bya:'びゃ',byu:'びゅ',byo:'びょ',
pya:'ぴゃ',pyu:'ぴゅ',pyo:'ぴょ',
// small
xa:'ぁ',xi:'ぃ',xu:'ぅ',xe:'ぇ',xo:'ぉ',
xya:'ゃ',xyu:'ゅ',xyo:'ょ',xtu:'っ',xtsu:'っ',
// long vowel
'-':'ー'};

// Double consonant → っ
const DOUBLE_CONSONANTS='ksztcgdbpfhjmnrwy';

let imeMode='hiragana'; // 'hiragana','katakana','off'
let imeBuffer='';

function hiraganaToKatakana(s){
  return [...s].map(c=>{const cp=c.codePointAt(0);return(cp>=0x3041&&cp<=0x3096)?String.fromCodePoint(cp+0x60):c;}).join('');
}

function processIME(input){
  if(imeMode==='off')return;
  const el=input;
  const val=el.value;
  const pos=el.selectionStart;
  // Find the romaji tail (ASCII letters at cursor position)
  let start=pos;
  while(start>0&&/[a-zA-Z-]/.test(val[start-1]))start--;
  const raw=val.substring(start,pos).toLowerCase();
  if(!raw)return;

  // Try longest match first
  for(let len=Math.min(raw.length,4);len>=1;len--){
    const chunk=raw.substring(raw.length-len);
    // Check double consonant
    if(len>=2&&chunk[0]===chunk[1]&&DOUBLE_CONSONANTS.includes(chunk[0])&&len===2){
      const kana=imeMode==='katakana'?'ッ':'っ';
      const before=val.substring(0,pos-2);
      const after=val.substring(pos);
      el.value=before+kana+chunk[1]+after;
      el.selectionStart=el.selectionEnd=before.length+kana.length+1;
      return;
    }
    if(ROMAJI_MAP[chunk]){
      let kana=ROMAJI_MAP[chunk];
      if(imeMode==='katakana')kana=hiraganaToKatakana(kana);
      const prefixLen=raw.length-len;
      const before=val.substring(0,start+prefixLen);
      const after=val.substring(pos);
      el.value=before+kana+after;
      el.selectionStart=el.selectionEnd=before.length+kana.length;
      return;
    }
  }
  // n followed by non-vowel/y → ん
  if(raw.length>=2&&raw[raw.length-2]==='n'&&!'aiueony'.includes(raw[raw.length-1])){
    const kana=imeMode==='katakana'?'ン':'ん';
    const before=val.substring(0,pos-2);
    const after=val.substring(pos);
    el.value=before+kana+raw[raw.length-1]+after;
    el.selectionStart=el.selectionEnd=before.length+kana.length+1;
  }
}

function setIMEMode(m){
  imeMode=m;
  document.querySelectorAll('.ime-toggle button').forEach(b=>{
    b.classList.toggle('active',b.dataset.mode===m);
  });
  const label=document.getElementById('imeLabel');
  if(label)label.textContent=m==='hiragana'?'ひらがな':m==='katakana'?'カタカナ':'OFF';
}

function injectIMEBar(){
  // Find the first .answer-input container or insert before modes
  const existing=document.getElementById('imeBarWrap');
  if(existing)return;
  const header=document.querySelector('.header');
  if(!header)return;
  const bar=document.createElement('div');
  bar.id='imeBarWrap';
  bar.innerHTML=\`<div class="ime-bar">
    <label>入力 IME</label>
    <div class="ime-toggle">
      <button data-mode="hiragana" class="active" onclick="setIMEMode('hiragana')">あ Hira</button>
      <button data-mode="katakana" onclick="setIMEMode('katakana')">ア Kata</button>
      <button data-mode="off" onclick="setIMEMode('off')">ABC Off</button>
    </div>
    <span id="imeLabel" style="font-size:14px;font-family:'Noto Sans JP';color:var(--accent);font-weight:700">ひらがな</span>
    <button onclick="toggleKanaPad()" style="background:none;border:1px solid var(--border);color:var(--muted);padding:4px 10px;border-radius:6px;font-size:10px;cursor:pointer;font-family:'DM Sans'">⌨️ Pad</button>
    <span class="ime-hint">Type romaji → auto kana</span>
  </div>
  <div class="kana-pad" id="kanaPad"></div>\`;
  header.after(bar);
  buildKanaPad();
}

// ═══ VISUAL KANA PAD (for mobile) ═══
const HIRA_ROWS=[
  ['あ','い','う','え','お'],
  ['か','き','く','け','こ'],
  ['さ','し','す','せ','そ'],
  ['た','ち','つ','て','と'],
  ['な','に','ぬ','ね','の'],
  ['は','ひ','ふ','へ','ほ'],
  ['ま','み','む','め','も'],
  ['や','','ゆ','','よ'],
  ['ら','り','る','れ','ろ'],
  ['わ','を','ん','ー','']
];
const HIRA_DAKUTEN=[
  ['が','ぎ','ぐ','げ','ご'],
  ['ざ','じ','ず','ぜ','ぞ'],
  ['だ','ぢ','づ','で','ど'],
  ['ば','び','ぶ','べ','ぼ'],
  ['ぱ','ぴ','ぷ','ぺ','ぽ']
];
const HIRA_COMBO=[
  ['きゃ','きゅ','きょ','しゃ','しゅ'],
  ['しょ','ちゃ','ちゅ','ちょ','にゃ'],
  ['にゅ','にょ','ひゃ','ひゅ','ひょ'],
  ['みゃ','みゅ','みょ','りゃ','りゅ'],
  ['りょ','ぎゃ','ぎゅ','ぎょ','じゃ'],
  ['じゅ','じょ','びゃ','びゅ','びょ'],
  ['ぴゃ','ぴゅ','ぴょ','っ','']
];

let kanaPadTab='basic';
function buildKanaPad(){
  const pad=document.getElementById('kanaPad');
  if(!pad)return;
  pad.innerHTML=\`<div class="kana-pad-header">
    <div style="display:flex;gap:4px">
      <button class="\${kanaPadTab==='basic'?'active':''}" onclick="setKanaPadTab('basic')">基本 Basic</button>
      <button class="\${kanaPadTab==='dakuten'?'active':''}" onclick="setKanaPadTab('dakuten')">濁点 Dakuten</button>
      <button class="\${kanaPadTab==='combo'?'active':''}" onclick="setKanaPadTab('combo')">拗音 Combo</button>
    </div>
    <div style="display:flex;gap:4px">
      <button class="fn" onclick="kanaBackspace()" style="color:var(--red)">⌫</button>
      <button class="fn" onclick="kanaSpace()">␣</button>
    </div>
  </div>
  <div class="kana-grid" id="kanaGrid"></div>\`;
  renderKanaGrid();
}

function setKanaPadTab(tab){
  kanaPadTab=tab;
  buildKanaPad();
  document.getElementById('kanaPad').classList.add('open');
}

function renderKanaGrid(){
  const grid=document.getElementById('kanaGrid');
  if(!grid)return;
  let rows=kanaPadTab==='basic'?HIRA_ROWS:kanaPadTab==='dakuten'?HIRA_DAKUTEN:HIRA_COMBO;
  const isKata=imeMode==='katakana';
  let h='';
  rows.forEach(row=>{
    row.forEach(ch=>{
      if(!ch){h+='<div></div>';return;}
      let display=isKata?hiraganaToKatakana(ch):ch;
      h+=\`<button class="kana-key" onclick="insertKana('\${display}')" type="button">\${display}</button>\`;
    });
  });
  // Add special keys
  h+=\`<button class="kana-key fn" onclick="kanaBackspace()" type="button">⌫</button>\`;
  h+=\`<button class="kana-key fn" onclick="kanaSpace()" type="button">␣</button>\`;
  h+=\`<button class="kana-key fn" onclick="insertKana('。')" type="button">。</button>\`;
  h+=\`<button class="kana-key fn" onclick="insertKana('、')" type="button">、</button>\`;
  h+=\`<button class="kana-key fn" onclick="insertKana('？')" type="button">？</button>\`;
  grid.innerHTML=h;
}

function toggleKanaPad(){
  const pad=document.getElementById('kanaPad');
  if(!pad)return;
  pad.classList.toggle('open');
  if(pad.classList.contains('open'))renderKanaGrid();
}

function getActiveInput(){
  return document.querySelector('.answer-input:focus')||document.querySelector('.answer-input');
}

function insertKana(ch){
  const inp=getActiveInput();
  if(!inp)return;
  const pos=inp.selectionStart||inp.value.length;
  inp.value=inp.value.substring(0,pos)+ch+inp.value.substring(pos);
  inp.selectionStart=inp.selectionEnd=pos+ch.length;
  inp.focus();
}

function kanaBackspace(){
  const inp=getActiveInput();
  if(!inp||!inp.value)return;
  const pos=inp.selectionStart||inp.value.length;
  if(pos===0)return;
  inp.value=inp.value.substring(0,pos-1)+inp.value.substring(pos);
  inp.selectionStart=inp.selectionEnd=pos-1;
  inp.focus();
}

function kanaSpace(){
  insertKana(' ');
}

// Hook IME into all answer inputs
document.addEventListener('input',function(e){
  if(e.target.classList.contains('answer-input')&&imeMode!=='off'){
    processIME(e.target);
  }
});

// Re-inject IME bar when mode changes (since DOM gets rebuilt)
const _origRender=typeof render==='function'?render:null;
if(_origRender){
  render=function(){
    _origRender();
    setTimeout(injectIMEBar,100);
  };
}

// Initial injection
setTimeout(injectIMEBar,200);
`;

// Process all practice files
const dir = 'public';
const files = readdirSync(dir).filter(f =>
  f.startsWith('practice-') || f.startsWith('quiz-') || f.startsWith('week12-')
);

for (const fname of files) {
  const path = `${dir}/${fname}`;
  let html = readFileSync(path, 'utf-8');

  // Skip if already patched
  if (html.includes('KANA IME')) {
    console.log(`${fname}: already patched, skipping`);
    continue;
  }

  // 1. Add CSS before </style>
  html = html.replace('</style>', IME_CSS + '\n</style>');

  // 2. Add JS before </script>
  html = html.replace('</script>', IME_JS + '\n</script>');

  writeFileSync(path, html, 'utf-8');
  console.log(`${fname}: patched (${(html.length/1024).toFixed(0)}KB)`);
}

console.log('All practice files patched with IME!');

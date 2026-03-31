import { readFileSync, writeFileSync } from 'fs';

const file = 'public/index.html';
let html = readFileSync(file, 'utf-8');

// ═══ 1. ADD FLOATING SEARCH CSS before </style> ═══
const floatCSS = `
/* ═══ FLOATING SEARCH WIDGET ═══ */
.float-search-btn {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--gold-dark), var(--gold));
  border: none;
  color: var(--white);
  font-size: 22px;
  cursor: pointer;
  z-index: 9000;
  box-shadow: 0 4px 20px rgba(212,168,67,0.3);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.float-search-btn:hover { transform: scale(1.1); box-shadow: 0 6px 28px rgba(212,168,67,0.4); }
.float-search-btn.hidden { display: none; }

.float-search-panel {
  position: fixed;
  bottom: 80px;
  right: 20px;
  width: 380px;
  max-width: calc(100vw - 40px);
  background: var(--card);
  border: 1px solid var(--gold-dark);
  border-radius: 14px;
  box-shadow: 0 12px 48px rgba(0,0,0,0.6);
  z-index: 9001;
  display: none;
  overflow: hidden;
}
.float-search-panel.open { display: block; animation: slideUp 0.2s ease; }
.float-search-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}
.float-search-header input {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--white);
  font-size: 15px;
  font-family: 'DM Sans', 'Noto Sans JP';
  outline: none;
  caret-color: var(--gold);
}
.float-search-header input::placeholder { color: var(--muted); }
.float-search-close {
  background: none;
  border: none;
  color: var(--muted);
  font-size: 16px;
  cursor: pointer;
  padding: 4px 6px;
}
.float-search-close:hover { color: var(--text); }
.float-search-results {
  max-height: 400px;
  overflow-y: auto;
}
.float-search-results::-webkit-scrollbar { width: 4px; }
.float-search-results::-webkit-scrollbar-thumb { background: var(--gold-dark); border-radius: 2px; }

.fsr-item {
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background 0.12s;
}
.fsr-item:hover { background: var(--surface); }
.fsr-item .fsr-jp { font-size: 20px; font-family: 'Klee One', 'Noto Sans JP'; color: var(--gold); font-weight: 600; }
.fsr-item .fsr-reading { font-size: 11px; color: var(--text-dim); margin-left: 8px; }
.fsr-item .fsr-en { font-size: 13px; color: var(--white); margin-top: 2px; }
.fsr-item .fsr-ch { font-size: 10px; color: var(--muted); margin-top: 2px; }
.fsr-item .fsr-type {
  display: inline-block;
  font-size: 9px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 6px;
  vertical-align: middle;
}
.fsr-item .fsr-speak {
  background: var(--gold-dark);
  border: none;
  color: var(--white);
  padding: 3px 8px;
  border-radius: 5px;
  font-size: 10px;
  cursor: pointer;
  margin-left: 8px;
  font-family: 'DM Sans';
}
.fsr-item .fsr-speak:hover { filter: brightness(1.2); }
.fsr-empty { padding: 20px; text-align: center; color: var(--muted); font-size: 13px; }
.fsr-hint { padding: 8px 14px; text-align: center; color: var(--muted); font-size: 10px; background: var(--surface); border-top: 1px solid var(--border); }

@media (max-width: 600px) {
  .float-search-panel { bottom: 70px; right: 10px; left: 10px; width: auto; }
  .float-search-btn { bottom: 14px; right: 14px; width: 46px; height: 46px; font-size: 20px; }
}
`;

html = html.replace('</style>', floatCSS + '\n</style>');

// ═══ 2. ADD FLOATING SEARCH HTML before </body> ═══
const floatHTML = `
<!-- FLOATING SEARCH WIDGET -->
<button class="float-search-btn" id="floatSearchBtn" onclick="toggleFloatSearch()" title="Search (Ctrl+F)">🔍</button>
<div class="float-search-panel" id="floatSearchPanel">
  <div class="float-search-header">
    <span style="color:var(--gold);font-size:16px">🔍</span>
    <input type="text" id="floatSearchInput" placeholder="Search vocab, grammar, kanji..." oninput="floatSearchHandler(this.value)" autofocus>
    <button class="float-search-close" onclick="toggleFloatSearch()">&times;</button>
  </div>
  <div class="float-search-results" id="floatSearchResults">
    <div class="fsr-empty">Type to search across all chapters</div>
  </div>
  <div class="fsr-hint">Ctrl+F to open · Esc to close · Click result to jump</div>
</div>
`;

html = html.replace('</body>', floatHTML + '\n</body>');

// ═══ 3. ADD FLOATING SEARCH JS + IMPROVED TOOLTIP before closing </script> ═══
const newJS = `

// ═══ FLOATING SEARCH WIDGET ═══
let floatSearchOpen = false;

function toggleFloatSearch() {
  floatSearchOpen = !floatSearchOpen;
  const panel = document.getElementById('floatSearchPanel');
  const btn = document.getElementById('floatSearchBtn');
  if (floatSearchOpen) {
    panel.classList.add('open');
    btn.classList.add('hidden');
    setTimeout(() => document.getElementById('floatSearchInput').focus(), 50);
  } else {
    panel.classList.remove('open');
    btn.classList.remove('hidden');
    document.getElementById('floatSearchInput').value = '';
    document.getElementById('floatSearchResults').innerHTML = '<div class="fsr-empty">Type to search across all chapters</div>';
  }
}

// Ctrl+F override
document.addEventListener('keydown', function(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
    e.preventDefault();
    if (!floatSearchOpen) toggleFloatSearch();
    else document.getElementById('floatSearchInput').focus();
  }
  if (e.key === 'Escape' && floatSearchOpen) {
    toggleFloatSearch();
  }
});

function floatSearchHandler(query) {
  const q = query.trim().toLowerCase();
  const results = document.getElementById('floatSearchResults');

  if (q.length < 1) {
    results.innerHTML = '<div class="fsr-empty">Type to search across all chapters</div>';
    return;
  }

  if (!searchIdx.length) buildSearchIndex();

  // Score-based matching for better accuracy
  const scored = searchIdx.map(item => {
    let score = 0;
    const jpClean = (item.jp || '').replace(/[（）()～、]/g, '').toLowerCase();
    const readClean = (item.reading || '').toLowerCase();
    const enClean = (item.en || '').toLowerCase();

    // Exact matches get highest score
    if (jpClean === q) score += 100;
    else if (readClean === q) score += 90;
    else if (enClean === q) score += 85;
    // Starts-with matches
    else if (jpClean.startsWith(q)) score += 70;
    else if (readClean.startsWith(q)) score += 65;
    else if (enClean.startsWith(q)) score += 60;
    // Contains matches
    else if (jpClean.includes(q)) score += 40;
    else if (readClean.includes(q)) score += 35;
    else if (enClean.includes(q)) score += 30;
    else if ((item.title || '').toLowerCase().includes(q)) score += 15;

    // Boost vocab over cards
    if (item.type === 'vocab') score += 5;
    else if (item.type === 'dialogue') score += 2;

    return { item, score };
  }).filter(s => s.score > 0).sort((a, b) => b.score - a.score);

  const shown = scored.slice(0, 25);

  if (!shown.length) {
    results.innerHTML = '<div class="fsr-empty">No results for "' + escHTML(q) + '"</div>';
    return;
  }

  const chNames = {ch1:'Ch 1',ch2:'Ch 2',ch3:'Ch 3',ch4:'Ch 4',ch5:'Ch 5',ch6:'Ch 6'};

  let h = '';
  shown.forEach(({item: m}) => {
    const typeColor = m.type === 'vocab' ? 'var(--gold)' : m.type === 'dialogue' ? 'var(--green)' : 'var(--blue)';
    const typeLabel = m.type === 'vocab' ? 'VOCAB' : m.type === 'dialogue' ? 'DIALOGUE' : 'CARD';
    const chLabel = m.chLabel || chNames[m.ch] || m.ch;

    if (m.type === 'vocab') {
      h += '<div class="fsr-item" onclick="jumpFromFloat(\\''+m.ch+'\\')">'
        + '<div><span class="fsr-jp">' + escHTML(m.jp) + '</span>'
        + (m.reading ? '<span class="fsr-reading">' + escHTML(m.reading) + '</span>' : '')
        + '<span class="fsr-type" style="background:'+typeColor+'20;color:'+typeColor+'">' + typeLabel + '</span>'
        + '<button class="fsr-speak" onclick="event.stopPropagation();speakJP(\\''+m.jp.replace(/'/g,"\\\\'")+'\\')">🔊</button>'
        + '</div>'
        + '<div class="fsr-en">' + escHTML(m.en) + '</div>'
        + '<div class="fsr-ch">' + escHTML(chLabel) + '</div>'
        + '</div>';
    } else if (m.type === 'dialogue') {
      h += '<div class="fsr-item" onclick="jumpFromFloat(\\''+m.ch+'\\')">'
        + '<div><span class="fsr-jp">' + escHTML(m.jp) + '</span>'
        + '<span class="fsr-type" style="background:'+typeColor+'20;color:'+typeColor+'">' + typeLabel + '</span>'
        + '</div>'
        + '<div class="fsr-en">' + escHTML(m.en) + '</div>'
        + '<div class="fsr-ch">' + escHTML(chLabel) + ' · ' + escHTML(m.title || '') + '</div>'
        + '</div>';
    } else {
      h += '<div class="fsr-item" onclick="jumpFromFloat(\\''+m.ch+'\\')">'
        + '<div><span style="color:var(--white);font-size:13px;font-weight:600">' + escHTML(m.title || '') + '</span>'
        + '<span class="fsr-type" style="background:'+typeColor+'20;color:'+typeColor+'">' + typeLabel + '</span>'
        + '</div>'
        + '<div class="fsr-ch">' + escHTML(chLabel) + '</div>'
        + '</div>';
    }
  });

  results.innerHTML = h;
}

function jumpFromFloat(ch) {
  showChapter(ch);
  toggleFloatSearch();
  window.scrollTo({top: 0, behavior: 'smooth'});
}

// ═══ IMPROVED TOOLTIP LOOKUP ═══
// Override the existing lookupWord with better matching
const _origLookupWord = typeof lookupWord === 'function' ? lookupWord : null;
lookupWord = function(text) {
  if (!vocabDict) buildVocabDict();
  const clean = text.replace(/[（）()～、。！？\\s]/g, '').trim();
  if (!clean) return null;

  // Try exact match first
  if (vocabDict[clean]) {
    const v = vocabDict[clean];
    return formatLookup(v);
  }

  // Try without trailing particles
  const particles = ['は','が','を','に','で','の','と','も','から','まで','へ','や','より','か'];
  for (const p of particles) {
    if (clean.endsWith(p) && clean.length > p.length) {
      const stem = clean.slice(0, -p.length);
      if (vocabDict[stem]) return formatLookup(vocabDict[stem]);
    }
  }

  // Try all vocab for best substring match
  let bestMatch = null;
  let bestLen = 0;
  for (const key in vocabDict) {
    if (clean.includes(key) && key.length > bestLen) {
      bestMatch = vocabDict[key];
      bestLen = key.length;
    }
    if (key.includes(clean) && clean.length > bestLen) {
      bestMatch = vocabDict[key];
      bestLen = clean.length;
    }
  }
  if (bestMatch) return formatLookup(bestMatch);

  // Fallback
  return {
    japanese: text,
    reading: '',
    english: '(tap 🔊 to hear pronunciation)',
    katakana: toKatakana(text),
    example: ''
  };
};

function formatLookup(v) {
  return {
    japanese: v.japanese,
    reading: v.reading || '',
    english: v.english || '',
    katakana: toKatakana(v.japanese),
    example: findExample(v.japanese)
  };
}
`;

html = html.replace('</script>', newJS + '\n</script>');

writeFileSync(file, html, 'utf-8');
console.log('Patch 2 applied! File size:', (html.length / 1024).toFixed(0), 'KB');

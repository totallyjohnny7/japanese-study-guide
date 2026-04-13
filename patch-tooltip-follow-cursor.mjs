// patch-tooltip-follow-cursor.mjs
// Replaces the old absolute-positioned hover tooltip with a cursor-following
// floating tooltip powered by JS. Safer UX for long cards — the example
// sentence appears right next to the cursor instead of at the card's bottom-center.
//
// Idempotent: rerunning is safe (uses markers to find+replace).

import fs from 'node:fs';
import path from 'node:path';

const FILE = path.join('public', 'index.html');
let html = fs.readFileSync(FILE, 'utf8');
const before = html.length;

// ════════════════════════════════════════════════════════════════════════════
// STEP 1 — replace the old CSS block with a cleaner one that hides va-ex
//           and prepares a single floating tooltip element
// ════════════════════════════════════════════════════════════════════════════
const OLD_CSS_START = '/* VOCAB-ATLAS-HOVER-TOOLTIP */';
const OLD_CSS_END_MARKER = '#panel_ref-vocab .card:not(:has(.va-ex)) .card-header::after { content: ""; }';

const oldStartIdx = html.indexOf(OLD_CSS_START);
const oldEndIdx = html.indexOf(OLD_CSS_END_MARKER);

const NEW_CSS = `/* VOCAB-ATLAS-HOVER-TOOLTIP v2 — cursor-following */
#panel_ref-vocab .va-ex { display: none; }
#panel_ref-vocab .card:has(.va-ex) .card-header::after {
  content: " ℹ︎ hover for example";
  font-size: 9px;
  color: rgba(255,255,255,0.55);
  font-weight: 400;
  letter-spacing: 0.5px;
  margin-left: 8px;
}
#va-cursor-tip {
  position: fixed;
  z-index: 9999;
  max-width: min(420px, 88vw);
  background: #0d0e15;
  border: 1px solid #6b5518;
  border-radius: 8px;
  padding: 10px 14px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.65);
  font-size: 12px;
  line-height: 1.55;
  color: var(--text);
  pointer-events: none;
  opacity: 0;
  transition: opacity 120ms ease-out;
  display: none;
}
#va-cursor-tip.visible { display: block; opacity: 1; }
#va-cursor-tip .oe-ja { color: var(--white); font-size: 13px; display: block; margin-bottom: 4px; }
#va-cursor-tip .oe-en { color: var(--text-dim); font-size: 11px; display: block; }
#va-cursor-tip .vt-label {
  display: block;
  color: #e2b449;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1px;
  margin-bottom: 4px;
  text-transform: uppercase;
}`;

if (oldStartIdx !== -1 && oldEndIdx !== -1) {
  // Replace between the markers (inclusive of the end marker line)
  const endOfLine = html.indexOf('\n', oldEndIdx) + 1;
  html = html.slice(0, oldStartIdx) + NEW_CSS + '\n' + html.slice(endOfLine);
  console.log('✓ Replaced old CSS block with v2 cursor-following CSS');
} else if (!html.includes('VOCAB-ATLAS-HOVER-TOOLTIP v2')) {
  // No old block to replace — inject before first </style>
  html = html.replace('</style>', NEW_CSS + '\n</style>');
  console.log('✓ Injected v2 cursor-following CSS (no old block found)');
} else {
  console.log('✓ v2 CSS already present');
}

// ════════════════════════════════════════════════════════════════════════════
// STEP 2 — inject the tooltip element + JS driver before </body>
// ════════════════════════════════════════════════════════════════════════════
const JS_MARKER = '/* VA-CURSOR-TIP-JS */';
const JS_BLOCK = `
<!-- Vocab Atlas cursor-following tooltip -->
<div id="va-cursor-tip" aria-hidden="true"></div>
<script>
${JS_MARKER}
(function(){
  const panel = document.getElementById('panel_ref-vocab');
  const tip = document.getElementById('va-cursor-tip');
  if (!panel || !tip) return;

  const OFFSET_X = 16;
  const OFFSET_Y = 18;
  let currentCard = null;

  // Extract the example HTML from a card, returning a string or null
  function getExampleHTML(card) {
    const va = card.querySelector(':scope > .card-body > .va-ex, :scope > .va-ex');
    if (!va) return null;
    // Clone so we can read without touching DOM
    const html = va.innerHTML;
    return html;
  }

  function showTip(card, x, y) {
    if (currentCard === card) {
      positionTip(x, y);
      return;
    }
    const exHtml = getExampleHTML(card);
    if (!exHtml) { hideTip(); return; }
    currentCard = card;
    // Find the header label for context
    const headerEl = card.querySelector('.card-header');
    const label = headerEl ? headerEl.textContent.replace(/\\s*ℹ︎.*$/, '').trim() : '';
    tip.innerHTML = (label ? '<span class="vt-label">' + escapeHtml(label) + '</span>' : '') + exHtml;
    tip.classList.add('visible');
    tip.setAttribute('aria-hidden', 'false');
    positionTip(x, y);
  }

  function hideTip() {
    currentCard = null;
    tip.classList.remove('visible');
    tip.setAttribute('aria-hidden', 'true');
  }

  function positionTip(x, y) {
    // Default: below-right of cursor. Flip if it would overflow viewport.
    tip.style.left = '-9999px';
    tip.style.top = '0px';
    // Force reflow so we can measure
    const rect = tip.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = x + OFFSET_X;
    let top = y + OFFSET_Y;
    if (left + rect.width > vw - 8) left = x - rect.width - OFFSET_X;
    if (left < 8) left = 8;
    if (top + rect.height > vh - 8) top = y - rect.height - OFFSET_Y;
    if (top < 8) top = 8;
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  }

  // Delegated listeners on the panel (works for dynamically added cards too)
  panel.addEventListener('mousemove', function(e) {
    const card = e.target.closest('.card');
    if (card && panel.contains(card) && card.querySelector('.va-ex')) {
      showTip(card, e.clientX, e.clientY);
    } else if (currentCard) {
      hideTip();
    }
  });
  panel.addEventListener('mouseleave', hideTip);
  // Hide on scroll (position would be stale)
  window.addEventListener('scroll', hideTip, { passive: true });
  // Touch devices: tap a card to toggle tooltip at tap point
  panel.addEventListener('touchstart', function(e) {
    const t = e.touches[0];
    const card = e.target.closest('.card');
    if (card && card.querySelector('.va-ex')) {
      if (currentCard === card) hideTip();
      else showTip(card, t.clientX, t.clientY);
      e.preventDefault();
    }
  }, { passive: false });
})();
</script>
`;

if (!html.includes(JS_MARKER)) {
  html = html.replace('</body>', JS_BLOCK + '\n</body>');
  console.log('✓ Injected cursor-following JS before </body>');
} else {
  console.log('✓ Cursor-following JS already present');
}

// ════════════════════════════════════════════════════════════════════════════
fs.writeFileSync(FILE, html);
console.log(`\n✓ Wrote ${FILE}`);
console.log(`  Size: ${before} → ${html.length} bytes (${html.length - before > 0 ? '+' : ''}${html.length - before})`);

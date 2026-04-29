/* ============================================================
   TWEAKS CAPTURE SYSTEM — japanese-study-guide.pages.dev
   - Add / edit / delete tweaks tagged with current section
   - Sections auto-discovered from page headings (h1/h2/h3) + page filename
   - Paste screenshots into modal (Ctrl/Cmd-V); stored as base64 in localStorage
   - Cross-page: one shared deck across every .html, grouped by Page › Section
   - Copy all → markdown for pasting into Claude Code; .md download with images embedded
   - Ported from biol3020-exam4 single-page tweaks system, adapted for multi-page Japanese site
   ============================================================ */
(function () {
  if (window.__japaneseTweaksLoaded) return;
  window.__japaneseTweaksLoaded = true;

  const STORAGE_KEY = 'japanese-tweaks-v1';
  const MAX_IMAGE_BYTES = 800 * 1024;

  // Page identity — derived from URL pathname
  const pageFile = (() => {
    const p = location.pathname.replace(/\/+$/, '');
    const last = p.split('/').pop() || 'index.html';
    return last.endsWith('.html') ? last : (last || 'index.html');
  })();
  const pageLabel = pageFile.replace(/\.html$/, '');

  /* ============================================================
     INJECT STYLES
     ============================================================ */
  const style = document.createElement('style');
  style.textContent = `
    /* Tweaks system styles — scoped to .tweak-* classes; uses japanese-study-guide vars when available */
    .tweak-fab {
      position: fixed; right: 18px; bottom: 18px; z-index: 9050;
      display: inline-flex; align-items: center; gap: 6px;
      padding: 9px 14px; border: 1px solid rgba(212,168,67,0.4); border-radius: 999px;
      background: rgba(20,20,22,0.92); backdrop-filter: blur(10px);
      color: var(--text, #e0ddd5);
      font-family: 'DM Sans', system-ui, sans-serif; font-size: 13px; font-weight: 500;
      cursor: pointer; box-shadow: 0 4px 16px rgba(0,0,0,0.4);
      transition: transform .12s, background .12s, border-color .12s;
    }
    .tweak-fab:hover { transform: translateY(-1px); background: rgba(30,30,34,0.96); border-color: var(--gold, #d4a843); }
    .tweak-fab .tweak-plus { color: var(--gold, #d4a843); font-weight: 700; font-size: 16px; line-height: 1; }
    .tweak-fab .tweak-count {
      background: rgba(212,168,67,0.2); color: var(--gold, #d4a843);
      border-radius: 8px; padding: 1px 7px;
      font-family: 'DM Mono', ui-monospace, monospace; font-size: 11px; margin-left: 4px;
    }
    .tweak-fab .tweak-count[data-empty] { display: none; }
    .tweak-fab.list-mode { background: rgba(212,168,67,0.18); border-color: var(--gold, #d4a843); color: var(--gold, #d4a843); }

    @media print { .tweak-fab, .tweak-modal-scrim, .tweak-panel-scrim, .tweak-toast { display: none !important; } }

    /* Modal */
    .tweak-modal-scrim {
      position: fixed; inset: 0; z-index: 9060; background: rgba(0,0,0,0.6);
      display: none; align-items: flex-start; justify-content: center;
      padding: 80px 18px 24px; overflow-y: auto;
    }
    .tweak-modal-scrim.open { display: flex; }
    .tweak-modal {
      background: #15161a; border: 1px solid rgba(212,168,67,0.25); border-radius: 8px;
      box-shadow: 0 24px 60px rgba(0,0,0,0.6);
      width: 100%; max-width: 540px; padding: 22px;
      font-family: 'DM Sans', system-ui, sans-serif; color: var(--text, #e0ddd5);
    }
    .tweak-modal h3 {
      margin: 0 0 4px;
      font-family: 'Cormorant Garamond', 'DM Sans', serif;
      font-size: 22px; font-weight: 600;
    }
    .tweak-modal .tweak-section-tag {
      display: inline-flex; align-items: center; gap: 6px;
      font-family: 'DM Mono', ui-monospace, monospace;
      font-size: 11px; color: rgba(224,221,213,0.6);
      text-transform: uppercase; letter-spacing: 0.06em;
      margin-bottom: 14px; word-break: break-word;
    }
    .tweak-modal .tweak-section-tag::before { content: "📍"; font-size: 14px; }
    .tweak-modal textarea {
      width: 100%; min-height: 110px; padding: 10px 12px;
      font-family: 'DM Sans', system-ui, sans-serif;
      font-size: 14px; line-height: 1.5;
      color: var(--text, #e0ddd5); background: #0c0d10;
      border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; resize: vertical;
      box-sizing: border-box;
    }
    .tweak-modal textarea:focus { outline: 2px solid var(--gold, #d4a843); outline-offset: 1px; }
    .tweak-modal .tweak-img-tray {
      display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; min-height: 24px;
    }
    .tweak-modal .tweak-img-tray:empty::before {
      content: "Tip: paste a screenshot here (Ctrl/Cmd-V) — Win+Shift+S, then paste";
      font-size: 12px; color: rgba(224,221,213,0.5); font-style: italic;
    }
    .tweak-modal .tweak-img {
      position: relative; width: 100px; height: 70px;
      border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden; background: #0c0d10;
    }
    .tweak-modal .tweak-img img { width: 100%; height: 100%; object-fit: cover; }
    .tweak-modal .tweak-img-x {
      position: absolute; top: 2px; right: 2px;
      width: 18px; height: 18px; border: 0; border-radius: 50%;
      background: rgba(0,0,0,0.7); color: white; font-size: 11px; line-height: 1; cursor: pointer; padding: 0;
    }
    .tweak-modal .tweak-actions {
      margin-top: 16px; display: flex; gap: 8px; justify-content: flex-end;
    }
    .tweak-modal .tweak-actions button {
      padding: 7px 16px; border-radius: 5px;
      font-family: 'DM Sans', system-ui, sans-serif; font-size: 13px; font-weight: 500;
      cursor: pointer; border: 1px solid rgba(255,255,255,0.15);
      background: #1a1b1f; color: var(--text, #e0ddd5);
      transition: background .1s, border-color .1s;
    }
    .tweak-modal .tweak-actions button.primary {
      background: var(--gold, #d4a843); color: #0a0a0a; border-color: var(--gold, #d4a843);
    }
    .tweak-modal .tweak-actions button.primary:hover { background: #e9c168; }
    .tweak-modal .tweak-actions button.secondary:hover { background: #25262b; }
    .tweak-modal .tweak-actions button.danger {
      color: #d97757; border-color: rgba(217,119,87,0.5); margin-right: auto;
    }
    .tweak-modal .tweak-actions button.danger:hover { background: rgba(217,119,87,0.15); }
    .tweak-modal .tweak-meta {
      margin-top: 10px;
      font-family: 'DM Mono', ui-monospace, monospace;
      font-size: 10px; color: rgba(224,221,213,0.45); letter-spacing: 0.04em;
    }

    /* Panel */
    .tweak-panel-scrim {
      position: fixed; inset: 0; z-index: 9055; background: rgba(0,0,0,0.6);
      display: none; align-items: flex-start; justify-content: center;
      padding: 60px 18px 24px; overflow-y: auto;
    }
    .tweak-panel-scrim.open { display: flex; }
    .tweak-panel {
      background: #15161a; border: 1px solid rgba(212,168,67,0.25); border-radius: 8px;
      box-shadow: 0 24px 60px rgba(0,0,0,0.6);
      width: 100%; max-width: 720px; max-height: calc(100vh - 100px);
      padding: 22px 24px 24px;
      font-family: 'DM Sans', system-ui, sans-serif; color: var(--text, #e0ddd5);
      display: flex; flex-direction: column;
    }
    .tweak-panel-head {
      display: flex; align-items: baseline; gap: 14px; margin-bottom: 14px; flex-wrap: wrap;
    }
    .tweak-panel-head h3 {
      margin: 0;
      font-family: 'Cormorant Garamond', 'DM Sans', serif;
      font-size: 22px; font-weight: 600;
    }
    .tweak-panel-head .tweak-panel-count {
      font-family: 'DM Mono', ui-monospace, monospace;
      font-size: 11px; color: rgba(224,221,213,0.55);
      letter-spacing: 0.04em; text-transform: uppercase;
    }
    .tweak-panel-head .tweak-panel-actions {
      margin-left: auto; display: flex; gap: 6px; flex-wrap: wrap;
    }
    .tweak-panel-head button {
      padding: 6px 12px; border-radius: 4px;
      font-family: 'DM Sans', system-ui, sans-serif; font-size: 12px; font-weight: 500;
      cursor: pointer; border: 1px solid rgba(255,255,255,0.15);
      background: #1a1b1f; color: var(--text, #e0ddd5);
    }
    .tweak-panel-head button.primary {
      background: var(--gold, #d4a843); color: #0a0a0a; border-color: var(--gold, #d4a843);
    }
    .tweak-panel-head button:hover { background: #25262b; }
    .tweak-panel-head button.primary:hover { background: #e9c168; }
    .tweak-panel-head button.danger { color: #d97757; border-color: rgba(217,119,87,0.4); }
    .tweak-panel-body { overflow-y: auto; margin: 0 -8px; padding: 0 8px; }
    .tweak-group { margin-top: 16px; }
    .tweak-group:first-child { margin-top: 4px; }
    .tweak-group-h {
      font-family: 'DM Mono', ui-monospace, monospace;
      font-size: 10px; text-transform: uppercase; letter-spacing: 0.14em;
      color: var(--gold, #d4a843); margin-bottom: 6px; padding-bottom: 4px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .tweak-item {
      background: #0c0d10; border: 1px solid rgba(255,255,255,0.08); border-radius: 5px;
      padding: 10px 12px; margin-top: 6px;
    }
    .tweak-item-row1 { display: flex; gap: 10px; align-items: baseline; margin-bottom: 4px; }
    .tweak-item-time {
      font-family: 'DM Mono', ui-monospace, monospace;
      font-size: 10px; color: rgba(224,221,213,0.5); letter-spacing: 0.04em;
    }
    .tweak-item-actions { margin-left: auto; display: flex; gap: 4px; }
    .tweak-item-actions button {
      padding: 3px 9px; border: 1px solid rgba(255,255,255,0.12); border-radius: 3px;
      background: transparent; color: rgba(224,221,213,0.7);
      font-family: 'DM Sans', system-ui, sans-serif; font-size: 11px; cursor: pointer;
    }
    .tweak-item-actions button:hover { background: #1a1b1f; color: var(--text, #e0ddd5); border-color: rgba(255,255,255,0.25); }
    .tweak-item-actions button.danger { color: #d97757; }
    .tweak-item-actions button.danger:hover { background: rgba(217,119,87,0.18); border-color: #d97757; }
    .tweak-item-note {
      font-size: 14px; line-height: 1.45; color: var(--text, #e0ddd5);
      white-space: pre-wrap; word-wrap: break-word;
    }
    .tweak-item-imgs { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .tweak-item-imgs img {
      height: 60px; border: 1px solid rgba(255,255,255,0.1); border-radius: 3px; cursor: zoom-in;
    }
    .tweak-empty {
      text-align: center; padding: 40px 20px;
      color: rgba(224,221,213,0.55);
      font-family: 'DM Sans', system-ui, sans-serif;
      font-size: 13px; font-style: italic;
    }
    .tweak-empty kbd {
      background: #1a1b1f; padding: 1px 6px; border-radius: 3px;
      border: 1px solid rgba(255,255,255,0.15); font-family: 'DM Mono', ui-monospace, monospace; font-size: 11px;
    }

    /* Toast */
    .tweak-toast {
      position: fixed; bottom: 24px; left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: var(--text, #e0ddd5); color: #0a0a0a;
      padding: 9px 18px; border-radius: 5px;
      font-family: 'DM Sans', system-ui, sans-serif; font-size: 13px;
      z-index: 9100; opacity: 0; pointer-events: none;
      transition: opacity .18s, transform .18s;
    }
    .tweak-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

    @media (max-width: 540px) {
      .tweak-fab { right: 12px; bottom: 12px; padding: 8px 12px; font-size: 12px; }
      .tweak-modal { max-width: 100%; }
      .tweak-panel { padding: 16px; }
      .tweak-panel-head .tweak-panel-actions button { padding: 5px 8px; font-size: 11px; }
    }
  `;
  document.head.appendChild(style);

  /* ============================================================
     INJECT DOM
     ============================================================ */
  const container = document.createElement('div');
  container.innerHTML = `
    <button class="tweak-fab" id="tweakFab" type="button" title="Add a tweak (T) — auto-tagged with current section">
      <span class="tweak-plus">+</span><span>Tweak</span><span class="tweak-count" id="tweakCount" data-empty>0</span>
    </button>
    <div class="tweak-modal-scrim" id="tweakModalScrim" aria-hidden="true">
      <div class="tweak-modal" role="dialog" aria-label="Add or edit tweak">
        <h3 id="tweakModalTitle">Add tweak</h3>
        <div class="tweak-section-tag" id="tweakSectionTag">—</div>
        <textarea id="tweakNote" placeholder="What needs to change here? (e.g. 'fix vocab translation', 'add example for ~ば conditional')" autocomplete="off"></textarea>
        <div class="tweak-img-tray" id="tweakImgTray" tabindex="0" aria-label="Screenshots (paste images here)"></div>
        <div class="tweak-actions">
          <button type="button" class="danger" id="tweakDelete" style="display:none;">Delete</button>
          <button type="button" class="secondary" id="tweakCancel">Cancel</button>
          <button type="button" class="primary" id="tweakSave">Save</button>
        </div>
        <div class="tweak-meta" id="tweakModalMeta"></div>
      </div>
    </div>
    <div class="tweak-panel-scrim" id="tweakPanelScrim" aria-hidden="true">
      <div class="tweak-panel" role="dialog" aria-label="Tweaks list">
        <div class="tweak-panel-head">
          <h3>Tweaks</h3>
          <span class="tweak-panel-count" id="tweakPanelCount">0</span>
          <div class="tweak-panel-actions">
            <button type="button" class="primary" id="tweakCopyAll" title="Copy as text — paste into chat">Copy text</button>
            <button type="button" id="tweakDownloadMd" title="Download a single markdown file with images embedded as base64 — drag into Claude Code">.md</button>
            <button type="button" class="danger" id="tweakClearAll">Clear all</button>
            <button type="button" id="tweakPanelClose">Close</button>
          </div>
        </div>
        <div class="tweak-panel-body" id="tweakPanelBody"></div>
      </div>
    </div>
    <div class="tweak-toast" id="tweakToast" role="status" aria-live="polite"></div>
  `;
  document.body.appendChild(container);

  /* ============================================================
     SECTION DISCOVERY (auto from headings)
     ============================================================ */
  function slugify(s) {
    return (s || '').toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'section';
  }

  // Find candidate section anchors: h1, h2, h3, plus elements with id (in heading order)
  let sectionAnchors = [];
  function discoverSections() {
    const headings = Array.from(document.querySelectorAll('h1, h2, h3'));
    sectionAnchors = headings.map((h, i) => {
      // Skip headings inside the tweaks UI itself
      if (h.closest('.tweak-modal, .tweak-panel, .tweak-fab')) return null;
      const text = (h.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120);
      if (!text) return null;
      // Use existing id, or generate stable one from text + index
      const id = h.id || (slugify(text) + '-' + i);
      return { el: h, id, label: text, level: parseInt(h.tagName[1], 10) };
    }).filter(Boolean);
    return sectionAnchors;
  }

  // Track current section via scroll position (no IntersectionObserver needed for simplicity)
  function getCurrentSection() {
    if (sectionAnchors.length === 0) discoverSections();
    if (sectionAnchors.length === 0) {
      return { id: pageFile + '#top', label: pageLabel + ' › Top of page' };
    }
    // Find the last heading that's at or above the viewport top (with small offset)
    const offset = 120;
    let current = sectionAnchors[0];
    for (const s of sectionAnchors) {
      const rect = s.el.getBoundingClientRect();
      if (rect.top <= offset) current = s;
      else break;
    }
    return {
      id: pageFile + '#' + current.id,
      label: pageLabel + ' › ' + current.label
    };
  }

  /* ============================================================
     STATE + STORAGE
     ============================================================ */
  const fab = document.getElementById('tweakFab');
  const countEl = document.getElementById('tweakCount');
  const modalScrim = document.getElementById('tweakModalScrim');
  const modalTitle = document.getElementById('tweakModalTitle');
  const sectionTag = document.getElementById('tweakSectionTag');
  const noteEl = document.getElementById('tweakNote');
  const imgTray = document.getElementById('tweakImgTray');
  const saveBtn = document.getElementById('tweakSave');
  const cancelBtn = document.getElementById('tweakCancel');
  const deleteBtn = document.getElementById('tweakDelete');
  const metaEl = document.getElementById('tweakModalMeta');
  const panelScrim = document.getElementById('tweakPanelScrim');
  const panelBody = document.getElementById('tweakPanelBody');
  const panelCount = document.getElementById('tweakPanelCount');
  const copyAllBtn = document.getElementById('tweakCopyAll');
  const downloadMdBtn = document.getElementById('tweakDownloadMd');
  const clearAllBtn = document.getElementById('tweakClearAll');
  const panelCloseBtn = document.getElementById('tweakPanelClose');
  const toastEl = document.getElementById('tweakToast');

  let tweaks = [];
  let editingId = null;
  let pendingImgs = [];

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      tweaks = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(tweaks)) tweaks = [];
    } catch (e) { tweaks = []; }
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tweaks)); return true; }
    catch (e) { toast('Storage full — try removing screenshots from older tweaks.'); return false; }
  }
  function uid() { return 't_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7); }
  function fmtTime(ts) {
    const d = new Date(ts);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return isToday ? time : d.toLocaleDateString() + ' ' + time;
  }
  function escHtml(s) {
    return (s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }
  function toast(msg, ms) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toastEl.classList.remove('show'), ms || 1800);
  }
  function refreshCount() {
    countEl.textContent = String(tweaks.length);
    if (tweaks.length === 0) countEl.setAttribute('data-empty', '');
    else countEl.removeAttribute('data-empty');
    panelCount.textContent = tweaks.length + (tweaks.length === 1 ? ' tweak' : ' tweaks');
  }

  /* ============================================================
     MODAL
     ============================================================ */
  function renderImgTray() {
    imgTray.innerHTML = '';
    pendingImgs.forEach((dataUrl, i) => {
      const wrap = document.createElement('div');
      wrap.className = 'tweak-img';
      const img = document.createElement('img');
      img.src = dataUrl;
      img.alt = 'Screenshot ' + (i + 1);
      wrap.appendChild(img);
      const x = document.createElement('button');
      x.type = 'button';
      x.className = 'tweak-img-x';
      x.textContent = '×';
      x.title = 'Remove';
      x.addEventListener('click', () => { pendingImgs.splice(i, 1); renderImgTray(); });
      wrap.appendChild(x);
      imgTray.appendChild(wrap);
    });
  }

  function openModal({ tweakId } = {}) {
    editingId = tweakId || null;
    const sec = getCurrentSection();
    if (editingId) {
      const t = tweaks.find(x => x.id === editingId);
      if (!t) { editingId = null; return; }
      modalTitle.textContent = 'Edit tweak';
      sectionTag.textContent = t.sectionLabel || sec.label;
      sectionTag.dataset.sectionId = t.sectionId || sec.id;
      noteEl.value = t.note || '';
      pendingImgs = (t.screenshots || []).slice();
      deleteBtn.style.display = '';
      metaEl.textContent = 'Created ' + fmtTime(t.ts) + (t.editedTs ? ' · edited ' + fmtTime(t.editedTs) : '');
    } else {
      modalTitle.textContent = 'Add tweak';
      sectionTag.textContent = sec.label;
      sectionTag.dataset.sectionId = sec.id;
      noteEl.value = '';
      pendingImgs = [];
      deleteBtn.style.display = 'none';
      metaEl.textContent = sec.id ? '#' + sec.id : '';
    }
    renderImgTray();
    modalScrim.classList.add('open');
    modalScrim.setAttribute('aria-hidden', 'false');
    setTimeout(() => noteEl.focus(), 50);
  }
  function closeModal() {
    modalScrim.classList.remove('open');
    modalScrim.setAttribute('aria-hidden', 'true');
    editingId = null;
    pendingImgs = [];
  }

  function commitSave() {
    const note = noteEl.value.trim();
    if (!note && pendingImgs.length === 0) {
      toast('Nothing to save — add a note or paste a screenshot.');
      return;
    }
    if (editingId) {
      const t = tweaks.find(x => x.id === editingId);
      if (t) { t.note = note; t.screenshots = pendingImgs.slice(); t.editedTs = Date.now(); }
    } else {
      tweaks.push({
        id: uid(), ts: Date.now(),
        page: pageFile,
        sectionId: sectionTag.dataset.sectionId || (pageFile + '#top'),
        sectionLabel: sectionTag.textContent || (pageLabel + ' › Top of page'),
        note,
        screenshots: pendingImgs.slice()
      });
    }
    if (save()) {
      refreshCount(); renderPanel(); closeModal();
      toast(editingId ? 'Tweak updated' : 'Tweak saved');
    }
  }

  function commitDelete() {
    if (!editingId) return;
    if (!confirm('Delete this tweak?')) return;
    tweaks = tweaks.filter(t => t.id !== editingId);
    if (save()) { refreshCount(); renderPanel(); closeModal(); toast('Tweak deleted'); }
  }

  /* ============================================================
     CLIPBOARD PASTE → image attach
     ============================================================ */
  document.addEventListener('paste', e => {
    if (!modalScrim.classList.contains('open')) return;
    const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items || [];
    let handled = false;
    for (const item of items) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const f = item.getAsFile();
        if (!f) continue;
        if (f.size > MAX_IMAGE_BYTES * 1.5) {
          toast('Image too large (' + Math.round(f.size / 1024) + ' KB) — keep under 800 KB.');
          continue;
        }
        const reader = new FileReader();
        reader.onload = () => { pendingImgs.push(reader.result); renderImgTray(); toast('Screenshot attached'); };
        reader.readAsDataURL(f);
        handled = true;
      }
    }
    if (handled) e.preventDefault();
  });

  /* ============================================================
     PANEL RENDER
     ============================================================ */
  function renderPanel() {
    if (tweaks.length === 0) {
      panelBody.innerHTML = '<div class="tweak-empty">No tweaks yet.<br>Click <strong>+ Tweak</strong> while reading to flag an issue.<br>Press <kbd>T</kbd> to add quickly · <kbd>Shift</kbd>-click the FAB to open this list.</div>';
      return;
    }
    // Group by sectionLabel
    const groups = {};
    tweaks.forEach(t => {
      const k = t.sectionLabel || '(no section)';
      if (!groups[k]) groups[k] = [];
      groups[k].push(t);
    });
    const keys = Object.keys(groups).sort();
    panelBody.innerHTML = keys.map(k => {
      const items = groups[k].sort((a, b) => a.ts - b.ts);
      const itemsHtml = items.map(t => {
        const imgs = (t.screenshots || []).map(d => `<img src="${d}" alt="screenshot" loading="lazy">`).join('');
        return `<div class="tweak-item" data-id="${t.id}">
          <div class="tweak-item-row1">
            <span class="tweak-item-time">${escHtml(fmtTime(t.ts))}${t.editedTs ? ' · edited ' + escHtml(fmtTime(t.editedTs)) : ''}</span>
            <div class="tweak-item-actions">
              <button class="tweak-edit" data-id="${t.id}">Edit</button>
              <button class="danger tweak-del" data-id="${t.id}">Delete</button>
            </div>
          </div>
          <div class="tweak-item-note">${escHtml(t.note)}</div>
          ${imgs ? `<div class="tweak-item-imgs">${imgs}</div>` : ''}
        </div>`;
      }).join('');
      return `<div class="tweak-group"><div class="tweak-group-h">${escHtml(k)}</div>${itemsHtml}</div>`;
    }).join('');
    panelBody.querySelectorAll('.tweak-edit').forEach(b => b.addEventListener('click', () => {
      panelScrim.classList.remove('open');
      openModal({ tweakId: b.dataset.id });
    }));
    panelBody.querySelectorAll('.tweak-del').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.id;
      if (!confirm('Delete this tweak?')) return;
      tweaks = tweaks.filter(t => t.id !== id);
      if (save()) { refreshCount(); renderPanel(); toast('Tweak deleted'); }
    }));
    panelBody.querySelectorAll('.tweak-item-imgs img').forEach(img => {
      img.addEventListener('click', () => {
        const w = window.open();
        if (w) w.document.write('<img src="' + img.src + '" style="max-width:100%;">');
      });
    });
  }

  /* ============================================================
     EXPORT (markdown)
     ============================================================ */
  function buildMarkdown(opts) {
    opts = opts || {};
    const today = new Date().toLocaleDateString();
    const groups = {};
    tweaks.forEach(t => {
      const k = t.sectionLabel || '(no section)';
      if (!groups[k]) groups[k] = [];
      groups[k].push(t);
    });
    const lines = [
      '# Tweaks for Japanese study site — ' + today,
      '',
      'Total: ' + tweaks.length + ' tweak' + (tweaks.length === 1 ? '' : 's') + '.',
      ''
    ];
    let imgCounter = 0;
    Object.keys(groups).sort().forEach(k => {
      lines.push('## ' + k, '');
      groups[k].sort((a, b) => a.ts - b.ts).forEach(t => {
        lines.push('- **' + new Date(t.ts).toLocaleString() + '** — ' + (t.note || '_(image only)_'));
        (t.screenshots || []).forEach(dataUrl => {
          imgCounter++;
          if (opts.embedBase64) {
            lines.push('  ', '  ![screenshot ' + imgCounter + '](' + dataUrl + ')', '');
          } else {
            lines.push('  _[screenshot ' + imgCounter + ' attached]_');
          }
        });
      });
      lines.push('');
    });
    return lines.join('\n');
  }

  function copyAllText() {
    if (tweaks.length === 0) { toast('No tweaks to copy.'); return; }
    const text = buildMarkdown();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () => toast('Copied ' + tweaks.length + ' tweak' + (tweaks.length > 1 ? 's' : '') + ' to clipboard'),
        () => fallbackCopy(text)
      );
    } else fallbackCopy(text);
  }

  function downloadMarkdown() {
    if (tweaks.length === 0) { toast('No tweaks yet.'); return; }
    const text = buildMarkdown({ embedBase64: true });
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'japanese-tweaks-' + datestamp() + '.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Downloaded — drag the .md into Claude Code');
  }

  function datestamp() {
    const d = new Date();
    return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast('Copied'); }
    catch (e) { toast('Copy failed — text in console'); console.log(text); }
    document.body.removeChild(ta);
  }

  function clearAll() {
    if (tweaks.length === 0) return;
    if (!confirm('Delete ALL ' + tweaks.length + ' tweaks across all pages? This cannot be undone.')) return;
    tweaks = [];
    save(); refreshCount(); renderPanel();
    toast('All tweaks cleared');
  }

  /* ============================================================
     FAB BEHAVIOR + KEYBOARD
     ============================================================ */
  let fabPressTimer = null;
  fab.addEventListener('click', e => {
    if (e.shiftKey) { openPanel(); return; }
    openModal();
  });
  fab.addEventListener('contextmenu', e => { e.preventDefault(); openPanel(); });
  fab.addEventListener('touchstart', () => {
    fabPressTimer = setTimeout(() => { fabPressTimer = null; openPanel(); }, 600);
  });
  fab.addEventListener('touchend', () => { if (fabPressTimer) { clearTimeout(fabPressTimer); fabPressTimer = null; } });
  countEl.addEventListener('click', e => { e.stopPropagation(); openPanel(); });

  function openPanel() {
    renderPanel();
    panelScrim.classList.add('open');
    panelScrim.setAttribute('aria-hidden', 'false');
    fab.classList.add('list-mode');
  }
  function closePanel() {
    panelScrim.classList.remove('open');
    panelScrim.setAttribute('aria-hidden', 'true');
    fab.classList.remove('list-mode');
  }

  saveBtn.addEventListener('click', commitSave);
  cancelBtn.addEventListener('click', closeModal);
  deleteBtn.addEventListener('click', commitDelete);
  modalScrim.addEventListener('click', e => { if (e.target === modalScrim) closeModal(); });
  copyAllBtn.addEventListener('click', copyAllText);
  downloadMdBtn.addEventListener('click', downloadMarkdown);
  clearAllBtn.addEventListener('click', clearAll);
  panelCloseBtn.addEventListener('click', closePanel);
  panelScrim.addEventListener('click', e => { if (e.target === panelScrim) closePanel(); });

  noteEl.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); commitSave(); }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (modalScrim.classList.contains('open')) closeModal();
      else if (panelScrim.classList.contains('open')) closePanel();
    }
  });
  document.addEventListener('keydown', e => {
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;
    if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
    if (e.key === 't' || e.key === 'T') { e.preventDefault(); openModal(); }
  });

  /* ============================================================
     INIT
     ============================================================ */
  load();
  refreshCount();
  // Discover sections after DOM settles (some pages render headings after load)
  setTimeout(discoverSections, 0);
  setTimeout(discoverSections, 800);
})();

// patch-remove-va-ex.mjs
// Removes all <div class="va-ex">…</div> example blocks from the Vocab Atlas panel
// (panel_ref-vocab) only. Leaves examples in other panels untouched.

import fs from 'node:fs';
import path from 'node:path';

const FILE = path.join('public', 'index.html');
let html = fs.readFileSync(FILE, 'utf8');
const before = html.length;

// Locate the Vocab Atlas panel
const startTag = '<div class="chapter-panel" id="panel_ref-vocab">';
const startIdx = html.indexOf(startTag);
if (startIdx === -1) {
  console.error('Vocab Atlas panel not found');
  process.exit(1);
}
// Locate the end of the panel = next "<div class=\"chapter-panel\"" OR end of document
const afterStart = startIdx + startTag.length;
const endIdx = html.indexOf('<div class="chapter-panel"', afterStart);
const panelEnd = endIdx === -1 ? html.length : endIdx;

const panel = html.slice(startIdx, panelEnd);

// Strip <div class="va-ex">…</div> (single-line — they don't span lines in this file)
let removed = 0;
const cleanedPanel = panel.replace(/[ \t]*<div class="va-ex">[\s\S]*?<\/div>\s*\r?\n/g, () => {
  removed++;
  return '';
});

html = html.slice(0, startIdx) + cleanedPanel + html.slice(panelEnd);

fs.writeFileSync(FILE, html);
console.log(`✓ Removed ${removed} <va-ex> example blocks from Vocab Atlas`);
console.log(`  Size: ${before} → ${html.length} bytes (${html.length - before})`);

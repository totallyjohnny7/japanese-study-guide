# Universal Tooltips + FSRS Flashcards Implementation Plan

> **Note:** Real profile (reallyjustjohnny6@gmail.com) — test on production for Daisy.

**Goal:** (1) Fix hover tooltips to show on EVERY vocabulary box across the entire site, positioned near the box. (2) Add a Flashcards tab with FSRS-4.5 scheduling that pulls every vocab item from every section.

**Architecture:** Single-file HTML app — inject inline `<style>` and `<script>` blocks into `public/index.html`. New `#panel_flashcards` chapter-panel + new nav tab. Universal tooltip uses event delegation on a single body listener that handles `.oe-loc-item` (read child sub-divs directly), `.vocab-row` (table rows), and `.ja, [lang="ja"]` (existing). FSRS state stored in `localStorage` under key `nakama_fsrs_v1`, keyed by Japanese form.

**Tech Stack:** Vanilla JS, no build step, no external libs. FSRS-4.5 implemented inline (~80 LOC). All vocab merged from `CHAPTER_DATA` + DOM `.oe-loc-item` boxes.

---

## File Structure

- **Modify:** `public/index.html` — single-file app
  - Add CSS block in existing `<style>` near line ~1247 (before `</style>`)
  - Add new nav button in `.nav-scroll` near line ~1272 after `tab_ref-vocab`
  - Add new `<div class="chapter-panel" id="panel_flashcards">` after Vocab Atlas panel ends (~line 10593)
  - Replace lines 11927–12003 (current `jp-tooltip` system) and 12849–12959 (current `va-cursor-tip` system) with a single unified tooltip system
  - Add new `<script>` block at end (before `</body>`) for FSRS engine + flashcards UI

---

## Task 1: Backup file

- [ ] **Step 1:** Copy `public/index.html` → `public/index.html.bak-2026-04-08`

## Task 2: Add unified tooltip CSS

- [ ] **Step 1:** Locate the existing `.jp-tooltip` CSS block (line ~993) and the `#va-cursor-tip` block (line ~1187). Leave both visual styles in place but unify under one `#uni-tip` element.
- [ ] **Step 2:** Add new CSS rules for `.oe-loc-item` so they get `cursor: help` and a subtle hover state.

## Task 3: Replace tooltip JavaScript with unified system

- [ ] **Step 1:** Delete `initTooltipSystem`, `handleJPHover`, `handleJPOut`, `handleJPTouch`, `showTooltip`, `hideTooltip`, `lookupWord`, `formatLookup` and the standalone IIFE for `va-cursor-tip` at the bottom of the file.
- [ ] **Step 2:** Write a new unified tooltip system that:
  - Builds a global `vocabIndex` from `CHAPTER_DATA` + scraped `.oe-loc-item` boxes (deduplicated by `japanese`)
  - Single mouseover/mouseout/touchstart listener on `document.body`
  - For `.oe-loc-item` targets: read `.oe-loc-jp / .oe-loc-rm / .oe-loc-en` directly (no lookup needed)
  - For `.ja, [lang="ja"], .handwritten` targets: lookup via `vocabIndex`
  - For `<td>` cells in vocab tables: also handle (since chapter vocab tables use `<span lang="ja">` already, no extra work)
  - Position via `getBoundingClientRect()` of target — appears just below or above the target, never overflowing screen
  - 200ms hover delay before show, instant hide on mouseleave
  - Includes example sentence from dialogues if available, plus a 🔊 button

## Task 4: Add nav tab for Flashcards

- [ ] **Step 1:** Insert a new `<button class="nav-tab">` in `.nav-scroll` between `tab_ref-vocab` and the closing tags.
- [ ] **Step 2:** Add `'flashcards': 'Flashcards'` to the `chNames` map at line ~11340.

## Task 5: Add flashcards panel HTML

- [ ] **Step 1:** Add new `<div class="chapter-panel" id="panel_flashcards">` after the Vocab Atlas panel. Include:
  - Stats bar (Total / Due Today / New Today / Mastered)
  - Progress bar
  - Card area (`#fc-card`)
  - Hidden rating buttons (revealed after flip)

## Task 6: Implement FSRS-4.5 scheduling

- [ ] **Step 1:** Write `fsrsInit(card)` — sets initial state for new cards.
- [ ] **Step 2:** Write `fsrsReview(card, grade)` — updates stability, difficulty, due date.
  - Standard FSRS-4.5 weights `w[0..18]`
  - Difficulty: D' = w[7]*w[4] + (1-w[7])*(D - w[6]*(grade-3))
  - Retrievability R = (1 + elapsed/(9*S))^(-1)
  - For grade=1 (Again): new_S = w[11] * D^(-w[12]) * ((S+1)^w[13] - 1) * exp(w[14] * (1-R))
  - For grade=2,3,4: new_S = S * (1 + exp(w[8]) * (11 - D) * S^(-w[9]) * (exp(w[10]*(1-R))-1) * grade_modifier)
  - Cap stability at 36500 days, floor at 0.01
  - Next due = today + round(new_S) days

## Task 7: Implement flashcard UI

- [ ] **Step 1:** Write `buildFlashcardPool()` — merges `CHAPTER_DATA[].vocab` + DOM scrape of `.oe-loc-item` boxes, dedupes by japanese, attaches kana/katakana/kanji breakdown.
- [ ] **Step 2:** Write `loadFlashcardState()` / `saveFlashcardState()` — localStorage `nakama_fsrs_v1`.
- [ ] **Step 3:** Write `getNextCard()` — picks due card, then new card, sorted by due date.
- [ ] **Step 4:** Write `renderFlashcardFront(card)` — shows English only with "Flip" button.
- [ ] **Step 5:** Write `renderFlashcardBack(card)` — shows Hiragana, Katakana, Kanji (whichever apply), romaji, English confirm, 4 rating buttons.
- [ ] **Step 6:** Write `gradeFlashcard(grade)` — runs FSRS, saves state, advances to next card.
- [ ] **Step 7:** Wire up keyboard shortcuts: Space/Enter = flip, 1–4 = grade.
- [ ] **Step 8:** Auto-init flashcards panel when `showChapter('flashcards')` is called.

## Task 8: Verify in preview server

- [ ] **Step 1:** Start a static file server with `preview_start`.
- [ ] **Step 2:** Open `index.html`, hover over vocab boxes in: ch2 vocab table, Vocab Atlas, Oral Exam — verify tooltip appears for each.
- [ ] **Step 3:** Click Flashcards tab. Verify cards appear, flip works, rating buttons work, keyboard shortcuts work.
- [ ] **Step 4:** Take screenshot for the user.


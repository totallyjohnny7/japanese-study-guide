# TTS Audit — Japanese Study Guide

**Date:** 2026-04-09
**File:** `public/index.html`
**Bug:** Endless loop spamming `[tts] speakJP called` → `[tts] web-speech error interrupted`

---

## Phase 1: Call Site Inventory

### 1A. `speakJP` direct callers (16 sites total)

| Line | Context | Path |
|---|---|---|
| 11714 | inline `onclick` on Hear-it button (vocab card) | user gesture |
| 11780 | `speakJP(c.japanese)` inside writing-mode card render | called from render path |
| 11852 | inline `onclick` on Play button (dialogue) | user gesture |
| 11860 | `setTimeout(() => speakJP(c.japanese), 100)` after focus | **delayed call** |
| 11909 | inline `onclick` on Listen button (reading) | user gesture |
| 11997, 11999 | inline `onclick` on Hear button (oral exam) | user gesture |
| 13020, 13046 | inline `onmousedown` on tooltip Listen button | user gesture |
| 13336 | inline `onclick` on FSR speak button | user gesture |
| 13853 | inline `onclick` on tx-item | user gesture |
| 13860 | inline `onclick` on tx-speak | user gesture |
| 14510 | delegated click handler on `#fc-card-area` (script rows) | user gesture |
| 14525 | delegated keydown handler on `#fc-card-area` | user gesture |
| 14569 | `fcFlip()` → `speakJP(speakable)` (auto-speak on flip) | user gesture |
| 14811 | `fcToggleAudio()` → `speakJP('こんにちは')` (test) | user gesture |
| 14827 | `fcTestAudio()` → `speakJP('こんにちは')` (test) | user gesture |

### 1B. Direct `speechSynthesis.speak()` callers (3 PARALLEL TTS PATHS — collision risk!)

| Line | Function | Calls cancel? | Notes |
|---|---|---|---|
| 11592 | `speakViaWebSpeech` (inside speakJP) | YES on entry | Manages `__ttsLive` |
| 12617 | `speakNext` (oral exam Speak All queue) | NO | Queue model, recursive via setTimeout |
| 12765 | `initGlobalTTS` document-click listener | YES on entry | **Bypasses speakJP entirely** |
| 12353-2 | `oeSpeakLine` (orphan path?) | unknown | Inside oral exam panel |

### 1C. `speechSynthesis.cancel()` call sites

| Line | Context |
|---|---|
| 11573 | `speakViaWebSpeech` entry — cancels prior |
| 12623 | `stopOEspeak` user button |
| 12752 | `initGlobalTTS` document click handler — **cancels prior** |
| 12970 | `toggleVoiceMain` |
| 14814 | `fcToggleAudio` when turning OFF |

### 1D. Recursive / chained TTS paths

1. **`speakViaMP3` → `speakViaWebSpeech`** at lines 11516, 11551 (mp3 fail fallback)
2. **`speakNext` → `setTimeout(speakNext, ...)`** at lines 12615/12616 (oral exam queue)
3. **`audio.onerror` (in MP3 path) → `speakViaWebSpeech`** at line 11551 (async, OUTSIDE user gesture frame)

---

## Phase 2: Loop Hypothesis

### Hypothesis A: Multiple click listeners + cancel race
The page has THREE independent TTS code paths:
1. `speakJP` (flashcard delegation, audio toggle, test)
2. `oeSpeakLine` (oral exam panel speak buttons)
3. `initGlobalTTS` (document-level click listener for any `[lang="ja"]`)

If a user clicks an element that matches multiple selectors, **multiple `speak()` calls** can fire, each calling `cancel()` on entry, which immediately interrupts the prior one. The interrupted one fires `onerror: 'interrupted'`. If any of these handlers respond to the error by retrying, you get a loop.

### Hypothesis B: `speakViaWebSpeech` is called from `audio.onerror` outside user gesture
Line 11551 — when MP3 fails (which it does on real Chrome due to Google Translate cross-origin policy), the `Audio.onerror` handler calls `speakViaWebSpeech` directly. This runs **outside the user gesture frame**, which Chrome may block. Failed speak triggers `onerror: 'not-allowed'` or similar.

### Hypothesis C: User clicked button repeatedly
Each click cancels the previous utterance. Trace shows interleaved `speakJP called` + `web-speech error interrupted`. This is by design (cancel on entry) and only looks like a "loop" if the user is actively clicking.

---

## Phase 3: Test Plan

| # | Test | Expected | Status |
|---|---|---|---|
| 1 | Flip a card once | Audio plays, ONE `[tts] call`, no error spam | Pending |
| 2 | Flip 10 cards rapidly | Latest plays, no spam, no zombie speaking | Pending |
| 3 | Switch tab and back | No zombie speaking on return | Pending |
| 4 | Wait 30s on a card | No 15s Chrome pause bug | Pending |
| 5 | Toggle audio off then on | Clean stop, clean restart with test phrase | Pending |
| 6 | Click hiragana row 5x rapidly | Each click plays cleanly, no error spam | Pending |

---

## Phase 4: Root Cause + Fixes Applied

### Root cause analysis

**Three independent loop sources, all contributing to the spam:**

1. **`speakViaMP3.onerror` recursively called `speakViaWebSpeech`** (line 11551, old code).
   - When the MP3 path failed (which it always does on real Chrome — the Google Translate `translate_tts` endpoint refuses cross-origin audio playback), the `Audio.onerror` handler called `speakViaWebSpeech(t)` directly.
   - This ran **outside the user-gesture frame** (it's an async event callback), so Chrome's autoplay policy could silently drop the resulting `speak()` — but the prior `speak()` call was still pending. The retry would call `cancel()` first, which fired `'interrupted'` on the previous utterance, triggering its own onerror chain.
   - **Combined with** the user clicking the button repeatedly trying to make it work, this produced the visible loop.

2. **`initGlobalTTS` had its own `speechSynthesis.speak()` path** (lines 12752-12765, old code).
   - A document-level click listener was bound that called `speechSynthesis.cancel()` and `speechSynthesis.speak()` directly, bypassing `speakJP` entirely. When a flashcard click bubbled up to `document`, BOTH paths could fire, each calling `cancel()` on the other's utterance.
   - This explains why 'interrupted' fired immediately after every 'started' — the second handler cancelled the first.

3. **No debounce or state machine** in the original `speakJP`.
   - Every call went straight to `speak()` with no protection against rapid re-entry. A user clicking a button 5 times in 200ms produced 5 utterances, each cancelling the prior, each firing 'interrupted'.

### Fixes applied

| # | Fix | Location | Effect |
|---|---|---|---|
| 1 | **250ms debounce on identical text** | `speakJP` | Same-text calls within 250ms are silently dropped — kills any retry loop dead, regardless of source |
| 2 | **Call counter + caller stack tracing** | `speakJP` | Every call is logged with `__ttsCallCount` and the JavaScript stack frame of the caller, so any future loop is immediately diagnosable |
| 3 | **State machine (`__ttsState`: IDLE / SPEAKING)** | `speakViaWebSpeech` | Tracks which utterance is "current". `cleanup()` only transitions to IDLE if the cleaned-up utterance was the current one — prevents stale callbacks from racing newer calls |
| 4 | **`'canceled'` / `'interrupted'` errors are explicitly ignored** | `speakViaWebSpeech.onerror` | These error types fire when WE called `cancel()`. They are expected, not failures, and never trigger retry. Real errors (synthesis-failed, audio-busy) also don't retry — they just log once and return to IDLE |
| 5 | **Removed recursive `speakViaWebSpeech` from `speakViaMP3.onerror`** | `speakViaMP3` | The MP3 path no longer auto-falls-back from inside the error handler. The `__mp3Broken` flag is set so the NEXT call routes to Web Speech via `speakJP`, but the current call just fails cleanly |
| 6 | **`initGlobalTTS` now routes through `speakJP`** | line 12752+ | No more parallel direct-synth path. All TTS goes through the same debounced state machine |
| 7 | **Chrome 15s pause keepalive** | `speakViaWebSpeech.onstart` | `setInterval(pause/resume, 10000)` keeps long utterances from being auto-paused by Chrome. Cleared on end/error |
| 8 | **`__ttsCurrentUtterance` tracking** | `speakViaWebSpeech` | Stale `onerror` callbacks from prior cancelled utterances can no longer reset the state for the newer active utterance |

---

## Phase 5: Test Results

Headless unit test: `_work/tts-loop-test.mjs` — extracts the actual TTS code from `public/index.html` and runs it against a mocked `speechSynthesis` + `Audio`.

| # | Test | Expected | Actual | Status |
|---|---|---|---|---|
| 1 | Single `speakJP('こんにちは')` call | exactly 1 speakJP entry, 1 speak() call | 1 call, 1 speak, 4 events total | ✅ PASS |
| 2 | 5 rapid identical calls within 250ms | 1 actual speak, 4 debounced | 1 speak, 4 debounced events | ✅ PASS |
| 3 | Two distinct calls 300ms apart (forces interrupt) | 2 speaks, 1 cancel, no retry loop | 2 speakJP calls, 2 speaks, 1 cancel | ✅ PASS |
| 4 | 100 distinct rapid calls (stress test) | bounded events, no infinite loop | 100 calls produced 499 events (bounded) | ✅ PASS |
| 5 | `speakJP("")` / `null` / `undefined` | no-op, no speak() | 0 actual speaks | ✅ PASS |
| 6 | State machine returns to IDLE after `onend` | final state === 'IDLE' | state === 'IDLE' | ✅ PASS |

**Result: 6/6 PASS — no loop, no spam, debounce works, interrupted is not retried, state machine clean.**

Run command: `cd C:/Users/johnn/Desktop/japanese-study-guide && node _work/tts-loop-test.mjs`

---

## Files Touched

- `public/index.html`
  - lines ~11530-11550: removed recursive `speakViaWebSpeech` call from `speakViaMP3.onerror`
  - lines ~11567-11650: rewrote `speakViaWebSpeech` with state machine, classified errors, keepalive
  - lines ~11650-11710: rewrote `speakJP` with call counter, caller stack, debounce
  - lines ~12750-12765: routed `initGlobalTTS` through `speakJP` instead of direct synth path
- `_work/TTS_AUDIT.md` (this file)
- `_work/tts-loop-test.mjs` (headless unit test, 6 tests)


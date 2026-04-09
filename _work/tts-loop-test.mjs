// Headless test for the minimal speakJP module.
// Loads the actual TTS function from public/index.html and runs it
// against a mocked speechSynthesis. Verifies the bare-minimum guarantees:
//   1. speakJP("hello") → exactly ONE speak() call
//   2. cancel() before speak() → onerror('canceled') does NOT call speakJP recursively
//   3. Empty/null input → 0 speaks
//   4. Hold-reference behavior — utterance is in window.__tts.live until end
//   5. 100 distinct calls → bounded events (cancel-and-replace works)
//   6. onstart/onend fire and properly release the held reference

import fs from 'node:fs';

const html = fs.readFileSync('public/index.html', 'utf8');
const re = /<script[^>]*>([\s\S]*?)<\/script>/g;
let combined = ''; let m;
while ((m = re.exec(html)) !== null) combined += m[1] + '\n';

// Extract the new minimal TTS module
const ttsBlock = combined.match(/\/\/ ═══ JAPANESE TTS — MINIMAL REWRITE[\s\S]*?window\.speakJP = speakJP;/);
if (!ttsBlock) { console.error('FAIL: could not find minimal TTS module'); process.exit(1); }

const events = [];

class MockUtterance {
  constructor(text) {
    this.text = text;
    this.lang = '';
    this.rate = 1;
    this.pitch = 1;
    this.volume = 1;
    this.voice = null;
  }
}

const mockVoices = [{ name: 'Mock JP Voice', lang: 'ja-JP', localService: true }];

let currentU = null;
const mockSynth = {
  speaking: false,
  pending: false,
  paused: false,
  getVoices() { return mockVoices; },
  cancel() {
    events.push('synth.cancel()');
    if (currentU) {
      const u = currentU;
      currentU = null;
      this.speaking = false;
      // Fire 'canceled' on next tick (real browser behavior)
      setImmediate(() => { if (u.onerror) u.onerror({ error: 'canceled' }); });
    }
  },
  speak(u) {
    events.push('synth.speak("' + u.text + '")');
    currentU = u;
    this.speaking = true;
    setImmediate(() => {
      if (u.onstart) u.onstart();
      setTimeout(() => {
        if (currentU === u) {
          currentU = null;
          this.speaking = false;
          if (u.onend) u.onend();
        }
      }, 30);
    });
  },
};

const win = { __tts: { live: [], log: [] } };
win.window = win;

const fn = new Function(
  'window', 'speechSynthesis', 'SpeechSynthesisUtterance',
  'console', 'voiceEnabled',
  ttsBlock[0] + '; return { speakJP: window.speakJP, live: () => window.__tts.live, log: () => window.__tts.log };'
);

const api = fn(
  win, mockSynth, MockUtterance,
  { log: (...a) => events.push('LOG: ' + a.join(' ')) },
  true
);

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

test('TEST 1: speakJP("hello") → exactly ONE speak() call', async () => {
  events.length = 0;
  api.speakJP('hello');
  await new Promise(r => setTimeout(r, 100));
  const speaks = events.filter(e => e.startsWith('synth.speak')).length;
  if (speaks !== 1) throw new Error('Expected 1 speak, got ' + speaks);
  return 'OK';
});

test('TEST 2: empty input → 0 speaks', async () => {
  events.length = 0;
  api.speakJP('');
  api.speakJP(null);
  api.speakJP(undefined);
  api.speakJP('   ');
  await new Promise(r => setTimeout(r, 50));
  const speaks = events.filter(e => e.startsWith('synth.speak')).length;
  if (speaks !== 0) throw new Error('Expected 0 speaks, got ' + speaks);
  return 'OK';
});

test('TEST 3: cancel-then-speak races do NOT trigger retry loop', async () => {
  events.length = 0;
  api.speakJP('first');
  await new Promise(r => setTimeout(r, 5));
  api.speakJP('second');
  await new Promise(r => setTimeout(r, 5));
  api.speakJP('third');
  await new Promise(r => setTimeout(r, 100));
  // Each speakJP calls cancel() then speak(). 3 calls = 3 cancels + 3 speaks.
  // 'canceled' errors fire on prior utterances and must NOT trigger more speakJPs.
  const speaks = events.filter(e => e.startsWith('synth.speak')).length;
  const cancels = events.filter(e => e.startsWith('synth.cancel')).length;
  if (speaks !== 3) throw new Error('Expected 3 speaks, got ' + speaks + ' (loop?)');
  if (cancels !== 3) throw new Error('Expected 3 cancels, got ' + cancels);
  return 'OK — 3 calls, 3 speaks, 3 cancels, no loop';
});

test('TEST 4: utterance is held in __tts.live until end fires', async () => {
  events.length = 0;
  api.speakJP('keepalive');
  // Right after invocation, the utterance should be in the live array
  if (api.live().length !== 1) throw new Error('Expected 1 live utterance, got ' + api.live().length);
  // Wait for end
  await new Promise(r => setTimeout(r, 100));
  // After end, live should be empty
  if (api.live().length !== 0) throw new Error('Expected 0 live after end, got ' + api.live().length);
  return 'OK — held during, released after';
});

test('TEST 5: 100 rapid distinct calls produce bounded events (no infinite loop)', async () => {
  events.length = 0;
  for (let i = 0; i < 100; i++) {
    api.speakJP('text-' + i);
  }
  await new Promise(r => setTimeout(r, 200));
  const speaks = events.filter(e => e.startsWith('synth.speak')).length;
  if (speaks !== 100) throw new Error('Expected 100 speaks, got ' + speaks);
  // 100 calls = 100 cancels + 100 speaks + log entries. Anything under 1000
  // proves there's no infinite retry loop. (A loop would generate millions.)
  const totalEvents = events.length;
  if (totalEvents > 1000) throw new Error('Event explosion (loop?): ' + totalEvents);
  return 'OK — 100 calls, ' + totalEvents + ' total events (bounded, no loop)';
});

test('TEST 6: live array drains after final utterance ends', async () => {
  events.length = 0;
  api.speakJP('a');
  api.speakJP('b');
  api.speakJP('c');
  await new Promise(r => setTimeout(r, 200));
  if (api.live().length !== 0) throw new Error('Live array not drained: ' + api.live().length);
  return 'OK — array empty after all utterances complete';
});

(async () => {
  let pass = 0, fail = 0;
  for (const t of tests) {
    try {
      const result = await t.fn();
      console.log('[PASS] ' + t.name + ' — ' + result);
      pass++;
    } catch (e) {
      console.log('[FAIL] ' + t.name);
      console.log('       ' + e.message);
      fail++;
    }
  }
  console.log('\n--- ' + pass + ' passed, ' + fail + ' failed ---');
  process.exit(fail > 0 ? 1 : 0);
})();

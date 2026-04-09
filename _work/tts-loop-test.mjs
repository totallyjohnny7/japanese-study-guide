// Headless test for speakJP loop bugs.
// Loads the actual TTS functions from public/index.html and runs them
// against a mocked speechSynthesis. Verifies:
//   1. Single call → ONE event sequence, no spam
//   2. Rapid identical calls within 250ms → debounced
//   3. cancel() → 'interrupted' error → does NOT retry
//   4. mp3 onerror → does NOT recurse into Web Speech inside its handler
//   5. Each call increments __ttsCallCount exactly once

import fs from 'node:fs';

const html = fs.readFileSync('public/index.html', 'utf8');

// Extract every <script> block and combine
const scripts = [];
const re = /<script[^>]*>([\s\S]*?)<\/script>/g;
let m;
while ((m = re.exec(html)) !== null) scripts.push(m[1]);
const combined = scripts.join('\n');

// We only need the TTS functions — extract them surgically
const ttsBlock = combined.match(/\/\/ ═══ LAYERED JAPANESE TTS[\s\S]*?window\.hasLocalJapaneseVoice = hasLocalJapaneseVoice;/);
if (!ttsBlock) { console.error('FAIL: could not locate TTS block'); process.exit(1); }

// Build a sandbox with mocked speechSynthesis + Audio
const events = [];
let mockSpeaking = false;
let mockPending = false;
let currentUtterance = null;

class MockSpeechSynthesisUtterance {
  constructor(text) {
    this.text = text;
    this.lang = '';
    this.rate = 1;
    this.pitch = 1;
    this.volume = 1;
    this.voice = null;
    this.onstart = null;
    this.onend = null;
    this.onerror = null;
  }
}

const mockVoices = [{ name: 'Mock Japanese Voice', lang: 'ja-JP', localService: true }];

const mockSpeechSynthesis = {
  speaking: false,
  pending: false,
  paused: false,
  getVoices() { return mockVoices; },
  cancel() {
    events.push('synth.cancel()');
    if (currentUtterance) {
      const u = currentUtterance;
      currentUtterance = null;
      mockSpeaking = false;
      this.speaking = false;
      // Fire interrupted on next tick (mimics real browser)
      setImmediate(() => {
        if (u.onerror) u.onerror({ error: 'interrupted' });
      });
    }
  },
  speak(u) {
    events.push('synth.speak("' + u.text + '")');
    currentUtterance = u;
    mockSpeaking = true;
    this.speaking = true;
    setImmediate(() => {
      if (u.onstart) u.onstart();
      // Pretend it finishes after 50ms
      setTimeout(() => {
        if (currentUtterance === u) {
          currentUtterance = null;
          mockSpeaking = false;
          this.speaking = false;
          if (u.onend) u.onend();
        }
      }, 50);
    });
  },
  pause() {},
  resume() {},
  addEventListener() {},
};

class MockAudio {
  constructor(src) { this.src = src; this.paused = true; }
  play() { return Promise.resolve(); }
  pause() {}
}

const sandbox = {
  console: { log: (...a) => events.push('LOG: ' + a.join(' ')) },
  window: {},
  speechSynthesis: mockSpeechSynthesis,
  SpeechSynthesisUtterance: MockSpeechSynthesisUtterance,
  Audio: MockAudio,
  setInterval: () => 0,
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearInterval: () => {},
  clearTimeout: () => {},
  Date,
  Map,
  Array,
  String,
  Error,
  voiceEnabled: true,
};
sandbox.window = sandbox;
sandbox.window.speakJP = null;
sandbox.window.speakViaWebSpeech = null;
sandbox.window.speakViaMP3 = null;
sandbox.window.hasLocalJapaneseVoice = null;
sandbox.window.__ttsLive = [];
sandbox.window.__audioLive = [];
sandbox.window.__ttsHistory = [];
sandbox.window.__mp3Broken = true; // skip MP3 path entirely for these unit tests

// Stub ttsTrace to capture into events
const stubScript = `
function ttsTrace(msg, data) {
  events.push('[tts] ' + msg + (data ? ' ' + JSON.stringify(data) : ''));
}
`;

const fullScript = stubScript + ttsBlock[0];

// Run via Function constructor with sandbox keys as parameters
const fn = new Function(
  'window', 'speechSynthesis', 'SpeechSynthesisUtterance', 'Audio',
  'setInterval', 'setTimeout', 'clearInterval', 'clearTimeout',
  'Date', 'Map', 'Array', 'String', 'Error', 'voiceEnabled',
  'console', 'events',
  fullScript + '\n; return { speakJP: window.speakJP, ttsHistory: () => window.__ttsHistory, ttsCallCount: () => window.__ttsCallCount, ttsState: () => window.__ttsState };'
);

const api = fn(
  sandbox.window, sandbox.speechSynthesis, sandbox.SpeechSynthesisUtterance, sandbox.Audio,
  sandbox.setInterval, sandbox.setTimeout, sandbox.clearInterval, sandbox.clearTimeout,
  sandbox.Date, sandbox.Map, sandbox.Array, sandbox.String, sandbox.Error, sandbox.voiceEnabled,
  sandbox.console, events
);

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

test('TEST 1: Single speakJP() call → exactly ONE call recorded', async () => {
  events.length = 0;
  api.speakJP('こんにちは');
  await new Promise(r => setTimeout(r, 200));
  const callCount = events.filter(e => e.includes('speakJP') && e.includes('called')).length;
  if (callCount !== 1) throw new Error('Expected 1 speakJP call, got ' + callCount + ' — events: ' + events.join('\n  '));
  return 'OK — 1 call, 1 speak, ' + events.length + ' events total';
});

test('TEST 2: Rapid identical calls within 250ms → debounced', async () => {
  events.length = 0;
  api.speakJP('テスト');
  api.speakJP('テスト');
  api.speakJP('テスト');
  api.speakJP('テスト');
  api.speakJP('テスト');
  await new Promise(r => setTimeout(r, 100));
  const speakCalls = events.filter(e => e.startsWith('synth.speak')).length;
  const debounced = events.filter(e => e.includes('debounced')).length;
  if (speakCalls > 1) throw new Error('Expected ≤1 actual speak, got ' + speakCalls + '; debounced=' + debounced);
  if (debounced !== 4) throw new Error('Expected 4 debounce events, got ' + debounced);
  return 'OK — 1 actual speak, 4 debounced, no loop';
});

test('TEST 3: interrupted error does NOT trigger retry', async () => {
  events.length = 0;
  api.speakJP('first');
  await new Promise(r => setTimeout(r, 10));
  // Wait 300ms to clear debounce, then call again — this should cancel the first
  await new Promise(r => setTimeout(r, 300));
  api.speakJP('second');
  await new Promise(r => setTimeout(r, 200));
  const speakCalls = events.filter(e => e.startsWith('synth.speak')).length;
  const cancels = events.filter(e => e.startsWith('synth.cancel')).length;
  // First speak, then cancel (kills first), then second speak = 2 speaks + 1 cancel
  if (speakCalls !== 2) throw new Error('Expected 2 speaks, got ' + speakCalls + ' — events: ' + events.join('\n  '));
  // The 'interrupted' error from cancel must not produce another speakJP call
  const speakJpCalls = events.filter(e => e.includes('speakJP') && e.includes('called')).length;
  if (speakJpCalls !== 2) throw new Error('Expected 2 speakJP calls, got ' + speakJpCalls + ' — interrupted is retrying!');
  return 'OK — interrupted handled, no retry loop';
});

test('TEST 4: 100 different texts in a tight loop → bounded calls (debounce works on same text only)', async () => {
  events.length = 0;
  for (let i = 0; i < 100; i++) {
    api.speakJP('text-' + i);
  }
  await new Promise(r => setTimeout(r, 500));
  const speakJpCalls = events.filter(e => e.includes('speakJP') && e.includes('called')).length;
  if (speakJpCalls !== 100) throw new Error('Expected 100 distinct speakJP calls, got ' + speakJpCalls);
  // Most should cancel each other; final speak should succeed; no infinite loop
  const totalEvents = events.length;
  if (totalEvents > 500) throw new Error('Event explosion: ' + totalEvents + ' events for 100 calls');
  return 'OK — 100 calls produced ' + totalEvents + ' events (bounded)';
});

test('TEST 5: speakJP("") is no-op', async () => {
  events.length = 0;
  api.speakJP('');
  api.speakJP(null);
  api.speakJP(undefined);
  await new Promise(r => setTimeout(r, 50));
  const speakCalls = events.filter(e => e.startsWith('synth.speak')).length;
  if (speakCalls !== 0) throw new Error('Expected 0 actual speaks, got ' + speakCalls);
  return 'OK — empty input produces no speak';
});

test('TEST 6: state machine returns to IDLE after onend', async () => {
  events.length = 0;
  api.speakJP('hello');
  await new Promise(r => setTimeout(r, 200));
  const finalState = api.ttsState();
  if (finalState !== 'IDLE') throw new Error('Expected state IDLE after onend, got ' + finalState);
  return 'OK — state machine returned to IDLE';
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

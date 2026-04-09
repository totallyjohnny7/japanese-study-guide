// Records 8 seconds of system audio loopback while the user triggers
// speakJP, then analyzes the WAV for non-silence to prove audio came out.
//
// USAGE:
//   1. Open https://japanese-study-guide.pages.dev in Chrome
//   2. node _work/record-and-analyze.mjs
//   3. Within 2 seconds of "RECORDING NOW", click any 🔊 button or
//      flip a flashcard in the browser
//   4. Wait for the analysis report
//
// REQUIRES: ffmpeg on PATH, Stereo Mix enabled in Windows sound settings

import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.join(process.cwd(), '_work', 'tts-capture.wav');
const DURATION_SEC = 8;
// FxSound is the user's active playback device — its AUX Jack is the loopback
const DEVICE = 'audio=Internal AUX Jack (FxSound Audio Enhancer)';

console.log('=== TTS AUDIO LOOPBACK RECORDER ===\n');
console.log('Output file:', OUT);
console.log('Duration:', DURATION_SEC + 's');
console.log('Device:', DEVICE);
console.log();

// Clean up any old recording
try { fs.unlinkSync(OUT); } catch (_) {}

console.log('Starting ffmpeg…');
const ff = spawn('ffmpeg', [
  '-hide_banner',
  '-loglevel', 'error',
  '-f', 'dshow',
  '-i', DEVICE,
  '-t', String(DURATION_SEC),
  '-ac', '1',
  '-ar', '16000',
  '-y',
  OUT,
], { stdio: ['ignore', 'inherit', 'inherit'] });

let started = false;
setTimeout(() => {
  started = true;
  console.log('\n┌─────────────────────────────────────────────────────┐');
  console.log('│  🔴 RECORDING NOW — TRIGGER AUDIO IN CHROME          │');
  console.log('│                                                     │');
  console.log('│  Open the flashcards or test page and either:        │');
  console.log('│    • Click any 🔊 button                              │');
  console.log('│    • Click TEST 🎧                                    │');
  console.log('│    • Click any Japanese row on a flipped card         │');
  console.log('│    • Or run speakJP("こんにちは") in DevTools console  │');
  console.log('│                                                     │');
  console.log('│  Recording for ' + DURATION_SEC + ' seconds…                              │');
  console.log('└─────────────────────────────────────────────────────┘\n');
}, 500);

ff.on('exit', async (code) => {
  if (code !== 0) {
    console.error('\nffmpeg exited with code', code);
    process.exit(1);
  }
  if (!fs.existsSync(OUT)) {
    console.error('\nOutput file was not created');
    process.exit(1);
  }

  console.log('\n=== ANALYZING ===\n');
  const stat = fs.statSync(OUT);
  console.log('File size:', stat.size, 'bytes');

  // Parse WAV header (PCM 16-bit mono 16kHz expected)
  const buf = fs.readFileSync(OUT);
  if (buf.toString('ascii', 0, 4) !== 'RIFF') {
    console.error('Not a valid WAV file');
    process.exit(1);
  }

  // Find "data" chunk
  let pos = 12;
  let dataPos = -1, dataLen = 0;
  while (pos < buf.length - 8) {
    const chunkId = buf.toString('ascii', pos, pos + 4);
    const chunkLen = buf.readUInt32LE(pos + 4);
    if (chunkId === 'data') {
      dataPos = pos + 8;
      dataLen = chunkLen;
      break;
    }
    pos += 8 + chunkLen;
  }
  if (dataPos === -1) {
    console.error('No data chunk found in WAV');
    process.exit(1);
  }

  const sampleCount = dataLen / 2; // 16-bit mono
  const sampleRate = buf.readUInt32LE(24);
  const durSec = sampleCount / sampleRate;
  console.log('Sample rate:', sampleRate, 'Hz');
  console.log('Sample count:', sampleCount);
  console.log('Duration:', durSec.toFixed(2), 's');

  // Compute RMS over the entire signal AND over 100ms windows to find the peak
  let sumSq = 0;
  let peakSample = 0;
  const windowSamples = Math.floor(sampleRate * 0.1);
  let peakWindowRms = 0;
  let peakWindowTime = 0;
  let currentSumSq = 0;

  for (let i = 0; i < sampleCount; i++) {
    const s = buf.readInt16LE(dataPos + i * 2);
    const sNorm = s / 32768;
    sumSq += sNorm * sNorm;
    if (Math.abs(s) > peakSample) peakSample = Math.abs(s);
    currentSumSq += sNorm * sNorm;
    if (i % windowSamples === windowSamples - 1) {
      const winRms = Math.sqrt(currentSumSq / windowSamples);
      if (winRms > peakWindowRms) {
        peakWindowRms = winRms;
        peakWindowTime = i / sampleRate;
      }
      currentSumSq = 0;
    }
  }
  const overallRms = Math.sqrt(sumSq / sampleCount);
  const peakDb = 20 * Math.log10(peakSample / 32768 || 0.0000001);
  const overallRmsDb = 20 * Math.log10(overallRms || 0.0000001);
  const peakWindowDb = 20 * Math.log10(peakWindowRms || 0.0000001);

  console.log('\n=== AUDIO LEVEL ANALYSIS ===');
  console.log('Peak sample:    ', peakSample, '(' + peakDb.toFixed(1) + ' dBFS)');
  console.log('Overall RMS:    ', overallRms.toFixed(5), '(' + overallRmsDb.toFixed(1) + ' dBFS)');
  console.log('Peak 100ms RMS: ', peakWindowRms.toFixed(5), '(' + peakWindowDb.toFixed(1) + ' dBFS) at t=' + peakWindowTime.toFixed(2) + 's');

  // Verdict
  console.log('\n=== VERDICT ===');
  // -60 dBFS is roughly the threshold for "audible content vs ambient noise"
  // If peak is below -50, the channel was effectively silent
  if (peakDb < -55) {
    console.log('❌ FAIL — peak signal is below -55 dBFS (effectively silent)');
    console.log('   Either no audio was triggered during the recording window,');
    console.log('   OR the speech engine is not producing output to the system mixer,');
    console.log('   OR Stereo Mix is muted.');
    process.exit(1);
  } else if (peakDb < -30) {
    console.log('⚠️  WEAK — peak ' + peakDb.toFixed(1) + ' dBFS is detectable but very quiet');
    console.log('   Audio is being produced but volume is low.');
    process.exit(0);
  } else {
    console.log('✅ PASS — audio detected at ' + peakDb.toFixed(1) + ' dBFS peak');
    console.log('   Speech engine successfully produced audio to the system mixer.');
    console.log('   Peak occurred at t=' + peakWindowTime.toFixed(2) + 's into the recording.');
    process.exit(0);
  }
});

ff.on('error', (err) => {
  console.error('Failed to start ffmpeg:', err.message);
  process.exit(1);
});

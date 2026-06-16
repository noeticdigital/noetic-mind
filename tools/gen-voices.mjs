#!/usr/bin/env node
/*
  Generate hi-fi interview audio for copilot.html using ElevenLabs.

  The copilot demo plays audio/line-NN.mp3 when "Play with sound" is on, and
  falls back to the browser's built-in voices if a clip is missing. This script
  renders one clip per transcript line straight from the SCRIPT array inside
  copilot.html, so the audio always matches the script.

  USAGE (your key stays in the env, never in a committed file):
      ELEVENLABS_API_KEY=sk_xxx node tools/gen-voices.mjs

  OPTIONAL overrides (any voice ID from your ElevenLabs library):
      ELEVEN_VOICE_INT  voice for the Interviewer   (default: XrExE9yKIg1WjnnlVkGX)
      ELEVEN_VOICE_PAR  voice for Ian (participant)  (default: cjVigY5qzO86Huf0OWal)
      ELEVEN_MODEL      model id (default: eleven_multilingual_v2)
      ELEVEN_STABILITY  0=loose/casual … 1=flat/formal (default: 0.32)
      ELEVEN_STYLE      delivery expressiveness 0–1     (default: 0.45)

  Needs Node 18+ (global fetch). ~16 short lines, a few thousand characters total.
*/
import fs from 'node:fs';
import path from 'node:path';

const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) {
  console.error('✗ Set ELEVENLABS_API_KEY first (your key — never commit it):');
  console.error('    ELEVENLABS_API_KEY=sk_xxx node tools/gen-voices.mjs');
  process.exit(1);
}

const VOICE_INT = process.env.ELEVEN_VOICE_INT || 'XrExE9yKIg1WjnnlVkGX'; // Interviewer
const VOICE_PAR = process.env.ELEVEN_VOICE_PAR || 'cjVigY5qzO86Huf0OWal'; // Ian Turvue
const MODEL     = process.env.ELEVEN_MODEL     || 'eleven_multilingual_v2';
// Casual delivery: lower stability = looser/chattier, a bit more style = more character.
const STABILITY = process.env.ELEVEN_STABILITY ? Number(process.env.ELEVEN_STABILITY) : 0.32;
const STYLE     = process.env.ELEVEN_STYLE     ? Number(process.env.ELEVEN_STYLE)     : 0.45;

const here    = path.dirname(new URL(import.meta.url).pathname);
const htmlPath = path.join(here, '..', 'copilot.html');
const outDir   = path.join(here, '..', 'audio');

const html = fs.readFileSync(htmlPath, 'utf8');
const m = html.match(/const SCRIPT\s*=\s*(\[[\s\S]*?\n\]);/);
if (!m) { console.error('✗ Could not find the SCRIPT array in copilot.html'); process.exit(1); }
const SCRIPT = eval(m[1]); // SCRIPT is pure data (no functions) — safe to eval our own file

fs.mkdirSync(outDir, { recursive: true });

async function tts(text, voice, file) {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        model_id: MODEL,
        voice_settings: { stability: STABILITY, similarity_boost: 0.75, style: STYLE, use_speaker_boost: true },
      }),
    }
  );
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(file, buf);
  console.log(`  ✓ ${path.basename(file)}  (${(buf.length / 1024).toFixed(0)} KB)`);
}

console.log(`Rendering ${SCRIPT.length} clips with ${MODEL} …`);
console.log(`  Interviewer → ${VOICE_INT}\n  Ian         → ${VOICE_PAR}\n`);

for (let i = 0; i < SCRIPT.length; i++) {
  const e = SCRIPT[i];
  if (!e || !e.text) continue;
  const voice = e.who === 'int' ? VOICE_INT : VOICE_PAR;
  const file = path.join(outDir, `line-${String(i).padStart(2, '0')}.mp3`);
  try {
    await tts(e.text, voice, file);
  } catch (err) {
    console.error(`  ✗ line ${i}: ${err.message}`);
    process.exit(1);
  }
}

console.log(`\nDone → audio/. Reload copilot.html and click "Play with sound".`);

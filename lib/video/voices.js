// Voice cloning via ElevenLabs. Solves mispronunciation of African names/
// words: instead of hoping a stock voice gets it right, the creator (or a
// native speaker) records themselves once, and every future video uses
// their exact voice and pronunciation. Pay-as-you-go beyond the free tier.

import fs from 'fs';
import { envOrSetting } from '../settings';

export async function cloneVoice({ name, sampleFilePath }) {
  const key = envOrSetting('ELEVENLABS_API_KEY');
  if (!key) throw new Error('ELEVENLABS_API_KEY not set — add it in your env to enable voice cloning.');

  const form = new FormData();
  form.append('name', name);
  const buf = fs.readFileSync(sampleFilePath);
  form.append('files', new Blob([buf]), 'sample.mp3');

  const res = await fetch('https://api.elevenlabs.io/v1/voices/add', {
    method: 'POST',
    headers: { 'xi-api-key': key },
    body: form,
    signal: AbortSignal.timeout(60000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`ElevenLabs clone failed: ${text.slice(0, 300)}`);
  const data = JSON.parse(text);
  if (!data.voice_id) throw new Error('ElevenLabs did not return a voice_id');
  return data.voice_id;
}

// Generates speech using a cloned (or any ElevenLabs) voice_id.
export async function elevenLabsSpeak({ text, voiceId, outPath }) {
  const key = envOrSetting('ELEVENLABS_API_KEY');
  if (!key) return null;
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'xi-api-key': key },
    body: JSON.stringify({
      text: text.slice(0, 4500),
      model_id: 'eleven_multilingual_v2', // handles French + African-accented English better than English-only models
      voice_settings: { stability: 0.5, similarity_boost: 0.8 },
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`ElevenLabs TTS failed: ${(await res.text()).slice(0, 300)}`);
  const fs2 = await import('fs');
  fs2.writeFileSync(outPath, Buffer.from(await res.arrayBuffer()));
  return outPath;
}

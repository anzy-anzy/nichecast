// Voice-over: OpenAI TTS when OPENAI_API_KEY is set, otherwise a silent
// placeholder track (mock mode) so the pipeline still produces a video.

import fs from 'fs';
import { execFileSync } from 'child_process';

export async function generateVoiceover({ script, voice = 'onyx', outPath }) {
  const key = process.env.OPENAI_API_KEY;
  if (key) {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts',
        voice,
        input: script.slice(0, 4000),
        response_format: 'mp3',
      }),
    });
    if (!res.ok) throw new Error(`OpenAI TTS ${res.status}: ${(await res.text()).slice(0, 200)}`);
    fs.writeFileSync(outPath, Buffer.from(await res.arrayBuffer()));
    return { outPath, mock: false };
  }
  // Mock: silent track sized to the script's spoken length (~145 wpm)
  const seconds = Math.max(8, Math.round((script.split(/\s+/).length / 145) * 60));
  execFileSync('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono', '-t', String(seconds), '-q:a', '9', outPath], { stdio: 'pipe' });
  return { outPath, mock: true, seconds };
}

// Custom pronunciation dictionary — lets a user define how a name or word
// should be spelled phonetically so TTS (OpenAI or ElevenLabs) says it
// correctly. Useful for Cameroonian/African names and local words that
// generic AI voices often mispronounce. Applied as a whole-word,
// case-insensitive find-and-replace right before the script is spoken —
// the on-screen subtitles still use the original spelling.

import { getDb } from './db';

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getPronunciations(userId) {
  return getDb().prepare('SELECT * FROM pronunciations WHERE user_id = ? ORDER BY id DESC').all(userId);
}

export function applyPronunciations(text, userId) {
  if (!userId) return text;
  const rows = getPronunciations(userId);
  if (!rows.length) return text;
  let out = text;
  for (const { word, replacement } of rows) {
    if (!word || !replacement) continue;
    const re = new RegExp(`\\b${escapeRegex(word)}\\b`, 'gi');
    out = out.replace(re, replacement);
  }
  return out;
}

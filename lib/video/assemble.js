// FFmpeg assembly: stitches visuals to the voice-over length, burns
// word-timed subtitles, and generates a thumbnail.

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

function ff(args) {
  try {
    execFileSync('ffmpeg', ['-y', ...args], { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1024 * 1024 * 64 });
  } catch (e) {
    const stderr = String(e.stderr || '')
      .split('\n')
      .filter((l) => l.trim())
      .slice(-4)
      .join(' | ');
    throw new Error(`ffmpeg: ${stderr || e.message}`);
  }
}

// macOS ffmpeg often can't find a default font for drawtext/subtitles
function findFont() {
  const candidates = [
    '/System/Library/Fonts/Helvetica.ttc',
    '/System/Library/Fonts/Supplemental/Arial.ttf',
    '/Library/Fonts/Arial.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
  ];
  for (const f of candidates) if (fs.existsSync(f)) return f;
  return null;
}

function probeDuration(file) {
  const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { stdio: 'pipe' });
  return parseFloat(String(out).trim()) || 10;
}

function fmtTime(s) {
  const h = String(Math.floor(s / 3600)).padStart(2, '0');
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const sec = (s % 60).toFixed(3).padStart(6, '0').replace('.', ',');
  return `${h}:${m}:${sec}`;
}

// Evenly time subtitle chunks across the audio duration (~6 words per line)
function buildSrt(script, durationSec, outPath) {
  const words = script.split(/\s+/).filter(Boolean);
  const chunks = [];
  for (let i = 0; i < words.length; i += 6) chunks.push(words.slice(i, i + 6).join(' '));
  const per = durationSec / Math.max(chunks.length, 1);
  const srt = chunks
    .map((c, i) => `${i + 1}\n${fmtTime(i * per)} --> ${fmtTime((i + 1) * per - 0.05)}\n${c}\n`)
    .join('\n');
  fs.writeFileSync(outPath, srt);
  return outPath;
}

export function assembleVideo({ clips, audioPath, script, workDir, outPath, vertical = true }) {
  const size = vertical ? '720:1280' : '1280:720';
  const duration = probeDuration(audioPath);
  const perClip = duration / clips.length;

  // normalize each clip: scale/crop to size, trim to per-clip duration, strip audio
  const normalized = clips.map((clip, i) => {
    const out = path.join(workDir, `norm_${i}.mp4`);
    ff([
      '-stream_loop', '-1', '-i', clip,
      '-t', perClip.toFixed(2),
      '-vf', `scale=${size}:force_original_aspect_ratio=increase,crop=${size.replace(':', ':')},fps=24`,
      '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26', '-pix_fmt', 'yuv420p',
      out,
    ]);
    return out;
  });

  // concat
  const listFile = path.join(workDir, 'concat.txt');
  fs.writeFileSync(listFile, normalized.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join('\n'));
  const joined = path.join(workDir, 'joined.mp4');
  ff(['-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', joined]);

  // subtitles + audio (falls back to no-subtitles render if the filter fails,
  // e.g. missing libass/fonts on some systems)
  const srt = buildSrt(script, duration, path.join(workDir, 'subs.srt'));
  const srtEscaped = srt.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");
  const fontSize = vertical ? 14 : 20;
  const audioArgs = [
    '-map', '0:v', '-map', '1:a',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24',
    '-c:a', 'aac', '-shortest', '-pix_fmt', 'yuv420p',
    outPath,
  ];
  let subtitled = true;
  try {
    ff([
      '-i', joined, '-i', audioPath,
      '-vf', `subtitles='${srtEscaped}':force_style='FontName=Arial,FontSize=${fontSize},PrimaryColour=&HFFFFFF&,OutlineColour=&H000000&,Outline=2,Bold=1,Alignment=2,MarginV=60'`,
      ...audioArgs,
    ]);
  } catch {
    subtitled = false;
    ff(['-i', joined, '-i', audioPath, ...audioArgs]);
  }
  return { outPath, duration, subtitled };
}

export function makeThumbnail({ videoPath, title, outPath, vertical = true }) {
  const midpoint = Math.max(1, probeDuration(videoPath) / 2).toFixed(1);
  const size = vertical ? '720x1280' : '1280x720';
  const fontSize = vertical ? 52 : 72;
  const safeTitle = title.slice(0, 60).replace(/[\\']/g, '').replace(/:/g, '\\:');
  const font = findFont();
  try {
    ff([
      '-ss', midpoint, '-i', videoPath, '-frames:v', '1',
      '-vf', `scale=${size.replace('x', ':')},drawtext=${font ? `fontfile='${font}':` : ''}text='${safeTitle}':fontcolor=white:fontsize=${fontSize}:borderw=4:bordercolor=black:x=(w-text_w)/2:y=(h-text_h)/2`,
      '-q:v', '3', outPath,
    ]);
  } catch {
    // fallback: plain frame without text overlay
    ff(['-ss', midpoint, '-i', videoPath, '-frames:v', '1', '-vf', `scale=${size.replace('x', ':')}`, '-q:v', '3', outPath]);
  }
  return outPath;
}

// Orchestrator: takes a queued video job through every step:
// script -> voiceover -> visuals -> assembly+subtitles -> thumbnail -> SEO.
// Each step updates the job row so the UI shows live progress.

import fs from 'fs';
import path from 'path';
import { getDb } from '../db';
import { writeScript, generateSeo, visualKeywords, generateIdeas, imagePrompts } from './script';
import { researchTrends } from './trends';
import { generateVoiceover } from './tts';
import { gatherVisuals } from './visuals';
import { generateImageClips } from './images';
import { assembleVideo, makeThumbnail } from './assemble';
import { getPlan, videosUsedThisMonth } from '../plans';

// Autopilot: for each user with autopilot on, keep today's quota of videos
// flowing — researches ideas, queues jobs (marked autopost), one per tick.
export async function processAutopilot() {
  const db = getDb();
  const users = db.prepare(`SELECT * FROM users WHERE autopilot_enabled = 1 AND autopilot_niche != ''`).all();
  const queued = [];
  for (const user of users) {
    const plan = getPlan(user);
    if (!plan.canGenerateVideos) continue;
    if (videosUsedThisMonth(db, user.id) >= plan.videoLimitPerMonth) continue;
    const today = db
      .prepare(`SELECT COUNT(*) AS n FROM videos WHERE user_id = ? AND created_at >= date('now')`)
      .get(user.id).n;
    if (today >= user.autopilot_per_day) continue;
    // don't stack jobs — wait until previous ones are done
    const pending = db
      .prepare(`SELECT COUNT(*) AS n FROM videos WHERE user_id = ? AND status IN ('queued','processing')`)
      .get(user.id).n;
    if (pending > 0) continue;
    try {
      const trends = await researchTrends(user.autopilot_niche);
      const ideas = await generateIdeas(user.autopilot_niche, trends);
      const pick = ideas[Math.floor(Math.random() * ideas.length)];
      db.prepare(`INSERT INTO videos (user_id, niche, idea, format, autopost) VALUES (?, ?, ?, 'vertical', 1)`)
        .run(user.id, user.autopilot_niche, pick.idea);
      queued.push({ userId: user.id, idea: pick.idea });
    } catch {
      // trend/idea failure — try again next tick
    }
  }
  return queued;
}

function setStep(db, id, step) {
  db.prepare(`UPDATE videos SET step = ?, status = 'processing' WHERE id = ?`).run(step, id);
}

export async function processVideoJobs({ maxJobs = 1 } = {}) {
  const db = getDb();
  const jobs = db.prepare(`SELECT * FROM videos WHERE status = 'queued' ORDER BY id LIMIT ?`).all(maxJobs);
  const results = [];

  for (const job of jobs) {
    const vertical = job.format !== 'horizontal';
    const publicDir = path.join(process.cwd(), 'public', 'uploads', 'videos');
    const workDir = path.join(process.cwd(), 'data', 'videowork', String(job.id));
    fs.mkdirSync(publicDir, { recursive: true });
    fs.mkdirSync(workDir, { recursive: true });

    try {
      // 1. Script
      setStep(db, job.id, 'Writing script');
      const script = job.script || (await writeScript({ niche: job.niche, idea: job.idea, durationSec: job.duration_target, brief: job.brief || '' }));
      db.prepare(`UPDATE videos SET script = ? WHERE id = ?`).run(script, job.id);

      // 2. Voice-over
      setStep(db, job.id, 'Generating voice-over');
      const audioPath = path.join(workDir, 'voice.mp3');
      await generateVoiceover({ script, voice: job.voice, outPath: audioPath });

      // 3. Visuals — AI-generated images (chosen style) or stock footage
      let clips = null;
      let source = '';
      if (job.visual_style) {
        setStep(db, job.id, `Generating ${job.visual_style} images`);
        try {
          const prompts = await imagePrompts({ niche: job.niche, idea: job.idea, script, style: job.visual_style });
          clips = await generateImageClips({ prompts, dir: workDir, vertical });
          if (clips) source = `ai images (${job.visual_style})`;
        } catch {}
      }
      if (!clips) {
        setStep(db, job.id, 'Sourcing visuals');
        const keywords = await visualKeywords({ niche: job.niche, idea: job.idea, script });
        const stock = await gatherVisuals({ keywords, dir: workDir, vertical, needed: 5 });
        clips = stock.files;
        source = stock.source;
      }

      // 4. Assemble + subtitles
      setStep(db, job.id, 'Editing video + subtitles');
      const videoName = `video_${job.user_id}_${job.id}.mp4`;
      const outPath = path.join(publicDir, videoName);
      assembleVideo({ clips, audioPath, script, workDir, outPath, vertical });

      // 5. SEO pack
      setStep(db, job.id, 'Writing SEO title, description, tags');
      const seo = await generateSeo({ niche: job.niche, idea: job.idea, script });

      // 6. Thumbnail
      setStep(db, job.id, 'Generating thumbnail');
      const thumbName = `thumb_${job.user_id}_${job.id}.jpg`;
      makeThumbnail({ videoPath: outPath, title: seo.title || job.idea, outPath: path.join(publicDir, thumbName), vertical });

      db.prepare(
        `UPDATE videos SET status = 'ready', step = 'Done (visuals: ${source})', video_path = ?, thumb_path = ?,
         seo_title = ?, seo_description = ?, tags = ?, next_suggestion = ? WHERE id = ?`
      ).run(
        `/uploads/videos/${videoName}`,
        `/uploads/videos/${thumbName}`,
        seo.title || '',
        seo.description || '',
        JSON.stringify(seo.tags || []),
        seo.next_video || '',
        job.id
      );
      // Autopilot jobs get posted to all connected accounts as soon as they're ready
      if (job.autopost) {
        const accounts = db.prepare(`SELECT id FROM accounts WHERE user_id = ?`).all(job.user_id);
        const hashtags = (seo.tags || []).slice(0, 6).map((t) => '#' + String(t).replace(/[^a-z0-9]/gi, '')).join(' ');
        db.prepare(`INSERT INTO posts (user_id, content, media_path, account_ids, scheduled_at) VALUES (?, ?, ?, ?, datetime('now'))`)
          .run(
            job.user_id,
            `${seo.title || job.idea}\n\n${seo.description || ''}${hashtags ? '\n\n' + hashtags : ''}`,
            `/uploads/videos/${videoName}`,
            JSON.stringify(accounts.map((a) => a.id))
          );
      }
      results.push({ id: job.id, ok: true });
    } catch (e) {
      db.prepare(`UPDATE videos SET status = 'failed', error = ? WHERE id = ?`).run(String(e.message || e).slice(0, 500), job.id);
      results.push({ id: job.id, ok: false, error: String(e.message || e) });
    } finally {
      // keep workdir small: remove intermediate clips
      try { fs.rmSync(workDir, { recursive: true, force: true }); } catch {}
    }
  }
  return results;
}

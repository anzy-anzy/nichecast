import { NextResponse } from 'next/server';
import { processDuePosts } from '@/lib/posting';
import { processVideoJobs, processAutopilot } from '@/lib/video/pipeline';
import { processAdJobs } from '@/lib/video/ads';
import { processCreatorJobs } from '@/lib/video/creator';
import { processImageJobs } from '@/lib/image/falImage';

export const maxDuration = 300; // video rendering can take a few minutes

// Publishes due posts AND renders queued videos/images. Call this every minute:
// - locally: `npm run worker`
// - production: a cron job (Railway cron, cron-job.org) hitting POST /api/worker
export async function POST(req) {
  const secret = process.env.WORKER_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization') || '';
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }
  try {
    const autopilot = await processAutopilot();
    const posts = await processDuePosts();
    const videos = await processVideoJobs({ maxJobs: 1 });
    const ads = await processAdJobs({ maxJobs: 1 });
    const creatorVideos = await processCreatorJobs({ maxJobs: 1 });
    const images = await processImageJobs({ maxJobs: 2 });
    return NextResponse.json({
      ok: true,
      processed: posts.length,
      videosRendered: videos.length,
      adsRendered: ads.length,
      creatorVideosRendered: creatorVideos.length,
      imagesRendered: images.length,
      autopilotQueued: autopilot.length,
      posts,
      videos,
      ads,
      creatorVideos,
      images,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}

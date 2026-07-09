# NicheCast

Faceless videos for your niche, posted everywhere. Researches trending topics, writes the script, generates AI voice-over, edits the video with subtitles, creates thumbnail + SEO pack, and auto-posts to YouTube, TikTok, Instagram and more. Also does bulk upload & scheduling of your own videos (10 at a time).

## Requirements

- Node.js 18+ (nodejs.org)
- **FFmpeg** — needed for video generation. On Mac: `brew install ffmpeg`

## Run it

```bash
npm install
cp .env.example .env.local
npm run dev        # app at http://localhost:3000
npm run worker     # 2nd terminal — renders videos + publishes due posts
```

Everything works with **zero API keys** (mock mode): silent voice track, generated gradient visuals, template scripts, simulated posting. Add keys one by one in `.env.local` to go real:

| Key | What it unlocks | Cost |
|---|---|---|
| `ANTHROPIC_API_KEY` | Real scripts, ideas, SEO, captions | ~$0.01/video |
| `OPENAI_API_KEY` | Real AI voice-over | ~$0.02/video |
| `PEXELS_API_KEY` | Real stock footage | Free |
| `YOUTUBE_API_KEY` | Niche trend research from YouTube | Free |
| `BLOTATO_API_KEY` + `POSTING_PROVIDER=blotato` | Real posting to socials | $29/mo |

## The video pipeline

Choose niche → research trends (Google Trends + YouTube) → pick from 5 AI video ideas → script → voice-over → stock visuals matched to the script → auto-edit with burned-in subtitles → thumbnail → SEO title/description/tags → schedule to all connected accounts → get next-video suggestion.

Videos render in the background via the worker; the Video Studio page shows live step-by-step progress (1-6).

## Plans & payments

Three tiers wired in `lib/plans.js`: **Publisher $29/mo** (upload + auto-post only), **Creator $99/mo** (30 faceless videos/mo), **Studio $119/mo** (both, 60 videos). New signups get a free trial (3 videos, 2 accounts).

Getting paid from Cameroon: **Paddle** (paddle.com) is the recommended processor — merchant of record, handles global tax, pays out via Payoneer which works with Cameroonian banks. Create your three subscription products there, paste the checkout links into `PAYMENT_LINK_*` in `.env.local`, and the pricing buttons point to real checkout. For African customers paying XAF/mobile money, add Flutterwave later. (Manually set a paying user's plan for now: `UPDATE users SET plan='creator' WHERE email='...'` — automate with Paddle webhooks when you have volume.)

## Deploy (~$5-10/mo)

Railway: connect repo, add a **volume at `/app/data`**, ensure FFmpeg is present (add a `nixpacks.toml` with `[phases.setup] aptPkgs = ["ffmpeg"]`), set env vars, and add a cron hitting `POST /api/worker` every minute with `Authorization: Bearer $WORKER_SECRET`. SQLite needs the persistent volume; swap to Postgres when you pass ~50 users.

## Architecture

```
app/dashboard/video/    Video Studio (wizard + live job progress)
app/dashboard/upload/   Bulk upload, 10 videos, auto-spaced scheduling
app/dashboard/generate/ Caption generator (bonus)
app/api/videos/         create/list jobs, ideas (trend research), schedule
app/api/worker/         renders queued videos + publishes due posts
lib/video/
  trends.js             Google Trends RSS + YouTube Data API
  script.js             Claude: ideas, scripts, SEO, visual keywords
  tts.js                OpenAI TTS | silent mock
  visuals.js            Pexels stock | generated gradient slides
  assemble.js           FFmpeg: stitch, subtitles, thumbnail
  pipeline.js           job orchestrator (step-by-step status)
lib/posting/            mock | blotato providers (swappable)
lib/plans.js            tier limits + gating
```

## Unit economics

Per generated video: ~$0.03-0.05 (Claude + OpenAI TTS; Pexels free). A Creator customer at $99/mo using all 30 videos costs you ~$1.50 + hosting share. Margin ≈ 95%.

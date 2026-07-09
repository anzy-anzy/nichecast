// Claude-powered: video ideas from trends, script writing, SEO pack,
// and next-video suggestion. Template fallbacks keep everything working
// without an API key.

async function claude(prompt, maxTokens = 2500) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data.content?.[0]?.text || '';
}

function extractJson(text) {
  const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  return JSON.parse(match ? match[0] : text);
}

export async function generateIdeas(niche, trends, brief = '') {
  const trendContext = [
    trends?.google?.length ? `Trending searches right now: ${trends.google.slice(0, 12).join(', ')}` : '',
    trends?.youtube?.length ? `Top recent YouTube videos in this niche: ${trends.youtube.join(' | ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const text = await claude(
    `You are a viral short-form video strategist. Niche: "${niche}".
${brief ? `About this channel (from the owner): ${brief}\nStay faithful to this description.` : ''}
${trendContext || 'No live trend data available — use your knowledge of what performs in this niche.'}

Give 5 faceless video ideas most likely to perform THIS WEEK in this niche.
IMPORTANT: every idea must be squarely about "${niche}" itself. Only weave in a trending topic if it is DIRECTLY and naturally relevant to this niche — NEVER force unrelated trends (e.g. do not inject stock-market or crypto trends into a gaming or fitness niche). If no trend fits, ignore the trends entirely and use proven formats for this niche instead.
Respond ONLY with a JSON array of objects: [{"idea": "...", "hook": "first line of the video", "why": "why this will perform now"}]`
  );
  if (text === null) {
    return [
      { idea: `Top 5 things beginners get wrong in ${niche}`, hook: `You're doing ${niche} wrong — here's proof.`, why: 'Listicles + mistakes = evergreen performer (offline fallback — add ANTHROPIC_API_KEY for trend-aware ideas)' },
      { idea: `${niche}: what changed this month`, hook: `Everything just changed in ${niche}.`, why: 'News-style content earns shares' },
      { idea: `The 60-second beginner guide to ${niche}`, hook: `Master the basics of ${niche} in one minute.`, why: 'Beginner guides attract subscribers' },
    ];
  }
  return extractJson(text);
}

export async function writeScript({ niche, idea, durationSec = 45, brief = '' }) {
  const words = Math.round(durationSec * 2.4); // ~145 wpm speech
  const text = await claude(
    `Write a faceless short-video voice-over script. Niche: "${niche}".${brief ? ` About this channel: ${brief}.` : ''} Video idea: "${idea}".
Length: about ${words} words (${durationSec} seconds spoken). Structure: scroll-stopping hook in the first sentence, fast-paced value in the middle, call-to-action to follow at the end.
Plain spoken text only — no scene directions, no emojis, no headings.`
  );
  if (text === null) {
    return `Stop scrolling — here's what nobody tells you about ${idea}. Most people in ${niche} get this completely wrong. The truth is simpler than you think: focus on one thing, do it every day, and track your progress. That's how the top one percent in ${niche} actually win. Try it for seven days and watch what happens. Follow for more ${niche} tips that actually work.`;
  }
  return text.trim();
}

export async function generateSeo({ niche, idea, script }) {
  const text = await claude(
    `For a YouTube video in the "${niche}" niche about "${idea}" with this script:
"${script.slice(0, 800)}"

Respond ONLY with JSON: {"title": "SEO YouTube title under 70 chars, high CTR", "description": "150-word SEO description with keywords and a subscribe CTA", "tags": ["10-15", "seo", "tags"], "next_video": "one specific idea for the next video to keep viewers coming back"}`
  );
  if (text === null) {
    return {
      title: `${idea} (${niche})`.slice(0, 70),
      description: `${idea} — everything you need to know about ${niche}. Subscribe for more ${niche} content every week!`,
      tags: [niche, idea, 'shorts', 'tips', 'howto'].map((t) => String(t).toLowerCase().slice(0, 30)),
      next_video: `Follow-up: common mistakes in ${niche}`,
    };
  }
  return extractJson(text);
}

// "Make one like this": takes a reference video's title/author and produces
// an original idea in the same style (no copying).
export async function generateSimilarIdea({ niche, refTitle, refAuthor }) {
  const text = await claude(
    `A creator wants a faceless short video in the "${niche}" niche, similar in style/topic to this existing video:
Title: "${refTitle}"${refAuthor ? ` by ${refAuthor}` : ''}

Create ONE original video idea that rides the same appeal but is NOT a copy — same topic angle and energy, fresh take.
Respond ONLY with JSON: {"idea": "...", "hook": "first line of the video", "why": "why this style performs"}`,
    600
  );
  if (text === null) {
    return { idea: `Our take on: ${refTitle}`.slice(0, 90), hook: `You've seen "${refTitle}" — here's what they missed.`, why: 'Riding proven content (offline fallback)' };
  }
  return extractJson(text);
}

export async function generateCaption({ niche, hint }) {
  const text = await claude(
    `Write ONE short, engaging social media caption for a video in the "${niche}" niche${hint ? ` (video is about: "${hint}")` : ''}.
2-3 sentences max, hook first, then 4-6 relevant hashtags on the last line. Respond with the caption text only.`,
    300
  );
  if (text === null) {
    return `${hint || `New ${niche} video`} 🔥 Watch till the end!\n\n#${niche.replace(/\s+/g, '')} #viral #fyp #shorts`;
  }
  return text.trim();
}

// Scene image prompts for AI-image visuals (cartoon/anime/etc.)
export async function imagePrompts({ niche, idea, script, style, count = 5 }) {
  const text = await claude(
    `For a faceless video about "${idea}" (niche: ${niche}), script: "${script.slice(0, 500)}"
Write ${count} image-generation prompts, one per scene, following the script's flow.
Every prompt MUST specify the art style: "${style}". Vivid, concrete scenes; no text in images; no real people's likenesses; no exact copyrighted characters (style-inspired is fine).
Respond ONLY with a JSON array of strings.`,
    800
  );
  if (text === null) {
    return Array.from({ length: count }, (_, i) => `${style} illustration, scene ${i + 1} about ${idea}, ${niche}, vibrant, high detail, no text`);
  }
  return extractJson(text);
}

// Search keywords for stock footage matching the script
export async function visualKeywords({ niche, idea, script, count = 5 }) {
  const text = await claude(
    `For a faceless video about "${idea}" (niche: ${niche}), give ${count} short stock-footage search phrases (2-3 words each) matching the script's flow: "${script.slice(0, 500)}"
Respond ONLY with a JSON array of strings. Generic visual concepts only (e.g. "city night aerial", "person typing laptop").`,
    500
  );
  if (text === null) {
    return [niche.split(' ').slice(0, 2).join(' '), 'abstract background', 'city timelapse', 'technology screen', 'nature aerial'].slice(0, count);
  }
  return extractJson(text);
}

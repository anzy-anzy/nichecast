// AI content generation: uses the Anthropic API when ANTHROPIC_API_KEY is set,
// otherwise falls back to built-in niche templates so the app works out of the box.

const TEMPLATES = [
  (n, t) => `3 things nobody tells you about ${t || n}:\n\n1. Consistency beats talent.\n2. Your first attempts will be rough — post anyway.\n3. The people who win are the ones still here in 12 months.\n\nWhich one do you need to hear today?`,
  (n, t) => `Hot take: most advice about ${t || n} is recycled.\n\nHere's what actually moved the needle for us — doing less, but doing it every single day.\n\nAgree or disagree?`,
  (n, t) => `Quick win for anyone in ${n}: spend 10 minutes today on ${t || 'the one task you keep avoiding'}.\n\nSmall reps compound. Save this as your reminder.`,
  (n, t) => `We asked our community their #1 struggle with ${t || n}.\n\nThe top answer? "Knowing where to start."\n\nSo here it is: start smaller than feels useful. Then repeat tomorrow.`,
  (n, t) => `POV: you finally stopped overthinking ${t || n} and just started.\n\n6 months from now you'll wish you began today. 🚀`,
];

export async function generatePosts({ niche, topic = '', count = 5, tone = 'engaging', platform = 'general' }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return TEMPLATES.slice(0, count).map((fn, i) => ({
      content: fn(niche, topic),
      source: 'template',
    }));
  }

  const prompt = `You are a top social media copywriter. Write ${count} distinct, high-engagement social media posts for a business in the "${niche}" niche.${topic ? ` Topic focus: ${topic}.` : ''} Tone: ${tone}. Target platform: ${platform}.
Rules: hooks in the first line, no hashtag spam (max 3), each post stands alone, vary formats (list, hot take, story, question).
Respond ONLY with a JSON array of strings, one string per post.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text || '[]';
  const match = text.match(/\[[\s\S]*\]/);
  const arr = JSON.parse(match ? match[0] : text);
  return arr.map((content) => ({ content, source: 'ai' }));
}

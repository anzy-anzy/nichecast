import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

const SYSTEM_PROMPT = `You are the in-app assistant for NicheCast, a social media automation platform. You help users understand features and write good prompts. Keep answers short and practical (3-6 sentences max unless asked for more).

Features you can explain:
- Video Studio: faceless AI videos (script, voice-over, visuals, subtitles, SEO), up to 2 minutes, trend research, autopilot (auto daily posting), cloned voices, "make one like this" from a reference link.
- Marketing Studio: AI ad videos from product photos, property/restaurant tour videos from multiple room photos, "make one like this" from a reference video link. Resolution 480p/720p/1080p, duration up to 30s, live cost estimate.
- Creator Studio: upload a photo to create a reusable "Character" (digital avatar), then generate them in scenarios (office, remote desk, walking) — describes action/mood, not literal lip-synced dialogue.
- Accounts: connect social accounts via the posting provider (Outstand/Post for Me/Blotato/Ayrshare), plus voice cloning.
- Post Queue: see scheduled/posted/failed posts.
- Billing: plan tiers and usage.
- The worker (npm run worker locally, a separate Railway service in production) must be running for anything to actually generate or post — remind users of this if something seems stuck.

When asked to help write a prompt (video idea, ad scene, character scenario), write one directly, ready to paste in.`;

export async function POST(req) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json({
      reply: "The AI assistant needs an ANTHROPIC_API_KEY set in your environment. Once that's added, I can help you here directly!",
    });
  }
  try {
    const { messages } = await req.json();
    const trimmed = (messages || []).slice(-12).map((m) => ({ role: m.role, content: m.content }));
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system: SYSTEM_PROMPT,
        messages: trimmed,
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    const reply = data.content?.[0]?.text || "Sorry, I didn't catch that — try again?";
    return NextResponse.json({ reply });
  } catch (e) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}

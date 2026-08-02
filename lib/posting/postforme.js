// Post for Me posting provider (https://postforme.dev — usage-based, $10/mo
// for 1,000 posts, no subscription-per-seat model like Ayrshare/Blotato).
// Connect the client's social accounts once in the Post for Me dashboard,
// then register each here with its Post for Me account ID as external_id.

const BASE = 'https://api.postforme.dev/v1';

export const postForMeProvider = {
  name: 'postforme',
  async publish({ account, content, mediaUrl, aiGenerated }) {
    const body = {
      caption: content || '',
      platforms: [
        {
          platform: account.platform,
          account_id: account.external_id || undefined,
        },
      ],
      ...(aiGenerated ? { is_ai_generated: true } : {}),
    };
    if (mediaUrl) body.media = [{ url: mediaUrl }];

    const res = await fetch(`${BASE}/posts`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${process.env.POSTFORME_API_KEY || ''}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });
    const text = await res.text();
    let data = {};
    try { data = JSON.parse(text); } catch {}
    if (!res.ok) throw new Error(`Post for Me: ${(data.message || text).slice(0, 250)}`);
    return {
      ok: true,
      externalPostId: data.id || data.post_id || 'submitted',
      detail: `Published to ${account.platform} via Post for Me`,
    };
  },
};

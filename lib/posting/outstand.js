// Outstand posting provider (https://www.outstand.so — usage-based, $19/mo
// includes 3,000 posts, then $0.007/post down to $0.005/post at volume.
// No per-seat cost, no plan-tier video restriction like Ayrshare. Also
// supports "Managed Keys" (their own approved developer apps, so accounts
// are OAuth-connected in the Outstand dashboard — no Meta/TikTok developer
// verification needed) or BYO app credentials for white-label agency use.
// Connect each account once in the Outstand dashboard, then store its
// Outstand social account id as external_id on the accounts row here.

const BASE = 'https://api.outstand.so/v1';

export const outstandProvider = {
  name: 'outstand',
  async publish({ account, content, mediaUrl, aiGenerated }) {
    let mediaIds;
    if (mediaUrl) {
      const mediaRes = await fetch(`${BASE}/media`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${process.env.OUTSTAND_API_KEY || ''}`,
        },
        body: JSON.stringify({ url: mediaUrl }),
        signal: AbortSignal.timeout(60000),
      });
      const mediaText = await mediaRes.text();
      let mediaData = {};
      try { mediaData = JSON.parse(mediaText); } catch {}
      if (!mediaRes.ok) throw new Error(`Outstand media: ${(mediaData.message || mediaText).slice(0, 250)}`);
      if (mediaData.id) mediaIds = [mediaData.id];
    }

    const body = {
      containers: [
        {
          content: content || '',
          ...(mediaIds ? { mediaIds } : {}),
          ...(aiGenerated ? { aiGenerated: true } : {}),
        },
      ],
      socialAccountIds: [account.external_id],
    };

    const res = await fetch(`${BASE}/posts`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${process.env.OUTSTAND_API_KEY || ''}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });
    const text = await res.text();
    let data = {};
    try { data = JSON.parse(text); } catch {}
    if (!res.ok) throw new Error(`Outstand: ${(data.message || text).slice(0, 250)}`);
    return {
      ok: true,
      externalPostId: data.id || 'submitted',
      detail: `Published to ${account.platform} via Outstand`,
    };
  },
};

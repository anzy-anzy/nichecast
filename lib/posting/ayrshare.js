// Ayrshare posting provider (https://www.ayrshare.com/docs)
// Set POSTING_PROVIDER=ayrshare and AYRSHARE_API_KEY in .env.local.
// Connect the client's social accounts once in the Ayrshare dashboard —
// no Meta developer verification needed.

export const ayrshareProvider = {
  name: 'ayrshare',
  async publish({ account, content, mediaUrl }) {
    const body = {
      post: content || ' ',
      platforms: [account.platform === 'twitter' ? 'twitter' : account.platform],
    };
    if (mediaUrl) body.mediaUrls = [mediaUrl];
    // Optional: multi-client support via profile keys (Business plan)
    const headers = {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.AYRSHARE_API_KEY || ''}`,
    };
    if (account.external_id) headers['Profile-Key'] = account.external_id;

    const res = await fetch('https://api.ayrshare.com/api/post', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });
    const text = await res.text();
    let data = {};
    try { data = JSON.parse(text); } catch {}
    if (!res.ok || data.status === 'error') {
      throw new Error(`Ayrshare: ${(data.message || text).slice(0, 250)}`);
    }
    return {
      ok: true,
      externalPostId: data.id || data.postIds?.[0]?.id || 'submitted',
      detail: `Published to ${account.platform} via Ayrshare`,
    };
  },
};

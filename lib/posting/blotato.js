// Blotato posting provider (https://help.blotato.com — API v2).
// Requires BLOTATO_API_KEY. Each connected account row must have
// external_id = the Blotato accountId for that platform connection.

const BASE = 'https://backend.blotato.com/v2';

async function blotatoFetch(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'blotato-api-key': process.env.BLOTATO_API_KEY || '',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Blotato ${res.status}: ${text.slice(0, 300)}`);
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export const blotatoProvider = {
  name: 'blotato',
  async publish({ account, content, mediaUrl }) {
    let mediaUrls = [];
    if (mediaUrl) {
      // Blotato requires media to be uploaded to its CDN first
      const media = await blotatoFetch('/media', { url: mediaUrl });
      if (media?.url) mediaUrls = [media.url];
    }
    const result = await blotatoFetch('/posts', {
      post: {
        accountId: account.external_id,
        target: { targetType: account.platform },
        content: {
          text: content,
          platform: account.platform,
          mediaUrls,
        },
      },
    });
    return {
      ok: true,
      externalPostId: result?.postSubmissionId || result?.id || 'submitted',
      detail: `Published to ${account.platform} via Blotato`,
    };
  },
};

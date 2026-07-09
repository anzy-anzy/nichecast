// Mock posting provider — simulates publishing so the whole pipeline
// works end-to-end without any paid API. Swap via POSTING_PROVIDER env.

export const mockProvider = {
  name: 'mock',
  async publish({ account, content, mediaUrl }) {
    await new Promise((r) => setTimeout(r, 300));
    return {
      ok: true,
      externalPostId: `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      detail: `[MOCK] Would publish to ${account.platform} (@${account.handle})${mediaUrl ? ' with media ' + mediaUrl : ''}`,
    };
  },
};

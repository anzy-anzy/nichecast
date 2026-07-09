// Trend research: pulls live trending searches (Google Trends RSS, no key needed)
// and optionally YouTube trending (YOUTUBE_API_KEY), then lets Claude match
// them to the user's niche. Falls back to pure-Claude brainstorming offline.

async function fetchGoogleTrends(geo = 'US') {
  try {
    const res = await fetch(`https://trends.google.com/trending/rss?geo=${geo}`, {
      headers: { 'user-agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const titles = [...xml.matchAll(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/g)]
      .map((m) => m[1])
      .filter((t) => t && !/trending|daily search/i.test(t));
    return titles.slice(0, 20);
  } catch {
    return [];
  }
}

async function fetchYouTubeTrending(niche) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return [];
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&order=viewCount&publishedAfter=${new Date(
      Date.now() - 7 * 864e5
    ).toISOString()}&maxResults=10&q=${encodeURIComponent(niche)}&key=${key}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map((i) => i.snippet?.title).filter(Boolean);
  } catch {
    return [];
  }
}

export async function researchTrends(niche) {
  const [google, youtube] = await Promise.all([fetchGoogleTrends(), fetchYouTubeTrending(niche)]);
  return { google, youtube };
}

// Subscription tiers. Payment-processor agnostic: paste your Paddle /
// Lemon Squeezy / Flutterwave payment links in .env.local and the
// pricing page buttons will point at them.

export const PLANS = {
  trial: {
    name: 'Free Trial',
    price: 0,
    canUploadPost: true,
    canGenerateVideos: true,
    videoLimitPerMonth: 3,
    accountLimit: 2,
  },
  publisher: {
    name: 'Publisher',
    price: 29,
    canUploadPost: true,
    canGenerateVideos: false,
    videoLimitPerMonth: 0,
    accountLimit: 5,
  },
  creator: {
    name: 'Creator',
    price: 99,
    canUploadPost: false,
    canGenerateVideos: true,
    videoLimitPerMonth: 30,
    accountLimit: 3,
  },
  autopilot: {
    name: 'Autopilot',
    price: 100,
    canUploadPost: false,
    canGenerateVideos: true,
    videoLimitPerMonth: 93, // 3 per day
    accountLimit: 3,
    autopilot: true,
  },
  studio: {
    name: 'Studio',
    price: 119,
    canUploadPost: true,
    canGenerateVideos: true,
    videoLimitPerMonth: 60,
    accountLimit: 10,
    autopilot: true,
  },
};

export function getPlan(user) {
  return PLANS[user?.plan] || PLANS.trial;
}

export function videosUsedThisMonth(db, userId) {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS n FROM videos WHERE user_id = ? AND created_at >= datetime('now', 'start of month')`
    )
    .get(userId);
  return row?.n || 0;
}

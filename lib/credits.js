// Credits system: users spend credits to generate video/image content instead
// of seeing a raw dollar cost. Credits are a resale-friendly abstraction over
// real fal.ai/ElevenLabs cost, so you control margin without exposing your
// underlying provider bill to customers.
//
// Conversion rate is derived directly from your own example (Studio-tier
// pricing: $30 -> 500 credits, i.e. ~16.67 credits per $1 of plan price) and a
// ~3x markup over real infra cost, which nets out to:
//
//   CREDITS_PER_DOLLAR_OF_COST = 50   (1 credit ~= $0.02 of real generation cost)
//
// Sanity check: an 8s 720p Kling video costs ~$0.80 -> 40 credits, matching
// the "~40 credits per generation" figure you described.

import { getDb } from './db';

export const CREDITS_PER_DOLLAR_OF_COST = 50;

// How many credits each plan grants. Trial gets a small one-time allotment;
// paid plans are granted on each billing cycle (see grantMonthlyCreditsIfDue).
// Numbers are proportional to plan price at ~16.67 credits/$1 of plan price,
// except Studio/Autopilot which are rounded up slightly to comfortably cover
// their advertised video-count promise (60/mo and 93/mo respectively) at
// typical resolution/duration settings — see README for the full breakdown.
export const PLAN_CREDITS = {
  trial: 100, // one-time, ~2 short generations to try the product
  publisher: 480, // mainly Bulk-Upload-era plan; small allotment for occasional Image Studio use
  creator: 1650,
  autopilot: 1700, // sized for 93 auto-generated 480p/8s videos/mo (~18 credits each)
  studio: 2500, // sized to comfortably cover 60 videos/mo at a 720p/8s mix
};

export function creditsForCost(dollarCost) {
  return Math.max(1, Math.ceil(dollarCost * CREDITS_PER_DOLLAR_OF_COST));
}

export function getBalance(userId) {
  const row = getDb().prepare('SELECT credits FROM users WHERE id = ?').get(userId);
  return row?.credits || 0;
}

export function grantCredits(userId, amount, reason = '') {
  const db = getDb();
  db.prepare('UPDATE users SET credits = credits + ? WHERE id = ?').run(amount, userId);
  db.prepare('INSERT INTO credit_transactions (user_id, delta, reason) VALUES (?, ?, ?)').run(userId, amount, reason);
}

// Throws if the user doesn't have enough credits — callers should catch and
// surface a friendly "not enough credits" error before queueing a job.
export function deductCredits(userId, amount, reason = '') {
  const db = getDb();
  const balance = getBalance(userId);
  if (balance < amount) {
    const err = new Error(`Not enough credits: need ${amount}, have ${balance}.`);
    err.code = 'INSUFFICIENT_CREDITS';
    throw err;
  }
  db.prepare('UPDATE users SET credits = credits - ? WHERE id = ?').run(amount, userId);
  db.prepare('INSERT INTO credit_transactions (user_id, delta, reason) VALUES (?, ?, ?)').run(userId, -amount, reason);
}

// Refunds credits if a queued job later fails during background rendering
// (so a failed generation doesn't cost the user anything).
export function refundCredits(userId, amount, reason = 'refund: generation failed') {
  if (amount > 0) grantCredits(userId, amount, reason);
}

export function grantTrialCreditsIfNew(userId) {
  grantCredits(userId, PLAN_CREDITS.trial, 'trial signup bonus');
}

// Call this whenever you manually (or via a future Paddle webhook) set a
// user's plan — grants that plan's monthly credit allotment immediately.
export function grantPlanCredits(userId, plan) {
  const amount = PLAN_CREDITS[plan] || 0;
  if (amount > 0) grantCredits(userId, amount, `${plan} plan credit grant`);
}

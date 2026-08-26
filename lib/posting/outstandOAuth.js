// Shared helpers for Outstand's embedded OAuth connect flow — lets users
// connect Instagram/TikTok/Facebook/etc. directly inside our app (redirected
// to the real platform's own login/consent screen) instead of having to go
// set things up on Outstand's own dashboard first.
// Docs: https://www.outstand.so/docs/getting-started#1-connect-an-account

import { envOrSetting } from '../settings';

export const PLATFORM_TO_NETWORK = {
  instagram: 'instagram',
  tiktok: 'tiktok',
  facebook: 'facebook',
  linkedin: 'linkedin',
  twitter: 'x',
  youtube: 'youtube',
  threads: 'threads',
  pinterest: 'pinterest',
};

export function appUrl() {
  return process.env.APP_URL || 'http://localhost:3000';
}

export function buildAuthorizeUrl(platform) {
  const network = PLATFORM_TO_NETWORK[platform];
  if (!network) throw new Error(`Unsupported platform: ${platform}`);
  const orgId = envOrSetting('OUTSTAND_ORG_ID');
  if (!orgId) throw new Error('OUTSTAND_ORG_ID is not set');
  const redirectUri = `${appUrl()}/api/accounts/callback?platform=${encodeURIComponent(platform)}`;
  return `https://www.outstand.so/app/api/socials/${network}/${orgId}?redirect_uri=${encodeURIComponent(redirectUri)}`;
}

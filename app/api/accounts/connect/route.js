import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { buildAuthorizeUrl, appUrl } from '@/lib/posting/outstandOAuth';
import { envOrSetting } from '@/lib/settings';

// Starts the embedded "Connect account" flow: redirects the user's browser
// straight to the real platform's OAuth consent screen (via Outstand), so
// they never have to leave the app to visit a separate dashboard.
export async function GET(req) {
  const user = getCurrentUser();
  if (!user) return NextResponse.redirect(`${appUrl()}/login`);

  const { searchParams } = new URL(req.url);
  const platform = searchParams.get('platform');

  if (!envOrSetting('OUTSTAND_API_KEY') || !envOrSetting('OUTSTAND_ORG_ID')) {
    return NextResponse.redirect(
      `${appUrl()}/dashboard/accounts?connect_error=${encodeURIComponent('Outstand is not configured yet — add OUTSTAND_API_KEY and OUTSTAND_ORG_ID.')}`
    );
  }

  try {
    const authorizeUrl = buildAuthorizeUrl(platform);
    return NextResponse.redirect(authorizeUrl);
  } catch (e) {
    return NextResponse.redirect(
      `${appUrl()}/dashboard/accounts?connect_error=${encodeURIComponent(String(e.message || e))}`
    );
  }
}

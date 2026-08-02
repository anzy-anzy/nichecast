import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { appUrl } from '@/lib/posting/outstandOAuth';

// Outstand redirects the browser back here after the user approves the
// platform's OAuth consent screen. We save the connected account straight
// into our own DB — no manual copy-pasting of IDs, no separate dashboard.
export async function GET(req) {
  const user = getCurrentUser();
  if (!user) return NextResponse.redirect(`${appUrl()}/login`);

  const { searchParams } = new URL(req.url);
  const success = searchParams.get('success');
  const accountId = searchParams.get('account_id');
  const username = searchParams.get('username') || '';
  const platform = searchParams.get('platform') || '';
  const error = searchParams.get('error');

  if (error || success !== 'true' || !accountId) {
    return NextResponse.redirect(
      `${appUrl()}/dashboard/accounts?connect_error=${encodeURIComponent(error || 'Connection was not completed.')}`
    );
  }

  getDb()
    .prepare('INSERT INTO accounts (user_id, platform, handle, external_id) VALUES (?, ?, ?, ?)')
    .run(user.id, platform, username || platform, accountId);

  return NextResponse.redirect(`${appUrl()}/dashboard/accounts?connected=1`);
}

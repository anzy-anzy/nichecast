import { NextResponse } from 'next/server';
import { verifyUser, createSession, sessionCookie } from '@/lib/auth';

export async function POST(req) {
  const { email, password } = await req.json();
  const user = verifyUser(email || '', password || '');
  if (!user) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
  }
  const token = createSession(user.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookie(token));
  return res;
}

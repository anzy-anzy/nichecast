import { NextResponse } from 'next/server';
import { createUser, createSession, sessionCookie } from '@/lib/auth';

export async function POST(req) {
  try {
    const { email, password, niche } = await req.json();
    if (!email || !password || password.length < 6) {
      return NextResponse.json({ error: 'Valid email and a password of 6+ characters required.' }, { status: 400 });
    }
    let userId;
    try {
      userId = createUser(email, password, niche || '');
    } catch (e) {
      if (String(e).includes('UNIQUE')) {
        return NextResponse.json({ error: 'An account with that email already exists.' }, { status: 409 });
      }
      throw e;
    }
    const token = createSession(userId);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(sessionCookie(token));
    return res;
  } catch (e) {
    return NextResponse.json({ error: 'Signup failed.' }, { status: 500 });
  }
}

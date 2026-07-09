import { NextResponse } from 'next/server';
import { destroySession, COOKIE } from '@/lib/auth';

export async function POST() {
  destroySession();
  const res = NextResponse.json({ ok: true });
  res.cookies.set({ name: COOKIE, value: '', path: '/', maxAge: 0 });
  return res;
}

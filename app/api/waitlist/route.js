import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(req) {
  const { email } = await req.json();
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email required.' }, { status: 400 });
  }
  try {
    getDb().prepare('INSERT INTO waitlist (email) VALUES (?)').run(email.toLowerCase().trim());
  } catch (e) {
    // duplicate — fine
  }
  return NextResponse.json({ ok: true });
}

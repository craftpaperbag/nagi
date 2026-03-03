import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { redisClient } from '@/lib/redis';

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('session_id')?.value;

  // Redisからセッションを削除
  if (sessionId) {
    await redisClient.del(`session:${sessionId}`);
  }
  
  // セッションCookieを削除
  cookieStore.set({
    name: 'session_id',
    value: '',
    maxAge: 0,
    path: '/',
  });

  return NextResponse.redirect(new URL('/', request.url));
}

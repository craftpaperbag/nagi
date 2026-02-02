import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { redisClient } from '@/lib/redis';

export async function POST() {
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

  // 環境変数からベースURLを取得するか、デフォルト値を使用
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  return NextResponse.redirect(new URL('/', baseUrl));
}

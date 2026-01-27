import { NextResponse } from 'next/server';
import { redisClient } from '@/lib/redis'; // redisClient を名前付きインポート
import { generateSessionId, setSessionCookie } from '@/lib/auth'; // セッション生成とCookie設定用のヘルパー関数（後述）

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }

  try {
    // 1. KVからトークン検証＆削除
    const email = await redisClient.get(`auth_token:${token}`);
    if (!email) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }
    await redisClient.del(`auth_token:${token}`);

    // 2. ユーザー特定（存在しなければ新規作成）
    // ここでは簡易的に email を user_id として扱いますが、実際には user テーブル等で管理します。
    let userId = await redisClient.get(`user:email:${email}`);
    if (!userId) {
      userId = `user_${Date.now()}`; // 仮の user_id 生成
      await redisClient.set(`user:email:${email}`, userId);
      // 必要であれば、user:{user_id} のプロファイル情報も作成
      await redisClient.set(`user:${userId}`, JSON.stringify({ id: userId, email: email, created_at: new Date().toISOString() }));
    }

    // 3. セッションID (UUID) 生成＆KV保存
    const sessionId = await generateSessionId(); // 新規セッションID生成ヘルパー
    await redisClient.set(`session:${sessionId}`, userId, {
      EX: 30 * 24 * 60 * 60, // TTL: 30日
    });

    // 4. Cookie設定
    const response = NextResponse.redirect(new URL('/dashboard', request.url)); // ダッシュボードへリダイレクト
    setSessionCookie(response, sessionId); // セッションCookie設定ヘルパー

    return response;

  } catch (error) {
    console.error('Auth callback error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

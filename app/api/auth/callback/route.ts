import { NextResponse } from 'next/server';
import { redisClient } from '@/lib/redis'; // redisClient を名前付きインポート
import { generateSessionId, setSessionCookie } from '@/lib/auth'; // セッション生成とCookie設定用のヘルパー関数
import { v4 as uuidv4 } from 'uuid'; // uuidをインポート

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }

  try {
    // 1. KVからトークン検証＆削除
    const email = await redisClient.get<string>(`auth_token:${token}`);
    if (!email) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }
    await redisClient.del(`auth_token:${token}`);

    // 2. ユーザー特定（存在しなければ新規作成）
    let userId = await redisClient.get<string>(`user:email:${email}`);
    let userData: any;

    if (!userId) {
      userId = uuidv4(); // user_id も UUID で生成
      const apiToken = uuidv4(); // API用トークンを生成
      userData = {
        id: userId,
        email: email,
        api_token: apiToken, // プロファイルに保存
        created_at: new Date().toISOString()
      };

      await redisClient.set(`user:email:${email}`, userId);
      await redisClient.set(`user:${userId}`, userData);
      // トークンからユーザーIDを引けるようにする
      await redisClient.set(`api_token:${apiToken}`, userId);
    } else {
      userData = await redisClient.get(`user:${userId}`) || {};

      // 既存ユーザーにトークンがない場合の補填
      if (!userData.api_token) {
        userData.api_token = uuidv4();
        await redisClient.set(`user:${userId}`, userData);
        await redisClient.set(`api_token:${userData.api_token}`, userId);
      }
    }

    // 3. セッションID (UUID) 生成＆KV保存
    const sessionId = await generateSessionId(); // 新規セッションID生成ヘルパー
    await redisClient.set(`session:${sessionId}`, userId, {
      ex: 30 * 24 * 60 * 60, // TTL: 30日
    });

    // 4. Cookie設定
    const response = NextResponse.redirect(new URL('/', request.url)); // トップページへリダイレクト
    setSessionCookie(response, sessionId); // セッションCookie設定ヘルパー

    return response;

  } catch (error) {
    console.error('Auth callback error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

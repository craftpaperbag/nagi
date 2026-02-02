// app/api/log/route.ts
import { NextResponse } from 'next/server';
import { redisClient } from '@/lib/redis';

// --- API Logic ---
export async function POST(request: Request) {
  // 1. Bearerトークン認証
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = authHeader.split(' ')[1];
  const userId = await redisClient.get<string>(`api_token:${token}`);

  if (!userId) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // 2. リクエストボディのパース
  let requestBody;
  try {
    requestBody = await request.json();
  } catch (error) {
    console.error('Failed to parse request body:', error);
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { app } = requestBody;
  // 'app' フィールドのバリデーション (文字列であることを確認し、空文字は許容)
  if (typeof app !== 'string') {
    return NextResponse.json({ error: 'App name must be a string' }, { status: 400 });
  }

  // 3. ログの保存
  const now = new Date();
  const logData = {
    ts: now.getTime(), // ミリ秒
    app: app.trim(), // 前後の空白を除去
  };

  // 日本時間での日付文字列 (YYYY-MM-DD) を生成
  const dateStr = now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });

  // --- Database Operations ---
  try {
    const logKey = `logs:${userId}:${dateStr}`;
    const ONE_YEAR_IN_SECONDS = 365 * 24 * 60 * 60;

    // logs:{userId}:{dateStr} に保存
    await redisClient.rpush(logKey, logData);
    // 有効期限を1年に設定 (または更新)
    await redisClient.expire(logKey, ONE_YEAR_IN_SECONDS);

    // apps:{user_id} セットにアプリ名を追加 (SADD) - 空文字以外の場合のみ
    if (logData.app) {
      await redisClient.sadd(`apps:${userId}`, logData.app);
    }

    // --- Response ---
    return NextResponse.json({ message: 'Log entry added successfully' }, { status: 200 });

  } catch (error: any) {
    console.error('Error processing log request:', error);
    // Redis操作中にエラーが発生した場合
    return NextResponse.json({ error: 'Failed to store log data' }, { status: 500 });
  }
}

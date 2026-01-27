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
  const userId = await redisClient.get(`api_token:${token}`);

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
  // 'app' フィールドのバリデーション
  if (typeof app !== 'string' || app.trim() === '') {
    return NextResponse.json({ error: 'App name is required and must be a non-empty string' }, { status: 400 });
  }

  // 3. ログの保存 (開発用に日付を外して全件取得しやすくする)
  const logData = {
    ts: Date.now(), // ミリ秒
    app: app.trim(), // 前後の空白を除去
  };

  // --- Database Operations ---
  try {
    // logs:{userId} に集約して保存
    await redisClient.rPush(`logs:${userId}`, JSON.stringify(logData));
    // apps:{user_id} セットにアプリ名を追加 (SADD)
    await redisClient.sAdd(`apps:${userId}`, logData.app);

    // --- Response ---
    return NextResponse.json({ message: 'Log entry added successfully' }, { status: 200 });

  } catch (error: any) {
    console.error('Error processing log request:', error);
    // Redis操作中にエラーが発生した場合
    return NextResponse.json({ error: 'Failed to store log data' }, { status: 500 });
  }
}

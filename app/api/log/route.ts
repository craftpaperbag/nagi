// app/api/log/route.ts
import { createClient } from 'redis';
import { NextResponse } from 'next/server';

// --- Redis Client Setup ---
// 環境変数からRedisのURLを取得するか、ローカルのデフォルトURLを使用
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisClient = createClient({ url: redisUrl });

redisClient.on('error', (err) => console.error('Redis Client Error:', err));

// Redisクライアントを接続します。
// トップレベルでのconnectはNext.jsのサーバーレス環境で注意が必要ですが、
// ここではシンプルに実装します。
redisClient.connect().catch(console.error);

// --- API Logic ---
export async function POST(request: Request) {
  // リクエストボディからJSONをパース
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

  // --- Data Preparation ---
  // 仮のuser_id。認証機能実装時に置き換えます。
  const userId = 'user123';
  // 現在の日付を YYYY-MM-DD 形式で取得
  const today = new Date().toISOString().split('T')[0];
  // 現在のタイムスタンプ (ミリ秒)
  const timestamp = Date.now();

  const logData = {
    ts: timestamp,
    app: app.trim(), // 前後の空白を除去
  };

  // --- Database Operations ---
  try {
    // 1. logs:{user_id}:{YYYY-MM-DD} リストにログを追加 (RPUSH)
    // 設計書: Value (JSON): {"ts": 1701501200, "app": "Instagram"}
    await redisClient.rPush(`logs:${userId}:${today}`, JSON.stringify(logData));

    // 2. apps:{user_id} セットにアプリ名を追加 (SADD)
    // 設計書: Value: ["Instagram", "X", "YouTube", ...]
    await redisClient.sAdd(`apps:${userId}`, logData.app);

    // --- Response ---
    return NextResponse.json({ message: 'Log entry added successfully' }, { status: 200 });

  } catch (error: any) {
    console.error('Error processing log request:', error);
    // Redis操作中にエラーが発生した場合
    return NextResponse.json({ error: 'Failed to store log data' }, { status: 500 });
  }
}

import { createClient } from 'redis';

// Vercel KV (Redis) の接続情報を環境変数から取得
// VERCEL_KV_URL は Vercel の環境変数設定で自動的に提供されることが多いです。
// ローカル開発時は .env ファイルなどで設定してください。
const redisUrl = process.env.REDIS_URL || process.env.VERCEL_KV_URL;

if (!redisUrl) {
  throw new Error('REDIS_URL or VERCEL_KV_URL is not set.');
}

export const redisClient = createClient({
  url: redisUrl,
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

// 非同期で接続を確立
async function connectRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    console.log('Connected to Redis');
  }
}

// アプリケーション起動時に接続を試みる
connectRedis().catch(console.error);

// アプリケーション終了時に接続を閉じる（必要に応じて）
process.on('SIGINT', async () => {
  await redisClient.quit();
  console.log('Disconnected from Redis');
  process.exit(0);
});

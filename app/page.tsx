import { createClient } from 'redis'; // redisパッケージからインポート

// ログデータの型定義
interface LogEntry {
  ts: number;
  app: string;
}

// Redisクライアントの初期化
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.connect().catch(console.error); // 接続を試みる

async function getTodaysLogs(): Promise<LogEntry[]> {
  // 仮のuser_id。認証機能実装時に置き換える。
  const userId = 'user123';
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD形式

  try {
    // logs:{user_id}:{YYYY-MM-DD} のリストから全ログを取得
    // redisパッケージではlRangeを使用
    const logStrings = await redisClient.lRange(`logs:${userId}:${today}`, 0, -1);
    // JSON文字列をパースしてLogEntryの配列に変換
    const logs: LogEntry[] = logStrings.map(logString => JSON.parse(logString));
    return logs;
  } catch (error: any) {
    console.error('Error fetching logs:', error);
    return []; // エラー時は空配列を返す
  }
}

// サーバーコンポーネントとしてログを取得し表示するコンポーネント
async function HomePage() {
  const logs = await getTodaysLogs();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">nagi</h1>
      <h2 className="text-2xl font-semibold mb-4">今日のログ</h2>
      {logs.length > 0 ? (
        <ul className="w-full max-w-md">
          {logs.map((log, index) => (
            <li key={index} className="flex justify-between py-2 border-b">
              <span>{new Date(log.ts).toLocaleTimeString()}</span>
              <span>{log.app}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p>今日のログはありません。</p>
      )}
    </main>
  );
}

// Homeコンポーネントをデフォルトエクスポート
export default HomePage;

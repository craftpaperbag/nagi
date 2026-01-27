import { redisClient } from '@/lib/redis'; // 名前付きインポートに変更
import LoginForm from '@/components/LoginForm'; // 追加

// ログデータの型定義
interface LogEntry {
  ts: number;
  app: string;
}

async function getTodaysLogs(userId: string): Promise<LogEntry[]> {
  const today = new Date().toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD 形式
  const logs = await redisClient.lRange(`logs:${userId}:${today}`, 0, -1);
  return logs.map(log => JSON.parse(log));
}

export default async function Home() {
  // TODO: 認証機能実装後、実際の userId を取得する
  const userId = 'user_12345'; // 仮の user_id

  const logs = await getTodaysLogs(userId);

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <LoginForm />
      </div>

      <div className="mt-10 w-full max-w-5xl">
        <h2 className="text-2xl font-bold mb-4">今日のログ</h2>
        {logs.length > 0 ? (
          <ul className="space-y-2">
            {logs.map((log, index) => (
              <li key={index} className="bg-gray-800 p-3 rounded-md flex justify-between items-center">
                <span>{new Date(log.ts * 1000).toLocaleTimeString()}</span>
                <span>{log.app}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p>本日のログはありません。</p>
        )}
      </div>
    </main>
  );
}

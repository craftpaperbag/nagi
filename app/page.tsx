import { createClient } from 'redis';

// ログデータの型定義
interface LogEntry {
  ts: number;
  app: string;
}

async function getTodaysLogs(): Promise<LogEntry[]> {
  // 仮のuser_id。認証機能実装時に置き換える。
  const userId = 'user123';
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD形式

  try {
    // logs:{user_id}:{YYYY-MM-DD} のリストから全ログを取得
    const logStrings = await kv.lrange<string>(`logs:${userId}:${today}`, 0, -1);
    // JSON文字列をパースしてLogEntryの配列に変換
    const logs: LogEntry[] = logStrings.map(logString => JSON.parse(logString));
    return logs;
  } catch (error) {
    console.error('Error fetching logs:', error);
    return []; // エラー時は空配列を返す
  }
}

export default function Home() {
  // このコンポーネントはクライアントサイドでレンダリングされるため、
  // サーバーサイドで取得したデータを表示するには工夫が必要です。
  // ここでは、サーバーコンポーネントとしてログを取得し、表示します。
  // await getTodaysLogs() を直接呼び出す形に変更します。
  return <HomePage />;
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

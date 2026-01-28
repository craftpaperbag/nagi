import { cookies } from 'next/headers';
import { redisClient } from '@/lib/redis';
import LoginForm from '@/components/LoginForm';

// 仮のLogEntryインターフェース
interface LogEntry {
  ts: number; // ミリ秒
  app: string;
}

// 全ログを取得する関数に変更
async function getAllLogs(userId: string): Promise<LogEntry[]> {
  const logs = await redisClient.lrange<LogEntry>(`logs:${userId}`, 0, -1);
  // 新しい順に表示するため、取得後にreverseする
  return [...logs].reverse();
}

export default async function Home() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('session_id')?.value;

  let user = null;
  let logs: LogEntry[] = [];

  if (sessionId) {
    const userId = await redisClient.get<string>(`session:${sessionId}`);
    if (userId) {
      user = await redisClient.get(`user:${userId}`);
      if (user) {
        logs = await getAllLogs(userId); // 全ログ取得
      }
    }
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        {!user ? (
          <LoginForm />
        ) : (
          <div className="flex flex-col gap-8">
            <header className="flex flex-col gap-4 border-b pb-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">{user.email} としてログイン中</p>
                <form action="/api/auth/logout" method="POST">
                  <button type="submit" className="text-sm text-red-500 hover:underline">
                    ログアウト
                  </button>
                </form>
              </div>
              {/* APIトークンの表示 */}
              <div className="bg-gray-100 p-3 rounded text-xs break-all">
                <p className="font-bold mb-1 text-gray-600">Your API Token (Bearer):</p>
                <code className="text-blue-600">{user.api_token}</code>
              </div>
            </header>
            
            <section>
              <h2 className="text-xl font-bold mb-4">すべてのログ (開発用表示)</h2>
              {logs.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {logs.map((log, i) => (
                    <li key={i} className="p-3 bg-gray-50 rounded">
                      <span className="font-mono text-sm mr-4 text-gray-400">
                        {new Date(log.ts).toLocaleString()} {/* ミリ秒なのでそのまま渡す */}
                      </span>
                      <span className="font-medium">{log.app}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">ログはありません</p>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

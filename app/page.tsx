import { cookies } from 'next/headers';
import { redisClient } from '@/lib/redis';
import LoginForm from '@/components/LoginForm';

// 仮のLogEntryインターフェースとgetTodaysLogs関数
interface LogEntry {
  ts: number;
  app: string;
}

async function getTodaysLogs(userId: string): Promise<LogEntry[]> {
  const today = new Date().toISOString().split('T')[0];
  const logs = await redisClient.lRange(`logs:${userId}:${today}`, 0, -1);
  return logs.map(log => JSON.parse(log));
}

export default async function Home() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('session_id')?.value;

  let user = null;
  let logs: LogEntry[] = [];

  if (sessionId) {
    const userId = await redisClient.get(`session:${sessionId}`);
    if (userId) {
      const userData = await redisClient.get(`user:${userId}`);
      if (userData) {
        user = JSON.parse(userData);
        logs = await getTodaysLogs(userId);
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
            <header className="flex justify-between items-center border-b pb-4">
              <p className="text-sm text-gray-500">{user.email} としてログイン中</p>
              <form action="/api/auth/logout" method="POST">
                <button type="submit" className="text-sm text-red-500 hover:underline">
                  ログアウト
                </button>
              </form>
            </header>
            
            <section>
              <h2 className="text-xl font-bold mb-4">本日のログ</h2>
              {logs.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {logs.map((log, i) => (
                    <li key={i} className="p-3 bg-gray-50 rounded">
                      <span className="font-mono text-sm mr-4">
                        {new Date(log.ts * 1000).toLocaleTimeString()} {/* Unix timestampはミリ秒ではないため1000倍 */}
                      </span>
                      {log.app}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">本日のログはありません</p>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

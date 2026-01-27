import redisClient from '@/lib/redis';
import LoginForm from '@/components/LoginForm'; // 追加

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
    <main className="flex min-h-screen flex-col items-center justify-start pt-32 px-6 bg-[#fafafa] text-gray-800">
      <div className="w-full max-w-md space-y-24">
        {/* ヘッダー: 凪のような静けさを表現 */}
        <header className="text-center space-y-4">
          <h1 className="text-6xl font-extralight tracking-[0.3em] text-gray-300 ml-[0.3em]">nagi</h1>
          <p className="text-sm font-light text-gray-400 tracking-widest">静かなデジタル・ウェルビーイング</p>
        </header>

        {/* ログインセクション */}
        <section className="bg-white/40 backdrop-blur-sm rounded-3xl p-4 shadow-sm border border-gray-100/50">
          <LoginForm />
        </section>

        {/* ログ表示セクション */}
        <section className="space-y-8 pb-24">
          <h2 className="text-xs font-light text-center text-gray-400 tracking-[0.2em] uppercase">Today's Trace</h2>
          {logs.length > 0 ? (
            <ul className="space-y-4">
              {logs.map((log, index) => (
                <li key={index} className="flex justify-between items-center py-3 border-b border-gray-50 text-sm font-light">
                  <span className="text-gray-400">{new Date(log.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="text-gray-600 tracking-wide">{log.app}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-sm text-gray-300 font-light italic">まだ今日の記録はありません。</p>
          )}
        </section>
      </div>
    </main>
  );
}

// Homeコンポーネントをデフォルトエクスポート
export default HomePage;

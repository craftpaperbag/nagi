import { cookies } from 'next/headers';
import { redisClient } from '@/lib/redis';
import LoginForm from '@/components/LoginForm';
import QRCode from 'qrcode';

// 仮のLogEntryインターフェース
interface LogEntry {
  ts: number; // ミリ秒
  app: string;
}

// Userインターフェースの定義
interface User {
  id: string;
  email: string;
  api_token: string;
  created_at: string;
}

// 全ログを取得する関数
async function getAllLogs(userId: string): Promise<LogEntry[]> {
  const logs = await redisClient.lrange<LogEntry>(`logs:${userId}`, 0, -1);
  // 新しい順に表示するため、取得後にreverseする
  return [...logs].reverse();
}

export default async function Home() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('session_id')?.value;

  let user: User | null = null;
  let logs: LogEntry[] = [];

  if (sessionId) {
    const userId = await redisClient.get<string>(`session:${sessionId}`);
    if (userId) {
      user = await redisClient.get<User>(`user:${userId}`);
      if (user) {
        logs = await getAllLogs(userId); // 全ログ取得
      }
    }
  }

  // QRコードの生成 (サーバーサイド)
  const shortcutBaseUrl = process.env.SHORTCUT_URL || '';
  const combinedShortcutUrl = (shortcutBaseUrl && user) 
    ? `${shortcutBaseUrl}${shortcutBaseUrl.includes('?') ? '&' : '?'}input=${user.api_token}`
    : shortcutBaseUrl;

  const shortcutQr = combinedShortcutUrl ? await QRCode.toDataURL(combinedShortcutUrl) : '';

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        {!user ? (
          <LoginForm />
        ) : (
          <div className="flex flex-col gap-8">
            <header className="flex flex-col gap-4 border-b pb-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500 font-light">やあ、{user.email}</p>
                <form action="/api/auth/logout" method="POST">
                  <button type="submit" className="text-sm text-red-400 hover:underline">
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

            {/* iOSショートカット設定セクション */}
            <section className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-800 border-b border-slate-200 pb-2">
                <span>📱</span> iOSショートカットの設定
              </h2>
              
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-slate-700 mb-2">ショートカットをインストール</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    iPhoneで下のボタンを押すか、QRコードをスキャンしてください。<br />
                    <strong>APIキーが自動的に設定された状態で</strong>ショートカットを追加できます。
                  </p>
                  <a 
                    href={combinedShortcutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-6 py-2 bg-slate-900 text-white text-sm font-medium rounded-full hover:bg-slate-800 transition-all w-fit mb-4"
                  >
                    ショートカットを入手
                  </a>
                </div>
                
                <div className="flex flex-col items-center gap-2 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                  {shortcutQr && (
                    <img src={shortcutQr} alt="Shortcut Setup QR" className="w-40 h-40" />
                  )}
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Scan to Setup</span>
                </div>
              </div>
            </section>
            
            <section>
              <h2 className="text-xl font-bold mb-4">すべてのログ (開発用表示)</h2>
              {logs.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {logs.map((log, i) => (
                    <li key={i} className="p-3 bg-gray-50 rounded">
                      <span className="font-mono text-sm mr-4 text-gray-400">
                        {new Date(log.ts).toLocaleString()}
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

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
  const shortcutUrl = process.env.SHORTCUT_URL || '';
  const shortcutQr = shortcutUrl ? await QRCode.toDataURL(shortcutUrl) : '';
  const apiTokenQr = user ? await QRCode.toDataURL(user.api_token) : '';

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

            {/* iOSショートカット設定セクション */}
            <section className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-800 border-b border-slate-200 pb-2">
                <span>📱</span> iOSショートカットの設定
              </h2>
              
              <div className="grid md:grid-cols-2 gap-12">
                {/* Step 1: ショートカット入手 */}
                <div className="flex flex-col">
                  <div className="mb-4">
                    <h3 className="text-sm font-bold text-slate-700 mb-2">1. ショートカットを入手</h3>
                    <p className="text-xs text-slate-500 leading-relaxed mb-4">
                      iPhoneで下のボタンを押すか、PCの場合はQRコードをスキャンして追加してください。
                    </p>
                    <a 
                      href={shortcutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center px-5 py-2 bg-slate-900 text-white text-xs font-medium rounded-full hover:bg-slate-800 transition-all w-fit mb-4"
                    >
                      入手する
                    </a>
                  </div>
                  
                  <div className="flex flex-col items-center w-fit gap-2">
                    <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200">
                      {shortcutQr && (
                        <img src={shortcutQr} alt="Shortcut URL QR" className="w-32 h-32" />
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ショートカットURL</span>
                  </div>
                </div>

                {/* Step 2: APIキー連携 */}
                <div className="flex flex-col">
                  <div className="mb-4">
                    <h3 className="text-sm font-bold text-slate-700 mb-2">2. APIキーを連携</h3>
                    <p className="text-xs text-slate-500 leading-relaxed mb-4">
                      ショートカットの初回設定（インポート質問）で、下のQRコードをスキャンして入力を完了させてください。
                    </p>
                    {/* ボタンがないため、高さを合わせるためのスペーサー */}
                    <div className="h-[32px] mb-4 hidden md:block"></div>
                  </div>

                  <div className="flex flex-col items-center w-fit gap-2">
                    <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200">
                      {apiTokenQr && (
                        <img src={apiTokenQr} alt="API Token QR" className="w-32 h-32" />
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">APIキー</span>
                  </div>
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

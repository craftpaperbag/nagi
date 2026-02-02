import { cookies } from 'next/headers';
import { redisClient } from '@/lib/redis';
import LoginForm from '@/components/LoginForm';
import QRCode from 'qrcode';
import DatePicker from '@/components/DatePicker';
import { revalidatePath } from 'next/cache';
import VisualTimeline from '@/components/VisualTimeline';
import Link from 'next/link';
import ScrollRestorer from '@/components/ScrollRestorer';

// 仮のLogEntryインターフェース
interface LogEntry {
  ts: number; // ミリ秒
  app: string;
  is_dummy?: boolean; // 追加
}

// Userインターフェースの定義
interface User {
  id: string;
  email: string;
  api_token: string;
  created_at: string;
}

// 特定の日付のログを取得する関数
async function getLogsByDate(userId: string, dateStr: string): Promise<LogEntry[]> {
  const logs = await redisClient.lrange<LogEntry>(`logs:${userId}:${dateStr}`, 0, -1);
  
  // 開発環境以外ではダミーデータを除外
  const filteredLogs = process.env.NODE_ENV === 'development' 
    ? logs 
    : logs.filter(log => !log.is_dummy);

  // 新しい順に表示するため、取得後にreverseする
  return [...filteredLogs].reverse();
}

// ダミーデータ登録用サーバーアクション
async function addDummyLog(formData: FormData) {
  'use server';
  // 開発環境以外では実行させない
  if (process.env.NODE_ENV !== 'development') return;

  // セッションからユーザーIDを取得
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('session_id')?.value;
  const userId = sessionId ? await redisClient.get<string>(`session:${sessionId}`) : null;

  const app = (formData.get('app') as string) || ''; // 空の場合は空文字にする
  const datetime = formData.get('datetime') as string;

  // userId が取得できない、または datetime がない場合は中断
  if (!userId || !datetime) return;

  const date = new Date(datetime);
  const ts = date.getTime();
  const dateStr = date.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });

  const logKey = `logs:${userId}:${dateStr}`;
  await redisClient.rpush(logKey, { ts, app, is_dummy: true });
  
  revalidatePath('/');
}

// ログを削除するためのサーバーアクション
async function deleteLog(formData: FormData) {
  'use server';
  if (process.env.NODE_ENV !== 'development') return;

  // セッションからユーザーIDを取得
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('session_id')?.value;
  const userId = sessionId ? await redisClient.get<string>(`session:${sessionId}`) : null;

  const dateStr = formData.get('dateStr') as string;
  const logJson = formData.get('logJson') as string;

  // userId が取得できない、または必要なデータがない場合は中断
  if (!userId || !dateStr || !logJson) return;

  const logKey = `logs:${userId}:${dateStr}`;
  // Redisから一致するログを1つ削除
  await redisClient.lrem(logKey, 1, JSON.parse(logJson));
  
  revalidatePath('/');
}

export default async function Home(props: { searchParams: Promise<{ date?: string; target?: string }> }) {
  const { date, target: targetApp = '' } = await props.searchParams;
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('session_id')?.value;

  // 日本時間の今日の日付 (YYYY-MM-DD)
  const now = new Date();
  const today = now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
  const selectedDate = date || today;

  // デバッグフォーム用の初期日時 (YYYY-MM-DDTHH:mm)
  const currentDateTimeJst = now.toLocaleString('sv-SE', { timeZone: 'Asia/Tokyo' }).replace(' ', 'T').slice(0, 16);

  let user: User | null = null;
  let logs: LogEntry[] = [];

  if (sessionId) {
    const userId = await redisClient.get<string>(`session:${sessionId}`);
    if (userId) {
      user = await redisClient.get<User>(`user:${userId}`);
      if (user) {
        logs = await getLogsByDate(userId, selectedDate);
      }
    }
  }

  // ログからユニークなアプリ名（空文字以外）を抽出
  const uniqueApps = Array.from(new Set(logs.map(l => l.app).filter(Boolean))).sort();

  // QRコードの生成 (サーバーサイド)
  const shortcutUrl = process.env.SHORTCUT_URL || '';
  const shortcutQr = shortcutUrl ? await QRCode.toDataURL(shortcutUrl) : '';

  const runShortcutBaseUrl = process.env.RUN_SHORTCUT_URL || '';
  const runShortcutUrl = (runShortcutBaseUrl && user)
    ? `${runShortcutBaseUrl}${runShortcutBaseUrl.includes('?') ? '&' : '?'}input=${user.api_token}`
    : runShortcutBaseUrl;
  const runShortcutQr = runShortcutUrl ? await QRCode.toDataURL(runShortcutUrl) : '';

  return (
    <main className="min-h-screen p-8">
      <ScrollRestorer />
      <div className="max-w-2xl mx-auto">
        {!user ? (
          <LoginForm />
        ) : (
          <div className="flex flex-col gap-8">
            <header className="flex flex-col gap-4 border-b pb-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500 font-light">yo {user.email.split('@')[0]}</p>
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
              <h2 className="text-lg font-bold mb-8 flex items-center gap-2 text-slate-800 border-b border-slate-200 pb-2">
                <span>📱</span> iOSショートカットの設定
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Step 1: Install */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold">1</span>
                    <h3 className="text-sm font-bold text-slate-700">ショートカットをインストール</h3>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed min-h-[32px]">
                    iPhoneで下のボタンを押すか、QRコードをスキャンしてショートカットを追加してください。
                  </p>
                  <div className="flex flex-col items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                    {shortcutQr && (
                      <img src={shortcutQr} alt="Install Shortcut QR" className="w-32 h-32" />
                    )}
                    <a 
                      href={shortcutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center px-6 py-2 bg-slate-900 text-white text-xs font-medium rounded-full hover:bg-slate-800 transition-all w-full"
                    >
                      インストール
                    </a>
                  </div>
                </div>

                {/* Step 2: Setup */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold">2</span>
                    <h3 className="text-sm font-bold text-slate-700">APIキーを自動設定</h3>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed min-h-[32px]">
                    インストール後、このQRコードをスキャンしてショートカットを実行すると、<strong>APIキーが自動設定</strong>されます。
                  </p>
                  <div className="flex flex-col items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                    {runShortcutQr && (
                      <img src={runShortcutQr} alt="Setup Shortcut QR" className="w-32 h-32" />
                    )}
                    <a 
                      href={runShortcutUrl}
                      className="inline-flex items-center justify-center px-6 py-2 bg-blue-600 text-white text-xs font-medium rounded-full hover:bg-blue-500 transition-all w-full"
                    >
                      設定を実行
                    </a>
                  </div>
                </div>
              </div>
            </section>
            
            <section className="min-h-[600px]">
              {/* 新しい視覚的タイムライン */}
              <div className="mb-12">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <h2 className="text-xl font-bold">タイムライン</h2>
                  <div className="flex gap-2 overflow-x-auto pb-2 max-w-full">
                    {uniqueApps.map(app => (
                      <Link
                        key={app}
                        href={`?date=${selectedDate}&target=${encodeURIComponent(app)}`}
                        scroll={false}
                        className={`px-3 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-all ${
                          targetApp === app 
                            ? 'bg-slate-800 text-white shadow-sm' 
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {app}
                      </Link>
                    ))}
                  </div>
                </div>
                <VisualTimeline logs={logs} selectedDate={selectedDate} targetApp={targetApp} />
                {!targetApp && uniqueApps.length > 0 && (
                  <p className="text-[10px] text-slate-400 mt-2 text-right italic">アプリを選択すると「石」が表示されます</p>
                )}
              </div>

              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <h2 className="text-xl font-bold">ログ表示</h2>
                <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                  <DatePicker defaultValue={selectedDate} />
                </div>
              </div>

              {logs.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {logs.map((log, i) => (
                    <li key={i} className="p-3 bg-gray-50 rounded border border-gray-100">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-mono text-sm mr-4 text-gray-400">
                            {new Date(log.ts).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Tokyo' })}
                          </span>
                          <span className="font-medium">
                            {log.app || <span className="text-slate-400 italic">Home Screen</span>}
                          </span>
                          {log.is_dummy && (
                            <span className="ml-2 text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded font-bold uppercase">Dummy</span>
                          )}
                        </div>
                        {process.env.NODE_ENV === 'development' && user && (
                          <form action={deleteLog}>
                            <input type="hidden" name="dateStr" value={selectedDate} />
                            <input type="hidden" name="logJson" value={JSON.stringify(log)} />
                            <button type="submit" className="text-[10px] text-red-400 hover:text-red-600 font-bold border border-red-100 px-2 py-0.5 rounded bg-white transition-colors">
                              Delete
                            </button>
                          </form>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="py-24 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                  <p className="text-slate-400 text-sm">{selectedDate} のログはありません</p>
                </div>
              )}
            </section>
          </div>
        )}

        {/* 開発環境用デバッグフォーム */}
        {process.env.NODE_ENV === 'development' && user && (
          <section className="mt-20 p-6 border-2 border-dashed border-amber-200 rounded-2xl bg-amber-50">
            <h3 className="text-amber-800 font-bold mb-4 flex items-center gap-2">
              <span>🛠️</span> Debug: Add Dummy Log
            </h3>
            <form action={addDummyLog} className="flex flex-wrap gap-4 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-amber-600 uppercase">Time</label>
                <input 
                  type="datetime-local" 
                  name="datetime" 
                  defaultValue={currentDateTimeJst}
                  required 
                  className="border border-amber-200 rounded px-2 py-1 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-amber-600 uppercase">App Name</label>
                <input 
                  type="text" 
                  name="app" 
                  placeholder="Instagram (empty for Home)" 
                  className="border border-amber-200 rounded px-2 py-1 text-sm"
                />
              </div>
              <button 
                type="submit" 
                className="bg-amber-500 text-white px-4 py-1.5 rounded text-sm font-bold hover:bg-amber-600 transition-colors"
              >
                Add Log
              </button>
            </form>
            <p className="mt-2 text-[10px] text-amber-500">
              ※ このフォームは開発環境でのみ表示されます。登録されたデータには is_dummy: true が付与されます。
            </p>
          </section>
        )}
      </div>
    </main>
  );
}

import { cookies } from 'next/headers';
import { redisClient } from '@/lib/redis';
import LoginForm from '@/components/LoginForm';
import QRCode from 'qrcode';
import DatePicker from '@/components/DatePicker';
import { revalidatePath } from 'next/cache';
import DashboardView from '@/components/DashboardView';
import Link from 'next/link';
import ScrollRestorer from '@/components/ScrollRestorer';
import CopyButton from '@/components/CopyButton';
import { TransitionProvider } from '@/components/TransitionContext';
import AppSelector from '@/components/AppSelector';
import DisplaySettings from '@/components/DisplaySettings';
import SetupCompleteButton from '@/components/SetupCompleteButton';
import ShowGuideButton from '@/components/ShowGuideButton';

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
  setup_completed?: boolean;
  target_apps?: string[]; // 追加
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

// 前日の最終ログを取得する関数
async function getLastLogOfPrevDate(userId: string, dateStr: string): Promise<LogEntry | null> {
  const date = new Date(dateStr);
  date.setDate(date.getDate() - 1);
  const prevDateStr = date.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
  
  const logs = await redisClient.lrange<LogEntry>(`logs:${userId}:${prevDateStr}`, 0, -1);
  const filteredLogs = process.env.NODE_ENV === 'development' 
    ? logs 
    : logs.filter(log => !log.is_dummy);

  return filteredLogs.length > 0 ? filteredLogs[filteredLogs.length - 1] : null;
}

// ターゲットアプリを切り替えるサーバーアクション
async function toggleTargetApp(formData: FormData) {
  'use server';
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('session_id')?.value;
  const userId = sessionId ? await redisClient.get<string>(`session:${sessionId}`) : null;
  const app = formData.get('app') as string;

  if (!userId || !app) return;

  const user = await redisClient.get<User>(`user:${userId}`);
  if (user) {
    const targetApps = user.target_apps || [];
    if (targetApps.includes(app)) {
      user.target_apps = targetApps.filter(a => a !== app);
    } else {
      user.target_apps = [...targetApps, app];
    }
    await redisClient.set(`user:${userId}`, user);
  }
  
  revalidatePath('/');
}

async function resetTargetApps() {
  'use server';
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('session_id')?.value;
  const userId = sessionId ? await redisClient.get<string>(`session:${sessionId}`) : null;

  if (!userId) return;

  const user = await redisClient.get<User>(`user:${userId}`);
  if (user) {
    user.target_apps = [];
    await redisClient.set(`user:${userId}`, user);
  }

  revalidatePath('/');
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

// セットアップ状態を更新するためのサーバーアクション
async function updateSetupStatus(formData: FormData) {
  'use server';
  const userId = formData.get('userId') as string;
  const status = formData.get('status') === 'true';
  if (!userId) return;

  const user = await redisClient.get<User>(`user:${userId}`);
  if (user) {
    user.setup_completed = status;
    await redisClient.set(`user:${userId}`, user);
  }
  
  revalidatePath('/');
}

export default async function Home(props: { searchParams: Promise<{ date?: string; settings?: string; large?: string }> }) {
  const { date, settings: settingsParam, large: largeParam } = await props.searchParams;
  const showSettings = settingsParam === 'true';
  const isLarge = largeParam === 'true';
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
  let prevDayLastLog: LogEntry | null = null;
  let userId: string | null = null;

  if (sessionId) {
    userId = await redisClient.get<string>(`session:${sessionId}`);
    if (userId) {
      user = await redisClient.get<User>(`user:${userId}`);
      if (user) {
        logs = await getLogsByDate(userId, selectedDate);
        prevDayLastLog = await getLastLogOfPrevDate(userId, selectedDate);
      }
    }
  }

  // ログからアプリ名（空文字以外）の出現回数をカウントし、多い順にソート
  const appCounts = logs.reduce((acc, log) => {
    if (log.app) {
      acc[log.app] = (acc[log.app] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const uniqueApps = Object.keys(appCounts).sort((a, b) => appCounts[b] - appCounts[a]);

  // デフォルト選択: target_appsが空で、ログがある場合、最もログ数の多いアプリを自動選択
  if (user && userId && (!user.target_apps || user.target_apps.length === 0) && uniqueApps.length > 0) {
    user.target_apps = [uniqueApps[0]];
    await redisClient.set(`user:${userId}`, user);
  }

  // ターゲットに設定されているが今日のログにはないアプリも表示に含める
  const displayApps = user ? Array.from(new Set([...uniqueApps, ...(user.target_apps || [])])) : uniqueApps;

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
      <TransitionProvider>
        <ScrollRestorer />
        <div className="max-w-2xl mx-auto">
          {!user ? (
            <LoginForm />
          ) : (
            <div className="flex flex-col gap-8">
              <header className="flex flex-col gap-4 border-b border-slate-100/50 pb-4">
                <div className="flex justify-between items-center">
                  {showSettings ? (
                    <>
                      <h1 className="text-lg font-bold text-slate-700">設定</h1>
                      <Link
                        href="/"
                        className="px-4 py-1.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                      >
                        ← ダッシュボードに戻る
                      </Link>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-gray-500 font-light">こんにちは、{user.email} さん</p>
                      <Link href="?settings=true" className="text-sm text-slate-500 hover:underline">
                        設定
                      </Link>
                    </>
                  )}
                </div>
              </header>

              {/* 設定画面の表示 */}
              {showSettings && (
                <section className="flex flex-col gap-10 py-4">
                  <div className="flex flex-col gap-3 pb-6 border-b border-slate-100">
                    <h2 className="text-base font-bold text-slate-700">nagiについて</h2>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      スマホに触れていた時間を石、離れていた時間を波として映すだけの記録帳です。
                    </p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      通知も点数もありません。眺めたいときに、眺めてください。
                    </p>
                    <p className="text-xs text-slate-500 leading-relaxed mt-2">
                      <a href="https://github.com/craftpaperbag" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-slate-800 underline">
                        craftpaperbag
                      </a>
                      が家族のために作っています。
                      <a href="https://github.com/craftpaperbag/nagi" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-slate-800 underline">
                        ソースコード
                      </a>
                    </p>
                  </div>

                  <div className="flex flex-col gap-4 pb-6 border-b border-slate-100">
                    <DisplaySettings />
                  </div>

                  <div className="flex flex-col gap-4">
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">API Token</h2>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center gap-4">
                      <code className="text-xs text-blue-600 break-all font-mono">{user.api_token}</code>
                      <CopyButton text={user.api_token} />
                    </div>
                    <p className="text-[10px] text-slate-400 italic">これはあなた専用のトークンです。iOSショートカットとの連携に使います。</p>
                  </div>

                  {user.setup_completed && (
                    <div className="flex flex-col gap-4 border-t border-slate-100 pt-10">
                      <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Guide</h2>
                      <p className="text-xs text-slate-500">はじめの手順をもう一度見たいときに。</p>
                      <ShowGuideButton userId={user.id} updateSetupStatus={updateSetupStatus} />
                    </div>
                  )}

                  <div className="flex flex-col gap-4 border-t border-slate-100 pt-10">
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">アカウント</h2>
                    <p className="text-xs text-slate-500">{user.email} でログイン中</p>
                    <form action="/api/auth/logout" method="POST">
                      <button type="submit" className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-full transition-colors font-medium border border-red-100">
                        ログアウト
                      </button>
                    </form>
                  </div>
                </section>
              )}

              {/* 設定ガイド表示 (セットアップ未完了時) */}
              {!showSettings && !user.setup_completed && (
                <section className="flex flex-col gap-8 py-4">
                  <div className="flex flex-col gap-3">
                    <h2 className="text-base font-bold text-slate-700">はじめに</h2>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      nagiはスマホの使用時間を静かに記録するアプリです。
                    </p>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      記録をはじめるには、お使いのiPhoneに「ショートカット」を追加する必要があります。
                      ショートカットが、アプリを開いたり閉じたりしたタイミングを自動で記録してくれます。
                    </p>
                  </div>

                  {/* Step 1: Install */}
                  <div className="flex flex-col gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-bold shrink-0">1</span>
                      <h3 className="text-sm font-bold text-slate-700">ショートカットをインストール</h3>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      iPhoneの「ショートカット」アプリに、nagiの記録用ショートカットを追加します。
                      下のボタンを押すか、QRコードをiPhoneで読み取ってください。
                    </p>
                    <div className="flex flex-col items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                      {shortcutQr && (
                        <img src={shortcutQr} alt="Install Shortcut QR" className="w-36 h-36" />
                      )}
                      <a
                        href={shortcutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center px-6 py-2.5 bg-slate-900 text-white text-xs font-medium rounded-full hover:bg-slate-800 transition-all w-full max-w-xs"
                      >
                        ショートカットを追加する
                      </a>
                    </div>
                  </div>

                  {/* Step 2: Setup */}
                  <div className="flex flex-col gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-bold shrink-0">2</span>
                      <h3 className="text-sm font-bold text-slate-700">あなたのアカウントと連携する</h3>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      追加したショートカットに、あなたのアカウント情報を設定します。
                      下のボタンを押すか、QRコードを読み取ると自動で設定が完了します。
                    </p>
                    <div className="flex flex-col items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                      {runShortcutQr && (
                        <img src={runShortcutQr} alt="Setup Shortcut QR" className="w-36 h-36" />
                      )}
                      <a
                        href={runShortcutUrl}
                        className="inline-flex items-center justify-center px-6 py-2.5 bg-blue-600 text-white text-xs font-medium rounded-full hover:bg-blue-500 transition-all w-full max-w-xs"
                      >
                        アカウント連携を実行する
                      </a>
                    </div>
                  </div>

                  {/* 補足説明 + 完了ボタン */}
                  <div className="flex flex-col gap-6 items-center pt-4">
                    <p className="text-xs text-slate-400 leading-relaxed text-center max-w-sm">
                      両方の手順が終わったら、下のボタンを押してください。
                      ダッシュボードが表示され、記録を見られるようになります。
                    </p>
                    <SetupCompleteButton userId={user.id} updateSetupStatus={updateSetupStatus} />
                  </div>
                </section>
              )}

              {/* ダッシュボード表示 (セットアップ完了後) */}
              {!showSettings && user.setup_completed && (
                <>
                  {/* 統合ヘッダー: 日付選択 + アプリ選択 */}
                  <div className="sticky top-0 z-50 w-[100vw] ml-[calc(-50vw+50%)] px-8 pt-3 pb-3 mb-4 bg-white/70 backdrop-blur-md border-b border-slate-100/50">
                    <div className="flex justify-center mb-3">
                      <div className="flex items-center gap-3 bg-white px-5 py-2.5 rounded-full border border-slate-200 shadow-md">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">表示日</span>
                        <DatePicker defaultValue={selectedDate} />
                      </div>
                    </div>
                    <div className="max-w-2xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <Link
                        href={`?date=${selectedDate}${isLarge ? '' : '&large=true'}${showSettings ? '&settings=true' : ''}`}
                        scroll={false}
                        className="p-1.5 rounded border border-slate-200 text-slate-400 hover:bg-slate-50 transition-colors"
                        aria-label={isLarge ? '標準サイズ' : '大きく表示'}
                      >
                        {isLarge ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                          </svg>
                        )}
                      </Link>
                      <AppSelector
                        displayApps={displayApps}
                        targetApps={user.target_apps || []}
                        toggleAction={toggleTargetApp}
                        resetAction={resetTargetApps}
                        topApp={uniqueApps[0]}
                      />
                    </div>
                  </div>

                  <section className="min-h-[600px]">
                    {/* 新しい視覚的タイムライン */}
                    <div className="mb-12">
                      <DashboardView
                        logs={logs}
                        selectedDate={selectedDate}
                        targetApps={user.target_apps || []}
                        isLarge={isLarge}
                        prevDayLastLog={prevDayLastLog}
                      />
                      {(!user.target_apps || user.target_apps.length === 0) && displayApps.length > 0 && (
                        <p className="text-[10px] text-slate-400 mt-2 text-right italic">アプリを選択すると「石」が表示されます</p>
                      )}
                    </div>

                    <div className="mb-6">
                      <h2 className="text-xl font-bold">ログ表示</h2>
                    </div>

                    {logs.length > 0 || prevDayLastLog ? (
                      <ul className="flex flex-col gap-2">
                        {prevDayLastLog && (
                          <li className="p-3 bg-slate-50/50 rounded border border-slate-100 opacity-60">
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="font-mono text-sm mr-4 text-gray-300">
                                  前日最終
                                </span>
                                <span className="font-medium text-slate-400">
                                  {prevDayLastLog.app || <span className="italic">Home Screen</span>}
                                </span>
                              </div>
                            </div>
                          </li>
                        )}
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
                </>
              )}
            </div>
          )}
        </div>
      </TransitionProvider>
    </main>
  );
}

'use client';

interface LogEntry {
  ts: number;
  app: string;
}

export default function VisualTimeline({ logs, selectedDate, targetApp, isLarge }: { logs: LogEntry[], selectedDate: string, targetApp: string, isLarge?: boolean }) {
  const totalMinutes = 24 * 60;
  // 日本時間の開始時刻をミリ秒で取得
  const startOfDay = new Date(`${selectedDate}T00:00:00+09:00`).getTime();
  
  // 現在時刻 (JST) の計算
  const now = new Date();
  const todayStr = now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
  const isToday = selectedDate === todayStr;
  const isFuture = selectedDate > todayStr;
  
  const jstTimeStr = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Tokyo' });
  const [hours, minutes] = jstTimeStr.split(':').map(Number);
  const currentMin = hours * 60 + minutes;

  // 描画する終端時刻（分）
  const limitMin = isToday ? currentMin : (isFuture ? 0 : totalMinutes);

  // ログを時間順（昇順）にソート
  const sortedLogs = [...logs].sort((a, b) => a.ts - b.ts);

  const segments: { start: number; end: number; type: 'stone' | 'wave'; app?: string }[] = [];

  // アプリが選択されている場合のみセグメントを計算
  if (targetApp) {
    let lastTs = startOfDay;
    let isStoneActive = false;

    sortedLogs.forEach((log) => {
      const startMin = Math.max(0, (lastTs - startOfDay) / (1000 * 60));
      const endMin = (log.ts - startOfDay) / (1000 * 60);
      
      // 制限時刻で切り捨て
      const effectiveEndMin = Math.min(endMin, limitMin);

      if (effectiveEndMin > startMin) {
        segments.push({
          start: startMin,
          end: effectiveEndMin,
          type: isStoneActive ? 'stone' : 'wave',
          app: isStoneActive ? targetApp : undefined
        });
      }
      
      // 次の区間の状態を決定: 選択されたアプリならStone開始、それ以外ならWave開始
      isStoneActive = (log.app === targetApp && targetApp !== "");
      lastTs = log.ts;
    });

    // 最後のログから制限時刻まで
    const startMin = Math.max(0, (lastTs - startOfDay) / (1000 * 60));
    if (startMin < limitMin) {
      segments.push({
        start: startMin,
        end: limitMin,
        type: isStoneActive ? 'stone' : 'wave',
        app: isStoneActive ? targetApp : undefined
      });
    }
  }

  return (
    <>
      <div className={`relative transition-all duration-500 ease-in-out ${
        isLarge 
          ? 'w-screen relative left-1/2 -translate-x-1/2 h-80 rounded-none border-y border-slate-300/50 shadow-inner' 
          : 'w-full h-20 rounded-xl border border-slate-300/50 shadow-inner'
      } bg-slate-100 overflow-hidden`}>
        
        {/* 1. 背景の波レイヤー (24時間分) */}
        <div className="absolute inset-0 bg-white pointer-events-none">
          <svg className={`absolute bottom-0 w-full ${isLarge ? 'h-64' : 'h-12'} opacity-60 animate-nagi-wave`} viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0 50 Q 25 40 50 50 T 100 50 V 100 H 0 Z" fill="#7dd3fc">
              <animate attributeName="d" dur="8s" repeatCount="indefinite"
                values="M0 50 Q 25 40 50 50 T 100 50 V 100 H 0 Z;
                        M0 50 Q 25 60 50 50 T 100 50 V 100 H 0 Z;
                        M0 50 Q 25 40 50 50 T 100 50 V 100 H 0 Z" />
            </path>
          </svg>
        </div>

        {/* 2. 未来マスクレイヤー (現在時刻以降を隠す) */}
        <div 
          className="absolute inset-y-0 right-0 bg-slate-100 z-10"
          style={{ width: `${((totalMinutes - limitMin) / totalMinutes) * 100}%` }}
        />

        {/* 3. セグメントレイヤー (石が波を上書きする) */}
        <div className="flex h-full w-full relative z-20">
          {segments.map((seg, i) => {
            const width = `${((seg.end - seg.start) / totalMinutes) * 100}%`;
            if (width === '0%') return null;

            return (
              <div key={i} style={{ width }} className="h-full relative">
                {seg.type === 'stone' ? (
                  <div 
                    className={`w-full h-full bg-slate-400 border-x border-slate-500/20 transition-colors hover:bg-slate-500 ${isLarge ? 'shadow-[inset_0_4px_12px_rgba(0,0,0,0.2)]' : 'shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]'}`} 
                    title={seg.app}
                  >
                    {/* 石板のテクスチャ */}
                    <div className={`absolute inset-0 bg-black/10 ${isLarge ? 'opacity-20' : 'opacity-10'}`} />
                  </div>
                ) : (
                  /* 波のセグメントは透明にして背景を見せる */
                  <div className="w-full h-full" />
                )}
              </div>
            );
          })}
        </div>

        {/* 4. 現在時刻の強調表示 */}
        {isToday && (
          <div 
            className={`absolute top-0 bottom-0 w-px bg-slate-400 z-30 pointer-events-none ${isLarge ? 'opacity-50' : ''}`}
            style={{ left: `${(limitMin / totalMinutes) * 100}%` }}
          >
            <div className={`absolute -top-1 -left-1 rounded-full border border-white shadow-sm bg-slate-400 ${isLarge ? 'w-3 h-3' : 'w-2 h-2'}`} />
          </div>
        )}

        {/* 5. 時間軸ラベル */}
        <div className={`absolute bottom-2 left-0 w-full flex justify-between px-4 text-slate-400 font-mono pointer-events-none z-30 ${isLarge ? 'text-xs' : 'text-[9px]'}`}>
          <span>00:00</span>
          {isLarge && <span>06:00</span>}
          <span>12:00</span>
          {isLarge && <span>18:00</span>}
          <span>23:59</span>
        </div>
      </div>

      {/* 凡例の追加 */}
      {targetApp && (
        <div className={`mt-3 flex flex-wrap gap-x-6 gap-y-2 px-1 text-[11px] text-slate-500 ${isLarge ? 'max-w-2xl mx-auto' : ''}`}>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-slate-400 rounded-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]" />
            <span>{targetApp}を使っていた時間</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-sky-200 rounded-sm border border-sky-100" />
            <span>{targetApp}から自由だった時間</span>
          </div>
        </div>
      )}
    </>
  );
}

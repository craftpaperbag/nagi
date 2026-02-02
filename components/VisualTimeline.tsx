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
    <div className={`relative transition-all duration-500 ease-in-out ${
      isLarge 
        ? 'w-screen relative left-1/2 -translate-x-1/2 h-80 rounded-none border-x-0 shadow-2xl z-10' 
        : 'w-full h-20 rounded-xl border shadow-inner'
    } bg-slate-50 overflow-hidden border-slate-200 flex`}>
      {/* 現在時刻の強調表示 */}
      {isToday && (
        <div 
          className={`absolute top-0 bottom-0 w-px bg-slate-400 z-20 pointer-events-none ${isLarge ? 'opacity-50' : ''}`}
          style={{ left: `${(limitMin / totalMinutes) * 100}%` }}
        >
          <div className={`absolute -top-1 -left-1 rounded-full border border-white shadow-sm bg-slate-400 ${isLarge ? 'w-3 h-3' : 'w-2 h-2'}`} />
        </div>
      )}

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
              <div className="w-full h-full bg-gradient-to-b from-sky-50 via-white to-indigo-50 overflow-hidden">
                {/* 波のパステルエフェクト */}
                <svg className={`absolute bottom-0 w-full ${isLarge ? 'h-64' : 'h-12'} opacity-30 animate-nagi-wave`} viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path d="M0 50 Q 25 40 50 50 T 100 50 V 100 H 0 Z" fill="#bae6fd">
                    <animate attributeName="d" dur="8s" repeatCount="indefinite"
                      values="M0 50 Q 25 40 50 50 T 100 50 V 100 H 0 Z;
                              M0 50 Q 25 60 50 50 T 100 50 V 100 H 0 Z;
                              M0 50 Q 25 40 50 50 T 100 50 V 100 H 0 Z" />
                  </path>
                </svg>
              </div>
            )}
          </div>
        );
      })}
      
      {/* 時間軸ラベル */}
      <div className={`absolute bottom-2 left-0 w-full flex justify-between px-4 text-slate-400 font-mono pointer-events-none ${isLarge ? 'text-xs' : 'text-[9px]'}`}>
        <span>00:00</span>
        {isLarge && <span>06:00</span>}
        <span>12:00</span>
        {isLarge && <span>18:00</span>}
        <span>23:59</span>
      </div>
    </div>
  );
}

'use client';

interface LogEntry {
  ts: number;
  app: string;
}

export default function VisualTimeline({ logs, selectedDate }: { logs: LogEntry[], selectedDate: string }) {
  const totalMinutes = 24 * 60;
  // 日本時間の開始時刻をミリ秒で取得
  const startOfDay = new Date(`${selectedDate}T00:00:00+09:00`).getTime();
  
  // ログを時間順（昇順）にソート
  const sortedLogs = [...logs].sort((a, b) => a.ts - b.ts);

  const segments: { start: number; end: number; type: 'stone' | 'wave'; app?: string }[] = [];
  let lastTs = startOfDay;
  let lastApp = "";

  sortedLogs.forEach((log) => {
    const currentTs = log.ts;
    const durationMin = (currentTs - lastTs) / (1000 * 60);

    if (durationMin > 0) {
      if (lastApp !== "") {
        // Stone Mode (拘束): 15分以上の空きがあればWaveに切り替える
        const stoneDuration = Math.min(durationMin, 15);
        segments.push({ 
          start: (lastTs - startOfDay) / (1000 * 60), 
          end: (lastTs - startOfDay) / (1000 * 60) + stoneDuration, 
          type: 'stone', 
          app: lastApp 
        });
        
        if (durationMin > 15) {
          segments.push({ 
            start: (lastTs - startOfDay) / (1000 * 60) + 15, 
            end: (currentTs - startOfDay) / (1000 * 60), 
            type: 'wave' 
          });
        }
      } else {
        // Wave Mode (解放)
        segments.push({ 
          start: (lastTs - startOfDay) / (1000 * 60), 
          end: (currentTs - startOfDay) / (1000 * 60), 
          type: 'wave' 
        });
      }
    }
    lastTs = currentTs;
    lastApp = log.app;
  });

  // 最後のログから23:59までをWaveとして埋める
  const endOfDay = startOfDay + (totalMinutes * 60 * 1000);
  if (lastTs < endOfDay) {
    segments.push({ 
      start: (lastTs - startOfDay) / (1000 * 60), 
      end: totalMinutes, 
      type: 'wave' 
    });
  }

  return (
    <div className="relative w-full h-20 bg-slate-50 rounded-xl overflow-hidden border border-slate-200 shadow-inner flex">
      {segments.map((seg, i) => {
        const width = `${((seg.end - seg.start) / totalMinutes) * 100}%`;
        if (width === '0%') return null;

        return (
          <div key={i} style={{ width }} className="h-full relative">
            {seg.type === 'stone' ? (
              <div className="w-full h-full bg-slate-400 border-x border-slate-500/20 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] transition-colors hover:bg-slate-500" title={seg.app}>
                {/* 石板のテクスチャ（簡易表現） */}
                <div className="absolute inset-0 opacity-10 bg-black/10" />
              </div>
            ) : (
              <div className="w-full h-full bg-gradient-to-b from-sky-50 via-white to-indigo-50 overflow-hidden">
                {/* 波のパステルエフェクト */}
                <svg className="absolute bottom-0 w-full h-12 opacity-30 animate-nagi-wave" viewBox="0 0 100 100" preserveAspectRatio="none">
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
      <div className="absolute bottom-1 left-0 w-full flex justify-between px-2 text-[9px] text-slate-400 font-mono pointer-events-none">
        <span>00:00</span>
        <span>12:00</span>
        <span>23:59</span>
      </div>
    </div>
  );
}

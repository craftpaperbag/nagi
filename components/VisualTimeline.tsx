'use client';
import { useState } from 'react';

interface LogEntry {
  ts: number;
  app: string;
}

export default function VisualTimeline({ logs, selectedDate, targetApps, isLarge }: { logs: LogEntry[], selectedDate: string, targetApps: string[], isLarge?: boolean }) {
  const [isStoneHovered, setIsStoneHovered] = useState(false);
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
  if (targetApps.length > 0) {
    let lastTs = startOfDay;
    let isStoneActive = false;

    sortedLogs.forEach((log) => {
      const startMin = Math.max(0, (lastTs - startOfDay) / (1000 * 60));
      const endMin = (log.ts - startOfDay) / (1000 * 60);
      
      // 制限時刻で切り捨て
      const effectiveEndMin = Math.min(endMin, limitMin);

      if (effectiveEndMin > startMin) {
        const type = isStoneActive ? 'stone' : 'wave';
        // 直前と同じタイプなら結合
        if (segments.length > 0 && segments[segments.length - 1].type === type) {
          segments[segments.length - 1].end = effectiveEndMin;
        } else {
          segments.push({
            start: startMin,
            end: effectiveEndMin,
            type,
            app: isStoneActive ? log.app : undefined
          });
        }
      }
      
      // 次の区間の状態を決定: 選択されたアプリのいずれかならStone開始、それ以外ならWave開始
      isStoneActive = targetApps.includes(log.app);
      lastTs = log.ts;
    });

    // 最後のログから制限時刻まで
    const startMin = Math.max(0, (lastTs - startOfDay) / (1000 * 60));
    if (startMin < limitMin) {
      const type = isStoneActive ? 'stone' : 'wave';
      if (segments.length > 0 && segments[segments.length - 1].type === type) {
        segments[segments.length - 1].end = limitMin;
      } else {
        segments.push({
          start: startMin,
          end: limitMin,
          type,
          app: isStoneActive ? undefined : undefined // 最後の状態を保持
        });
      }
    }
  }

  // 合計時間の計算 (limitMin まで)
  const totalStoneMin = segments.reduce((acc, seg) => seg.type === 'stone' ? acc + (seg.end - seg.start) : acc, 0);
  const totalWaveMin = limitMin - totalStoneMin;

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return h > 0 ? `${h}時間 ${m}分` : `${m}分`;
  };

  return (
    <>
      <div className={`relative timeline-container transition-all duration-500 ease-in-out ${
        isLarge 
          ? 'w-screen relative left-1/2 -translate-x-1/2 h-80 rounded-none border-y border-slate-300/50 shadow-inner' 
          : 'w-full h-20 rounded-xl border border-slate-300/50 shadow-inner'
      } bg-slate-100`}>
        
        {/* 1. 背景の波レイヤー (24時間分) */}
        <div className={`absolute inset-0 bg-white pointer-events-none ${isLarge ? '' : 'rounded-xl'} overflow-hidden`}>
          <svg 
            className="absolute top-0 left-0 w-full h-full animate-nagi-wave"
            viewBox="0 0 100 100" 
            preserveAspectRatio="none"
            style={{ filter: 'saturate(1.8) brightness(1.1)' }}
          >
            {/* 波 1: シアン系 (中央付近を流れるリボン状) */}
            <path fill="#06b6d4" opacity="0.5">
              <animate attributeName="d" dur="12s" repeatCount="indefinite"
                values="M0 40 Q 25 30 50 40 T 100 40 V 65 Q 75 55 50 65 T 0 65 Z;
                        M0 40 Q 25 48 50 40 T 100 40 V 62 Q 75 72 50 62 T 0 62 Z;
                        M0 40 Q 25 30 50 40 T 100 40 V 65 Q 75 55 50 65 T 0 65 Z" />
            </path>
            {/* 波 2: スカイブルー系 */}
            <path fill="#3b82f6" opacity="0.5">
              <animate attributeName="d" dur="7s" repeatCount="indefinite"
                values="M0 45 Q 25 55 50 45 T 100 45 V 58 Q 75 65 50 58 T 0 58 Z;
                        M0 45 Q 25 38 50 45 T 100 45 V 54 Q 75 45 50 54 T 0 54 Z;
                        M0 45 Q 25 55 50 45 T 100 45 V 58 Q 75 65 50 58 T 0 58 Z" />
            </path>
            {/* 波 3: バイオレット系 */}
            <path fill="#8b5cf6" opacity="0.4">
              <animate attributeName="d" dur="19s" repeatCount="indefinite"
                values="M0 35 Q 25 20 50 35 T 100 35 V 70 Q 75 80 50 70 T 0 70 Z;
                        M0 35 Q 25 45 50 35 T 100 35 V 68 Q 75 55 50 68 T 0 68 Z;
                        M0 35 Q 25 20 50 35 T 100 35 V 70 Q 75 80 50 70 T 0 70 Z" />
            </path>
          </svg>
        </div>

        {/* 2. 未来マスクレイヤー (現在時刻以降を隠す) */}
        <div 
          className={`absolute inset-y-0 right-0 bg-slate-100 z-10 ${isLarge ? '' : 'rounded-r-xl'}`}
          style={{ width: `${((totalMinutes - limitMin) / totalMinutes) * 100}%` }}
        />

        {/* 3. セグメントレイヤー (石が波を上書きする) */}
        <div className="flex h-full w-full relative z-20">
          {segments.map((seg, i) => {
            const width = `${((seg.end - seg.start) / totalMinutes) * 100}%`;
            if (width === '0%') return null;

            return (
              <div key={i} style={{ width }} className="h-full relative group">
                {seg.type === 'stone' ? (
                  <div 
                    className="absolute top-1/4 w-full h-1/2 transition-all duration-300"
                    style={{ 
                      filter: isLarge 
                        ? `drop-shadow(0 ${isStoneHovered ? '8px 12px' : '6px 8px'} rgba(0,0,0,0.4))` 
                        : `drop-shadow(0 ${isStoneHovered ? '3px 5px' : '2px 3px'} rgba(0,0,0,0.3))`
                    }}
                    onMouseEnter={() => setIsStoneHovered(true)}
                    onMouseLeave={() => setIsStoneHovered(false)}
                  >
                    <div 
                      className={`w-full h-full bg-gradient-to-b from-slate-400 via-slate-600 to-slate-800 stone-mask transition-colors duration-300 ${isStoneHovered ? 'brightness-125' : 'brightness-100'}`}
                      style={{ 
                        clipPath: 'polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)'
                      }}
                    >
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent)]" />
                      <div className={`absolute inset-0 bg-black/20 mix-blend-overlay ${isLarge ? 'opacity-40' : 'opacity-20'}`} />
                    </div>
                    
                    {/* ツールチップ (Stone) */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl">
                      <span className="opacity-70">拘束:</span> {formatDuration(totalStoneMin)}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                    </div>
                  </div>
                ) : (
                  /* 波のセグメント */
                  <div 
                    className="w-full h-full relative"
                  >
                    {/* ツールチップ (Wave) */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-white/90 backdrop-blur-sm text-slate-600 text-[10px] border border-slate-200 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
                      <span className="opacity-70">解放:</span> {formatDuration(totalWaveMin)}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white/90" />
                    </div>
                  </div>
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
      <div className={`mt-3 flex flex-col gap-2 px-1 ${isLarge ? 'max-w-2xl mx-auto' : ''}`}>
        {targetApps.length > 0 && (
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-slate-500">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-slate-400 rounded-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]" />
              <span>選択したアプリによる拘束</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-sky-200 rounded-sm border border-sky-100" />
              <span>自由な解放</span>
            </div>
          </div>
        )}
        <p className="text-[10px] text-slate-400 italic leading-relaxed">
          ※ iOSオートメーションを設定していないアプリは記録がとれていないため、正しい表示にならない可能性があります。
        </p>
      </div>
    </>
  );
}

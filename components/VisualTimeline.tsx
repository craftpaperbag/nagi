'use client';

import { useState } from 'react';

interface LogEntry {
  ts: number;
  app: string;
}

export default function VisualTimeline({ logs, selectedDate, targetApp, isLarge }: { logs: LogEntry[], selectedDate: string, targetApp: string, isLarge?: boolean }) {
  // 波紋の状態管理
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  const addRipple = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = e.currentTarget.closest('.timeline-container');
    const svg = container?.querySelector('svg');
    if (!container || !svg) return;
    
    const rect = container.getBoundingClientRect();
    const svgRect = svg.getBoundingClientRect();
    
    // ピクセル座標を 0-100 の viewBox 単位に変換
    // x はコンテナ全体に対する割合 (SVGが w-full なので)
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    // y は SVG の viewBox (0-100) に合わせるため、SVG の矩形に対する割合にする
    const y = ((e.clientY - svgRect.top) / svgRect.height) * 100;
    
    const id = Date.now();
    setRipples(prev => [...prev, { id, x, y }]);
    // 2秒後に削除
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id));
    }, 2000);
  };

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

  // 合計時間の計算 (limitMin まで)
  const totalStoneMin = segments.reduce((acc, seg) => seg.type === 'stone' ? acc + (seg.end - seg.start) : acc, 0);
  const totalWaveMin = limitMin - totalStoneMin;

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
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
          <svg className={`absolute bottom-0 w-full ${isLarge ? 'h-64' : 'h-12'} animate-nagi-wave`} viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              {/* 波の形に切り抜くためのマスク定義 (最も高い波に合わせる) */}
              <clipPath id="wave-mask">
                <path d="M0 40 Q 25 30 50 40 T 100 40 V 100 H 0 Z">
                  <animate attributeName="d" dur="8s" repeatCount="indefinite"
                    values="M0 40 Q 25 30 50 40 T 100 40 V 100 H 0 Z;
                            M0 40 Q 25 50 50 40 T 100 40 V 100 H 0 Z;
                            M0 40 Q 25 30 50 40 T 100 40 V 100 H 0 Z" />
                </path>
              </clipPath>
            </defs>

            {/* 波 1: シアン系 (より鮮やかに) */}
            <path fill="#22d3ee" opacity="0.6">
              <animate attributeName="d" dur="10s" repeatCount="indefinite"
                values="M0 50 Q 25 40 50 50 T 100 50 V 100 H 0 Z;
                        M0 50 Q 25 60 50 50 T 100 50 V 100 H 0 Z;
                        M0 50 Q 25 40 50 50 T 100 50 V 100 H 0 Z" />
            </path>
            {/* 波 2: スカイブルー系 (より濃く) */}
            <path fill="#0ea5e9" opacity="0.6">
              <animate attributeName="d" dur="7s" repeatCount="indefinite"
                values="M0 55 Q 25 65 50 55 T 100 55 V 100 H 0 Z;
                        M0 55 Q 25 45 50 55 T 100 55 V 100 H 0 Z;
                        M0 55 Q 25 65 50 55 T 100 55 V 100 H 0 Z" />
            </path>
            {/* 波 3: バイオレット系 (存在感を出す) */}
            <path fill="#a78bfa" opacity="0.5">
              <animate attributeName="d" dur="13s" repeatCount="indefinite"
                values="M0 45 Q 25 35 50 45 T 100 45 V 100 H 0 Z;
                        M0 45 Q 25 55 50 45 T 100 45 V 100 H 0 Z;
                        M0 45 Q 25 35 50 45 T 100 45 V 100 H 0 Z" />
            </path>

            {/* 波紋レイヤーをSVG内部に移動し、clipPathを適用 */}
            <g clipPath="url(#wave-mask)">
              {ripples.map(ripple => (
                <ellipse
                  key={ripple.id}
                  cx={ripple.x}
                  cy={ripple.y}
                  rx="20"
                  ry="10"
                  fill="white"
                  className="animate-nagi-ripple opacity-0"
                  style={{ transformOrigin: `${ripple.x}% ${ripple.y}%` }}
                />
              ))}
            </g>
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
                    className={`w-full h-full bg-slate-400 border-x border-slate-500/20 transition-colors hover:bg-slate-500 ${isLarge ? 'shadow-[inset_0_4px_12px_rgba(0,0,0,0.2)]' : 'shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]'}`} 
                  >
                    {/* 石板のテクスチャ */}
                    <div className={`absolute inset-0 bg-black/10 ${isLarge ? 'opacity-20' : 'opacity-10'}`} />
                    
                    {/* ツールチップ (Stone) */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl">
                      <span className="opacity-70">stilled:</span> {formatDuration(totalStoneMin)}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                    </div>
                  </div>
                ) : (
                  /* 波のセグメント */
                  <div 
                    className="w-full h-full relative cursor-pointer"
                    onClick={addRipple}
                  >
                    {/* ツールチップ (Wave) */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-white/90 backdrop-blur-sm text-slate-600 text-[10px] border border-slate-200 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
                      <span className="opacity-70">flowing:</span> {formatDuration(totalWaveMin)}
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
      {targetApp && (
        <div className={`mt-3 flex flex-wrap gap-x-6 gap-y-2 px-1 text-[11px] text-slate-500 ${isLarge ? 'max-w-2xl mx-auto' : ''}`}>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-slate-400 rounded-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]" />
            <span>stilled by {targetApp}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-sky-200 rounded-sm border border-sky-100" />
            <span>flowing freely</span>
          </div>
        </div>
      )}
    </>
  );
}

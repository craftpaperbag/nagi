'use client';

import { useRef, useState, useEffect } from 'react';
import { computeSegments, computeStoneTotals } from '@/lib/segments';
import { useTransitionContext } from './TransitionContext';

interface LogEntry {
  ts: number;
  app: string;
}

type DotUnit = 60 | 30 | 10 | 1;

const DOT_SIZE_PX: Record<DotUnit, number> = { 60: 24, 30: 20, 10: 12, 1: 6 };
const GAP_PX: Record<DotUnit, number> = { 60: 8, 30: 6, 10: 4, 1: 2 };
const UNIT_OPTIONS: DotUnit[] = [60, 30, 10, 1];
const PADDING = 16;

export default function DotView({
  logs,
  selectedDate,
  targetApps,
  prevDayLastLog,
  dotUnit,
  onDotUnitChange,
  isLarge,
}: {
  logs: LogEntry[];
  selectedDate: string;
  targetApps: string[];
  prevDayLastLog?: LogEntry | null;
  dotUnit: DotUnit;
  onDotUnitChange: (unit: DotUnit) => void;
  isLarge?: boolean;
}) {
  const { isPending } = useTransitionContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const [innerWidth, setInnerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      // コンテナ内幅（padding除く）
      setInnerWidth(entries[0].contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const segments = computeSegments(logs, targetApps, selectedDate, prevDayLastLog);
  const { stoneMin, waveMin } = computeStoneTotals(segments);

  const stoneDots = Math.round(stoneMin / dotUnit);
  const waveDots = Math.round(waveMin / dotUnit);
  const totalDots = stoneDots + waveDots;

  const dotSize = DOT_SIZE_PX[dotUnit];
  const gap = GAP_PX[dotUnit];
  const step = dotSize + gap;
  const radius = dotSize / 2;

  const dotsPerRow = innerWidth > 0 ? Math.max(1, Math.floor((innerWidth + gap) / step)) : 0;
  const totalRows = dotsPerRow > 0 ? Math.ceil(totalDots / dotsPerRow) : 0;
  const gridHeight = totalRows > 0 ? totalRows * step - gap : 0;

  // 最終行の余白ドットを隠すカバーの幅
  const lastRowDots = totalDots > 0 ? (totalDots % dotsPerRow || dotsPerRow) : 0;
  const lastRowExcessWidth = dotsPerRow > 0 ? (dotsPerRow - lastRowDots) * step : 0;

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return h > 0 ? `${h}時間 ${m}分` : `${m}分`;
  };

  return (
    <div className="relative">
      {isPending && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/20 backdrop-blur-[1px] transition-opacity duration-300">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">updating</div>
        </div>
      )}

      {targetApps.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-slate-400">上のアプリを選択してドットを表示</p>
        </div>
      ) : (
        <div className={`transition-opacity duration-300 ${isPending ? 'opacity-40' : 'opacity-100'}`}>
          {/* ドット単位セレクタ */}
          <div className="flex items-center gap-1 mb-4">
            {UNIT_OPTIONS.map((unit) => (
              <button
                key={unit}
                onClick={() => onDotUnitChange(unit)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${
                  dotUnit === unit
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {unit}分
              </button>
            ))}
          </div>

          {/* パンチカード式ドット表示 */}
          <div
            ref={containerRef}
            className={`bg-slate-50 ${
              isLarge
                ? 'w-screen relative left-1/2 -translate-x-1/2 rounded-none border-y border-slate-300/50 shadow-inner'
                : 'w-full rounded-xl border border-slate-300/50'
            }`}
            style={{ padding: PADDING }}
          >
            {dotsPerRow > 0 && totalDots > 0 ? (
              <div className="relative overflow-hidden" style={{ height: gridHeight }}>
                {/* 波アニメーション背景（ドットグリッドマスク付き） */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: dotsPerRow * step,
                    height: totalRows * step,
                    WebkitMaskImage: `radial-gradient(circle ${radius}px at ${radius}px ${radius}px, black 99%, transparent 100%)`,
                    WebkitMaskSize: `${step}px ${step}px`,
                    maskImage: `radial-gradient(circle ${radius}px at ${radius}px ${radius}px, black 99%, transparent 100%)`,
                    maskSize: `${step}px ${step}px`,
                  }}
                >
                  {/* 波のベース色 */}
                  <div
                    className="absolute inset-0"
                    style={{ backgroundColor: '#bae6fd' }}
                  />
                  {/* 波のアニメーション */}
                  <svg
                    className="absolute top-0 left-0 w-full h-full animate-nagi-wave"
                    viewBox="0 18 100 64"
                    preserveAspectRatio="none"
                    style={{ filter: 'saturate(1.8) brightness(1.1)' }}
                  >
                    <path fill="#06b6d4" opacity="0.5">
                      <animate attributeName="d" dur="12s" repeatCount="indefinite"
                        values="M0 40 Q 25 30 50 40 T 100 40 V 65 Q 75 55 50 65 T 0 65 Z;
                                M0 40 Q 25 48 50 40 T 100 40 V 62 Q 75 72 50 62 T 0 62 Z;
                                M0 40 Q 25 30 50 40 T 100 40 V 65 Q 75 55 50 65 T 0 65 Z" />
                    </path>
                    <path fill="#3b82f6" opacity="0.5">
                      <animate attributeName="d" dur="7s" repeatCount="indefinite"
                        values="M0 45 Q 25 55 50 45 T 100 45 V 58 Q 75 65 50 58 T 0 58 Z;
                                M0 45 Q 25 38 50 45 T 100 45 V 54 Q 75 45 50 54 T 0 54 Z;
                                M0 45 Q 25 55 50 45 T 100 45 V 58 Q 75 65 50 58 T 0 58 Z" />
                    </path>
                    <path fill="#8b5cf6" opacity="0.4">
                      <animate attributeName="d" dur="19s" repeatCount="indefinite"
                        values="M0 35 Q 25 20 50 35 T 100 35 V 70 Q 75 80 50 70 T 0 70 Z;
                                M0 35 Q 25 45 50 35 T 100 35 V 68 Q 75 55 50 68 T 0 68 Z;
                                M0 35 Q 25 20 50 35 T 100 35 V 70 Q 75 80 50 70 T 0 70 Z" />
                    </path>
                  </svg>
                </div>

                {/* 最終行の余分な穴を隠すカバー */}
                {lastRowExcessWidth > 0 && totalRows > 0 && (
                  <div
                    className="absolute bg-slate-50"
                    style={{
                      zIndex: 10,
                      right: 0,
                      top: (totalRows - 1) * step,
                      width: lastRowExcessWidth,
                      height: dotSize,
                    }}
                  />
                )}

                {/* 石ドット（波の上に重なる不透明な円） */}
                {Array.from({ length: stoneDots }).map((_, i) => {
                  const col = i % dotsPerRow;
                  const row = Math.floor(i / dotsPerRow);
                  return (
                    <div
                      key={`s-${i}`}
                      className="absolute rounded-full bg-slate-500"
                      style={{
                        zIndex: 20,
                        width: dotSize,
                        height: dotSize,
                        left: col * step,
                        top: row * step,
                      }}
                    />
                  );
                })}
              </div>
            ) : totalDots === 0 ? (
              <p className="text-xs text-slate-400 py-4 w-full text-center">まだデータがありません</p>
            ) : null}
          </div>

          {/* 凡例 */}
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-slate-500 px-1">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-slate-500 rounded-full" />
              <span>拘束 {formatDuration(stoneMin)}（{stoneDots}個）</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full overflow-hidden relative">
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 10 10" preserveAspectRatio="none">
                  <rect fill="#06b6d4" opacity="0.5" x="0" y="0" width="10" height="10" />
                  <rect fill="#3b82f6" opacity="0.5" x="0" y="0" width="10" height="10" />
                  <rect fill="#8b5cf6" opacity="0.4" x="0" y="0" width="10" height="10" />
                </svg>
              </div>
              <span>解放 {formatDuration(waveMin)}（{waveDots}個）</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

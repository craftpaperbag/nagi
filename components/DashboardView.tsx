'use client';

import { useEffect, useState } from 'react';
import VisualTimeline from './VisualTimeline';
import DotView from './DotView';
import { getDisplayConfig, type DisplayConfig } from './DisplaySettings';

interface LogEntry {
  ts: number;
  app: string;
}

export default function DashboardView({
  logs,
  selectedDate,
  targetApps,
  isLarge,
  prevDayLastLog,
}: {
  logs: LogEntry[];
  selectedDate: string;
  targetApps: string[];
  isLarge?: boolean;
  prevDayLastLog?: LogEntry | null;
}) {
  const [config, setConfig] = useState<DisplayConfig>({ showTimeline: true, showDots: false, dotUnit: 30 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setConfig(getDisplayConfig());
    setMounted(true);

    const handleChange = () => setConfig(getDisplayConfig());
    window.addEventListener('nagi-display-changed', handleChange);
    return () => window.removeEventListener('nagi-display-changed', handleChange);
  }, []);

  // SSR時はデフォルト（タイムラインのみ表示）
  const showTimeline = !mounted || config.showTimeline;
  const showDots = mounted && config.showDots;

  return (
    <div className="flex flex-col gap-6">
      {showTimeline && (
        <VisualTimeline
          logs={logs}
          selectedDate={selectedDate}
          targetApps={targetApps}
          isLarge={isLarge}
          prevDayLastLog={prevDayLastLog}
        />
      )}

      {showDots && (
        <DotView
          logs={logs}
          selectedDate={selectedDate}
          targetApps={targetApps}
          prevDayLastLog={prevDayLastLog}
          dotUnit={config.dotUnit}
          isLarge={isLarge}
          onDotUnitChange={(unit) => {
            const next = { ...config, dotUnit: unit };
            setConfig(next);
            // Sync to localStorage
            import('./DisplaySettings').then(({ saveDisplayConfig }) => saveDisplayConfig(next));
          }}
        />
      )}

      {!showTimeline && !showDots && mounted && (
        <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-2xl">
          <p className="text-sm text-slate-400">設定から表示するビューを選択してください</p>
        </div>
      )}
    </div>
  );
}

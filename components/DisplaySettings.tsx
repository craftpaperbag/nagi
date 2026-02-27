'use client';

import { useEffect, useState } from 'react';

type DotUnit = 60 | 30 | 10 | 1;

export interface DisplayConfig {
  showTimeline: boolean;
  showDots: boolean;
  dotUnit: DotUnit;
}

const STORAGE_KEY = 'nagi-display-settings';
const UNIT_OPTIONS: DotUnit[] = [60, 30, 10, 1];

export function getDisplayConfig(): DisplayConfig {
  if (typeof window === 'undefined') {
    return { showTimeline: true, showDots: false, dotUnit: 30 };
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        showTimeline: parsed.showTimeline ?? true,
        showDots: parsed.showDots ?? false,
        dotUnit: parsed.dotUnit ?? 30,
      };
    }
  } catch {}
  return { showTimeline: true, showDots: false, dotUnit: 30 };
}

export function saveDisplayConfig(config: DisplayConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new Event('nagi-display-changed'));
  } catch {}
}

export default function DisplaySettings() {
  const [config, setConfig] = useState<DisplayConfig>({ showTimeline: true, showDots: false, dotUnit: 30 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setConfig(getDisplayConfig());
    setMounted(true);
  }, []);

  const update = (partial: Partial<DisplayConfig>) => {
    const next = { ...config, ...partial };
    setConfig(next);
    saveDisplayConfig(next);
  };

  if (!mounted) return null;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">表示</h2>

      <div className="flex flex-col gap-3">
        <label className="flex items-center justify-between">
          <span className="text-xs text-slate-600">タイムラインを表示</span>
          <button
            onClick={() => update({ showTimeline: !config.showTimeline })}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              config.showTimeline ? 'bg-slate-700' : 'bg-slate-200'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${
                config.showTimeline ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </label>

        <label className="flex items-center justify-between">
          <span className="text-xs text-slate-600">ドットを表示</span>
          <button
            onClick={() => update({ showDots: !config.showDots })}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              config.showDots ? 'bg-slate-700' : 'bg-slate-200'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${
                config.showDots ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </label>

        {config.showDots && (
          <div className="flex items-center gap-2 pl-1">
            <span className="text-[10px] text-slate-400">ドット単位</span>
            <div className="flex gap-1">
              {UNIT_OPTIONS.map((unit) => (
                <button
                  key={unit}
                  onClick={() => update({ dotUnit: unit })}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                    config.dotUnit === unit
                      ? 'bg-slate-700 text-white'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {unit}分
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { getDisplayConfig } from './DisplaySettings';

interface LogEntry {
  ts: number;
  app: string;
  is_dummy?: boolean;
}

export default function LogList({
  logs,
  prevDayLastLog,
  selectedDate,
  deleteLog,
  isDev,
}: {
  logs: LogEntry[];
  prevDayLastLog: LogEntry | null;
  selectedDate: string;
  deleteLog: (formData: FormData) => void;
  isDev: boolean;
}) {
  const [showLogs, setShowLogs] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setShowLogs(getDisplayConfig().showLogs);
    setMounted(true);

    const handleChange = () => setShowLogs(getDisplayConfig().showLogs);
    window.addEventListener('nagi-display-changed', handleChange);
    return () => window.removeEventListener('nagi-display-changed', handleChange);
  }, []);

  if (mounted && !showLogs) return null;

  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-bold">ログ表示</h2>
      </div>

      {logs.length > 0 || prevDayLastLog ? (
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
                {isDev && (
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
        </ul>
      ) : (
        <div className="py-24 text-center border-2 border-dashed border-slate-100 rounded-2xl">
          <p className="text-slate-400 text-sm">{selectedDate} のログはありません</p>
        </div>
      )}
    </>
  );
}

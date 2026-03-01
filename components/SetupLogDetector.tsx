'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface LogEntry {
  ts: number;
  app: string;
  is_dummy?: boolean;
}

const STORAGE_KEY = 'nagi-guide-shown-at';
const POLL_INTERVAL = 5000;

interface SetupLogDetectorProps {
  logs: LogEntry[];
}

export default function SetupLogDetector({ logs }: SetupLogDetectorProps) {
  const router = useRouter();
  const [detected, setDetected] = useState(false);
  const [ready, setReady] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 初回マウント時に localStorage を初期化
  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    }
    setReady(true);
  }, []);

  // logs が更新されるたびに検出チェック
  useEffect(() => {
    if (!ready) return;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    const shownAt = parseInt(stored, 10);
    if (logs.some((log) => log.ts >= shownAt)) {
      setDetected(true);
    }
  }, [logs, ready]);

  // 未検出の間だけポーリング
  useEffect(() => {
    if (!ready || detected) return;

    intervalRef.current = setInterval(() => {
      router.refresh();
    }, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [ready, detected, router]);

  if (!ready) return null;

  if (detected) {
    return (
      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
        <p className="text-xs text-emerald-700 leading-relaxed">
          ログが正常に記録されています。設定ガイドを閉じて大丈夫です。
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4">
      <p className="text-xs text-slate-500 leading-relaxed">
        まだアプリを開いた記録がありません。オートメーションを設定したアプリを開いてみてください。
      </p>
    </div>
  );
}

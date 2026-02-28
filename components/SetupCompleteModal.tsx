'use client';

import { useTransition } from 'react';

interface SetupCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function SetupCompleteModal({ isOpen, onClose, onConfirm }: SetupCompleteModalProps) {
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const handleConfirm = () => {
    startTransition(() => {
      onConfirm();
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 flex flex-col gap-6 border border-slate-100">
        <div className="flex flex-col gap-3 text-center">
          <div className="flex justify-center mb-2">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
          </div>
          <h3 className="text-base font-bold text-slate-700">設定が完了しました</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            ガイドを閉じてダッシュボードを表示します。
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            このガイドはいつでも設定メニューから再表示できます。
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={handleConfirm}
            disabled={isPending}
            className="bg-slate-900 text-white px-6 py-3 rounded-full text-sm font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
          >
            {isPending ? '読み込み中...' : 'ダッシュボードへ'}
          </button>
          <button
            onClick={onClose}
            disabled={isPending}
            className="text-slate-400 px-6 py-2 rounded-full text-xs hover:text-slate-600 transition-colors disabled:opacity-50"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}

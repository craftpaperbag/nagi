'use client';

import { useState, ReactNode } from 'react';

interface CollapsibleHeaderProps {
  datePicker: ReactNode;
  toolbar: ReactNode;
  selectedDate: string;
}

function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const weekday = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
  return `${m}月${d}日（${weekday}）`;
}

export default function CollapsibleHeader({ datePicker, toolbar, selectedDate }: CollapsibleHeaderProps) {
  const [collapsed, setCollapsed] = useState(false);

  const toggleButton = (
    <button
      onClick={() => setCollapsed(c => !c)}
      className="px-2.5 py-1 rounded-full text-[11px] font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
      aria-label={collapsed ? 'メニューを展開' : 'メニューを折りたたむ'}
    >
      {collapsed ? '開く' : '閉じる'}
    </button>
  );

  return (
    <div
      className="sticky top-0 z-50 w-[100vw] ml-[calc(-50vw+50%)] px-8 pt-3 pb-3 mb-4 bg-white/70 backdrop-blur-md border-b border-slate-100/50 transition-all duration-300"
    >
      {collapsed ? (
        <div className="flex justify-center items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">{formatDateLabel(selectedDate)}</span>
          {toggleButton}
        </div>
      ) : (
        <>
          <div className="flex justify-center items-center gap-2 mb-1">
            {datePicker}
            {toggleButton}
          </div>
          <div className="mt-2">
            {toolbar}
          </div>
        </>
      )}
    </div>
  );
}

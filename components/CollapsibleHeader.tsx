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

  const chevron = (
    <button
      onClick={() => setCollapsed(c => !c)}
      className="p-1.5 rounded-full text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-colors"
      aria-label={collapsed ? 'メニューを展開' : 'メニューを折りたたむ'}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`transition-transform duration-300 ${collapsed ? '' : 'rotate-180'}`}
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>
  );

  return (
    <div
      className="sticky top-0 z-50 w-[100vw] ml-[calc(-50vw+50%)] px-8 pt-3 pb-3 mb-4 bg-white/70 backdrop-blur-md border-b border-slate-100/50 transition-all duration-300"
    >
      {collapsed ? (
        <div className="flex justify-center items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">{formatDateLabel(selectedDate)}</span>
          {chevron}
        </div>
      ) : (
        <>
          <div className="flex justify-center items-center gap-2 mb-1">
            {datePicker}
            {chevron}
          </div>
          <div className="mt-2">
            {toolbar}
          </div>
        </>
      )}
    </div>
  );
}

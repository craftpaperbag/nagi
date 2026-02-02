'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTransitionContext } from './TransitionContext';

export default function DatePicker({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { startTransition } = useTransitionContext();

  const updateDate = (newDate: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('date', newDate);
    // startTransition で包む
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateDate(e.target.value);
  };

  const shiftDate = (days: number) => {
    const [y, m, d] = defaultValue.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + days);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    updateDate(dateStr);
  };

  const goToday = () => {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
    updateDate(today);
  };

  return (
    <div className="flex items-center gap-1">
      <button 
        type="button"
        onClick={() => shiftDate(-1)}
        className="p-1 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
        title="前日"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      </button>
      
      <input 
        type="date" 
        name="date" 
        value={defaultValue}
        onChange={handleChange}
        className="text-[13px] px-1 py-1 outline-none bg-transparent cursor-pointer font-medium text-slate-600"
      />

      <button 
        type="button"
        onClick={() => shiftDate(1)}
        className="p-1 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
        title="翌日"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
      </button>

      <div className="w-px h-3 bg-slate-200 mx-1" />

      <button 
        type="button"
        onClick={goToday}
        className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-tight px-2 py-1 transition-colors"
      >
        Today
      </button>
    </div>
  );
}

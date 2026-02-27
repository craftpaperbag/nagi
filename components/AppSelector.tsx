'use client';
import { useTransitionContext } from './TransitionContext';

interface AppSelectorProps {
  displayApps: string[];
  targetApps: string[];
  toggleAction: (formData: FormData) => Promise<void>;
  resetAction: () => Promise<void>;
  topApp?: string;
}

export default function AppSelector({ displayApps, targetApps, toggleAction, resetAction, topApp }: AppSelectorProps) {
  const { startTransition } = useTransitionContext();

  return (
    <div className="flex flex-wrap gap-2 max-w-full items-center">
      {targetApps.length > 0 && (
        <button
          onClick={() => {
            startTransition(async () => {
              await resetAction();
            });
          }}
          className="px-3 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-all bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200 hover:text-slate-700"
        >
          リセット
        </button>
      )}
      {displayApps.map(app => {
        const isTarget = targetApps.includes(app);
        const isTopApp = app === topApp;
        return (
          <button
            key={app}
            onClick={() => {
              const formData = new FormData();
              formData.append('app', app);
              startTransition(async () => {
                await toggleAction(formData);
              });
            }}
            className={`rounded-full font-medium whitespace-nowrap transition-all ${
              isTopApp ? 'px-5 py-2 text-sm' : 'px-3 py-1 text-[10px]'
            } ${
              isTarget
                ? 'bg-slate-600 text-slate-100 shadow-sm'
                : 'bg-cyan-50 text-cyan-700 border border-cyan-100 hover:bg-cyan-100'
            }`}
          >
            {app}
            {isTopApp && (
              <span className="ml-1.5 text-[9px] opacity-60">よく使う</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

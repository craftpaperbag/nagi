'use client';
import { useTransitionContext } from './TransitionContext';

interface AppSelectorProps {
  displayApps: string[];
  targetApps: string[];
  toggleAction: (formData: FormData) => Promise<void>;
}

export default function AppSelector({ displayApps, targetApps, toggleAction }: AppSelectorProps) {
  const { startTransition } = useTransitionContext();

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 max-w-full">
      {displayApps.map(app => {
        const isTarget = targetApps.includes(app);
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
            className={`px-3 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-all ${
              isTarget 
                ? 'bg-slate-600 text-slate-100 shadow-sm' 
                : 'bg-cyan-50 text-cyan-700 border border-cyan-100 hover:bg-cyan-100'
            }`}
          >
            {app}
          </button>
        );
      })}
    </div>
  );
}

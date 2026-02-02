'use client';
import { createContext, useContext, useTransition, ReactNode, TransitionStartFunction } from 'react';

const TransitionContext = createContext<{
  isPending: boolean;
  startTransition: TransitionStartFunction;
}>({
  isPending: false,
  startTransition: () => {},
});

export const useTransitionContext = () => useContext(TransitionContext);

export function TransitionProvider({ children }: { children: ReactNode }) {
  const [isPending, startTransition] = useTransition();
  return (
    <TransitionContext.Provider value={{ isPending, startTransition }}>
      {children}
    </TransitionContext.Provider>
  );
}
